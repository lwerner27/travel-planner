import { adminAuth } from '$lib/server/firebase-admin';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { idToken } = await request.json();

	// Set session expiration to 5 days.
	const expiresIn = 60 * 60 * 24 * 5 * 1000;

	try {
		const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
		
		cookies.set('session', sessionCookie, {
			maxAge: expiresIn,
			httpOnly: true,
			secure: true,
			path: '/'
		});

		return json({ status: 'signedIn' });
	} catch (error) {
		console.error('Error creating session cookie:', error);
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
};

export const DELETE: RequestHandler = async ({ cookies }) => {
	cookies.delete('session', { path: '/' });
	return json({ status: 'signedOut' });
};
