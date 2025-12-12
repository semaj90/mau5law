/**
 * Index Existing lawpdfs to RAG System
 *
 * This script indexes all PDF files in the lawpdfs directory into the RAG system.
 * It creates evidence_files records, chunks the documents, generates embeddings,
 * and adds them to Qdrant.
 *
 * Usage:
 *   npx tsx scripts/index-lawpdfs-to-rag.ts
 */

import { readdir, stat, readFile } from 'fs/promises';
import { join } from 'path';
import { sql } from '../sveltekit-frontend/src/lib/server/db';
import { addEvidenceToRagIndex } from '../sveltekit-frontend/src/lib/server/rag-sync';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LAWPDFS_DIR = join(__dirname, '..', 'lawpdfs');
const DEFAULT_CASE_ID = '00000000-0000-0000-0000-000000000001'; // Default case for existing docs
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001'; // System user

interface IndexResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ file: string; error: string }>;
}

/**
 * Extract jurisdiction from filename or content
 */
function extractJurisdiction(filename: string): string {
  const lower = filename.toLowerCase();

  if (lower.includes('california') || lower.includes('ca.gov')) return 'CA';
  if (lower.includes('texas')) return 'TX';
  if (lower.includes('new york') || lower.includes('ny')) return 'NY';
  if (lower.includes('federal') || lower.includes('usdoj') || lower.includes('u.s.')) return 'Fed-US';

  return 'Other';
}

/**
 * Extract tags from filename
 */
function extractTags(filename: string): string[] {
  const tags: string[] = [];
  const lower = filename.toLowerCase();

  // Legal concepts
  if (lower.includes('trafficking')) tags.push('human-trafficking');
  if (lower.includes('sexual abuse') || lower.includes('sex offender')) tags.push('sexual-abuse');
  if (lower.includes('child')) tags.push('child-related');
  if (lower.includes('federal prison') || lower.includes('correctional')) tags.push('corrections');
  if (lower.includes('habeas corpus')) tags.push('habeas-corpus');
  if (lower.includes('insider trading')) tags.push('insider-trading');
  if (lower.includes('fraud')) tags.push('fraud');
  if (lower.includes('obstruction')) tags.push('obstruction');

  // Document types
  if (lower.includes('bill text')) tags.push('legislation');
  if (lower.includes('court of appeal')) tags.push('case-law');
  if (lower.includes('people v.')) tags.push('criminal-case');
  if (lower.includes('code')) tags.push('statute');

  return tags;
}

/**
 * Create evidence record for a PDF file
 */
