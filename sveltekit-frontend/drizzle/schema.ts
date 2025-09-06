import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, index, foreignKey, unique, date, check, bigint, real, integer, vector, numeric, uniqueIndex, json, bigserial, serial, point, pgView, doublePrecision } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const reports = pgTable("reports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id"),
	title: varchar({ length: 255 }).notNull(),
	content: text(),
	reportType: varchar("report_type", { length: 50 }).default('case_summary'),
	status: varchar({ length: 50 }).default('draft').notNull(),
	isPublic: boolean("is_public").default(false),
	tags: jsonb().default([]).notNull(),
	metadata: jsonb().default({}).notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const caseActivities = pgTable("case_activities", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id").notNull(),
	type: varchar({ length: 100 }).notNull(),
	description: text().notNull(),
	userId: uuid("user_id"),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	metadata: jsonb().default({}),
});

export const caseDocuments = pgTable("case_documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	documentType: varchar("document_type", { length: 100 }).notNull(),
	filePath: varchar("file_path", { length: 500 }),
	fileSize: varchar("file_size", { length: 50 }),
	mimeType: varchar("mime_type", { length: 100 }),
	content: text(),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const legalCases = pgTable("legal_cases", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	caseNumber: varchar("case_number", { length: 255 }).notNull(),
	caseTitle: text("case_title").notNull(),
	caseType: varchar("case_type", { length: 100 }),
	jurisdiction: varchar({ length: 255 }),
	courtName: varchar("court_name", { length: 255 }),
	judgeName: varchar("judge_name", { length: 255 }),
	filingDate: date("filing_date"),
	status: varchar({ length: 50 }).default('active'),
	parties: jsonb().default([]),
	attorneys: jsonb().default([]),
	caseSummary: text("case_summary"),
	tags: varchar({ length: 255 }).array().default([""]),
	assignedTo: uuid("assigned_to"),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table: any) => [
	index("idx_legal_cases_assigned").using("btree", table.assignedTo.asc().nullsLast().op("uuid_ops")),
	index("idx_legal_cases_attorneys").using("gin", table.attorneys.asc().nullsLast().op("jsonb_ops")),
	index("idx_legal_cases_created_by").using("btree", table.createdBy.asc().nullsLast().op("uuid_ops")),
	index("idx_legal_cases_filing_date").using("btree", table.filingDate.asc().nullsLast().op("date_ops")),
	index("idx_legal_cases_number").using("btree", table.caseNumber.asc().nullsLast().op("text_ops")),
	index("idx_legal_cases_parties").using("gin", table.parties.asc().nullsLast().op("jsonb_ops")),
	index("idx_legal_cases_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_legal_cases_tags").using("gin", table.tags.asc().nullsLast().op("array_ops")),
	index("idx_legal_cases_type").using("btree", table.caseType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "legal_cases_assigned_to_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "legal_cases_created_by_fkey"
		}),
	unique("legal_cases_case_number_key").on(table.caseNumber),
]);

