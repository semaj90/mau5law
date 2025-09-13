import { pgTable, uuid, text, vector, varchar, jsonb, timestamp, integer, numeric, boolean, foreignKey, unique, serial, index, bigserial, bigint, check, uniqueIndex, interval, pgView } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const chatEmbeddings = pgTable("chat_embeddings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	messageId: uuid("message_id").notNull(),
	content: text().notNull(),
	embedding: vector({ dimensions: 768 }).notNull(),
	role: varchar({ length: 20 }).notNull(),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const caseActivities = pgTable("case_activities", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id").notNull(),
	activityType: varchar("activity_type", { length: 50 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	scheduledFor: timestamp("scheduled_for", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	status: varchar({ length: 20 }).default('pending').notNull(),
	priority: varchar({ length: 20 }).default('medium').notNull(),
	assignedTo: uuid("assigned_to"),
	relatedEvidence: jsonb("related_evidence").default([]).notNull(),
	relatedCriminals: jsonb("related_criminals").default([]).notNull(),
	metadata: jsonb().default({}).notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const criminals = pgTable("criminals", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	firstName: varchar("first_name", { length: 100 }).notNull(),
	lastName: varchar("last_name", { length: 100 }).notNull(),
	middleName: varchar("middle_name", { length: 100 }),
	aliases: jsonb().default([]).notNull(),
	dateOfBirth: timestamp("date_of_birth", { mode: 'string' }),
	placeOfBirth: varchar("place_of_birth", { length: 200 }),
	address: text(),
	phone: varchar({ length: 20 }),
	email: varchar({ length: 255 }),
	ssn: varchar({ length: 11 }),
	driversLicense: varchar("drivers_license", { length: 50 }),
	height: integer(),
	weight: integer(),
	eyeColor: varchar("eye_color", { length: 20 }),
	hairColor: varchar("hair_color", { length: 20 }),
	distinguishingMarks: text("distinguishing_marks"),
	photoUrl: text("photo_url"),
	fingerprints: jsonb().default({}),
	threatLevel: varchar("threat_level", { length: 20 }).default('low').notNull(),
	status: varchar({ length: 20 }).default('active').notNull(),
	notes: text(),
	aiSummary: text("ai_summary"),
	aiTags: jsonb("ai_tags").default([]).notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const contentEmbeddings = pgTable("content_embeddings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	contentId: uuid("content_id").notNull(),
	contentType: varchar("content_type", { length: 50 }).notNull(),
	textContent: text("text_content").notNull(),
	embedding: vector({ dimensions: 768 }),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const legalPrecedents = pgTable("legal_precedents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseTitle: varchar("case_title", { length: 255 }).notNull(),
	citation: varchar({ length: 255 }).notNull(),
	court: varchar({ length: 100 }),
	year: integer(),
	jurisdiction: varchar({ length: 50 }),
	summary: text(),
	fullText: text("full_text"),
	embedding: text(),
	relevanceScore: numeric("relevance_score", { precision: 3, scale:  2 }),
	legalPrinciples: jsonb("legal_principles").default([]).notNull(),
	linkedCases: jsonb("linked_cases").default([]).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const ragMessages = pgTable("rag_messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: varchar("session_id", { length: 255 }).notNull(),
	messageIndex: integer("message_index").notNull(),
	role: varchar({ length: 20 }).notNull(),
	content: text().notNull(),
	retrievedSources: jsonb("retrieved_sources").default([]).notNull(),
	sourceCount: integer("source_count").default(0).notNull(),
	retrievalScore: varchar("retrieval_score", { length: 10 }),
	processingTime: integer("processing_time"),
	model: varchar({ length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const statutes = pgTable("statutes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 100 }).notNull(),
	description: text(),
	category: varchar({ length: 100 }),
	jurisdiction: varchar({ length: 100 }),
	isActive: boolean("is_active").default(true),
	penalties: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const caseEmbeddings = pgTable("case_embeddings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id"),
	content: text().notNull(),
	embedding: vector({ dimensions: 768 }).notNull(),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "case_embeddings_case_id_cases_id_fk"
		}).onDelete("cascade"),
]);

export const vectorMetadata = pgTable("vector_metadata", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	documentId: text("document_id").notNull(),
	collectionName: varchar("collection_name", { length: 100 }).notNull(),
	metadata: jsonb().default({}).notNull(),
	contentHash: text("content_hash").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("vector_metadata_document_id_unique").on(table.documentId),
]);

export const aiReports = pgTable("ai_reports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id"),
	reportType: varchar("report_type", { length: 50 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	content: text().notNull(),
	richTextContent: jsonb("rich_text_content"),
	metadata: jsonb().default({}).notNull(),
	canvasElements: jsonb("canvas_elements").default([]).notNull(),
	generatedBy: varchar("generated_by", { length: 100 }).default('gemma3-legal'),
	confidence: numeric({ precision: 3, scale:  2 }).default('0.85'),
	isActive: boolean("is_active").default(true),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "ai_reports_case_id_cases_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "ai_reports_created_by_users_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	emailVerified: timestamp("email_verified", { mode: 'string' }),
	hashedPassword: text("hashed_password"),
	name: text(),
	firstName: varchar("first_name", { length: 100 }),
	lastName: varchar("last_name", { length: 100 }),
	avatarUrl: text("avatar_url"),
	role: varchar({ length: 50 }).default('prosecutor').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const attachmentVerifications = pgTable("attachment_verifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	attachmentId: uuid("attachment_id").notNull(),
	verifiedBy: uuid("verified_by").notNull(),
	verificationStatus: varchar("verification_status", { length: 50 }).default('pending').notNull(),
	verificationNotes: text("verification_notes"),
	verifiedAt: timestamp("verified_at", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.verifiedBy],
			foreignColumns: [users.id],
			name: "attachment_verifications_verified_by_users_id_fk"
		}),
]);

export const canvasAnnotations = pgTable("canvas_annotations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	evidenceId: uuid("evidence_id"),
	fabricData: jsonb("fabric_data").notNull(),
	annotationType: varchar("annotation_type", { length: 50 }),
	coordinates: jsonb(),
	boundingBox: jsonb("bounding_box"),
	text: text(),
	color: varchar({ length: 20 }),
	layerOrder: integer("layer_order").default(0),
	isVisible: boolean("is_visible").default(true),
	metadata: jsonb().default({}),
	version: integer().default(1),
	parentAnnotationId: uuid("parent_annotation_id"),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.evidenceId],
			foreignColumns: [evidence.id],
			name: "canvas_annotations_evidence_id_evidence_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "canvas_annotations_created_by_users_id_fk"
		}),
]);

export const canvasStates = pgTable("canvas_states", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id"),
	name: varchar({ length: 255 }).notNull(),
	canvasData: jsonb("canvas_data").notNull(),
	version: integer().default(1),
	isDefault: boolean("is_default").default(false),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "canvas_states_case_id_cases_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "canvas_states_created_by_users_id_fk"
		}),
]);

