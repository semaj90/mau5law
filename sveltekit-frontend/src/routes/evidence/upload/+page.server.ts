/**
 * Evidence Upload Server Actions
 * Integrates with Superforms + Zod + Rich Evidence Schema
 */
import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'node:crypto';
import {
  evidenceUploadSchema,
  getFileTypeFromMime,
  validateFileSize,
  validateFileType,
} from '$lib/schemas/evidence-upload';
import { db } from '$lib/server/db'; // Adjust the import based on your project structure
import { evidence, cases } from '$lib/server/db/schema'; // Adjust the import based on your project structure
import { eq } from 'drizzle-orm';
import { resolveUser, getUserId, getMetaEnv } from '$lib/server/auth/utils';
import type { InferInsertModel } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types.js';
import { dev } from '$app/environment';

// Get typed environment access
const metaEnv = getMetaEnv();

type EvidenceType = InferInsertModel<typeof evidence>['evidence_type'];

// 1. Define the structure of the OCR service response
interface OcrResultData {
  filename: string;
  pages: number;
  averageConfidence: number;
  legalConcepts: string[];
  citations: string[];
  text: string;
}

// 2. Define processing options
interface ProcessingOptions {
  enableAiAnalysis: boolean;
  enableOcr: boolean;
  enableEmbeddings: boolean;
  enableSummarization: boolean;
}

// 3. Define the structure for the `ocrResult` field within the final database metadata
interface DbOcrResult {
  extractedText: string;
  confidence: number;
  legalConcepts: string[];
  citations: string[];
  pageCount: number;
}

// 4. Define the structure for the `goServiceProcessing` field within the final database metadata
interface GoServiceProcessingResult {
  embeddings?: Record<string, unknown>; // Changed from any
  analysis?: Record<string, unknown>; // Changed from any
  processedAt: string;
}

// Define a more specific type for ChainOfCustody entries
interface ChainOfCustodyEntry {
  event: string;
  timestamp: string;
  actor: string;
  details?: Record<string, unknown>;
}

// 5. Define the comprehensive schema for the `metadata` column in the database
// This type needs to cover all possible fields that can be added to `metadata`.
interface FinalEvidenceMetadata {
  kind: EvidenceType | 'UNKNOWN';
  uploadedAt: string;
  fileSize: number;
  processingOptions: ProcessingOptions;
  tags: string[];
  confidentialityLevel: string;
  isAdmissible: boolean;
  collectedAt: string;
  collectedBy: string;
  location?: string;
  chainOfCustody: ChainOfCustodyEntry[]; // Changed from any[]
  ocrResult: DbOcrResult | null;
  goServiceProcessing?: GoServiceProcessingResult;

  // File-type specific fields (made optional as not all apply to every type)
  pageCount?: number;
  isEncrypted?: boolean;
  title?: string; // For PDF, also general title
  extractedText?: string; // For PDF, Image, Text
  legalConcepts?: string[]; // For PDF, Image
  citations?: string[]; // For PDF, Image
  ocrConfidence?: number; // For PDF, Image
  resolution?: { width: number; height: number }; // For Image, Video
  format?: string; // For Image
  hasAlphaChannel?: boolean; // For Image
  durationSeconds?: number; // For Video, Audio
  codec?: string; // For Video, Audio
  frameRate?: number; // For Video
  sampleRate?: number; // For Audio
  channels?: number; // For Audio
  wordCount?: number; // For Text
  characterCount?: number; // For Text
  language?: string; // For Text
}

// Define a type for the intermediate metadata object that ensures required fields are present
type IntermediateEvidenceMetadata = {
  kind: EvidenceType | 'UNKNOWN';
  uploadedAt: string;
  fileSize: number;
  processingOptions: ProcessingOptions;
} & Partial<FinalEvidenceMetadata>; // All other fields are optional