export const feedbackMetrics = pgTable("feedback_metrics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	metricName: varchar("metric_name", { length: 255 }),
	metricValue: varchar("metric_value", { length: 255 }),
	context: jsonb().default({}),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const userBehaviorPatterns = pgTable("user_behavior_patterns", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	patternType: varchar("pattern_type", { length: 100 }),
	patternData: jsonb("pattern_data"),
	confidence: varchar({ length: 20 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const userRatings = pgTable("user_ratings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	contentId: uuid("content_id"),
	contentType: varchar("content_type", { length: 100 }),
	rating: varchar({ length: 20 }),
	feedback: text(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const neuralModels = pgTable("neural_models", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	modelName: varchar("model_name", { length: 255 }).notNull(),
	modelVersion: varchar("model_version", { length: 50 }).notNull(),
	modelType: varchar("model_type", { length: 50 }).notNull(),
	architecture: jsonb().notNull(),
	hyperparameters: jsonb().default({}),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	modelSizeBytes: bigint("model_size_bytes", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	parameterCount: bigint("parameter_count", { mode: "number" }),
	modelFilePath: text("model_file_path"),
	checkpointPath: text("checkpoint_path"),
	configFilePath: text("config_file_path"),
	datasetInfo: jsonb("dataset_info").default({}),
	trainingMetrics: jsonb("training_metrics").default({}),
	validationMetrics: jsonb("validation_metrics").default({}),
	inferenceTimeMs: real("inference_time_ms"),
	throughputSamplesSec: real("throughput_samples_sec"),
	gpuMemoryRequired: integer("gpu_memory_required"),
	status: varchar({ length: 20 }).default('training'),
	isActive: boolean("is_active").default(true),
	deploymentEndpoint: text("deployment_endpoint"),
	modelPurpose: text("model_purpose"),
	legalCompliance: jsonb("legal_compliance").default({}),
	biasMetrics: jsonb("bias_metrics").default({}),
	parentModelId: uuid("parent_model_id"),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table: any) => [
	index("idx_neural_models_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_neural_models_created_by").using("btree", table.createdBy.asc().nullsLast().op("uuid_ops")),
	index("idx_neural_models_name").using("btree", table.modelName.asc().nullsLast().op("text_ops")),
	index("idx_neural_models_parent").using("btree", table.parentModelId.asc().nullsLast().op("uuid_ops")),
	index("idx_neural_models_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_neural_models_type").using("btree", table.modelType.asc().nullsLast().op("text_ops")),
	index("idx_neural_models_version").using("btree", table.modelName.asc().nullsLast().op("text_ops"), table.modelVersion.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.parentModelId],
			foreignColumns: [table.id],
			name: "neural_models_parent_model_id_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "neural_models_created_by_fkey"
		}),
	unique("neural_models_model_name_model_version_key").on(table.modelName, table.modelVersion),
	check("neural_models_model_type_check", sql`(model_type)::text = ANY ((ARRAY['autoencoder'::character varying, 'classifier'::character varying, 'embedding'::character varying, 'gan'::character varying, 'transformer'::character varying])::text[])`),
	check("neural_models_status_check", sql`(status)::text = ANY ((ARRAY['training'::character varying, 'trained'::character varying, 'deployed'::character varying, 'deprecated'::character varying, 'archived'::character varying])::text[])`),
]);

export const tensorProcessingJobs = pgTable("tensor_processing_jobs", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	jobName: varchar("job_name", { length: 255 }).notNull(),
	jobType: varchar("job_type", { length: 50 }).notNull(),
	priority: varchar({ length: 20 }).default('normal'),
	userId: uuid("user_id").notNull(),
	sessionId: varchar("session_id", { length: 100 }),
	inputTensors: jsonb("input_tensors").default([]).notNull(),
	processingParameters: jsonb("processing_parameters").default({}),
	outputTensors: jsonb("output_tensors").default([]),
	resultMetadata: jsonb("result_metadata").default({}),
	status: varchar({ length: 20 }).default('pending'),
	progressPercent: integer("progress_percent").default(0),
	queuedAt: timestamp("queued_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	processingTimeMs: integer("processing_time_ms"),
	errorMessage: text("error_message"),
	retryCount: integer("retry_count").default(0),
	maxRetries: integer("max_retries").default(3),
	gpuMemoryUsed: integer("gpu_memory_used"),
	cpuMemoryUsed: integer("cpu_memory_used"),
	gpuUtilization: real("gpu_utilization"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table: any) => [
	index("idx_tensor_jobs_input").using("gin", table.inputTensors.asc().nullsLast().op("jsonb_ops")),
	index("idx_tensor_jobs_output").using("gin", table.outputTensors.asc().nullsLast().op("jsonb_ops")),
	index("idx_tensor_jobs_params").using("gin", table.processingParameters.asc().nullsLast().op("jsonb_ops")),
	index("idx_tensor_jobs_priority").using("btree", table.priority.asc().nullsLast().op("text_ops")),
	index("idx_tensor_jobs_queue").using("btree", table.status.asc().nullsLast().op("text_ops"), table.priority.asc().nullsLast().op("text_ops"), table.queuedAt.asc().nullsLast().op("text_ops")).where(sql`((status)::text = ANY ((ARRAY['pending'::character varying, 'running'::character varying])::text[]))`),
	index("idx_tensor_jobs_queued").using("btree", table.queuedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_tensor_jobs_results").using("gin", table.resultMetadata.asc().nullsLast().op("jsonb_ops")),
	index("idx_tensor_jobs_session").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("idx_tensor_jobs_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_tensor_jobs_type").using("btree", table.jobType.asc().nullsLast().op("text_ops")),
	index("idx_tensor_jobs_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "tensor_processing_jobs_user_id_fkey"
		}),
	check("tensor_processing_jobs_job_type_check", sql`(job_type)::text = ANY ((ARRAY['embedding'::character varying, 'classification'::character varying, 'similarity'::character varying, 'preprocessing'::character varying, 'neural_sprite'::character varying])::text[])`),
	check("tensor_processing_jobs_priority_check", sql`(priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'critical'::character varying])::text[])`),
	check("tensor_processing_jobs_status_check", sql`(status)::text = ANY ((ARRAY['pending'::character varying, 'running'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])`),
	check("tensor_processing_jobs_progress_percent_check", sql`(progress_percent >= 0) AND (progress_percent <= 100)`),
]);

export const modelTrainingHistory = pgTable("model_training_history", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	modelId: uuid("model_id").notNull(),
	experimentName: varchar("experiment_name", { length: 255 }),
	trainingConfig: jsonb("training_config").notNull(),
	epoch: integer().notNull(),
	step: integer().notNull(),
	trainingLoss: real("training_loss"),
	validationLoss: real("validation_loss"),
	trainingAccuracy: real("training_accuracy"),
	validationAccuracy: real("validation_accuracy"),
	customMetrics: jsonb("custom_metrics").default({}),
	trainingTimeSeconds: integer("training_time_seconds"),
	gpuMemoryUsed: integer("gpu_memory_used"),
	checkpointPath: text("checkpoint_path"),
	modelStateHash: varchar("model_state_hash", { length: 64 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table: any) => [
	index("idx_model_training_created").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_model_training_epoch").using("btree", table.modelId.asc().nullsLast().op("int4_ops"), table.epoch.asc().nullsLast().op("int4_ops"), table.step.asc().nullsLast().op("int4_ops")),
	index("idx_model_training_experiment").using("btree", table.experimentName.asc().nullsLast().op("text_ops")),
	index("idx_model_training_model").using("btree", table.modelId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.modelId],
			foreignColumns: [neuralModels.id],
			name: "model_training_history_model_id_fkey"
		}),
]);

export const similaritySearchCache = pgTable("similarity_search_cache", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	queryHash: varchar("query_hash", { length: 64 }).notNull(),
	queryVector: vector("query_vector", { dimensions: 384 }),
	searchParameters: jsonb("search_parameters").default({}),
	results: jsonb().notNull(),
	resultCount: integer("result_count").notNull(),
	searchTimeMs: real("search_time_ms"),
	cacheHit: boolean("cache_hit").default(false),
	accessCount: integer("access_count").default(1),
	lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).default(sql`(now() + '01:00:00'::interval)`),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table: any) => [
	index("idx_similarity_cache_accessed").using("btree", table.lastAccessedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_similarity_cache_expires").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_similarity_cache_hash").using("btree", table.queryHash.asc().nullsLast().op("text_ops")),
	index("idx_similarity_cache_vector_hnsw").using("hnsw", table.queryVector.asc().nullsLast().op("vector_cosine_ops")).with({m: "16",ef_construction: "64"}),
]);

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
});

export const chatSessions = pgTable("chat_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	title: varchar({ length: 500 }).notNull(),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table: any) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_sessions_user_id_fkey"
		}).onDelete("cascade"),
]);