export const caseScores = pgTable("case_scores", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id").notNull(),
	score: numeric({ precision: 5, scale:  2 }).notNull(),
	riskLevel: varchar("risk_level", { length: 20 }).notNull(),
	breakdown: jsonb().default({}).notNull(),
	criteria: jsonb().default({}).notNull(),
	recommendations: jsonb().default([]).notNull(),
	calculatedBy: uuid("calculated_by"),
	calculatedAt: timestamp("calculated_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "case_scores_case_id_cases_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.calculatedBy],
			foreignColumns: [users.id],
			name: "case_scores_calculated_by_users_id_fk"
		}),
]);

export const citations = pgTable("citations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id"),
	documentId: uuid("document_id"),
	citationType: varchar("citation_type", { length: 50 }).notNull(),
	relevanceScore: numeric("relevance_score", { precision: 3, scale:  2 }),
	pageNumber: integer("page_number"),
	pinpointCitation: varchar("pinpoint_citation", { length: 100 }),
	quotedText: text("quoted_text"),
	contextBefore: text("context_before"),
	contextAfter: text("context_after"),
	annotation: text(),
	legalPrinciple: text("legal_principle"),
	citationFormat: varchar("citation_format", { length: 20 }).default('bluebook'),
	formattedCitation: text("formatted_citation"),
	shepardsTreatment: varchar("shepards_treatment", { length: 50 }),
	isKeyAuthority: boolean("is_key_authority").default(false),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "citations_case_id_cases_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [legalDocuments.id],
			name: "citations_document_id_legal_documents_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "citations_created_by_users_id_fk"
		}),
]);

export const emailVerificationCodes = pgTable("email_verification_codes", {
	id: serial().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	email: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 8 }).notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "email_verification_codes_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("email_verification_codes_user_id_unique").on(table.userId),
]);

export const evidenceVectors = pgTable("evidence_vectors", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	evidenceId: uuid("evidence_id"),
	content: text().notNull(),
	embedding: text().notNull(),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.evidenceId],
			foreignColumns: [evidence.id],
			name: "evidence_vectors_evidence_id_evidence_id_fk"
		}).onDelete("cascade"),
]);

export const hashVerifications = pgTable("hash_verifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	evidenceId: uuid("evidence_id"),
	verifiedHash: varchar("verified_hash", { length: 64 }).notNull(),
	storedHash: varchar("stored_hash", { length: 64 }),
	result: boolean().notNull(),
	verificationMethod: varchar("verification_method", { length: 50 }).default('manual'),
	verifiedBy: uuid("verified_by"),
	verifiedAt: timestamp("verified_at", { mode: 'string' }).defaultNow(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.evidenceId],
			foreignColumns: [evidence.id],
			name: "hash_verifications_evidence_id_evidence_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.verifiedBy],
			foreignColumns: [users.id],
			name: "hash_verifications_verified_by_users_id_fk"
		}),
]);

export const legalAnalysisSessions = pgTable("legal_analysis_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id"),
	userId: uuid("user_id"),
	sessionType: varchar("session_type", { length: 50 }).default('case_analysis'),
	analysisPrompt: text("analysis_prompt"),
	analysisResult: text("analysis_result"),
	confidenceLevel: numeric("confidence_level", { precision: 3, scale:  2 }),
	sourcesUsed: jsonb("sources_used").default([]).notNull(),
	model: varchar({ length: 100 }).default('gemma3-legal'),
	processingTime: integer("processing_time"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "legal_analysis_sessions_case_id_cases_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "legal_analysis_sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const legalResearch = pgTable("legal_research", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id"),
	query: text().notNull(),
	searchTerms: jsonb("search_terms").default([]),
	jurisdiction: varchar({ length: 100 }),
	dateRange: jsonb("date_range"),
	courtLevel: varchar("court_level", { length: 50 }),
	practiceArea: varchar("practice_area", { length: 100 }),
	resultsCount: integer("results_count").default(0),
	searchResults: jsonb("search_results").default([]),
	aiSummary: text("ai_summary"),
	keyFindings: jsonb("key_findings").default([]),
	recommendedCitations: jsonb("recommended_citations").default([]),
	searchDuration: integer("search_duration"),
	dataSource: varchar("data_source", { length: 50 }),
	isBookmarked: boolean("is_bookmarked").default(false),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "legal_research_case_id_cases_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "legal_research_created_by_users_id_fk"
		}),
]);

export const passwordResetTokens = pgTable("password_reset_tokens", {
	tokenHash: varchar("token_hash", { length: 63 }).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "password_reset_tokens_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const personsOfInterest = pgTable("persons_of_interest", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id"),
	name: varchar({ length: 255 }).notNull(),
	aliases: jsonb().default([]).notNull(),
	relationship: varchar({ length: 100 }),
	threatLevel: varchar("threat_level", { length: 20 }).default('low'),
	status: varchar({ length: 20 }).default('active'),
	profileData: jsonb("profile_data").default({}).notNull(),
	tags: jsonb().default([]).notNull(),
	position: jsonb().default({}).notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "persons_of_interest_case_id_cases_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "persons_of_interest_created_by_users_id_fk"
		}),
]);

