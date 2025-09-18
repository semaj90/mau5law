import {
  pgTable,
  serial,
  text,
  jsonb,
  real,
  timestamp,
  index,
  unique,
  varchar,
  vector,
  uuid,
  foreignKey,
  boolean,
  check,
  numeric,
  integer,
  uniqueIndex,
  inet,
  interval,
  bigserial,
  bigint,
  pgView,
  doublePrecision,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const predictiveAssetCache = pgTable('predictive_asset_cache', {
  id: serial().primaryKey().notNull(),
  assetType: text('asset_type').notNull(),
  predictions: jsonb(),
  confidenceScore: real('confidence_score'),
  cacheExpires: timestamp('cache_expires', { mode: 'string' }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
});

export const legalDocuments = pgTable(
  'legal_documents',
  {
    id: serial().primaryKey().notNull(),
    documentId: varchar('document_id', { length: 255 }).notNull(),
    title: varchar({ length: 500 }),
    content: text(),
    documentType: varchar('document_type', { length: 100 }),
    metadata: jsonb(),
    embedding: vector({ dimensions: 1536 }),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
  },
  (table) => [
    index('idx_legal_documents_document_id').using(
      'btree',
      table.documentId.asc().nullsLast().op('text_ops')
    ),
    index('idx_legal_documents_type').using(
      'btree',
      table.documentType.asc().nullsLast().op('text_ops')
    ),
    unique('legal_documents_document_id_key').on(table.documentId),
  ]
);

export const users = pgTable(
  'users',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    email: text(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [unique('users_email_key').on(table.email)]
);

export const caseTimeline = pgTable(
  'case_timeline',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    caseId: uuid('case_id').notNull(),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
    eventDate: timestamp('event_date', { withTimezone: true, mode: 'string' }).notNull(),
    importance: varchar({ length: 20 }).default('medium'),
    evidenceId: uuid('evidence_id'),
    relatedEntityId: uuid('related_entity_id'),
    relatedEntityType: varchar('related_entity_type', { length: 50 }),
    eventData: jsonb('event_data').default({}),
    automated: boolean().default(false),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    index('idx_case_timeline_case_id').using(
      'btree',
      table.caseId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_case_timeline_event_date').using(
      'btree',
      table.eventDate.asc().nullsLast().op('timestamptz_ops')
    ),
    index('idx_case_timeline_event_type').using(
      'btree',
      table.eventType.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: 'case_timeline_case_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'case_timeline_created_by_fkey',
    }),
  ]
);

export const aiRecommendations = pgTable(
  'ai_recommendations',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    caseId: uuid('case_id'),
    type: varchar({ length: 50 }).notNull(),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
    reasoning: text(),
    priority: varchar({ length: 20 }).default('medium'),
    confidence: numeric({ precision: 3, scale: 2 }),
    aiModel: varchar('ai_model', { length: 100 }),
    supportingEvidence: jsonb('supporting_evidence').default([]),
    suggestedActions: jsonb('suggested_actions').default([]),
    estimatedImpact: text('estimated_impact'),
    timeframe: varchar({ length: 100 }),
    status: varchar({ length: 20 }).default('pending'),
    tags: jsonb().default([]),
    createdBy: varchar('created_by', { length: 50 }).default('ai-system'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    index('idx_ai_recommendations_case_id').using(
      'btree',
      table.caseId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_ai_recommendations_priority').using(
      'btree',
      table.priority.asc().nullsLast().op('text_ops')
    ),
    index('idx_ai_recommendations_status').using(
      'btree',
      table.status.asc().nullsLast().op('text_ops')
    ),
    index('idx_ai_recommendations_suggested_actions').using(
      'gin',
      table.suggestedActions.asc().nullsLast().op('jsonb_ops')
    ),
    index('idx_ai_recommendations_supporting_evidence').using(
      'gin',
      table.supportingEvidence.asc().nullsLast().op('jsonb_ops')
    ),
    index('idx_ai_recommendations_tags').using('gin', table.tags.asc().nullsLast().op('jsonb_ops')),
    index('idx_ai_recommendations_type').using(
      'btree',
      table.type.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: 'ai_recommendations_case_id_fkey',
    }).onDelete('cascade'),
    check(
      'ai_recommendations_confidence_check',
      sql`(confidence >= (0)::numeric) AND (confidence <= (1)::numeric)`
    ),
  ]
);

export const recommendationRatings = pgTable(
  'recommendation_ratings',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    recommendationId: uuid('recommendation_id').notNull(),
    rating: integer(),
    feedback: text(),
    implemented: boolean().default(false),
    userId: uuid('user_id'),
    ratedAt: timestamp('rated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    index('idx_recommendation_ratings_recommendation_id').using(
      'btree',
      table.recommendationId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_recommendation_ratings_user_id').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops')
    ),
    foreignKey({
      columns: [table.recommendationId],
      foreignColumns: [aiRecommendations.id],
      name: 'recommendation_ratings_recommendation_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'recommendation_ratings_user_id_fkey',
    }),
    check('recommendation_ratings_rating_check', sql`(rating >= 1) AND (rating <= 5)`),
  ]
);

export const detectiveAnalysis = pgTable(
  'detective_analysis',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    caseId: uuid('case_id').notNull(),
    analysisType: varchar('analysis_type', { length: 50 }).notNull(),
    queryData: jsonb('query_data').notNull(),
    results: jsonb().notNull(),
    confidenceScore: numeric('confidence_score', { precision: 3, scale: 2 }),
    aiModel: varchar('ai_model', { length: 100 }),
    processingTime: integer('processing_time'),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    index('idx_detective_analysis_case_id').using(
      'btree',
      table.caseId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_detective_analysis_created_at').using(
      'btree',
      table.createdAt.asc().nullsLast().op('timestamptz_ops')
    ),
    index('idx_detective_analysis_query_data').using(
      'gin',
      table.queryData.asc().nullsLast().op('jsonb_ops')
    ),
    index('idx_detective_analysis_results').using(
      'gin',
      table.results.asc().nullsLast().op('jsonb_ops')
    ),
    index('idx_detective_analysis_type').using(
      'btree',
      table.analysisType.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: 'detective_analysis_case_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'detective_analysis_created_by_fkey',
    }),
  ]
);

