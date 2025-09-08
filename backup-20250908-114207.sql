--
-- PostgreSQL database dump
--

\restrict dXIsDMq5z1jdhcceBqPdfcMqSdBCiyboO6EP2q4SlVyyWmvvrkLIYnNbX67sxJ2

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: btree_gin; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gin WITH SCHEMA public;


--
-- Name: EXTENSION btree_gin; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION btree_gin IS 'support for indexing common datatypes in GIN';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: calculate_temporal_score(timestamp with time zone, integer); Type: FUNCTION; Schema: public; Owner: legal_admin
--

CREATE FUNCTION public.calculate_temporal_score(created_at timestamp with time zone, half_life_days integer DEFAULT 30) RETURNS numeric
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    RETURN GREATEST(0.05, EXP(-LN(2) * EXTRACT(EPOCH FROM (NOW() - created_at)) / (24 * 3600 * half_life_days)));
END;
$$;


ALTER FUNCTION public.calculate_temporal_score(created_at timestamp with time zone, half_life_days integer) OWNER TO legal_admin;

--
-- Name: cleanup_expired_tensors(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_expired_tensors() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Archive expired tensors
    UPDATE tensor_metadata 
    SET status = 'archived'
    WHERE expires_at < NOW() AND status = 'active';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete expired similarity search cache
    DELETE FROM similarity_search_cache WHERE expires_at < NOW();
    
    -- Clean up old job history (keep last 30 days)
    DELETE FROM tensor_processing_jobs 
    WHERE status IN ('completed', 'failed') 
        AND completed_at < NOW() - INTERVAL '30 days';
    
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION public.cleanup_expired_tensors() OWNER TO postgres;

--
-- Name: cosine_similarity(public.vector, public.vector); Type: FUNCTION; Schema: public; Owner: legal_admin
--

CREATE FUNCTION public.cosine_similarity(a public.vector, b public.vector) RETURNS double precision
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      SELECT 1 - (a <=> b)
      $$;


ALTER FUNCTION public.cosine_similarity(a public.vector, b public.vector) OWNER TO legal_admin;

--
-- Name: create_vector_for_evidence(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_vector_for_evidence() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO vectors (owner_type, owner_id, embedding, payload)
  VALUES (
    'evidence',
    NEW.id,
    (SELECT ARRAY(SELECT 0.0 FROM generate_series(1, 768))::vector),
    jsonb_build_object('filename', NEW.filename, 'caseId', NEW.case_id)
  );
  PERFORM pg_notify('evidence_inserted', json_build_object('id', NEW.id, 'caseId', NEW.case_id)::text);
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.create_vector_for_evidence() OWNER TO postgres;

--
-- Name: create_vector_for_report(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_vector_for_report() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO vectors (owner_type, owner_id, embedding, payload)
  VALUES (
    'report',
    NEW.id,
    (SELECT ARRAY(SELECT 0.0 FROM generate_series(1, 768))::vector),
    jsonb_build_object('title', NEW.title, 'caseId', NEW.case_id)
  );
  PERFORM pg_notify('report_inserted', json_build_object('id', NEW.id, 'caseId', NEW.case_id)::text);
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.create_vector_for_report() OWNER TO postgres;

--
-- Name: find_similar_documents(public.vector, real, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.find_similar_documents(query_embedding public.vector, similarity_threshold real DEFAULT 0.7, max_results integer DEFAULT 10) RETURNS TABLE(document_id uuid, document_title text, similarity real, case_number character varying, case_title text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.document_title,
        1 - (d.embedding <=> query_embedding) AS similarity,
        c.case_number,
        c.case_title
    FROM legal_documents d
    LEFT JOIN legal_cases c ON d.case_id = c.id
    WHERE d.embedding IS NOT NULL
        AND 1 - (d.embedding <=> query_embedding) >= similarity_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT max_results;
END;
$$;


ALTER FUNCTION public.find_similar_documents(query_embedding public.vector, similarity_threshold real, max_results integer) OWNER TO postgres;

--
-- Name: find_similar_shaders(public.vector, real, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.find_similar_shaders(query_embedding public.vector, similarity_threshold real DEFAULT 0.7, max_results integer DEFAULT 10) RETURNS TABLE(shader_id uuid, shader_key character varying, similarity real, shader_type character varying, legal_context character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.shader_key,
        1 - (s.source_embedding <=> query_embedding) AS similarity,
        s.shader_type,
        s.legal_context
    FROM shader_cache_entries s
    WHERE s.source_embedding IS NOT NULL
        AND 1 - (s.source_embedding <=> query_embedding) >= similarity_threshold
    ORDER BY s.source_embedding <=> query_embedding
    LIMIT max_results;
END;
$$;


ALTER FUNCTION public.find_similar_shaders(query_embedding public.vector, similarity_threshold real, max_results integer) OWNER TO postgres;

--
-- Name: get_shader_recommendations(uuid, character varying, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_shader_recommendations(p_user_id uuid, p_current_workflow character varying DEFAULT NULL::character varying, p_limit integer DEFAULT 5) RETURNS TABLE(shader_id uuid, shader_key character varying, recommendation_score real, recommendation_reason text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH user_patterns AS (
        SELECT 
            sup.shader_cache_id,
            COUNT(*) as usage_count,
            AVG(sup.user_satisfaction) as avg_satisfaction,
            AVG(sup.reward) as avg_reward
        FROM shader_user_patterns sup
        WHERE sup.user_id = p_user_id
            AND (p_current_workflow IS NULL OR sup.workflow_step = p_current_workflow)
            AND sup.access_timestamp > NOW() - INTERVAL '30 days'
        GROUP BY sup.shader_cache_id
    ),
    shader_scores AS (
        SELECT 
            s.id,
            s.shader_key,
            COALESCE(up.usage_count, 0) * 0.3 +
            COALESCE(up.avg_satisfaction, 0) * 0.4 +
            COALESCE(up.avg_reward, 0) * 0.2 +
            (s.access_count / 1000.0) * 0.1 as score,
            CASE 
                WHEN up.usage_count > 0 THEN 'Previously used with good results'
                WHEN s.access_count > 100 THEN 'Popular shader'
                ELSE 'Recommended based on context'
            END as reason
        FROM shader_cache_entries s
        LEFT JOIN user_patterns up ON s.id = up.shader_cache_id
        WHERE s.deprecated = false
    )
    SELECT 
        ss.id,
        ss.shader_key,
        ss.score,
        ss.reason
    FROM shader_scores ss
    ORDER BY ss.score DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION public.get_shader_recommendations(p_user_id uuid, p_current_workflow character varying, p_limit integer) OWNER TO postgres;

--
-- Name: get_similar_documents(public.vector, real, integer); Type: FUNCTION; Schema: public; Owner: legal_admin
--

CREATE FUNCTION public.get_similar_documents(query_embedding public.vector, similarity_threshold real DEFAULT 0.7, result_limit integer DEFAULT 10) RETURNS TABLE(id uuid, title character varying, similarity real, document_type character varying, practice_area character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        cosine_similarity(d.content_embedding, query_embedding) as similarity,
        d.document_type,
        d.practice_area
    FROM legal_documents d
    WHERE d.content_embedding IS NOT NULL
        AND d.deleted_at IS NULL
        AND d.status = 'active'
        AND cosine_similarity(d.content_embedding, query_embedding) >= similarity_threshold
    ORDER BY d.content_embedding <=> query_embedding
    LIMIT result_limit;
END;
$$;


ALTER FUNCTION public.get_similar_documents(query_embedding public.vector, similarity_threshold real, result_limit integer) OWNER TO legal_admin;

--
-- Name: get_tensor_queue_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_tensor_queue_stats() RETURNS TABLE(status character varying, count bigint, avg_processing_time real, avg_queue_wait_time real)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.status,
        COUNT(*),
        AVG(j.processing_time_ms),
        AVG(EXTRACT(EPOCH FROM (j.started_at - j.queued_at)) * 1000)
    FROM tensor_processing_jobs j
    WHERE j.created_at > NOW() - INTERVAL '24 hours'
    GROUP BY j.status
    ORDER BY 
        CASE j.status 
            WHEN 'running' THEN 1
            WHEN 'pending' THEN 2
            WHEN 'completed' THEN 3
            WHEN 'failed' THEN 4
            ELSE 5
        END;
END;
$$;


ALTER FUNCTION public.get_tensor_queue_stats() OWNER TO postgres;

--
-- Name: notify_case_changes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.notify_case_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_notify('cases_changed', json_build_object('action', 'insert', 'id', NEW.id, 'userId', NEW.user_id)::text);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM pg_notify('cases_changed', json_build_object('action', 'update', 'id', NEW.id, 'userId', NEW.user_id)::text);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM pg_notify('cases_changed', json_build_object('action', 'delete', 'id', OLD.id, 'userId', OLD.user_id)::text);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION public.notify_case_changes() OWNER TO postgres;

--
-- Name: notify_report_changes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.notify_report_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_notify('reports_changed', json_build_object('action', 'insert', 'id', NEW.id, 'caseId', NEW.case_id)::text);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM pg_notify('reports_changed', json_build_object('action', 'update', 'id', NEW.id, 'caseId', NEW.case_id)::text);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM pg_notify('reports_changed', json_build_object('action', 'delete', 'id', OLD.id, 'caseId', OLD.case_id)::text);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION public.notify_report_changes() OWNER TO postgres;

--
-- Name: search_cases(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.search_cases(search_query text) RETURNS TABLE(id uuid, title character varying, case_number character varying, court character varying, case_type character varying, description text, rank real)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        c.case_number,
        c.court,
        c.case_type,
        c.description,
        ts_rank(to_tsvector('english', c.title || ' ' || COALESCE(c.description, '')), plainto_tsquery('english', search_query)) AS rank
    FROM cases c
    WHERE to_tsvector('english', c.title || ' ' || COALESCE(c.description, '')) @@ plainto_tsquery('english', search_query)
    ORDER BY rank DESC;
END;
$$;


ALTER FUNCTION public.search_cases(search_query text) OWNER TO postgres;

--
-- Name: update_last_accessed(); Type: FUNCTION; Schema: public; Owner: legal_admin
--

CREATE FUNCTION public.update_last_accessed() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.last_accessed = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_last_accessed() OWNER TO legal_admin;

--
-- Name: update_processing_stats(); Type: FUNCTION; Schema: public; Owner: legal_admin
--

CREATE FUNCTION public.update_processing_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.indexed_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_processing_stats() OWNER TO legal_admin;

--
-- Name: update_shader_access_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_shader_access_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE shader_cache_entries 
    SET 
        access_count = access_count + 1,
        last_accessed_at = NOW()
    WHERE id = NEW.shader_cache_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_shader_access_stats() OWNER TO postgres;

--
-- Name: update_tensor_access_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_tensor_access_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE tensor_metadata 
    SET 
        cache_hit_count = cache_hit_count + 1,
        last_accessed_at = NOW()
    WHERE id = NEW.tensor_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_tensor_access_stats() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: legal_admin
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO legal_admin;

--
-- Name: update_vectors_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_vectors_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_vectors_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_engine_status; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_engine_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    engine_name text NOT NULL,
    is_online boolean DEFAULT false,
    last_health_check timestamp without time zone DEFAULT now(),
    response_time integer,
    version text,
    capabilities jsonb,
    configuration jsonb,
    error_status text,
    metadata jsonb
);


ALTER TABLE public.ai_engine_status OWNER TO postgres;

--
-- Name: ai_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text,
    prompt text,
    response text,
    embedding text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.ai_history OWNER TO postgres;

--
-- Name: case_summary_vectors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.case_summary_vectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    summary text NOT NULL,
    embedding public.vector(384) NOT NULL,
    confidence real DEFAULT 1,
    last_updated timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.case_summary_vectors OWNER TO postgres;

--
-- Name: cases; Type: TABLE; Schema: public; Owner: legal_admin
--

CREATE TABLE public.cases (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(500) NOT NULL,
    description text,
    case_number character varying(100),
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    practice_area character varying(100),
    jurisdiction character varying(100),
    court character varying(200),
    client_name character varying(200),
    opposing_party character varying(200),
    assigned_attorney uuid,
    filing_date timestamp with time zone,
    due_date timestamp with time zone,
    closed_date timestamp with time zone,
    case_embedding public.vector(384),
    qdrant_id uuid,
    qdrant_collection character varying(100) DEFAULT 'cases'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cases OWNER TO legal_admin;

--
-- Name: document_chunks; Type: TABLE; Schema: public; Owner: legal_admin
--

CREATE TABLE public.document_chunks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    document_type character varying(50) NOT NULL,
    chunk_index integer NOT NULL,
    content text NOT NULL,
    embedding public.vector(768) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.document_chunks OWNER TO legal_admin;

--
-- Name: document_vectors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_vectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    chunk_index integer NOT NULL,
    content text NOT NULL,
    embedding public.vector(384) NOT NULL,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.document_vectors OWNER TO postgres;

--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    uuid character varying(36) NOT NULL,
    case_id integer NOT NULL,
    filename character varying(255) NOT NULL,
    original_name character varying(255) NOT NULL,
    content_type character varying(100) NOT NULL,
    file_size integer NOT NULL,
    minio_path character varying(500) NOT NULL,
    extracted_text text,
    processing_status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    processing_error text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: error_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.error_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message text NOT NULL,
    stack_trace text,
    embedding real[],
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.error_logs OWNER TO postgres;

--
-- Name: evidence_vectors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.evidence_vectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    evidence_id uuid NOT NULL,
    chunk_index integer NOT NULL,
    content text NOT NULL,
    embedding public.vector(384) NOT NULL,
    analysis_type text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.evidence_vectors OWNER TO postgres;

--
-- Name: extracted_entities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.extracted_entities (
    id integer NOT NULL,
    document_id integer NOT NULL,
    chunk_id integer,
    entity_type character varying(50) NOT NULL,
    entity_value text NOT NULL,
    confidence real NOT NULL,
    start_offset integer,
    end_offset integer,
    context text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.extracted_entities OWNER TO postgres;

--
-- Name: extracted_entities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.extracted_entities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.extracted_entities_id_seq OWNER TO postgres;

--
-- Name: extracted_entities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.extracted_entities_id_seq OWNED BY public.extracted_entities.id;


--
-- Name: gpu_inference_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gpu_inference_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    role text NOT NULL,
    content text NOT NULL,
    embedding real[],
    engine_used text,
    response_time integer,
    tokens_generated integer,
    cache_hit boolean DEFAULT false,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.gpu_inference_messages OWNER TO postgres;

--
-- Name: gpu_inference_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gpu_inference_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_name text NOT NULL,
    user_id text,
    engine_used text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    metadata jsonb,
    is_active boolean DEFAULT true
);


ALTER TABLE public.gpu_inference_sessions OWNER TO postgres;

--
-- Name: gpu_performance_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gpu_performance_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    engine_type text NOT NULL,
    request_count integer,
    avg_response_time real,
    cache_hit_rate real,
    tokens_per_second real,
    gpu_utilization real,
    memory_usage real,
    error_count integer,
    metadata jsonb,
    measured_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.gpu_performance_metrics OWNER TO postgres;

--
-- Name: indexed_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.indexed_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_path text NOT NULL,
    content text,
    embedding real[],
    summary text,
    metadata jsonb,
    indexed_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.indexed_files OWNER TO postgres;

--
-- Name: knowledge_edges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knowledge_edges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid NOT NULL,
    target_id uuid NOT NULL,
    relationship text NOT NULL,
    weight real DEFAULT 1,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.knowledge_edges OWNER TO postgres;

--
-- Name: knowledge_nodes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knowledge_nodes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    node_type text NOT NULL,
    node_id uuid NOT NULL,
    label text NOT NULL,
    embedding public.vector(384) NOT NULL,
    properties jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.knowledge_nodes OWNER TO postgres;

--
-- Name: predictive_asset_cache; Type: TABLE; Schema: public; Owner: legal_admin
--

CREATE TABLE public.predictive_asset_cache (
    id integer NOT NULL,
    asset_type text NOT NULL,
    predictions jsonb,
    confidence_score real,
    cache_expires timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.predictive_asset_cache OWNER TO legal_admin;

--
-- Name: predictive_asset_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: legal_admin
--

CREATE SEQUENCE public.predictive_asset_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.predictive_asset_cache_id_seq OWNER TO legal_admin;

--
-- Name: predictive_asset_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: legal_admin
--

ALTER SEQUENCE public.predictive_asset_cache_id_seq OWNED BY public.predictive_asset_cache.id;


--
-- Name: processing_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.processing_jobs (
    id integer NOT NULL,
    uuid character varying(36) NOT NULL,
    document_id integer,
    job_type character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'queued'::character varying NOT NULL,
    current_step character varying(50),
    progress integer DEFAULT 0 NOT NULL,
    result jsonb,
    error text,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.processing_jobs OWNER TO postgres;

--
-- Name: processing_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.processing_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.processing_jobs_id_seq OWNER TO postgres;

--
-- Name: processing_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.processing_jobs_id_seq OWNED BY public.processing_jobs.id;


--
-- Name: qlora_training_jobs; Type: TABLE; Schema: public; Owner: legal_admin
--

CREATE TABLE public.qlora_training_jobs (
    id integer NOT NULL,
    config jsonb NOT NULL,
    status text DEFAULT 'pending'::text,
    performance_metrics jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.qlora_training_jobs OWNER TO legal_admin;

--
-- Name: qlora_training_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: legal_admin
--

CREATE SEQUENCE public.qlora_training_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.qlora_training_jobs_id_seq OWNER TO legal_admin;

--
-- Name: qlora_training_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: legal_admin
--

ALTER SEQUENCE public.qlora_training_jobs_id_seq OWNED BY public.qlora_training_jobs.id;


--
-- Name: query_vectors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.query_vectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    query text NOT NULL,
    embedding public.vector(384) NOT NULL,
    result_count integer DEFAULT 0,
    clicked_results jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.query_vectors OWNER TO postgres;

--
-- Name: rag_queries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rag_queries (
    id integer NOT NULL,
    uuid character varying(36) NOT NULL,
    case_id integer,
    query text NOT NULL,
    query_embedding public.vector(384),
    response text,
    model character varying(50) NOT NULL,
    tokens_used integer,
    processing_time_ms integer,
    similarity_threshold real DEFAULT 0.7 NOT NULL,
    results_count integer,
    user_feedback jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rag_queries OWNER TO postgres;

--
-- Name: rag_queries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rag_queries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rag_queries_id_seq OWNER TO postgres;

--
-- Name: rag_queries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rag_queries_id_seq OWNED BY public.rag_queries.id;


--
-- Name: rag_query_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rag_query_results (
    id integer NOT NULL,
    query_id integer NOT NULL,
    chunk_id integer NOT NULL,
    similarity_score real NOT NULL,
    rank integer NOT NULL,
    used boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rag_query_results OWNER TO postgres;

--
-- Name: rag_query_results_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rag_query_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rag_query_results_id_seq OWNER TO postgres;

--
-- Name: rag_query_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rag_query_results_id_seq OWNED BY public.rag_query_results.id;


--
-- Name: recommendation_cache; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recommendation_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    recommendation_type text NOT NULL,
    recommendations jsonb NOT NULL,
    score real DEFAULT 0,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.recommendation_cache OWNER TO postgres;

--
-- Name: vector_embeddings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vector_embeddings (
    id integer NOT NULL,
    document_id text NOT NULL,
    content text,
    embedding public.vector(1536),
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.vector_embeddings OWNER TO postgres;

--
-- Name: vector_embeddings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vector_embeddings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vector_embeddings_id_seq OWNER TO postgres;

--
-- Name: vector_embeddings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vector_embeddings_id_seq OWNED BY public.vector_embeddings.id;


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: extracted_entities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.extracted_entities ALTER COLUMN id SET DEFAULT nextval('public.extracted_entities_id_seq'::regclass);


--
-- Name: predictive_asset_cache id; Type: DEFAULT; Schema: public; Owner: legal_admin
--

ALTER TABLE ONLY public.predictive_asset_cache ALTER COLUMN id SET DEFAULT nextval('public.predictive_asset_cache_id_seq'::regclass);


--
-- Name: processing_jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processing_jobs ALTER COLUMN id SET DEFAULT nextval('public.processing_jobs_id_seq'::regclass);


--
-- Name: qlora_training_jobs id; Type: DEFAULT; Schema: public; Owner: legal_admin
--

ALTER TABLE ONLY public.qlora_training_jobs ALTER COLUMN id SET DEFAULT nextval('public.qlora_training_jobs_id_seq'::regclass);


--
-- Name: rag_queries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rag_queries ALTER COLUMN id SET DEFAULT nextval('public.rag_queries_id_seq'::regclass);


--
-- Name: rag_query_results id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rag_query_results ALTER COLUMN id SET DEFAULT nextval('public.rag_query_results_id_seq'::regclass);


--
-- Name: vector_embeddings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vector_embeddings ALTER COLUMN id SET DEFAULT nextval('public.vector_embeddings_id_seq'::regclass);


--
-- Data for Name: ai_engine_status; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_engine_status (id, engine_name, is_online, last_health_check, response_time, version, capabilities, configuration, error_status, metadata) FROM stdin;
\.


--
-- Data for Name: ai_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_history (id, user_id, prompt, response, embedding, created_at) FROM stdin;
\.


--
-- Data for Name: case_summary_vectors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.case_summary_vectors (id, case_id, summary, embedding, confidence, last_updated) FROM stdin;
\.


--
-- Data for Name: cases; Type: TABLE DATA; Schema: public; Owner: legal_admin
--

COPY public.cases (id, title, description, case_number, status, priority, practice_area, jurisdiction, court, client_name, opposing_party, assigned_attorney, filing_date, due_date, closed_date, case_embedding, qdrant_id, qdrant_collection, metadata, created_at, updated_at) FROM stdin;
c221f2a3-cf0e-4102-81f8-d7d88c707a67	Sample Case	\N	\N	open	medium	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	cases	{}	2025-09-02 20:41:53.829909-07	2025-09-02 20:41:53.829909-07
1c0cff20-9a9f-4eb4-a021-0390df70f16b	Sample Case	\N	\N	open	medium	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	cases	{}	2025-09-02 20:42:48.071747-07	2025-09-02 20:42:48.071747-07
\.


--
-- Data for Name: document_chunks; Type: TABLE DATA; Schema: public; Owner: legal_admin
--

COPY public.document_chunks (id, document_id, document_type, chunk_index, content, embedding, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: document_vectors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.document_vectors (id, document_id, chunk_index, content, embedding, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documents (id, uuid, case_id, filename, original_name, content_type, file_size, minio_path, extracted_text, processing_status, processing_error, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: error_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.error_logs (id, message, stack_trace, embedding, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: evidence_vectors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.evidence_vectors (id, evidence_id, chunk_index, content, embedding, analysis_type, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: extracted_entities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.extracted_entities (id, document_id, chunk_id, entity_type, entity_value, confidence, start_offset, end_offset, context, created_at) FROM stdin;
\.


--
-- Data for Name: gpu_inference_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gpu_inference_messages (id, session_id, role, content, embedding, engine_used, response_time, tokens_generated, cache_hit, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: gpu_inference_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gpu_inference_sessions (id, session_name, user_id, engine_used, created_at, updated_at, metadata, is_active) FROM stdin;
\.


--
-- Data for Name: gpu_performance_metrics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gpu_performance_metrics (id, session_id, engine_type, request_count, avg_response_time, cache_hit_rate, tokens_per_second, gpu_utilization, memory_usage, error_count, metadata, measured_at) FROM stdin;
\.


--
-- Data for Name: indexed_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.indexed_files (id, file_path, content, embedding, summary, metadata, indexed_at) FROM stdin;
\.


--
-- Data for Name: knowledge_edges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knowledge_edges (id, source_id, target_id, relationship, weight, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: knowledge_nodes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knowledge_nodes (id, node_type, node_id, label, embedding, properties, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: predictive_asset_cache; Type: TABLE DATA; Schema: public; Owner: legal_admin
--

COPY public.predictive_asset_cache (id, asset_type, predictions, confidence_score, cache_expires, created_at) FROM stdin;
\.


--
-- Data for Name: processing_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.processing_jobs (id, uuid, document_id, job_type, status, current_step, progress, result, error, started_at, completed_at, created_at) FROM stdin;
\.


--
-- Data for Name: qlora_training_jobs; Type: TABLE DATA; Schema: public; Owner: legal_admin
--

COPY public.qlora_training_jobs (id, config, status, performance_metrics, created_at) FROM stdin;
\.


--
-- Data for Name: query_vectors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.query_vectors (id, user_id, query, embedding, result_count, clicked_results, created_at) FROM stdin;
\.


--
-- Data for Name: rag_queries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rag_queries (id, uuid, case_id, query, query_embedding, response, model, tokens_used, processing_time_ms, similarity_threshold, results_count, user_feedback, created_at) FROM stdin;
\.


--
-- Data for Name: rag_query_results; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rag_query_results (id, query_id, chunk_id, similarity_score, rank, used, created_at) FROM stdin;
\.


--
-- Data for Name: recommendation_cache; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recommendation_cache (id, user_id, recommendation_type, recommendations, score, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: vector_embeddings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vector_embeddings (id, document_id, content, embedding, metadata, created_at) FROM stdin;
\.


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.documents_id_seq', 1, false);


--
-- Name: extracted_entities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.extracted_entities_id_seq', 1, false);


--
-- Name: predictive_asset_cache_id_seq; Type: SEQUENCE SET; Schema: public; Owner: legal_admin
--

SELECT pg_catalog.setval('public.predictive_asset_cache_id_seq', 1, false);


--
-- Name: processing_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.processing_jobs_id_seq', 1, false);


--
-- Name: qlora_training_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: legal_admin
--

SELECT pg_catalog.setval('public.qlora_training_jobs_id_seq', 1, false);


--
-- Name: rag_queries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rag_queries_id_seq', 1, false);


--
-- Name: rag_query_results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rag_query_results_id_seq', 1, false);


--
-- Name: vector_embeddings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vector_embeddings_id_seq', 1, false);


--
-- Name: ai_engine_status ai_engine_status_engine_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_engine_status
    ADD CONSTRAINT ai_engine_status_engine_name_unique UNIQUE (engine_name);


--
-- Name: ai_engine_status ai_engine_status_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_engine_status
    ADD CONSTRAINT ai_engine_status_pkey PRIMARY KEY (id);


--
-- Name: ai_history ai_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_history
    ADD CONSTRAINT ai_history_pkey PRIMARY KEY (id);


--
-- Name: case_summary_vectors case_summary_vectors_case_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.case_summary_vectors
    ADD CONSTRAINT case_summary_vectors_case_id_unique UNIQUE (case_id);


--
-- Name: case_summary_vectors case_summary_vectors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.case_summary_vectors
    ADD CONSTRAINT case_summary_vectors_pkey PRIMARY KEY (id);


--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: public; Owner: legal_admin
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_pkey PRIMARY KEY (id);


--
-- Name: document_chunks document_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: legal_admin
--

ALTER TABLE ONLY public.document_chunks
    ADD CONSTRAINT document_chunks_pkey PRIMARY KEY (id);


--
-- Name: document_vectors document_vectors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_vectors
    ADD CONSTRAINT document_vectors_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: documents documents_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uuid_unique UNIQUE (uuid);


--
-- Name: error_logs error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_pkey PRIMARY KEY (id);


--
-- Name: evidence_vectors evidence_vectors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.evidence_vectors
    ADD CONSTRAINT evidence_vectors_pkey PRIMARY KEY (id);


--
-- Name: extracted_entities extracted_entities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.extracted_entities
    ADD CONSTRAINT extracted_entities_pkey PRIMARY KEY (id);


--
-- Name: gpu_inference_messages gpu_inference_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gpu_inference_messages
    ADD CONSTRAINT gpu_inference_messages_pkey PRIMARY KEY (id);


--
-- Name: gpu_inference_sessions gpu_inference_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gpu_inference_sessions
    ADD CONSTRAINT gpu_inference_sessions_pkey PRIMARY KEY (id);


--
-- Name: gpu_performance_metrics gpu_performance_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gpu_performance_metrics
    ADD CONSTRAINT gpu_performance_metrics_pkey PRIMARY KEY (id);


--
-- Name: indexed_files indexed_files_file_path_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.indexed_files
    ADD CONSTRAINT indexed_files_file_path_unique UNIQUE (file_path);


--
-- Name: indexed_files indexed_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.indexed_files
    ADD CONSTRAINT indexed_files_pkey PRIMARY KEY (id);


--
-- Name: knowledge_edges knowledge_edges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_edges
    ADD CONSTRAINT knowledge_edges_pkey PRIMARY KEY (id);


--
-- Name: knowledge_nodes knowledge_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_nodes
    ADD CONSTRAINT knowledge_nodes_pkey PRIMARY KEY (id);


--
-- Name: predictive_asset_cache predictive_asset_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: legal_admin
--

ALTER TABLE ONLY public.predictive_asset_cache
    ADD CONSTRAINT predictive_asset_cache_pkey PRIMARY KEY (id);


--
-- Name: processing_jobs processing_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processing_jobs
    ADD CONSTRAINT processing_jobs_pkey PRIMARY KEY (id);


--
-- Name: processing_jobs processing_jobs_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.processing_jobs
    ADD CONSTRAINT processing_jobs_uuid_unique UNIQUE (uuid);


--
-- Name: qlora_training_jobs qlora_training_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: legal_admin
--

ALTER TABLE ONLY public.qlora_training_jobs
    ADD CONSTRAINT qlora_training_jobs_pkey PRIMARY KEY (id);


--
-- Name: query_vectors query_vectors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.query_vectors
    ADD CONSTRAINT query_vectors_pkey PRIMARY KEY (id);


--
-- Name: rag_queries rag_queries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rag_queries
    ADD CONSTRAINT rag_queries_pkey PRIMARY KEY (id);


--
-- Name: rag_queries rag_queries_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rag_queries
    ADD CONSTRAINT rag_queries_uuid_unique UNIQUE (uuid);


--
-- Name: rag_query_results rag_query_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rag_query_results
    ADD CONSTRAINT rag_query_results_pkey PRIMARY KEY (id);


--
-- Name: recommendation_cache recommendation_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recommendation_cache
    ADD CONSTRAINT recommendation_cache_pkey PRIMARY KEY (id);


--
-- Name: vector_embeddings vector_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vector_embeddings
    ADD CONSTRAINT vector_embeddings_pkey PRIMARY KEY (id);


--
-- Name: cases_assigned_attorney_idx; Type: INDEX; Schema: public; Owner: legal_admin
--

CREATE INDEX cases_assigned_attorney_idx ON public.cases USING btree (assigned_attorney);


--
-- Name: cases_case_embedding_hnsw_idx; Type: INDEX; Schema: public; Owner: legal_admin
--

CREATE INDEX cases_case_embedding_hnsw_idx ON public.cases USING hnsw (case_embedding public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: cases_case_number_idx; Type: INDEX; Schema: public; Owner: legal_admin
--

CREATE UNIQUE INDEX cases_case_number_idx ON public.cases USING btree (case_number);


--
-- Name: cases_practice_area_idx; Type: INDEX; Schema: public; Owner: legal_admin
--

CREATE INDEX cases_practice_area_idx ON public.cases USING btree (practice_area);


--
-- Name: cases_status_idx; Type: INDEX; Schema: public; Owner: legal_admin
--

CREATE INDEX cases_status_idx ON public.cases USING btree (status);


--
-- Name: document_chunks_document_id_idx; Type: INDEX; Schema: public; Owner: legal_admin
--

CREATE INDEX document_chunks_document_id_idx ON public.document_chunks USING btree (document_id);


--
-- Name: document_chunks_embedding_hnsw_idx; Type: INDEX; Schema: public; Owner: legal_admin
--

CREATE INDEX document_chunks_embedding_hnsw_idx ON public.document_chunks USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: idx_document_chunks_document_id; Type: INDEX; Schema: public; Owner: legal_admin
--

CREATE INDEX idx_document_chunks_document_id ON public.document_chunks USING btree (document_id);


--
-- Name: idx_document_chunks_embedding_hnsw; Type: INDEX; Schema: public; Owner: legal_admin
--

CREATE INDEX idx_document_chunks_embedding_hnsw ON public.document_chunks USING hnsw (embedding public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: idx_document_chunks_index; Type: INDEX; Schema: public; Owner: legal_admin
--

CREATE INDEX idx_document_chunks_index ON public.document_chunks USING btree (document_id, chunk_index);


--
-- Name: cases update_cases_updated_at; Type: TRIGGER; Schema: public; Owner: legal_admin
--

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO legal_admin;


--
-- Name: FUNCTION gtrgm_in(cstring); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_in(cstring) TO legal_admin;


--
-- Name: FUNCTION gtrgm_out(public.gtrgm); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_out(public.gtrgm) TO legal_admin;


--
-- Name: FUNCTION halfvec_in(cstring, oid, integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_in(cstring, oid, integer) TO legal_admin;


--
-- Name: FUNCTION halfvec_out(public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_out(public.halfvec) TO legal_admin;


--
-- Name: FUNCTION halfvec_recv(internal, oid, integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_recv(internal, oid, integer) TO legal_admin;


--
-- Name: FUNCTION halfvec_send(public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_send(public.halfvec) TO legal_admin;


--
-- Name: FUNCTION halfvec_typmod_in(cstring[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_typmod_in(cstring[]) TO legal_admin;


--
-- Name: FUNCTION sparsevec_in(cstring, oid, integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sparsevec_in(cstring, oid, integer) TO legal_admin;


--
-- Name: FUNCTION sparsevec_out(public.sparsevec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sparsevec_out(public.sparsevec) TO legal_admin;


--
-- Name: FUNCTION sparsevec_recv(internal, oid, integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sparsevec_recv(internal, oid, integer) TO legal_admin;


--
-- Name: FUNCTION sparsevec_send(public.sparsevec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sparsevec_send(public.sparsevec) TO legal_admin;


--
-- Name: FUNCTION sparsevec_typmod_in(cstring[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sparsevec_typmod_in(cstring[]) TO legal_admin;


--
-- Name: FUNCTION vector_in(cstring, oid, integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_in(cstring, oid, integer) TO legal_admin;


--
-- Name: FUNCTION vector_out(public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_out(public.vector) TO legal_admin;


--
-- Name: FUNCTION vector_recv(internal, oid, integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_recv(internal, oid, integer) TO legal_admin;


--
-- Name: FUNCTION vector_send(public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_send(public.vector) TO legal_admin;


--
-- Name: FUNCTION vector_typmod_in(cstring[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_typmod_in(cstring[]) TO legal_admin;


--
-- Name: FUNCTION array_to_halfvec(real[], integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.array_to_halfvec(real[], integer, boolean) TO legal_admin;


--
-- Name: FUNCTION array_to_sparsevec(real[], integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.array_to_sparsevec(real[], integer, boolean) TO legal_admin;


--
-- Name: FUNCTION array_to_vector(real[], integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.array_to_vector(real[], integer, boolean) TO legal_admin;


--
-- Name: FUNCTION array_to_halfvec(double precision[], integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.array_to_halfvec(double precision[], integer, boolean) TO legal_admin;


--
-- Name: FUNCTION array_to_sparsevec(double precision[], integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.array_to_sparsevec(double precision[], integer, boolean) TO legal_admin;


--
-- Name: FUNCTION array_to_vector(double precision[], integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.array_to_vector(double precision[], integer, boolean) TO legal_admin;


--
-- Name: FUNCTION array_to_halfvec(integer[], integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.array_to_halfvec(integer[], integer, boolean) TO legal_admin;


--
-- Name: FUNCTION array_to_sparsevec(integer[], integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.array_to_sparsevec(integer[], integer, boolean) TO legal_admin;


--
-- Name: FUNCTION array_to_vector(integer[], integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.array_to_vector(integer[], integer, boolean) TO legal_admin;


--
-- Name: FUNCTION array_to_halfvec(numeric[], integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.array_to_halfvec(numeric[], integer, boolean) TO legal_admin;


--
-- Name: FUNCTION array_to_sparsevec(numeric[], integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.array_to_sparsevec(numeric[], integer, boolean) TO legal_admin;


--
-- Name: FUNCTION array_to_vector(numeric[], integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.array_to_vector(numeric[], integer, boolean) TO legal_admin;


--
-- Name: FUNCTION halfvec_to_float4(public.halfvec, integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_to_float4(public.halfvec, integer, boolean) TO legal_admin;


--
-- Name: FUNCTION halfvec(public.halfvec, integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec(public.halfvec, integer, boolean) TO legal_admin;


--
-- Name: FUNCTION halfvec_to_sparsevec(public.halfvec, integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_to_sparsevec(public.halfvec, integer, boolean) TO legal_admin;


--
-- Name: FUNCTION halfvec_to_vector(public.halfvec, integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_to_vector(public.halfvec, integer, boolean) TO legal_admin;


--
-- Name: FUNCTION sparsevec_to_halfvec(public.sparsevec, integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sparsevec_to_halfvec(public.sparsevec, integer, boolean) TO legal_admin;


--
-- Name: FUNCTION sparsevec(public.sparsevec, integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sparsevec(public.sparsevec, integer, boolean) TO legal_admin;


--
-- Name: FUNCTION sparsevec_to_vector(public.sparsevec, integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sparsevec_to_vector(public.sparsevec, integer, boolean) TO legal_admin;


--
-- Name: FUNCTION vector_to_float4(public.vector, integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_to_float4(public.vector, integer, boolean) TO legal_admin;


--
-- Name: FUNCTION vector_to_halfvec(public.vector, integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_to_halfvec(public.vector, integer, boolean) TO legal_admin;


--
-- Name: FUNCTION vector_to_sparsevec(public.vector, integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_to_sparsevec(public.vector, integer, boolean) TO legal_admin;


--
-- Name: FUNCTION vector(public.vector, integer, boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector(public.vector, integer, boolean) TO legal_admin;


--
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.armor(bytea) TO legal_admin;


--
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.armor(bytea, text[], text[]) TO legal_admin;


--
-- Name: FUNCTION binary_quantize(public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.binary_quantize(public.halfvec) TO legal_admin;


--
-- Name: FUNCTION binary_quantize(public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.binary_quantize(public.vector) TO legal_admin;


--
-- Name: FUNCTION cleanup_expired_tensors(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_expired_tensors() TO legal_admin;


--
-- Name: FUNCTION cosine_distance(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cosine_distance(public.halfvec, public.halfvec) TO legal_admin;


--
-- Name: FUNCTION cosine_distance(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cosine_distance(public.sparsevec, public.sparsevec) TO legal_admin;


--
-- Name: FUNCTION cosine_distance(public.vector, public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cosine_distance(public.vector, public.vector) TO legal_admin;


--
-- Name: FUNCTION cosine_similarity(a public.vector, b public.vector); Type: ACL; Schema: public; Owner: legal_admin
--

GRANT ALL ON FUNCTION public.cosine_similarity(a public.vector, b public.vector) TO postgres;


--
-- Name: FUNCTION create_vector_for_evidence(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_vector_for_evidence() TO legal_admin;


--
-- Name: FUNCTION create_vector_for_report(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_vector_for_report() TO legal_admin;


--
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.crypt(text, text) TO legal_admin;


--
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.dearmor(text) TO legal_admin;


--
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.decrypt(bytea, bytea, text) TO legal_admin;


--
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.decrypt_iv(bytea, bytea, bytea, text) TO legal_admin;


--
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.digest(bytea, text) TO legal_admin;


--
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.digest(text, text) TO legal_admin;


--
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.encrypt(bytea, bytea, text) TO legal_admin;


--
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.encrypt_iv(bytea, bytea, bytea, text) TO legal_admin;


--
-- Name: FUNCTION find_similar_documents(query_embedding public.vector, similarity_threshold real, max_results integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.find_similar_documents(query_embedding public.vector, similarity_threshold real, max_results integer) TO legal_admin;


--
-- Name: FUNCTION find_similar_shaders(query_embedding public.vector, similarity_threshold real, max_results integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.find_similar_shaders(query_embedding public.vector, similarity_threshold real, max_results integer) TO legal_admin;


--
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_random_bytes(integer) TO legal_admin;


--
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_random_uuid() TO legal_admin;


--
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_salt(text) TO legal_admin;


--
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gen_salt(text, integer) TO legal_admin;


--
-- Name: FUNCTION get_shader_recommendations(p_user_id uuid, p_current_workflow character varying, p_limit integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_shader_recommendations(p_user_id uuid, p_current_workflow character varying, p_limit integer) TO legal_admin;


--
-- Name: FUNCTION get_similar_documents(query_embedding public.vector, similarity_threshold real, result_limit integer); Type: ACL; Schema: public; Owner: legal_admin
--

GRANT ALL ON FUNCTION public.get_similar_documents(query_embedding public.vector, similarity_threshold real, result_limit integer) TO postgres;


--
-- Name: FUNCTION get_tensor_queue_stats(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_tensor_queue_stats() TO legal_admin;


--
-- Name: FUNCTION gin_btree_consistent(internal, smallint, anyelement, integer, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_btree_consistent(internal, smallint, anyelement, integer, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_anyenum(anyenum, anyenum, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_anyenum(anyenum, anyenum, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_bit(bit, bit, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_bit(bit, bit, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_bool(boolean, boolean, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_bool(boolean, boolean, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_bpchar(character, character, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_bpchar(character, character, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_bytea(bytea, bytea, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_bytea(bytea, bytea, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_char("char", "char", smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_char("char", "char", smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_cidr(cidr, cidr, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_cidr(cidr, cidr, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_date(date, date, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_date(date, date, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_float4(real, real, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_float4(real, real, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_float8(double precision, double precision, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_float8(double precision, double precision, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_inet(inet, inet, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_inet(inet, inet, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_int2(smallint, smallint, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_int2(smallint, smallint, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_int4(integer, integer, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_int4(integer, integer, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_int8(bigint, bigint, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_int8(bigint, bigint, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_interval(interval, interval, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_interval(interval, interval, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_macaddr(macaddr, macaddr, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_macaddr(macaddr, macaddr, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_macaddr8(macaddr8, macaddr8, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_macaddr8(macaddr8, macaddr8, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_money(money, money, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_money(money, money, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_name(name, name, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_name(name, name, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_numeric(numeric, numeric, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_numeric(numeric, numeric, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_oid(oid, oid, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_oid(oid, oid, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_text(text, text, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_text(text, text, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_time(time without time zone, time without time zone, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_time(time without time zone, time without time zone, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_timestamp(timestamp without time zone, timestamp without time zone, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_timestamp(timestamp without time zone, timestamp without time zone, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_timestamptz(timestamp with time zone, timestamp with time zone, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_timestamptz(timestamp with time zone, timestamp with time zone, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_timetz(time with time zone, time with time zone, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_timetz(time with time zone, time with time zone, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_uuid(uuid, uuid, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_uuid(uuid, uuid, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_compare_prefix_varbit(bit varying, bit varying, smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_compare_prefix_varbit(bit varying, bit varying, smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_enum_cmp(anyenum, anyenum); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_enum_cmp(anyenum, anyenum) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_anyenum(anyenum, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_anyenum(anyenum, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_bit(bit, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_bit(bit, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_bool(boolean, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_bool(boolean, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_bpchar(character, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_bpchar(character, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_bytea(bytea, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_bytea(bytea, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_char("char", internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_char("char", internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_cidr(cidr, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_cidr(cidr, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_date(date, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_date(date, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_float4(real, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_float4(real, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_float8(double precision, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_float8(double precision, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_inet(inet, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_inet(inet, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_int2(smallint, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_int2(smallint, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_int4(integer, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_int4(integer, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_int8(bigint, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_int8(bigint, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_interval(interval, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_interval(interval, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_macaddr(macaddr, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_macaddr(macaddr, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_macaddr8(macaddr8, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_macaddr8(macaddr8, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_money(money, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_money(money, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_name(name, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_name(name, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_numeric(numeric, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_numeric(numeric, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_oid(oid, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_oid(oid, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_text(text, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_text(text, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_time(time without time zone, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_time(time without time zone, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_timestamp(timestamp without time zone, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_timestamp(timestamp without time zone, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_timestamptz(timestamp with time zone, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_timestamptz(timestamp with time zone, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_timetz(time with time zone, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_timetz(time with time zone, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_uuid(uuid, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_uuid(uuid, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_query_varbit(bit varying, internal, smallint, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_query_varbit(bit varying, internal, smallint, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_anyenum(anyenum, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_anyenum(anyenum, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_bit(bit, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_bit(bit, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_bool(boolean, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_bool(boolean, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_bpchar(character, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_bpchar(character, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_bytea(bytea, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_bytea(bytea, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_char("char", internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_char("char", internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_cidr(cidr, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_cidr(cidr, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_date(date, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_date(date, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_float4(real, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_float4(real, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_float8(double precision, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_float8(double precision, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_inet(inet, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_inet(inet, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_int2(smallint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_int2(smallint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_int4(integer, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_int4(integer, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_int8(bigint, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_int8(bigint, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_interval(interval, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_interval(interval, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_macaddr(macaddr, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_macaddr(macaddr, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_macaddr8(macaddr8, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_macaddr8(macaddr8, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_money(money, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_money(money, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_name(name, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_name(name, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_numeric(numeric, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_numeric(numeric, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_oid(oid, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_oid(oid, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_text(text, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_text(text, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_time(time without time zone, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_time(time without time zone, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_timestamp(timestamp without time zone, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_timestamp(timestamp without time zone, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_timestamptz(timestamp with time zone, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_timestamptz(timestamp with time zone, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_timetz(time with time zone, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_timetz(time with time zone, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_trgm(text, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_trgm(text, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_uuid(uuid, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_uuid(uuid, internal) TO legal_admin;


--
-- Name: FUNCTION gin_extract_value_varbit(bit varying, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_extract_value_varbit(bit varying, internal) TO legal_admin;


--
-- Name: FUNCTION gin_numeric_cmp(numeric, numeric); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_numeric_cmp(numeric, numeric) TO legal_admin;


--
-- Name: FUNCTION gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gtrgm_compress(internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_compress(internal) TO legal_admin;


--
-- Name: FUNCTION gtrgm_consistent(internal, text, smallint, oid, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal) TO legal_admin;


--
-- Name: FUNCTION gtrgm_decompress(internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_decompress(internal) TO legal_admin;


--
-- Name: FUNCTION gtrgm_distance(internal, text, smallint, oid, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal) TO legal_admin;


--
-- Name: FUNCTION gtrgm_options(internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_options(internal) TO legal_admin;


--
-- Name: FUNCTION gtrgm_penalty(internal, internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_penalty(internal, internal, internal) TO legal_admin;


--
-- Name: FUNCTION gtrgm_picksplit(internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_picksplit(internal, internal) TO legal_admin;


--
-- Name: FUNCTION gtrgm_same(public.gtrgm, public.gtrgm, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_same(public.gtrgm, public.gtrgm, internal) TO legal_admin;


--
-- Name: FUNCTION gtrgm_union(internal, internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.gtrgm_union(internal, internal) TO legal_admin;


--
-- Name: FUNCTION halfvec_accum(double precision[], public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_accum(double precision[], public.halfvec) TO legal_admin;


--
-- Name: FUNCTION halfvec_add(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_add(public.halfvec, public.halfvec) TO legal_admin;


--
-- Name: FUNCTION halfvec_avg(double precision[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_avg(double precision[]) TO legal_admin;


--
-- Name: FUNCTION halfvec_cmp(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_cmp(public.halfvec, public.halfvec) TO legal_admin;


--
-- Name: FUNCTION halfvec_combine(double precision[], double precision[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_combine(double precision[], double precision[]) TO legal_admin;


--
-- Name: FUNCTION halfvec_concat(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_concat(public.halfvec, public.halfvec) TO legal_admin;


--
-- Name: FUNCTION halfvec_eq(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_eq(public.halfvec, public.halfvec) TO legal_admin;


--
-- Name: FUNCTION halfvec_ge(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_ge(public.halfvec, public.halfvec) TO legal_admin;


--
-- Name: FUNCTION halfvec_gt(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_gt(public.halfvec, public.halfvec) TO legal_admin;


--
-- Name: FUNCTION halfvec_l2_squared_distance(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_l2_squared_distance(public.halfvec, public.halfvec) TO legal_admin;


--
-- Name: FUNCTION halfvec_le(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_le(public.halfvec, public.halfvec) TO legal_admin;


--
-- Name: FUNCTION halfvec_lt(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_lt(public.halfvec, public.halfvec) TO legal_admin;


--
-- Name: FUNCTION halfvec_mul(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_mul(public.halfvec, public.halfvec) TO legal_admin;


--
-- Name: FUNCTION halfvec_ne(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_ne(public.halfvec, public.halfvec) TO legal_admin;


--
-- Name: FUNCTION halfvec_negative_inner_product(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_negative_inner_product(public.halfvec, public.halfvec) TO legal_admin;


--
-- Name: FUNCTION halfvec_spherical_distance(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_spherical_distance(public.halfvec, public.halfvec) TO legal_admin;


--
-- Name: FUNCTION halfvec_sub(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.halfvec_sub(public.halfvec, public.halfvec) TO legal_admin;


--
-- Name: FUNCTION hamming_distance(bit, bit); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hamming_distance(bit, bit) TO legal_admin;


--
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hmac(bytea, bytea, text) TO legal_admin;


--
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hmac(text, text, text) TO legal_admin;


--
-- Name: FUNCTION hnsw_bit_support(internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hnsw_bit_support(internal) TO legal_admin;


--
-- Name: FUNCTION hnsw_halfvec_support(internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hnsw_halfvec_support(internal) TO legal_admin;


--
-- Name: FUNCTION hnsw_sparsevec_support(internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hnsw_sparsevec_support(internal) TO legal_admin;


--
-- Name: FUNCTION hnswhandler(internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.hnswhandler(internal) TO legal_admin;


--
-- Name: FUNCTION inner_product(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.inner_product(public.halfvec, public.halfvec) TO legal_admin;


--
-- Name: FUNCTION inner_product(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.inner_product(public.sparsevec, public.sparsevec) TO legal_admin;


--
-- Name: FUNCTION inner_product(public.vector, public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.inner_product(public.vector, public.vector) TO legal_admin;


--
-- Name: FUNCTION ivfflat_bit_support(internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.ivfflat_bit_support(internal) TO legal_admin;


--
-- Name: FUNCTION ivfflat_halfvec_support(internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.ivfflat_halfvec_support(internal) TO legal_admin;


--
-- Name: FUNCTION ivfflathandler(internal); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.ivfflathandler(internal) TO legal_admin;


--
-- Name: FUNCTION jaccard_distance(bit, bit); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.jaccard_distance(bit, bit) TO legal_admin;


--
-- Name: FUNCTION l1_distance(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.l1_distance(public.halfvec, public.halfvec) TO legal_admin;


--
-- Name: FUNCTION l1_distance(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.l1_distance(public.sparsevec, public.sparsevec) TO legal_admin;


--
-- Name: FUNCTION l1_distance(public.vector, public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.l1_distance(public.vector, public.vector) TO legal_admin;


--
-- Name: FUNCTION l2_distance(public.halfvec, public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.l2_distance(public.halfvec, public.halfvec) TO legal_admin;


--
-- Name: FUNCTION l2_distance(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.l2_distance(public.sparsevec, public.sparsevec) TO legal_admin;


--
-- Name: FUNCTION l2_distance(public.vector, public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.l2_distance(public.vector, public.vector) TO legal_admin;


--
-- Name: FUNCTION l2_norm(public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.l2_norm(public.halfvec) TO legal_admin;


--
-- Name: FUNCTION l2_norm(public.sparsevec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.l2_norm(public.sparsevec) TO legal_admin;


--
-- Name: FUNCTION l2_normalize(public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.l2_normalize(public.halfvec) TO legal_admin;


--
-- Name: FUNCTION l2_normalize(public.sparsevec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.l2_normalize(public.sparsevec) TO legal_admin;


--
-- Name: FUNCTION l2_normalize(public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.l2_normalize(public.vector) TO legal_admin;


--
-- Name: FUNCTION notify_case_changes(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.notify_case_changes() TO legal_admin;


--
-- Name: FUNCTION notify_report_changes(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.notify_report_changes() TO legal_admin;


--
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_armor_headers(text, OUT key text, OUT value text) TO legal_admin;


--
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_key_id(bytea) TO legal_admin;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea) TO legal_admin;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea, text) TO legal_admin;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt(bytea, bytea, text, text) TO legal_admin;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea) TO legal_admin;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text) TO legal_admin;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO legal_admin;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt(text, bytea) TO legal_admin;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt(text, bytea, text) TO legal_admin;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea) TO legal_admin;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea, text) TO legal_admin;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt(bytea, text) TO legal_admin;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt(bytea, text, text) TO legal_admin;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt_bytea(bytea, text) TO legal_admin;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_decrypt_bytea(bytea, text, text) TO legal_admin;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt(text, text) TO legal_admin;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt(text, text, text) TO legal_admin;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt_bytea(bytea, text) TO legal_admin;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pgp_sym_encrypt_bytea(bytea, text, text) TO legal_admin;


--
-- Name: FUNCTION search_cases(search_query text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.search_cases(search_query text) TO legal_admin;


--
-- Name: FUNCTION set_limit(real); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_limit(real) TO legal_admin;


--
-- Name: FUNCTION show_limit(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.show_limit() TO legal_admin;


--
-- Name: FUNCTION show_trgm(text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.show_trgm(text) TO legal_admin;


--
-- Name: FUNCTION similarity(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.similarity(text, text) TO legal_admin;


--
-- Name: FUNCTION similarity_dist(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.similarity_dist(text, text) TO legal_admin;


--
-- Name: FUNCTION similarity_op(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.similarity_op(text, text) TO legal_admin;


--
-- Name: FUNCTION sparsevec_cmp(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sparsevec_cmp(public.sparsevec, public.sparsevec) TO legal_admin;


--
-- Name: FUNCTION sparsevec_eq(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sparsevec_eq(public.sparsevec, public.sparsevec) TO legal_admin;


--
-- Name: FUNCTION sparsevec_ge(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sparsevec_ge(public.sparsevec, public.sparsevec) TO legal_admin;


--
-- Name: FUNCTION sparsevec_gt(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sparsevec_gt(public.sparsevec, public.sparsevec) TO legal_admin;


--
-- Name: FUNCTION sparsevec_l2_squared_distance(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sparsevec_l2_squared_distance(public.sparsevec, public.sparsevec) TO legal_admin;


--
-- Name: FUNCTION sparsevec_le(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sparsevec_le(public.sparsevec, public.sparsevec) TO legal_admin;


--
-- Name: FUNCTION sparsevec_lt(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sparsevec_lt(public.sparsevec, public.sparsevec) TO legal_admin;


--
-- Name: FUNCTION sparsevec_ne(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sparsevec_ne(public.sparsevec, public.sparsevec) TO legal_admin;


--
-- Name: FUNCTION sparsevec_negative_inner_product(public.sparsevec, public.sparsevec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sparsevec_negative_inner_product(public.sparsevec, public.sparsevec) TO legal_admin;


--
-- Name: FUNCTION strict_word_similarity(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.strict_word_similarity(text, text) TO legal_admin;


--
-- Name: FUNCTION strict_word_similarity_commutator_op(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.strict_word_similarity_commutator_op(text, text) TO legal_admin;


--
-- Name: FUNCTION strict_word_similarity_dist_commutator_op(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.strict_word_similarity_dist_commutator_op(text, text) TO legal_admin;


--
-- Name: FUNCTION strict_word_similarity_dist_op(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.strict_word_similarity_dist_op(text, text) TO legal_admin;


--
-- Name: FUNCTION strict_word_similarity_op(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.strict_word_similarity_op(text, text) TO legal_admin;


--
-- Name: FUNCTION subvector(public.halfvec, integer, integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.subvector(public.halfvec, integer, integer) TO legal_admin;


--
-- Name: FUNCTION subvector(public.vector, integer, integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.subvector(public.vector, integer, integer) TO legal_admin;


--
-- Name: FUNCTION update_processing_stats(); Type: ACL; Schema: public; Owner: legal_admin
--

GRANT ALL ON FUNCTION public.update_processing_stats() TO postgres;


--
-- Name: FUNCTION update_shader_access_stats(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_shader_access_stats() TO legal_admin;


--
-- Name: FUNCTION update_tensor_access_stats(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_tensor_access_stats() TO legal_admin;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: legal_admin
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO postgres;


--
-- Name: FUNCTION update_vectors_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_vectors_updated_at() TO legal_admin;


--
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_generate_v1() TO legal_admin;


--
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_generate_v1mc() TO legal_admin;


--
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_generate_v3(namespace uuid, name text) TO legal_admin;


--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_generate_v4() TO legal_admin;


--
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_generate_v5(namespace uuid, name text) TO legal_admin;


--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_nil() TO legal_admin;


--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_ns_dns() TO legal_admin;


--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_ns_oid() TO legal_admin;


--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_ns_url() TO legal_admin;


--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.uuid_ns_x500() TO legal_admin;


--
-- Name: FUNCTION vector_accum(double precision[], public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_accum(double precision[], public.vector) TO legal_admin;


--
-- Name: FUNCTION vector_add(public.vector, public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_add(public.vector, public.vector) TO legal_admin;


--
-- Name: FUNCTION vector_avg(double precision[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_avg(double precision[]) TO legal_admin;


--
-- Name: FUNCTION vector_cmp(public.vector, public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_cmp(public.vector, public.vector) TO legal_admin;


--
-- Name: FUNCTION vector_combine(double precision[], double precision[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_combine(double precision[], double precision[]) TO legal_admin;


--
-- Name: FUNCTION vector_concat(public.vector, public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_concat(public.vector, public.vector) TO legal_admin;


--
-- Name: FUNCTION vector_dims(public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_dims(public.halfvec) TO legal_admin;


--
-- Name: FUNCTION vector_dims(public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_dims(public.vector) TO legal_admin;


--
-- Name: FUNCTION vector_eq(public.vector, public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_eq(public.vector, public.vector) TO legal_admin;


--
-- Name: FUNCTION vector_ge(public.vector, public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_ge(public.vector, public.vector) TO legal_admin;


--
-- Name: FUNCTION vector_gt(public.vector, public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_gt(public.vector, public.vector) TO legal_admin;


--
-- Name: FUNCTION vector_l2_squared_distance(public.vector, public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_l2_squared_distance(public.vector, public.vector) TO legal_admin;


--
-- Name: FUNCTION vector_le(public.vector, public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_le(public.vector, public.vector) TO legal_admin;


--
-- Name: FUNCTION vector_lt(public.vector, public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_lt(public.vector, public.vector) TO legal_admin;


--
-- Name: FUNCTION vector_mul(public.vector, public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_mul(public.vector, public.vector) TO legal_admin;


--
-- Name: FUNCTION vector_ne(public.vector, public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_ne(public.vector, public.vector) TO legal_admin;


--
-- Name: FUNCTION vector_negative_inner_product(public.vector, public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_negative_inner_product(public.vector, public.vector) TO legal_admin;


--
-- Name: FUNCTION vector_norm(public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_norm(public.vector) TO legal_admin;


--
-- Name: FUNCTION vector_spherical_distance(public.vector, public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_spherical_distance(public.vector, public.vector) TO legal_admin;


--
-- Name: FUNCTION vector_sub(public.vector, public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.vector_sub(public.vector, public.vector) TO legal_admin;


--
-- Name: FUNCTION word_similarity(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.word_similarity(text, text) TO legal_admin;


--
-- Name: FUNCTION word_similarity_commutator_op(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.word_similarity_commutator_op(text, text) TO legal_admin;


--
-- Name: FUNCTION word_similarity_dist_commutator_op(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.word_similarity_dist_commutator_op(text, text) TO legal_admin;


--
-- Name: FUNCTION word_similarity_dist_op(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.word_similarity_dist_op(text, text) TO legal_admin;


--
-- Name: FUNCTION word_similarity_op(text, text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.word_similarity_op(text, text) TO legal_admin;


--
-- Name: FUNCTION avg(public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.avg(public.halfvec) TO legal_admin;


--
-- Name: FUNCTION avg(public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.avg(public.vector) TO legal_admin;


--
-- Name: FUNCTION sum(public.halfvec); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sum(public.halfvec) TO legal_admin;


--
-- Name: FUNCTION sum(public.vector); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sum(public.vector) TO legal_admin;


--
-- Name: TABLE ai_engine_status; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_engine_status TO legal_admin;


--
-- Name: TABLE ai_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ai_history TO legal_admin;


--
-- Name: TABLE case_summary_vectors; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.case_summary_vectors TO legal_admin;


--
-- Name: TABLE document_chunks; Type: ACL; Schema: public; Owner: legal_admin
--

GRANT ALL ON TABLE public.document_chunks TO postgres;


--
-- Name: TABLE document_vectors; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.document_vectors TO legal_admin;


--
-- Name: TABLE documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.documents TO legal_admin;


--
-- Name: SEQUENCE documents_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.documents_id_seq TO legal_admin;


--
-- Name: TABLE error_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.error_logs TO legal_admin;


--
-- Name: TABLE evidence_vectors; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.evidence_vectors TO legal_admin;


--
-- Name: TABLE extracted_entities; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.extracted_entities TO legal_admin;


--
-- Name: SEQUENCE extracted_entities_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.extracted_entities_id_seq TO legal_admin;


--
-- Name: TABLE gpu_inference_messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.gpu_inference_messages TO legal_admin;


--
-- Name: TABLE gpu_inference_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.gpu_inference_sessions TO legal_admin;


--
-- Name: TABLE gpu_performance_metrics; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.gpu_performance_metrics TO legal_admin;


--
-- Name: TABLE indexed_files; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.indexed_files TO legal_admin;


--
-- Name: TABLE knowledge_edges; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.knowledge_edges TO legal_admin;


--
-- Name: TABLE knowledge_nodes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.knowledge_nodes TO legal_admin;


--
-- Name: TABLE processing_jobs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.processing_jobs TO legal_admin;


--
-- Name: SEQUENCE processing_jobs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.processing_jobs_id_seq TO legal_admin;


--
-- Name: TABLE query_vectors; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.query_vectors TO legal_admin;


--
-- Name: TABLE rag_queries; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rag_queries TO legal_admin;


--
-- Name: SEQUENCE rag_queries_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.rag_queries_id_seq TO legal_admin;


--
-- Name: TABLE rag_query_results; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rag_query_results TO legal_admin;


--
-- Name: SEQUENCE rag_query_results_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.rag_query_results_id_seq TO legal_admin;


--
-- Name: TABLE recommendation_cache; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.recommendation_cache TO legal_admin;


--
-- Name: TABLE vector_embeddings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.vector_embeddings TO legal_admin;


--
-- Name: SEQUENCE vector_embeddings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.vector_embeddings_id_seq TO legal_admin;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO legal_admin;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO legal_admin;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO legal_admin;


--
-- PostgreSQL database dump complete
--

\unrestrict dXIsDMq5z1jdhcceBqPdfcMqSdBCiyboO6EP2q4SlVyyWmvvrkLIYnNbX67sxJ2