export const ragSessions = pgTable("rag_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: varchar("session_id", { length: 255 }).notNull(),
	userId: uuid("user_id"),
	title: varchar({ length: 255 }),
	model: varchar({ length: 100 }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "rag_sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("rag_sessions_session_id_unique").on(table.sessionId),
]);

export const reports = pgTable("reports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id"),
	title: varchar({ length: 255 }).notNull(),
	content: text(),
	reportType: varchar("report_type", { length: 50 }).default('case_summary'),
	status: varchar({ length: 20 }).default('draft'),
	isPublic: boolean("is_public").default(false),
	tags: jsonb().default([]).notNull(),
	metadata: jsonb().default({}).notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "reports_case_id_cases_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "reports_created_by_users_id_fk"
		}),
]);

export const savedReports = pgTable("saved_reports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: varchar({ length: 300 }).notNull(),
	caseId: uuid("case_id"),
	reportType: varchar("report_type", { length: 50 }).notNull(),
	templateId: uuid("template_id"),
	content: jsonb().notNull(),
	htmlContent: text("html_content"),
	generatedBy: varchar("generated_by", { length: 50 }).default('manual'),
	aiModel: varchar("ai_model", { length: 50 }),
	aiPrompt: text("ai_prompt"),
	exportFormat: varchar("export_format", { length: 20 }).default('pdf'),
	status: varchar({ length: 20 }).default('draft'),
	version: integer().default(1),
	wordCount: integer("word_count"),
	tags: jsonb().default([]),
	metadata: jsonb().default({}),
	sharedWith: jsonb("shared_with").default([]),
	lastExported: timestamp("last_exported", { mode: 'string' }),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "saved_reports_case_id_cases_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "saved_reports_created_by_users_id_fk"
		}),
]);