export const shaderCacheEntries = pgTable("shader_cache_entries", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	shaderKey: varchar("shader_key", { length: 255 }).notNull(),
	shaderHash: varchar("shader_hash", { length: 64 }).notNull(),
	shaderType: varchar("shader_type", { length: 50 }).notNull(),
	sourceCode: text("source_code").notNull(),
	shaderLanguage: varchar("shader_language", { length: 20 }).default('wgsl').notNull(),
	shaderVersion: varchar("shader_version", { length: 50 }),
	compiledBinaryPath: text("compiled_binary_path"),
	compiledBinarySize: integer("compiled_binary_size"),
	compilationTime: numeric("compilation_time", { precision: 8, scale:  3 }),
	compilationSuccess: boolean("compilation_success").default(true),
	compilationLog: text("compilation_log"),
	sourceEmbedding: vector("source_embedding", { dimensions: 384 }),
	semanticTags: varchar("semantic_tags", { length: 100 }).array().default([""]),
	legalContext: varchar("legal_context", { length: 100 }),
	visualizationType: varchar("visualization_type", { length: 50 }),
	complexity: integer().default(0),
	performanceMetrics: jsonb("performance_metrics").default({}),
	averageRenderTime: numeric("average_render_time", { precision: 8, scale:  3 }),
	memoryFootprint: integer("memory_footprint"),
	gpuUtilization: numeric("gpu_utilization", { precision: 5, scale:  4 }),
	reinforcementData: jsonb("reinforcement_data").default({}),
	accessCount: integer("access_count").default(0),
	successRate: numeric("success_rate", { precision: 5, scale:  4 }).default('0.5'),
	rewardHistory: jsonb("reward_history").default([]),
	userTags: varchar("user_tags", { length: 100 }).array().default([""]),
	dependencies: jsonb().default([]),
	shaderParameters: jsonb("shader_parameters").default({}),
	assetBundle: jsonb("asset_bundle").default({}),
	version: integer().default(1),
	deprecated: boolean().default(false),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true, mode: 'string' }),
}, (table: any) => [
	index("idx_shader_cache_access_count").using("btree", table.accessCount.asc().nullsLast().op("int4_ops")),
	index("idx_shader_cache_context").using("btree", table.legalContext.asc().nullsLast().op("text_ops")),
	index("idx_shader_cache_dependencies").using("gin", table.dependencies.asc().nullsLast().op("jsonb_ops")),
	index("idx_shader_cache_hash").using("btree", table.shaderHash.asc().nullsLast().op("text_ops")),
	index("idx_shader_cache_key").using("btree", table.shaderKey.asc().nullsLast().op("text_ops")),
	index("idx_shader_cache_last_accessed").using("btree", table.lastAccessedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_shader_cache_parameters").using("gin", table.shaderParameters.asc().nullsLast().op("jsonb_ops")),
	index("idx_shader_cache_performance").using("gin", table.performanceMetrics.asc().nullsLast().op("jsonb_ops")),
	index("idx_shader_cache_reinforcement").using("gin", table.reinforcementData.asc().nullsLast().op("jsonb_ops")),
	index("idx_shader_cache_semantic_tags").using("gin", table.semanticTags.asc().nullsLast().op("array_ops")),
	index("idx_shader_cache_success_rate").using("btree", table.successRate.asc().nullsLast().op("numeric_ops")),
	index("idx_shader_cache_type").using("btree", table.shaderType.asc().nullsLast().op("text_ops")),
	index("idx_shader_cache_user_tags").using("gin", table.userTags.asc().nullsLast().op("array_ops")),
	index("idx_shader_cache_visualization").using("btree", table.visualizationType.asc().nullsLast().op("text_ops")),
	index("idx_shader_source_embedding_hnsw").using("hnsw", table.sourceEmbedding.asc().nullsLast().op("vector_cosine_ops")).with({m: "16",ef_construction: "64"}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "shader_cache_entries_created_by_fkey"
		}),
	unique("shader_cache_entries_shader_key_key").on(table.shaderKey),
	unique("shader_cache_entries_shader_hash_key").on(table.shaderHash),
	check("shader_cache_entries_shader_type_check", sql`(shader_type)::text = ANY ((ARRAY['vertex'::character varying, 'fragment'::character varying, 'compute'::character varying, 'geometry'::character varying, 'wgsl'::character varying, 'glsl'::character varying])::text[])`),
	check("shader_cache_entries_complexity_check", sql`(complexity >= 0) AND (complexity <= 100)`),
	check("shader_cache_entries_gpu_utilization_check", sql`(gpu_utilization >= (0)::numeric) AND (gpu_utilization <= (1)::numeric)`),
]);

export const shaderUserPatterns = pgTable("shader_user_patterns", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	sessionId: varchar("session_id", { length: 100 }).notNull(),
	clientFingerprint: text("client_fingerprint"),
	shaderCacheId: uuid("shader_cache_id").notNull(),
	shaderKey: varchar("shader_key", { length: 255 }).notNull(),
	workflowStep: varchar("workflow_step", { length: 50 }),
	previousStep: varchar("previous_step", { length: 50 }),
	nextStepPrediction: varchar("next_step_prediction", { length: 50 }),
	workflowSequence: jsonb("workflow_sequence").default([]),
	accessTimestamp: timestamp("access_timestamp", { withTimezone: true, mode: 'string' }).defaultNow(),
	timeOfDay: integer("time_of_day"),
	dayOfWeek: integer("day_of_week"),
	sessionDuration: integer("session_duration"),
	loadLatencyMs: integer("load_latency_ms"),
	cacheHit: boolean("cache_hit"),
	preloadSuccessful: boolean("preload_successful"),
	userSatisfaction: numeric("user_satisfaction", { precision: 3, scale:  2 }),
	documentContext: jsonb("document_context").default({}),
	caseComplexity: integer("case_complexity"),
	dataSize: integer("data_size"),
	stateVector: vector("state_vector", { dimensions: 64 }),
	actionVector: vector("action_vector", { dimensions: 32 }),
	reward: numeric({ precision: 7, scale:  4 }),
	predictionMetadata: jsonb("prediction_metadata").default({}),
	actualOutcome: jsonb("actual_outcome").default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table: any) => [
	index("idx_shader_patterns_action_vector").using("hnsw", table.actionVector.asc().nullsLast().op("vector_cosine_ops")).with({m: "16",ef_construction: "64"}),
	index("idx_shader_patterns_cache_hit").using("btree", table.cacheHit.asc().nullsLast().op("bool_ops")),
	index("idx_shader_patterns_latency").using("btree", table.loadLatencyMs.asc().nullsLast().op("int4_ops")),
	index("idx_shader_patterns_reward").using("btree", table.reward.asc().nullsLast().op("numeric_ops")),
	index("idx_shader_patterns_session").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("idx_shader_patterns_shader").using("btree", table.shaderCacheId.asc().nullsLast().op("uuid_ops")),
	index("idx_shader_patterns_state_vector").using("hnsw", table.stateVector.asc().nullsLast().op("vector_cosine_ops")).with({m: "16",ef_construction: "64"}),
	index("idx_shader_patterns_time").using("btree", table.accessTimestamp.asc().nullsLast().op("timestamptz_ops")),
	index("idx_shader_patterns_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_shader_patterns_workflow").using("btree", table.workflowStep.asc().nullsLast().op("text_ops")),
	index("idx_shader_patterns_workflow_prediction").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.workflowStep.asc().nullsLast().op("timestamptz_ops"), table.accessTimestamp.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "shader_user_patterns_user_id_fkey"
		}),
	foreignKey({
			columns: [table.shaderCacheId],
			foreignColumns: [shaderCacheEntries.id],
			name: "shader_user_patterns_shader_cache_id_fkey"
		}),
	check("shader_user_patterns_time_of_day_check", sql`(time_of_day >= 0) AND (time_of_day <= 23)`),
	check("shader_user_patterns_day_of_week_check", sql`(day_of_week >= 0) AND (day_of_week <= 6)`),
	check("shader_user_patterns_user_satisfaction_check", sql`(user_satisfaction >= ('-1'::integer)::numeric) AND (user_satisfaction <= (1)::numeric)`),
	check("shader_user_patterns_case_complexity_check", sql`(case_complexity >= 1) AND (case_complexity <= 10)`),
]);

