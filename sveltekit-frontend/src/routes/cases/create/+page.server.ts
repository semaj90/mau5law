import { fail } from '@sveltejs/kit';
import type { Actions, ServerLoad, RequestEvent } from '@sveltejs/kit'; // Import RequestEvent
import { superValidate, message } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';

// Extend globalThis type for nomicEmbedText to fix TS error
declare global {
  // eslint-disable-next-line no-var
  interface GlobalThis {
    nomicEmbedText?: (text: string) => Promise<number[]>;
  }
}

const caseFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['low', 'medium', 'high'] as const),
});
export const load: ServerLoad = async ({ locals: _locals, url }) => {
  // Simple form data for testing SuperForms + Enhanced Actions
  const form = {
    data: {
      title: '',
      description: '',
      priority: 'medium' as const,
    },
    errors: {} as Record<string, string[] | undefined>,
    valid: true,
    posted: false,
  };
  // Pre-populate form if editing (check for case ID in URL) - temporarily disabled for testing
  const caseId = url.searchParams.get('edit');
  // Temporarily skip database operations for SuperForms testing
  // if (caseId) {
  //   // Fetch existing case data
  //   try {
  //     // Replace with your actual database call
  //     const existingCase = await locals.db.case.findUnique({
  //       where: { id: caseId }
  //     })
  //
  //     if (existingCase) {
  //       // Pre-populate form with existing data
  //       form.data = {
  //         caseNumber: existingCase.caseNumber,
  //         title: existingCase.title,
  //         description: existingCase.description || '',
  //         priority: existingCase.priority,
  //         status: existingCase.status,
  //         assignedTo: existingCase.assignedTo || undefined,
  //         dueDate: existingCase.dueDate?.toISOString().slice(0, 16) || undefined,
  //         tags: existingCase.tags || [],
  //         isConfidential: existingCase.isConfidential || false,
  //         notifyAssignee: existingCase.notifyAssignee || true
  //       }
  //     }
  //   } catch (error: any) {
  //     console.error('Failed to load case for editing:', error)
  //   }
  // }
  return {
    form,
    editMode: !!caseId,
    caseId,
  };
};
interface AuditLogCaseUpdateDetails {
  changes: {
    title?: { from: string; to: string };
    priority?: { from: 'low' | 'medium' | 'high'; to: 'low' | 'medium' | 'high' };
    // Add other potential changes here if they are logged
  };
}

// IMPORTANT: The 'App.Locals' interface should be augmented in src/app.d.ts, not here.
// The following types are provided as a guide for augmenting App.Locals in src/app.d.ts
// to resolve 'db' property issues and 'any' type warnings.
//
// Example content for src/app.d.ts:
/*
import type { z } from 'zod';
// Adjust the import path for caseFormSchema if app.d.ts is in a different directory
// For example: import type { caseFormSchema } from './routes/cases/create/+page.server';

// Define minimal types for database entities based on usage in this file
// These types should ideally be imported from your ORM's generated types (e.g., Drizzle, Prisma)
interface Case {
  id: string;
  caseNumber: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  assignedTo: string | null;
  dueDate: Date | null;
  tags: string[];
  isConfidential: boolean;
  notifyAssignee: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  documents?: Array<{ originalName: string; fileName: string; url: string; size: number; mimeType: string; uploadedBy: string; uploadedAt: Date }>;
  assignedUser?: { id: string; name: string; email: string };
  createdByUser?: { id: string; name: string; email: string };
}

interface CaseDraft {
  userId: string;
  draftKey: string;
  data: Partial<z.infer<typeof caseFormSchema>>; // Use z.infer to get the type from the schema
  updatedAt: Date;
  createdAt?: Date;
}

declare global {
  namespace App {
    interface Locals {
      user?: { id: string };
      db: { // 'db' is now required as per the original intent in this file
        pendingVector: {
          create: (data: { sourceType: string; sourceKey: string; vector: number[]; metadata: Record<string, unknown> }) => Promise<unknown>;
        };
        ingestQueue: {
          create: (data: { jobType: string; payload: Record<string, unknown> }) => Promise<unknown>;
        };
        case: {
          findUnique: (args: { where: { id?: string; caseNumber?: string }; include?: Record<string, unknown> }) => Promise<Case | null>;
          update: (args: { where: { id: string }; data: Partial<Case>; include?: Record<string, unknown> }) => Promise<Case>;
        };
        caseDraft: {
          upsert: (args: {
            where: { userId_draftKey: { userId: string; draftKey: string } };
            update: { data: Partial<z.infer<typeof caseFormSchema>>; updatedAt: Date };
            create: { userId: string; draftKey: string; data: Partial<z.infer<typeof caseFormSchema>> };
          }) => Promise<CaseDraft>;
        };
      };
      embed?: { embedText: (text: string) => Promise<number[]> };
      llamaWasm?: { embedText: (text: string) => Promise<number[]> };
      llama?: { embedText?: (text: string) => Promise<number[]>; embed?: (text: string) => Promise<number[]> };
      orchestrator?: {
        enqueue?: (jobType: string, payload: Record<string, unknown>) => Promise<unknown>;
        ingestUrl?: string;
        apiKey?: string;
      };
      minio?: {
        putObject: (bucket: string, key: string, file: File) => Promise<string>;
      };
      audit?: {
        log: (entry: Record<string, unknown>) => Promise<void>;
      };
      notifications?: {
        send: (notification: Record<string, unknown>) => Promise<void>;
      };
    }
  }
}
*/