export const attachmentVerifications = pgTable(
  'attachment_verifications',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    attachmentId: uuid('attachment_id').notNull(),
    verifiedBy: uuid('verified_by').notNull(),
    verificationStatus: varchar('verification_status', { length: 50 }).default('pending').notNull(),
    verificationNotes: text('verification_notes'),
    verifiedAt: timestamp('verified_at', { mode: 'string' }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.verifiedBy],
      foreignColumns: [users.id],
      name: 'attachment_verifications_verified_by_users_id_fk',
    }),
  ]
);

export const canvasAnnotations = pgTable(
  'canvas_annotations',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    evidenceId: uuid('evidence_id'),
    fabricData: jsonb('fabric_data').notNull(),
    annotationType: varchar('annotation_type', { length: 50 }),
    coordinates: jsonb(),
    boundingBox: jsonb('bounding_box'),
    text: text(),
    color: varchar({ length: 20 }),
    layerOrder: integer('layer_order').default(0),
    isVisible: boolean('is_visible').default(true),
    metadata: jsonb().default({}),
    version: integer().default(1),
    parentAnnotationId: uuid('parent_annotation_id'),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.evidenceId],
      foreignColumns: [evidence.id],
      name: 'canvas_annotations_evidence_id_evidence_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'canvas_annotations_created_by_users_id_fk',
    }),
  ]
);

export const canvasStates = pgTable(
  'canvas_states',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    caseId: uuid('case_id'),
    name: varchar({ length: 255 }).notNull(),
    canvasData: jsonb('canvas_data').notNull(),
    version: integer().default(1),
    isDefault: boolean('is_default').default(false),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: 'canvas_states_case_id_cases_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'canvas_states_created_by_users_id_fk',
    }),
  ]
);

export const caseEmbeddings = pgTable(
  'case_embeddings',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    caseId: uuid('case_id'),
    content: text().notNull(),
    embedding: text().notNull(),
    metadata: jsonb().default({}).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: 'case_embeddings_case_id_cases_id_fk',
    }).onDelete('cascade'),
  ]
);

export const caseActivities = pgTable('case_activities', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  caseId: uuid('case_id').notNull(),
  activityType: varchar('activity_type', { length: 50 }).notNull(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  scheduledFor: timestamp('scheduled_for', { mode: 'string' }),
  completedAt: timestamp('completed_at', { mode: 'string' }),
  status: varchar({ length: 20 }).default('pending').notNull(),
  priority: varchar({ length: 20 }).default('medium').notNull(),
  assignedTo: uuid('assigned_to'),
  relatedEvidence: jsonb('related_evidence').default([]).notNull(),
  relatedCriminals: jsonb('related_criminals').default([]).notNull(),
  metadata: jsonb().default({}).notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

export const caseScores = pgTable(
  'case_scores',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    caseId: uuid('case_id').notNull(),
    score: numeric({ precision: 5, scale: 2 }).notNull(),
    riskLevel: varchar('risk_level', { length: 20 }).notNull(),
    breakdown: jsonb().default({}).notNull(),
    criteria: jsonb().default({}).notNull(),
    recommendations: jsonb().default([]).notNull(),
    calculatedBy: uuid('calculated_by'),
    calculatedAt: timestamp('calculated_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: 'case_scores_case_id_cases_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.calculatedBy],
      foreignColumns: [users.id],
      name: 'case_scores_calculated_by_users_id_fk',
    }),
  ]
);

export const citations = pgTable(
  'citations',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    caseId: uuid('case_id'),
    documentId: uuid('document_id'),
    citationType: varchar('citation_type', { length: 50 }).notNull(),
    relevanceScore: numeric('relevance_score', { precision: 3, scale: 2 }),
    pageNumber: integer('page_number'),
    pinpointCitation: varchar('pinpoint_citation', { length: 100 }),
    quotedText: text('quoted_text'),
    contextBefore: text('context_before'),
    contextAfter: text('context_after'),
    annotation: text(),
    legalPrinciple: text('legal_principle'),
    citationFormat: varchar('citation_format', { length: 20 }).default('bluebook'),
    formattedCitation: text('formatted_citation'),
    shepardsTreatment: varchar('shepards_treatment', { length: 50 }),
    isKeyAuthority: boolean('is_key_authority').default(false),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: 'citations_case_id_cases_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'citations_created_by_users_id_fk',
    }),
  ]
);