async function createEvidenceRecord(
  filename: string,
  fileSize: number,
  minioPath: string
): Promise<string> {
  // Check if evidence record already exists
  const existing = await sql`
    SELECT id FROM evidence_files WHERE filename = ${filename}
  `;

  if (existing.length > 0) {
    console.log(`  📄 Evidence record already exists: ${existing[0].id}`);
    return existing[0].id;
  }

  const jurisdiction = extractJurisdiction(filename);
  const tags = extractTags(filename);

  console.log(`  📄 Creating evidence record for: ${filename}`);
  console.log(`     Jurisdiction: ${jurisdiction}`);
  console.log(`     Tags: ${tags.join(', ') || 'none'}`);

  // Create evidence_files record (matching actual schema)
  const result = await sql`
    INSERT INTO evidence_files (
      case_id,
      filename,
      minio_object_name,
      content_type,
      size_bytes,
      metadata,
      created_at,
      updated_at
    ) VALUES (
      ${DEFAULT_CASE_ID},
      ${filename},
      ${minioPath},
      'application/pdf',
      ${fileSize},
      ${JSON.stringify({ jurisdiction })},
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  const evidenceId = result[0].id;

  // Note: citation_tags and evidence_tags tables may not exist yet
  // This is fine - the RAG system will still work with just the evidence_files and evidence_chunks

  return evidenceId;
}

/**
 * Parse PDF and create chunks using LangChain
 */
async function parsePdfAndCreateChunks(
  evidenceId: string,
  filepath: string,
  filename: string
): Promise<number> {
  // Check if chunks already exist
  const existingChunks = await sql`
    SELECT COUNT(*) as count FROM evidence_chunks WHERE evidence_id = ${evidenceId}
  `;

  if (existingChunks[0].count > 0) {
    console.log(`     Chunks already exist: ${existingChunks[0].count} chunks`);
    return existingChunks[0].count;
  }

  console.log(`  📖 Parsing PDF: ${filename}`);

  try {
    // Use pdfjs-dist directly for reliable PDF parsing
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    // Read PDF file
    const dataBuffer = await readFile(filepath);
    const uint8Array = new Uint8Array(dataBuffer);

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;

    // Extract text from all pages
    let fullText = '';
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');
      fullText += pageText + '\n\n';
    }

    console.log(`     Extracted ${fullText.length} characters from ${totalPages} pages`);

    if (!fullText || fullText.trim().length < 50) {
      throw new Error('PDF parsing failed or document is empty');
    }

    // Initialize LangChain text splitter with legal-optimized settings
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,        // Larger chunks for legal context
      chunkOverlap: 200,      // Preserve legal citations across chunks
      separators: ['\n\n', '\n', '. ', ' ', ''], // Legal document structure
    });

    // Split text into chunks
    const chunks = await textSplitter.splitText(fullText);
    console.log(`     Created ${chunks.length} chunks`);

    // Insert chunks into database
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Estimate page number based on character position
      const chunkStartPos = fullText.indexOf(chunk);
      const estimatedPage = Math.ceil((chunkStartPos / fullText.length) * totalPages) || 1;

      await sql`
        INSERT INTO evidence_chunks (
          evidence_id,
          chunk_index,
          content,
          page_number,
          metadata,
          created_at,
          updated_at
        ) VALUES (
          ${evidenceId},
          ${i},
          ${chunk},
          ${estimatedPage},
          ${JSON.stringify({
            chunkSize: chunk.length,
            totalPages,
            filename,
            parsedAt: new Date().toISOString()
          })},
          NOW(),
          NOW()
        )
      `;
    }

    return chunks.length;

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`     ❌ PDF parsing failed: ${errorMsg}`);
    throw new Error(`Failed to parse PDF ${filename}: ${errorMsg}`);
  }
}

/**
 * Index all PDF files in lawpdfs directory
 */
async function indexLawpdfs(): Promise<IndexResult> {
  console.log('🚀 Starting lawpdfs indexing...\n');

  const result: IndexResult = {
    total: 0,
    success: 0,
    failed: 0,
    errors: []
  };

  try {
    // Read all files in lawpdfs directory
    const files = await readdir(LAWPDFS_DIR);
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));

    result.total = pdfFiles.length;
    console.log(`📚 Found ${pdfFiles.length} PDF files\n`);

    // Process each PDF
    for (let i = 0; i < pdfFiles.length; i++) {
      const filename = pdfFiles[i];
      const filepath = join(LAWPDFS_DIR, filename);

      console.log(`[${i + 1}/${pdfFiles.length}] Processing: ${filename}`);

      try {
        // Get file size
        const stats = await stat(filepath);
        const fileSize = stats.size;

        // MinIO path (relative to lawpdfs bucket)
        const minioPath = `lawpdfs/${filename}`;

        // Create evidence record
        const evidenceId = await createEvidenceRecord(filename, fileSize, minioPath);
        console.log(`  ✅ Evidence record created: ${evidenceId}`);

        // Parse PDF and create chunks with LangChain
        const chunkCount = await parsePdfAndCreateChunks(evidenceId, filepath, filename);
        console.log(`  ✅ Created ${chunkCount} chunk(s)`);

        // Add to RAG index
        console.log(`  🔄 Adding to RAG index...`);
        const ragResult = await addEvidenceToRagIndex(evidenceId, {
          userId: DEFAULT_USER_ID,
          logAudit: false  // Skip audit logging - table may not exist
        });

        if (ragResult.success) {
          console.log(`  ✅ RAG indexing complete: ${ragResult.chunksProcessed} chunks indexed`);
          result.success++;
        } else {
          console.error(`  ❌ RAG indexing failed: ${ragResult.message}`);
          result.failed++;
          result.errors.push({ file: filename, error: ragResult.message });
        }

        console.log(''); // Blank line between files

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`  ❌ Failed to process: ${errorMsg}\n`);
        result.failed++;
        result.errors.push({ file: filename, error: errorMsg });
      }
    }

  } catch (err) {
    console.error('❌ Fatal error:', err);
    throw err;
  }

  return result;
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Index lawpdfs to RAG System');
  console.log('═══════════════════════════════════════════════════════════\n');

  const startTime = Date.now();

  try {
    const result = await indexLawpdfs();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  Indexing Complete');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`Total files:     ${result.total}`);
    console.log(`✅ Success:      ${result.success}`);
    console.log(`❌ Failed:       ${result.failed}`);
    console.log(`⏱️  Duration:     ${duration}s\n`);

    if (result.errors.length > 0) {
      console.log('Errors:');
      result.errors.forEach(({ file, error }) => {
        console.log(`  - ${file}: ${error}`);
      });
      console.log('');
    }

    console.log('✨ Done!\n');

    process.exit(result.failed > 0 ? 1 : 0);

  } catch (err) {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  }
}

// Run if executed directly
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
  main().catch(console.error);
}

export { indexLawpdfs, createEvidenceRecord, parsePdfAndCreateChunks };
