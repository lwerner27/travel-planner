import { json, error } from '@sveltejs/kit';
import { adminDb } from '$lib/server/firebase-admin';

export async function GET({ params, locals }) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const { id } = params;

	try {
		const doc = await adminDb.collection('trips').doc(id).get();

		if (!doc.exists || doc.data()?.userId !== locals.user.uid) {
			throw error(404, 'Trip not found');
		}

		return json({ id: doc.id, ...doc.data() });
	} catch (err) {
		console.error('Error fetching trip:', err);
		if ((err as any).status) throw err;
		throw error(500, 'Failed to fetch trip');
	}
}

export async function DELETE({ params, locals }) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const { id } = params;

	try {
		const tripRef = adminDb.collection('trips').doc(id);
		const doc = await tripRef.get();

		if (!doc.exists || doc.data()?.userId !== locals.user.uid) {
			throw error(404, 'Trip not found');
		}

		// Delete subcollections (events, locations, attachments)
		// Note: For a production app, you might want to use a more robust way to delete subcollections
		// but for this prototype, we'll do it manually.
		const subcollections = ['events', 'locations', 'attachments'];
		for (const sub of subcollections) {
			const subSnapshot = await tripRef.collection(sub).get();
			const batch = adminDb.batch();
			subSnapshot.docs.forEach((d) => batch.delete(d.ref));
			await batch.commit();
		}

		// Delete the trip document itself
		await tripRef.delete();

		return json({ success: true });
	} catch (err) {
		console.error('Error deleting trip:', err);
		if ((err as any).status) throw err;
		throw error(500, 'Failed to delete trip');
	}
}