export const chatEmbeddings = pgTable('chat_embeddings', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  conversationId: uuid('conversation_id').notNull(),
  messageId: uuid('message_id').notNull(),
  content: text().notNull(),
  embedding: text().notNull(),
  role: varchar({ length: 20 }).notNull(),
  metadata: jsonb().default({}).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export const contentEmbeddings = pgTable('content_embeddings', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  contentId: uuid('content_id').notNull(),
  contentType: varchar('content_type', { length: 50 }).notNull(),
  textContent: text('text_content').notNull(),
  embedding: text(),
  metadata: jsonb().default({}).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

export const criminals = pgTable('criminals', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  middleName: varchar('middle_name', { length: 100 }),
  aliases: jsonb().default([]).notNull(),
  dateOfBirth: timestamp('date_of_birth', { mode: 'string' }),
  placeOfBirth: varchar('place_of_birth', { length: 200 }),
  address: text(),
  phone: varchar({ length: 20 }),
  email: varchar({ length: 255 }),
  ssn: varchar({ length: 11 }),
  driversLicense: varchar('drivers_license', { length: 50 }),
  height: integer(),
  weight: integer(),
  eyeColor: varchar('eye_color', { length: 20 }),
  hairColor: varchar('hair_color', { length: 20 }),
  distinguishingMarks: text('distinguishing_marks'),
  photoUrl: text('photo_url'),
  fingerprints: jsonb().default({}),
  threatLevel: varchar('threat_level', { length: 20 }).default('low').notNull(),
  status: varchar({ length: 20 }).default('active').notNull(),
  notes: text(),
  aiSummary: text('ai_summary'),
  aiTags: jsonb('ai_tags').default([]).notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

export const aiReports = pgTable(
  'ai_reports',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    caseId: uuid('case_id'),
    reportType: varchar('report_type', { length: 50 }).notNull(),
    title: varchar({ length: 255 }).notNull(),
    content: text().notNull(),
    richTextContent: jsonb('rich_text_content'),
    metadata: jsonb().default({}).notNull(),
    canvasElements: jsonb('canvas_elements').default([]).notNull(),
    generatedBy: varchar('generated_by', { length: 100 }).default('gemma3-legal'),
    confidence: numeric({ precision: 3, scale: 2 }).default('0.85'),
    isActive: boolean('is_active').default(true),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: 'ai_reports_case_id_cases_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'ai_reports_created_by_users_id_fk',
    }),
  ]
);

export const embeddingCache = pgTable(
  'embedding_cache',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    textHash: text('text_hash').notNull(),
    model: varchar({ length: 100 }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [unique('embedding_cache_text_hash_unique').on(table.textHash)]
);

export const emailVerificationCodes = pgTable(
  'email_verification_codes',
  {
    id: serial().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    email: varchar({ length: 255 }).notNull(),
    code: varchar({ length: 8 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'email_verification_codes_user_id_users_id_fk',
    }).onDelete('cascade'),
    unique('email_verification_codes_user_id_unique').on(table.userId),
  ]
);

export const legalAnalysisSessions = pgTable(
  'legal_analysis_sessions',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    caseId: uuid('case_id'),
    userId: uuid('user_id'),
    sessionType: varchar('session_type', { length: 50 }).default('case_analysis'),
    analysisPrompt: text('analysis_prompt'),
    analysisResult: text('analysis_result'),
    confidenceLevel: numeric('confidence_level', { precision: 3, scale: 2 }),
    sourcesUsed: jsonb('sources_used').default([]).notNull(),
    model: varchar({ length: 100 }).default('gemma3-legal'),
    processingTime: integer('processing_time'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: 'legal_analysis_sessions_case_id_cases_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'legal_analysis_sessions_user_id_users_id_fk',
    }).onDelete('cascade'),
  ]
);

export const legalResearch = pgTable(
  'legal_research',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    caseId: uuid('case_id'),
    query: text().notNull(),
    searchTerms: jsonb('search_terms').default([]),
    jurisdiction: varchar({ length: 100 }),
    dateRange: jsonb('date_range'),
    courtLevel: varchar('court_level', { length: 50 }),
    practiceArea: varchar('practice_area', { length: 100 }),
    resultsCount: integer('results_count').default(0),
    searchResults: jsonb('search_results').default([]),
    aiSummary: text('ai_summary'),
    keyFindings: jsonb('key_findings').default([]),
    recommendedCitations: jsonb('recommended_citations').default([]),
    searchDuration: integer('search_duration'),
    dataSource: varchar('data_source', { length: 50 }),
    isBookmarked: boolean('is_bookmarked').default(false),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: 'legal_research_case_id_cases_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'legal_research_created_by_users_id_fk',
    }),
  ]
);

export const legalPrecedents = pgTable('legal_precedents', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  caseTitle: varchar('case_title', { length: 255 }).notNull(),
  citation: varchar({ length: 255 }).notNull(),
  court: varchar({ length: 100 }),
  year: integer(),
  jurisdiction: varchar({ length: 50 }),
  summary: text(),
  fullText: text('full_text'),
  embedding: text(),
  relevanceScore: numeric('relevance_score', { precision: 3, scale: 2 }),
  legalPrinciples: jsonb('legal_principles').default([]).notNull(),
  linkedCases: jsonb('linked_cases').default([]).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    tokenHash: varchar('token_hash', { length: 63 }).primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'password_reset_tokens_user_id_users_id_fk',
    }).onDelete('cascade'),
  ]
);

export const ragMessages = pgTable('rag_messages', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  messageIndex: integer('message_index').notNull(),
  role: varchar({ length: 20 }).notNull(),
  content: text().notNull(),
  retrievedSources: jsonb('retrieved_sources').default([]).notNull(),
  sourceCount: integer('source_count').default(0).notNull(),
  retrievalScore: varchar('retrieval_score', { length: 10 }),
  processingTime: integer('processing_time'),
  model: varchar({ length: 100 }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export const evidence = pgTable('evidence', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  caseId: uuid('case_id'),
  criminalId: uuid('criminal_id'),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  evidenceType: varchar('evidence_type', { length: 50 }).notNull(),
  fileType: varchar('file_type', { length: 50 }),
  subType: varchar('sub_type', { length: 50 }),
  fileUrl: text('file_url'),
  fileName: varchar('file_name', { length: 255 }),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 100 }),
  hash: varchar({ length: 128 }),
  tags: jsonb().default([]).notNull(),
  chainOfCustody: jsonb('chain_of_custody').default([]).notNull(),
  collectedAt: timestamp('collected_at', { mode: 'string' }),
  collectedBy: varchar('collected_by', { length: 255 }),
  location: text(),
  labAnalysis: jsonb('lab_analysis').default({}).notNull(),
  aiAnalysis: jsonb('ai_analysis').default({}).notNull(),
  aiTags: jsonb('ai_tags').default([]).notNull(),
  aiSummary: text('ai_summary'),
  summary: text(),
  isAdmissible: boolean('is_admissible').default(true).notNull(),
  confidentialityLevel: varchar('confidentiality_level', { length: 20 })
    .default('standard')
    .notNull(),
  canvasPosition: jsonb('canvas_position').default({}).notNull(),
  uploadedBy: uuid('uploaded_by'),
  uploadedAt: timestamp('uploaded_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

export const hashVerifications = pgTable(
  'hash_verifications',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    evidenceId: uuid('evidence_id'),
    verifiedHash: varchar('verified_hash', { length: 64 }).notNull(),
    storedHash: varchar('stored_hash', { length: 64 }),
    result: boolean().notNull(),
    verificationMethod: varchar('verification_method', { length: 50 }).default('manual'),
    verifiedBy: uuid('verified_by'),
    verifiedAt: timestamp('verified_at', { mode: 'string' }).defaultNow(),
    notes: text(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.evidenceId],
      foreignColumns: [evidence.id],
      name: 'hash_verifications_evidence_id_evidence_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.verifiedBy],
      foreignColumns: [users.id],
      name: 'hash_verifications_verified_by_users_id_fk',
    }),
  ]
);

