import { json, error } from '@sveltejs/kit';
import { adminDb, adminStorage } from '$lib/server/firebase-admin';
import { PUBLIC_FIREBASE_STORAGE_BUCKET } from '$env/static/public';
import { attachmentSchema } from '$lib/schemas';

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
			.collection('attachments')
			.where('date', '==', date)
			.get();

		const bucket = adminStorage.bucket(PUBLIC_FIREBASE_STORAGE_BUCKET);
		const attachments = await Promise.all(
			snapshot.docs.map(async (doc) => {
				const data = doc.data();
				let fileUrl = data.fileUrl;

				if (data.storagePath) {
					try {
						const [url] = await bucket.file(data.storagePath).getSignedUrl({
							version: 'v4',
							action: 'read',
							expires: Date.now() + 15 * 60 * 1000 // 15 minutes
						});
						fileUrl = url;
					} catch (signErr) {
						console.error('Error signing URL:', signErr);
					}
				}

				return {
					id: doc.id,
					...data,
					fileUrl
				};
			})
		);

		return json(attachments);
	} catch (err) {
		console.error('Error fetching attachments:', err);
		throw error(500, 'Failed to fetch attachments');
	}
}

export async function POST({ request, locals }) {
	if (!locals.user) throw error(401, 'Unauthorized');

	const formData = await request.formData();
	const file = formData.get('file') as File;
	
	const data = {
		dayId: formData.get('dayId') as string,
		fileName: formData.get('fileName') as string,
		mimeType: formData.get('mimeType') as string
	};

	const validation = attachmentSchema.safeParse(data);
	if (!validation.success) {
		throw error(400, { message: 'Validation failed', errors: validation.error.flatten() } as any);
	}

	if (!file) {
		throw error(400, 'Missing file');
	}

	const { dayId, fileName, mimeType } = validation.data;

	const parts = dayId.split('-');
	if (parts.length < 4) {
		throw error(400, 'Invalid dayId format');
	}

	const date = parts.slice(-3).join('-');
	const tripId = parts.slice(0, -3).join('-');

	await checkTripOwnership(tripId, locals.user.uid);

	// Create a unique filename to avoid collisions
	const fileId = Math.random().toString(36).substr(2, 9);
	const storagePath = `attachments/${tripId}/${fileId}-${fileName}`;
	
	try {
		// Explicitly use the bucket name from environment variables
		const bucket = adminStorage.bucket(PUBLIC_FIREBASE_STORAGE_BUCKET);
		
		console.log('Attempting upload to bucket:', bucket.name);

		const blob = bucket.file(storagePath);
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		await blob.save(buffer, {
			metadata: { contentType: mimeType }
		});

		// Generate a signed URL for the response (15 minutes expiry)
		const [signedUrl] = await blob.getSignedUrl({
			version: 'v4',
			action: 'read',
			expires: Date.now() + 15 * 60 * 1000
		});

		const attachmentData = {
			tripId,
			date,
			fileName,
			mimeType,
			storagePath
		};

		const docRef = await adminDb
			.collection('trips')
			.doc(tripId)
			.collection('attachments')
			.add(attachmentData);

		return json({ id: docRef.id, ...attachmentData, fileUrl: signedUrl });
	} catch (err) {
		console.error('Error during attachment creation:', err);
		throw error(500, `Failed to create attachment: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
}
