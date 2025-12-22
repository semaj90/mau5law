#!/usr/bin/env node
/**
 * Phase 76: MinIO RAG Ingestion for Svelte Docs
 * Uploads Svelte documentation and query results to MinIO for RAG pipeline
 */

import { ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MinIO Configuration
const MINIO_CONFIG = {
    endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
    },
    region: 'us-east-1',
    forcePathStyle: true
};

const BUCKET_NAME = 'legal-documents'; // RAG ingestion bucket
const DOCS_PREFIX = 'svelte-docs/'; // Folder in bucket for Svelte docs

// Create S3 client
const s3Client = new S3Client(MINIO_CONFIG);

/**
 * Upload file to MinIO bucket
 */
async function uploadToMinIO(filePath, objectKey, metadata = {}) {
    try {
        const fileContent = fs.readFileSync(filePath);
        const stats = fs.statSync(filePath);

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: objectKey,
            Body: fileContent,
            ContentType: getContentType(filePath),
            Metadata: {
                'upload-timestamp': new Date().toISOString(),
                'file-size': stats.size.toString(),
                'source': 'phase76-contextual-prompting',
                ...metadata
            }
        });

        await s3Client.send(command);
        console.log(`   ✅ Uploaded: ${objectKey} (${(stats.size / 1024).toFixed(2)} KB)`);
        return true;
    } catch (error) {
        console.error(`   ❌ Failed to upload ${objectKey}: ${error.message}`);
        return false;
    }
}

/**
 * Get content type based on file extension
 */
function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const types = {
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.json': 'application/json'
    };
    return types[ext] || 'application/octet-stream';
}

/**
 * List objects in MinIO bucket with prefix
 */
async function listMinIOObjects(prefix) {
    try {
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: prefix
        });

        const response = await s3Client.send(command);
        return response.Contents || [];
    } catch (error) {
        console.error(`❌ Failed to list objects: ${error.message}`);
        return [];
    }
}

/**
 * Upload all Svelte docs to MinIO
 */
async function uploadSvelteDocs() {
    console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
    console.log(`║  Phase 76: MinIO RAG Ingestion - Svelte Docs                ║`);
    console.log(`╚═══════════════════════════════════════════════════════════════╝\n`);

    const docsDir = path.join(__dirname, '..', '..', 'data', 'svelte-docs');

    if (!fs.existsSync(docsDir)) {
        console.error(`❌ Docs directory not found: ${docsDir}`);
        console.log(`   Run: node scripts/mcp/contextual-prompt-engineer.mjs --force-download\n`);
        process.exit(1);
    }

    console.log(`📁 Source: ${docsDir}`);
    console.log(`🪣  Bucket: ${BUCKET_NAME}`);
    console.log(`📂 Prefix: ${DOCS_PREFIX}\n`);

    // Files to upload
    const filesToUpload = [
        { file: 'svelte.txt', key: `${DOCS_PREFIX}svelte.txt`, metadata: { type: 'svelte-core-docs' } },
        { file: 'sveltekit.txt', key: `${DOCS_PREFIX}sveltekit.txt`, metadata: { type: 'sveltekit-docs' } },
        { file: 'docs-cache.json', key: `${DOCS_PREFIX}docs-cache.json`, metadata: { type: 'cache-metadata' } }
    ];

    let uploadedCount = 0;
    let totalSize = 0;

    for (const { file, key, metadata } of filesToUpload) {
        const filePath = path.join(docsDir, file);

        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️  Skipping ${file} (not found)`);
            continue;
        }

        const success = await uploadToMinIO(filePath, key, metadata);
        if (success) {
            uploadedCount++;
            totalSize += fs.statSync(filePath).size;
        }
    }

    // Upload query results (if any)
    const queryResults = fs.readdirSync(docsDir).filter(f => f.startsWith('query-result-'));

    if (queryResults.length > 0) {
        console.log(`\n📊 Found ${queryResults.length} query results, uploading...\n`);

        for (const file of queryResults) {
            const filePath = path.join(docsDir, file);
            const key = `${DOCS_PREFIX}query-results/${file}`;
            const metadata = {
                type: 'query-result',
                timestamp: file.match(/\d+/)?.[0] || 'unknown'
            };

            const success = await uploadToMinIO(filePath, key, metadata);
            if (success) {
                uploadedCount++;
                totalSize += fs.statSync(filePath).size;
            }
        }
    }

    console.log(`\n✅ Upload complete!`);
    console.log(`   Files: ${uploadedCount}`);
    console.log(`   Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB\n`);

    // List uploaded files
    console.log(`📋 Listing uploaded files in bucket...\n`);
    const objects = await listMinIOObjects(DOCS_PREFIX);

    if (objects.length > 0) {
        console.log(`Found ${objects.length} objects:\n`);
        for (const obj of objects) {
            const size = (obj.Size / 1024).toFixed(2);
            const date = obj.LastModified.toISOString().split('T')[0];
            console.log(`   • ${obj.Key.replace(DOCS_PREFIX, '')} (${size} KB, ${date})`);
        }
    } else {
        console.log(`⚠️  No objects found with prefix: ${DOCS_PREFIX}`);
    }

    console.log(`\n📝 Next steps:`);
    console.log(`   1. Verify files in MinIO: http://localhost:9001/browser/${BUCKET_NAME}`);
    console.log(`   2. RAG pipeline will auto-ingest from ${BUCKET_NAME}/${DOCS_PREFIX}`);
    console.log(`   3. Query knowledge base with Svelte 5 context\n`);
}

/**
 * CLI interface
 */
if (process.argv[1] && (process.argv[1].endsWith('upload-svelte-docs-to-minio.mjs') || process.argv[1] === __filename)) {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  Phase 76: MinIO RAG Ingestion - CLI                         ║
╚═══════════════════════════════════════════════════════════════╝

USAGE:
  node upload-svelte-docs-to-minio.mjs [OPTIONS]

OPTIONS:
  --help, -h            Show this help

ENVIRONMENT:
  MINIO_ENDPOINT        MinIO endpoint (default: http://localhost:9000)
  MINIO_ACCESS_KEY      MinIO access key (default: minioadmin)
  MINIO_SECRET_KEY      MinIO secret key (default: minioadmin)

WHAT IT DOES:
  - Uploads svelte.txt and sveltekit.txt to MinIO
  - Uploads all query results to MinIO
  - Creates svelte-docs/ folder in legal-documents bucket
  - Enables RAG pipeline ingestion for Svelte 5 context

EXAMPLES:
  node upload-svelte-docs-to-minio.mjs
  MINIO_ENDPOINT=http://minio:9000 node upload-svelte-docs-to-minio.mjs

INTEGRATION:
  - Phase 72: RAG/KAG pipeline reads from MinIO bucket
  - Phase 76: Contextual prompting stores docs here
  - Phase 79: Cognitive engine uses RAG-ingested context
        `);
        process.exit(0);
    }

    uploadSvelteDocs().catch(error => {
        console.error(`\n❌ Error: ${error.message}`);
        process.exit(1);
    });
}

export { listMinIOObjects, uploadToMinIO };

