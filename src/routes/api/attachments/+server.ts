import { json, error } from '@sveltejs/kit';
import { adminDb } from '$lib/server/firebase-admin';
import fs from 'node:fs';
import path from 'node:path';

const UPLOADS_DIR = path.resolve('uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
	fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

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
	const safeFileName = `${fileId}-${fileName}`;
	const filePath = path.join(UPLOADS_DIR, safeFileName);
	
	try {
		// Write file to disk (Temporary, will be moved to Firebase Storage in Phase 4)
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		fs.writeFileSync(filePath, buffer);

		const fileUrl = `/files/${safeFileName}`;

		const attachmentData = {
			tripId,
			date,
			fileName,
			mimeType,
			fileUrl
		};

		const docRef = await adminDb
			.collection('trips')
			.doc(tripId)
			.collection('attachments')
			.add(attachmentData);

		return json({ id: docRef.id, ...attachmentData });
	} catch (err) {
		console.error('Error during attachment creation:', err);
		// Cleanup file on error
		if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
		throw error(500, 'Failed to create attachment');
	}
}
