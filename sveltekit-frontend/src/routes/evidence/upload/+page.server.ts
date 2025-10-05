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
import { db, cases, evidence } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types.js';
import type { InferInsertModel } from 'drizzle-orm/pg-core'; // Corrected import path for InferInsertModel

// Infer the type of the 'evidence_type' column from the Drizzle schema
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

export const load: PageServerLoad = async ({ locals: _locals }) => {
  // Initialize the form with default values
  const form = await superValidate(zod(evidenceUploadSchema));
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
    // Changed from any
    console.error('Failed to load cases:', error);
    return {
      form,
      cases: [],
    };
  }
};

export const actions: Actions = {
  upload: async ({ request, locals }) => {
    const formData = await request.formData();
    const form = await superValidate(formData, zod(evidenceUploadSchema));
    if (!form.valid) {
      console.error('Form validation failed:', form.errors);
      return fail(400, { form });
    }
    const fileRaw = formData.get('file');
    if (!(fileRaw instanceof File) || fileRaw.size === 0) {
      return fail(400, {
        form: {
          ...form,
          errors: { file: ['Please select a file to upload'] },
        },
      });
    }
    const file = fileRaw as File;
    // Validate file size
    if (!validateFileSize(file)) {
      return fail(400, {
        form: {
          ...form,
          errors: { file: ['File size exceeds the maximum limit of 100MB'] },
        },
      });
    }
    // Determine evidence type from file if not specified
    let evidenceType: EvidenceType = form.data.evidence_type as EvidenceType; // Ensure initial type is correct
    if (evidenceType === 'UNKNOWN' || !evidenceType) {
      evidenceType = getFileTypeFromMime(file.type) as EvidenceType; // Cast return of getFileTypeFromMime
    }
    // Validate file type matches evidence type
    if (!validateFileType(file, evidenceType)) {
      return fail(400, {
        form: {
          ...form,
          errors: { file: [`File type ${file.type} is not supported for ${evidenceType} evidence`] },
        },
      });
    }
    try {
      // Verify the case exists (if case_id is provided)
      if (form.data.case_id) {
        const caseRecord = await db.select().from(cases).where(eq(cases.id, form.data.case_id)).limit(1);
        if (caseRecord.length === 0) {
          return fail(400, {
            form: {
              ...form,
              errors: { case_id: ['Selected case not found'] },
            },
          });
        }
      }
      // Generate unique storage key
      const fileExtension = path.extname(file.name);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const randomSuffix = crypto.randomBytes(8).toString('hex');
      const storageKey = `evidence/${form.data.case_id}/${timestamp}-${randomSuffix}${fileExtension}`;
      // Create upload directory
      const uploadDir = path.join(process.cwd(), 'uploads', 'evidence', form.data.case_id || 'default');
      await mkdir(uploadDir, { recursive: true });
      // Save file to disk
      const filePath = path.join(uploadDir, `${timestamp}-${randomSuffix}${fileExtension}`);
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, fileBuffer);
      // Generate file hash for integrity
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      // Generate file URL (relative to static assets)
      const fileUrl = `/uploads/evidence/${form.data.case_id || 'default'}/${timestamp}-${randomSuffix}${fileExtension}`;
      // OCR Processing for supported file types
      let ocrResult: OcrResultData | null = null; // Type for ocrResult
      if (form.data.enableOcr && (evidenceType === 'PDF' || evidenceType === 'IMAGE')) {
        try {
          // Call OCR service
          const ocrFormData = new FormData();
          ocrFormData.append('file', new Blob([fileBuffer], { type: file.type }), file.name);
          const ocrResponse = await fetch('/api/ocr/extract', {
            method: 'POST',
            body: ocrFormData,
          });
          if (ocrResponse.ok) {
            ocrResult = (await ocrResponse.json()) as OcrResultData; // Cast to OcrResultData
            console.log('OCR processing completed:', {
              filename: ocrResult.filename,
              pages: ocrResult.pages,
              averageConfidence: ocrResult.averageConfidence,
              legalConceptsFound: ocrResult.legalConcepts?.length || 0,
              citationsFound: ocrResult.citations?.length || 0,
            });
          } else {
            console.warn('OCR processing failed:', ocrResponse.statusText);
          }
        } catch (ocrError) {
          console.warn('OCR processing error (non-critical):', ocrError);
        }
      }
      // Generate rich metadata based on file type
      // Use a mutable object that will eventually conform to FinalEvidenceMetadata
      let tempMetadata: IntermediateEvidenceMetadata = {
        kind: evidenceType,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size,
        processingOptions: {
          enableAiAnalysis: form.data.enableAiAnalysis,
          enableOcr: form.data.enableOcr,
          enableEmbeddings: form.data.enableEmbeddings,
          enableSummarization: form.data.enableSummarization,
        },
      };
      switch (evidenceType) {
        case 'PDF':
          tempMetadata = {
            ...tempMetadata,
            kind: 'PDF',
            pageCount: ocrResult?.pages || 1,
            isEncrypted: false,
            title: file.name,
            extractedText: ocrResult?.text,
            legalConcepts: ocrResult?.legalConcepts || [],
            citations: ocrResult?.citations || [],
            ocrConfidence: ocrResult?.averageConfidence,
          };
          break;
        case 'IMAGE':
          tempMetadata = {
            ...tempMetadata,
            kind: 'IMAGE',
            resolution: { width: 0, height: 0 }, // TODO: Extract image resolution with sharp in future implementation
            format: file.type.split('/')[1] || 'unknown',
            hasAlphaChannel: file.type === 'image/png',
            extractedText: ocrResult?.text,
            ocrConfidence: ocrResult?.averageConfidence,
          };
          break;
        case 'VIDEO':
          tempMetadata = {
            ...tempMetadata,
            kind: 'VIDEO',
            durationSeconds: 0, // Planned: extract audio duration with ffprobe in future implementation
            resolution: { width: 0, height: 0 },
            codec: 'unknown',
            frameRate: 0,
          };
          break;
        case 'AUDIO':
          tempMetadata = {
            ...tempMetadata,
            kind: 'AUDIO',
            durationSeconds: 0, // Would be extracted with ffprobe,
            codec: 'unknown',
            sampleRate: 44100,
            channels: 2,
          };
          break;
        case 'TEXT': {
          // For text files, we can read the content
          const textContent = fileBuffer.toString('utf-8');
          tempMetadata = {
            ...tempMetadata,
            kind: 'TEXT',
            wordCount: textContent.split(/\s+/).filter(item => item.length).length,
            characterCount: textContent.length,
            language: 'unknown', // TODO: Detect language with a library like 'franc' (https://github.com/wooorm/franc) or 'langdetect'
          };
          break;
        }
        default:
          tempMetadata = {
            ...tempMetadata,
            kind: 'UNKNOWN',
          };
      }

      // Construct the final metadata object for database insertion
      const finalMetadata: FinalEvidenceMetadata = {
        ...tempMetadata,
        tags: form.data.tags || [],
        confidentialityLevel: form.data.confidentialityLevel || 'standard',
        isAdmissible: form.data.isAdmissible !== false,
        collectedAt: form.data.collectedAt || new Date().toISOString(),
        collectedBy: form.data.collectedBy || 'system',
        location: form.data.location,
        chainOfCustody: (form.data.chainOfCustody || []).map(entry => ({
          event: entry.action || 'unknown', // Map 'action' to 'event'
          timestamp: entry.timestamp || new Date().toISOString(),
          actor: entry.officer || 'unknown', // Map 'officer' to 'actor'
          details: {
            location: entry.location,
            notes: entry.notes,
            signature: entry.signature,
          },
        })),
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

      // Insert evidence record into database with unified schema
      const evidenceRecord = await db
        .insert(evidence)
        .values({
          case_id: form.data.case_id || null,
          // Require authenticated user session for evidence upload
          uploader_id: (() => {
            if (!locals.user?.id) {
              throw fail(401, {
                form: {
                  ...form,
                  errors: { file: ['You must be logged in to upload evidence.'] },
                },
              });
            }
            return locals.user.id;
          })(),
          title: form.data.title,
          description: form.data.description || null,
          evidence_type: evidenceType,
          file_url: fileUrl,
          storage_key: storageKey,
          file_hash: `sha256:${fileHash}`,
          file_size: file.size.toString(),
          metadata: finalMetadata, // Use the strongly typed finalMetadata
        })
        .returning();
      console.log('Evidence uploaded successfully:', {
        id: evidenceRecord[0].id,
        title: evidenceRecord[0].title,
        type: evidenceRecord[0].evidence_type,
        size: file.size,
        hash: fileHash.substring(0, 8) + '...',
      });
      // Trigger Go Upload Service for additional processing
      try {
        console.log('📤 Sending file to Go upload service for processing...');
        const uploadFormData = new FormData();
        uploadFormData.append('file', new Blob([fileBuffer], { type: file.type }), file.name);
        uploadFormData.append('evidenceId', evidenceRecord[0].id);
        uploadFormData.append('caseId', form.data.case_id || '');
        uploadFormData.append('title', form.data.title);
        uploadFormData.append('evidenceType', evidenceType);
        // Use centralized service registry for Go upload service endpoint
        // Example: import { goServices } from '$lib/server/go-service-registry';
        // const goUploadServiceUrl = `${goServices['legal-gateway'].baseUrl}/api/upload/go-service`;
        const goUploadServiceUrl = process.env.GO_UPLOAD_SERVICE_URL || 'http://localhost:5173/api/upload/go-service';
        const goServiceResponse = await fetch(goUploadServiceUrl, {
          method: 'POST',
          body: uploadFormData,
        });
        if (goServiceResponse.ok) {
          const goResult = await goServiceResponse.json();
          console.log('✅ Go service processing completed:', goResult);
          // Update metadata with Go service results if available
          if (goResult.embeddings || goResult.analysis) {
            // This update happens *after* the initial insert.
            // If these fields need to be in the DB, an UPDATE query is required.
            // For now, just updating the local `finalMetadata` object for consistency.
            finalMetadata.goServiceProcessing = {
              embeddings: goResult.embeddings,
              analysis: goResult.analysis,
              processedAt: new Date().toISOString(),
            };
            // If a DB update is needed:
            // await db.update(evidence).set({ metadata: finalMetadata }).where(eq(evidence.id, evidenceRecord[0].id));
          }
        } else {
          console.warn('⚠️ Go upload service processing failed:', goServiceResponse.statusText);
          console.warn('Continuing with local processing only');
        }
      } catch (goServiceError) {
        console.warn('⚠️ Go upload service error (non-critical):', goServiceError);
        console.warn('Continuing with local processing only');
        // Don't fail the upload, just log the warning
      }
    } catch (error: unknown) {
      console.error('Evidence upload error:', error);
      if (error instanceof Error) {
        // Type guard for error
        return fail(500, {
          form: {
            ...form,
            errors: { file: [`Failed to upload file: ${error.message}`] },
          },
        });
      }
      return fail(500, {
        form: {
          ...form,
          errors: { file: ['Failed to upload file. Please try again.'] },
        },
      });
    }
    // Redirect to evidence list or case details
    throw redirect(302, `/cases/${form.data.case_id}/evidence`);
  },
};
