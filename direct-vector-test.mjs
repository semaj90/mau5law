/**
 * Simple Vector Similarity Test with Direct Database Operations
 * Works with existing vector_embeddings table structure
 */

import postgres from "postgres";

const sql = postgres(
  "postgresql://legal_admin:123456@localhost:5434/legal_ai_test",
  {
    max: 10,
    idle_timeout: 30,
  }
);

function generateMockEmbedding(text) {
  const seed = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const embedding = [];

  for (let i = 0; i < 1536; i++) {
    const value = Math.sin(seed + i * 0.1) * Math.cos(seed + i * 0.05);
    embedding.push(Number(value.toFixed(6)));
  }

  return embedding;
}

async function seedSimpleDocuments() {
  console.log('🌱 Seeding sample documents...');

  const sampleDocs = [
    {
      id: 'contract-001',
      content: 'Purchase agreement between buyer and seller for real estate property with liability provisions and warranty terms.',
      metadata: { title: 'Real Estate Purchase Contract', type: 'contract' }
    },
    {
      id: 'employment-001',
      content: 'Employment agreement specifying salary, benefits, job responsibilities and confidentiality obligations.',
      metadata: { title: 'Software Engineer Employment Agreement', type: 'employment' }
    },
    {
      id: 'lease-001',
      content: 'Residential lease agreement for rental property including terms for security deposit and maintenance responsibilities.',
      metadata: { title: 'Residential Property Lease', type: 'lease' }
    },
    {
      id: 'license-001',
      content: 'Software license agreement granting usage rights with intellectual property and distribution restrictions.',
      metadata: { title: 'Software License Agreement', type: 'license' }
    }
  ];

  const client = await pool.connect();
  let inserted = 0;

  try {
    // Clear existing data
    await client.query('DELETE FROM vector_embeddings');

    for (const doc of sampleDocs) {
      const embedding = generateMockEmbedding(doc.content);
      const embeddingStr = `[${embedding.join(',')}]`;

      await client.query(
        `INSERT INTO vector_embeddings (document_id, content, embedding, metadata, created_at)
         VALUES ($1, $2, $3::vector, $4, NOW())`,
        [doc.id, doc.content, embeddingStr, doc.metadata]
      );

      inserted++;
      console.log(`✓ Inserted: ${doc.metadata.title}`);
    }

    console.log(`\n✅ Successfully seeded ${inserted} documents\n`);

  } finally {
    client.release();
  }

  return inserted;
}

async function testSimilaritySearch(query, limit = 3) {
  console.log(`🔍 Searching for: "${query}"`);

  const queryEmbedding = generateMockEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT
        document_id,
        content,
        metadata->>'title' as title,
        metadata->>'type' as type,
        embedding <-> $1::vector as cosine_distance,
        embedding <=> $1::vector as euclidean_distance
      FROM vector_embeddings
      ORDER BY embedding <-> $1::vector
      LIMIT $2
    `, [embeddingStr, limit]);

    console.log(`Found ${result.rows.length} matches:`);

    result.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.title} (${row.type})`);
      console.log(`     Cosine distance: ${parseFloat(row.cosine_distance).toFixed(4)}`);
      console.log(`     Content: ${row.content.substring(0, 80)}...`);
      console.log('');
    });

    return result.rows;

  } finally {
    client.release();
  }
}

async function main() {
  console.log('🚀 Direct pgvector Similarity Search Test');
  console.log('==========================================\n');

  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    const client = await pool.connect();
    const version = await client.query('SELECT version()');
    console.log('✓ Connected to PostgreSQL');
    client.release();

    // Seed data
    await seedSimpleDocuments();

    // Test searches
    const queries = [
      'contract purchase property real estate',
      'employment salary job benefits',
      'lease rental property tenant',
      'software license intellectual property'
    ];

    for (const query of queries) {
      await testSimilaritySearch(query);
    }

    console.log('🎯 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
