// Generate test embeddings for semantic search testing
import postgres from "postgres";

const sql = postgres(
  "postgresql://legal_admin:123456@localhost:5434/legal_ai_test",
  {
    max: 10,
  }
);

async function generateEmbedding(text) {
  const response = await fetch('http://localhost:11434/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'nomic-embed-text',
      input: text
    })
  });
  const result = await response.json();
  return result.embeddings[0];
}

async function main() {
  await client.connect();
  console.log('Connected to database');

  // Get evidence records
  const evidenceResult = await client.query('SELECT id, title, description FROM evidence ORDER BY id');

  for (const row of evidenceResult.rows) {
    console.log(`Generating embedding for: ${row.title}`);
    const embedding = await generateEmbedding(row.description);

    // Insert into evidence_vectors table
    await client.query(
      'INSERT INTO evidence_vectors (evidence_id, chunk_index, content, embedding) VALUES ($1, $2, $3, $4)',
      [row.id, 0, row.description, JSON.stringify(embedding)]
    );
    console.log(`✅ Embedded: ${row.title}`);
  }

  // Also create some test case data with embeddings
  const caseData = [
    {
      id: '44444444-4444-4444-4444-444444444444',
      title: 'Contract Breach Litigation',
      case_number: 'CV-2024-001',
      description: 'Multi-million dollar commercial contract dispute involving delivery failures and payment defaults in technology sector.'
    },
    {
      id: '55555555-5555-5555-5555-555555555555',
      title: 'Employment Discrimination Case',
      case_number: 'EMP-2024-002',
      description: 'Class action lawsuit for workplace discrimination and hostile work environment affecting multiple employees.'
    }
  ];

  // Insert case data
  for (const caseItem of caseData) {
    await client.query(
      'INSERT INTO cases (id, title, case_number, description) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
      [caseItem.id, caseItem.title, caseItem.case_number, caseItem.description]
    );

    console.log(`Generating embedding for case: ${caseItem.title}`);
    const embedding = await generateEmbedding(caseItem.description);

    await client.query(
      'INSERT INTO case_embeddings (case_id, content, embedding) VALUES ($1, $2, $3)',
      [caseItem.id, caseItem.description, JSON.stringify(embedding)]
    );
    console.log(`✅ Embedded case: ${caseItem.title}`);
  }

  console.log('✅ All test embeddings generated successfully!');
  await client.end();
}

main().catch(console.error);