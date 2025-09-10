CREATE TABLE "ai_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"prompt" text,
	"response" text,
	"embedding" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "error_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message" text NOT NULL,
	"stack_trace" text,
	"embedding" real[],
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "indexed_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_path" text NOT NULL,
	"content" text,
	"embedding" real[],
	"summary" text,
	"metadata" jsonb,
	"indexed_at" timestamp DEFAULT now(),
	CONSTRAINT "indexed_files_file_path_unique" UNIQUE("file_path")
);
--> statement-breakpoint
CREATE TABLE "ai_engine_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engine_name" text NOT NULL,
	"is_online" boolean DEFAULT false,
	"last_health_check" timestamp DEFAULT now(),
	"response_time" integer,
	"version" text,
	"capabilities" jsonb,
	"configuration" jsonb,
	"error_status" text,
	"metadata" jsonb,
	CONSTRAINT "ai_engine_status_engine_name_unique" UNIQUE("engine_name")
);
--> statement-breakpoint
CREATE TABLE "gpu_inference_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"embedding" real[],
	"engine_used" text,
	"response_time" integer,
	"tokens_generated" integer,
	"cache_hit" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gpu_inference_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_name" text NOT NULL,
	"user_id" text,
	"engine_used" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"metadata" jsonb,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "gpu_performance_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"engine_type" text NOT NULL,
	"request_count" integer,
	"avg_response_time" real,
	"cache_hit_rate" real,
	"tokens_per_second" real,
	"gpu_utilization" real,
	"memory_usage" real,
	"error_count" integer,
	"metadata" jsonb,
	"measured_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" varchar(36) NOT NULL,
	"case_id" integer NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"content_type" varchar(100) NOT NULL,
	"file_size" integer NOT NULL,
	"minio_path" varchar(500) NOT NULL,
	"extracted_text" text,
	"processing_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"processing_error" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "documents_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "extracted_entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"chunk_id" integer,
	"entity_type" varchar(50) NOT NULL,
	"entity_value" text NOT NULL,
	"confidence" real NOT NULL,
	"start_offset" integer,
	"end_offset" integer,
	"context" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processing_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" varchar(36) NOT NULL,
	"document_id" integer,
	"job_type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'queued' NOT NULL,
	"current_step" varchar(50),
	"progress" integer DEFAULT 0 NOT NULL,
	"result" jsonb,
	"error" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "processing_jobs_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "rag_queries" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" varchar(36) NOT NULL,
	"case_id" integer,
	"query" text NOT NULL,
	"query_embedding" vector(384),
	"response" text,
	"model" varchar(50) NOT NULL,
	"tokens_used" integer,
	"processing_time_ms" integer,
	"similarity_threshold" real DEFAULT 0.7 NOT NULL,
	"results_count" integer,
	"user_feedback" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rag_queries_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "rag_query_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"query_id" integer NOT NULL,
	"chunk_id" integer NOT NULL,
	"similarity_score" real NOT NULL,
	"rank" integer NOT NULL,
	"used" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_summary_vectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"embedding" vector(384) NOT NULL,
	"confidence" real DEFAULT 1,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "case_summary_vectors_case_id_unique" UNIQUE("case_id")
);
--> statement-breakpoint
CREATE TABLE "document_vectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(384) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"relationship" text NOT NULL,
	"weight" real DEFAULT 1,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_type" text NOT NULL,
	"node_id" uuid NOT NULL,
	"label" text NOT NULL,
	"embedding" vector(384) NOT NULL,
	"properties" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "query_vectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"query" text NOT NULL,
	"embedding" vector(384) NOT NULL,
	"result_count" integer DEFAULT 0,
	"clicked_results" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recommendation_type" text NOT NULL,
	"recommendations" jsonb NOT NULL,
	"score" real DEFAULT 0,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_reports" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attachment_verifications" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "auto_tags" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "canvas_annotations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "canvas_states" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "case_activities" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "case_embeddings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "case_scores" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chat_embeddings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "citations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "content_embeddings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "criminals" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email_verification_codes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "embedding_cache" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "evidence" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hash_verifications" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "legal_analysis_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "legal_documents" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "legal_precedents" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "legal_research" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "persons_of_interest" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rag_messages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rag_sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reports" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "saved_reports" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "statutes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "themes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_ai_queries" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_embeddings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "vector_metadata" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "ai_reports" CASCADE;--> statement-breakpoint