export const actions: Actions = {
  createCase: async (event: RequestEvent) => {
    // Corrected parameter type
    const { request, locals } = event; // Destructure request and locals from event
    // Parse form data manually for testing Enhanced Actions
    const formData = await request.formData();
    const data = {
      caseNumber: formData.get('caseNumber')?.toString() || '',
      title: formData.get('title')?.toString() || '',
      description: formData.get('description')?.toString() || '',
      priority: (formData.get('priority')?.toString() as 'low' | 'medium' | 'high') || 'medium', // Cast priority
      assignedTo: formData.get('assignedTo')?.toString() || null,
      dueDate: formData.get('dueDate')?.toString() || null,
      tags:
        formData
          .get('tags')
          ?.toString()
          ?.split(',')
          .map(t => t.trim())
          .filter(Boolean) || [],
      isConfidential: formData.get('isConfidential') === 'true',
      notifyAssignee: formData.get('notifyAssignee') !== 'false',
    };
    // Basic validation
    const errors: Record<string, string> = {};
    if (!data.title.trim()) {
      errors.title = 'Title is required';
    }
    if (!data.caseNumber.trim()) {
      errors.caseNumber = 'Case number is required';
    }
    // Destructure the data for easier access - only destructure properties that exist
    const { title, description, priority } = data;
    const { caseNumber, assignedTo, dueDate, tags, isConfidential, notifyAssignee } = data;
    const form = {
      data,
      errors,
      valid: Object.keys(errors).length === 0,
      posted: true,
    };
    // Return form with errors if validation fails
    if (!form.valid) {
      return fail(400, { form });
    }
    try {
      // Outer try block for the entire action
      // Simulate successful case creation for testing Enhanced Actions
      console.log('✅ Enhanced Actions Test - Form submitted:', data);
      // Process uploaded files
      const uploadFormData = await request.formData();
      const attachments = [];
      // Extract all uploaded files
      for (const [key, value] of uploadFormData.entries()) {
        if (key.startsWith('attachments[') && value instanceof File && value.size > 0) {
          const file = value;
          attachments.push({
            file,
            originalName: file.name,
            size: file.size,
            type: file.type,
          });
        }
      }
      // Validate file uploads
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
      ];
      for (const attachment of attachments) {
        if (attachment.size > maxFileSize) {
          return fail(400, {
            form,
            message: `File ${attachment.originalName} exceeds 10MB limit`,
          });
        }
        if (!allowedTypes.includes(attachment.type)) {
          return fail(400, {
            form,
            message: `File type ${attachment.type} is not allowed`,
          });
        }
      }
      // Skip duplicate check for now - this would require proper Drizzle setup
      // TODO: Implement duplicate case number check with Drizzle ORM
      // const existingCase = await db.select().from(cases)
      //   .where(eq(cases.caseNumber, caseNumber)).limit(1)
      // if (existingCase.length > 0) {
      //   return fail(409, {
      //     form,
      //     message: 'A case with this number already exists'
      // Prepare a lightweight ingestion payload for our enhanced RAG pipeline.
      // The pipeline (orchestrator / microservice) will:
      //  - persist text & metadata to Postgres (with pgvector columns)
      //  - create embeddings (nomic / embedText provider)
      //  - push vectors to Qdrant and pgvector
      //  - run auto-tagging in Qdrant
      //  - upload files to MinIO (bucket) and attach metadata links to Postgres
      //  - cache frequent queries / indexes, schedule GPU jobs if needed
      //  - upload files to MinIO (bucket) and attach metadata links to Postgres
      //  - cache frequent queries / indexes, schedule GPU jobs if needed
      const ingestionPayload = {
        type: 'case_creation',
        case: {
          caseNumber,
          title,
          description,
          priority,
          assignedTo,
          dueDate,
          tags,
          isConfidential,
          notifyAssignee,
          createdBy: locals.user?.id || 'anonymous',
          createdAt: new Date().toISOString(),
        },
        attachments: attachments.map(a => ({
          name: a.originalName,
          size: a.size,
          mimeType: a.type,
        })),
        storage: {
          bucket: 'case-documents',
          basePath: `cases/${caseNumber}/documents/`,
        },
        featureFlags: {
          embedWith: 'embeddinggemma', // instruct orchestrator to use Gemma embeddings
          persistVectorTo: ['pgvector', 'qdrant'],
          autoTagWith: 'qdrant',
          cacheHits: true,
          scheduleGpu: true,
        },
      };
      // Fire-and-forget: prefer orchestrator enqueue API if available.
      try {
        // Inner try block for ingestion pipeline
        if (locals.orchestrator?.enqueue) {
          // enqueue a job in our GPU/orchestration system (recommended)
          await locals.orchestrator.enqueue('ingest-case', ingestionPayload);
        } else if (locals.orchestrator?.ingestUrl) {
          // fallback: HTTP call to ingestion microservice
          fetch(`${locals.orchestrator.ingestUrl.replace(/\/$/, '')}/ingest/case`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(locals.orchestrator.apiKey ? { Authorization: `Bearer ${locals.orchestrator.apiKey}` } : {}),
            },
            body: JSON.stringify(ingestionPayload),
          }).catch(err => console.error('Ingestion service request failed:', err));
        } else {
          // If no orchestrator is configured, attempt a minimal local best-effort:
          //  - upload attachments to MinIO (if locals.minio available) and return metadata links
          if (locals.minio?.putObject && attachments.length) {
            for (const att of attachments) {
              try {
                const key = `cases/${caseNumber}/documents/${Date.now()}_${att.originalName}`;
                // putObject should accept (bucket, key, file)
                const url = await locals.minio.putObject('case-documents', key, att.file);
                // attach the returned URL into the ingestion payload (so downstream DB create can reference it)
                ingestionPayload.attachments = ingestionPayload.attachments.map(x =>
                  x.name === att.originalName ? { ...x, url } : x
                );
              } catch (putErr) {
                console.error('MinIO upload failed for', att.originalName, putErr);
                // tolerate upload errors here; orchestrator can retry later
              }
            }
          }

          // Use the embedText method for all embedding providers for consistency
          if (locals.embed?.embedText) {
            try {
              const text = [title, description].filter(Boolean).join('\n\n');
              const vector = await locals.embed.embedText(text); // returns number[]
              // store the vector payload in a lightweight 'pending_vectors' table for later ingestion
              await locals.db.pendingVector.create({
                sourceType: 'case',
                sourceKey: caseNumber,
                vector: vector,
                metadata: {
                  title,
                  priority,
                  createdBy: locals.user?.id || 'anonymous',
                },
              });
            } catch (embedErr) {
              console.error('Local embedding (best-effort) failed:', embedErr);
            }
          }
          // As a final best-effort, persist the ingestionPayload to a queue table so a worker can pick it up
          try {
            await locals.db.ingestQueue.create({
              jobType: 'case_creation',
              payload: ingestionPayload,
            });
          } catch (qErr) {
            console.error('Failed to enqueue ingestion job to DB queue:', qErr);
          }
        }
      } catch (err: unknown) {
        console.error('Failed to start ingestion pipeline:', err);
        // Do not fail the main request; ingestion should be best-effort/asynchronous.
      }
      //   where: { caseNumber }
      // })
      // if (existingCase) {
      //   return fail(409, {
      //     form,
      //     message: 'A case with this number already exists'
      //   })
      // }
      // Process file uploads to storage
      // Removed: const uploadedFiles = [];
      // Removed: for (const attachment of attachments) { ... }
      // Create case in database and persist embedding/vector (Drizzle/Prisma compatible best-effort)
      try {
        // Second main try block for mock case creation and embedding
        // 1) generate embedding (nomic preferred, fallback to local embed / llama wasm)
        const textForEmbedding = [title, description].filter(Boolean).join('\n\n');
        let vector: number[] | null = null;
        try {
          // Inner try block for embedding generation
          // Check if the global nomicEmbedText function exists before using it
          if (globalThis.nomicEmbedText) {
            vector = await globalThis.nomicEmbedText(textForEmbedding);
          } else if (locals?.embed?.embedText) {
            vector = await locals.embed.embedText(textForEmbedding);
          } else if (locals?.llamaWasm?.embedText) {
            vector = await locals.llamaWasm.embedText(textForEmbedding);
          } else if (locals?.llama?.embedText) {
            vector = await locals.llama.embedText(textForEmbedding);
          } else if (locals?.llama?.embed) {
            // Added check for locals.llama.embed
            vector = await locals.llama.embed(textForEmbedding);
          }
        } catch (embedErr) {
          console.error('Embedding generation failed (best-effort):', embedErr);
          vector = null;
        }
        // 2) Case creation temporarily simplified - would need proper Drizzle setup
        const mockCase = {
          id: `mock-${Date.now()}`,
          caseNumber,
          title,
          description,
          priority,
          assignedTo,
          createdBy: locals.user?.id || 'anonymous',
          createdAt: new Date(),
        };
        console.log('Mock case created (not persisted):', mockCase);
        // 3) Vector persistence temporarily disabled - would need proper Drizzle setup
        if (vector) {
          console.log('Vector generated but not persisted (mock mode):', vector.length, 'dimensions');
        }
        // pgvector operations temporarily disabled - would need proper setup
        console.log('pgvector operations skipped (mock mode)');
      } catch (dbErr: unknown) {
        console.error('Case creation DB error:', dbErr);
        const code = (dbErr as any)?.code as string | undefined;
        if (code === 'P2002' || code === '23505') {
          return fail(409, { form, message: 'A case with this number already exists' });
        }
        return fail(500, { form, message: 'Failed to create case in DB' });
      }
      // const newCase = await locals.db.case.create({
      //   data: {
      //     caseNumber,
      //     title,
      //     description: description || null
      //     priority,
      //     assignedTo: assignedTo || null
      //     dueDate: dueDate ? new Date(dueDate) : null
      //     tags: tags || []
      //     isConfidential: isConfidential || false
      //     notifyAssignee: notifyAssignee ?? true,
      //     createdBy: locals.user?.id,
      //     documents: {
      //       create: uploadedFiles.map(file => ({
      //         originalName: file.originalName,
      //         fileName: file.fileName,
      //         url: file.url,
      //         size: file.size,
      //         mimeType: file.mimeType,
      //         uploadedBy: locals.user?.id,
      //         uploadedAt: file.uploadedAt
      //       })
      //     },
      //     // If pgvector column exists, persist the vector
      //     ...(vector ? { embedding: vector as any } : {})
      //     title,
      //     description: description || null
      //     priority,
      //     assignedTo: assignedTo || null
      //     dueDate: dueDate ? new Date(dueDate) : null
      //     tags: tags || []
      //     isConfidential: isConfidential || false
      //     notifyAssignee: notifyAssignee ?? true,
      //     createdBy: locals.user?.id,
      //     documents: {
      //       create: uploadedFiles.map(file => ({
      //         originalName: file.originalName,
      //         fileName: file.fileName,
      //         url: file.url,
      //         size: file.size,
      //         mimeType: file.mimeType,
      //         uploadedBy: locals.user?.id,
      //         uploadedAt: file.uploadedAt
      //       })
      //     }
      //   },
      //   include: {
      //     documents: true
      //     assignedUser: {
      //       select: {
      //         id: true
      //         name: true
      //         email: true
      //       }
      //     },
      //     createdByUser: {
      //       select: {
      //         id: true
      //         name: true
      //         email: true
      //       }
      //     }
      //   }
      // })
      // Send notifications if enabled (commented out)
      // if (notifyAssignee && assignedTo) {
      //   try {
      //     await locals.notifications?.send({
      //       userId: assignedTo
      //       type: 'case_assigned',
      //       title: 'New Case Assigned',
      //       message: `You have been assigned to case: ${title}`,
      //       data: {
      //         caseId: 'mock-id',
      //         caseNumber: caseNumber
      //         priority: priority
      //       }
      //     })
      //   } catch (notificationError) {
      //     console.error('Failed to send notification:', notificationError)
      //     // Don't fail the entire operation for notification failures
      //   }
      // }
      // Log case creation for audit trail (commented out)
      // await locals.audit?.log({
      //   action: 'case_created',
      //   userId: locals.user?.id,
      //   resourceType: 'case',
      //   resourceId: 'mock-id',
      //   details: {
      //     caseNumber: caseNumber
      //     title: title
      //     priority: priority
      //     documentsCount: uploadedFiles.length
      //   }
      // })
      // Return success with case data (simplified for testing)
      return {
        form: {
          ...form,
          valid: true,
        },
        success: true,
        message: `Case ${caseNumber} created successfully`,
        data: {
          caseNumber,
          title,
          priority,
        },
      };
    } catch (error: unknown) {
      // Changed 'any' to 'unknown'
      console.error('Case creation failed:', error);
      // Database constraint violation
      // Safely check for 'code' property
      if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 'P2002') {
        return fail(409, {
          form,
          message: 'A case with this number already exists',
        });
      }
      // Generic server error
      return fail(500, {
        form,
        message: 'Failed to create case. Please try again.',
      });
    }
  },
  updateCase: async ({ request, locals, url }: { request: Request; locals: App.Locals; url: URL }) => {
    const caseId = url.searchParams.get('id');
    if (!caseId) {
      return fail(400, { message: 'Case ID is required' });
    }
    const form = await superValidate(request, zod(caseFormSchema));
    if (!form.valid) {
      return fail(400, { form });
    }
    try {
      // Check if case exists and user has permission
      const existingCase = await locals.db.case.findUnique({
        where: { id: caseId },
        include: { documents: true },
      });
      if (!existingCase) {
        return fail(404, {
          form,
          message: 'Case not found',
        });
      }
      // Check permissions (owner or assigned user)
      if (
        !locals.user?.id ||
        (existingCase.createdBy !== locals.user.id && existingCase.assignedTo !== locals.user.id)
      ) {
        return fail(403, {
          form,
          message: 'You do not have permission to edit this case',
        });
      }
      const { title, description, priority } = form.data;
      // Update case
      const updatedCase = await locals.db.case.update({
        where: { id: caseId },
        data: {
          title,
          description,
          priority,
          updatedAt: new Date(),
        },
        include: {
          documents: true,
          assignedUser: {
            select: { id: true, name: true, email: true },
          },
        },
      });
      // Log update
      if (locals.audit?.log && locals.user?.id) {
        await locals.audit.log({
          action: 'case_updated',
          userId: locals.user.id,
          resourceType: 'case',
          resourceId: updatedCase.id,
          details: {
            changes: {
              title: existingCase.title !== title ? { from: existingCase.title, to: title } : undefined,
              priority: existingCase.priority !== priority ? { from: existingCase.priority, to: priority } : undefined,
            },
          } satisfies AuditLogCaseUpdateDetails, // Use 'satisfies' for type checking without casting
        });
      }
      return message(form, {
        type: 'success',
        text: 'Case updated successfully',
        data: { case: updatedCase },
      });
    } catch (error: unknown) {
      // Changed 'any' to 'unknown'
      console.error('Case update failed:', error);
      return fail(500, {
        form,
        message: 'Failed to update case. Please try again.',
      });
    }
  },
  saveDraft: async ({ request, locals }: { request: Request; locals: App.Locals }) => {
    const form = await superValidate(request, zod(caseFormSchema.partial()));
    try {
      // Save partial form data as draft
      const draft = await locals.db.caseDraft.upsert({
        where: {
          userId_draftKey: {
            userId: locals.user?.id || 'anonymous',
            draftKey: 'case_creation',
          },
        },
        update: {
          data: form.data,
          updatedAt: new Date(),
        },
        create: {
          userId: locals.user?.id || 'anonymous',
          draftKey: 'case_creation',
          data: form.data,
        },
      });
      return message(form, {
        type: 'success',
        text: 'Draft saved successfully',
        data: { draft },
      });
    } catch (error: unknown) {
      // Changed 'any' to 'unknown'
      console.error('Draft save failed:', error);
      return fail(500, {
        form,
        message: 'Failed to save draft',
      });
    }
  },
};