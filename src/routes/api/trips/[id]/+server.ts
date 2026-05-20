import { json, error } from '@sveltejs/kit';
import { adminDb, adminStorage } from '$lib/server/firebase-admin';
import { PUBLIC_FIREBASE_STORAGE_BUCKET } from '$env/static/public';

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
		const subcollections = ['events', 'locations', 'attachments'];
		for (const sub of subcollections) {
			const subSnapshot = await tripRef.collection(sub).get();
			
			if (sub === 'attachments') {
				// Delete files from storage
				for (const attachDoc of subSnapshot.docs) {
					const data = attachDoc.data();
					if (data.storagePath) {
						try {
							await adminStorage.bucket(PUBLIC_FIREBASE_STORAGE_BUCKET).file(data.storagePath).delete();
						} catch (e) {
							console.error('Error deleting attachment file:', e);
						}
					}
				}
			}

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
