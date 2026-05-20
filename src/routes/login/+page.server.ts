import { lucia } from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import { Scrypt } from 'oslo/password';
import { prisma } from '$lib/server/prisma';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(302, '/');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = formData.get('email');
		const password = formData.get('password');

		if (typeof email !== 'string' || email.length < 3 || email.length > 255) {
			return fail(400, { message: 'Invalid email' });
		}
		if (typeof password !== 'string' || password.length < 6 || password.length > 255) {
			return fail(400, { message: 'Invalid password' });
		}

		const existingUser = await prisma.user.findUnique({
			where: { email: email.toLowerCase() }
		});
		if (!existingUser) {
			return fail(400, { message: 'Incorrect email or password' });
		}

		const validPassword = await new Scrypt().verify(existingUser.password, password);
		if (!validPassword) {
			return fail(400, { message: 'Incorrect email or password' });
		}

		const session = await lucia.createSession(existingUser.id, {});
		const sessionCookie = lucia.createSessionCookie(session.id);
		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});

		throw redirect(302, '/');
	}
};
