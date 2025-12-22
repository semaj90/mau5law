import 'dotenv/config';
import { Client } from 'minio';

// Configuration
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000', 10);
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'minioadmin';
const BUCKET_NAME = 'ace-web-derived';
const REPORT_NAME = 'summary/phase79-architecture-report.md';

const minio = new Client({
    endPoint: MINIO_ENDPOINT,
    port: MINIO_PORT,
    useSSL: MINIO_USE_SSL,
    accessKey: MINIO_ACCESS_KEY,
    secretKey: MINIO_SECRET_KEY
});

async function generateAndStoreReport() {
    console.log('📝 Generating Phase 79 Architecture Report...');

    const reportContent = `# Phase 79 Architecture Report: Agentic Repair & Knowledge Base Sync

**Date:** ${new Date().toISOString()}
**Status:** In Progress / Integration

## 1. System Components

### Agentic Repair (Phase 79)
- **Script:** 
- **Role:** Autonomous repair agent using LLM (Ollama/Gemini).
- **Tools:**
  - 
  - 
  - 
- **Loop:** Think -> Act -> Observe -> Repeat (Max 5 iterations).

### Knowledge Base (Phase 78)
- **Clustering:** Errors clustered via 
- **Embeddings:** Generated via Ollama (Gemma), now optimized with **Redis Caching**.
- **Storage:**
  - **Postgres:** 
  - **PgVector:** Added 
 to 
 for database-level similarity.
  - **Qdrant:** Mirrored to 
 collection for RAG via 
.

### Caching Layer
- **Redis:** Integrated into 
 via 
.
- **Usage:** Prevents re-computation of embeddings for same error messages.

## 2. Recent Actions & Fixes

- **Redis Integration:** Patched 
 and clustering scripts to use Redis.
- **Vector Sync:** Created 
 to populate Qdrant from Postgres.
- **Schema Update:** Identified need for 
.

## 3. Next Steps

1. **Database Update:** Run the SQL ALTER command.
2. **Sync:** Run 
.
3. **Deploy Agent:** Run 
.
4. **Analysis:** Monitor agent success rate and refine prompts.

## 4. Architecture Diagram (Text)

[Ollama/Gemini] <---> [Agentic Script] <---> [Tools: File System]
       ^
       |
       v                     v
[Redis Cache] <---> [Postgres DB] ---> [Qdrant Vector DB]
`;

    try {
        // Ensure bucket exists
        const exists = await minio.bucketExists(BUCKET_NAME);
        if (!exists) {
            await minio.makeBucket(BUCKET_NAME, 'us-east-1'); // Region defaults
            console.log(`✅ Created bucket: ${BUCKET_NAME}`);
        }

        // Upload report
        await minio.putObject(BUCKET_NAME, REPORT_NAME, reportContent, {
            'Content-Type': 'text/markdown',
            'X-Amz-Meta-Source': 'phase79-agent'
        });

        console.log(`✅ Report stored in MinIO: ${BUCKET_NAME}/${REPORT_NAME}`);
        console.log(`   Size: ${reportContent.length} bytes`);

    } catch (err) {
        console.error('❌ Failed to store report in MinIO:', err);
        process.exit(1);
    }
}

generateAndStoreReport().catch(console.error);