export const personsOfInterest = pgTable(
  'persons_of_interest',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    caseId: uuid('case_id'),
    name: varchar({ length: 255 }).notNull(),
    aliases: jsonb().default([]).notNull(),
    relationship: varchar({ length: 100 }),
    threatLevel: varchar('threat_level', { length: 20 }).default('low'),
    status: varchar({ length: 20 }).default('active'),
    profileData: jsonb('profile_data').default({}).notNull(),
    tags: jsonb().default([]).notNull(),
    position: jsonb().default({}).notNull(),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: 'persons_of_interest_case_id_cases_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'persons_of_interest_created_by_users_id_fk',
    }),
  ]
);

export const savedReports = pgTable(
  'saved_reports',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    title: varchar({ length: 300 }).notNull(),
    caseId: uuid('case_id'),
    reportType: varchar('report_type', { length: 50 }).notNull(),
    templateId: uuid('template_id'),
    content: jsonb().notNull(),
    htmlContent: text('html_content'),
    generatedBy: varchar('generated_by', { length: 50 }).default('manual'),
    aiModel: varchar('ai_model', { length: 50 }),
    aiPrompt: text('ai_prompt'),
    exportFormat: varchar('export_format', { length: 20 }).default('pdf'),
    status: varchar({ length: 20 }).default('draft'),
    version: integer().default(1),
    wordCount: integer('word_count'),
    tags: jsonb().default([]),
    metadata: jsonb().default({}),
    sharedWith: jsonb('shared_with').default([]),
    lastExported: timestamp('last_exported', { mode: 'string' }),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: 'saved_reports_case_id_cases_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'saved_reports_created_by_users_id_fk',
    }),
  ]
);

export const sessions = pgTable(
  'sessions',
  {
    id: text().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'sessions_user_id_users_id_fk',
    }).onDelete('cascade'),
  ]
);

export const themes = pgTable(
  'themes',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: varchar({ length: 100 }).notNull(),
    description: text(),
    cssVariables: jsonb('css_variables').notNull(),
    colorPalette: jsonb('color_palette').notNull(),
    isSystem: boolean('is_system').default(false).notNull(),
    isPublic: boolean('is_public').default(false).notNull(),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'themes_created_by_users_id_fk',
    }).onDelete('cascade'),
  ]
);

export const statutes = pgTable('statutes', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  title: varchar({ length: 255 }).notNull(),
  code: varchar({ length: 100 }).notNull(),
  description: text(),
  category: varchar({ length: 100 }),
  jurisdiction: varchar({ length: 100 }),
  isActive: boolean('is_active').default(true),
  penalties: jsonb().default({}).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

export const cases = pgTable(
  'cases',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    title: varchar({ length: 500 }).notNull(),
    description: text(),
    caseNumber: varchar('case_number', { length: 100 }),
    status: varchar({ length: 50 }).default('active').notNull(),
    priority: varchar({ length: 20 }).default('medium').notNull(),
    practiceArea: varchar('practice_area', { length: 100 }),
    jurisdiction: varchar({ length: 100 }),
    court: varchar({ length: 200 }),
    clientName: varchar('client_name', { length: 200 }),
    opposingParty: varchar('opposing_party', { length: 200 }),
    assignedAttorney: uuid('assigned_attorney'),
    filingDate: timestamp('filing_date', { withTimezone: true, mode: 'string' }),
    dueDate: timestamp('due_date', { withTimezone: true, mode: 'string' }),
    closedDate: timestamp('closed_date', { withTimezone: true, mode: 'string' }),
    caseEmbedding: vector('case_embedding', { dimensions: 384 }),
    qdrantId: uuid('qdrant_id'),
    qdrantCollection: varchar('qdrant_collection', { length: 100 }).default('cases'),
    metadata: jsonb().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('cases_assigned_attorney_idx').using(
      'btree',
      table.assignedAttorney.asc().nullsLast().op('uuid_ops')
    ),
    index('cases_case_embedding_hnsw_idx')
      .using('hnsw', table.caseEmbedding.asc().nullsLast().op('vector_cosine_ops'))
      .with({ m: '16', ef_construction: '64' }),
    uniqueIndex('cases_case_number_idx').using(
      'btree',
      table.caseNumber.asc().nullsLast().op('text_ops')
    ),
    index('cases_practice_area_idx').using(
      'btree',
      table.practiceArea.asc().nullsLast().op('text_ops')
    ),
    index('cases_status_idx').using('btree', table.status.asc().nullsLast().op('text_ops')),
  ]
);

export const userEmbeddings = pgTable(
  'user_embeddings',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id'),
    content: text().notNull(),
    embedding: text().notNull(),
    metadata: jsonb().default({}).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'user_embeddings_user_id_users_id_fk',
    }).onDelete('cascade'),
  ]
);