export const load: PageServerLoad = async ({ locals }) => {
  // Initialize the form with default values
  const form = await superValidate(zod(evidenceUploadSchema));

  // Resolve user (supports DEV_BYPASS_AUTH in dev)
  const user = resolveUser(locals);

  // If no user and dev bypass enabled, return demo data
  if (!user && dev && (process.env.DEV_BYPASS_AUTH === 'true' || metaEnv.DEV_BYPASS_AUTH === 'true')) {
    console.warn('DEV_BYPASS_AUTH: returning demo cases for evidence upload');
    return {
      form,
      cases: [
        { id: 'dev-case-001', title: 'Development Case', case_number: 'DEV-0001', status: 'active' },
        { id: 'dev-case-002', title: 'Sample Evidence Case', case_number: 'DEV-0002', status: 'active' },
      ],
    };
  }

  // Get available cases for the current user
  try {
    const userCases = await db
      .select({
        id: cases.id,
        title: cases.title,
        case_number: cases.case_number,
        status: cases.status,
      })
      .from(cases)
      .where(eq(cases.status, 'active'))
      .orderBy(cases.created_at);
    return {
      form,
      cases: userCases,
    };
  } catch (error: unknown) {
    console.error('Failed to load cases:', error);
    return {
      form,
      cases: [],
    };
  }
};

