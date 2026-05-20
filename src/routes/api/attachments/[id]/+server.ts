import { json, error } from '@sveltejs/kit';
import { adminDb, adminStorage } from '$lib/server/firebase-admin';

export async function DELETE({ params, locals }) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const { id } = params;

	try {
		const snapshot = await adminDb.collectionGroup('attachments').get();
		const doc = snapshot.docs.find(d => d.id === id);

		if (!doc) {
			throw error(404, 'Attachment not found');
		}

		const attachmentData = doc.data();
		const tripId = attachmentData.tripId;

		// Verify ownership
		const tripDoc = await adminDb.collection('trips').doc(tripId).get();
		if (!tripDoc.exists || tripDoc.data()?.userId !== locals.user.uid) {
			throw error(403, 'Forbidden');
		}

		// Delete the record from the database
		await doc.ref.delete();

		// Delete the file from Firebase Storage
		if (attachmentData.storagePath) {
			try {
				await adminStorage.bucket().file(attachmentData.storagePath).delete();
			} catch (storageErr) {
				console.error('Error deleting from storage:', storageErr);
				// We don't throw here to ensure the DB deletion is considered successful
			}
		}

		return json({ success: true });
	} catch (err) {
		console.error('Error deleting attachment:', err);
		if ((err as any).status) throw err;
		throw error(500, 'Failed to delete attachment');
	}
}