export const sessions = pgTable("sessions", {
	id: text().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const cases = pgTable("cases", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseNumber: varchar("case_number", { length: 50 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	name: varchar({ length: 255 }),
	description: text(),
	incidentDate: timestamp("incident_date", { mode: 'string' }),
	location: text(),
	priority: varchar({ length: 20 }).default('medium').notNull(),
	status: varchar({ length: 20 }).default('open').notNull(),
	category: varchar({ length: 50 }),
	dangerScore: integer("danger_score").default(0).notNull(),
	estimatedValue: numeric("estimated_value", { precision: 12, scale:  2 }),
	jurisdiction: varchar({ length: 100 }),
	leadProsecutor: uuid("lead_prosecutor"),
	assignedTeam: jsonb("assigned_team").default([]).notNull(),
	tags: jsonb().default([]).notNull(),
	aiSummary: text("ai_summary"),
	aiTags: jsonb("ai_tags").default([]).notNull(),
	metadata: jsonb().default({}).notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	closedAt: timestamp("closed_at", { mode: 'string' }),
	caseType: varchar("case_type", { length: 50 }).default('criminal'),
}, (table) => [
	index("cases_metadata_gin_idx").using("gin", table.metadata.asc().nullsLast().op("jsonb_ops")).where(sql`(metadata IS NOT NULL)`),
	index("idx_cases_ai_summary_gin").using("gin", sql`to_tsvector('english'::regconfig, COALESCE(ai_summary, ''::text`).where(sql`(ai_summary IS NOT NULL)`),
	index("idx_cases_ai_tags_gin").using("gin", table.aiTags.asc().nullsLast().op("jsonb_path_ops")),
	index("idx_cases_assigned_team_gin").using("gin", table.assignedTeam.asc().nullsLast().op("jsonb_path_ops")),
	index("idx_cases_case_type").using("btree", table.caseType.asc().nullsLast().op("text_ops")),
	index("idx_cases_created_at_desc").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_cases_danger_score_desc").using("btree", table.dangerScore.desc().nullsFirst().op("int4_ops")).where(sql`(danger_score > 0)`),
	index("idx_cases_estimated_value_desc").using("btree", table.estimatedValue.desc().nullsLast().op("numeric_ops")).where(sql`(estimated_value IS NOT NULL)`),
	index("idx_cases_lead_prosecutor").using("btree", table.leadProsecutor.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")).where(sql`(lead_prosecutor IS NOT NULL)`),
	index("idx_cases_metadata_gin").using("gin", table.metadata.asc().nullsLast().op("jsonb_path_ops")),
	index("idx_cases_priority_status_created").using("btree", table.priority.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_cases_search_gin").using("gin", sql`to_tsvector('english'::regconfig, (((title)::text || ' '::text)`),
	index("idx_cases_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_cases_type_category_status").using("btree", table.caseType.asc().nullsLast().op("text_ops"), table.category.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_cases_updated_at_desc").using("btree", table.updatedAt.desc().nullsFirst().op("timestamp_ops")),
	unique("cases_case_number_unique").on(table.caseNumber),
]);

export const evidence = pgTable("evidence", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id"),
	criminalId: uuid("criminal_id"),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	evidenceType: varchar("evidence_type", { length: 50 }).notNull(),
	fileType: varchar("file_type", { length: 50 }),
	subType: varchar("sub_type", { length: 50 }),
	fileUrl: text("file_url"),
	fileName: varchar("file_name", { length: 255 }),
	fileSize: integer("file_size"),
	mimeType: varchar("mime_type", { length: 100 }),
	hash: varchar({ length: 128 }),
	tags: jsonb().default([]).notNull(),
	chainOfCustody: jsonb("chain_of_custody").default([]).notNull(),
	collectedAt: timestamp("collected_at", { mode: 'string' }),
	collectedBy: varchar("collected_by", { length: 255 }),
	location: text(),
	labAnalysis: jsonb("lab_analysis").default({}).notNull(),
	aiAnalysis: jsonb("ai_analysis").default({}).notNull(),
	aiTags: jsonb("ai_tags").default([]).notNull(),
	aiSummary: text("ai_summary"),
	summary: text(),
	isAdmissible: boolean("is_admissible").default(true).notNull(),
	confidentialityLevel: varchar("confidentiality_level", { length: 20 }).default('standard').notNull(),
	canvasPosition: jsonb("canvas_position").default({}).notNull(),
	uploadedBy: uuid("uploaded_by"),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	titleEmbedding: vector("title_embedding", { dimensions: 384 }),
	contentEmbedding: vector("content_embedding", { dimensions: 384 }),
	metadata: jsonb().default({}),
	gemmaTitleEmbedding: vector("gemma_title_embedding", { dimensions: 768 }),
	gemmaContentEmbedding: vector("gemma_content_embedding", { dimensions: 768 }),
}, (table) => [
	index("evidence_metadata_gin_idx").using("gin", table.metadata.asc().nullsLast().op("jsonb_ops")).where(sql`(metadata IS NOT NULL)`),
	index("idx_evidence_admissible_confidentiality").using("btree", table.isAdmissible.asc().nullsLast().op("bool_ops"), table.confidentialityLevel.asc().nullsLast().op("text_ops"), table.caseId.asc().nullsLast().op("uuid_ops")).where(sql`(is_admissible = true)`),
	index("idx_evidence_ai_analysis_classification").using("gin", sql`(((metadata -> 'aiAnalysis'::text) -> 'classification'::text))`),
	index("idx_evidence_ai_analysis_entities").using("gin", sql`(((metadata -> 'aiAnalysis'::text) -> 'entities'::text))`),
	index("idx_evidence_ai_analysis_gin").using("gin", table.aiAnalysis.asc().nullsLast().op("jsonb_path_ops")),
	index("idx_evidence_ai_analysis_key_terms").using("gin", sql`(((metadata -> 'aiAnalysis'::text) -> 'keyTerms'::text))`),
	index("idx_evidence_ai_tags_gin").using("gin", table.aiTags.asc().nullsLast().op("jsonb_path_ops")),
	index("idx_evidence_case_id").using("btree", table.caseId.asc().nullsLast().op("uuid_ops")),
	index("idx_evidence_case_type_collected").using("btree", table.caseId.asc().nullsLast().op("uuid_ops"), table.evidenceType.asc().nullsLast().op("uuid_ops"), table.collectedAt.desc().nullsLast().op("timestamp_ops")),
	index("idx_evidence_case_uploaded").using("btree", table.caseId.asc().nullsLast().op("timestamp_ops"), table.uploadedAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_evidence_chain_custody_gin").using("gin", table.chainOfCustody.asc().nullsLast().op("jsonb_path_ops")),
	index("idx_evidence_content_embedding_cosine").using("ivfflat", table.contentEmbedding.asc().nullsLast().op("vector_cosine_ops")),
	index("idx_evidence_content_embedding_hnsw").using("hnsw", table.contentEmbedding.asc().nullsLast().op("vector_cosine_ops")).where(sql`(content_embedding IS NOT NULL)`).with({m: "16",ef_construction: "64"}),
	index("idx_evidence_file_info").using("btree", table.evidenceType.asc().nullsLast().op("text_ops"), table.fileType.asc().nullsLast().op("text_ops"), table.mimeType.asc().nullsLast().op("text_ops")).where(sql`(file_url IS NOT NULL)`),
	index("idx_evidence_gemma_content_hnsw").using("hnsw", table.gemmaContentEmbedding.asc().nullsLast().op("vector_cosine_ops")).with({m: "16",ef_construction: "64"}),
	index("idx_evidence_gemma_title_hnsw").using("hnsw", table.gemmaTitleEmbedding.asc().nullsLast().op("vector_cosine_ops")).with({m: "16",ef_construction: "64"}),
	index("idx_evidence_hash").using("btree", table.hash.asc().nullsLast().op("text_ops")).where(sql`(hash IS NOT NULL)`),
	index("idx_evidence_metadata_gin").using("gin", table.metadata.asc().nullsLast().op("jsonb_path_ops")),
	index("idx_evidence_tags_gin").using("gin", table.tags.asc().nullsLast().op("jsonb_path_ops")),
	index("idx_evidence_title_embedding_cosine").using("ivfflat", table.titleEmbedding.asc().nullsLast().op("vector_cosine_ops")),
	index("idx_evidence_title_embedding_hnsw").using("hnsw", table.titleEmbedding.asc().nullsLast().op("vector_cosine_ops")).where(sql`(title_embedding IS NOT NULL)`).with({m: "16",ef_construction: "64"}),
]);

export const themes = pgTable("themes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	cssVariables: jsonb("css_variables").notNull(),
	colorPalette: jsonb("color_palette").notNull(),
	isSystem: boolean("is_system").default(false).notNull(),
	isPublic: boolean("is_public").default(false).notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "themes_created_by_users_id_fk"
		}).onDelete("cascade"),
]);

export const userEmbeddings = pgTable("user_embeddings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	content: text().notNull(),
	embedding: text().notNull(),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_embeddings_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const embeddingCache = pgTable("embedding_cache", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	textHash: text("text_hash").notNull(),
	model: varchar({ length: 100 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	embedding: vector({ dimensions: 768 }).notNull(),
}, (table) => [
	unique("embedding_cache_text_hash_unique").on(table.textHash),
]);

export const legalDocuments = pgTable("legal_documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: varchar({ length: 500 }).notNull(),
	documentType: varchar("document_type", { length: 50 }).notNull(),
	jurisdiction: varchar({ length: 100 }),
	court: varchar({ length: 200 }),
	citation: varchar({ length: 300 }),
	fullCitation: text("full_citation"),
	docketNumber: varchar("docket_number", { length: 100 }),
	dateDecided: timestamp("date_decided", { mode: 'string' }),
	datePublished: timestamp("date_published", { mode: 'string' }),
	fullText: text("full_text"),
	content: text(),
	summary: text(),
	headnotes: text(),
	keywords: jsonb().default([]),
	topics: jsonb().default([]),
	parties: jsonb().default({}),
	judges: jsonb().default([]),
	attorneys: jsonb().default({}),
	outcome: varchar({ length: 100 }),
	precedentialValue: varchar("precedential_value", { length: 50 }),
	url: text(),
	pdfUrl: text("pdf_url"),
	westlawId: varchar("westlaw_id", { length: 100 }),
	lexisId: varchar("lexis_id", { length: 100 }),
	caseId: uuid("case_id"),
	evidenceId: uuid("evidence_id"),
	isActive: boolean("is_active").default(true),
	isDirty: boolean("is_dirty").default(false),
	lastSavedAt: timestamp("last_saved_at", { mode: 'string' }),
	autoSaveData: jsonb("auto_save_data"),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	embedding: vector({ dimensions: 768 }),
}, (table) => [
	index("idx_legal_documents_case_evidence").using("btree", table.caseId.asc().nullsLast().op("uuid_ops"), table.evidenceId.asc().nullsLast().op("uuid_ops")).where(sql`(case_id IS NOT NULL)`),
	index("idx_legal_documents_case_id").using("btree", table.caseId.asc().nullsLast().op("uuid_ops")),
	index("idx_legal_documents_created_at_desc").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_legal_documents_embedding").using("ivfflat", table.embedding.asc().nullsLast().op("vector_cosine_ops")).with({lists: "100"}),
	index("legal_documents_content_fts_idx").using("gin", sql`to_tsvector('english'::regconfig, COALESCE(content, full_text, `).where(sql`((content IS NOT NULL) OR (full_text IS NOT NULL))`),
	index("legal_documents_date_decided_idx").using("btree", table.dateDecided.asc().nullsLast().op("timestamp_ops")),
	index("legal_documents_document_type_idx").using("btree", table.documentType.asc().nullsLast().op("text_ops")),
	index("legal_documents_embedding_hnsw_idx").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")).where(sql`(embedding IS NOT NULL)`).with({m: "16",ef_construction: "64"}),
	index("legal_documents_jurisdiction_idx").using("btree", table.jurisdiction.asc().nullsLast().op("text_ops")),
	index("legal_documents_keywords_gin_idx").using("gin", table.keywords.asc().nullsLast().op("jsonb_ops")).where(sql`(keywords IS NOT NULL)`),
	index("legal_documents_parties_gin_idx").using("gin", table.parties.asc().nullsLast().op("jsonb_ops")).where(sql`(parties IS NOT NULL)`),
	index("legal_documents_topics_gin_idx").using("gin", table.topics.asc().nullsLast().op("jsonb_ops")).where(sql`(topics IS NOT NULL)`),
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "legal_documents_case_id_cases_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.evidenceId],
			foreignColumns: [evidence.id],
			name: "legal_documents_evidence_id_evidence_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "legal_documents_created_by_users_id_fk"
		}),
]);

export const documentChunks = pgTable("document_chunks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	documentId: uuid("document_id").notNull(),
	documentType: varchar("document_type", { length: 50 }).notNull(),
	chunkIndex: integer("chunk_index").notNull(),
	content: text().notNull(),
	embedding: vector({ dimensions: 768 }).notNull(),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const autoTags = pgTable("auto_tags", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	entityId: uuid("entity_id").notNull(),
	entityType: varchar("entity_type", { length: 50 }).notNull(),
	tag: varchar({ length: 100 }).notNull(),
	confidence: numeric({ precision: 3, scale:  2 }).notNull(),
	source: varchar({ length: 50 }).default('ai_analysis').notNull(),
	model: varchar({ length: 100 }),
	extractedAt: timestamp("extracted_at", { mode: 'string' }).defaultNow().notNull(),
	isConfirmed: boolean("is_confirmed").default(false).notNull(),
	confirmedBy: uuid("confirmed_by"),
	confirmedAt: timestamp("confirmed_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.confirmedBy],
			foreignColumns: [users.id],
			name: "auto_tags_confirmed_by_users_id_fk"
		}),
]);

export const userAiQueries = pgTable("user_ai_queries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	caseId: uuid("case_id"),
	query: text().notNull(),
	response: text().notNull(),
	model: varchar({ length: 100 }).default('gemma3-legal').notNull(),
	queryType: varchar("query_type", { length: 50 }).default('general'),
	confidence: numeric({ precision: 3, scale:  2 }),
	tokensUsed: integer("tokens_used"),
	processingTime: integer("processing_time"),
	contextUsed: jsonb("context_used").default([]).notNull(),
	embedding: vector({ dimensions: 768 }),
	metadata: jsonb().default({}).notNull(),
	isSuccessful: boolean("is_successful").default(true).notNull(),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_ai_queries_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "user_ai_queries_case_id_cases_id_fk"
		}).onDelete("cascade"),
]);

