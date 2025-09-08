--
-- PostgreSQL database dump
--

\restrict 8lRDeoi7Oi4SYTHFPKpqqDUGD8g4Q6HtXnJlMVSlebJZa6AHZR9cMt8Es8int9n

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
-- Data for Name: ai_engine_status; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_engine_status (id, engine_name, is_online, last_health_check, response_time, version, capabilities, configuration, error_status, metadata) FROM stdin;
\.


--
-- Data for Name: ai_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_history (id, user_id, prompt, response, embedding, created_at) FROM stdin;
\.


--
-- Data for Name: case_summary_vectors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.case_summary_vectors (id, case_id, summary, embedding, confidence, last_updated) FROM stdin;
\.


--
-- Data for Name: cases; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cases (id, title, description, case_number, status, priority, practice_area, jurisdiction, court, client_name, opposing_party, assigned_attorney, filing_date, due_date, closed_date, case_embedding, qdrant_id, qdrant_collection, metadata, created_at, updated_at) FROM stdin;
c221f2a3-cf0e-4102-81f8-d7d88c707a67	Sample Case	\N	\N	open	medium	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	cases	{}	2025-09-02 20:41:53.829909-07	2025-09-02 20:41:53.829909-07
1c0cff20-9a9f-4eb4-a021-0390df70f16b	Sample Case	\N	\N	open	medium	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	cases	{}	2025-09-02 20:42:48.071747-07	2025-09-02 20:42:48.071747-07
\.


--
-- Data for Name: document_chunks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.document_chunks (id, document_id, document_type, chunk_index, content, embedding, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: document_vectors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.document_vectors (id, document_id, chunk_index, content, embedding, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documents (id, uuid, case_id, filename, original_name, content_type, file_size, minio_path, extracted_text, processing_status, processing_error, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: error_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.error_logs (id, message, stack_trace, embedding, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: evidence_vectors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.evidence_vectors (id, evidence_id, chunk_index, content, embedding, analysis_type, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: extracted_entities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.extracted_entities (id, document_id, chunk_id, entity_type, entity_value, confidence, start_offset, end_offset, context, created_at) FROM stdin;
\.


--
-- Data for Name: gpu_inference_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gpu_inference_messages (id, session_id, role, content, embedding, engine_used, response_time, tokens_generated, cache_hit, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: gpu_inference_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gpu_inference_sessions (id, session_name, user_id, engine_used, created_at, updated_at, metadata, is_active) FROM stdin;
\.


--
-- Data for Name: gpu_performance_metrics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gpu_performance_metrics (id, session_id, engine_type, request_count, avg_response_time, cache_hit_rate, tokens_per_second, gpu_utilization, memory_usage, error_count, metadata, measured_at) FROM stdin;
\.


--
-- Data for Name: indexed_files; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.indexed_files (id, file_path, content, embedding, summary, metadata, indexed_at) FROM stdin;
\.


--
-- Data for Name: knowledge_edges; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.knowledge_edges (id, source_id, target_id, relationship, weight, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: knowledge_nodes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.knowledge_nodes (id, node_type, node_id, label, embedding, properties, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: predictive_asset_cache; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.predictive_asset_cache (id, asset_type, predictions, confidence_score, cache_expires, created_at) FROM stdin;
\.


--
-- Data for Name: processing_jobs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.processing_jobs (id, uuid, document_id, job_type, status, current_step, progress, result, error, started_at, completed_at, created_at) FROM stdin;
\.


--
-- Data for Name: qlora_training_jobs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.qlora_training_jobs (id, config, status, performance_metrics, created_at) FROM stdin;
\.


--
-- Data for Name: query_vectors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.query_vectors (id, user_id, query, embedding, result_count, clicked_results, created_at) FROM stdin;
\.


--
-- Data for Name: rag_queries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rag_queries (id, uuid, case_id, query, query_embedding, response, model, tokens_used, processing_time_ms, similarity_threshold, results_count, user_feedback, created_at) FROM stdin;
\.


--
-- Data for Name: rag_query_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rag_query_results (id, query_id, chunk_id, similarity_score, rank, used, created_at) FROM stdin;
\.


--
-- Data for Name: recommendation_cache; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recommendation_cache (id, user_id, recommendation_type, recommendations, score, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: vector_embeddings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vector_embeddings (id, document_id, content, embedding, metadata, created_at) FROM stdin;
\.


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.documents_id_seq', 1, false);


--
-- Name: extracted_entities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.extracted_entities_id_seq', 1, false);


--
-- Name: predictive_asset_cache_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.predictive_asset_cache_id_seq', 1, false);


--
-- Name: processing_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.processing_jobs_id_seq', 1, false);


--
-- Name: qlora_training_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.qlora_training_jobs_id_seq', 1, false);


--
-- Name: rag_queries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rag_queries_id_seq', 1, false);


--
-- Name: rag_query_results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rag_query_results_id_seq', 1, false);


--
-- Name: vector_embeddings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.vector_embeddings_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict 8lRDeoi7Oi4SYTHFPKpqqDUGD8g4Q6HtXnJlMVSlebJZa6AHZR9cMt8Es8int9n

