-- Optimized Case Embeddings Schema for Legal Document Processing
-- Based on 100 PDFs × 400 pages = 40k pages → ~31k-62k vectors
-- Perfect fit for Postgres + pgvector with IVFFLAT indexing

-- Create optimized case embeddings table
CREATE TABLE IF NOT EXISTS case_embeddings_optimized (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL,
  doc_id UUID NOT NULL,
  page_no INT NOT NULL,
  chunk_no INT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768), -- Using actual embedding dimensions
  doc_title TEXT,
  chunk_type VARCHAR(50) DEFAULT 'content',
  token_count INT,
  overlap_start INT DEFAULT 0,
  overlap_end INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

-- Create IVFFLAT index for fast similarity search
-- lists = 100 is optimal for ~31k-62k vectors
CREATE INDEX IF NOT EXISTS case_embeddings_optimized_idx
ON case_embeddings_optimized
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Additional indexes for efficient filtering
CREATE INDEX IF NOT EXISTS case_embeddings_case_id_idx ON case_embeddings_optimized(case_id);
CREATE INDEX IF NOT EXISTS case_embeddings_doc_page_idx ON case_embeddings_optimized(doc_id, page_no);
CREATE INDEX IF NOT EXISTS case_embeddings_chunk_idx ON case_embeddings_optimized(case_id, page_no, chunk_no);

-- Insert test data with proper chunking simulation
INSERT INTO case_embeddings_optimized (case_id, doc_id, page_no, chunk_no, content, embedding, doc_title, token_count)
VALUES
-- Case 1: Contract Dispute
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 1, 1,
 'This contract shows clear breach of agreement terms related to payment schedules and deliverables in commercial litigation. The defendant failed to meet contractual obligations outlined in Section 3.2.',
 '[0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0]'::vector,
 'Commercial Contract Agreement', 412),

('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 1, 2,
 'Section 3.2 Payment Terms: All payments shall be made within thirty (30) days of invoice receipt. Late payments incur 1.5% monthly interest. Force majeure clauses do not apply to payment obligations.',
 '[0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1]'::vector,
 'Commercial Contract Agreement', 389),

-- Case 2: Employment Law
('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 1, 1,
 'Wrongful termination case involving discrimination and violation of employment contract provisions. Employee alleges gender-based discrimination in promotion decisions and hostile work environment.',
 '[0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2]'::vector,
 'Employment Termination Documentation', 456),

-- IP Case
('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 1, 1,
 'Patent infringement case with technical documentation and prior art analysis for software algorithms. Plaintiff claims defendant copied proprietary machine learning optimization techniques.',
 '[0.4,0.5,0.6,0.7,0.8,0.9,1.0,0.1,0.2,0.3]'::vector,
 'Patent Technical Documentation', 398);

-- Performance analysis query
SELECT
  'case_embeddings_optimized' as table_name,
  COUNT(*) as total_chunks,
  COUNT(DISTINCT case_id) as unique_cases,
  COUNT(DISTINCT doc_id) as unique_documents,
  MAX(page_no) as max_page,
  MAX(chunk_no) as max_chunk_per_page,
  AVG(token_count) as avg_tokens_per_chunk
FROM case_embeddings_optimized;