export const actions: Actions = {
  upload: async ({ request, locals }) => {
    try {
      // 1) Parse incoming form data
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return fail(400, {
          form: {
            errors: { file: ['No file provided'] },
          },
        });
      }

      const caseId = (formData.get('case_id') ?? '')?.toString() || null;
      const title = (formData.get('title') ?? '').toString();
      const description = (formData.get('description') ?? '').toString();
      const evidenceType = (formData.get('evidenceType') ?? 'UNKNOWN').toString().toUpperCase();
      const enableOcrFlag = ['on', 'true', '1'].includes((formData.get('enableOcr') ?? '').toString());
      // parse tags (allow multiple)
      const tags = formData
        .getAll('tags')
        .map(t => t.toString())
        .filter(Boolean);

      // 2) Optional: verify case exists if provided
      if (caseId) {
        const caseRecord = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
        if (!caseRecord || caseRecord.length === 0) {
          return fail(400, {
            form: {
              errors: { case_id: ['Selected case not found'] },
            },
          });
        }
      }

      // 3) Build storage key & save file
      const fileExtension = path.extname(file.name) || '';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const randomSuffix = crypto.randomBytes(8).toString('hex');
      const storageKey = `evidence/${caseId ?? 'default'}/${timestamp}-${randomSuffix}${fileExtension}`;

      const uploadDir = path.join(process.cwd(), 'uploads', 'evidence', caseId ?? 'default');
      await mkdir(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, `${timestamp}-${randomSuffix}${fileExtension}`);
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, fileBuffer);

      // 4) Hash for integrity
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // 5) Build a file URL relative to static assets (adjust to your serving strategy)
      const fileUrl = `/uploads/evidence/${caseId ?? 'default'}/${timestamp}-${randomSuffix}${fileExtension}`;

      // 6) Optional OCR (fail-soft)
      let ocrResult: OcrResultData | null = null;
      if (enableOcrFlag && (evidenceType === 'PDF' || evidenceType === 'IMAGE')) {
        try {
          const ocrForm = new FormData();
          ocrForm.append('file', new Blob([fileBuffer], { type: file.type }), file.name);
          const ocrResponse = await fetch('/api/ocr/extract', {
            method: 'POST',
            body: ocrForm,
          });
          if (ocrResponse.ok) {
            ocrResult = await ocrResponse.json();
            // lightweight server-side logging (not user-visible)
            console.log('OCR completed', { filename: ocrResult?.filename, pages: ocrResult?.pages });
          } else {
            console.warn('OCR service returned non-OK status:', ocrResponse.status);
          }
        } catch (ocrError) {
          // non-fatal: continue upload even if OCR fails
          console.warn('OCR processing error (non-critical):', ocrError);
        }
      }

      // 7) Helpers to parse booleans from FormData
      const parseBooleanField = (key: string): boolean => {
        const val = formData.get(key);
        if (val === null) return false;
        const s = String(val).toLowerCase();
        return s === 'on' || s === 'true' || s === '1';
      };

      const processingOptions: ProcessingOptions = {
        enableAiAnalysis: parseBooleanField('enableAiAnalysis'),
        enableOcr: parseBooleanField('enableOcr'),
        enableEmbeddings: parseBooleanField('enableEmbeddings'),
        enableSummarization: parseBooleanField('enableSummarization'),
      };

      // 8) Construct intermediate metadata based on evidence type
      let tempMetadata: IntermediateEvidenceMetadata = {
        kind: evidenceType,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size,
        processingOptions,
      };

      switch (evidenceType) {
        case 'PDF':
          tempMetadata = {
            ...tempMetadata,
            kind: 'PDF',
            pageCount: ocrResult?.pages ?? 1,
            isEncrypted: false,
            title: file.name,
            extractedText: ocrResult?.text ?? null,
            legalConcepts: ocrResult?.legalConcepts ?? [],
            citations: ocrResult?.citations ?? [],
            ocrConfidence: ocrResult?.averageConfidence ?? null,
          };
          break;
        case 'IMAGE':
          tempMetadata = {
            ...tempMetadata,
            kind: 'IMAGE',
            resolution: { width: 0, height: 0 }, // TODO: extract with sharp
            format: file.type.split('/')[1] || 'unknown',
            hasAlphaChannel: file.type === 'image/png',
            extractedText: ocrResult?.text ?? null,
            ocrConfidence: ocrResult?.averageConfidence ?? null,
          };
          break;
        case 'TEXT': {
          const textContent = fileBuffer.toString('utf-8');
          tempMetadata = {
            ...tempMetadata,
            kind: 'TEXT',
            wordCount: textContent.split(/\s+/).filter(Boolean).length,
            characterCount: textContent.length,
            language: 'unknown',
          };
          break;
        }
        default:
          tempMetadata = {
            ...tempMetadata,
            kind: evidenceType ?? 'UNKNOWN',
          };
      }

      // 9) Final metadata composition
      const finalMetadata: FinalEvidenceMetadata = {
        ...tempMetadata,
        tags,
        confidentialityLevel: (formData.get('confidentialityLevel') ?? 'standard').toString(),
        isAdmissible: formData.get('isAdmissible') !== 'false',
        collectedAt: (formData.get('collectedAt') ?? new Date().toISOString()).toString(),
        collectedBy: (formData.get('collectedBy') ?? 'system').toString(),
        location: formData.get('location')?.toString() ?? null,
        chainOfCustody: (() => {
          const raw = formData.get('chainOfCustody')?.toString();
          try {
            if (raw) return JSON.parse(raw);
          } catch {
            // fall-through
          }
          return [];
        })(),
        ocrResult: ocrResult
          ? {
              extractedText: ocrResult.text,
              confidence: ocrResult.averageConfidence,
              legalConcepts: ocrResult.legalConcepts,
              citations: ocrResult.citations,
              pageCount: ocrResult.pages,
            }
          : null,
      };

      // 10) Insert evidence record into DB - Use secure getUserId from session
      const secureUserId = getUserId(locals);

      const inserted = await db
        .insert(evidence)
        .values({
          case_id: caseId ?? null,
          uploader_id: secureUserId,
          title: title || file.name,
          description: description || null,
          evidence_type: evidenceType,
          file_url: fileUrl,
          storage_key: storageKey,
          file_hash: `sha256:${fileHash}`,
          file_size: String(file.size),
          metadata: finalMetadata,
        })
        .returning();

      // 11) Success response for the action
      return {
        success: true,
        evidence: inserted?.[0] ?? null,
      };
    } catch (error: unknown) {
      console.error('Evidence upload failed:', error);
      return fail(500, {
        form: {
          errors: { _global: ['Server error while uploading evidence'] },
        },
      });
    }
  },
};

