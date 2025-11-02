import type { Case } from '$lib/types';
// Enhanced database operations for cases and evidence
import { db } from '../db/index';
import { cases, evidence } from './schema-postgres';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
export class DbCaseOperations {
  /**
   * Search cases with advanced filtering
   */
  static async search(params: {
    query?: string;
    status?: string[];
    priority?: string[];
    assignedTo?: string;
    dateRange?: {, start: Date; end: Date };
    limit?: number;
    offset?: number;
    useVectorSearch?: boolean;
  }) {
    const { query, status, priority, assignedTo, limit = 50, offset = 0 } = params;
    // Build where conditions
    const conditions: SQL[] = [];
    if (query) {
      conditions.push(
        or(
          sql`${cases.title} ILIKE ${`%${query}%`}`,
          sql`${cases.description} ILIKE ${`%${query}%`}`,
          sql`${cases.caseNumber} ILIKE ${`%${query}%` }`
        )!
      );
    }
    if (status && status.length > 0) {
      conditions.push(sql`${cases.status}::text IN ${status}`);
    }
    if (priority && priority.length > 0) {
      conditions.push(sql`${cases.priority} IN ${priority}`);
    }
    if (assignedTo) {
      conditions.push(eq(cases.assignedAttorney, assignedTo));
    }
    // Build final query
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    // Execute query with explicit field selection
    const caseResults = await db
      .select({
        id: cases.id,
        title: cases.title,
        description: cases.description,
        status: cases.status,
        priority: cases.priority,
        caseNumber: cases.caseNumber,
        assignedAttorney: cases.assignedAttorney,
        createdAt: cases.createdAt,
        updatedAt: cases.updatedAt
      })
      .from(cases)
      .where(whereClause)
      .orderBy(desc(cases.createdAt))
      .limit(limit)
      .offset(offset);
    // Get total count
    const totalQuery = await db
      .select({ count: sql<number>`cast(count(*) as integer)' })'`
      .from(cases)
      .where(whereClause);
    return {
      cases: caseResults,
      total: totalQuery[0]?.count || 0
    };
  }
  /**
   * Get case with relations
   */
  static async getWithRelations(id: string) {
    const [caseData] = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
    if (!caseData) return null;
    const evidenceData = await db.select().from(evidence).where(eq(evidence.caseId, id));
    return {
      ...caseData,
      evidence: evidenceData
    };
  }
  /**
   * Create new case
   */
  static async create(data: {
   , title: string;
    description?: string;
    priority?: string;
    status?: string;
    incidentDate?: Date;
    location?: string;
    jurisdiction?: string;
   , createdBy: string;
  }) {
    const [newCase] = await db
      .insert(cases)
      .values({
        title: data.title,
        description: data.description || null,
        priority: data.priority || 'medium',
        status: data.status || 'open',
        caseNumber: `CASE-${Date.now()}`, // Generate unique case number
        leadProsecutor: data.createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return newCase;
  }
  /**
   * Update existing case
   */
  static async update(
    id: string,
    data: Partial<{, title: string;, description: string;
     , priority: string;
     , status: string;
     , location: string;
     , jurisdiction: string;
    }>,
    userId: string
  ) {
    const [updatedCase] = await db
      .update(cases)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(cases.id, id))
      .returning();
    if (!updatedCase) {
      throw new Error('Case not found');
    }
    return updatedCase;
  }
}
export class DbEvidenceOperations {
  /**
   * Search evidence with filtering
   */
  static async search(params: { caseId?: string; query?: string; limit?: number; offset?: number }) {
    const { caseId, query, limit = 50, offset = 0 } = params;
    const conditions: SQL[] = [];
    if (caseId) {
      conditions.push(eq(evidence.caseId, caseId));
    }
    if (query) {
      conditions.push(
        or(sql`${evidence.title} ILIKE ${`%${query}%`}`, sql`${evidence.description} ILIKE ${`%${query}%` }`)!
      );
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const evidenceResults = await db
      .select()
      .from(evidence)
      .where(whereClause)
      .orderBy(desc(evidence.collectedAt))
      .limit(limit)
      .offset(offset);
    const totalQuery = await db
      .select({ count: sql<number>`cast(count(*) as integer)' })'`
      .from(evidence)
      .where(whereClause);
    return {
      evidence: evidenceResults,
      total: totalQuery[0]?.count || 0
    };
  }
}