export const chatSessions = pgTable("chat_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	title: varchar({ length: 255 }),
	context: jsonb().default({}),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("chat_sessions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_sessions_user_id_fkey"
		}).onDelete("cascade"),
]);

export const chatMessages = pgTable("chat_messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: uuid("session_id"),
	role: varchar({ length: 20 }).notNull(),
	content: text().notNull(),
	embedding: vector({ dimensions: 768 }),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("chat_messages_embedding_hnsw_idx").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")).with({m: "16",ef_construction: "64"}),
	index("chat_messages_embedding_ivf_idx").using("ivfflat", table.embedding.asc().nullsLast().op("vector_cosine_ops")).with({lists: "100"}),
	index("chat_messages_role_idx").using("btree", table.role.asc().nullsLast().op("text_ops")),
	index("chat_messages_session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [chatSessions.id],
			name: "chat_messages_session_id_fkey"
		}).onDelete("cascade"),
]);

export const gpuClusterExecutions = pgTable("gpu_cluster_executions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	executionDate: timestamp("execution_date", { mode: 'string' }).defaultNow(),
	totalWorkers: integer("total_workers").notNull(),
	gpuContexts: integer("gpu_contexts").notNull(),
	avgDurationMs: integer("avg_duration_ms").default(0),
	successRate: numeric("success_rate", { precision: 5, scale:  2 }).default('0.00'),
	totalTasks: integer("total_tasks").default(0),
	successfulTasks: integer("successful_tasks").default(0),
	failedTasks: integer("failed_tasks").default(0),
	configuration: jsonb().default({}),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_gpu_executions_date").using("btree", table.executionDate.asc().nullsLast().op("timestamp_ops")),
]);