export const vectorMetadata = pgTable(
  'vector_metadata',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    documentId: text('document_id').notNull(),
    collectionName: varchar('collection_name', { length: 100 }).notNull(),
    metadata: jsonb().default({}).notNull(),
    contentHash: text('content_hash').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
  },
  (table) => [unique('vector_metadata_document_id_unique').on(table.documentId)]
);

export const ragSessions = pgTable(
  'rag_sessions',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    sessionId: varchar('session_id', { length: 255 }).notNull(),
    userId: uuid('user_id'),
    title: varchar({ length: 255 }),
    model: varchar({ length: 100 }),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'rag_sessions_user_id_users_id_fk',
    }).onDelete('cascade'),
    unique('rag_sessions_session_id_unique').on(table.sessionId),
  ]
);

export const reports = pgTable(
  'reports',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    caseId: uuid('case_id'),
    title: varchar({ length: 255 }).notNull(),
    content: text(),
    reportType: varchar('report_type', { length: 50 }).default('case_summary'),
    status: varchar({ length: 20 }).default('draft'),
    isPublic: boolean('is_public').default(false),
    tags: jsonb().default([]).notNull(),
    metadata: jsonb().default({}).notNull(),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: 'reports_case_id_cases_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'reports_created_by_users_id_fk',
    }),
  ]
);

export const documentRelationshipsJsonb = pgTable(
  'document_relationships_jsonb',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    sourceId: uuid('source_id').notNull(),
    targetId: uuid('target_id').notNull(),
    relationshipMetadata: jsonb('relationship_metadata').notNull(),
    relationshipType: text('relationship_type').generatedAlwaysAs(
      sql`(relationship_metadata ->> 'type'::text)`
    ),
    strength: real().generatedAlwaysAs(sql`((relationship_metadata ->> 'strength'::text))::real`),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_relationships_metadata_gin').using(
      'gin',
      table.relationshipMetadata.asc().nullsLast().op('jsonb_ops')
    ),
    index('idx_relationships_source').using(
      'btree',
      table.sourceId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_relationships_strength').using(
      'btree',
      table.strength.desc().nullsFirst().op('float4_ops')
    ),
    index('idx_relationships_target').using(
      'btree',
      table.targetId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_relationships_type').using(
      'btree',
      table.relationshipType.asc().nullsLast().op('text_ops')
    ),
    unique('document_relationships_jsonb_source_id_target_id_relationsh_key').on(
      table.sourceId,
      table.targetId,
      table.relationshipType
    ),
  ]
);

export const legalDocumentsJsonb = pgTable(
  'legal_documents_jsonb',
  {
    id: uuid()
      .default(sql`uuid_generate_v4()`)
      .primaryKey()
      .notNull(),
    title: text().notNull(),
    content: text().notNull(),
    metadata: jsonb().notNull(),
    titleEmbedding: vector('title_embedding', { dimensions: 384 }),
    contentEmbedding: vector('content_embedding', { dimensions: 384 }),
    documentType: text('document_type').generatedAlwaysAs(sql`(metadata ->> 'documentType'::text)`),
    jurisdiction: text().generatedAlwaysAs(sql`(metadata ->> 'jurisdiction'::text)`),
    practiceArea: text('practice_area').generatedAlwaysAs(sql`(metadata ->> 'practiceArea'::text)`),
    confidentialityLevel: text('confidentiality_level').generatedAlwaysAs(
      sql`(metadata ->> 'confidentialityLevel'::text)`
    ),
    urgency: text().generatedAlwaysAs(sql`(metadata ->> 'urgency'::text)`),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    // TODO: failed to parse database type 'tsvector'
    searchVector: unknown('search_vector').generatedAlwaysAs(
      sql`to_tsvector('english'::regconfig, ((title || ' '::text) || content))`
    ),
  },
  (table) => [
    index('idx_legal_docs_confidentiality').using(
      'btree',
      table.confidentialityLevel.asc().nullsLast().op('text_ops')
    ),
    index('idx_legal_docs_content_embedding')
      .using('ivfflat', table.contentEmbedding.asc().nullsLast().op('vector_cosine_ops'))
      .with({ lists: '100' }),
    index('idx_legal_docs_document_type').using(
      'btree',
      table.documentType.asc().nullsLast().op('text_ops')
    ),
    index('idx_legal_docs_jurisdiction').using(
      'btree',
      table.jurisdiction.asc().nullsLast().op('text_ops')
    ),
    index('idx_legal_docs_metadata_gin').using(
      'gin',
      table.metadata.asc().nullsLast().op('jsonb_ops')
    ),
    index('idx_legal_docs_practice_area').using(
      'btree',
      table.practiceArea.asc().nullsLast().op('text_ops')
    ),
    index('idx_legal_docs_search_vector').using(
      'gin',
      table.searchVector.asc().nullsLast().op('tsvector_ops')
    ),
    index('idx_legal_docs_title_embedding')
      .using('ivfflat', table.titleEmbedding.asc().nullsLast().op('vector_cosine_ops'))
      .with({ lists: '100' }),
  ]
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id'),
    action: varchar({ length: 100 }).notNull(),
    resourceType: varchar('resource_type', { length: 50 }).notNull(),
    resourceId: uuid('resource_id'),
    details: jsonb().default({}),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'audit_logs_user_id_fkey',
    }),
  ]
);

export const systemSettings = pgTable(
  'system_settings',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    key: varchar({ length: 100 }).notNull(),
    value: jsonb().notNull(),
    description: text(),
    category: varchar({ length: 50 }).default('general'),
    isPublic: boolean('is_public').default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [unique('system_settings_key_key').on(table.key)]
);

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id'),
    notificationType: varchar('notification_type', { length: 50 }).notNull(),
    enabled: boolean().default(true),
    deliveryMethod: varchar('delivery_method', { length: 20 }).default('email'),
    settings: jsonb().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'notification_preferences_user_id_fkey',
    }).onDelete('cascade'),
  ]
);

