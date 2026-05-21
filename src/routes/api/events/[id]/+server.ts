import { json, error } from '@sveltejs/kit';
import { adminDb, adminStorage } from '$lib/server/firebase-admin';
import { PUBLIC_FIREBASE_STORAGE_BUCKET } from '$env/static/public';
import { eventSchema } from '$lib/schemas';

async function getEventAndVerifyOwnership(eventId: string, userId: string) {
	const snapshot = await adminDb.collectionGroup('events').get();
	const doc = snapshot.docs.find((d) => d.id === eventId);

	if (!doc) {
		throw error(404, 'Event not found');
	}

	const eventData = doc.data();
	const tripId = eventData.tripId;

	const tripDoc = await adminDb.collection('trips').doc(tripId).get();
	if (!tripDoc.exists || tripDoc.data()?.userId !== userId) {
		throw error(403, 'Forbidden');
	}

	return { doc, eventData, tripId };
}

export async function GET({ params, locals }) {
	if (!locals.user) throw error(401, 'Unauthorized');
	const { id } = params;

	try {
		const { eventData, tripId } = await getEventAndVerifyOwnership(id, locals.user.uid);

		// Fetch location
		const locationSnapshot = await adminDb
			.collection('trips')
			.doc(tripId)
			.collection('locations')
			.where('eventId', '==', id)
			.limit(1)
			.get();

		const location = locationSnapshot.empty
			? null
			: {
					id: locationSnapshot.docs[0].id,
					...locationSnapshot.docs[0].data()
			  };

		// Fetch attachments
		const attachmentSnapshot = await adminDb
			.collection('trips')
			.doc(tripId)
			.collection('attachments')
			.where('eventId', '==', id)
			.get();

		const bucket = adminStorage.bucket(PUBLIC_FIREBASE_STORAGE_BUCKET);
		const attachments = await Promise.all(
			attachmentSnapshot.docs.map(async (aDoc) => {
				const aData = aDoc.data();
				let fileUrl = aData.fileUrl;
				if (aData.storagePath) {
					try {
						const [url] = await bucket.file(aData.storagePath).getSignedUrl({
							version: 'v4',
							action: 'read',
							expires: Date.now() + 15 * 60 * 1000
						});
						fileUrl = url;
					} catch (e) {
						console.error('Error signing URL for event attachment:', e);
					}
				}
				return { id: aDoc.id, ...aData, fileUrl };
			})
		);

		return json({
			id,
			...eventData,
			location,
			attachments
		});
	} catch (err) {
		console.error('Error fetching event detail:', err);
		if ((err as any).status) throw err;
		throw error(500, 'Failed to fetch event');
	}
}

export async function PATCH({ params, request, locals }) {
	if (!locals.user) throw error(401, 'Unauthorized');
	const { id } = params;

	const { doc, eventData, tripId } = await getEventAndVerifyOwnership(id, locals.user.uid);

	const formData = await request.formData();
	const title = formData.get('title') as string;
	const time = (formData.get('time') as string) || undefined;
	const description = (formData.get('description') as string) || undefined;
	const locationRaw = formData.get('location') as string;
	const files = formData.getAll('files') as File[];

	const location = locationRaw ? JSON.parse(locationRaw) : undefined;

	// Use dayId from existing event for validation if not provided (though it should stay same)
	const dayId = eventData.dayId || `${tripId}-${eventData.date}`;

	const validation = eventSchema.safeParse({ dayId, title, time, description, location });
	if (!validation.success) {
		throw error(400, { message: 'Validation failed', errors: validation.error.flatten() } as any);
	}

	try {
		const updatedEventData = {
			title,
			time: time || null,
			description: description || null
		};

		// Update event
		await doc.ref.update(updatedEventData);

		// Handle location update/creation
		if (location) {
			const locationSnapshot = await adminDb
				.collection('trips')
				.doc(tripId)
				.collection('locations')
				.where('eventId', '==', id)
				.limit(1)
				.get();

			if (locationSnapshot.empty) {
				await adminDb.collection('trips').doc(tripId).collection('locations').add({
					...location,
					eventId: id,
					tripId,
					date: eventData.date
				});
			} else {
				await locationSnapshot.docs[0].ref.update({
					...location
				});
			}
		}

		// Handle new file uploads
		const bucket = adminStorage.bucket(PUBLIC_FIREBASE_STORAGE_BUCKET);
		const newAttachments = [];

		for (const file of files) {
			const fileId = Math.random().toString(36).substr(2, 9);
			const storagePath = `attachments/${tripId}/${id}/${fileId}-${file.name}`;
			const blob = bucket.file(storagePath);
			const buffer = Buffer.from(await file.arrayBuffer());

			await blob.save(buffer, { metadata: { contentType: file.type } });

			const [signedUrl] = await blob.getSignedUrl({
				version: 'v4',
				action: 'read',
				expires: Date.now() + 15 * 60 * 1000
			});

			const attachmentData = {
				tripId,
				eventId: id,
				date: eventData.date,
				fileName: file.name,
				mimeType: file.type,
				storagePath
			};

			const aRef = await adminDb
				.collection('trips')
				.doc(tripId)
				.collection('attachments')
				.add(attachmentData);

			newAttachments.push({ id: aRef.id, ...attachmentData, fileUrl: signedUrl });
		}

		return json({
			id,
			...eventData,
			...updatedEventData,
			location,
			newAttachments
		});
	} catch (err) {
		console.error('Error updating event:', err);
		throw error(500, 'Failed to update event');
	}
}

export async function DELETE({ params, locals }) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const { id } = params;

	try {
		const { doc, tripId } = await getEventAndVerifyOwnership(id, locals.user.uid);

		// 1. Delete associated location
		const locationSnapshot = await adminDb
			.collection('trips')
			.doc(tripId)
			.collection('locations')
			.where('eventId', '==', id)
			.get();

		const locationDeletes = locationSnapshot.docs.map((d) => d.ref.delete());

		// 2. Delete associated attachments (Firestore + Storage)
		const attachmentSnapshot = await adminDb
			.collection('trips')
			.doc(tripId)
			.collection('attachments')
			.where('eventId', '==', id)
			.get();

		const bucket = adminStorage.bucket(PUBLIC_FIREBASE_STORAGE_BUCKET);
		const attachmentDeletes = attachmentSnapshot.docs.map(async (aDoc) => {
			const aData = aDoc.data();
			if (aData.storagePath) {
				try {
					await bucket.file(aData.storagePath).delete();
				} catch (e) {
					console.error('Error deleting file from storage:', e);
				}
			}
			return aDoc.ref.delete();
		});

		// 3. Delete the event itself
		await Promise.all([...locationDeletes, ...attachmentDeletes]);
		await doc.ref.delete();

		return json({ success: true });
	} catch (err) {
		console.error('Error deleting event:', err);
		if ((err as any).status) throw err;
		throw error(500, 'Failed to delete event');
	}
}