export const gpuTaskResults = pgTable("gpu_task_results", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	executionId: uuid("execution_id"),
	workerId: integer("worker_id").notNull(),
	taskName: varchar("task_name", { length: 100 }).notNull(),
	taskType: varchar("task_type", { length: 50 }).default('legal-ai'),
	durationMs: integer("duration_ms").default(0),
	success: boolean().default(false),
	errorMessage: text("error_message"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_gpu_task_results_execution_id").using("btree", table.executionId.asc().nullsLast().op("uuid_ops")),
	index("idx_gpu_task_results_task_type").using("btree", table.taskType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.executionId],
			foreignColumns: [gpuClusterExecutions.id],
			name: "gpu_task_results_execution_id_fkey"
		}).onDelete("cascade"),
]);

export const redisGpuJobs = pgTable("redis_gpu_jobs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	jobId: varchar("job_id", { length: 100 }).notNull(),
	jobType: varchar("job_type", { length: 50 }).notNull(),
	status: varchar({ length: 20 }).default('pending'),
	priority: integer().default(1),
	data: jsonb().default({}),
	result: jsonb().default({}),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	startedAt: timestamp("started_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	processingTimeMs: integer("processing_time_ms").default(0),
}, (table) => [
	index("idx_redis_jobs_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_redis_jobs_job_type").using("btree", table.jobType.asc().nullsLast().op("text_ops")),
	index("idx_redis_jobs_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	unique("redis_gpu_jobs_job_id_key").on(table.jobId),
]);

export const documentMetadata = pgTable("document_metadata", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	evidenceId: uuid("evidence_id"),
	caseId: uuid("case_id"),
	documentType: varchar("document_type", { length: 100 }),
	confidenceScore: numeric("confidence_score", { precision: 5, scale:  4 }).default('0.0000'),
	processingStatus: varchar("processing_status", { length: 50 }).default('pending'),
	aiAnalysis: jsonb("ai_analysis").default({}),
	extractedEntities: jsonb("extracted_entities").default([]),
	legalCitations: jsonb("legal_citations").default([]),
	similarityScores: jsonb("similarity_scores").default({}),
	embeddingsGenerated: boolean("embeddings_generated").default(false),
	simdProcessed: boolean("simd_processed").default(false),
	gpuProcessed: boolean("gpu_processed").default(false),
	redisCached: boolean("redis_cached").default(false),
	processingTimeMs: integer("processing_time_ms").default(0),
	processedAt: timestamp("processed_at", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	metadata: jsonb(),
}, (table) => [
	index("idx_document_metadata_case_id").using("btree", table.caseId.asc().nullsLast().op("uuid_ops")),
	index("idx_document_metadata_document_type").using("btree", table.documentType.asc().nullsLast().op("text_ops")),
	index("idx_document_metadata_evidence_id").using("btree", table.evidenceId.asc().nullsLast().op("uuid_ops")),
	index("idx_document_metadata_processing_status").using("btree", table.processingStatus.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.evidenceId],
			foreignColumns: [evidence.id],
			name: "document_metadata_evidence_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "document_metadata_case_id_fkey"
		}).onDelete("cascade"),
]);

export const documents = pgTable("documents", {
	id: text().primaryKey().notNull(),
	caseId: text("case_id"),
	title: text(),
	content: text(),
	contentType: text("content_type"),
	metadata: jsonb(),
	embedding: vector({ dimensions: 1536 }),
	summary: text(),
	keywords: text().array(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_documents_case_id").using("btree", table.caseId.asc().nullsLast().op("text_ops")),
]);

export const messages = pgTable("messages", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	caseId: integer("case_id").default(1).notNull(),
	sender: text().default('system').notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const messageEmbeddings = pgTable("message_embeddings", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	messageId: bigint("message_id", { mode: "number" }).notNull(),
	model: text().default('nomic-embed-text').notNull(),
	embedding: vector({ dimensions: 768 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_message_embeddings_hnsw_768").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")).with({m: "16",ef_construction: "64"}),
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [messages.id],
			name: "message_embeddings_message_id_fkey"
		}).onDelete("cascade"),
	unique("message_embeddings_message_id_model_key").on(table.messageId, table.model),
]);

export const detectiveAnalysis = pgTable("detective_analysis", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id").notNull(),
	analysisType: varchar("analysis_type", { length: 50 }).notNull(),
	queryData: jsonb("query_data").notNull(),
	results: jsonb().notNull(),
	confidenceScore: numeric("confidence_score", { precision: 3, scale:  2 }),
	aiModel: varchar("ai_model", { length: 100 }),
	processingTime: integer("processing_time"),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_detective_analysis_case_created").using("btree", table.caseId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	index("idx_detective_analysis_case_id").using("btree", table.caseId.asc().nullsLast().op("uuid_ops")),
	index("idx_detective_analysis_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_detective_analysis_query_data").using("gin", table.queryData.asc().nullsLast().op("jsonb_ops")),
	index("idx_detective_analysis_results").using("gin", table.results.asc().nullsLast().op("jsonb_ops")),
	index("idx_detective_analysis_type").using("btree", table.analysisType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "detective_analysis_case_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "detective_analysis_created_by_fkey"
		}),
]);

