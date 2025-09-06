import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/db/index.js';
import { users, profileTable } from '$lib/db/schema.js';
import { eq, desc, like, or } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';

export const load: PageServerLoad = async ({ url, locals }) => {
	const session = await locals.auth.validate();
	if (!session) {
		throw redirect(302, '/login');
	}

	// Check if user is admin (you might want to add an admin role field)
	// For now, we'll assume the first user is admin
	const adminCheck = await db.select().from(users).limit(1);
	if (adminCheck.length === 0 || adminCheck[0].id !== session.user.userId) {
		throw error(403, 'Admin access required');
	}

	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '20');
	const search = url.searchParams.get('search') || '';
	const offset = (page - 1) * limit;

	try {
		let query = db
			.select({
				id: users.id,
				email: users.email,
				created_at: users.created_at,
				updated_at: users.updated_at
			})
			.from(users);

		// Add search filter if provided
		if (search) {
			query = query.where(
				or(
					like(users.email, `%${search}%`)
				)
			);
		}

		const usersResult = await query
			.orderBy(desc(users.created_at))
			.limit(limit)
			.offset(offset);

		// Get total count for pagination
		const totalCountResult = search
			? await db
					.select({ count: users.id })
					.from(users)
					.where(
						or(
							like(users.email, `%${search}%`)
						)
					)
			: await db.select({ count: users.id }).from(users);

		const totalUsers = totalCountResult.length;
		const totalPages = Math.ceil(totalUsers / limit);

		return {
			users: usersResult,
			pagination: {
				currentPage: page,
				totalPages,
				totalUsers,
				limit,
				hasNext: page < totalPages,
				hasPrev: page > 1
			},
			search
		};
	} catch (err) {
		console.error('Error loading users:', err);
		throw error(500, 'Failed to load users');
	}
};

export const actions: Actions = {
	createUser: async ({ request, locals }) => {
		const session = await locals.auth.validate();
		if (!session) {
			throw redirect(302, '/login');
		}

		const formData = await request.formData();
		const email = formData.get('email')?.toString();
		const password = formData.get('password')?.toString();
		const confirmPassword = formData.get('confirmPassword')?.toString();

		if (!email || !password) {
			return {
				success: false,
				error: 'Email and password are required',
				formData: { email }
			};
		}

		if (password !== confirmPassword) {
			return {
				success: false,
				error: 'Passwords do not match',
				formData: { email }
			};
		}

		if (password.length < 8) {
			return {
				success: false,
				error: 'Password must be at least 8 characters',
				formData: { email }
			};
		}

		try {
			// Check if email already exists
			const existingUser = await db
				.select()
				.from(users)
				.where(eq(users.email, email))
				.limit(1);

			if (existingUser.length > 0) {
				return {
					success: false,
					error: 'Email already exists',
					formData: { email }
				};
			}

			// Hash password
			const passwordHash = await hash(password, {
				memoryCost: 19456,
				timeCost: 2,
				outputLen: 32,
				parallelism: 1
			});

			// Create user
			const newUser = await db
				.insert(users)
				.values({
					email,
					password_hash: passwordHash
				})
				.returning();

			return {
				success: true,
				user: {
					id: newUser[0].id,
					email: newUser[0].email,
					created_at: newUser[0].created_at
				}
			};
		} catch (err) {
			console.error('Error creating user:', err);
			return {
				success: false,
				error: 'Failed to create user',
				formData: { email }
			};
		}
	},

	deleteUser: async ({ request, locals }) => {
		const session = await locals.auth.validate();
		if (!session) {
			throw redirect(302, '/login');
		}

		const formData = await request.formData();
		const userId = parseInt(formData.get('userId')?.toString() || '0');

		if (!userId) {
			return { success: false, error: 'User ID is required' };
		}

		// Prevent admin from deleting themselves
		if (userId === session.user.userId) {
			return { success: false, error: 'Cannot delete your own account' };
		}

		try {
			const deleteResult = await db
				.delete(users)
				.where(eq(users.id, userId))
				.returning();

			if (deleteResult.length === 0) {
				return { success: false, error: 'User not found' };
			}

			return { success: true, deletedUser: deleteResult[0] };
		} catch (err) {
			console.error('Error deleting user:', err);
			return { success: false, error: 'Failed to delete user' };
		}
	},

	toggleUserStatus: async ({ request, locals }) => {
		const session = await locals.auth.validate();
		if (!session) {
			throw redirect(302, '/login');
		}

		const formData = await request.formData();
		const userId = parseInt(formData.get('userId')?.toString() || '0');

		if (!userId) {
			return { success: false, error: 'User ID is required' };
		}

		try {
			// For now, we don't have a status field, but you could add one to the schema
			// This is a placeholder for user status management
			return { success: true, message: 'User status updated' };
		} catch (err) {
			console.error('Error updating user status:', err);
			return { success: false, error: 'Failed to update user status' };
		}
	}
};