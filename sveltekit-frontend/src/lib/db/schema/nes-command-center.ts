/**
 * NES Command Center Database Schema
 *
 * Persistent storage for route metadata, error tracking, health status,
 * and user interactions. Enables historical analysis, trend tracking,
 * and integration with Error Brain for AI-powered error resolution.
 *
 * @module schema/nes-command-center
 */

import {
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Route Metadata Table
 *
 * Stores metadata for all routes in the application including path, kind,
 * group, status, priority, and badges. Uses soft delete pattern with archived_at.
 */
export const routeMetadata = pgTable(
	'route_metadata',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		routeId: varchar('route_id', { length: 255 }).unique().notNull(), // e.g., "/cases/[id]/overview"
		path: varchar('path', { length: 255 }).notNull(),
		kind: varchar('kind', { length: 50 }).notNull(), // page, layout, server, endpoint
		group: varchar('group', { length: 100 }), // (app), (yorha), etc.
		status: varchar('status', { length: 50 }).default('healthy'), // healthy, flaky, broken
		priority: integer('priority').default(50),
		badges: jsonb('badges').default([]), // ["ai", "shield", "special"]
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull(),
		archivedAt: timestamp('archived_at'), // Soft delete pattern
	},
	(table) => ({
		routeIdIndex: index('idx_route_metadata_route_id').on(table.routeId),
		statusIndex: index('idx_route_metadata_status').on(table.status),
		archivedAtIndex: index('idx_route_metadata_archived_at').on(table.archivedAt),
	})
);

/**
 * Error Cluster Table
 *
 * Stores clustered errors for each route including tool, code, severity,
 * and resolution status. Enables error tracking and trend analysis.
 */
export const errorCluster = pgTable(
	'error_cluster',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		routeId: varchar('route_id', { length: 255 })
			.notNull()
			.references(() => routeMetadata.routeId, { onDelete: 'cascade' }),
		tool: varchar('tool', { length: 100 }).notNull(), // svelte-check, tsc, vite, drizzle
		code: varchar('code', { length: 100 }).notNull(), // TS2345, import-type, etc.
		message: text('message').notNull(),
		severity: varchar('severity', { length: 50 }).notNull(), // error, warning, info
		count: integer('count').default(1).notNull(),
		filePath: varchar('file_path', { length: 255 }),
		rawLogSnippet: text('raw_log_snippet'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		resolvedAt: timestamp('resolved_at'),
		archivedAt: timestamp('archived_at'), // Soft delete pattern
	},
	(table) => ({
		routeIdIndex: index('idx_error_cluster_route_id').on(table.routeId),
		severityIndex: index('idx_error_cluster_severity').on(table.severity),
		createdAtIndex: index('idx_error_cluster_created_at').on(table.createdAt),
		resolvedAtIndex: index('idx_error_cluster_resolved_at').on(table.resolvedAt),
		toolIndex: index('idx_error_cluster_tool').on(table.tool),
	})
);

/**
 * Route Health Event Table
 *
 * Tracks health status changes for routes over time. Enables historical
 * analysis of route stability and health trends.
 */
export const routeHealthEvent = pgTable(
	'route_health_event',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		routeId: varchar('route_id', { length: 255 })
			.notNull()
			.references(() => routeMetadata.routeId, { onDelete: 'cascade' }),
		oldStatus: varchar('old_status', { length: 50 }), // healthy, flaky, broken
		newStatus: varchar('new_status', { length: 50 }).notNull(),
		reason: varchar('reason', { length: 255 }), // "error_cluster_created", "error_resolved", etc.
		createdAt: timestamp('created_at').defaultNow().notNull(),
	},
	(table) => ({
		routeIdIndex: index('idx_route_health_event_route_id').on(table.routeId),
		createdAtIndex: index('idx_route_health_event_created_at').on(table.createdAt),
	})
);

/**
 * Error Brain Analysis Table
 *
 * Stores AI-powered error analysis results including suggestions,
 * selected suggestion, phase, and completion status.
 */
export const errorBrainAnalysis = pgTable(
	'error_brain_analysis',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		routeId: varchar('route_id', { length: 255 })
			.notNull()
			.references(() => routeMetadata.routeId, { onDelete: 'cascade' }),
		suggestions: jsonb('suggestions').notNull(), // Array of suggestion objects
		selectedSuggestionIndex: integer('selected_suggestion_index'),
		phase: varchar('phase', { length: 50 }), // analyzing, suggesting, applying, verifying, done, failed
		errorMessage: text('error_message'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		completedAt: timestamp('completed_at'),
	},
	(table) => ({
		routeIdIndex: index('idx_error_brain_analysis_route_id').on(table.routeId),
		createdAtIndex: index('idx_error_brain_analysis_created_at').on(table.createdAt),
	})
);

/**
 * Error Brain Patch Table
 *
 * Stores patches generated by Error Brain including content, verification
 * status, and application timestamp.
 */