export const caseTimeline = pgTable("case_timeline", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id").notNull(),
	eventType: varchar("event_type", { length: 50 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	eventDate: timestamp("event_date", { withTimezone: true, mode: 'string' }).notNull(),
	importance: varchar({ length: 20 }).default('medium'),
	evidenceId: uuid("evidence_id"),
	relatedEntityId: uuid("related_entity_id"),
	relatedEntityType: varchar("related_entity_type", { length: 50 }),
	eventData: jsonb("event_data").default({}),
	automated: boolean().default(false),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_case_timeline_case_id").using("btree", table.caseId.asc().nullsLast().op("uuid_ops")),
	index("idx_case_timeline_event_date").using("btree", table.eventDate.asc().nullsLast().op("timestamptz_ops")),
	index("idx_case_timeline_event_type").using("btree", table.eventType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "case_timeline_case_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "case_timeline_created_by_fkey"
		}),
]);

export const aiRecommendations = pgTable("ai_recommendations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id"),
	type: varchar({ length: 50 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	reasoning: text(),
	priority: varchar({ length: 20 }).default('medium'),
	confidence: numeric({ precision: 3, scale:  2 }),
	aiModel: varchar("ai_model", { length: 100 }),
	supportingEvidence: jsonb("supporting_evidence").default([]),
	suggestedActions: jsonb("suggested_actions").default([]),
	estimatedImpact: text("estimated_impact"),
	timeframe: varchar({ length: 100 }),
	status: varchar({ length: 20 }).default('pending'),
	tags: jsonb().default([]),
	createdBy: varchar("created_by", { length: 50 }).default('ai-system'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_ai_recommendations_case_confidence").using("btree", table.caseId.asc().nullsLast().op("numeric_ops"), table.confidence.desc().nullsFirst().op("uuid_ops")),
	index("idx_ai_recommendations_case_id").using("btree", table.caseId.asc().nullsLast().op("uuid_ops")),
	index("idx_ai_recommendations_priority").using("btree", table.priority.asc().nullsLast().op("text_ops")),
	index("idx_ai_recommendations_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_ai_recommendations_suggested_actions").using("gin", table.suggestedActions.asc().nullsLast().op("jsonb_ops")),
	index("idx_ai_recommendations_supporting_evidence").using("gin", table.supportingEvidence.asc().nullsLast().op("jsonb_ops")),
	index("idx_ai_recommendations_tags").using("gin", table.tags.asc().nullsLast().op("jsonb_ops")),
	index("idx_ai_recommendations_type").using("btree", table.type.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "ai_recommendations_case_id_fkey"
		}).onDelete("cascade"),
	check("ai_recommendations_confidence_check", sql`(confidence >= (0)::numeric) AND (confidence <= (1)::numeric)`),
]);

export const recommendationRatings = pgTable("recommendation_ratings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	recommendationId: uuid("recommendation_id").notNull(),
	rating: integer(),
	feedback: text(),
	implemented: boolean().default(false),
	userId: uuid("user_id"),
	ratedAt: timestamp("rated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_recommendation_ratings_recommendation_id").using("btree", table.recommendationId.asc().nullsLast().op("uuid_ops")),
	index("idx_recommendation_ratings_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.recommendationId],
			foreignColumns: [aiRecommendations.id],
			name: "recommendation_ratings_recommendation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "recommendation_ratings_user_id_fkey"
		}),
	check("recommendation_ratings_rating_check", sql`(rating >= 1) AND (rating <= 5)`),
]);

export const embeddings = pgTable("embeddings", {
	id: text().default((gen_random_uuid())).primaryKey().notNull(),
	documentId: text("document_id"),
	content: text().notNull(),
	embedding: vector({ dimensions: 1536 }),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [documents.id],
			name: "embeddings_document_id_fkey"
		}).onDelete("cascade"),
]);

