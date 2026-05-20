import { json, error } from '@sveltejs/kit';
import { adminDb } from '$lib/server/firebase-admin';

export async function GET({ locals }) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const snapshot = await adminDb
		.collection('trips')
		.where('userId', '==', locals.user.uid)
		.orderBy('startDate', 'asc')
		.get();

	const trips = snapshot.docs.map((doc) => ({
		id: doc.id,
		...doc.data()
	}));

	return json(trips);
}

export async function POST({ request, locals }) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const { title, startDate, endDate } = await request.json();

	const tripData = {
		userId: locals.user.uid,
		title,
		startDate: new Date(startDate + 'T00:00:00').toISOString(),
		endDate: new Date(endDate + 'T00:00:00').toISOString()
	};

	const docRef = await adminDb.collection('trips').add(tripData);
	const trip = { id: docRef.id, ...tripData };

	return json(trip);
}