export const apiRateLimits = pgTable(
  'api_rate_limits',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id'),
    apiKeyHash: varchar('api_key_hash', { length: 64 }),
    endpoint: varchar({ length: 100 }).notNull(),
    requestsCount: integer('requests_count').default(0),
    windowStart: timestamp('window_start', { withTimezone: true, mode: 'string' }).defaultNow(),
    windowDuration: interval('window_duration').default('01:00:00'),
    maxRequests: integer('max_requests').default(1000),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'api_rate_limits_user_id_fkey',
    }),
  ]
);

export const evidenceConnections = pgTable(
  'evidence_connections',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    sourceEvidenceId: uuid('source_evidence_id').notNull(),
    targetEvidenceId: uuid('target_evidence_id').notNull(),
    connectionType: varchar('connection_type', { length: 50 }).notNull(),
    strength: numeric({ precision: 3, scale: 2 }).notNull(),
    sharedEntities: jsonb('shared_entities').default([]),
    sharedTerms: jsonb('shared_terms').default([]),
    temporalProximity: integer('temporal_proximity'),
    spatialProximity: numeric('spatial_proximity', { precision: 10, scale: 6 }),
    semanticSimilarity: numeric('semantic_similarity', { precision: 3, scale: 2 }),
    metadata: jsonb().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    index('idx_evidence_connections_source').using(
      'btree',
      table.sourceEvidenceId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_evidence_connections_strength').using(
      'btree',
      table.strength.asc().nullsLast().op('numeric_ops')
    ),
    index('idx_evidence_connections_target').using(
      'btree',
      table.targetEvidenceId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_evidence_connections_type').using(
      'btree',
      table.connectionType.asc().nullsLast().op('text_ops')
    ),
    foreignKey({
      columns: [table.sourceEvidenceId],
      foreignColumns: [evidence.id],
      name: 'evidence_connections_source_evidence_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.targetEvidenceId],
      foreignColumns: [evidence.id],
      name: 'evidence_connections_target_evidence_id_fkey',
    }).onDelete('cascade'),
    unique('evidence_connections_source_evidence_id_target_evidence_id__key').on(
      table.sourceEvidenceId,
      table.targetEvidenceId,
      table.connectionType
    ),
    check(
      'evidence_connections_strength_check',
      sql`(strength >= (0)::numeric) AND (strength <= (1)::numeric)`
    ),
  ]
);

export const chatSessions = pgTable(
  'chat_sessions',
  {
    id: varchar().primaryKey().notNull(),
    userId: varchar('user_id').notNull(),
    title: varchar().default('New Chat').notNull(),
    metadata: jsonb().default({}),
    createdAt: timestamp('created_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updated_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
    isActive: boolean('is_active').default(true),
  },
  (table) => [
    index('idx_chat_sessions_user').using('btree', table.userId.asc().nullsLast().op('text_ops')),
  ]
);

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
    userId: varchar('user_id').notNull(),
    sessionId: varchar('session_id').notNull(),
    role: varchar().notNull(),
    content: text().notNull(),
    embedding: vector({ dimensions: 768 }),
    metadata: jsonb().default({}),
    createdAt: timestamp('created_at', { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
    processedBy: varchar('processed_by').default('unknown').notNull(),
    tokenCount: integer('token_count').default(0),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    processTimeMs: bigint('process_time_ms', { mode: 'number' }).default(0),
  },
  (table) => [
    index('idx_chat_embeddings_hnsw').using(
      'hnsw',
      table.embedding.asc().nullsLast().op('vector_cosine_ops')
    ),
    index('idx_chat_messages_created').using(
      'btree',
      table.createdAt.desc().nullsFirst().op('timestamp_ops')
    ),
    index('idx_chat_messages_session').using(
      'btree',
      table.sessionId.asc().nullsLast().op('text_ops')
    ),
    index('idx_chat_messages_user').using('btree', table.userId.asc().nullsLast().op('text_ops')),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [chatSessions.id],
      name: 'chat_messages_session_id_fkey',
    }),
    check(
      'chat_messages_role_check',
      sql`(role)::text = ANY ((ARRAY['user'::character varying, 'assistant'::character varying])::text[])`
    ),
  ]
);

export const embeddings = pgTable('embeddings', {
  id: serial().primaryKey().notNull(),
  taskId: varchar('task_id', { length: 100 }),
  payload: text(),
  metadata: jsonb(),
  embedding: vector({ dimensions: 768 }),
});

export const documentChunks = pgTable(
  'document_chunks',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    documentId: uuid('document_id').notNull(),
    documentType: varchar('document_type', { length: 50 }).notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    content: text().notNull(),
    embedding: vector({ dimensions: 768 }).notNull(),
    metadata: jsonb().default({}).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index('document_chunks_document_id_idx').using(
      'btree',
      table.documentId.asc().nullsLast().op('uuid_ops')
    ),
    index('document_chunks_embedding_hnsw_idx').using(
      'hnsw',
      table.embedding.asc().nullsLast().op('vector_cosine_ops')
    ),
    index('idx_document_chunks_document_id').using(
      'btree',
      table.documentId.asc().nullsLast().op('uuid_ops')
    ),
    index('idx_document_chunks_embedding_hnsw')
      .using('hnsw', table.embedding.asc().nullsLast().op('vector_cosine_ops'))
      .with({ m: '16', ef_construction: '64' }),
    index('idx_document_chunks_index').using(
      'btree',
      table.documentId.asc().nullsLast().op('uuid_ops'),
      table.chunkIndex.asc().nullsLast().op('int4_ops')
    ),
  ]
);