DROP TABLE "attachment_verifications" CASCADE;--> statement-breakpoint
DROP TABLE "auto_tags" CASCADE;--> statement-breakpoint
DROP TABLE "canvas_annotations" CASCADE;--> statement-breakpoint
DROP TABLE "canvas_states" CASCADE;--> statement-breakpoint
DROP TABLE "case_activities" CASCADE;--> statement-breakpoint
DROP TABLE "case_embeddings" CASCADE;--> statement-breakpoint
DROP TABLE "case_scores" CASCADE;--> statement-breakpoint
DROP TABLE "chat_embeddings" CASCADE;--> statement-breakpoint
DROP TABLE "citations" CASCADE;--> statement-breakpoint
DROP TABLE "content_embeddings" CASCADE;--> statement-breakpoint
DROP TABLE "criminals" CASCADE;--> statement-breakpoint
DROP TABLE "email_verification_codes" CASCADE;--> statement-breakpoint
DROP TABLE "embedding_cache" CASCADE;--> statement-breakpoint
DROP TABLE "evidence" CASCADE;--> statement-breakpoint
DROP TABLE "hash_verifications" CASCADE;--> statement-breakpoint
DROP TABLE "legal_analysis_sessions" CASCADE;--> statement-breakpoint
DROP TABLE "legal_documents" CASCADE;--> statement-breakpoint
DROP TABLE "legal_precedents" CASCADE;--> statement-breakpoint
DROP TABLE "legal_research" CASCADE;--> statement-breakpoint
DROP TABLE "password_reset_tokens" CASCADE;--> statement-breakpoint
DROP TABLE "persons_of_interest" CASCADE;--> statement-breakpoint
DROP TABLE "rag_messages" CASCADE;--> statement-breakpoint
DROP TABLE "rag_sessions" CASCADE;--> statement-breakpoint
DROP TABLE "reports" CASCADE;--> statement-breakpoint
DROP TABLE "saved_reports" CASCADE;--> statement-breakpoint
DROP TABLE "sessions" CASCADE;--> statement-breakpoint
DROP TABLE "statutes" CASCADE;--> statement-breakpoint
DROP TABLE "themes" CASCADE;--> statement-breakpoint
DROP TABLE "user_ai_queries" CASCADE;--> statement-breakpoint
DROP TABLE "user_embeddings" CASCADE;--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
DROP TABLE "vector_metadata" CASCADE;--> statement-breakpoint
ALTER TABLE "cases" DROP CONSTRAINT "cases_case_number_unique";--> statement-breakpoint
ALTER TABLE "evidence_vectors" DROP CONSTRAINT "evidence_vectors_evidence_id_evidence_id_fk";
--> statement-breakpoint
ALTER TABLE "cases" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "cases" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "cases" ALTER COLUMN "status" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "cases" ALTER COLUMN "status" SET DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "cases" ALTER COLUMN "metadata" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "cases" ALTER COLUMN "metadata" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "document_chunks" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "document_chunks" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "document_chunks" ALTER COLUMN "document_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "document_chunks" ALTER COLUMN "embedding" SET DATA TYPE vector(384);--> statement-breakpoint
ALTER TABLE "document_chunks" ALTER COLUMN "embedding" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "document_chunks" ALTER COLUMN "metadata" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "document_chunks" ALTER COLUMN "metadata" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_vectors" ALTER COLUMN "evidence_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_vectors" ALTER COLUMN "embedding" SET DATA TYPE vector(384);--> statement-breakpoint
ALTER TABLE "evidence_vectors" ALTER COLUMN "metadata" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "evidence_vectors" ALTER COLUMN "metadata" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "uuid" varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD COLUMN "uuid" varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD COLUMN "word_count" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_vectors" ADD COLUMN "chunk_index" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence_vectors" ADD COLUMN "analysis_type" text;--> statement-breakpoint
ALTER TABLE "gpu_inference_messages" ADD CONSTRAINT "gpu_inference_messages_session_id_gpu_inference_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."gpu_inference_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gpu_performance_metrics" ADD CONSTRAINT "gpu_performance_metrics_session_id_gpu_inference_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."gpu_inference_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_entities" ADD CONSTRAINT "extracted_entities_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_entities" ADD CONSTRAINT "extracted_entities_chunk_id_document_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."document_chunks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_queries" ADD CONSTRAINT "rag_queries_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_query_results" ADD CONSTRAINT "rag_query_results_query_id_rag_queries_id_fk" FOREIGN KEY ("query_id") REFERENCES "public"."rag_queries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_query_results" ADD CONSTRAINT "rag_query_results_chunk_id_document_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."document_chunks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_summary_vectors" ADD CONSTRAINT "case_summary_vectors_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_vectors" ADD CONSTRAINT "document_vectors_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_edges" ADD CONSTRAINT "knowledge_edges_source_id_knowledge_nodes_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."knowledge_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_edges" ADD CONSTRAINT "knowledge_edges_target_id_knowledge_nodes_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."knowledge_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "query_vectors" ADD CONSTRAINT "query_vectors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_cache" ADD CONSTRAINT "recommendation_cache_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "case_summary_vectors_embedding_idx" ON "case_summary_vectors" USING ivfflat ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "document_vectors_embedding_idx" ON "document_vectors" USING ivfflat ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "document_vectors_document_idx" ON "document_vectors" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "knowledge_edges_source_idx" ON "knowledge_edges" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "knowledge_edges_target_idx" ON "knowledge_edges" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "knowledge_edges_relationship_idx" ON "knowledge_edges" USING btree ("relationship");--> statement-breakpoint
CREATE INDEX "knowledge_nodes_embedding_idx" ON "knowledge_nodes" USING ivfflat ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "knowledge_nodes_type_idx" ON "knowledge_nodes" USING btree ("node_type");--> statement-breakpoint
CREATE INDEX "query_vectors_embedding_idx" ON "query_vectors" USING ivfflat ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "query_vectors_user_idx" ON "query_vectors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recommendation_cache_user_type_idx" ON "recommendation_cache" USING btree ("user_id","recommendation_type");--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_vectors" ADD CONSTRAINT "evidence_vectors_evidence_id_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evidence_vectors_embedding_idx" ON "evidence_vectors" USING ivfflat ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "evidence_vectors_evidence_idx" ON "evidence_vectors" USING btree ("evidence_id");--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "case_number";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "incident_date";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "location";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "priority";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "danger_score";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "estimated_value";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "jurisdiction";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "lead_prosecutor";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "assigned_team";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "tags";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "ai_summary";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "ai_tags";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "created_by";--> statement-breakpoint
ALTER TABLE "cases" DROP COLUMN "closed_at";--> statement-breakpoint
ALTER TABLE "document_chunks" DROP COLUMN "document_type";--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_uuid_unique" UNIQUE("uuid");--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_uuid_unique" UNIQUE("uuid");