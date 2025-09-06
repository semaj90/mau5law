/**
 * User Management Schema - Complete CRUD Operations
 * PostgreSQL + pgvector + Drizzle ORM
 */

import { pgTable, text, timestamp, boolean, serial, varchar, jsonb, vector, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
// import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

export const insertUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  passwordHash: z.string(),
  role: z.string().default('user'),
  isActive: z.boolean().default(true),
  isVerified: z.boolean().default(false),
  jurisdiction: z.string().optional(),
  practiceAreas: z.any().optional(),
  barNumber: z.string().optional(),
  firmName: z.string().optional(),
  metadata: z.any().default({})
});

export const updateUserSchema = insertUserSchema.partial();
;
export const insertProfileSchema = z.object({
  userId: z.number(),
  bio: z.string().optional(),
  preferences: z.any().default({}),
  specializations: z.array(z.string()).default([]),
  experienceLevel: z.string().optional(),
  visibility: z.string().default('private')
});

export const updateProfileSchema = insertProfileSchema.partial();
;
// ============================================================================
// USER ACCOUNTS TABLE
// ============================================================================

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  isActive: boolean('is_active').notNull().default(true),
  isVerified: boolean('is_verified').notNull().default(false),
  
  // Legal AI specific fields
  jurisdiction: varchar('jurisdiction', { length: 100 }),
  practiceAreas: jsonb('practice_areas'),
  barNumber: varchar('bar_number', { length: 50 }),
  firmName: varchar('firm_name', { length: 200 }),
  
  // Profile embedding for AI recommendations
  profileEmbedding: vector('profile_embedding', { dimensions: 384 }),
  
  // Metadata and timestamps
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
  
  // Soft delete
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  // Indexes for performance
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  roleIdx: index('users_role_idx').on(table.role),
  jurisdictionIdx: index('users_jurisdiction_idx').on(table.jurisdiction),
  profileEmbeddingIdx: index('users_profile_embedding_idx').using(
    'hnsw',
    table.profileEmbedding.op('vector_cosine_ops')
  ),
  createdAtIdx: index('users_created_at_idx').on(table.createdAt),
  isActiveIdx: index('users_is_active_idx').on(table.isActive),
}));

// ============================================================================
// USER SESSIONS TABLE
// ============================================================================

export const userSessions = pgTable('user_sessions', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionId: varchar('session_id', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  isActive: boolean('is_active').notNull().default(true),
  
  // Session context for legal work
  sessionContext: jsonb('session_context').default({}),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  sessionIdIdx: uniqueIndex('user_sessions_session_id_idx').on(table.sessionId),
  userIdIdx: index('user_sessions_user_id_idx').on(table.userId),
  expiresAtIdx: index('user_sessions_expires_at_idx').on(table.expiresAt),
  isActiveIdx: index('user_sessions_is_active_idx').on(table.isActive),
}));

// ============================================================================
// USER PROFILES TABLE (Extended Information)
// ============================================================================

export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  
  // Personal information
  phoneNumber: varchar('phone_number', { length: 20 }),
  address: jsonb('address'),
  
  // Professional information
  licenseNumber: varchar('license_number', { length: 50 }),
  yearsOfExperience: serial('years_of_experience'),
  specializations: jsonb('specializations').default([]),
  education: jsonb('education').default([]),
  
  // Preferences and settings
  preferences: jsonb('preferences').default({}),
  
  // Avatar and profile image
  avatarUrl: varchar('avatar_url', { length: 500 }),
  bio: text('bio'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: uniqueIndex('user_profiles_user_id_idx').on(table.userId),
}));

// ============================================================================
// USER ACTIVITY LOG TABLE
// ============================================================================

export const userActivityLog = pgTable('user_activity_log', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionId: varchar('session_id', { length: 255 }),
  
  // Activity details
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }),
  resourceId: varchar('resource_id', { length: 100 }),
  
  // Request details
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  
  // Activity context
  context: jsonb('context').default({}),
  
  // Results
  success: boolean('success').notNull().default(true),
  errorMessage: text('error_message'),
  
  // Timing
  duration: serial('duration'), // milliseconds
  timestamp: timestamp('timestamp').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('user_activity_log_user_id_idx').on(table.userId),
  actionIdx: index('user_activity_log_action_idx').on(table.action),
  timestampIdx: index('user_activity_log_timestamp_idx').on(table.timestamp),
  sessionIdIdx: index('user_activity_log_session_id_idx').on(table.sessionId),
}));

// ============================================================================
// ZONT SCHEMAS FOR VALIDATION
// ============================================================================

// User insert/update schemas (commented out until drizzle-zod is available)
// export const insertUserSchema = createInsertSchema(users, {
//   email: z.string().email(),
//   firstName: z.string().min(1).max(100),
//   lastName: z.string().min(1).max(100),
//   role: z.enum(['admin', 'attorney', 'paralegal', 'investigator', 'user']),
//   practiceAreas: z.array(z.string()).optional(),
// });

// export const selectUserSchema = createSelectSchema(users);
// export const updateUserSchema = insertUserSchema.partial();

// // Session schemas
// export const insertSessionSchema = createInsertSchema(userSessions);
// export const selectSessionSchema = createSelectSchema(userSessions);

// // Profile schemas
// export const insertProfileSchema = createInsertSchema(userProfiles);
// export const selectProfileSchema = createSelectSchema(userProfiles);
// export const updateProfileSchema = insertProfileSchema.partial();

// // Activity log schema
// export const insertActivitySchema = createInsertSchema(userActivityLog);

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type UserActivity = typeof userActivityLog.$inferSelect;
export type NewUserActivity = typeof userActivityLog.$inferInsert;

// Enhanced types for API responses
export type UserWithProfile = User & { profile?: UserProfile };
export type UserWithSessions = User & { sessions?: UserSession[] };
export type FullUserProfile = User & { 
  profile?: UserProfile; 
  sessions?: UserSession[];
  recentActivity?: UserActivity[];
};

// ============================================================================
// DATABASE RELATIONS (for Drizzle Relational Queries)
// ============================================================================

import { relations } from 'drizzle-orm/relations';

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  sessions: many(userSessions),
  activities: many(userActivityLog),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const userActivityLogRelations = relations(userActivityLog, ({ one }) => ({
  user: one(users, {
    fields: [userActivityLog.userId],
    references: [users.id],
  }),
}));