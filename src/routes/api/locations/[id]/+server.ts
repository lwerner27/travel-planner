import { json, error } from '@sveltejs/kit';
import { adminDb } from '$lib/server/firebase-admin';

export async function DELETE({ params, locals }) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const { id } = params;

	try {
		// Find the location document
		const snapshot = await adminDb.collectionGroup('locations').get();
		const doc = snapshot.docs.find(d => d.id === id);

		if (!doc) {
			throw error(404, 'Location not found');
		}

		const locationData = doc.data();
		const tripId = locationData.tripId;

		// Verify ownership of the trip
		const tripDoc = await adminDb.collection('trips').doc(tripId).get();
		if (!tripDoc.exists || tripDoc.data()?.userId !== locals.user.uid) {
			throw error(403, 'Forbidden');
		}

		// Delete the location from Firestore
		await doc.ref.delete();

		return json({ success: true });
	} catch (err) {
		console.error('Error deleting location:', err);
		if ((err as any).status) throw err;
		throw error(500, 'Failed to delete location');
	}
}
