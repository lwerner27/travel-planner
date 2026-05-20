import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const user = locals.user;

	// List of public paths
	const publicPaths = ['/login', '/register'];
	const isPublicPath = publicPaths.includes(url.pathname);

	if (!user && !isPublicPath) {
		throw redirect(302, '/login');
	}

	return {
		user
	};
};
