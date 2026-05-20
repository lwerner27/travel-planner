import { json, error } from '@sveltejs/kit';
import { adminDb, adminStorage } from '$lib/server/firebase-admin';

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

	const snapshot = await adminDb
		.collection('trips')
		.doc(tripId)
		.collection('attachments')
		.where('date', '==', date)
		.get();

	const attachments = snapshot.docs.map((doc) => ({
		id: doc.id,
		...doc.data()
	}));

	return json(attachments);
}

export async function POST({ request, locals }) {
	if (!locals.user) throw error(401, 'Unauthorized');

	const formData = await request.formData();
	const file = formData.get('file') as File;
	const dayId = formData.get('dayId') as string;
	const fileName = formData.get('fileName') as string;
	const mimeType = formData.get('mimeType') as string;

	if (!file || !dayId) {
		throw error(400, 'Missing file or dayId');
	}

	const parts = dayId.split('-');
	if (parts.length < 4) {
		throw error(400, 'Invalid dayId format');
	}

	const date = parts.slice(-3).join('-');
	const tripId = parts.slice(0, -3).join('-');

	await checkTripOwnership(tripId, locals.user.uid);

	// Create a unique filename to avoid collisions
	const fileId = Math.random().toString(36).substr(2, 9);
	const safeFileName = `attachments/${tripId}/${fileId}-${fileName}`;
	
	try {
		const bucket = adminStorage.bucket();
		const blob = bucket.file(safeFileName);
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		await blob.save(buffer, {
			metadata: { contentType: mimeType }
		});

		// Make the file public (optional, depending on security needs)
		await blob.makePublic();

		// Construct the public URL
		const fileUrl = `https://storage.googleapis.com/${bucket.name}/${safeFileName}`;

		const attachmentData = {
			tripId,
			date,
			fileName,
			mimeType,
			fileUrl,
			storagePath: safeFileName // Store the path for easier deletion
		};

		const docRef = await adminDb
			.collection('trips')
			.doc(tripId)
			.collection('attachments')
			.add(attachmentData);

		return json({ id: docRef.id, ...attachmentData });
	} catch (err) {
		console.error('Error during attachment creation:', err);
		throw error(500, 'Failed to create attachment');
	}
}
