-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."case_status" AS ENUM('open', 'in_progress', 'pending_review', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('draft', 'under_review', 'approved', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."error_kind" AS ENUM('typescript', 'svelte', 'lint', 'build', 'runtime', 'api', 'other');--> statement-breakpoint
CREATE TYPE "public"."error_severity" AS ENUM('info', 'warn', 'error', 'fatal');--> statement-breakpoint
CREATE TYPE "public"."evidence_relationship_strength" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."evidence_relationship_type" AS ENUM('supports', 'contradicts', 'same_person', 'timeline', 'chain_of_custody');--> statement-breakpoint
CREATE TYPE "public"."evidence_status" AS ENUM('pending', 'verified', 'rejected', 'under_review');--> statement-breakpoint
CREATE TYPE "public"."evidence_type" AS ENUM('physical', 'digital', 'testimonial', 'documentary', 'scientific', 'video', 'document', 'photo', 'note', 'audio', 'forensic');--> statement-breakpoint
CREATE TYPE "public"."node_type" AS ENUM('person', 'evidence', 'location', 'case');--> statement-breakpoint
CREATE TYPE "public"."patch_status" AS ENUM('suggested', 'applied', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."priority_level" AS ENUM('low', 'medium', 'high', 'critical', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."relationship_strength" AS ENUM('strong', 'medium', 'weak');--> statement-breakpoint
CREATE TYPE "public"."route_health_state" AS ENUM('healthy', 'flaky', 'broken');--> statement-breakpoint
CREATE TYPE "public"."timeline_event_type" AS ENUM('evidence', 'person', 'location', 'action');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('prosecutor', 'detective', 'admin', 'analyst', 'paralegal');--> statement-breakpoint
CREATE TABLE "legal_analysis_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"user_id" uuid,
	"session_type" varchar(50) DEFAULT 'case_analysis',
	"analysis_prompt" text,
	"analysis_result" text,
	"confidence_level" numeric(3, 2),
	"sources_used" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model" varchar(100) DEFAULT 'gemma3-legal',
	"processing_time" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predictive_asset_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_type" text NOT NULL,
	"predictions" jsonb,
	"confidence_score" real,
	"cache_expires" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_graphs" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" varchar(255) NOT NULL,
	"title" varchar(500),
	"content" text,
	"doc_type" varchar(100),
	"entities" jsonb,
	"embeddings" jsonb,
	"relationships" jsonb,
	"graph_stats" jsonb,
	"processing_time_ms" bigint,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "knowledge_graphs_document_id_key" UNIQUE("document_id")
);
--> statement-breakpoint
CREATE TABLE "rag_query_results" (
	"id" serial NOT NULL,
	"query_id" integer NOT NULL,
	"chunk_id" integer NOT NULL,
	"similarity_score" real NOT NULL,
	"rank" integer NOT NULL,
	"used" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"entity_type" text,
	"description" text,
	"contact_info" jsonb,
	"aliases" text[],
	"metadata" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "document_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer,
	"topic_id" integer,
	"relevance_score" real DEFAULT 1,
	"assigned_by" text DEFAULT 'ai',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "criminals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"middle_name" varchar(100),
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"date_of_birth" timestamp,
	"place_of_birth" varchar(200),
	"address" text,
	"phone" varchar(20),
	"email" varchar(255),
	"ssn" varchar(11),
	"drivers_license" varchar(50),
	"height" integer,
	"weight" integer,
	"eye_color" varchar(20),
	"hair_color" varchar(20),
	"distinguishing_marks" text,
	"photo_url" text,
	"fingerprints" jsonb DEFAULT '{}'::jsonb,
	"threat_level" varchar(20) DEFAULT 'low' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"notes" text,
	"ai_summary" text,
	"ai_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_edges" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"relationship" text NOT NULL,
	"weight" real DEFAULT 1,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_annotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evidence_id" uuid,
	"fabric_data" jsonb NOT NULL,
	"annotation_type" varchar(50),
	"coordinates" jsonb,
	"bounding_box" jsonb,
	"text" text,
	"color" varchar(20),
	"layer_order" integer DEFAULT 0,
	"is_visible" boolean DEFAULT true,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"version" integer DEFAULT 1,
	"parent_annotation_id" uuid,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"activity_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"scheduled_for" timestamp,
	"completed_at" timestamp,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"assigned_to" uuid,
	"related_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_criminals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vector_embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"content" text,
	"embedding" vector(1536),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"embedding_384" vector(384),
	"embedding_model" text
);
--> statement-breakpoint
CREATE TABLE "vector_similarity_queries" (
	"id" serial PRIMARY KEY NOT NULL,
	"query_text" text NOT NULL,
	"query_embedding" vector(512) NOT NULL,
	"user_id" text,
	"session_id" text,
	"practice_area_filter" text,
	"document_type_filter" text,
	"response_time_ms" real NOT NULL,
	"results_count" real NOT NULL,
	"similarity_threshold" real DEFAULT 0.7,
	"top_results" jsonb,
	"query_intent" text,
	"user_satisfaction" real,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "legal_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"parent_topic_id" integer,
	"topic_level" integer DEFAULT 1,
	"embedding" vector(768),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"embedding_384" vector(384)
);
--> statement-breakpoint
CREATE TABLE "email_verification_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"code" varchar(8) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "email_verification_codes_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "extracted_entities" (
	"id" serial NOT NULL,
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
CREATE TABLE "statutes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL,
	"description" text,
	"category" varchar(100),
	"jurisdiction" varchar(100),
	"is_active" boolean DEFAULT true,
	"penalties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_evidence_id" uuid NOT NULL,
	"target_evidence_id" uuid NOT NULL,
	"connection_type" varchar(50) NOT NULL,
	"strength" numeric(3, 2) NOT NULL,
	"shared_entities" jsonb DEFAULT '[]'::jsonb,
	"shared_terms" jsonb DEFAULT '[]'::jsonb,
	"temporal_proximity" integer,
	"spatial_proximity" numeric(10, 6),
	"semantic_similarity" numeric(3, 2),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "evidence_connections_source_evidence_id_target_evidence_id__key" UNIQUE("source_evidence_id","target_evidence_id","connection_type"),
	CONSTRAINT "evidence_connections_strength_check" CHECK ((strength >= (0)::numeric) AND (strength <= (1)::numeric))
);
--> statement-breakpoint
CREATE TABLE "document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(512) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"embedding_384" vector(384)
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar DEFAULT 'New Chat' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"is_active" boolean DEFAULT true,
	"context" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "document_relationships_jsonb" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"source_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"relationship_metadata" jsonb NOT NULL,
	"relationship_type" text GENERATED ALWAYS AS ((relationship_metadata ->> 'type'::text)) STORED,
	"strength" real GENERATED ALWAYS AS (((relationship_metadata ->> 'strength'::text))::real) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_relationships_jsonb_source_id_target_id_relationsh_key" UNIQUE("source_id","target_id","relationship_type")
);
--> statement-breakpoint
CREATE TABLE "migrations" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"filename" varchar(255) NOT NULL,
	"applied_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "error_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_path" text NOT NULL,
	"file_path" text,
	"message" text NOT NULL,
	"stack_trace" text,
	"ts_code" text,
	"created_at" timestamp DEFAULT now(),
	"cluster_id" text,
	"severity" text DEFAULT 'error' NOT NULL,
	"stack" text,
	"meta_json" jsonb
);
--> statement-breakpoint
CREATE TABLE "evidence_vectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evidence_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(768) NOT NULL,
	"analysis_type" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "route_health" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_path" text NOT NULL,
	"error_state" text NOT NULL,
	"last_checked" timestamp DEFAULT now(),
	"error_count" integer DEFAULT 0,
	"health_score" integer DEFAULT 100,
	"metadata" jsonb,
	"route_cluster" varchar(100),
	"route_owner" varchar(100),
	CONSTRAINT "route_health_route_path_key" UNIQUE("route_path")
);
--> statement-breakpoint
CREATE TABLE "error_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_path" text NOT NULL,
	"summary" text NOT NULL,
	"patch" text NOT NULL,
	"risk_level" text DEFAULT 'medium',
	"source" text DEFAULT 'synthesized',
	"created_at" timestamp DEFAULT now(),
	"error_event_id" uuid,
	"cluster_id" text,
	"created_by_user_id" text,
	"applied_by_user_id" text,
	"applied" boolean DEFAULT false NOT NULL,
	"applied_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "case_embeddings_optimized" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"doc_id" uuid NOT NULL,
	"page_no" integer NOT NULL,
	"chunk_no" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(768),
	"doc_title" text,
	"chunk_type" varchar(50) DEFAULT 'content',
	"token_count" integer,
	"overlap_start" integer DEFAULT 0,
	"overlap_end" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"embedding_384" vector(384)
);
--> statement-breakpoint
CREATE TABLE "ai_history" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"prompt" text,
	"response" text,
	"embedding" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
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
	"source_uri" text,
	"embedding" vector(768),
	"title" varchar(255),
	"mime_type" varchar(100),
	"uploaded_by" uuid DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"processed_at" timestamp,
	CONSTRAINT "documents_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "hash_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evidence_id" uuid,
	"verified_hash" varchar(64) NOT NULL,
	"stored_hash" varchar(64),
	"result" boolean NOT NULL,
	"verification_method" varchar(50) DEFAULT 'manual',
	"verified_by" uuid,
	"verified_at" timestamp DEFAULT now(),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"text_content" text NOT NULL,
	"embedding" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"score" numeric(5, 2) NOT NULL,
	"risk_level" varchar(20) NOT NULL,
	"breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"criteria" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recommendations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"calculated_by" uuid,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" uuid,
	"details" jsonb DEFAULT '{}'::jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"email" varchar(255) NOT NULL,
	"hashed_password" varchar(255),
	"username" varchar(100),
	"first_name" varchar(100),
	"last_name" varchar(100),
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"department" varchar(100),
	"jurisdiction" varchar(100),
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"avatar_url" varchar(500),
	"last_login_at" timestamp with time zone,
	"practice_areas" jsonb DEFAULT '[]'::jsonb,
	"bar_number" varchar(50),
	"firm_name" varchar(200),
	"profile_embedding" vector(384),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "case_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"memory_type" varchar(128) NOT NULL,
	"content" text,
	"metadata" jsonb,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"case_number" varchar(100),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"practice_area" varchar(100),
	"jurisdiction" varchar(100),
	"court" varchar(200),
	"client_name" varchar(200),
	"opposing_party" varchar(200),
	"assigned_attorney" uuid,
	"filing_date" timestamp with time zone,
	"due_date" timestamp with time zone,
	"closed_date" timestamp with time zone,
	"case_embedding" vector(384),
	"qdrant_id" uuid,
	"qdrant_collection" varchar(100) DEFAULT 'cases',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"case_embedding_384" vector(384),
	CONSTRAINT "cases_case_number_key" UNIQUE("case_number")
);
--> statement-breakpoint
CREATE TABLE "rag_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"message_index" integer NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"retrieved_sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_count" integer DEFAULT 0 NOT NULL,
	"retrieval_score" varchar(10),
	"processing_time" integer,
	"model" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "embedding_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text_hash" text NOT NULL,
	"model" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "embedding_cache_text_hash_unique" UNIQUE("text_hash")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"session_context" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "query_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"query_id" integer,
	"rating" integer,
	"feedback_text" text,
	"is_helpful" boolean,
	"user_ip" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "citations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"document_id" uuid,
	"citation_type" varchar(50) NOT NULL,
	"relevance_score" numeric(3, 2),
	"page_number" integer,
	"pinpoint_citation" varchar(100),
	"quoted_text" text,
	"context_before" text,
	"context_after" text,
	"annotation" text,
	"legal_principle" text,
	"citation_format" varchar(20) DEFAULT 'bluebook',
	"formatted_citation" text,
	"shepards_treatment" varchar(50),
	"is_key_authority" boolean DEFAULT false,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_documents" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"summary" text,
	"document_type" varchar(50) DEFAULT 'document' NOT NULL,
	"practice_area" varchar(100),
	"jurisdiction" varchar(100),
	"case_number" varchar(100),
	"file_path" varchar(1000),
	"file_name" varchar(255),
	"file_size" integer,
	"mime_type" varchar(100),
	"title_embedding" vector(384),
	"content_embedding" vector(384),
	"summary_embedding" vector(384),
	"qdrant_id" uuid,
	"qdrant_collection" varchar(100) DEFAULT 'legal_documents',
	"last_synced_to_qdrant" timestamp with time zone,
	"user_id" uuid,
	"case_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"visibility" varchar(20) DEFAULT 'private' NOT NULL,
	"ai_processed" boolean DEFAULT false NOT NULL,
	"confidence_score" real DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"embedding_384" vector(384),
	"evidence_id" uuid,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "test_rag_search_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query" text NOT NULL,
	"query_embedding" vector(768),
	"results" jsonb,
	"search_type" text NOT NULL,
	"result_count" integer NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "legal_precedents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_title" varchar(255) NOT NULL,
	"citation" varchar(255) NOT NULL,
	"court" varchar(100),
	"year" integer,
	"jurisdiction" varchar(50),
	"summary" text,
	"full_text" text,
	"embedding" text,
	"relevance_score" numeric(3, 2),
	"legal_principles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"linked_cases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rag_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"user_id" uuid,
	"title" varchar(255),
	"model" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rag_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "vector_operations" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"operation_type" varchar(50) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"model_name" varchar(100) DEFAULT 'nomic-embed-text' NOT NULL,
	"dimensions" integer DEFAULT 384 NOT NULL,
	"similarity" varchar(20) DEFAULT 'cosine',
	"processing_time_ms" integer,
	"similarity_score" real,
	"qdrant_synced" boolean DEFAULT false NOT NULL,
	"qdrant_synced_at" timestamp with time zone,
	"qdrant_error" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"title" varchar(255) NOT NULL,
	"content" text,
	"report_type" varchar(50) DEFAULT 'case_summary',
	"status" varchar(20) DEFAULT 'draft',
	"is_public" boolean DEFAULT false,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persons_of_interest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"name" varchar(255) NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"relationship" varchar(100),
	"threat_level" varchar(20) DEFAULT 'low',
	"status" varchar(20) DEFAULT 'active',
	"profile_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processing_jobs" (
	"id" serial NOT NULL,
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
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qdrant_collections" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"vector_size" integer DEFAULT 384 NOT NULL,
	"distance" varchar(20) DEFAULT 'Cosine' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"is_optimized" boolean DEFAULT false NOT NULL,
	"points_count" integer DEFAULT 0 NOT NULL,
	"last_synced" timestamp with time zone,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qdrant_collections_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "legal_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_name" text NOT NULL,
	"case_number" text,
	"court" text,
	"jurisdiction" text,
	"decision_date" timestamp,
	"citation" text,
	"summary" text,
	"holding" text,
	"facts" text,
	"legal_issues" text,
	"embedding" vector(768),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"embedding_384" vector(384)
);
--> statement-breakpoint
CREATE TABLE "ai_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_key" text NOT NULL,
	"config_value" text,
	"config_type" text DEFAULT 'string',
	"description" text,
	"is_active" boolean DEFAULT true,
	"updated_by" text DEFAULT 'system',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "test_rag_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"content" text NOT NULL,
	"original_content" text,
	"metadata" jsonb,
	"confidence" real,
	"legal_analysis" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "legal_queries" (
	"id" serial PRIMARY KEY NOT NULL,
	"prompt" text NOT NULL,
	"context" text,
	"response" text,
	"tokens_used" integer,
	"inference_time" real,
	"model_used" text DEFAULT 'unknown',
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"user_ip" text,
	"similar_docs_count" integer DEFAULT 0,
	"timestamp" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "api_rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"api_key_hash" varchar(64),
	"endpoint" varchar(100) NOT NULL,
	"requests_count" integer DEFAULT 0,
	"window_start" timestamp with time zone DEFAULT now(),
	"window_duration" interval DEFAULT '01:00:00',
	"max_requests" integer DEFAULT 1000,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"notification_type" varchar(50) NOT NULL,
	"enabled" boolean DEFAULT true,
	"delivery_method" varchar(20) DEFAULT 'email',
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rag_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"content_hash" text NOT NULL,
	"file_type" text,
	"file_size" integer,
	"content" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"embedding" vector(768),
	"processed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"embedding_384" vector(384),
	CONSTRAINT "rag_documents_content_hash_key" UNIQUE("content_hash")
);
--> statement-breakpoint
CREATE TABLE "recommendation_cache" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"recommendation_type" text NOT NULL,
	"recommendations" jsonb NOT NULL,
	"score" real DEFAULT 0,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yorha_evidence_nodes" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"evidence_type" varchar(100) NOT NULL,
	"position_x" integer DEFAULT 0,
	"position_y" integer DEFAULT 0,
	"color" varchar(20) DEFAULT 'blue',
	"icon" varchar(100),
	"source" varchar(500),
	"date_collected" timestamp with time zone,
	"relevance_score" integer DEFAULT 0,
	"file_path" varchar(1000),
	"file_type" varchar(100),
	"file_size" integer,
	"ai_summary" text,
	"ai_tags" jsonb,
	"key_entities" jsonb,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" varchar(100),
	"payload" text,
	"metadata" jsonb,
	"embedding" vector(384),
	"text_hash" varchar(64),
	"content" text,
	"model" varchar(100) DEFAULT 'nomic-embed-text:latest',
	"document_type" varchar(50),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"embedding_384" vector(384),
	CONSTRAINT "embeddings_text_hash_unique" UNIQUE("text_hash")
);
--> statement-breakpoint
CREATE TABLE "query_vectors" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"query" text NOT NULL,
	"embedding" vector(384) NOT NULL,
	"result_count" integer DEFAULT 0,
	"clicked_results" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yorha_cases" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"case_number" varchar(100) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"case_type" varchar(100),
	"jurisdiction" varchar(200),
	"filed_date" timestamp with time zone,
	"closed_date" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"assigned_to" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_nodes" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"node_type" text NOT NULL,
	"node_id" uuid NOT NULL,
	"label" text NOT NULL,
	"embedding" vector(384) NOT NULL,
	"properties" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"content" text NOT NULL,
	"embedding" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "code_embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"content_hash" text NOT NULL,
	"embedding" vector(768),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"error_patterns" text[],
	"repair_suggestions" text[],
	"confidence_score" double precision DEFAULT 0,
	"last_updated" timestamp DEFAULT now(),
	"embedding_384" vector(384),
	CONSTRAINT "code_embeddings_path_key" UNIQUE("path")
);
--> statement-breakpoint
CREATE TABLE "recommendation_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recommendation_id" uuid NOT NULL,
	"rating" integer,
	"feedback" text,
	"implemented" boolean DEFAULT false,
	"user_id" uuid,
	"rated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "recommendation_ratings_rating_check" CHECK ((rating >= 1) AND (rating <= 5))
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"token_hash" varchar(63) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_documents_extracted" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" varchar(255) NOT NULL,
	"title" varchar(500),
	"content" text,
	"doc_type" varchar(100),
	"entities" jsonb,
	"embedding" jsonb,
	"embedding_gemma" vector(512),
	"processing_time_ms" bigint,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"embedding_384" vector(384),
	CONSTRAINT "legal_documents_extracted_document_id_key" UNIQUE("document_id")
);
--> statement-breakpoint
CREATE TABLE "detective_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"analysis_type" varchar(50) NOT NULL,
	"query_data" jsonb NOT NULL,
	"results" jsonb NOT NULL,
	"confidence_score" numeric(3, 2),
	"ai_model" varchar(100),
	"processing_time" integer,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_processing_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"task_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"results" jsonb,
	"error" text,
	"model_used" text,
	"processing_time" integer,
	"tokens_used" integer,
	"confidence_score" real,
	"requested_options" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_analysis_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"input_hash" text NOT NULL,
	"prompt_text" text NOT NULL,
	"context_documents" jsonb,
	"analysis_type" text NOT NULL,
	"analysis_content" text NOT NULL,
	"analysis_embedding" vector(512),
	"model_version" text DEFAULT 'gemma3-legal:latest',
	"processing_time_ms" real,
	"token_count" real,
	"access_count" real DEFAULT 1,
	"last_accessed_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "legal_analysis_cache_input_hash_unique" UNIQUE("input_hash")
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" uuid PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yorha_evidence_connections" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"source_node_id" uuid NOT NULL,
	"target_node_id" uuid NOT NULL,
	"connection_type" varchar(100) NOT NULL,
	"strength" integer DEFAULT 50,
	"description" text,
	"ai_reasoning" text,
	"confidence_score" integer DEFAULT 0,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yorha_chat_sessions" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(500),
	"context_type" varchar(100),
	"context_id" uuid,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"message_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ai_engine_status" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"engine_name" text NOT NULL,
	"is_online" boolean DEFAULT false,
	"last_health_check" timestamp DEFAULT now(),
	"response_time" integer,
	"version" text,
	"capabilities" jsonb,
	"configuration" jsonb,
	"error_status" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"css_variables" jsonb NOT NULL,
	"color_palette" jsonb NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_rag_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid,
	"content" text NOT NULL,
	"embedding" vector(768),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"embedding_384" vector(384)
);
--> statement-breakpoint
CREATE TABLE "gpu_inference_messages" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
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
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"content" text NOT NULL,
	"role" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"embedding" jsonb,
	"metadata" jsonb,
	"model" text DEFAULT 'gemma3-legal' NOT NULL,
	"confidence" integer
);
--> statement-breakpoint
CREATE TABLE "qlora_training_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"config" jsonb NOT NULL,
	"status" text DEFAULT 'pending',
	"performance_metrics" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "indexed_files" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"file_path" text NOT NULL,
	"content" text,
	"embedding" real[],
	"summary" text,
	"metadata" jsonb,
	"indexed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_vectors" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(384) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gpu_inference_sessions" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"session_name" text NOT NULL,
	"user_id" text,
	"engine_used" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"metadata" jsonb,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"session_id" varchar NOT NULL,
	"role" varchar NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(768),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"processed_by" varchar DEFAULT 'unknown' NOT NULL,
	"token_count" integer DEFAULT 0,
	"process_time_ms" bigint DEFAULT 0,
	"embedding_384" vector(384),
	CONSTRAINT "chat_messages_role_check" CHECK ((role)::text = ANY ((ARRAY['user'::character varying, 'assistant'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "case_summary_vectors" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"embedding" vector(384) NOT NULL,
	"confidence" real DEFAULT 1,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_base" (
	"id" serial PRIMARY KEY NOT NULL,
	"chunk_id" text NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(768),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"chunk_type" varchar(50) NOT NULL,
	"source_file" text,
	"created_at" timestamp DEFAULT now(),
	"embedding_384" vector(384),
	CONSTRAINT "knowledge_base_chunk_id_key" UNIQUE("chunk_id")
);
--> statement-breakpoint
CREATE TABLE "yorha_chat_messages" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"message_type" varchar(50) DEFAULT 'text',
	"referenced_evidence" jsonb,
	"model_used" varchar(100),
	"tokens_used" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachment_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attachment_id" uuid NOT NULL,
	"verified_by" uuid NOT NULL,
	"verification_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"verification_notes" text,
	"verified_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "route_error_patches" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"route_path" varchar(255) NOT NULL,
	"route_file" varchar(500),
	"error_code" varchar(64) NOT NULL,
	"suggestion_title" varchar(255),
	"patch_text" text NOT NULL,
	"patch_explanation" text,
	"confidence" numeric DEFAULT '0.50' NOT NULL,
	"hints" text[],
	"status" "patch_status" DEFAULT 'suggested' NOT NULL,
	"source" varchar(64) DEFAULT 'phase78' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gpu_performance_metrics" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
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
CREATE TABLE "yorha_system_metrics" (
	"id" serial NOT NULL,
	"cpu_usage" integer,
	"cpu_cores" integer,
	"memory_usage" integer,
	"memory_total_gb" integer,
	"memory_used_gb" integer,
	"gpu_usage" integer,
	"gpu_memory_usage" integer,
	"gpu_temperature" integer,
	"disk_usage" integer,
	"disk_total_gb" integer,
	"disk_used_gb" integer,
	"network_latency_ms" integer,
	"network_bandwidth_mbps" integer,
	"system_health" varchar(50) DEFAULT 'healthy',
	"active_cases" integer DEFAULT 0,
	"active_sessions" integer DEFAULT 0,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_feedback" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"suggestion_id" uuid NOT NULL,
	"route_path" varchar(255) NOT NULL,
	"helpful" boolean,
	"accurate" boolean,
	"works_soon" boolean,
	"feedback" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_clusters" (
	"id" text DEFAULT gen_random_uuid() NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"error_pattern" text NOT NULL,
	"member_count" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"centroid_vector" text,
	"silhouette_score" text,
	"suggested_category" text,
	"suggested_fix_approach" text,
	"last_seen_at" timestamp with time zone,
	"kind" text DEFAULT 'typing' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_autosaves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canvas_id" uuid NOT NULL,
	"user_id" uuid,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embedding" vector(384),
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_embeddings" (
	"id" serial NOT NULL,
	"path" text NOT NULL,
	"hash" text NOT NULL,
	"embedding_model" text NOT NULL,
	"embedding_vector" vector(768),
	"summary" text,
	"timestamp" timestamp with time zone DEFAULT now(),
	"chunk_index" integer DEFAULT 0,
	"total_chunks" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "phase72_cluster" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"label" text,
	"phase" integer DEFAULT 72 NOT NULL,
	"cycle" integer NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"centroid" vector(768),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phase72_cluster_summary" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"cluster_id" uuid NOT NULL,
	"summary_text" text NOT NULL,
	"model" text NOT NULL,
	"embedding" vector(768),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"timestamp" timestamp NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" timeline_event_type NOT NULL,
	"evidence_ids" jsonb DEFAULT '[]'::jsonb,
	"person_ids" jsonb DEFAULT '[]'::jsonb,
	"location_ids" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "evidence_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_evidence_id" uuid NOT NULL,
	"to_evidence_id" uuid NOT NULL,
	"label" text,
	"strength" "relationship_strength" DEFAULT 'medium',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"case_id" uuid,
	"relationship_type" "evidence_relationship_type" DEFAULT 'supports' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phase72_error_vector" (
	"error_id" uuid NOT NULL,
	"model" text NOT NULL,
	"embedding" vector(768) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vector_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" text NOT NULL,
	"collection_name" varchar(100) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "vector_metadata_document_id_unique" UNIQUE("document_id")
);
--> statement-breakpoint
CREATE TABLE "error_logs" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"message" text NOT NULL,
	"stack_trace" text,
	"embedding" real[],
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"category" varchar(50) DEFAULT 'general',
	"is_public" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "system_settings_key_key" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "ai_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"report_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"rich_text_content" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"canvas_elements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generated_by" varchar(100) DEFAULT 'gemma3-legal',
	"confidence" numeric(3, 2) DEFAULT '0.85',
	"is_active" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"name" varchar(255) NOT NULL,
	"canvas_data" jsonb NOT NULL,
	"version" integer DEFAULT 1,
	"is_default" boolean DEFAULT false,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_summaries" (
	"id" serial NOT NULL,
	"path" text NOT NULL,
	"hash" text NOT NULL,
	"summary" text NOT NULL,
	"file_type" text,
	"word_count" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "graph_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"node_id" text NOT NULL,
	"label" text NOT NULL,
	"type" "node_type" NOT NULL,
	"pos_x" integer NOT NULL,
	"pos_y" integer NOT NULL,
	"entity_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "graph_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"from_node_id" uuid NOT NULL,
	"to_node_id" uuid NOT NULL,
	"label" text,
	"strength" "relationship_strength" DEFAULT 'medium',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"content" text NOT NULL,
	"embedding" text NOT NULL,
	"role" varchar(20) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_research" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"query" text NOT NULL,
	"search_terms" jsonb DEFAULT '[]'::jsonb,
	"jurisdiction" varchar(100),
	"date_range" jsonb,
	"court_level" varchar(50),
	"practice_area" varchar(100),
	"results_count" integer DEFAULT 0,
	"search_results" jsonb DEFAULT '[]'::jsonb,
	"ai_summary" text,
	"key_findings" jsonb DEFAULT '[]'::jsonb,
	"recommended_citations" jsonb DEFAULT '[]'::jsonb,
	"search_duration" integer,
	"data_source" varchar(50),
	"is_bookmarked" boolean DEFAULT false,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(300) NOT NULL,
	"case_id" uuid,
	"report_type" varchar(50) NOT NULL,
	"template_id" uuid,
	"content" jsonb NOT NULL,
	"html_content" text,
	"generated_by" varchar(50) DEFAULT 'manual',
	"ai_model" varchar(50),
	"ai_prompt" text,
	"export_format" varchar(20) DEFAULT 'pdf',
	"status" varchar(20) DEFAULT 'draft',
	"version" integer DEFAULT 1,
	"word_count" integer,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"shared_with" jsonb DEFAULT '[]'::jsonb,
	"last_exported" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_documents_jsonb" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"title_embedding" vector(384),
	"content_embedding" vector(384),
	"document_type" text GENERATED ALWAYS AS ((metadata ->> 'documentType'::text)) STORED,
	"jurisdiction" text GENERATED ALWAYS AS ((metadata ->> 'jurisdiction'::text)) STORED,
	"practice_area" text GENERATED ALWAYS AS ((metadata ->> 'practiceArea'::text)) STORED,
	"confidentiality_level" text GENERATED ALWAYS AS ((metadata ->> 'confidentialityLevel'::text)) STORED,
	"urgency" text GENERATED ALWAYS AS ((metadata ->> 'urgency'::text)) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english'::regconfig, ((title || ' '::text) || content))) STORED
);
--> statement-breakpoint
CREATE TABLE "case_timeline" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"event_date" timestamp with time zone NOT NULL,
	"importance" varchar(20) DEFAULT 'medium',
	"evidence_id" uuid,
	"related_entity_id" uuid,
	"related_entity_type" varchar(50),
	"event_data" jsonb DEFAULT '{}'::jsonb,
	"automated" boolean DEFAULT false,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "error_timeline" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"route_path" varchar(255) NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"description" text,
	"metadata" jsonb,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phase72_error" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"error_hash" text NOT NULL,
	"file_path" text NOT NULL,
	"line" integer NOT NULL,
	"col" integer NOT NULL,
	"code" text NOT NULL,
	"severity" text DEFAULT 'error' NOT NULL,
	"message" text NOT NULL,
	"phase" integer DEFAULT 72 NOT NULL,
	"cycle" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"embedding" vector(384),
	"occurrence_count" integer DEFAULT 1,
	"last_seen" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "evidence_files" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"chat_turn_id" uuid,
	"case_id" uuid,
	"filename" text NOT NULL,
	"minio_object_name" text NOT NULL,
	"content_type" text,
	"size_bytes" bigint,
	"extracted_text" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"user_id" uuid,
	"original_filename" varchar(512) NOT NULL,
	"stored_filename" varchar(512) NOT NULL,
	"mime_type" varchar(200),
	"file_size" integer,
	"storage_path" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer,
	"entity_id" integer,
	"relationship_type" text,
	"confidence_score" real,
	"extracted_by" text DEFAULT 'ai',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "user_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"content" text NOT NULL,
	"embedding" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"reasoning" text,
	"priority" varchar(20) DEFAULT 'medium',
	"confidence" numeric(3, 2),
	"ai_model" varchar(100),
	"supporting_evidence" jsonb DEFAULT '[]'::jsonb,
	"suggested_actions" jsonb DEFAULT '[]'::jsonb,
	"estimated_impact" text,
	"timeframe" varchar(100),
	"status" varchar(20) DEFAULT 'pending',
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_by" varchar(50) DEFAULT 'ai-system',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "ai_recommendations_confidence_check" CHECK ((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))
);
--> statement-breakpoint
CREATE TABLE "rag_queries" (
	"id" serial NOT NULL,
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
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_performance" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_name" text NOT NULL,
	"model_version" text,
	"query_count" integer DEFAULT 0,
	"avg_inference_time" real,
	"avg_tokens_per_response" real,
	"success_rate" real,
	"user_satisfaction" real,
	"date" timestamp DEFAULT CURRENT_TIMESTAMP,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "chat_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"case_id" uuid,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"minio_url" text NOT NULL,
	"docling_result" jsonb,
	"extracted_keywords" text[] DEFAULT '{""}',
	"key_phrases" text[] DEFAULT '{""}',
	"suggestions" text[] DEFAULT '{""}',
	"file_size_bytes" integer,
	"processing_time_ms" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_turns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"user_message" text NOT NULL,
	"assistant_response" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"image_urls" text[] DEFAULT '{""}',
	"extracted_keywords" text[] DEFAULT '{""}',
	"key_phrases" text[] DEFAULT '{""}',
	"suggestions" text[] DEFAULT '{""}'
);
--> statement-breakpoint
CREATE TABLE "chat_turn_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_turn_id" uuid NOT NULL,
	"evidence_id" uuid NOT NULL,
	"object_uri" text,
	"role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_turn_evidence_role_check" CHECK (role = ANY (ARRAY['uploaded'::text, 'retrieved'::text]))
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"evidence_number" text NOT NULL,
	"title" text NOT NULL,
	"type" "evidence_type" NOT NULL,
	"summary" text NOT NULL,
	"description" text,
	"pos_x" integer,
	"pos_y" integer,
	"collected_at" timestamp,
	"collected_by" text,
	"verified_at" timestamp,
	"verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"evidence_type" text,
	"file_type" varchar(50),
	"file_url" text,
	"file_name" varchar(255),
	"file_size" integer,
	"mime_type" varchar(100),
	"hash" varchar(128),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"ai_analysis" jsonb DEFAULT '{}'::jsonb,
	"ai_tags" jsonb DEFAULT '[]'::jsonb,
	"ai_summary" text,
	"uploaded_by" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "evidence_evidence_number_key" UNIQUE("evidence_number")
);
--> statement-breakpoint
CREATE TABLE "evidence_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evidence_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"page_number" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "evidence_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evidence_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "evidence_tags_evidence_id_tag_id_key" UNIQUE("evidence_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "rag_index_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chunk_id" uuid NOT NULL,
	"evidence_id" uuid NOT NULL,
	"qdrant_point_id" text NOT NULL,
	"tags" text[],
	"jurisdiction" text,
	"indexed_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"tag_weight" real DEFAULT 1,
	"embedding_model" text DEFAULT 'embeddinggemma:latest',
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "rag_index_metadata_chunk_id_key" UNIQUE("chunk_id")
);
--> statement-breakpoint
CREATE TABLE "citation_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"jurisdiction" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"namespace" text DEFAULT 'general' NOT NULL,
	"synonyms" text[] DEFAULT '{""}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chunk_citations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chunk_id" uuid NOT NULL,
	"cite_text" text NOT NULL,
	"cite_type" text DEFAULT 'unknown' NOT NULL,
	"jurisdiction" text,
	"normalized" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rag_chunk_index" (
	"chunk_id" uuid PRIMARY KEY NOT NULL,
	"collection" text DEFAULT 'phase72_evidence_embeddings' NOT NULL,
	"point_id" text NOT NULL,
	"embedding_model" text DEFAULT 'embeddinggemma:latest' NOT NULL,
	"indexed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload_hash" text,
	CONSTRAINT "rag_chunk_index_collection_point_id_key" UNIQUE("collection","point_id")
);
--> statement-breakpoint
CREATE TABLE "error_patterns" (
	"id" serial NOT NULL,
	"fingerprint" varchar(32) NOT NULL,
	"error_code" varchar(50),
	"error_message" text NOT NULL,
	"normalized_pattern" text NOT NULL,
	"file_pattern" varchar(500),
	"category" varchar(100),
	"severity" varchar(20) DEFAULT 'error',
	"cluster_id" varchar(50),
	"embedding" vector(768),
	"first_seen" timestamp with time zone DEFAULT now(),
	"last_seen" timestamp with time zone DEFAULT now(),
	"occurrence_count" integer DEFAULT 1,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "fix_attempts" (
	"id" serial NOT NULL,
	"pattern_fingerprint" varchar(32),
	"fix_type" varchar(100) NOT NULL,
	"fix_description" text,
	"fix_diff" text,
	"applied_at" timestamp with time zone DEFAULT now(),
	"success" boolean,
	"verified_at" timestamp with time zone,
	"verification_method" varchar(100),
	"files_affected" integer DEFAULT 1,
	"errors_resolved" integer DEFAULT 0,
	"errors_introduced" integer DEFAULT 0,
	"rollback_performed" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "error_resolution_history" (
	"id" serial NOT NULL,
	"pattern_fingerprint" varchar(32),
	"snapshot_date" date DEFAULT CURRENT_DATE,
	"total_occurrences" integer DEFAULT 0,
	"resolved_count" integer DEFAULT 0,
	"active_count" integer DEFAULT 0,
	"confidence_score" double precision DEFAULT 0,
	"fix_success_rate" double precision DEFAULT 0,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "doc_references" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text,
	"minio_key" text,
	"embedding" vector(768),
	CONSTRAINT "doc_references_url_key" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "evidence_tag_links" (
	"evidence_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"source" text DEFAULT 'system' NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_tag_links_pkey" PRIMARY KEY("evidence_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "chunk_tag_links" (
	"chunk_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"source" text DEFAULT 'system' NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chunk_tag_links_pkey" PRIMARY KEY("chunk_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "document_topics" ADD CONSTRAINT "document_topics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."legal_topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_topics" ADD CONSTRAINT "legal_topics_parent_topic_id_fkey" FOREIGN KEY ("parent_topic_id") REFERENCES "public"."legal_topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_events" ADD CONSTRAINT "error_events_cluster_id_error_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."error_clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_assigned_attorney_fkey" FOREIGN KEY ("assigned_attorney") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "query_feedback" ADD CONSTRAINT "query_feedback_query_id_fkey" FOREIGN KEY ("query_id") REFERENCES "public"."legal_queries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yorha_evidence_nodes" ADD CONSTRAINT "yorha_evidence_nodes_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."yorha_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_ratings" ADD CONSTRAINT "recommendation_ratings_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "public"."ai_recommendations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yorha_evidence_connections" ADD CONSTRAINT "yorha_evidence_connections_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."yorha_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yorha_evidence_connections" ADD CONSTRAINT "yorha_evidence_connections_source_node_id_fkey" FOREIGN KEY ("source_node_id") REFERENCES "public"."yorha_evidence_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yorha_evidence_connections" ADD CONSTRAINT "yorha_evidence_connections_target_node_id_fkey" FOREIGN KEY ("target_node_id") REFERENCES "public"."yorha_evidence_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yorha_chat_sessions" ADD CONSTRAINT "yorha_chat_sessions_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."yorha_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_rag_embeddings" ADD CONSTRAINT "test_rag_embeddings_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."test_rag_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yorha_chat_messages" ADD CONSTRAINT "yorha_chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."yorha_chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_error_patches" ADD CONSTRAINT "route_error_patches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_feedback" ADD CONSTRAINT "error_feedback_suggestion_id_error_suggestions_id_fk" FOREIGN KEY ("suggestion_id") REFERENCES "public"."error_suggestions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_autosaves" ADD CONSTRAINT "canvas_autosaves_canvas_id_fk" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvas_states"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_autosaves" ADD CONSTRAINT "canvas_autosaves_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase72_cluster_summary" ADD CONSTRAINT "phase72_cluster_summary_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "public"."phase72_cluster"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_relationships" ADD CONSTRAINT "evidence_relationships_from_fk" FOREIGN KEY ("from_evidence_id") REFERENCES "public"."evidence"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_relationships" ADD CONSTRAINT "evidence_relationships_to_fk" FOREIGN KEY ("to_evidence_id") REFERENCES "public"."evidence"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_relationships" ADD CONSTRAINT "evidence_relationships_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase72_error_vector" ADD CONSTRAINT "phase72_error_vector_error_id_fkey" FOREIGN KEY ("error_id") REFERENCES "public"."phase72_error"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "graph_edges" ADD CONSTRAINT "graph_edges_from_node_id_fkey" FOREIGN KEY ("from_node_id") REFERENCES "public"."graph_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "graph_edges" ADD CONSTRAINT "graph_edges_to_node_id_fkey" FOREIGN KEY ("to_node_id") REFERENCES "public"."graph_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_chat_turn_id_fkey" FOREIGN KEY ("chat_turn_id") REFERENCES "public"."chat_turns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_entities" ADD CONSTRAINT "document_entities_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "public"."legal_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_uploads" ADD CONSTRAINT "chat_uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_uploads" ADD CONSTRAINT "chat_uploads_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_turn_evidence" ADD CONSTRAINT "fk_chat_turn_evidence_chat_turn" FOREIGN KEY ("chat_turn_id") REFERENCES "public"."chat_turns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_turn_evidence" ADD CONSTRAINT "fk_chat_turn_evidence_evidence" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "fk_evidence_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_chunks" ADD CONSTRAINT "evidence_chunks_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_tags" ADD CONSTRAINT "evidence_tags_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_tags" ADD CONSTRAINT "evidence_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."citation_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_index_metadata" ADD CONSTRAINT "rag_index_metadata_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunk_citations" ADD CONSTRAINT "chunk_citations_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "public"."evidence_chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_chunk_index" ADD CONSTRAINT "rag_chunk_index_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "public"."evidence_chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fix_attempts" ADD CONSTRAINT "fix_attempts_pattern_fingerprint_fkey" FOREIGN KEY ("pattern_fingerprint") REFERENCES "public"."error_patterns"("fingerprint") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_resolution_history" ADD CONSTRAINT "error_resolution_history_pattern_fingerprint_fkey" FOREIGN KEY ("pattern_fingerprint") REFERENCES "public"."error_patterns"("fingerprint") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_tag_links" ADD CONSTRAINT "evidence_tag_links_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_tag_links" ADD CONSTRAINT "evidence_tag_links_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."citation_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunk_tag_links" ADD CONSTRAINT "chunk_tag_links_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "public"."evidence_chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunk_tag_links" ADD CONSTRAINT "chunk_tag_links_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."citation_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_kg_document_id" ON "knowledge_graphs" USING btree ("document_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_kg_entities" ON "knowledge_graphs" USING gin ("entities" jsonb_ops);--> statement-breakpoint
CREATE INDEX "idx_kg_relationships" ON "knowledge_graphs" USING gin ("relationships" jsonb_ops);--> statement-breakpoint
CREATE INDEX "idx_document_topics_doc_id" ON "document_topics" USING btree ("document_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_document_topics_topic_id" ON "document_topics" USING btree ("topic_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_case_activities_case_assigned" ON "case_activities" USING btree ("case_id" uuid_ops,"assigned_to" uuid_ops) WHERE (assigned_to IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_case_activities_case_created" ON "case_activities" USING btree ("case_id" uuid_ops,"created_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_case_activities_case_status" ON "case_activities" USING btree ("case_id" uuid_ops,"status" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_vector_embeddings_cosine" ON "vector_embeddings" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists=10);--> statement-breakpoint
CREATE INDEX "idx_vector_embeddings_embedding_384_ivfflat" ON "vector_embeddings" USING ivfflat ("embedding_384" vector_cosine_ops) WITH (lists=100);--> statement-breakpoint
CREATE INDEX "test_gpu_performance_idx" ON "vector_embeddings" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists=50);--> statement-breakpoint
CREATE INDEX "vector_embeddings_embedding_384_hnsw_idx" ON "vector_embeddings" USING hnsw ("embedding_384" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_legal_topics_embedding" ON "legal_topics" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "legal_topics_embedding_384_hnsw_idx" ON "legal_topics" USING hnsw ("embedding_384" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_evidence_connections_source" ON "evidence_connections" USING btree ("source_evidence_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_evidence_connections_strength" ON "evidence_connections" USING btree ("strength" numeric_ops);--> statement-breakpoint
CREATE INDEX "idx_evidence_connections_target" ON "evidence_connections" USING btree ("target_evidence_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_evidence_connections_type" ON "evidence_connections" USING btree ("connection_type" text_ops);--> statement-breakpoint
CREATE INDEX "document_chunks_document_id_idx" ON "document_chunks" USING btree ("document_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "document_chunks_embedding_384_hnsw_idx" ON "document_chunks" USING hnsw ("embedding_384" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "document_chunks_embedding_hnsw_idx" ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_document_chunks_compound" ON "document_chunks" USING gin ("document_type" jsonb_ops,"metadata" varchar_ops);--> statement-breakpoint
CREATE INDEX "idx_document_chunks_document_id" ON "document_chunks" USING btree ("document_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_document_chunks_embedding" ON "document_chunks" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists=316);--> statement-breakpoint
CREATE INDEX "idx_document_chunks_embedding_hnsw" ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops) WITH (m=16,ef_construction=64);--> statement-breakpoint
CREATE INDEX "idx_document_chunks_index" ON "document_chunks" USING btree ("document_id" uuid_ops,"chunk_index" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_sessions_user" ON "chat_sessions" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_relationships_metadata_gin" ON "document_relationships_jsonb" USING gin ("relationship_metadata" jsonb_ops);--> statement-breakpoint
CREATE INDEX "idx_relationships_source" ON "document_relationships_jsonb" USING btree ("source_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_relationships_strength" ON "document_relationships_jsonb" USING btree ("strength" float4_ops);--> statement-breakpoint
CREATE INDEX "idx_relationships_target" ON "document_relationships_jsonb" USING btree ("target_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_relationships_type" ON "document_relationships_jsonb" USING btree ("relationship_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_error_events_created" ON "error_events" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_error_events_route" ON "error_events" USING btree ("route_path" text_ops);--> statement-breakpoint
CREATE INDEX "idx_route_health_cluster" ON "route_health" USING btree ("route_cluster" text_ops);--> statement-breakpoint
CREATE INDEX "idx_route_health_path" ON "route_health" USING btree ("route_path" text_ops);--> statement-breakpoint
CREATE INDEX "idx_error_suggestions_route" ON "error_suggestions" USING btree ("route_path" text_ops);--> statement-breakpoint
CREATE INDEX "case_embeddings_case_id_idx" ON "case_embeddings_optimized" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "case_embeddings_chunk_idx" ON "case_embeddings_optimized" USING btree ("case_id" uuid_ops,"page_no" uuid_ops,"chunk_no" int4_ops);--> statement-breakpoint
CREATE INDEX "case_embeddings_doc_page_idx" ON "case_embeddings_optimized" USING btree ("doc_id" uuid_ops,"page_no" uuid_ops);--> statement-breakpoint
CREATE INDEX "case_embeddings_optimized_embedding_384_hnsw_idx" ON "case_embeddings_optimized" USING hnsw ("embedding_384" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "case_embeddings_optimized_idx" ON "case_embeddings_optimized" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists=100);--> statement-breakpoint
CREATE INDEX "idx_documents_embedding_hnsw" ON "documents" USING hnsw ("embedding" vector_cosine_ops) WITH (m=16,ef_construction=200);--> statement-breakpoint
CREATE INDEX "idx_documents_uploaded_by" ON "documents" USING btree ("uploaded_by" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_hash_verifications_evidence_verified" ON "hash_verifications" USING btree ("evidence_id" timestamp_ops,"verified_at" timestamp_ops) WHERE (evidence_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "users_active_idx" ON "users" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "users_profile_embedding_hnsw_idx" ON "users" USING hnsw ("profile_embedding" vector_cosine_ops) WITH (m=16,ef_construction=64);--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role" text_ops);--> statement-breakpoint
CREATE INDEX "users_username_idx" ON "users" USING btree ("username" text_ops);--> statement-breakpoint
CREATE INDEX "idx_case_memories_case_id" ON "case_memories" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_case_memories_embedding" ON "case_memories" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists=100);--> statement-breakpoint
CREATE INDEX "cases_assigned_attorney_idx" ON "cases" USING btree ("assigned_attorney" uuid_ops);--> statement-breakpoint
CREATE INDEX "cases_case_embedding_384_hnsw_idx" ON "cases" USING hnsw ("case_embedding_384" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "cases_case_embedding_hnsw_idx" ON "cases" USING hnsw ("case_embedding" vector_cosine_ops) WITH (m=16,ef_construction=64);--> statement-breakpoint
CREATE UNIQUE INDEX "cases_case_number_idx" ON "cases" USING btree ("case_number" text_ops);--> statement-breakpoint
CREATE INDEX "cases_created_at_idx" ON "cases" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "cases_metadata_idx" ON "cases" USING gin ("metadata" jsonb_ops);--> statement-breakpoint
CREATE INDEX "cases_practice_area_idx" ON "cases" USING btree ("practice_area" text_ops);--> statement-breakpoint
CREATE INDEX "cases_status_idx" ON "cases" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_citations_case_key" ON "citations" USING btree ("case_id" bool_ops,"is_key_authority" uuid_ops) WHERE (case_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_citations_doc_relevance" ON "citations" USING btree ("document_id" uuid_ops,"relevance_score" numeric_ops) WHERE (document_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_legal_documents_created" ON "legal_documents" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_legal_documents_practice_area" ON "legal_documents" USING btree ("practice_area" text_ops);--> statement-breakpoint
CREATE INDEX "idx_legal_documents_type" ON "legal_documents" USING btree ("document_type" text_ops);--> statement-breakpoint
CREATE INDEX "legal_documents_case_id_idx" ON "legal_documents" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "legal_documents_content_embedding_hnsw_idx" ON "legal_documents" USING hnsw ("content_embedding" vector_cosine_ops) WITH (m=16,ef_construction=64);--> statement-breakpoint
CREATE INDEX "legal_documents_embedding_384_hnsw_idx" ON "legal_documents" USING hnsw ("embedding_384" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "legal_documents_practice_area_idx" ON "legal_documents" USING btree ("practice_area" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "legal_documents_qdrant_id_idx" ON "legal_documents" USING btree ("qdrant_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "legal_documents_status_idx" ON "legal_documents" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "legal_documents_summary_embedding_hnsw_idx" ON "legal_documents" USING hnsw ("summary_embedding" vector_cosine_ops) WITH (m=16,ef_construction=64);--> statement-breakpoint
CREATE INDEX "legal_documents_title_embedding_hnsw_idx" ON "legal_documents" USING hnsw ("title_embedding" vector_cosine_ops) WITH (m=16,ef_construction=64);--> statement-breakpoint
CREATE INDEX "legal_documents_title_idx" ON "legal_documents" USING btree ("title" text_ops);--> statement-breakpoint
CREATE INDEX "legal_documents_type_idx" ON "legal_documents" USING btree ("document_type" text_ops);--> statement-breakpoint
CREATE INDEX "legal_documents_user_id_idx" ON "legal_documents" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_rag_sessions_user_active" ON "rag_sessions" USING btree ("user_id" timestamp_ops,"is_active" bool_ops,"updated_at" uuid_ops) WHERE (user_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "vector_operations_entity_id_idx" ON "vector_operations" USING btree ("entity_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "vector_operations_entity_type_idx" ON "vector_operations" USING btree ("entity_type" text_ops);--> statement-breakpoint
CREATE INDEX "vector_operations_operation_type_idx" ON "vector_operations" USING btree ("operation_type" text_ops);--> statement-breakpoint
CREATE INDEX "vector_operations_qdrant_synced_idx" ON "vector_operations" USING btree ("qdrant_synced" bool_ops);--> statement-breakpoint
CREATE INDEX "vector_operations_status_idx" ON "vector_operations" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_pois_case_status" ON "persons_of_interest" USING btree ("case_id" uuid_ops,"status" text_ops) WHERE (case_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_pois_case_threat" ON "persons_of_interest" USING btree ("case_id" uuid_ops,"threat_level" uuid_ops) WHERE (case_id IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "qdrant_collections_name_idx" ON "qdrant_collections" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "qdrant_collections_status_idx" ON "qdrant_collections" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_legal_cases_decision_date" ON "legal_cases" USING btree ("decision_date" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_legal_cases_embedding" ON "legal_cases" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_legal_cases_jurisdiction" ON "legal_cases" USING btree ("jurisdiction" text_ops);--> statement-breakpoint
CREATE INDEX "legal_cases_embedding_384_hnsw_idx" ON "legal_cases" USING hnsw ("embedding_384" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ai_config_key" ON "ai_config" USING btree ("config_key" text_ops) WHERE (is_active = true);--> statement-breakpoint
CREATE INDEX "test_rag_documents_created_at_idx" ON "test_rag_documents" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "test_rag_documents_legal_analysis_idx" ON "test_rag_documents" USING gin ("legal_analysis" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX "test_rag_documents_metadata_idx" ON "test_rag_documents" USING gin ("metadata" jsonb_path_ops);--> statement-breakpoint
CREATE INDEX "idx_legal_queries_model_used" ON "legal_queries" USING btree ("model_used" text_ops);--> statement-breakpoint
CREATE INDEX "idx_legal_queries_status" ON "legal_queries" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_legal_queries_timestamp" ON "legal_queries" USING btree ("timestamp" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_rag_content_hash" ON "rag_documents" USING btree ("content_hash" text_ops);--> statement-breakpoint
CREATE INDEX "idx_rag_embedding" ON "rag_documents" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_rag_embedding_384" ON "rag_documents" USING hnsw ("embedding_384" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "rag_documents_embedding_384_hnsw_idx" ON "rag_documents" USING hnsw ("embedding_384" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "yorha_evidence_nodes_case_id_idx" ON "yorha_evidence_nodes" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "yorha_evidence_nodes_created_by_idx" ON "yorha_evidence_nodes" USING btree ("created_by" uuid_ops);--> statement-breakpoint
CREATE INDEX "yorha_evidence_nodes_type_idx" ON "yorha_evidence_nodes" USING btree ("evidence_type" text_ops);--> statement-breakpoint
CREATE INDEX "embeddings_embedding_384_hnsw_idx" ON "embeddings" USING hnsw ("embedding_384" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_embeddings_created_at" ON "embeddings" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_embeddings_document_type" ON "embeddings" USING btree ("document_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_embeddings_embedding" ON "embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_embeddings_metadata_gin" ON "embeddings" USING gin ("metadata" jsonb_ops);--> statement-breakpoint
CREATE INDEX "idx_embeddings_model" ON "embeddings" USING btree ("model" text_ops);--> statement-breakpoint
CREATE INDEX "idx_embeddings_model_created" ON "embeddings" USING btree ("model" text_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_embeddings_text_hash" ON "embeddings" USING btree ("text_hash" text_ops);--> statement-breakpoint
CREATE INDEX "idx_embeddings_type_model" ON "embeddings" USING btree ("document_type" text_ops,"model" text_ops);--> statement-breakpoint
CREATE INDEX "idx_embeddings_updated_at" ON "embeddings" USING btree ("updated_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_embeddings_vector_cosine" ON "embeddings" USING hnsw ("embedding" vector_cosine_ops) WITH (m=16,ef_construction=64);--> statement-breakpoint
CREATE INDEX "idx_embeddings_vector_ip" ON "embeddings" USING hnsw ("embedding" vector_ip_ops) WITH (m=16,ef_construction=64);--> statement-breakpoint
CREATE INDEX "idx_embeddings_vector_l2" ON "embeddings" USING hnsw ("embedding" vector_l2_ops) WITH (m=16,ef_construction=64);--> statement-breakpoint
CREATE INDEX "yorha_cases_case_number_idx" ON "yorha_cases" USING btree ("case_number" text_ops);--> statement-breakpoint
CREATE INDEX "yorha_cases_created_by_idx" ON "yorha_cases" USING btree ("created_by" uuid_ops);--> statement-breakpoint
CREATE INDEX "yorha_cases_status_idx" ON "yorha_cases" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_case_embeddings_case" ON "case_embeddings" USING btree ("case_id" uuid_ops) WHERE (case_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "code_embeddings_embedding_384_hnsw_idx" ON "code_embeddings" USING hnsw ("embedding_384" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_code_embeddings_embedding" ON "code_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_code_embeddings_errors" ON "code_embeddings" USING gin ("error_patterns" array_ops);--> statement-breakpoint
CREATE INDEX "idx_code_embeddings_path" ON "code_embeddings" USING btree ("path" text_ops);--> statement-breakpoint
CREATE INDEX "idx_recommendation_ratings_recommendation_id" ON "recommendation_ratings" USING btree ("recommendation_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_recommendation_ratings_user_id" ON "recommendation_ratings" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "legal_documents_extracted_embedding_384_hnsw_idx" ON "legal_documents_extracted" USING hnsw ("embedding_384" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_detective_analysis_case_id" ON "detective_analysis" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_detective_analysis_created_at" ON "detective_analysis" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_detective_analysis_query_data" ON "detective_analysis" USING gin ("query_data" jsonb_ops);--> statement-breakpoint
CREATE INDEX "idx_detective_analysis_results" ON "detective_analysis" USING gin ("results" jsonb_ops);--> statement-breakpoint
CREATE INDEX "idx_detective_analysis_type" ON "detective_analysis" USING btree ("analysis_type" text_ops);--> statement-breakpoint
CREATE INDEX "yorha_evidence_connections_case_id_idx" ON "yorha_evidence_connections" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "yorha_evidence_connections_source_idx" ON "yorha_evidence_connections" USING btree ("source_node_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "yorha_evidence_connections_target_idx" ON "yorha_evidence_connections" USING btree ("target_node_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "yorha_evidence_connections_type_idx" ON "yorha_evidence_connections" USING btree ("connection_type" text_ops);--> statement-breakpoint
CREATE INDEX "yorha_chat_sessions_case_id_idx" ON "yorha_chat_sessions" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "yorha_chat_sessions_status_idx" ON "yorha_chat_sessions" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "yorha_chat_sessions_user_id_idx" ON "yorha_chat_sessions" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "test_rag_embeddings_document_id_idx" ON "test_rag_embeddings" USING btree ("document_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "test_rag_embeddings_embedding_384_hnsw_idx" ON "test_rag_embeddings" USING hnsw ("embedding_384" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "test_rag_embeddings_vector_idx" ON "test_rag_embeddings" USING hnsw ("embedding" vector_cosine_ops) WITH (m=16,ef_construction=64);--> statement-breakpoint
CREATE INDEX "chat_messages_embedding_384_hnsw_idx" ON "chat_messages" USING hnsw ("embedding_384" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_embeddings_hnsw" ON "chat_messages" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_messages_created" ON "chat_messages" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_messages_session" ON "chat_messages" USING btree ("session_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_messages_user" ON "chat_messages" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_kb_embedding" ON "knowledge_base" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_kb_embedding_384" ON "knowledge_base" USING hnsw ("embedding_384" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_kb_source" ON "knowledge_base" USING btree ("source_file" text_ops);--> statement-breakpoint
CREATE INDEX "idx_kb_type" ON "knowledge_base" USING btree ("chunk_type" text_ops);--> statement-breakpoint
CREATE INDEX "knowledge_base_embedding_384_hnsw_idx" ON "knowledge_base" USING hnsw ("embedding_384" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "yorha_chat_messages_created_at_idx" ON "yorha_chat_messages" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "yorha_chat_messages_role_idx" ON "yorha_chat_messages" USING btree ("role" text_ops);--> statement-breakpoint
CREATE INDEX "yorha_chat_messages_session_id_idx" ON "yorha_chat_messages" USING btree ("session_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_route_patches_error_code" ON "route_error_patches" USING btree ("error_code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_route_patches_route" ON "route_error_patches" USING btree ("route_path" text_ops);--> statement-breakpoint
CREATE INDEX "idx_route_patches_status" ON "route_error_patches" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "yorha_system_metrics_recorded_at_idx" ON "yorha_system_metrics" USING btree ("recorded_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_error_feedback_route" ON "error_feedback" USING btree ("route_path" text_ops);--> statement-breakpoint
CREATE INDEX "idx_error_feedback_suggestion" ON "error_feedback" USING btree ("suggestion_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_error_clusters_severity" ON "error_clusters" USING btree ("severity" text_ops);--> statement-breakpoint
CREATE INDEX "canvas_autosaves_canvas_created_idx" ON "canvas_autosaves" USING btree ("canvas_id" uuid_ops,"created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "canvas_autosaves_canvas_id_idx" ON "canvas_autosaves" USING btree ("canvas_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "canvas_autosaves_user_id_idx" ON "canvas_autosaves" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_embeddings_path" ON "document_embeddings" USING btree ("path" text_ops);--> statement-breakpoint
CREATE INDEX "idx_embeddings_timestamp" ON "document_embeddings" USING btree ("timestamp" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_phase72_cluster_label" ON "phase72_cluster" USING btree ("label" text_ops);--> statement-breakpoint
CREATE INDEX "idx_phase72_cluster_phase_cycle" ON "phase72_cluster" USING btree ("phase" int4_ops,"cycle" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_phase72_cluster_summary_cluster" ON "phase72_cluster_summary" USING btree ("cluster_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_timeline_case_id" ON "timeline_events" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_timeline_timestamp" ON "timeline_events" USING btree ("timestamp" timestamp_ops);--> statement-breakpoint
CREATE INDEX "evidence_relationships_case_id_idx" ON "evidence_relationships" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "evidence_relationships_from_idx" ON "evidence_relationships" USING btree ("from_evidence_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "evidence_relationships_to_idx" ON "evidence_relationships" USING btree ("to_evidence_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_evidence_rel_from" ON "evidence_relationships" USING btree ("from_evidence_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_evidence_rel_to" ON "evidence_relationships" USING btree ("to_evidence_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_phase72_vector_ivf" ON "phase72_error_vector" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists=100);--> statement-breakpoint
CREATE INDEX "idx_canvas_states_case_default" ON "canvas_states" USING btree ("case_id" bool_ops,"is_default" bool_ops) WHERE (case_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_file_summaries_fts" ON "file_summaries" USING gin (to_tsvector('english'::regconfig, summary) tsvector_ops);--> statement-breakpoint
CREATE INDEX "idx_file_summaries_path" ON "file_summaries" USING btree ("path" text_ops);--> statement-breakpoint
CREATE INDEX "idx_file_summaries_updated" ON "file_summaries" USING btree ("updated_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_graph_nodes_case_id" ON "graph_nodes" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_graph_nodes_node_id" ON "graph_nodes" USING btree ("node_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_graph_edges_case_id" ON "graph_edges" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_graph_edges_from" ON "graph_edges" USING btree ("from_node_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_graph_edges_to" ON "graph_edges" USING btree ("to_node_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_legal_docs_confidentiality" ON "legal_documents_jsonb" USING btree ("confidentiality_level" text_ops);--> statement-breakpoint
CREATE INDEX "idx_legal_docs_content_embedding" ON "legal_documents_jsonb" USING ivfflat ("content_embedding" vector_cosine_ops) WITH (lists=100);--> statement-breakpoint
CREATE INDEX "idx_legal_docs_document_type" ON "legal_documents_jsonb" USING btree ("document_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_legal_docs_jurisdiction" ON "legal_documents_jsonb" USING btree ("jurisdiction" text_ops);--> statement-breakpoint
CREATE INDEX "idx_legal_docs_metadata_gin" ON "legal_documents_jsonb" USING gin ("metadata" jsonb_ops);--> statement-breakpoint
CREATE INDEX "idx_legal_docs_practice_area" ON "legal_documents_jsonb" USING btree ("practice_area" text_ops);--> statement-breakpoint
CREATE INDEX "idx_legal_docs_search_vector" ON "legal_documents_jsonb" USING gin ("search_vector" tsvector_ops);--> statement-breakpoint
CREATE INDEX "idx_legal_docs_title_embedding" ON "legal_documents_jsonb" USING ivfflat ("title_embedding" vector_cosine_ops) WITH (lists=100);--> statement-breakpoint
CREATE INDEX "idx_case_timeline_case_id" ON "case_timeline" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_case_timeline_event_date" ON "case_timeline" USING btree ("event_date" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_case_timeline_event_type" ON "case_timeline" USING btree ("event_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_error_timeline_event" ON "error_timeline" USING btree ("event_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_error_timeline_route" ON "error_timeline" USING btree ("route_path" text_ops);--> statement-breakpoint
CREATE INDEX "idx_phase72_error_code" ON "phase72_error" USING btree ("code" text_ops);--> statement-breakpoint
CREATE INDEX "idx_phase72_error_code_severity" ON "phase72_error" USING btree ("code" text_ops,"severity" text_ops);--> statement-breakpoint
CREATE INDEX "idx_phase72_error_created" ON "phase72_error" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_phase72_error_file" ON "phase72_error" USING btree ("file_path" text_ops);--> statement-breakpoint
CREATE INDEX "idx_phase72_error_hash" ON "phase72_error" USING btree ("error_hash" text_ops);--> statement-breakpoint
CREATE INDEX "idx_phase72_error_phase_cycle" ON "phase72_error" USING btree ("phase" int4_ops,"cycle" int4_ops);--> statement-breakpoint
CREATE INDEX "phase72_error_embedding_idx" ON "phase72_error" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists=100);--> statement-breakpoint
CREATE INDEX "phase72_error_last_seen_idx" ON "phase72_error" USING btree ("last_seen" timestamp_ops);--> statement-breakpoint
CREATE INDEX "phase72_error_occurrence_idx" ON "phase72_error" USING btree ("occurrence_count" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_evidence_files_case_id" ON "evidence_files" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_evidence_files_chat_turn_id" ON "evidence_files" USING btree ("chat_turn_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "uploads_case_id_idx" ON "uploads" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "uploads_filename_idx" ON "uploads" USING btree ("original_filename" text_ops);--> statement-breakpoint
CREATE INDEX "uploads_user_id_idx" ON "uploads" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_document_entities_doc_id" ON "document_entities" USING btree ("document_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_document_entities_entity_id" ON "document_entities" USING btree ("entity_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_recommendations_case_id" ON "ai_recommendations" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_recommendations_priority" ON "ai_recommendations" USING btree ("priority" text_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_recommendations_status" ON "ai_recommendations" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_recommendations_suggested_actions" ON "ai_recommendations" USING gin ("suggested_actions" jsonb_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_recommendations_supporting_evidence" ON "ai_recommendations" USING gin ("supporting_evidence" jsonb_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_recommendations_tags" ON "ai_recommendations" USING gin ("tags" jsonb_ops);--> statement-breakpoint
CREATE INDEX "idx_ai_recommendations_type" ON "ai_recommendations" USING btree ("type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_model_performance_model" ON "model_performance" USING btree ("model_name" text_ops,"date" text_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_uploads_case_id" ON "chat_uploads" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_uploads_created_at" ON "chat_uploads" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_uploads_key_phrases" ON "chat_uploads" USING gin ("key_phrases" array_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_uploads_keywords" ON "chat_uploads" USING gin ("extracted_keywords" array_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_uploads_user_id" ON "chat_uploads" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_turns_case_created" ON "chat_turns" USING btree ("case_id" timestamptz_ops,"created_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_turns_case_id" ON "chat_turns" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_turns_created_at" ON "chat_turns" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_turns_key_phrases" ON "chat_turns" USING gin ("key_phrases" array_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_turns_keywords" ON "chat_turns" USING gin ("extracted_keywords" array_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_turn_evidence_chat_turn" ON "chat_turn_evidence" USING btree ("chat_turn_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_turn_evidence_evidence" ON "chat_turn_evidence" USING btree ("evidence_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_chat_turn_evidence_role" ON "chat_turn_evidence" USING btree ("role" text_ops);--> statement-breakpoint
CREATE INDEX "idx_evidence_ai_tags" ON "evidence" USING gin ("ai_tags" jsonb_ops);--> statement-breakpoint
CREATE INDEX "idx_evidence_case_id" ON "evidence" USING btree ("case_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_evidence_evidence_type" ON "evidence" USING btree ("evidence_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_evidence_number" ON "evidence" USING btree ("evidence_number" text_ops);--> statement-breakpoint
CREATE INDEX "idx_evidence_tags" ON "evidence" USING gin ("tags" jsonb_ops);--> statement-breakpoint
CREATE INDEX "idx_evidence_uploaded_at" ON "evidence" USING btree ("uploaded_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_evidence_uploaded_by" ON "evidence" USING btree ("uploaded_by" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_evidence_chunks_chunk_index" ON "evidence_chunks" USING btree ("evidence_id" int4_ops,"chunk_index" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_evidence_chunks_evidence_id" ON "evidence_chunks" USING btree ("evidence_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_evidence_tags_evidence_id" ON "evidence_tags" USING btree ("evidence_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_evidence_tags_tag_id" ON "evidence_tags" USING btree ("tag_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_rag_index_metadata_chunk_id" ON "rag_index_metadata" USING btree ("chunk_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_rag_index_metadata_evidence_id" ON "rag_index_metadata" USING btree ("evidence_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_rag_index_metadata_jurisdiction" ON "rag_index_metadata" USING btree ("jurisdiction" text_ops);--> statement-breakpoint
CREATE INDEX "idx_citation_tags_jurisdiction" ON "citation_tags" USING btree ("jurisdiction" text_ops);--> statement-breakpoint
CREATE INDEX "idx_citation_tags_name_trgm" ON "citation_tags" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_citation_tags_namespace" ON "citation_tags" USING btree ("namespace" text_ops);--> statement-breakpoint
CREATE INDEX "idx_citation_tags_synonyms_gin" ON "citation_tags" USING gin ("synonyms" array_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_citation_tags_unique" ON "citation_tags" USING btree (namespace text_ops,name text_ops,COALESCE(jurisdiction, ''::text) text_ops);--> statement-breakpoint
CREATE INDEX "idx_chunk_citations_chunk_id" ON "chunk_citations" USING btree ("chunk_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_chunk_citations_cite_text_trgm" ON "chunk_citations" USING gin ("cite_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_rag_chunk_index_collection" ON "rag_chunk_index" USING btree ("collection" text_ops);--> statement-breakpoint
CREATE INDEX "idx_error_patterns_category" ON "error_patterns" USING btree ("category" text_ops);--> statement-breakpoint
CREATE INDEX "idx_error_patterns_cluster" ON "error_patterns" USING btree ("cluster_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_error_patterns_embedding" ON "error_patterns" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists=100);--> statement-breakpoint
CREATE INDEX "idx_fix_attempts_pattern" ON "fix_attempts" USING btree ("pattern_fingerprint" text_ops);--> statement-breakpoint
CREATE INDEX "idx_fix_attempts_success" ON "fix_attempts" USING btree ("success" bool_ops) WHERE (success = true);--> statement-breakpoint
CREATE INDEX "idx_resolution_history_date" ON "error_resolution_history" USING btree ("snapshot_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_doc_references_embedding" ON "doc_references" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_evidence_tag_links_evidence_id" ON "evidence_tag_links" USING btree ("evidence_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_evidence_tag_links_tag_id" ON "evidence_tag_links" USING btree ("tag_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_chunk_tag_links_chunk_id" ON "chunk_tag_links" USING btree ("chunk_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_chunk_tag_links_tag_id" ON "chunk_tag_links" USING btree ("tag_id" uuid_ops);--> statement-breakpoint
CREATE VIEW "public"."vector_index_stats" AS (SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size, pg_stat_get_numscans(indexname::regclass::oid) AS scans, pg_stat_get_tuples_returned(indexname::regclass::oid) AS tuples_read, pg_stat_get_tuples_fetched(indexname::regclass::oid) AS tuples_fetched FROM pg_indexes WHERE tablename = 'embeddings'::name AND indexname ~~ '%vector%'::text);--> statement-breakpoint
CREATE VIEW "public"."legal_document_analytics" AS (SELECT document_type, practice_area, jurisdiction, confidentiality_level, count(*) AS document_count, avg( CASE WHEN (((metadata -> 'aiMetadata'::text) ->> 'confidence'::text)::real) IS NOT NULL THEN ((metadata -> 'aiMetadata'::text) ->> 'confidence'::text)::real ELSE NULL::real END) AS avg_ai_confidence, count( CASE WHEN (((metadata -> 'aiMetadata'::text) ->> 'humanVerified'::text)::boolean) = true THEN 1 ELSE NULL::integer END) AS human_verified_count, max(created_at) AS latest_document, min(created_at) AS earliest_document FROM legal_documents_jsonb GROUP BY document_type, practice_area, jurisdiction, confidentiality_level);--> statement-breakpoint
CREATE VIEW "public"."citation_network" AS (SELECT d.id AS document_id, d.title AS document_title, d.document_type, citation.value ->> 'type'::text AS citation_type, citation.value ->> 'citation'::text AS cited_document, (citation.value ->> 'relevance'::text)::real AS relevance_score FROM legal_documents_jsonb d, LATERAL jsonb_array_elements(d.metadata -> 'citations'::text) citation(value) WHERE (d.metadata -> 'citations'::text) IS NOT NULL);--> statement-breakpoint
CREATE VIEW "public"."phase72_error_stats" AS (SELECT code, severity, count(*) AS count, min(created_at) AS first_seen, max(created_at) AS last_seen FROM phase72_error GROUP BY code, severity ORDER BY (count(*)) DESC);--> statement-breakpoint
CREATE VIEW "public"."phase72_route_errors" AS (SELECT file_path, count(*) AS error_count, min(created_at) AS first_seen, max(created_at) AS last_seen FROM phase72_error GROUP BY file_path ORDER BY (count(*)) DESC);--> statement-breakpoint
CREATE VIEW "public"."phase72_cluster_quality" AS (SELECT c.id, c.label, c.size, c.cycle, c.created_at, cs.id IS NOT NULL AS has_summary FROM phase72_cluster c LEFT JOIN phase72_cluster_summary cs ON cs.cluster_id = c.id);--> statement-breakpoint
CREATE VIEW "public"."phase72_error_summary" AS (SELECT code, severity, count(*) AS error_count, count(DISTINCT file_path) AS affected_files, max(created_at) AS last_seen FROM phase72_error GROUP BY code, severity ORDER BY (count(*)) DESC);
*/