export const shaderPreloadRules = pgTable("shader_preload_rules", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	ruleKey: varchar("rule_key", { length: 255 }).notNull(),
	ruleName: varchar("rule_name", { length: 255 }).notNull(),
	ruleType: varchar("rule_type", { length: 50 }).notNull(),
	triggerConditions: jsonb("trigger_conditions").default({}).notNull(),
	preloadTargets: jsonb("preload_targets").default([]).notNull(),
	modelWeights: vector("model_weights", { dimensions: 128 }),
	confidence: numeric({ precision: 5, scale:  4 }).notNull(),
	accuracy: numeric({ precision: 5, scale:  4 }).notNull(),
	triggerCount: integer("trigger_count").default(0),
	successCount: integer("success_count").default(0),
	preloadSavingsMs: integer("preload_savings_ms").default(0),
	active: boolean().default(true),
	learningRate: numeric("learning_rate", { precision: 6, scale:  4 }).default('0.0100'),
	lastTriggered: timestamp("last_triggered", { withTimezone: true, mode: 'string' }),
	lastUpdated: timestamp("last_updated", { withTimezone: true, mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table: any) => [
	index("idx_preload_rules_accuracy").using("btree", table.accuracy.asc().nullsLast().op("numeric_ops")),
	index("idx_preload_rules_active").using("btree", table.active.asc().nullsLast().op("bool_ops")),
	index("idx_preload_rules_conditions").using("gin", table.triggerConditions.asc().nullsLast().op("jsonb_ops")),
	index("idx_preload_rules_confidence").using("btree", table.confidence.asc().nullsLast().op("numeric_ops")),
	index("idx_preload_rules_key").using("btree", table.ruleKey.asc().nullsLast().op("text_ops")),
	index("idx_preload_rules_last_triggered").using("btree", table.lastTriggered.asc().nullsLast().op("timestamptz_ops")),
	index("idx_preload_rules_model_weights").using("hnsw", table.modelWeights.asc().nullsLast().op("vector_cosine_ops")).with({m: "16",ef_construction: "64"}),
	index("idx_preload_rules_targets").using("gin", table.preloadTargets.asc().nullsLast().op("jsonb_ops")),
	index("idx_preload_rules_trigger_count").using("btree", table.triggerCount.asc().nullsLast().op("int4_ops")),
	index("idx_preload_rules_type").using("btree", table.ruleType.asc().nullsLast().op("text_ops")),
	unique("shader_preload_rules_rule_key_key").on(table.ruleKey),
	check("shader_preload_rules_rule_type_check", sql`(rule_type)::text = ANY ((ARRAY['sequential'::character varying, 'conditional'::character varying, 'temporal'::character varying, 'similarity'::character varying, 'user_pattern'::character varying])::text[])`),
	check("shader_preload_rules_confidence_check", sql`(confidence >= (0)::numeric) AND (confidence <= (1)::numeric)`),
	check("shader_preload_rules_accuracy_check", sql`(accuracy >= (0)::numeric) AND (accuracy <= (1)::numeric)`),
]);

export const shaderDependencies = pgTable("shader_dependencies", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	parentShaderId: uuid("parent_shader_id").notNull(),
	childShaderId: uuid("child_shader_id").notNull(),
	dependencyType: varchar("dependency_type", { length: 30 }).notNull(),
	dependencyStrength: numeric("dependency_strength", { precision: 5, scale:  4 }),
	loadOrder: integer("load_order").default(100),
	parallelLoadSafe: boolean("parallel_load_safe").default(true),
	loadLatencyImpactMs: integer("load_latency_impact_ms"),
	coUsageFrequency: numeric("co_usage_frequency", { precision: 5, scale:  4 }),
	lastCoUsed: timestamp("last_co_used", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table: any) => [
	index("idx_shader_deps_child").using("btree", table.childShaderId.asc().nullsLast().op("uuid_ops")),
	index("idx_shader_deps_frequency").using("btree", table.coUsageFrequency.asc().nullsLast().op("numeric_ops")),
	index("idx_shader_deps_load_order").using("btree", table.loadOrder.asc().nullsLast().op("int4_ops")),
	index("idx_shader_deps_parent").using("btree", table.parentShaderId.asc().nullsLast().op("uuid_ops")),
	index("idx_shader_deps_strength").using("btree", table.dependencyStrength.asc().nullsLast().op("numeric_ops")),
	index("idx_shader_deps_type").using("btree", table.dependencyType.asc().nullsLast().op("text_ops")),
	uniqueIndex("idx_shader_deps_unique").using("btree", table.parentShaderId.asc().nullsLast().op("uuid_ops"), table.childShaderId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.parentShaderId],
			foreignColumns: [shaderCacheEntries.id],
			name: "shader_dependencies_parent_shader_id_fkey"
		}),
	foreignKey({
			columns: [table.childShaderId],
			foreignColumns: [shaderCacheEntries.id],
			name: "shader_dependencies_child_shader_id_fkey"
		}),
	check("no_self_dependency", sql`parent_shader_id <> child_shader_id`),
	check("shader_dependencies_dependency_type_check", sql`(dependency_type)::text = ANY ((ARRAY['include'::character varying, 'texture'::character varying, 'uniform'::character varying, 'buffer'::character varying, 'function'::character varying])::text[])`),
	check("shader_dependencies_dependency_strength_check", sql`(dependency_strength >= (0)::numeric) AND (dependency_strength <= (1)::numeric)`),
]);

