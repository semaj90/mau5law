import { index, jsonb, pgTable, real, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const userIntentTransitions = pgTable(
  'user_intent_transitions',
  {
    id: serial('id').primaryKey().notNull(),
    userId: text('user_id').notNull(),
    action: text('action').notNull(),
    predictedIntent: text('predicted_intent').notNull(),
    confidence: real('confidence').default(0).notNull(),
    clusterId: text('cluster_id'),
    observedAt: timestamp('observed_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    payload: jsonb('payload').default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_user_intent_user').on(table.userId),
    index('idx_user_intent_observed_at').on(table.observedAt),
    index('idx_user_intent_cluster').on(table.clusterId),
  ]
);

export type UserIntentTransition = typeof userIntentTransitions.$inferSelect;
export type NewUserIntentTransition = typeof userIntentTransitions.$inferInsert;
