-- Insert sample vector data for testing similarity search
-- Clear existing data
DELETE FROM vector_embeddings;

-- Insert sample documents with mock embeddings
INSERT INTO vector_embeddings (document_id, content, embedding, metadata, created_at)
VALUES
  ('contract-001',
   'Purchase agreement between buyer and seller for real estate property with liability provisions and warranty terms.',
   (SELECT ARRAY(SELECT random() - 0.5 FROM generate_series(1, 1536)))::vector,
   '{"title": "Real Estate Purchase Contract", "type": "contract"}',
   NOW()),
  ('employment-001',
   'Employment agreement specifying salary, benefits, job responsibilities and confidentiality obligations.',
   (SELECT ARRAY(SELECT random() - 0.5 FROM generate_series(1, 1536)))::vector,
   '{"title": "Employment Agreement", "type": "employment"}',
   NOW()),
  ('lease-001',
   'Residential lease agreement for rental property including terms for security deposit and maintenance responsibilities.',
   (SELECT ARRAY(SELECT random() - 0.5 FROM generate_series(1, 1536)))::vector,
   '{"title": "Residential Lease", "type": "lease"}',
   NOW());

-- Verify data was inserted
SELECT
  document_id,
  metadata->>'title' as title,
  metadata->>'type' as type,
  substring(content, 1, 60) || '...' as content_preview
FROM vector_embeddings;