export const shaderCompilationQueue = pgTable("shader_compilation_queue", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	queueKey: varchar("queue_key", { length: 255 }).notNull(),
	priority: varchar({ length: 20 }).default('normal').notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	shaderKey: varchar("shader_key", { length: 255 }).notNull(),
	sourceCode: text("source_code").notNull(),
	shaderType: varchar("shader_type", { length: 50 }).notNull(),
	targetGpu: varchar("target_gpu", { length: 100 }),
	compilationFlags: jsonb("compilation_flags").default({}),
	userId: uuid("user_id"),
	sessionId: varchar("session_id", { length: 100 }),
	workflowContext: jsonb("workflow_context").default({}),
	queuedAt: timestamp("queued_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	compilationResult: jsonb("compilation_result").default({}),
	retryCount: integer("retry_count").default(0),
	maxRetries: integer("max_retries").default(3),
	nextRetryAt: timestamp("next_retry_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table: any) => [
	index("idx_compilation_queue_key").using("btree", table.queueKey.asc().nullsLast().op("text_ops")),
	index("idx_compilation_queue_pending").using("btree", table.status.asc().nullsLast().op("text_ops"), table.priority.asc().nullsLast().op("timestamptz_ops"), table.queuedAt.asc().nullsLast().op("text_ops")).where(sql`((status)::text = 'pending'::text)`),
	index("idx_compilation_queue_priority").using("btree", table.priority.asc().nullsLast().op("text_ops")),
	index("idx_compilation_queue_processing").using("btree", table.status.asc().nullsLast().op("text_ops"), table.priority.asc().nullsLast().op("text_ops"), table.queuedAt.asc().nullsLast().op("text_ops")),
	index("idx_compilation_queue_queued_at").using("btree", table.queuedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_compilation_queue_retry").using("btree", table.nextRetryAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_compilation_queue_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_compilation_queue_user_session").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.sessionId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "shader_compilation_queue_user_id_fkey"
		}),
	unique("shader_compilation_queue_queue_key_key").on(table.queueKey),
	check("shader_compilation_queue_priority_check", sql`(priority)::text = ANY ((ARRAY['immediate'::character varying, 'high'::character varying, 'normal'::character varying, 'low'::character varying, 'preload'::character varying])::text[])`),
	check("shader_compilation_queue_status_check", sql`(status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])`),
]);

export const searchIndex = pgTable("search_index", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	entityType: varchar("entity_type", { length: 50 }).notNull(),
	entityId: uuid("entity_id").notNull(),
	content: text().notNull(),
	embedding: vector({ dimensions: 1536 }),
	metadata: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table: any) => [
	index("search_index_embedding_idx").using("ivfflat", table.embedding.asc().nullsLast().op("vector_cosine_ops")),
]);

export const embeddingJobs = pgTable("embedding_jobs", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	jobId: text("job_id"),
	type: text(),
	status: text(),
	inputData: text("input_data"),
	result: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table: any) => [
	uniqueIndex("idx_embedding_jobs_job_id").using("btree", table.jobId.asc().nullsLast().op("text_ops")),
]);

export const chatMessages = pgTable("chat_messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: uuid("session_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: varchar({ length: 20 }).notNull(),
	content: text().notNull(),
	clientMessageId: varchar("client_message_id", { length: 255 }),
	contentEmbedding: vector("content_embedding", { dimensions: 384 }),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table: any) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [chatSessions.id],
			name: "chat_messages_session_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_messages_user_id_fkey"
		}).onDelete("cascade"),
	check("chat_messages_role_check", sql`(role)::text = ANY ((ARRAY['user'::character varying, 'assistant'::character varying, 'system'::character varying])::text[])`),
]);

export const shaderPreloadQueue = pgTable("shader_preload_queue", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	shaderCacheId: uuid("shader_cache_id").notNull(),
	predictionConfidence: numeric("prediction_confidence", { precision: 5, scale:  4 }).notNull(),
	predictedAt: timestamp("predicted_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	predictionModel: varchar("prediction_model", { length: 50 }),
	currentWorkflowStep: varchar("current_workflow_step", { length: 50 }),
	userSessionContext: jsonb("user_session_context").default({}),
	legalCaseContext: jsonb("legal_case_context").default({}),
	preloadPriority: integer("preload_priority").default(50),
	scheduledFor: timestamp("scheduled_for", { withTimezone: true, mode: 'string' }),
	status: varchar({ length: 20 }).default('pending'),
	preloadStartedAt: timestamp("preload_started_at", { withTimezone: true, mode: 'string' }),
	preloadCompletedAt: timestamp("preload_completed_at", { withTimezone: true, mode: 'string' }),
	wasUsed: boolean("was_used"),
	usedAt: timestamp("used_at", { withTimezone: true, mode: 'string' }),
	actualDelay: integer("actual_delay"),
	metadata: jsonb().default({}),
}, (table: any) => [
	index("idx_preload_queue_accuracy_tracking").using("btree", table.wasUsed.asc().nullsLast().op("text_ops"), table.predictionModel.asc().nullsLast().op("text_ops")),
	index("idx_preload_queue_confidence").using("btree", table.predictionConfidence.asc().nullsLast().op("numeric_ops")),
	index("idx_preload_queue_priority").using("btree", table.preloadPriority.asc().nullsLast().op("int4_ops")),
	index("idx_preload_queue_processing").using("btree", table.status.asc().nullsLast().op("text_ops"), table.scheduledFor.asc().nullsLast().op("int4_ops"), table.preloadPriority.asc().nullsLast().op("text_ops")),
	index("idx_preload_queue_scheduled").using("btree", table.scheduledFor.asc().nullsLast().op("timestamptz_ops")),
	index("idx_preload_queue_shader").using("btree", table.shaderCacheId.asc().nullsLast().op("uuid_ops")),
	index("idx_preload_queue_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_preload_queue_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "shader_preload_queue_user_id_fkey"
		}),
	foreignKey({
			columns: [table.shaderCacheId],
			foreignColumns: [shaderCacheEntries.id],
			name: "shader_preload_queue_shader_cache_id_fkey"
		}),
	check("shader_preload_queue_prediction_confidence_check", sql`(prediction_confidence >= (0)::numeric) AND (prediction_confidence <= (1)::numeric)`),
	check("shader_preload_queue_preload_priority_check", sql`(preload_priority >= 0) AND (preload_priority <= 100)`),
	check("shader_preload_queue_status_check", sql`(status)::text = ANY ((ARRAY['pending'::character varying, 'loading'::character varying, 'loaded'::character varying, 'expired'::character varying, 'cancelled'::character varying])::text[])`),
]);

