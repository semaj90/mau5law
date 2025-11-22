import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user?.id) {
		throw redirect(302, '/login');
	}

	// Check if user has prosecutor role
	const userRole = (locals.user as any)?.role;
	if (userRole !== 'prosecutor' && userRole !== 'supervisor' && userRole !== 'admin') {
		throw redirect(302, '/');
	}

	return {
		user: {
			id: locals.user.id,
			email: (locals.user as any)?.email,
			role: userRole
		}
	};
};
