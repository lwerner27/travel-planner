import { json, error } from '@sveltejs/kit';
import { adminDb } from '$lib/server/firebase-admin';
import fs from 'node:fs';
import path from 'node:path';

const UPLOADS_DIR = path.resolve('uploads');

export async function DELETE({ params, locals }) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const { id } = params;

	try {
		// Since we don't have the tripId in the URL, we use a collectionGroup query to find the attachment
		// Note: This requires an index if we add more filters, but for documentId it might work directly
		// However, it's safer to store attachments in a way that we can find them.
		// For now, let's try to find it by querying across all attachments subcollections.
		const snapshot = await adminDb.collectionGroup('attachments').get();
		const doc = snapshot.docs.find(d => d.id === id);

		if (!doc) {
			throw error(404, 'Attachment not found');
		}

		const attachmentData = doc.data();
		const tripId = attachmentData.tripId;

		// Verify ownership of the parent trip
		const tripDoc = await adminDb.collection('trips').doc(tripId).get();
		if (!tripDoc.exists || tripDoc.data()?.userId !== locals.user.uid) {
			throw error(403, 'Forbidden');
		}

		// Delete the record from the database
		await doc.ref.delete();

		// Delete the file from the disk (Temporary, will be moved to Firebase Storage in Phase 4)
		const filename = attachmentData.fileUrl.split('/files/')[1];
		if (filename) {
			const filePath = path.join(UPLOADS_DIR, filename);
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
			}
		}

		return json({ success: true });
	} catch (err) {
		console.error('Error deleting attachment:', err);
		if ((err as any).status) throw err;
		throw error(500, 'Failed to delete attachment');
	}
}
