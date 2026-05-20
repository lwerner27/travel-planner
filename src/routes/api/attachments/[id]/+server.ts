import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import fs from 'node:fs';
import path from 'node:path';

const UPLOADS_DIR = path.resolve('uploads');

export async function DELETE({ params, locals }) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const { id } = params;

	try {
		// 1. Find the attachment record
		const attachment = await prisma.attachment.findUnique({
			where: { id },
			include: { trip: true }
		});

		if (!attachment) {
			throw error(404, 'Attachment not found');
		}

		// 2. Verify ownership
		if (attachment.trip.userId !== locals.user.id) {
			throw error(403, 'Forbidden');
		}

		// 3. Delete the record from the database
		await prisma.attachment.delete({
			where: { id }
		});

		// 4. Delete the file from the disk
		const filename = attachment.fileUrl.split('/files/')[1];
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
