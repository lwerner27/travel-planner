import { json, error } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';

async function checkTripOwnership(tripId: string, userId: string) {
	const trip = await prisma.trip.findUnique({
		where: { id: tripId, userId }
	});
	if (!trip) throw error(403, 'Forbidden');
}

export async function GET({ url, locals }) {
	if (!locals.user) throw error(401, 'Unauthorized');

	const dayId = url.searchParams.get('dayId');
	if (!dayId) return json([]);

	const parts = dayId.split('-');
	if (parts.length < 4) return json([]);

	const date = parts.slice(-3).join('-');
	const tripId = parts.slice(0, -3).join('-');

	await checkTripOwnership(tripId, locals.user.id);

	const events = await prisma.event.findMany({
		where: { tripId, date },
		orderBy: { time: 'asc' }
	});

	return json(events);
}

export async function POST({ request, locals }) {
	if (!locals.user) throw error(401, 'Unauthorized');

	const { dayId, title, time, description } = await request.json();

	const parts = dayId.split('-');
	if (parts.length < 4) {
		throw error(400, 'Invalid dayId format');
	}

	const date = parts.slice(-3).join('-');
	const tripId = parts.slice(0, -3).join('-');

	await checkTripOwnership(tripId, locals.user.id);

	try {
		const event = await prisma.event.create({
			data: {
				tripId,
				date,
				title,
				time,
				description
			}
		});
		return json(event);
	} catch (err) {
		console.error('Error creating event:', err);
		throw error(500, 'Failed to create event');
	}
}
