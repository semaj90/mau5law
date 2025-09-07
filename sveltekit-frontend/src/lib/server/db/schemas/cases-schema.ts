/**
 * Cases Database Schema
 * 
 * Complete schema for legal case management including:
 * - Case metadata and timeline tracking
 * - Evidence associations and relationship mapping
 * - Detective mode state persistence
 * - Citation and reference management
 */

import { pgTable, text, timestamp, integer, boolean, jsonb, uuid, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// Case Management Tables
export const cases = pgTable(
  'cases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseNumber: text('case_number').notNull().unique(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status', { 
      enum: ['active', 'closed', 'pending', 'archived', 'investigation'] 
    }).notNull().default('active'),
    priority: text('priority', { 
      enum: ['low', 'medium', 'high', 'urgent', 'critical'] 
    }).notNull().default('medium'),
    
    // Case metadata
    caseType: text('case_type'), // civil, criminal, administrative, etc.
    jurisdiction: text('jurisdiction'),
    court: text('court'),
    judge: text('judge'),
    
    // Parties involved
    plaintiff: text('plaintiff'),
    defendant: text('defendant'),
    attorney: text('attorney'),
    
    // Dates and timeline
    dateCreated: timestamp('date_created').notNull().defaultNow(),
    dateModified: timestamp('date_modified').notNull().defaultNow(),
    dateFiled: timestamp('date_filed'),
    dateResolved: timestamp('date_resolved'),
    
    // Detective mode and analysis
    detectiveMode: boolean('detective_mode').notNull().default(false),
    analysisDepth: text('analysis_depth', { 
      enum: ['basic', 'standard', 'comprehensive', 'forensic'] 
    }).notNull().default('standard'),
    
    // Metadata and custom fields
    metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
    tags: text('tags').array().default(sql`ARRAY[]::text[]`),
    
    // Workflow and collaboration
    assignedTo: uuid('assigned_to'),
    collaborators: uuid('collaborators').array().default(sql`ARRAY[]::uuid[]`),
    
    // Archive and retention
    archived: boolean('archived').notNull().default(false),
    retentionDate: timestamp('retention_date'),
    
    // Audit fields
    createdBy: uuid('created_by'),
    modifiedBy: uuid('modified_by'),
    version: integer('version').notNull().default(1),
  },
  (table) => ({
    caseNumberIdx: uniqueIndex('cases_case_number_idx').on(table.caseNumber),
    statusIdx: index('cases_status_idx').on(table.status),
    priorityIdx: index('cases_priority_idx').on(table.priority),
    detectiveModeIdx: index('cases_detective_mode_idx').on(table.detectiveMode),
    dateCreatedIdx: index('cases_date_created_idx').on(table.dateCreated),
    assignedToIdx: index('cases_assigned_to_idx').on(table.assignedTo),
  })
);

// Evidence Management Tables
export const evidence = pgTable(
  'evidence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
    
    // Evidence identification
    evidenceNumber: text('evidence_number').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    
    // Evidence type and classification
    evidenceType: text('evidence_type', {
      enum: [
        'document', 'photo', 'video', 'audio', 'physical', 
        'digital', 'testimony', 'expert_report', 'contract',
        'correspondence', 'financial', 'forensic', 'other'
      ]
    }).notNull(),
    
    // File and storage information
    fileName: text('file_name'),
    filePath: text('file_path'),
    fileSize: integer('file_size'),
    mimeType: text('mime_type'),
    checksum: text('checksum'), // SHA-256 for integrity verification
    
    // Chain of custody
    source: text('source'), // where/who provided the evidence
    custodyChain: jsonb('custody_chain').default(sql`'[]'::jsonb`),
    authenticated: boolean('authenticated').notNull().default(false),
    
    // Analysis and processing
    analyzed: boolean('analyzed').notNull().default(false),
    analysisResults: jsonb('analysis_results').default(sql`'{}'::jsonb`),
    ocrText: text('ocr_text'), // extracted text for documents
    
    // Detective mode enhancements
    detectiveNotes: text('detective_notes'),
    suspiciousIndicators: text('suspicious_indicators').array().default(sql`ARRAY[]::text[]`),
    crossReferences: uuid('cross_references').array().default(sql`ARRAY[]::uuid[]`),
    
    // Relationships and connections
    relatedEvidence: uuid('related_evidence').array().default(sql`ARRAY[]::uuid[]`),
    mentionedEntities: jsonb('mentioned_entities').default(sql`'[]'::jsonb`),
    
    // Classification and tags
    confidentialityLevel: text('confidentiality_level', {
      enum: ['public', 'confidential', 'restricted', 'top_secret']
    }).notNull().default('public'),
    tags: text('tags').array().default(sql`ARRAY[]::text[]`),
    
    // Timeline and dates
    dateCreated: timestamp('date_created').notNull().defaultNow(),
    dateModified: timestamp('date_modified').notNull().defaultNow(),
    dateReceived: timestamp('date_received'),
    dateAnalyzed: timestamp('date_analyzed'),
    
    // Metadata and custom fields
    metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
    
    // Archive status
    archived: boolean('archived').notNull().default(false),
    
    // Audit fields
    createdBy: uuid('created_by'),
    modifiedBy: uuid('modified_by'),
  },
  (table) => ({
    caseIdIdx: index('evidence_case_id_idx').on(table.caseId),
    evidenceNumberIdx: index('evidence_number_idx').on(table.evidenceNumber),
    evidenceTypeIdx: index('evidence_type_idx').on(table.evidenceType),
    analyzedIdx: index('evidence_analyzed_idx').on(table.analyzed),
    dateCreatedIdx: index('evidence_date_created_idx').on(table.dateCreated),
    confidentialityIdx: index('evidence_confidentiality_idx').on(table.confidentialityLevel),
    checksumIdx: index('evidence_checksum_idx').on(table.checksum),
  })
);

