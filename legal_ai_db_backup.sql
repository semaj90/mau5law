--
-- PostgreSQL database dump
--

\restrict D8bKJWjC34CbkH0hJlFdnToSm3cLgtbslnkiFxj52GXMKfMZlY9RD6Ik79AH8c4

-- Dumped from database version 17.6 (Debian 17.6-1.pgdg12+1)
-- Dumped by pg_dump version 17.6 (Debian 17.6-1.pgdg12+1)

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
-- Name: cosine_similarity(public.vector, public.vector); Type: FUNCTION; Schema: public; Owner: legal_admin
--

CREATE FUNCTION public.cosine_similarity(a public.vector, b public.vector) RETURNS double precision
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  RETURN 1 - (a <=> b);
END;
$$;


ALTER FUNCTION public.cosine_similarity(a public.vector, b public.vector) OWNER TO legal_admin;

--
-- Name: hybrid_search(public.vector, text, integer); Type: FUNCTION; Schema: public; Owner: legal_admin
--

CREATE FUNCTION public.hybrid_search(query_embedding public.vector, search_text text, match_count integer DEFAULT 10) RETURNS TABLE(id uuid, content text, vector_similarity double precision, text_rank double precision, combined_score double precision)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    SELECT
      dc.id,
      dc.content,
      1 - (dc.embedding <=> query_embedding) as similarity
    FROM document_chunks dc
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  text_results AS (
    SELECT
      dc.id,
      dc.content,
      ts_rank(to_tsvector('english', dc.content),
              plainto_tsquery('english', search_text)) as rank
    FROM document_chunks dc
    WHERE to_tsvector('english', dc.content) @@ plainto_tsquery('english', search_text)
    LIMIT match_count * 2
  )
  SELECT
    COALESCE(v.id, t.id) as id,
    COALESCE(v.content, t.content) as content,
    COALESCE(v.similarity, 0) as vector_similarity,
    COALESCE(t.rank, 0) as text_rank,
    (COALESCE(v.similarity, 0) * 0.7 + COALESCE(t.rank, 0) * 0.3) as combined_score
  FROM vector_results v
  FULL OUTER JOIN text_results t ON v.id = t.id
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;


ALTER FUNCTION public.hybrid_search(query_embedding public.vector, search_text text, match_count integer) OWNER TO legal_admin;

--
-- Name: search_similar_documents(public.vector, integer, double precision, text); Type: FUNCTION; Schema: public; Owner: legal_admin
--

CREATE FUNCTION public.search_similar_documents(query_embedding public.vector, match_count integer DEFAULT 5, threshold double precision DEFAULT 0.7, doc_type text DEFAULT NULL::text) RETURNS TABLE(id uuid, content text, similarity double precision, metadata jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity,
    dc.metadata
  FROM document_chunks dc
  WHERE
    1 - (dc.embedding <=> query_embedding) > threshold
    AND (doc_type IS NULL OR dc.document_type = doc_type)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION public.search_similar_documents(query_embedding public.vector, match_count integer, threshold double precision, doc_type text) OWNER TO legal_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: legal_admin
--

CREATE TABLE public.activities (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    action character varying(255),
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.activities OWNER TO legal_admin;

--
-- Name: case_seq; Type: SEQUENCE; Schema: public; Owner: legal_admin
--

CREATE SEQUENCE public.case_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.case_seq OWNER TO legal_admin;

--
-- Name: cases; Type: TABLE; Schema: public; Owner: legal_admin
--

CREATE TABLE public.cases (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    case_number character varying(100) NOT NULL,
    title character varying(500) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'open'::character varying,
    priority character varying(50) DEFAULT 'medium'::character varying,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.cases OWNER TO legal_admin;

--
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: legal_admin
--

CREATE TABLE public.chat_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    title character varying(255) DEFAULT 'Chat Session'::character varying,
    context jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.chat_sessions OWNER TO legal_admin;

--
-- Name: evidence; Type: TABLE; Schema: public; Owner: legal_admin
--

CREATE TABLE public.evidence (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    case_id uuid,
    title character varying(500),
    content text,
    file_path character varying(1000),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.evidence OWNER TO legal_admin;

--
-- Name: legal_documents; Type: TABLE; Schema: public; Owner: legal_admin
--

CREATE TABLE public.legal_documents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    case_id uuid,
    title character varying(500),
    document_type character varying(100),
    content text,
    full_text text,
    summary text,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.legal_documents OWNER TO legal_admin;

--
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: legal_admin
--

COPY public.activities (id, user_id, action, details, created_at) FROM stdin;
\.


--
-- Data for Name: cases; Type: TABLE DATA; Schema: public; Owner: legal_admin
--

COPY public.cases (id, case_number, title, description, status, priority, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: chat_sessions; Type: TABLE DATA; Schema: public; Owner: legal_admin
--

COPY public.chat_sessions (id, user_id, title, context, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: evidence; Type: TABLE DATA; Schema: public; Owner: legal_admin
--

COPY public.evidence (id, case_id, title, content, file_path, created_at) FROM stdin;
\.


--
-- Data for Name: legal_documents; Type: TABLE DATA; Schema: public; Owner: legal_admin
--

COPY public.legal_documents (id, case_id, title, document_type, content, full_text, summary, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Name: case_seq; Type: SEQUENCE SET; Schema: public; Owner: legal_admin
--

SELECT pg_catalog.setval('public.case_seq', 1, false);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: legal_admin
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: cases cases_case_number_key; Type: CONSTRAINT; Schema: public; Owner: legal_admin
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_case_number_key UNIQUE (case_number);


--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: public; Owner: legal_admin
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_pkey PRIMARY KEY (id);


--
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: legal_admin
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: evidence evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: legal_admin
--

ALTER TABLE ONLY public.evidence
    ADD CONSTRAINT evidence_pkey PRIMARY KEY (id);


--
-- Name: legal_documents legal_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: legal_admin
--

ALTER TABLE ONLY public.legal_documents
    ADD CONSTRAINT legal_documents_pkey PRIMARY KEY (id);


--
-- Name: evidence evidence_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: legal_admin
--

ALTER TABLE ONLY public.evidence
    ADD CONSTRAINT evidence_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id);


--
-- Name: legal_documents legal_documents_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: legal_admin
--

ALTER TABLE ONLY public.legal_documents
    ADD CONSTRAINT legal_documents_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id);


--
-- PostgreSQL database dump complete
--

\unrestrict D8bKJWjC34CbkH0hJlFdnToSm3cLgtbslnkiFxj52GXMKfMZlY9RD6Ik79AH8c4

