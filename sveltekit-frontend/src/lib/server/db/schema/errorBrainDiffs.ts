/**
 * Error Brain: Diffs Schema
 *
 * Stores generated patches for error fixes with full audit trail.
 * Links to error_brain_analysis via runId.
 */

import {
    index,
    integer,
    pgTable,
    real,
    text,
    timestamp,
    uuid
} from 'drizzle-orm/pg-core';

export const errorBrainDiffsTable = pgTable(
	'error_brain_diffs',
	{
		// Primary key
		id: uuid('id').defaultRandom().primaryKey(),

		// Run identifier (links to error brain run)
		runId: text('run_id').notNull(),

		// File being patched
		filePath: text('file_path').notNull(),

		// Hash guards
		beforeSha256: text('before_sha256').notNull(),
		afterSha256: text('after_sha256').notNull(),

		// Unified diff text
		diffText: text('diff_text').notNull(),

		// Metrics
		linesChanged: integer('lines_changed').notNull(),
		confidence: real('confidence').notNull(),

		// Metadata
		reason: text('reason').notNull(),
		ruleId: text('rule_id').notNull(),

		// Application status
		applied: text('applied').notNull().default('pending'), // 'pending' | 'applied' | 'failed' | 'rolled_back'
		appliedAt: timestamp('applied_at', { withTimezone: true }),

		// Validation results (if applied)
		validationStatus: text('validation_status'), // 'passed' | 'failed' | 'regression'
		errorCountBefore: integer('error_count_before'),
		errorCountAfter: integer('error_count_after'),

		// Timestamps
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
	},
	(table) => {
		return {
			runIdIdx: index('error_brain_diffs_run_id_idx').on(table.runId),
			filePathIdx: index('error_brain_diffs_file_path_idx').on(table.filePath),
			appliedIdx: index('error_brain_diffs_applied_idx').on(table.applied),
			createdAtIdx: index('error_brain_diffs_created_at_idx').on(table.createdAt),
			// Composite index for queries by run + file
			runFileIdx: index('error_brain_diffs_run_file_idx').on(table.runId, table.filePath)
		};
	}
);

export type ErrorBrainDiff = typeof errorBrainDiffsTable.$inferSelect;
export type ErrorBrainDiffInsert = typeof errorBrainDiffsTable.$inferInsert;
