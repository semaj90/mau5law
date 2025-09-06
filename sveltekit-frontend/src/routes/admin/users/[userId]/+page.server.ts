import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/db/index.js';
import { users, cases, evidence, sessions, aiHistory, profileTable } from '$lib/db/schema.js';
import { eq, desc, count, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = await locals.auth.validate();
	if (!session) {
		throw redirect(302, '/login');
	}

	// Check if user is admin
	const adminCheck = await db.select().from(users).limit(1);
	if (adminCheck.length === 0 || adminCheck[0].id !== session.user.userId) {
		throw error(403, 'Admin access required');
	}

	const userId = parseInt(params.userId);
	if (isNaN(userId)) {
		throw error(400, 'Invalid user ID');
	}

	try {
		// Get user details with profile
		const userResult = await db
			.select({
				id: users.id,
				email: users.email,
				created_at: users.created_at,
				updated_at: users.updated_at,
				// Profile data
				profile_id: profileTable.id,
				firstName: profileTable.firstName,
				lastName: profileTable.lastName
			})
			.from(users)
			.leftJoin(profileTable, eq(profileTable.id, users.id))
			.where(eq(users.id, userId))
			.limit(1);

		if (userResult.length === 0) {
			throw error(404, 'User not found');
		}

		const user = userResult[0];

		// Get user statistics
		const [casesCount, evidenceCount, sessionsCount, aiHistoryCount] = await Promise.all([
			// Cases count
			db
				.select({ count: count() })
				.from(cases)
				.where(eq(cases.user_id, userId))
				.then(result => result[0]?.count || 0),

			// Evidence count
			db
				.select({ count: count() })
				.from(evidence)
				.where(eq(evidence.user_id, userId))
				.then(result => result[0]?.count || 0),

			// Active sessions count
			db
				.select({ count: count() })
				.from(sessions)
				.where(eq(sessions.user_id, userId))
				.then(result => result[0]?.count || 0),

			// AI interactions count
			db
				.select({ count: count() })
				.from(aiHistory)
				.where(eq(aiHistory.user_id, userId))
				.then(result => result[0]?.count || 0)
		]);

		// Get recent cases
		const recentCases = await db
			.select({
				id: cases.id,
				title: cases.title,
				status: cases.status,
				priority: cases.priority,
				created_at: cases.created_at,
				updated_at: cases.updated_at
			})
			.from(cases)
			.where(eq(cases.user_id, userId))
			.orderBy(desc(cases.updated_at))
			.limit(5);

		// Get recent AI interactions
		const recentAIInteractions = await db
			.select({
				id: aiHistory.id,
				agent_type: aiHistory.agent_type,
				interaction_type: aiHistory.interaction_type,
				prompt: aiHistory.prompt,
				response: aiHistory.response,
				model_used: aiHistory.model_used,
				tokens_used: aiHistory.tokens_used,
				created_at: aiHistory.created_at
			})
			.from(aiHistory)
			.where(eq(aiHistory.user_id, userId))
			.orderBy(desc(aiHistory.created_at))
			.limit(10);

		// Get active sessions
		const activeSessions = await db
			.select({
				id: sessions.id,
				expires_at: sessions.expires_at,
				created_at: sessions.created_at
			})
			.from(sessions)
			.where(eq(sessions.user_id, userId))
			.orderBy(desc(sessions.created_at))
			.limit(5);

		return {
			user: {
				id: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				created_at: user.created_at,
				updated_at: user.updated_at,
				profile_id: user.profile_id
			},
			stats: {
				casesCount,
				evidenceCount,
				sessionsCount,
				aiHistoryCount
			},
			recentCases,
			recentAIInteractions,
			activeSessions
		};
	} catch (err) {
		console.error('Error loading user details:', err);
		throw error(500, 'Failed to load user details');
	}
};

export const actions: Actions = {
	updateProfile: async ({ request, params, locals }) => {
		const session = await locals.auth.validate();
		if (!session) {
			throw redirect(302, '/login');
		}

		const userId = parseInt(params.userId);
		const formData = await request.formData();
		
		const firstName = formData.get('firstName')?.toString() || '';
		const lastName = formData.get('lastName')?.toString() || '';

		if (!firstName || !lastName) {
			return { success: false, error: 'First name and last name are required' };
		}

		try {
			// Check if profile exists
			const existingProfile = await db
				.select()
				.from(profileTable)
				.where(eq(profileTable.id, userId))
				.limit(1);

			if (existingProfile.length > 0) {
				// Update existing profile
				await db
					.update(profileTable)
					.set({
						firstName,
						lastName
					})
					.where(eq(profileTable.id, userId));
			} else {
				// Create new profile
				await db
					.insert(profileTable)
					.values({
						id: userId,
						firstName,
						lastName
					});
			}

			return { success: true, message: 'Profile updated successfully' };
		} catch (err) {
			console.error('Error updating profile:', err);
			return { success: false, error: 'Failed to update profile' };
		}
	},

	revokeSession: async ({ request, params, locals }) => {
		const session = await locals.auth.validate();
		if (!session) {
			throw redirect(302, '/login');
		}

		const formData = await request.formData();
		const sessionId = formData.get('sessionId')?.toString();

		if (!sessionId) {
			return { success: false, error: 'Session ID is required' };
		}

		try {
			await db
				.delete(sessions)
				.where(eq(sessions.id, sessionId));

			return { success: true, message: 'Session revoked successfully' };
		} catch (err) {
			console.error('Error revoking session:', err);
			return { success: false, error: 'Failed to revoke session' };
		}
	},

	resetPassword: async ({ request, params, locals }) => {
		const session = await locals.auth.validate();
		if (!session) {
			throw redirect(302, '/login');
		}

		const userId = parseInt(params.userId);
		const formData = await request.formData();
		const newPassword = formData.get('newPassword')?.toString();

		if (!newPassword || newPassword.length < 8) {
			return { success: false, error: 'Password must be at least 8 characters' };
		}

		try {
			// Hash the new password
			const { hash } = await import('@node-rs/argon2');
			const passwordHash = await hash(newPassword, {
				memoryCost: 19456,
				timeCost: 2,
				outputLen: 32,
				parallelism: 1
			});

			// Update user password
			await db
				.update(users)
				.set({
					password_hash: passwordHash,
					updated_at: new Date()
				})
				.where(eq(users.id, userId));

			// Revoke all existing sessions for this user
			await db
				.delete(sessions)
				.where(eq(sessions.user_id, userId));

			return { success: true, message: 'Password reset successfully. All sessions have been revoked.' };
		} catch (err) {
			console.error('Error resetting password:', err);
			return { success: false, error: 'Failed to reset password' };
		}
	}
};