/* CONSOLIDATED DATABASE EXPORT Re-exports the canonical database connection from drizzle.ts (node-postgres adapter) This file exists for backward compatibility with legacy imports. MIGRATION GUIDE: -, OLD: import { db } from '$lib/server/db' - NEW: import { db } from '$lib/server/db/index' (preferred) This ensures all code uses the same connection pool (pg.Pool with node-postgres adapter) */ // Re-export canonical database connection (node-postgres with pg.Pool) export { db, sql, pool } from './db/drizzle'; export type DB = typeof import('./db/drizzle').db; // Re-export Drizzle query helpers import { sql as drizzleSql } from 'drizzle-orm'; import { eq, and, or, ilike, like } from 'drizzle-orm'; import { count } from 'drizzle-orm'; // Local ordering helpers for backward compatibility // eslint-disable-next-line @typescript-eslint/no-explicit-any const desc = (col: unknown) => drizzleSql`${col} DESC`; // eslint-disable-next-line @typescript-eslint/no-explicit-any const asc = (col: unknown) => drizzleSql`${col} ASC`; export { eq, and, or, ilike, like, desc, asc, count }; export const helpers = { eq, and, or, ilike, like, desc, asc, count } as const; // Re-export commonly used pg-core helpers export { pgTable, serial, text, integer, timestamp, boolean, json, index } from 'drizzle-orm/pg-core'; // Re-export all schema tables from canonical source export * from './db/schema-actual'; export * from './schema';

import { db } from './db/client';
import { documents, documentChunks } from './db/schema-postgres';
import type { LegalDocument } from '../../routes/api/legal/ingest/+server';

export async function storeDocumentsInDatabase(
  documentsToStore: LegalDocument[],
  caseId: string
): Promise<void> {
  console.log(
    `💾 Storing ${documentsToStore.length} documents for case ${caseId} in PostgreSQL...`
  );

  try {
    for (const doc of documentsToStore) {
      // Insert document with corrected field mappings to match schema
      const [insertedDocument] = await db
        .insert(documents)
        .values({
          title: doc.filename, // Map filename to title
          s3Key: '', // Default or provide actual S3 key if available
          originalName: doc.filename, // Map filename to originalName
          mimeType: 'application/pdf', // Default MIME type; adjust as needed
          status: 'processed', // Default status
          caseId: caseId,
        })
        .returning({ id: documents.id }); // Assuming id exists; remove if not in schema

      if (insertedDocument) {
        // Insert chunks with corrected field mappings
        const chunksToInsert = doc.chunks.map((chunk) => ({
          id: chunk.id,
          documentId: insertedDocument.id,
          chunkText: chunk.text, // Map text to chunkText
          chunkIndex: chunk.position, // Map position to chunkIndex
          embedding: chunk.embedding ? JSON.stringify(chunk.embedding) : null, // Convert to string
          // Omitted: legalRelevance and entities (not in schema)
        }));

        if (chunksToInsert.length > 0) {
          await db.insert(documentChunks).values(chunksToInsert);
        }
      }
    }
    console.log(`✅ Successfully stored documents and chunks for case ${caseId}.`);
  } catch (error) {
    console.error(`❌ Error storing documents for case ${caseId}:`, error);
    throw error;
  }
}