export const errorBrainPatch = pgTable(
	'error_brain_patch',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		analysisId: uuid('analysis_id')
			.notNull()
			.references(() => errorBrainAnalysis.id, { onDelete: 'cascade' }),
		routeId: varchar('route_id', { length: 255 })
			.notNull()
			.references(() => routeMetadata.routeId, { onDelete: 'cascade' }),
		patchContent: text('patch_content').notNull(),
		appliedAt: timestamp('applied_at'),
		verificationStatus: varchar('verification_status', { length: 50 }), // pending, passed, failed
		verificationTimestamp: timestamp('verification_timestamp'),
		verificationMessage: text('verification_message'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
	},
	(table) => ({
		analysisIdIndex: index('idx_error_brain_patch_analysis_id').on(table.analysisId),
		routeIdIndex: index('idx_error_brain_patch_route_id').on(table.routeId),
		verificationStatusIndex: index('idx_error_brain_patch_verification_status').on(
			table.verificationStatus
		),
	})
);

/**
 * Route Interaction Log Table
 *
 * Logs user interactions with routes including views, navigations,
 * analyses, and patch applications. Enables usage analytics.
 */
export const routeInteractionLog = pgTable(
	'route_interaction_log',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		routeId: varchar('route_id', { length: 255 })
			.notNull()
			.references(() => routeMetadata.routeId, { onDelete: 'cascade' }),
		userId: varchar('user_id', { length: 255 }),
		interactionType: varchar('interaction_type', { length: 50 }).notNull(), // view, navigate, analyze, patch_apply
		metadata: jsonb('metadata'), // Additional context
		createdAt: timestamp('created_at').defaultNow().notNull(),
	},
	(table) => ({
		routeIdIndex: index('idx_route_interaction_log_route_id').on(table.routeId),
		userIdIndex: index('idx_route_interaction_log_user_id').on(table.userId),
		createdAtIndex: index('idx_route_interaction_log_created_at').on(table.createdAt),
	})
);

/**
 * Relations
 *
 * Define relationships between tables for better query experience
 * with Drizzle ORM.
 */
export const routeMetadataRelations = relations(routeMetadata, ({ many }) => ({
	errorClusters: many(errorCluster),
	healthEvents: many(routeHealthEvent),
	analyses: many(errorBrainAnalysis),
	patches: many(errorBrainPatch),
	interactions: many(routeInteractionLog),
}));

export const errorClusterRelations = relations(errorCluster, ({ one }) => ({
	route: one(routeMetadata, {
		fields: [errorCluster.routeId],
		references: [routeMetadata.routeId],
	}),
}));

export const routeHealthEventRelations = relations(routeHealthEvent, ({ one }) => ({
	route: one(routeMetadata, {
		fields: [routeHealthEvent.routeId],
		references: [routeMetadata.routeId],
	}),
}));

export const errorBrainAnalysisRelations = relations(errorBrainAnalysis, ({ one, many }) => ({
	route: one(routeMetadata, {
		fields: [errorBrainAnalysis.routeId],
		references: [routeMetadata.routeId],
	}),
	patches: many(errorBrainPatch),
}));

export const errorBrainPatchRelations = relations(errorBrainPatch, ({ one }) => ({
	analysis: one(errorBrainAnalysis, {
		fields: [errorBrainPatch.analysisId],
		references: [errorBrainAnalysis.id],
	}),
	route: one(routeMetadata, {
		fields: [errorBrainPatch.routeId],
		references: [routeMetadata.routeId],
	}),
}));

export const routeInteractionLogRelations = relations(routeInteractionLog, ({ one }) => ({
	route: one(routeMetadata, {
		fields: [routeInteractionLog.routeId],
		references: [routeMetadata.routeId],
	}),
}));

/**
 * Type Exports
 *
 * TypeScript types for insert and select operations
 */
export type RouteMetadata = typeof routeMetadata.$inferSelect;
export type NewRouteMetadata = typeof routeMetadata.$inferInsert;

export type ErrorCluster = typeof errorCluster.$inferSelect;
export type NewErrorCluster = typeof errorCluster.$inferInsert;

export type RouteHealthEvent = typeof routeHealthEvent.$inferSelect;
export type NewRouteHealthEvent = typeof routeHealthEvent.$inferInsert;

export type ErrorBrainAnalysis = typeof errorBrainAnalysis.$inferSelect;
export type NewErrorBrainAnalysis = typeof errorBrainAnalysis.$inferInsert;

export type ErrorBrainPatch = typeof errorBrainPatch.$inferSelect;
export type NewErrorBrainPatch = typeof errorBrainPatch.$inferInsert;

export type RouteInteractionLog = typeof routeInteractionLog.$inferSelect;
export type NewRouteInteractionLog = typeof routeInteractionLog.$inferInsert;
