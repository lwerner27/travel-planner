import { json, error } from '@sveltejs/kit';
import { adminDb } from '$lib/server/firebase-admin';

export async function GET({ locals }) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	try {
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
	} catch (err) {
		console.error('Error fetching trips:', err);
		// If the error is due to a missing index, we should still return an empty array or handle it
		if (err instanceof Error && err.message.includes('FAILED_PRECONDITION')) {
			console.warn('Firestore index required for orderBy. Falling back to un-ordered fetch.');
			const fallbackSnapshot = await adminDb
				.collection('trips')
				.where('userId', '==', locals.user.uid)
				.get();
			
			const trips = fallbackSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data()
			})) as any[];

			// Manual sort
			trips.sort((a, b) => (a.startDate > b.startDate ? 1 : -1));
			
			return json(trips);
		}
		throw error(500, 'Failed to fetch trips');
	}
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
