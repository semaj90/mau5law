import type { PageServerLoad, Actions } from './$types.js';
import { fail, redirect } from "@sveltejs/kit";
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';
import { db, cases, evidence, helpers, sql } from "$lib/server/db";
import { CaseOperations } from '$lib/server/db/enhanced-operations';
import { vectorOps } from '$lib/server/db/enhanced-vector-operations';
import { apiError, apiSuccess, CommonErrors } from '$lib/server/api/response';
import { cuid } from '$lib/utils/cuid';
import { URL } from "url";

// Validation schemas
const createCaseSchema = z.object({
  title: z.string().min(1, 'Case title is required').max(500, 'Case title too long'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  status: z.enum(['open', 'investigating', 'pending', 'closed', 'archived']).default('open'),
  incidentDate: z.string().optional().transform(str => str ? new Date(str) : undefined),
  location: z.string().optional(),
  jurisdiction: z.string().optional()
});

const addEvidenceSchema = z.object({
  caseId: z.string().min(1, 'Case ID is required'),
  title: z.string().min(1, 'Evidence title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  evidenceType: z.enum(['document', 'photo', 'video', 'audio', 'physical', 'digital', 'testimony']).default('document'),
  tags: z.string().optional()
});

export const load: PageServerLoad = async ({ url, locals, parent }) => {
  // Ensure user is authenticated
  const user = locals.user;
  if (!user) {
    throw redirect(302, '/login');
  }

  // Wait for layout data
  const layoutData = await parent();

  const caseIdToView = url.searchParams.get("view");
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const search = url.searchParams.get('search') || '';
  const statusFilter = url.searchParams.get('status') || '';
  const priorityFilter = url.searchParams.get('priority') || '';

  try {
    // Initialize forms
    const createCaseForm = await superValidate(zod(createCaseSchema));
    const addEvidenceForm = await superValidate(zod(addEvidenceSchema));

    // If viewing a specific case
    if (caseIdToView) {
      const caseOps = new CaseOperations();
      const activeCase = await caseOps.getCaseById(caseIdToView, user.id);

      if (!activeCase) {
        throw redirect(302, '/cases');
      }

      // Fetch evidence for this case with vector embeddings
  const caseEvidence = await (db.query as any).evidence.findMany({
        where: helpers.eq ? helpers.eq(evidence.case_id, caseIdToView) : undefined,
        orderBy: helpers.desc ? [helpers.desc(evidence.created_at)] : undefined,
      });

      return {
        activeCase,
        caseEvidence,
        userCases: layoutData.userCases || [],
        caseStats: layoutData.caseStats || { total: 0, open: 0, closed: 0, highPriority: 0 },
        createCaseForm,
        addEvidenceForm
      };
    }

    // Load cases with enhanced filtering and pagination
    const caseOps = new CaseOperations();
    const searchOptions = {
      userId: user.id,
      search: search.trim(),
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      page,
      limit
    };

    const { cases: userCases, total, stats } = await caseOps.searchCases(searchOptions);

    // Enhanced case statistics
    const caseStats = {
      total: stats.total || 0,
      open: stats.open || 0,
      investigating: stats.investigating || 0,
      pending: stats.pending || 0,
      closed: stats.closed || 0,
      archived: stats.archived || 0,
      highPriority: stats.high || 0,
      critical: stats.critical || 0,
      medium: stats.medium || 0,
      low: stats.low || 0
    };

    return {
      activeCase: null,
      caseEvidence: [],
      userCases,
      caseStats,
      createCaseForm,
      addEvidenceForm,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error: any) {
    console.error('Error in cases page load:', error);

    // Fallback data
    const createCaseForm = await superValidate(zod(createCaseSchema));
    const addEvidenceForm = await superValidate(zod(addEvidenceSchema));

    return {
      activeCase: null,
      caseEvidence: [],
      userCases: [],
      caseStats: { total: 0, open: 0, closed: 0, highPriority: 0 },
      createCaseForm,
      addEvidenceForm,
      error: 'Failed to load cases'
    };
  }
};

export const actions: Actions = {
  // Create new case with vector embedding
  createCase: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { message: "Unauthorized" });
    }

    const form = await superValidate(request, zod(createCaseSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    try {
      const caseOps = new CaseOperations();
      // Generate unique case number
      const year = new Date().getFullYear();
      const caseNumber = `CR-${year}-${Date.now()}`;

      const newCaseData = {
        id: cuid(),
        caseNumber,
        userId: user.id,
        createdBy: user.id,
        assignedTo: user.id, // Initially assign to creator
        title: form.data.title,
        description: form.data.description || null,
        priority: form.data.priority,
        status: form.data.status,
        incidentDate: form.data.incidentDate || null,
        location: form.data.location || null,
        jurisdiction: form.data.jurisdiction || null,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      const newCase = await caseOps.createCase(newCaseData);

      // Generate vector embedding for semantic search
      if (form.data.description?.trim()) {
        await vectorOps.generateEmbedding({
          id: newCase.id,
          content: `${form.data.title}. ${form.data.description}`,
          metadata: {
            type: 'case',
            caseId: newCase.id,
            userId: user.id,
            priority: form.data.priority,
            status: form.data.status
          }
        });
      }

      return {
        form,
        success: true,
        case: newCase
      };
    } catch (error: any) {
      console.error("Failed to create case:", error);
      return fail(500, {
        form,
        message: "Failed to create case"
      });
    }
  },

  // Add evidence to case with vector indexing
  addEvidence: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { message: "Unauthorized" });
    }

    const form = await superValidate(request, zod(addEvidenceSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    try {
      const caseOps = new CaseOperations();

      // Verify case ownership
      const case_ = await caseOps.getCaseById(form.data.caseId, user.id);
      if (!case_) {
        return fail(404, { form, message: "Case not found" });
      }

      const evidenceData = {
        id: cuid(),
        caseId: form.data.caseId,
        case_id: form.data.caseId, // alias for database field
        title: form.data.title,
        description: form.data.description || null,
        evidenceType: form.data.evidenceType,
        evidence_type: form.data.evidenceType, // alias for database field
        type: form.data.evidenceType, // another alias
        tags: form.data.tags ? form.data.tags.split(',').map(t => t.trim()) : [],
        createdBy: user.id,
        metadata: {},
        collectedAt: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      const newEvidence = await db
        .insert(evidence)
        .values(evidenceData)
        .returning();

      // Generate vector embedding for evidence search
      const content = `${form.data.title}. ${form.data.description || ''} ${form.data.tags || ''}`;
      if (content.trim().length > 10) {
        await vectorOps.generateEmbedding({
          id: newEvidence[0].id,
          content: content.trim(),
          metadata: {
            type: 'evidence',
            caseId: form.data.caseId,
            evidenceType: form.data.evidenceType,
            userId: user.id
          }
        });
      }

      return {
        form,
        success: true,
        evidence: newEvidence[0]
      };
    } catch (error: any) {
      console.error("Failed to add evidence:", error);
      return fail(500, {
        form,
        message: "Failed to add evidence"
      });
    }
  },

  // Delete evidence with vector cleanup
  deleteEvidence: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { message: "Unauthorized" });
    }

    const formData = await request.formData();
    const evidenceId = formData.get("evidenceId") as string;

    if (!evidenceId) {
      return fail(400, { message: "Missing evidence ID" });
    }

    try {
      // Verify evidence exists and user has access
  const existingEvidence = await (db.query as any).evidence.findFirst({
        where: helpers.eq ? helpers.eq(evidence.id, evidenceId) : undefined,
        with: {
          case: {
            columns: { createdBy: true }
          }
        }
      });

  if (!existingEvidence || (existingEvidence as any).case?.createdBy !== user.id) {
        return fail(404, { message: "Evidence not found" });
      }

      // Delete from database
  await db.delete(evidence).where(helpers.eq ? helpers.eq(evidence.id, evidenceId) : undefined);

      // Remove from vector index
      try {
        await vectorOps.deleteEmbedding(evidenceId);
      } catch (vectorError) {
        console.warn('Failed to delete vector embedding:', vectorError);
        // Don't fail the request if vector deletion fails
      }

      return { success: true };
    } catch (error: any) {
      console.error("Failed to delete evidence:", error);
      return fail(500, { message: "Failed to delete evidence" });
    }
  },
};
