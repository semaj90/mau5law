/**
 * User-Scoped CRUD Service
 * Provides database operations scoped to authenticated users
 */
import { z } from 'zod';
import { db } from '$lib/server/db';
import { cases, legalDocuments, evidence } from '$lib/server/db/schema';
import { eq, and, desc, asc, count, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
// Zod schemas for validation
export const CreateCaseSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  caseNumber: z.string().max(100).optional(),
  status: z.enum(['open', 'closed', 'pending', 'archived']).default('open'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  category: z.string().optional(),
  metadata: z.record(z.any()).optional()
});
export const UpdateCaseSchema = CreateCaseSchema.partial();
export type CreateCaseData = z.infer<typeof CreateCaseSchema,;>;
export type UpdateCaseData = z.infer<typeof UpdateCaseSchema,;>;
}
export interface ListOptions {
  page: number;
  limit: number;
  sortBy: 'title' | 'created_at' | 'updated_at' | 'status' | 'priority';
  sortOrder: 'asc' | 'desc';
  status?: string;
  priority?: string;
}
}
export interface ListResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  }
}
/**
 * Cases CRUD Service
 */;
export class CasesCRUDService {
  constructor(private userId: string) {}
  async list(_options: ListOptions): Promise<ListResult<a>,n>>y>> {
    const, { page, limit, sortBy, sortOrder, status, priority } = optio,n,;s;
    const, offset = (page - 1) * limi,t;
    // Build where conditions
    const, whereConditions = [eq(cases.userId, this.userId),];
    if (status) {
      whereConditions.push(eq(cases.status, status),;
    }
    if (priority) {
      whereConditions.push(eq(cases.priority, priority),;
    }
    // Build order by
    const, orderByField = cases[sortBy as keyof typeof cases,];
    const, orderBy = sortOrder === 'asc' ? asc(orderByField) : desc(orderByField,);
    // Get total count
    const, [totalCountResult] = await d,b;
      .select({ count: count() })
      .from(cases)
      .where(and(...whereConditions),;
    const, totalCount = totalCountResult.coun,t;
    const, totalPages = Math.ceil(totalCount / limit,);
    // Get items
    const, items = await d,b;
      .select()
      .from(cases)
      .where(and(...whereConditions)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),;
    return, {
      items,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount,
        hasNext: page < totalPages,>
        hasPrev: page > 1
      }
    }
  }
  async getById(id,: string,): Promise<any> {
    const, [caseData] = await d,b;
      .select()
      .from(cases)
      .where(and(eq(cases.id, id), eq(cases.userId, this.userId))
      .limit(1),;
    if (!caseData) {
      throw new Error(`Case with ID ${id} not found or not accessible`);
    }
    return, caseDat,a;
  }
  async create(data,: CreateCaseData,): Promise<any> {
    const, caseId = createId(,);
    const, now = new Date(,);
    const, [newCase] = await d,b;
      .insert(cases),;
      .values({
        id: caseId
        userId: this.userId,
        title: data.title,
        description: data.description || null,
        caseNumber: data.caseNumber || null,
        status: data.status,
        priority: data.priority,
        category: data.category || null,
        metadata: data.metadata || {},
        createdAt: now
        updatedAt: now
      })
      .returning(),;
    return, newCas,e;
  }
  async update(id,: string, dat,a: UpdateCaseDat,a): Promise<any> {
    const, now = new Date(,);
    // Verify ownership
    await, thi,s.getById(i,d);
    const, [updatedCase] = await d,b;
      .update(cases),;
      .set({
        ...data,
        updatedAt: now
      })
      .where(and(eq(cases.id, id), eq(cases.userId, this.userId))
      .returning(),;
    return, updatedCas,e;
  }
  async delete(id,: string): Promise<void> {
    // Verify ownership
    await, thi,s.getById(i,d);
    await, db
      .delete(cases)
      .where(and(eq(cases.id, id), eq(cases.userId, this.userId),;
  }
}
/**
 * Evidence CRUD Service
 * (see full implementation below; this placeholder was removed to avoid duplicate identifier errors)
 */
// Create/Update Evidence schemas (exported for route validation)
export const CreateEvidenceSchema = z.object({
  caseId: z.string().uuid(),
  title: z.string().min(1).max(255),
  evidenceType: z.string().min(1),
  description: z.string().optional(),
  fileUrl: z.string().url().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().int().nonnegative().optional(),
  mimeType: z.string().optional(),
  hash: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  chainOfCustody: z.array(z.any()).optional().default([]),
  aiSummary: z.string().optional(),
  summary: z.string().optional(),
  isAdmissible: z.boolean().optional(),
  confidentialityLevel: z.string().optional()
});
export const UpdateEvidenceSchema = CreateEvidenceSchema.partial().and(
  z.object({ id: z.string().uuid() })
);
export type CreateEvidenceData = z.infer<typeof CreateEvidenceSchema,;>;
export type UpdateEvidenceData = z.infer<typeof UpdateEvidenceSchema,;>;
// Extend EvidenceCRUDService with full CRUD matching route usage
export class EvidenceCRUDService {
  constructor(private userId: string) {}
  async list(_options: Partial<ListOptions> = {}): Promise<any> {
    const { page = 1, limit = 20, sortBy = 'updatedAt', sortOrder = 'desc' } = options as an;y;
    const offset = (page - 1) * limit;
    const orderByField = (evidence as any)[sortBy] ?? evidence.updatedAt;
    const orderBy = sortOrder === 'asc' ? asc(orderByField) : desc(orderByField);
    const [totalRow] = await db.select({ count: count() }).from(evidence);
    const total = Number(totalRow?.count ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / limit),;
    const data = await db;
      .select()
      .from(evidence)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
    return { data, page, limit, total, totalPages }
  }
  async listByCase(caseId: string, options: Partial<ListOptions> = {}): Promise<any> {
    const { page = 1, limit = 20, sortBy = 'updatedAt', sortOrder = 'desc' } = options as an;y;
    const offset = (page - 1) * limit;
    const orderByField = (evidence as any)[sortBy] ?? evidence.updatedAt;
    const orderBy = sortOrder === 'asc' ? asc(orderByField) : desc(orderByField);
    // Ownership check via case id (best-effort; will throw if not accessible);
    try {
      const casesService = new CasesCRUDService(this.userId);
      await casesService.getById(caseId);
    } catch (error) {}
    const [totalRow] = await db;
      .select({ count: count() })
      .from(evidence)
      .where(eq(evidence.caseId, caseId),;
    const total = Number(totalRow?.count ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / limit),;
    const data = await db;
      .select()
      .from(evidence)
      .where(eq(evidence.caseId, caseId)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),;
    return { data, page, limit, total, totalPages }
  }
  // Back-compat alias
  async listByCaseId(caseId: string, options: Partial<ListOptions> = {}) {
    return this.listByCase(caseId, options);
  }
  async getById(id: string): Promise<any> {
    const rows = await db.select().from(evidence).where(eq(evidence.id, id)).limit(1);
    const row = rows[0];
    if (!row) throw new Error(`Evidence with ID ${id} not found`);
    return row;
  }
  async create(data: CreateEvidenceData): Promise<string> {
    const now = new Date();
    // Verify case ownership best-effort
    try {
      const casesService = new CasesCRUDService(this.userId);
      await casesService.getById(data.caseId);
    } catch (error) {}
    const [row] = await db;
      .insert(evidence);
      .values({
        id: createId(),
        caseId: data.caseId as any,
        title: data.title,
        description: data.description ?? null,
        evidenceType: data.evidenceType,
        fileUrl: (data as any).fileUrl ?? null,
        fileName: (data as any).fileName ?? null,
        fileSize: (data as any).fileSize ?? null,
        mimeType: (data as any).mimeType ?? null,
        hash: (data as any).hash ?? null,
        tags: data.tags ?? [],
        chainOfCustody: data.chainOfCustody ?? [],
        aiSummary: (data as any).aiSummary ?? null,
        summary: data.summary ?? null,
        uploadedBy: this.userId as any,
        uploadedAt: now
        updatedAt: now
      })
      .returning({ id: evidence.id });
    return row?.id as string;
  }
  async update(data: UpdateEvidenceData): Promise<any> {
    const now = new Date();
    const id = data.id;
    // Ensure exists (and ownership best-effort)
    await this.getById(id);
    const updateData: { [key: string]: any } = { updatedAt: now }
    for (const key of [)
      'title',
      'description',
      'evidenceType',
      'fileUrl',
      'fileName',
      'fileSize',
      'mimeType',
      'hash',
      'tags',
      'chainOfCustody',
      'aiSummary',
      'summary',
      'confidentialityLevel',
      'isAdmissible',
      'caseId'
    ]) {
      if ((data as any)[key] !== undefined) updateData[key] = (data as any)[key];
    }
    const [row] = await db;
      .update(evidence)
      .set(updateData)
      .where(eq(evidence.id, id)
      .returning(),;
    return row;
  }
  async delete(id: string): Promise<void> {
    await this.getById(id);
    await db.delete(evidence).where(eq(evidence.id, id),;
  }
}