export const cases = pgTable("cases", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	title: varchar({ length: 500 }).notNull(),
	description: text(),
	caseNumber: varchar("case_number", { length: 100 }),
	status: varchar({ length: 50 }).default('active').notNull(),
	priority: varchar({ length: 20 }).default('medium').notNull(),
	practiceArea: varchar("practice_area", { length: 100 }),
	jurisdiction: varchar({ length: 100 }),
	court: varchar({ length: 200 }),
	clientName: varchar("client_name", { length: 200 }),
	opposingParty: varchar("opposing_party", { length: 200 }),
	assignedAttorney: uuid("assigned_attorney"),
	filingDate: timestamp("filing_date", { withTimezone: true, mode: 'string' }),
	dueDate: timestamp("due_date", { withTimezone: true, mode: 'string' }),
	closedDate: timestamp("closed_date", { withTimezone: true, mode: 'string' }),
	caseEmbedding: vector("case_embedding", { dimensions: 384 }),
	qdrantId: uuid("qdrant_id"),
	qdrantCollection: varchar("qdrant_collection", { length: 100 }).default('cases'),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table: any) => [
	index("cases_assigned_attorney_idx").using("btree", table.assignedAttorney.asc().nullsLast().op("uuid_ops")),
	index("cases_case_embedding_hnsw_idx").using("hnsw", table.caseEmbedding.asc().nullsLast().op("vector_cosine_ops")).with({m: "16",ef_construction: "64"}),
	uniqueIndex("cases_case_number_idx").using("btree", table.caseNumber.asc().nullsLast().op("text_ops")),
	index("cases_practice_area_idx").using("btree", table.practiceArea.asc().nullsLast().op("text_ops")),
	index("cases_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.assignedAttorney],
			foreignColumns: [users.id],
			name: "cases_assigned_attorney_fkey"
		}),
	unique("cases_case_number_key").on(table.caseNumber),
]);

export const legalDocuments = pgTable("legal_documents", {
	id: serial().primaryKey().notNull(),
	filename: varchar({ length: 255 }).notNull(),
	originalPath: text("original_path"),
	s3Bucket: varchar("s3_bucket", { length: 100 }),
	s3Key: text("s3_key"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fileSize: bigint("file_size", { mode: "number" }),
	mimeType: varchar("mime_type", { length: 100 }),
	uploadDate: timestamp("upload_date", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	documentType: varchar("document_type", { length: 50 }),
	title: text(),
	contentPreview: text("content_preview"),
	fullText: text("full_text"),
	metadata: jsonb(),
	processingStatus: varchar("processing_status", { length: 20 }).default('uploaded'),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	evidenceId: uuid("evidence_id"),
	createdBy: uuid("created_by"),
	embedding: vector({ dimensions: 384 }),
}, (table: any) => [
	index("idx_legal_documents_embedding_cosine").using("ivfflat", table.embedding.asc().nullsLast().op("vector_cosine_ops")).with({lists: "100"}),
	index("idx_legal_documents_embedding_hnsw").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")).with({m: "16",ef_construction: "64"}),
	index("idx_legal_documents_title").using("btree", table.title.asc().nullsLast().op("text_ops")),
	index("idx_legal_documents_type").using("btree", table.documentType.asc().nullsLast().op("text_ops")),
	index("idx_legal_documents_vector").using("ivfflat", table.embedding.asc().nullsLast().op("vector_cosine_ops")).with({lists: "100"}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "legal_documents_created_by_fkey"
		}),
	foreignKey({
			columns: [table.evidenceId],
			foreignColumns: [evidence.id],
			name: "legal_documents_evidence_id_fkey"
		}).onDelete("cascade"),
]);

export const vectorMetadata = pgTable("vector_metadata", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	documentId: uuid("document_id").notNull(),
	collectionName: varchar("collection_name", { length: 100 }).notNull(),
	metadata: jsonb().default({}).notNull(),
	contentHash: text("content_hash").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table: any) => [
	index("vector_metadata_document_id_idx").using("btree", table.documentId.asc().nullsLast().op("uuid_ops")),
]);

export const documentSections = pgTable("document_sections", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	documentId: integer("document_id"),
	sectionIndex: integer("section_index").default(0).notNull(),
	title: text(),
	content: text().notNull(),
	embedding: vector({ dimensions: 384 }),
	contentTokens: integer("content_tokens"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table: any) => [
	index("idx_document_sections_document_id").using("btree", table.documentId.asc().nullsLast().op("int4_ops")),
	index("idx_document_sections_embedding").using("ivfflat", table.embedding.asc().nullsLast().op("vector_cosine_ops")).with({lists: "100"}),
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [legalDocuments.id],
			name: "document_sections_document_id_fkey"
		}).onDelete("cascade"),
]);

export const qdrantCollections = pgTable("qdrant_collections", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	vectorSize: integer("vector_size").default(384).notNull(),
	distance: varchar({ length: 20 }).default('Cosine').notNull(),
	status: varchar({ length: 20 }).default('active').notNull(),
	isOptimized: boolean("is_optimized").default(false).notNull(),
	pointsCount: integer("points_count").default(0).notNull(),
	lastSynced: timestamp("last_synced", { withTimezone: true, mode: 'string' }),
	config: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table: any) => [
	uniqueIndex("qdrant_collections_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("qdrant_collections_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	unique("qdrant_collections_name_key").on(table.name),
]);

