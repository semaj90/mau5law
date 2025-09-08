--
-- PostgreSQL database dump
--

\restrict LLKyPf46JmqVDt4GefUrdh5M2omVci7zgV2r8QmigYVdKLgLIpLqMx5pBqTeJyU

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
-- Name: EXTENSION btree_gin; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gin IS 'support for indexing common datatypes in GIN';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: calculate_temporal_score(timestamp with time zone, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_temporal_score(created_at timestamp with time zone, half_life_days integer DEFAULT 30) RETURNS numeric
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    RETURN GREATEST(0.05, EXP(-LN(2) * EXTRACT(EPOCH FROM (NOW() - created_at)) / (24 * 3600 * half_life_days)));
END;
$$;


--
-- Name: cleanup_expired_tensors(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: cosine_similarity(public.vector, public.vector); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cosine_similarity(a public.vector, b public.vector) RETURNS double precision
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      SELECT 1 - (a <=> b)
      $$;


--
-- Name: create_vector_for_evidence(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: create_vector_for_report(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: find_similar_documents(public.vector, real, integer); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: find_similar_shaders(public.vector, real, integer); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: get_shader_recommendations(uuid, character varying, integer); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: get_similar_documents(public.vector, real, integer); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: get_tensor_queue_stats(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: notify_case_changes(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: notify_report_changes(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: search_cases(text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: update_last_accessed(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_last_accessed() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.last_accessed = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_processing_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_processing_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.indexed_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_shader_access_stats(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: update_tensor_access_stats(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_vectors_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_vectors_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_engine_status; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: ai_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text,
    prompt text,
    response text,
    embedding text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: case_summary_vectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_summary_vectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    summary text NOT NULL,
    embedding public.vector(384) NOT NULL,
    confidence real DEFAULT 1,
    last_updated timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: cases; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: document_chunks; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: document_vectors; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: error_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.error_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message text NOT NULL,
    stack_trace text,
    embedding real[],
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: evidence_vectors; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: extracted_entities; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: extracted_entities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.extracted_entities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: extracted_entities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.extracted_entities_id_seq OWNED BY public.extracted_entities.id;


--
-- Name: gpu_inference_messages; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: gpu_inference_sessions; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: gpu_performance_metrics; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: indexed_files; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: knowledge_edges; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: knowledge_nodes; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: predictive_asset_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.predictive_asset_cache (
    id integer NOT NULL,
    asset_type text NOT NULL,
    predictions jsonb,
    confidence_score real,
    cache_expires timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: predictive_asset_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.predictive_asset_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: predictive_asset_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.predictive_asset_cache_id_seq OWNED BY public.predictive_asset_cache.id;


--
-- Name: processing_jobs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: processing_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.processing_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: processing_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.processing_jobs_id_seq OWNED BY public.processing_jobs.id;


--
-- Name: qlora_training_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qlora_training_jobs (
    id integer NOT NULL,
    config jsonb NOT NULL,
    status text DEFAULT 'pending'::text,
    performance_metrics jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: qlora_training_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.qlora_training_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: qlora_training_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.qlora_training_jobs_id_seq OWNED BY public.qlora_training_jobs.id;


--
-- Name: query_vectors; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: rag_queries; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: rag_queries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rag_queries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rag_queries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rag_queries_id_seq OWNED BY public.rag_queries.id;


--
-- Name: rag_query_results; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: rag_query_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rag_query_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rag_query_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rag_query_results_id_seq OWNED BY public.rag_query_results.id;


--
-- Name: recommendation_cache; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: vector_embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vector_embeddings (
    id integer NOT NULL,
    document_id text NOT NULL,
    content text,
    embedding public.vector(1536),
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: vector_embeddings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vector_embeddings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vector_embeddings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vector_embeddings_id_seq OWNED BY public.vector_embeddings.id;


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: extracted_entities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extracted_entities ALTER COLUMN id SET DEFAULT nextval('public.extracted_entities_id_seq'::regclass);


--
-- Name: predictive_asset_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictive_asset_cache ALTER COLUMN id SET DEFAULT nextval('public.predictive_asset_cache_id_seq'::regclass);


--
-- Name: processing_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_jobs ALTER COLUMN id SET DEFAULT nextval('public.processing_jobs_id_seq'::regclass);


--
-- Name: qlora_training_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qlora_training_jobs ALTER COLUMN id SET DEFAULT nextval('public.qlora_training_jobs_id_seq'::regclass);


--
-- Name: rag_queries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_queries ALTER COLUMN id SET DEFAULT nextval('public.rag_queries_id_seq'::regclass);


--
-- Name: rag_query_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_query_results ALTER COLUMN id SET DEFAULT nextval('public.rag_query_results_id_seq'::regclass);


--
-- Name: vector_embeddings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vector_embeddings ALTER COLUMN id SET DEFAULT nextval('public.vector_embeddings_id_seq'::regclass);


--
-- Name: ai_engine_status ai_engine_status_engine_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_engine_status
    ADD CONSTRAINT ai_engine_status_engine_name_unique UNIQUE (engine_name);


--
-- Name: ai_engine_status ai_engine_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_engine_status
    ADD CONSTRAINT ai_engine_status_pkey PRIMARY KEY (id);


--
-- Name: ai_history ai_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_history
    ADD CONSTRAINT ai_history_pkey PRIMARY KEY (id);


--
-- Name: case_summary_vectors case_summary_vectors_case_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_summary_vectors
    ADD CONSTRAINT case_summary_vectors_case_id_unique UNIQUE (case_id);


--
-- Name: case_summary_vectors case_summary_vectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_summary_vectors
    ADD CONSTRAINT case_summary_vectors_pkey PRIMARY KEY (id);


--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_pkey PRIMARY KEY (id);


--
-- Name: document_chunks document_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_chunks
    ADD CONSTRAINT document_chunks_pkey PRIMARY KEY (id);


--
-- Name: document_vectors document_vectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_vectors
    ADD CONSTRAINT document_vectors_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: documents documents_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uuid_unique UNIQUE (uuid);


--
-- Name: error_logs error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.error_logs
    ADD CONSTRAINT error_logs_pkey PRIMARY KEY (id);


--
-- Name: evidence_vectors evidence_vectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evidence_vectors
    ADD CONSTRAINT evidence_vectors_pkey PRIMARY KEY (id);


--
-- Name: extracted_entities extracted_entities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extracted_entities
    ADD CONSTRAINT extracted_entities_pkey PRIMARY KEY (id);


--
-- Name: gpu_inference_messages gpu_inference_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gpu_inference_messages
    ADD CONSTRAINT gpu_inference_messages_pkey PRIMARY KEY (id);


--
-- Name: gpu_inference_sessions gpu_inference_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gpu_inference_sessions
    ADD CONSTRAINT gpu_inference_sessions_pkey PRIMARY KEY (id);


--
-- Name: gpu_performance_metrics gpu_performance_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gpu_performance_metrics
    ADD CONSTRAINT gpu_performance_metrics_pkey PRIMARY KEY (id);


--
-- Name: indexed_files indexed_files_file_path_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indexed_files
    ADD CONSTRAINT indexed_files_file_path_unique UNIQUE (file_path);


--
-- Name: indexed_files indexed_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indexed_files
    ADD CONSTRAINT indexed_files_pkey PRIMARY KEY (id);


--
-- Name: knowledge_edges knowledge_edges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_edges
    ADD CONSTRAINT knowledge_edges_pkey PRIMARY KEY (id);


--
-- Name: knowledge_nodes knowledge_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_nodes
    ADD CONSTRAINT knowledge_nodes_pkey PRIMARY KEY (id);


--
-- Name: predictive_asset_cache predictive_asset_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictive_asset_cache
    ADD CONSTRAINT predictive_asset_cache_pkey PRIMARY KEY (id);


--
-- Name: processing_jobs processing_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_jobs
    ADD CONSTRAINT processing_jobs_pkey PRIMARY KEY (id);


--
-- Name: processing_jobs processing_jobs_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processing_jobs
    ADD CONSTRAINT processing_jobs_uuid_unique UNIQUE (uuid);


--
-- Name: qlora_training_jobs qlora_training_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qlora_training_jobs
    ADD CONSTRAINT qlora_training_jobs_pkey PRIMARY KEY (id);


--
-- Name: query_vectors query_vectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_vectors
    ADD CONSTRAINT query_vectors_pkey PRIMARY KEY (id);


--
-- Name: rag_queries rag_queries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_queries
    ADD CONSTRAINT rag_queries_pkey PRIMARY KEY (id);


--
-- Name: rag_queries rag_queries_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_queries
    ADD CONSTRAINT rag_queries_uuid_unique UNIQUE (uuid);


--
-- Name: rag_query_results rag_query_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rag_query_results
    ADD CONSTRAINT rag_query_results_pkey PRIMARY KEY (id);


--
-- Name: recommendation_cache recommendation_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendation_cache
    ADD CONSTRAINT recommendation_cache_pkey PRIMARY KEY (id);


--
-- Name: vector_embeddings vector_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vector_embeddings
    ADD CONSTRAINT vector_embeddings_pkey PRIMARY KEY (id);


--
-- Name: cases_assigned_attorney_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cases_assigned_attorney_idx ON public.cases USING btree (assigned_attorney);


--
-- Name: cases_case_embedding_hnsw_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cases_case_embedding_hnsw_idx ON public.cases USING hnsw (case_embedding public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: cases_case_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cases_case_number_idx ON public.cases USING btree (case_number);


--
-- Name: cases_practice_area_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cases_practice_area_idx ON public.cases USING btree (practice_area);


--
-- Name: cases_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cases_status_idx ON public.cases USING btree (status);


--
-- Name: document_chunks_document_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_chunks_document_id_idx ON public.document_chunks USING btree (document_id);


--
-- Name: document_chunks_embedding_hnsw_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX document_chunks_embedding_hnsw_idx ON public.document_chunks USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: idx_document_chunks_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_chunks_document_id ON public.document_chunks USING btree (document_id);


--
-- Name: idx_document_chunks_embedding_hnsw; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_chunks_embedding_hnsw ON public.document_chunks USING hnsw (embedding public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: idx_document_chunks_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_chunks_index ON public.document_chunks USING btree (document_id, chunk_index);


--
-- Name: cases update_cases_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- PostgreSQL database dump complete
--

\unrestrict LLKyPf46JmqVDt4GefUrdh5M2omVci7zgV2r8QmigYVdKLgLIpLqMx5pBqTeJyU

