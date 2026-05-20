import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import fs from 'node:fs';
import path from 'node:path';

const UPLOADS_DIR = path.resolve('uploads');

export async function GET({ params, locals }) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const { id } = params;

	try {
		const trip = await prisma.trip.findUnique({
			where: { id, userId: locals.user.id }
		});

		if (!trip) {
			throw error(404, 'Trip not found');
		}

		return json(trip);
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
		// 1. Verify ownership and get attachments
		const trip = await prisma.trip.findUnique({
			where: { id, userId: locals.user.id },
			include: { attachments: true }
		});

		if (!trip) {
			throw error(404, 'Trip not found');
		}

		// 2. Delete physical files for attachments
		for (const attachment of trip.attachments) {
			const filename = attachment.fileUrl.split('/files/')[1];
			if (filename) {
				const filePath = path.join(UPLOADS_DIR, filename);
				if (fs.existsSync(filePath)) {
					fs.unlinkSync(filePath);
				}
			}
		}

		// 3. Delete trip from database (Cascade will handle record cleanup)
		await prisma.trip.delete({
			where: { id }
		});

		return json({ success: true });
	} catch (err) {
		console.error('Error deleting trip:', err);
		if ((err as any).status) throw err;
		throw error(500, 'Failed to delete trip');
	}
}