export const caseTimeline = pgTable("case_timeline", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id").notNull(),
	event: varchar({ length: 255 }).notNull(),
	description: text(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	type: varchar({ length: 50 }).default('event'),
	metadata: jsonb().default({}),
});

export const interactionHistory = pgTable("interaction_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	action: varchar({ length: 255 }),
	context: jsonb().default({}),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const trainingData = pgTable("training_data", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sourceType: varchar("source_type", { length: 100 }),
	data: jsonb(),
	labels: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const users = pgTable("users", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	hashedPassword: varchar("hashed_password", { length: 255 }),
	username: varchar({ length: 100 }),
	firstName: varchar("first_name", { length: 100 }),
	lastName: varchar("last_name", { length: 100 }),
	role: varchar({ length: 50 }).default('user').notNull(),
	department: varchar({ length: 100 }),
	jurisdiction: varchar({ length: 100 }),
	permissions: jsonb().default([]).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	avatarUrl: varchar("avatar_url", { length: 500 }),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
	practiceAreas: jsonb("practice_areas").default([]),
	barNumber: varchar("bar_number", { length: 50 }),
	firmName: varchar("firm_name", { length: 200 }),
	profileEmbedding: vector("profile_embedding", { dimensions: 384 }),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table: any) => [
	index("idx_users_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("idx_users_role").using("btree", table.role.asc().nullsLast().op("text_ops")),
	index("idx_users_username").using("btree", table.username.asc().nullsLast().op("text_ops")),
	index("users_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("users_profile_embedding_hnsw_idx").using("hnsw", table.profileEmbedding.asc().nullsLast().op("vector_cosine_ops")).with({m: "16",ef_construction: "64"}),
	index("users_role_idx").using("btree", table.role.asc().nullsLast().op("text_ops")),
	index("users_username_idx").using("btree", table.username.asc().nullsLast().op("text_ops")),
	unique("users_email_key").on(table.email),
]);

export const sessions = pgTable("sessions", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	sessionContext: jsonb("session_context").default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table: any) => [
	index("sessions_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index("sessions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_fkey"
		}).onDelete("cascade"),
]);

export const vectorOperations = pgTable("vector_operations", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	operationType: varchar("operation_type", { length: 50 }).notNull(),
	entityType: varchar("entity_type", { length: 50 }).notNull(),
	entityId: uuid("entity_id").notNull(),
	modelName: varchar("model_name", { length: 100 }).default('nomic-embed-text').notNull(),
	dimensions: integer().default(384).notNull(),
	similarity: varchar({ length: 20 }).default('cosine'),
	processingTimeMs: integer("processing_time_ms"),
	similarityScore: real("similarity_score"),
	qdrantSynced: boolean("qdrant_synced").default(false).notNull(),
	qdrantSyncedAt: timestamp("qdrant_synced_at", { withTimezone: true, mode: 'string' }),
	qdrantError: text("qdrant_error"),
	status: varchar({ length: 20 }).default('pending').notNull(),
	metadata: jsonb().default({}),
	error: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
}, (table: any) => [
	index("vector_operations_entity_id_idx").using("btree", table.entityId.asc().nullsLast().op("uuid_ops")),
	index("vector_operations_entity_type_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops")),
	index("vector_operations_operation_type_idx").using("btree", table.operationType.asc().nullsLast().op("text_ops")),
	index("vector_operations_qdrant_synced_idx").using("btree", table.qdrantSynced.asc().nullsLast().op("bool_ops")),
	index("vector_operations_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const somClusters = pgTable("som_clusters", {
	id: text().default((gen_random_uuid())).primaryKey().notNull(),
	clusterId: text("cluster_id").notNull(),
	nodePosition: point("node_position").notNull(),
	weights: vector({ dimensions: 768 }).notNull(),
	patternCount: integer("pattern_count").default(0),
	activationCount: integer("activation_count").default(0),
	lastActivation: timestamp("last_activation", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	associatedDocuments: text("associated_documents").array().default(["RAY"]),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const recommendationPatterns = pgTable("recommendation_patterns", {
	id: text().default((gen_random_uuid())).primaryKey().notNull(),
	userId: text("user_id").notNull(),
	patternFeatures: vector("pattern_features", { dimensions: 50 }).notNull(),
	somNodeId: text("som_node_id"),
	patternMetadata: jsonb("pattern_metadata").default({}),
	successRating: numeric("success_rating", { precision: 3, scale:  2 }).default('0.5'),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const generatedGlyphs = pgTable("generated_glyphs", {
	id: text().default((gen_random_uuid())).primaryKey().notNull(),
	evidenceId: text("evidence_id").notNull(),
	prompt: text().notNull(),
	style: text().notNull(),
	dimensions: integer().array().notNull(),
	imageUrl: text("image_url"),
	// TODO: failed to parse database type 'bytea'
	tensorData: unknown("tensor_data"),
	metadata: jsonb().default({}),
	generationTimeMs: integer("generation_time_ms"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const userSessions = pgTable("user_sessions", {
	id: text().default((gen_random_uuid())).primaryKey().notNull(),
	userId: text("user_id").notNull(),
	sessionId: text("session_id").notNull(),
	operationType: text("operation_type").notNull(),
	queryText: text("query_text"),
	resultsCount: integer("results_count").default(0),
	processingTimeMs: integer("processing_time_ms").default(0),
	confidenceScore: numeric("confidence_score", { precision: 5, scale:  3 }).default('0'),
	componentsUsed: text("components_used").array().default(["RAY"]),
	feedbackScore: integer("feedback_score"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table: any) => [
	index("idx_user_sessions_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	check("user_sessions_feedback_score_check", sql`feedback_score = ANY (ARRAY['-1'::integer, 0, 1])`),
]);

export const systemPerformance = pgTable("system_performance", {
	id: text().default((gen_random_uuid())).primaryKey().notNull(),
	componentName: text("component_name").notNull(),
	operationType: text("operation_type").notNull(),
	processingTimeMs: integer("processing_time_ms").notNull(),
	memoryUsageMb: integer("memory_usage_mb"),
	gpuUtilization: numeric("gpu_utilization", { precision: 5, scale:  2 }),
	cacheHitRatio: numeric("cache_hit_ratio", { precision: 5, scale:  3 }),
	errorCount: integer("error_count").default(0),
	recordedAt: timestamp("recorded_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

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
});

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

export const documentChunks = pgTable("document_chunks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	documentId: uuid("document_id").notNull(),
	documentType: varchar("document_type", { length: 50 }).notNull(),
	chunkIndex: integer("chunk_index").notNull(),
	content: text().notNull(),
	embedding: vector({ dimensions: 768 }).notNull(),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table: any) => [
	index("document_chunks_document_id_idx").using("btree", table.documentId.asc().nullsLast().op("uuid_ops")),
	index("document_chunks_embedding_hnsw_idx").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")),
	index("idx_document_chunks_document_id").using("btree", table.documentId.asc().nullsLast().op("uuid_ops")),
	index("idx_document_chunks_embedding_hnsw").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")).with({m: "16",ef_construction: "64"}),
	index("idx_document_chunks_index").using("btree", table.documentId.asc().nullsLast().op("uuid_ops"), table.chunkIndex.asc().nullsLast().op("int4_ops")),
]);

export const embeddingCache = pgTable("embedding_cache", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	textHash: text("text_hash").notNull(),
	embedding: vector({ dimensions: 768 }).notNull(),
	model: varchar({ length: 100 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table: any) => [
	index("embedding_cache_embedding_hnsw_idx").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")),
	index("idx_embedding_cache_vector").using("ivfflat", table.embedding.asc().nullsLast().op("vector_cosine_ops")).with({lists: "100"}),
]);

export const evidence = pgTable("evidence", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	caseId: uuid("case_id"),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	evidenceType: varchar("evidence_type", { length: 50 }).notNull(),
	fileUrl: text("file_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	userId: uuid("user_id"),
	titleEmbedding: vector("title_embedding", { dimensions: 384 }),
	contentEmbedding: vector("content_embedding", { dimensions: 384 }),
	subType: varchar("sub_type", { length: 50 }),
	fileName: varchar("file_name", { length: 255 }),
	fileSize: integer("file_size"),
	mimeType: varchar("mime_type", { length: 100 }),
	hash: varchar({ length: 128 }),
	collectedAt: timestamp("collected_at", { mode: 'string' }),
	collectedBy: varchar("collected_by", { length: 255 }),
	location: varchar({ length: 255 }),
	chainOfCustody: jsonb("chain_of_custody").default([]),
	tags: jsonb().default([]).notNull(),
	isAdmissible: boolean("is_admissible").default(true),
	confidentialityLevel: varchar("confidentiality_level", { length: 50 }).default('internal'),
	aiAnalysis: jsonb("ai_analysis").default({}),
	aiTags: jsonb("ai_tags").default([]),
	aiSummary: text("ai_summary"),
	summary: text(),
	summaryType: varchar("summary_type", { length: 50 }),
	boardPosition: jsonb("board_position").default({}),
	fileType: varchar("file_type", { length: 100 }),
	uploadedAt: timestamp("uploaded_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	embedding: vector({ dimensions: 384 }),
	contentText: text("content_text"),
	metadata: jsonb().default({}),
	filePath: varchar("file_path", { length: 500 }),
	titleEmbeddingVector: vector("title_embedding_vector", { dimensions: 384 }),
	contentEmbeddingVector: vector("content_embedding_vector", { dimensions: 384 }),
}, (table: any) => [
	index("evidence_case_id_idx").using("btree", table.caseId.asc().nullsLast().op("uuid_ops")),
	index("evidence_tags_gin_idx").using("gin", table.tags.asc().nullsLast().op("jsonb_ops")),
	index("idx_evidence_content_embedding_hnsw").using("hnsw", table.contentEmbedding.asc().nullsLast().op("vector_cosine_ops")).where(sql`(content_embedding IS NOT NULL)`),
	index("idx_evidence_embedding_hnsw").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")).where(sql`(embedding IS NOT NULL)`),
	index("idx_evidence_file_path").using("btree", table.filePath.asc().nullsLast().op("text_ops")),
	index("idx_evidence_title_embedding_hnsw").using("hnsw", table.titleEmbedding.asc().nullsLast().op("vector_cosine_ops")).where(sql`(title_embedding IS NOT NULL)`),
]);

export const drizzleMigrations = pgTable("__drizzle_migrations__", {
	id: serial().primaryKey().notNull(),
	hash: text().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }),
});

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
});

export const keys = pgTable("keys", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	hashedPassword: varchar("hashed_password", { length: 255 }),
	providerId: varchar("provider_id", { length: 255 }),

	providerUserId: varchar("provider_user_id", { length: 255 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

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

export const ragSessions = pgTable("rag_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: varchar("session_id", { length: 255 }).notNull(),
	userId: uuid("user_id"),
	title: varchar({ length: 255 }),
	model: varchar({ length: 100 }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
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
});

export const userProfiles = pgTable("user_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	bio: text(),
	phone: varchar({ length: 20 }),
	address: text(),
	preferences: jsonb().default({}).notNull(),
	permissions: jsonb().default([]).notNull(),
	specializations: jsonb().default([]).notNull(),
	certifications: jsonb().default([]).notNull(),
	experienceLevel: varchar("experience_level", { length: 20 }).default('junior'),
	workPatterns: jsonb("work_patterns").default({}).notNull(),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});
export const neuralModelPerformance = pgView("neural_model_performance", {	id: uuid(),
	modelName: varchar("model_name", { length: 255 }),
	modelVersion: varchar("model_version", { length: 50 }),
	modelType: varchar("model_type", { length: 50 }),
	inferenceTimeMs: real("inference_time_ms"),
	throughputSamplesSec: real("throughput_samples_sec"),
	avgValidationAccuracy: doublePrecision("avg_validation_accuracy"),
	bestValidationAccuracy: real("best_validation_accuracy"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	trainingCheckpoints: bigint("training_checkpoints", { mode: "number" }),
}).as(sql`SELECT m.id, m.model_name, m.model_version, m.model_type, m.inference_time_ms, m.throughput_samples_sec, avg(h.validation_accuracy) AS avg_validation_accuracy, max(h.validation_accuracy) AS best_validation_accuracy, count(h.id) AS training_checkpoints FROM neural_models m LEFT JOIN model_training_history h ON m.id = h.model_id WHERE m.is_active = true GROUP BY m.id, m.model_name, m.model_version, m.model_type, m.inference_time_ms, m.throughput_samples_sec`);