// Case Timeline and Events
export const caseTimeline = pgTable(
  'case_timeline',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
    
    // Event details
    eventType: text('event_type', {
      enum: [
        'case_created', 'evidence_added', 'evidence_analyzed', 
        'hearing_scheduled', 'document_filed', 'meeting_held',
        'deadline_set', 'status_changed', 'note_added',
        'assignment_changed', 'custom_event'
      ]
    }).notNull(),
    
    title: text('title').notNull(),
    description: text('description'),
    
    // Related entities
    evidenceId: uuid('evidence_id').references(() => evidence.id),
    relatedEntityId: uuid('related_entity_id'), // flexible reference
    relatedEntityType: text('related_entity_type'), // 'evidence', 'person', 'document', etc.
    
    // Event metadata
    eventData: jsonb('event_data').default(sql`'{}'::jsonb`),
    importance: text('importance', { 
      enum: ['low', 'medium', 'high', 'critical'] 
    }).notNull().default('medium'),
    
    // Timestamps
    eventDate: timestamp('event_date').notNull(),
    dateCreated: timestamp('date_created').notNull().defaultNow(),
    
    // Audit
    createdBy: uuid('created_by'),
    automated: boolean('automated').notNull().default(false), // system-generated vs manual
  },
  (table) => ({
    caseIdIdx: index('timeline_case_id_idx').on(table.caseId),
    eventDateIdx: index('timeline_event_date_idx').on(table.eventDate),
    eventTypeIdx: index('timeline_event_type_idx').on(table.eventType),
    importanceIdx: index('timeline_importance_idx').on(table.importance),
  })
);

// Citations and References
export const citations = pgTable(
  'citations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
    
    // Citation details
    citationType: text('citation_type', {
      enum: [
        'case_law', 'statute', 'regulation', 'secondary_authority',
        'legal_brief', 'court_document', 'expert_report', 
        'news_article', 'academic_paper', 'other'
      ]
    }).notNull(),
    
    title: text('title').notNull(),
    author: text('author'),
    source: text('source'),
    
    // Legal citation format
    citation: text('citation'), // proper legal citation format
    url: text('url'),
    doi: text('doi'),
    
    // Content and context
    abstract: text('abstract'),
    relevantQuote: text('relevant_quote'),
    contextNotes: text('context_notes'),
    
    // Relationship to case
    relevanceScore: integer('relevance_score').default(5), // 1-10 scale
    citationPurpose: text('citation_purpose', {
      enum: ['support', 'distinguish', 'authority', 'background', 'counter_argument']
    }).notNull().default('support'),
    
    // Publication details
    publicationDate: timestamp('publication_date'),
    jurisdiction: text('jurisdiction'),
    court: text('court'),
    
    // Verification and status
    verified: boolean('verified').notNull().default(false),
    verifiedDate: timestamp('verified_date'),
    
    // Timestamps
    dateCreated: timestamp('date_created').notNull().defaultNow(),
    dateModified: timestamp('date_modified').notNull().defaultNow(),
    
    // Metadata
    metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
    tags: text('tags').array().default(sql`ARRAY[]::text[]`),
    
    // Audit
    createdBy: uuid('created_by'),
    modifiedBy: uuid('modified_by'),
  },
  (table) => ({
    caseIdIdx: index('citations_case_id_idx').on(table.caseId),
    citationTypeIdx: index('citations_type_idx').on(table.citationType),
    relevanceIdx: index('citations_relevance_idx').on(table.relevanceScore),
    verifiedIdx: index('citations_verified_idx').on(table.verified),
    publicationDateIdx: index('citations_pub_date_idx').on(table.publicationDate),
  })
);