export const caseEmbeddingsOptimized = pgTable(
  'case_embeddings_optimized',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    caseId: uuid('case_id').notNull(),
    docId: uuid('doc_id').notNull(),
    pageNo: integer('page_no').notNull(),
    chunkNo: integer('chunk_no').notNull(),
    content: text().notNull(),
    embedding: vector({ dimensions: 768 }),
    docTitle: text('doc_title'),
    chunkType: varchar('chunk_type', { length: 50 }).default('content'),
    tokenCount: integer('token_count'),
    overlapStart: integer('overlap_start').default(0),
    overlapEnd: integer('overlap_end').default(0),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  },
  (table) => [
    index('case_embeddings_case_id_idx').using(
      'btree',
      table.caseId.asc().nullsLast().op('uuid_ops')
    ),
    index('case_embeddings_chunk_idx').using(
      'btree',
      table.caseId.asc().nullsLast().op('uuid_ops'),
      table.pageNo.asc().nullsLast().op('int4_ops'),
      table.chunkNo.asc().nullsLast().op('uuid_ops')
    ),
    index('case_embeddings_doc_page_idx').using(
      'btree',
      table.docId.asc().nullsLast().op('uuid_ops'),
      table.pageNo.asc().nullsLast().op('uuid_ops')
    ),
    index('case_embeddings_optimized_idx')
      .using('ivfflat', table.embedding.asc().nullsLast().op('vector_cosine_ops'))
      .with({ lists: '100' }),
    foreignKey({
      columns: [table.caseId],
      foreignColumns: [cases.id],
      name: 'case_embeddings_optimized_case_id_fkey',
    }).onDelete('cascade'),
  ]
);

