import { json, error } from '@sveltejs/kit';
import { adminDb, adminStorage } from '$lib/server/firebase-admin';
import { PUBLIC_FIREBASE_STORAGE_BUCKET } from '$env/static/public';

export async function DELETE({ params, locals }) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const { id } = params;

	try {
		// Find the event document by querying across all subcollections
		const snapshot = await adminDb.collectionGroup('events').get();
		const doc = snapshot.docs.find(d => d.id === id);

		if (!doc) {
			throw error(404, 'Event not found');
		}

		const eventData = doc.data();
		const tripId = eventData.tripId;

		// Verify ownership of the trip
		const tripDoc = await adminDb.collection('trips').doc(tripId).get();
		if (!tripDoc.exists || tripDoc.data()?.userId !== locals.user.uid) {
			throw error(403, 'Forbidden');
		}

		// 1. Delete associated location
		const locationSnapshot = await adminDb
			.collection('trips')
			.doc(tripId)
			.collection('locations')
			.where('eventId', '==', id)
			.get();
		
		const locationDeletes = locationSnapshot.docs.map(d => d.ref.delete());

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
