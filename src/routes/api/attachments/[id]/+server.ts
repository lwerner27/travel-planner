import { json, error } from '@sveltejs/kit';
import { adminDb, adminStorage } from '$lib/server/firebase-admin';
import { PUBLIC_FIREBASE_STORAGE_BUCKET } from '$env/static/public';

export async function DELETE({ params, locals }) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const { id } = params;

	try {
		// Find the attachment document by querying across all subcollections
		const snapshot = await adminDb.collectionGroup('attachments').get();
		const doc = snapshot.docs.find(d => d.id === id);

		if (!doc) {
			throw error(404, 'Attachment not found');
		}

		const attachmentData = doc.data();
		const tripId = attachmentData.tripId;

		// Verify ownership of the trip
		const tripDoc = await adminDb.collection('trips').doc(tripId).get();
		if (!tripDoc.exists || tripDoc.data()?.userId !== locals.user.uid) {
			throw error(403, 'Forbidden');
		}

		// Delete the document from Firestore
		await doc.ref.delete();

		// Delete the file from Firebase Storage
		if (attachmentData.storagePath) {
			try {
				await adminStorage.bucket(PUBLIC_FIREBASE_STORAGE_BUCKET).file(attachmentData.storagePath).delete();
			} catch (storageErr) {
				console.error('Error deleting from storage:', storageErr);
			}
		}

		return json({ success: true });
	} catch (err) {
		console.error('Error deleting attachment:', err);
		// Check for missing index error in collectionGroup query
		if (err instanceof Error && err.message.includes('FAILED_PRECONDITION')) {
			console.error('Firestore Collection Group Index required for attachments. Link: https://console.firebase.google.com/v1/r/project/travel-planner-1f414/firestore/indexes?create_composite=ClJwcm9qZWN0cy90cmF2ZWwtcGxhbm5lci0xZjQxNC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvYXR0YWNobWVudHMvaW5kZXhlcy9fEAAaDAoIX19uYW1lX18QAQ');
		}
		if ((err as any).status) throw err;
		throw error(500, 'Failed to delete attachment');
	}
}