// Case Notes and Detective Analysis
export const caseNotes = pgTable(
  'case_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
    
    // Note details
    noteType: text('note_type', {
      enum: [
        'general', 'strategy', 'observation', 'hypothesis',
        'follow_up', 'reminder', 'analysis', 'meeting_notes',
        'detective_insight', 'pattern_analysis'
      ]
    }).notNull().default('general'),
    
    title: text('title').notNull(),
    content: text('content').notNull(),
    
    // Rich text editor content
    contentHtml: text('content_html'), // rendered HTML
    contentMarkdown: text('content_markdown'), // markdown source
    
    // Detective mode features
    confidenceLevel: integer('confidence_level').default(5), // 1-10
    evidenceSupport: uuid('evidence_support').array().default(sql`ARRAY[]::uuid[]`),
    crossReferences: uuid('cross_references').array().default(sql`ARRAY[]::uuid[]`),
    
    // Organization
    category: text('category'),
    priority: text('priority', { 
      enum: ['low', 'medium', 'high', 'urgent'] 
    }).notNull().default('medium'),
    
    // Status and workflow
    status: text('status', {
      enum: ['draft', 'review', 'approved', 'archived']
    }).notNull().default('draft'),
    
    // Timestamps
    dateCreated: timestamp('date_created').notNull().defaultNow(),
    dateModified: timestamp('date_modified').notNull().defaultNow(),
    
    // Metadata and tags
    metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
    tags: text('tags').array().default(sql`ARRAY[]::text[]`),
    
    // Collaboration
    sharedWith: uuid('shared_with').array().default(sql`ARRAY[]::uuid[]`),
    
    // Audit
    createdBy: uuid('created_by'),
    modifiedBy: uuid('modified_by'),
  },
  (table) => ({
    caseIdIdx: index('notes_case_id_idx').on(table.caseId),
    noteTypeIdx: index('notes_type_idx').on(table.noteType),
    statusIdx: index('notes_status_idx').on(table.status),
    priorityIdx: index('notes_priority_idx').on(table.priority),
    dateCreatedIdx: index('notes_date_created_idx').on(table.dateCreated),
  })
);

// Define relationships between tables
export const casesRelations = relations(cases, ({ many }) => ({
  evidence: many(evidence),
  timeline: many(caseTimeline),
  citations: many(citations),
  notes: many(caseNotes),
}));

export const evidenceRelations = relations(evidence, ({ one, many }) => ({
  case: one(cases, {
    fields: [evidence.caseId],
    references: [cases.id],
  }),
  timelineEvents: many(caseTimeline),
}));

export const timelineRelations = relations(caseTimeline, ({ one }) => ({
  case: one(cases, {
    fields: [caseTimeline.caseId],
    references: [cases.id],
  }),
  evidence: one(evidence, {
    fields: [caseTimeline.evidenceId],
    references: [evidence.id],
  }),
}));

export const citationsRelations = relations(citations, ({ one }) => ({
  case: one(cases, {
    fields: [citations.caseId],
    references: [cases.id],
  }),
}));

export const notesRelations = relations(caseNotes, ({ one }) => ({
  case: one(cases, {
    fields: [caseNotes.caseId],
    references: [cases.id],
  }),
}));

// Export all types for use in application
export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;
export type Evidence = typeof evidence.$inferSelect;
export type NewEvidence = typeof evidence.$inferInsert;
export type CaseTimelineEvent = typeof caseTimeline.$inferSelect;
export type NewCaseTimelineEvent = typeof caseTimeline.$inferInsert;
export type Citation = typeof citations.$inferSelect;
export type NewCitation = typeof citations.$inferInsert;
export type CaseNote = typeof caseNotes.$inferSelect;
export type NewCaseNote = typeof caseNotes.$inferInsert;