export const searchSessions = pgTable("search_sessions", {
	id: text().default((gen_random_uuid())).primaryKey().notNull(),
	query: text().notNull(),
	queryEmbedding: vector("query_embedding", { dimensions: 1536 }),
	results: jsonb(),
	searchType: text("search_type"),
	resultCount: integer("result_count"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const evidenceConnections = pgTable("evidence_connections", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	sourceEvidenceId: uuid("source_evidence_id").notNull(),
	targetEvidenceId: uuid("target_evidence_id").notNull(),
	connectionType: varchar("connection_type", { length: 50 }).notNull(),
	strength: numeric({ precision: 3, scale:  2 }).notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_evidence_connections_metadata_gin").using("gin", table.metadata.asc().nullsLast().op("jsonb_path_ops")),
	index("idx_evidence_connections_source").using("btree", table.sourceEvidenceId.asc().nullsLast().op("uuid_ops"), table.strength.desc().nullsFirst().op("numeric_ops")),
	index("idx_evidence_connections_source_strength").using("btree", table.sourceEvidenceId.asc().nullsLast().op("uuid_ops"), table.strength.desc().nullsFirst().op("uuid_ops")),
	index("idx_evidence_connections_target").using("btree", table.targetEvidenceId.asc().nullsLast().op("numeric_ops"), table.strength.desc().nullsFirst().op("uuid_ops")),
	index("idx_evidence_connections_target_strength").using("btree", table.targetEvidenceId.asc().nullsLast().op("numeric_ops"), table.strength.desc().nullsFirst().op("uuid_ops")),
	index("idx_evidence_connections_type_strength").using("btree", table.connectionType.asc().nullsLast().op("text_ops"), table.strength.desc().nullsFirst().op("numeric_ops")),
	unique("evidence_connections_source_evidence_id_target_evidence_id__key").on(table.sourceEvidenceId, table.targetEvidenceId, table.connectionType),
	check("evidence_connections_strength_check", sql`(strength >= (0)::numeric) AND (strength <= (1)::numeric)`),
]);

export const userSessions = pgTable("user_sessions", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	caseId: uuid("case_id"),
	sessionStart: timestamp("session_start", { withTimezone: true, mode: 'string' }).defaultNow(),
	sessionEnd: timestamp("session_end", { withTimezone: true, mode: 'string' }),
	typingAnalytics: jsonb("typing_analytics"),
	contextualPrompts: jsonb("contextual_prompts"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_sessions_analytics_gin").using("gin", table.typingAnalytics.asc().nullsLast().op("jsonb_path_ops")),
	index("idx_user_sessions_case_start").using("btree", table.caseId.asc().nullsLast().op("uuid_ops"), table.sessionStart.desc().nullsFirst().op("uuid_ops")).where(sql`(case_id IS NOT NULL)`),
	index("idx_user_sessions_user_case").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.caseId.asc().nullsLast().op("timestamptz_ops"), table.sessionStart.desc().nullsFirst().op("uuid_ops")),
]);

export const mcpProcessingQueue = pgTable("mcp_processing_queue", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	jobType: varchar("job_type", { length: 50 }).notNull(),
	priority: integer().default(5),
	payload: jsonb().notNull(),
	status: varchar({ length: 20 }).default('pending'),
	workerId: varchar("worker_id", { length: 50 }),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_mcp_queue_completed").using("btree", table.completedAt.desc().nullsFirst().op("timestamptz_ops")).where(sql`((status)::text = 'completed'::text)`),
	index("idx_mcp_queue_job_type_status").using("btree", table.jobType.asc().nullsLast().op("timestamptz_ops"), table.status.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	index("idx_mcp_queue_status_priority").using("btree", table.status.asc().nullsLast().op("text_ops"), table.priority.desc().nullsFirst().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")).where(sql`((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying])::text[]))`),
	index("idx_mcp_queue_worker_status").using("btree", table.workerId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")).where(sql`((status)::text = 'processing'::text)`),
]);

export const embeddingsCache = pgTable("embeddings_cache", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	contentHash: varchar("content_hash", { length: 64 }).notNull(),
	modelName: varchar("model_name", { length: 100 }).default('embeddinggemma:latest').notNull(),
	embeddingVector: vector("embedding_vector", { dimensions: 768 }),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	lastAccessed: timestamp("last_accessed", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("idx_embeddings_cache_hash_model").using("btree", table.contentHash.asc().nullsLast().op("text_ops"), table.modelName.asc().nullsLast().op("text_ops")),
	index("idx_embeddings_cache_last_accessed").using("btree", table.lastAccessed.asc().nullsLast().op("timestamptz_ops")),
	index("idx_embeddings_cache_model").using("btree", table.modelName.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	index("idx_embeddings_cache_vector_hnsw").using("hnsw", table.embeddingVector.asc().nullsLast().op("vector_cosine_ops")).with({m: "16",ef_construction: "64"}),
	unique("embeddings_cache_content_hash_key").on(table.contentHash),
]);

export const maintenanceLog = pgTable("maintenance_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	operation: varchar({ length: 100 }).notNull(),
	resultCount: integer("result_count"),
	executionTime: interval("execution_time"),
	status: varchar({ length: 20 }).default('success'),
	details: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const context7Documentation = pgTable("context7_documentation", {
	id: serial().primaryKey().notNull(),
	docId: text("doc_id").notNull(),
	libraryId: text("library_id").notNull(),
	libraryName: text("library_name").notNull(),
	topic: text(),
	content: text().notNull(),
	chunkIndex: integer("chunk_index").default(0),
	embedding: vector({ dimensions: 768 }),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_context7_docs_embedding").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")),
	index("idx_context7_docs_library").using("btree", table.libraryId.asc().nullsLast().op("text_ops")),
	index("idx_context7_docs_topic").using("btree", table.topic.asc().nullsLast().op("text_ops")),
	unique("context7_documentation_doc_id_key").on(table.docId),
]);

export const contextSessions = pgTable("context_sessions", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id"),
	sessionId: varchar("session_id", { length: 255 }).notNull(),
	contextData: jsonb("context_data").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_context_sessions_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "context_sessions_user_id_fkey"
		}),
	unique("context_sessions_session_id_key").on(table.sessionId),
]);
export const caseAnalysisReadiness = pgView("case_analysis_readiness", {	id: uuid(),
	caseNumber: varchar("case_number", { length: 50 }),
	title: varchar({ length: 255 }),
	status: varchar({ length: 20 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	evidenceCount: bigint("evidence_count", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	embeddedEvidence: bigint("embedded_evidence", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	analyzedEvidence: bigint("analyzed_evidence", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	connectionCount: bigint("connection_count", { mode: "number" }),
	analysisStatus: text("analysis_status"),
}).as(sql`SELECT c.id, c.case_number, c.title, c.status, count(e.id) AS evidence_count, count( CASE WHEN e.content_embedding IS NOT NULL THEN 1 ELSE NULL::integer END) AS embedded_evidence, count( CASE WHEN e.ai_analysis <> '{}'::jsonb THEN 1 ELSE NULL::integer END) AS analyzed_evidence, count(ec.id) AS connection_count, CASE WHEN count(e.id) = 0 THEN 'no_evidence'::text WHEN count( CASE WHEN e.content_embedding IS NOT NULL THEN 1 ELSE NULL::integer END) = 0 THEN 'no_embeddings'::text WHEN count(ec.id) = 0 THEN 'no_connections'::text ELSE 'ready'::text END AS analysis_status FROM cases c LEFT JOIN evidence e ON c.id = e.case_id LEFT JOIN evidence_connections ec ON e.id = ec.source_evidence_id OR e.id = ec.target_evidence_id GROUP BY c.id, c.case_number, c.title, c.status ORDER BY (count(e.id)) DESC`);