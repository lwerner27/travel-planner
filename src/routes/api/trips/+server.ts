import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';

export async function GET({ locals }) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const trips = await prisma.trip.findMany({
		where: { userId: locals.user.id },
		orderBy: { startDate: 'asc' }
	});
	return json(trips);
}

export async function POST({ request, locals }) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const { title, startDate, endDate } = await request.json();

	const trip = await prisma.trip.create({
		data: {
			userId: locals.user.id,
			title,
			startDate: new Date(startDate + 'T00:00:00'),
			endDate: new Date(endDate + 'T00:00:00')
		}
	});

	return json(trip);
}
