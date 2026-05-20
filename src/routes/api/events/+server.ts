import { json, error } from '@sveltejs/kit';
import { adminDb } from '$lib/server/firebase-admin';

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
		.collection('events')
		.where('date', '==', date)
		.orderBy('time', 'asc')
		.get();

	const events = snapshot.docs.map((doc) => ({
		id: doc.id,
		...doc.data()
	}));

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

	await checkTripOwnership(tripId, locals.user.uid);

	try {
		const eventData = {
			tripId,
			date,
			title,
			time,
			description
		};
		const docRef = await adminDb
			.collection('trips')
			.doc(tripId)
			.collection('events')
			.add(eventData);

		return json({ id: docRef.id, ...eventData });
	} catch (err) {
		console.error('Error creating event:', err);
		throw error(500, 'Failed to create event');
	}
}