export const aiHistory = pgTable('ai_history', {
  id: uuid().defaultRandom().notNull(),
  userId: text('user_id'),
  prompt: text(),
  response: text(),
  embedding: text(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
});

export const errorLogs = pgTable('error_logs', {
  id: uuid().defaultRandom().notNull(),
  message: text().notNull(),
  stackTrace: text('stack_trace'),
  embedding: real().array(),
  metadata: jsonb(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
});

export const indexedFiles = pgTable('indexed_files', {
  id: uuid().defaultRandom().notNull(),
  filePath: text('file_path').notNull(),
  content: text(),
  embedding: real().array(),
  summary: text(),
  metadata: jsonb(),
  indexedAt: timestamp('indexed_at', { mode: 'string' }).defaultNow(),
});

export const aiEngineStatus = pgTable('ai_engine_status', {
  id: uuid().defaultRandom().notNull(),
  engineName: text('engine_name').notNull(),
  isOnline: boolean('is_online').default(false),
  lastHealthCheck: timestamp('last_health_check', { mode: 'string' }).defaultNow(),
  responseTime: integer('response_time'),
  version: text(),
  capabilities: jsonb(),
  configuration: jsonb(),
  errorStatus: text('error_status'),
  metadata: jsonb(),
});

export const gpuInferenceMessages = pgTable('gpu_inference_messages', {
  id: uuid().defaultRandom().notNull(),
  sessionId: uuid('session_id'),
  role: text().notNull(),
  content: text().notNull(),
  embedding: real().array(),
  engineUsed: text('engine_used'),
  responseTime: integer('response_time'),
  tokensGenerated: integer('tokens_generated'),
  cacheHit: boolean('cache_hit').default(false),
  metadata: jsonb(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
});

export const gpuInferenceSessions = pgTable('gpu_inference_sessions', {
  id: uuid().defaultRandom().notNull(),
  sessionName: text('session_name').notNull(),
  userId: text('user_id'),
  engineUsed: text('engine_used').notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
  metadata: jsonb(),
  isActive: boolean('is_active').default(true),
});

export const gpuPerformanceMetrics = pgTable('gpu_performance_metrics', {
  id: uuid().defaultRandom().notNull(),
  sessionId: uuid('session_id'),
  engineType: text('engine_type').notNull(),
  requestCount: integer('request_count'),
  avgResponseTime: real('avg_response_time'),
  cacheHitRate: real('cache_hit_rate'),
  tokensPerSecond: real('tokens_per_second'),
  gpuUtilization: real('gpu_utilization'),
  memoryUsage: real('memory_usage'),
  errorCount: integer('error_count'),
  metadata: jsonb(),
  measuredAt: timestamp('measured_at', { mode: 'string' }).defaultNow(),
});

export const documents = pgTable('documents', {
  id: serial().notNull(),
  uuid: varchar({ length: 36 }).notNull(),
  caseId: integer('case_id').notNull(),
  filename: varchar({ length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  contentType: varchar('content_type', { length: 100 }).notNull(),
  fileSize: integer('file_size').notNull(),
  minioPath: varchar('minio_path', { length: 500 }).notNull(),
  extractedText: text('extracted_text'),
  processingStatus: varchar('processing_status', { length: 50 }).default('pending').notNull(),
  processingError: text('processing_error'),
  metadata: jsonb(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

export const extractedEntities = pgTable('extracted_entities', {
  id: serial().notNull(),
  documentId: integer('document_id').notNull(),
  chunkId: integer('chunk_id'),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityValue: text('entity_value').notNull(),
  confidence: real().notNull(),
  startOffset: integer('start_offset'),
  endOffset: integer('end_offset'),
  context: text(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export const processingJobs = pgTable('processing_jobs', {
  id: serial().notNull(),
  uuid: varchar({ length: 36 }).notNull(),
  documentId: integer('document_id'),
  jobType: varchar('job_type', { length: 50 }).notNull(),
  status: varchar({ length: 50 }).default('queued').notNull(),
  currentStep: varchar('current_step', { length: 50 }),
  progress: integer().default(0).notNull(),
  result: jsonb(),
  error: text(),
  startedAt: timestamp('started_at', { mode: 'string' }),
  completedAt: timestamp('completed_at', { mode: 'string' }),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export const ragQueries = pgTable('rag_queries', {
  id: serial().notNull(),
  uuid: varchar({ length: 36 }).notNull(),
  caseId: integer('case_id'),
  query: text().notNull(),
  queryEmbedding: vector('query_embedding', { dimensions: 384 }),
  response: text(),
  model: varchar({ length: 50 }).notNull(),
  tokensUsed: integer('tokens_used'),
  processingTimeMs: integer('processing_time_ms'),
  similarityThreshold: real('similarity_threshold').default(0.7).notNull(),
  resultsCount: integer('results_count'),
  userFeedback: jsonb('user_feedback'),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export const ragQueryResults = pgTable('rag_query_results', {
  id: serial().notNull(),
  queryId: integer('query_id').notNull(),
  chunkId: integer('chunk_id').notNull(),
  similarityScore: real('similarity_score').notNull(),
  rank: integer().notNull(),
  used: boolean().default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export const caseSummaryVectors = pgTable('case_summary_vectors', {
  id: uuid().defaultRandom().notNull(),
  caseId: uuid('case_id').notNull(),
  summary: text().notNull(),
  embedding: vector({ dimensions: 384 }).notNull(),
  confidence: real().default(1),
  lastUpdated: timestamp('last_updated', { mode: 'string' }).defaultNow().notNull(),
});

export const documentVectors = pgTable('document_vectors', {
  id: uuid().defaultRandom().notNull(),
  documentId: uuid('document_id').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  content: text().notNull(),
  embedding: vector({ dimensions: 384 }).notNull(),
  metadata: jsonb(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export const knowledgeEdges = pgTable('knowledge_edges', {
  id: uuid().defaultRandom().notNull(),
  sourceId: uuid('source_id').notNull(),
  targetId: uuid('target_id').notNull(),
  relationship: text().notNull(),
  weight: real().default(1),
  metadata: jsonb(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export const knowledgeNodes = pgTable('knowledge_nodes', {
  id: uuid().defaultRandom().notNull(),
  nodeType: text('node_type').notNull(),
  nodeId: uuid('node_id').notNull(),
  label: text().notNull(),
  embedding: vector({ dimensions: 384 }).notNull(),
  properties: jsonb(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

export const queryVectors = pgTable('query_vectors', {
  id: uuid().defaultRandom().notNull(),
  userId: uuid('user_id').notNull(),
  query: text().notNull(),
  embedding: vector({ dimensions: 384 }).notNull(),
  resultCount: integer('result_count').default(0),
  clickedResults: jsonb('clicked_results'),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export const recommendationCache = pgTable('recommendation_cache', {
  id: uuid().defaultRandom().notNull(),
  userId: uuid('user_id').notNull(),
  recommendationType: text('recommendation_type').notNull(),
  recommendations: jsonb().notNull(),
  score: real().default(0),
  expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export const evidenceVectors = pgTable('evidence_vectors', {
  id: uuid().defaultRandom().notNull(),
  evidenceId: uuid('evidence_id').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  content: text().notNull(),
  embedding: vector({ dimensions: 768 }).notNull(),
  analysisType: text('analysis_type'),
  metadata: jsonb(),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
});

export const vectorEmbeddings = pgTable(
  'vector_embeddings',
  {
    id: serial().notNull(),
    documentId: text('document_id').notNull(),
    content: text(),
    embedding: vector({ dimensions: 1536 }),
    metadata: jsonb(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
  },
  (table) => [
    index('idx_vector_embeddings_cosine')
      .using('ivfflat', table.embedding.asc().nullsLast().op('vector_cosine_ops'))
      .with({ lists: '10' }),
  ]
);

export const qloraTrainingJobs = pgTable('qlora_training_jobs', {
  id: serial().primaryKey().notNull(),
  config: jsonb().notNull(),
  status: text().default('pending'),
  performanceMetrics: jsonb('performance_metrics'),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
});
export const legalDocumentAnalytics = pgView('legal_document_analytics', {
  documentType: text('document_type'),
  practiceArea: text('practice_area'),
  jurisdiction: text(),
  confidentialityLevel: text('confidentiality_level'),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  documentCount: bigint('document_count', { mode: 'number' }),
  avgAiConfidence: doublePrecision('avg_ai_confidence'),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  humanVerifiedCount: bigint('human_verified_count', { mode: 'number' }),
  latestDocument: timestamp('latest_document', { withTimezone: true, mode: 'string' }),
  earliestDocument: timestamp('earliest_document', { withTimezone: true, mode: 'string' }),
}).as(
  sql`SELECT document_type, practice_area, jurisdiction, confidentiality_level, count(*) AS document_count, avg( CASE WHEN (((metadata -> 'aiMetadata'::text) ->> 'confidence'::text)::real) IS NOT NULL THEN ((metadata -> 'aiMetadata'::text) ->> 'confidence'::text)::real ELSE NULL::real END) AS avg_ai_confidence, count( CASE WHEN (((metadata -> 'aiMetadata'::text) ->> 'humanVerified'::text)::boolean) = true THEN 1 ELSE NULL::integer END) AS human_verified_count, max(created_at) AS latest_document, min(created_at) AS earliest_document FROM legal_documents_jsonb GROUP BY document_type, practice_area, jurisdiction, confidentiality_level`
);

export const citationNetwork = pgView('citation_network', {
  documentId: uuid('document_id'),
  documentTitle: text('document_title'),
  documentType: text('document_type'),
  citationType: text('citation_type'),
  citedDocument: text('cited_document'),
  relevanceScore: real('relevance_score'),
}).as(
  sql`SELECT d.id AS document_id, d.title AS document_title, d.document_type, citation.value ->> 'type'::text AS citation_type, citation.value ->> 'citation'::text AS cited_document, (citation.value ->> 'relevance'::text)::real AS relevance_score FROM legal_documents_jsonb d, LATERAL jsonb_array_elements(d.metadata -> 'citations'::text) citation(value) WHERE (d.metadata -> 'citations'::text) IS NOT NULL`
);
