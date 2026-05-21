import { json, error } from '@sveltejs/kit';
import { adminDb, adminStorage } from '$lib/server/firebase-admin';
import { eventSchema } from '$lib/schemas';
import { PUBLIC_FIREBASE_STORAGE_BUCKET } from '$env/static/public';

async function checkTripOwnership(tripId: string, userId: string) {
	const doc = await adminDb.collection('trips').doc(tripId).get();
	if (!doc.exists || doc.data()?.userId !== userId) {
		throw error(403, 'Forbidden');
	}
}

export async function GET({ url, locals }) {
	if (!locals.user) throw error(401, 'Unauthorized');

	const dayId = url.searchParams.get('dayId');
	if (!dayId) return json([]);

	const parts = dayId.split('-');
	if (parts.length < 4) return json([]);

	const date = parts.slice(-3).join('-');
	const tripId = parts.slice(0, -3).join('-');

	await checkTripOwnership(tripId, locals.user.uid);

	try {
		const snapshot = await adminDb
			.collection('trips')
			.doc(tripId)
			.collection('events')
			.where('date', '==', date)
			.orderBy('time', 'asc')
			.get();

		const bucket = adminStorage.bucket(PUBLIC_FIREBASE_STORAGE_BUCKET);
		const events = await Promise.all(
			snapshot.docs.map(async (doc) => {
				const eventData = doc.id ? { id: doc.id, ...doc.data() } : doc.data();
				const eventId = doc.id;

				// Fetch location for this event
				const locationSnapshot = await adminDb
					.collection('trips')
					.doc(tripId)
					.collection('locations')
					.where('eventId', '==', eventId)
					.limit(1)
					.get();
				
				const location = locationSnapshot.empty ? null : locationSnapshot.docs[0].data();

				// Fetch attachments for this event
				const attachmentSnapshot = await adminDb
					.collection('trips')
					.doc(tripId)
					.collection('attachments')
					.where('eventId', '==', eventId)
					.get();

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

				return {
					...eventData,
					location,
					attachments
				};
			})
		);

		return json(events);
	} catch (err) {
		console.error('Error fetching events:', err);
		if (err instanceof Error && err.message.includes('FAILED_PRECONDITION')) {
			// Fallback if index is missing
			const fallbackSnapshot = await adminDb
				.collection('trips')
				.doc(tripId)
				.collection('events')
				.where('date', '==', date)
				.get();
			
			// For brevity in fallback, we'll just return events without full nesting or manual sort
			return json(fallbackSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
		}
		throw error(500, 'Failed to fetch events');
	}
}

export async function POST({ request, locals }) {
	if (!locals.user) throw error(401, 'Unauthorized');

	const formData = await request.formData();
	const dayId = formData.get('dayId') as string;
	const title = formData.get('title') as string;
	const time = formData.get('time') as string;
	const description = formData.get('description') as string;
	const locationRaw = formData.get('location') as string;
	const files = formData.getAll('files') as File[];

	const location = locationRaw ? JSON.parse(locationRaw) : undefined;

	const validation = eventSchema.safeParse({ dayId, title, time, description, location });
	if (!validation.success) {
		throw error(400, { message: 'Validation failed', errors: validation.error.flatten() } as any);
	}

	const parts = dayId.split('-');
	if (parts.length < 4) {
		throw error(400, 'Invalid dayId format');
	}

	const date = parts.slice(-3).join('-');
	const tripId = parts.slice(0, -3).join('-');

	await checkTripOwnership(tripId, locals.user.uid);

	try {
		const eventData = {
			tripId,
			date,
			title,
			time: time || null,
			description: description || null
		};

		// Create the event
		const eventRef = await adminDb
			.collection('trips')
			.doc(tripId)
			.collection('events')
			.add(eventData);
		
		const eventId = eventRef.id;

		// Create location if provided
		if (location) {
			await adminDb
				.collection('trips')
				.doc(tripId)
				.collection('locations')
				.add({
					...location,
					eventId,
					tripId,
					date
				});
		}

		// Handle file uploads
		const bucket = adminStorage.bucket(PUBLIC_FIREBASE_STORAGE_BUCKET);
		const attachments = [];

		for (const file of files) {
			const fileId = Math.random().toString(36).substr(2, 9);
			const storagePath = `attachments/${tripId}/${eventId}/${fileId}-${file.name}`;
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
				eventId,
				date,
				fileName: file.name,
				mimeType: file.type,
				storagePath
			};

			const aRef = await adminDb
				.collection('trips')
				.doc(tripId)
				.collection('attachments')
				.add(attachmentData);
			
			attachments.push({ id: aRef.id, ...attachmentData, fileUrl: signedUrl });
		}

		return json({ 
			id: eventId, 
			...eventData, 
			location, 
			attachments 
		});
	} catch (err) {
		console.error('Error creating event:', err);
		throw error(500, 'Failed to create event');
	}
}
