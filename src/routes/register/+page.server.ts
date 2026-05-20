import { lucia } from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import { generateId } from 'lucia';
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
		const confirmPassword = formData.get('confirmPassword');

		if (typeof email !== 'string' || email.length < 3 || email.length > 255) {
			return fail(400, { message: 'Invalid email' });
		}
		if (typeof password !== 'string' || password.length < 6 || password.length > 255) {
			return fail(400, { message: 'Invalid password (min 6 characters)' });
		}
		if (password !== confirmPassword) {
			return fail(400, { message: 'Passwords do not match' });
		}

		const userId = generateId(15);
		const hashedPassword = await new Scrypt().hash(password);

		try {
			const user = await prisma.user.create({
				data: {
					id: userId,
					email: email.toLowerCase(),
					password: hashedPassword
				}
			});

			const session = await lucia.createSession(user.id, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
			});
		} catch (e: any) {
			if (e.code === 'P2002') {
				return fail(400, { message: 'Email already in use' });
			}
			console.error(e);
			return fail(500, { message: 'An unknown error occurred' });
		}

		throw redirect(302, '/');
	}
};
