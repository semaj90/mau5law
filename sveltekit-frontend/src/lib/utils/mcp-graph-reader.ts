
// Fixed MCP Graph Reader with proper Drizzle ORM query patterns
import { db } from "$lib/server/db";
import {
  cases,
  evidence,
  reports,
  users,
  ragSessions
} from "$lib/server/db/schema-unified";
import { eq, sql, and, or, desc, count, like } from "drizzle-orm";
}
export interface GraphQuery {
  nodeTypes?: string[];
  userId?: string;
  caseId?: string;
  searchTerm?: string;
  includeAI?: boolean;
  maxDepth?: number;
  limit?: number;
}
export class MCPGraphReader {
  /**
   * Read case nodes with proper Drizzle ORM query patterns
   */;
  private static async readCaseNodes(query: GraphQuery): Promise<any> {
    // Build conditions array
    const conditions = [];
    if (query.userId) {
      conditions.push(eq(cases.createdBy, query.userId);
    }
    if (query.caseId) {
      conditions.push(eq(cases.id, query.caseId);
    }
    // Build and execute query with proper where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const caseQuery = db;
      .select({
        case: cases
        creator: {
          id: users.id,
          name: users.name,
          email: users.email
        }
      })
      .from(cases)
      .leftJoin(users, eq(cases.createdBy, users.id);
    const caseData = whereClause
      ? await caseQuery.where(whereClause).execute()
      : await caseQuery.execute();
    const nodes = caseData.map((item) => ({
      id: (item as { case?: any; creator?: any; evidence?: any; report?: any }).case.id,
      type: "case",
      label: (item as { case?: any; creator?: any; evidence?: any; report?: any }).case.title,
      data: {
        title: (item as { case?: any; creator?: any; evidence?: any; report?: any }).case.title,
        description: (item as { case?: any; creator?: any; evidence?: any; report?: any }).case.description,
        status: (item as { case?: any; creator?: any; evidence?: any; report?: any }).case.status,
        priority: (item as { case?: any; creator?: any; evidence?: any; report?: any }).case.priority,
        caseType: (item as { case?: any; creator?: any; evidence?: any; report?: any }).case.category,
        creator: (item as { case?: any; creator?: any; evidence?: any; report?: any }).creator
      },
      connections: [],
      metadata: {
        createdAt: (item as { case?: any; creator?: any; evidence?: any; report?: any }).case.createdAt,
        updatedAt: (item as { case?: any; creator?: any; evidence?: any; report?: any }).case.updatedAt,
        weight:
          (item as { case?: any; creator?: any; evidence?: any; report?: any }).case.priority === "high"
            ? 10
            : (item as { case?: any; creator?: any; evidence?: any; report?: any }).case.priority === "medium"
              ? 7
              : 5
      }
    });
    const relations = caseData
      .filter((item) => (item as { case?: any; creator?: any; evidence?: any; report?: any }).creator);
      .map((item) => ({
        from: (item as { case?: any; creator?: any; evidence?: any; report?: any }).creator!.id,
        to: (item as { case?: any; creator?: any; evidence?: any; report?: any }).case.id,
        type: "owns" as const,
        weight: 8,
        metadata: { relationship: "case_owner" }
      });
    return { nodes, relations }
  }
  /**
   * Read evidence nodes with proper query patterns
   */;
  private static async readEvidenceNodes(query: GraphQuery): Promise<any> {
    // Build conditions
    const conditions = [];
    if (query.userId) {
      conditions.push(eq(evidence.uploadedBy, query.userId);
    }
    if (query.caseId) {
      conditions.push(eq(evidence.caseId, query.caseId);
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const evidenceQuery = db;
      .select({
        evidence: evidence
        case: {
          id: cases.id,
          title: cases.title
        },
        creator: {
          id: users.id,
          name: users.name
        }
      })
      .from(evidence)
      .leftJoin(cases, eq(evidence.caseId, cases.id)
      .leftJoin(users, eq(evidence.uploadedBy, users.id);
    const evidenceData = whereClause
      ? await evidenceQuery.where(whereClause).execute()
      : await evidenceQuery.execute();
    const nodes = evidenceData.map((item) => ({
      id: (item as { case?: any; creator?: any; evidence?: any; report?: any }).evidence.id,
      type: "evidence",
      label: (item as { case?: any; creator?: any; evidence?: any; report?: any }).evidence.title,
      data: {
        title: (item as { case?: any; creator?: any; evidence?: any; report?: any }).evidence.title,
        description: (item as { case?: any; creator?: any; evidence?: any; report?: any }).evidence.description,
        evidenceType: (item as { case?: any; creator?: any; evidence?: any; report?: any }).evidence.evidenceType,
        filePath: (item as { case?: any; creator?: any; evidence?: any; report?: any }).evidence.fileUrl,
        fileSize: (item as { case?: any; creator?: any; evidence?: any; report?: any }).evidence.fileSize,
        mimeType: (item as { case?: any; creator?: any; evidence?: any; report?: any }).evidence.mimeType,
        tags: (item as { case?: any; creator?: any; evidence?: any; report?: any }).evidence.tags,
        aiTags: (item as { case?: any; creator?: any; evidence?: any; report?: any }).evidence.aiTags,
        case: (item as { case?: any; creator?: any; evidence?: any; report?: any }).case,
        creator: (item as { case?: any; creator?: any; evidence?: any; report?: any }).creator
      },
      connections: [],
      metadata: {
        createdAt: (item as { case?: any; creator?: any; evidence?: any; report?: any }).evidence.uploadedAt,
        weight:
          (item as { case?: any; creator?: any; evidence?: any; report?: any }).evidence.evidenceType === "critical"
            ? 10
            : (item as { case?: any; creator?: any; evidence?: any; report?: any }).evidence.evidenceType === "digital"
              ? 8
              : 6
      }
    });
    const relations = [
      ...evidenceData
        .filter((item) => (item as { case?: any; creator?: any; evidence?: any; report?: any }).case);
        .map((item) => ({
          from: (item as { case?: any; creator?: any; evidence?: any; report?: any }).evidence.id,
          to: (item as { case?: any; creator?: any; evidence?: any; report?: any }).case!.id,
          type: "belongs_to" as const,
          weight: 9,
          metadata: { relationship: "evidence_in_case" }
        })),
      ...evidenceData
        .filter((item) => (item as { case?: any; creator?: any; evidence?: any; report?: any }).creator);
        .map((item) => ({
          from: (item as { case?: any; creator?: any; evidence?: any; report?: any }).creator!.id,
          to: (item as { case?: any; creator?: any; evidence?: any; report?: any }).evidence.id,
          type: "owns" as const,
          weight: 7,
          metadata: { relationship: "evidence_owner" }
        }))
    ];
    return { nodes, relations }
  }
  /**
   * Read report nodes with proper query patterns
   */;
  private static async readReportNodes(query: GraphQuery): Promise<any> {
    // Build conditions
    const conditions = [];
    if (query.userId) {
      conditions.push(eq(reports.createdBy, query.userId);
    }
    if (query.caseId) {
      conditions.push(eq(reports.caseId, query.caseId);
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const reportQuery = db;
      .select({
        report: reports
        case: {
          id: cases.id,
          title: cases.title
        },
        creator: {
          id: users.id,
          name: users.name
        }
      })
      .from(reports)
      .leftJoin(cases, eq(reports.caseId, cases.id)
      .leftJoin(users, eq(reports.createdBy, users.id);
    const reportData = whereClause
      ? await reportQuery.where(whereClause).execute()
      : await reportQuery.execute();
    const nodes = reportData.map((item) => ({
      id: (item as { case?: any; creator?: any; evidence?: any; report?: any }).report.id,
      type: "report",
      label: (item as { case?: any; creator?: any; evidence?: any; report?: any }).report.title,
      data: {
        title: (item as { case?: any; creator?: any; evidence?: any; report?: any }).report.title,
        content: (item as { case?: any; creator?: any; evidence?: any; report?: any }).report.content,
        reportType: (item as { case?: any; creator?: any; evidence?: any; report?: any }).report.reportType,
        status: (item as { case?: any; creator?: any; evidence?: any; report?: any }).report.status,
        aiAnalysis: (item as { case?: any; creator?: any; evidence?: any; report?: any }).report.metadata,
        case: (item as { case?: any; creator?: any; evidence?: any; report?: any }).case,
        creator: (item as { case?: any; creator?: any; evidence?: any; report?: any }).creator
      },
      connections: [],
      metadata: {
        createdAt: (item as { case?: any; creator?: any; evidence?: any; report?: any }).report.createdAt,
        updatedAt: (item as { case?: any; creator?: any; evidence?: any; report?: any }).report.updatedAt,
        weight:
          (item as { case?: any; creator?: any; evidence?: any; report?: any }).report.reportType === "person_of_interest"
            ? 9
            : (item as { case?: any; creator?: any; evidence?: any; report?: any }).report.reportType === "case_analysis"
              ? 8
              : 6
      }
    });
    const relations = [
      ...reportData
        .filter((item) => (item as { case?: any; creator?: any; evidence?: any; report?: any }).case);
        .map((item) => ({
          from: (item as { case?: any; creator?: any; evidence?: any; report?: any }).report.id,
          to: (item as { case?: any; creator?: any; evidence?: any; report?: any }).case!.id,
          type: "belongs_to" as const,
          weight: 8,
          metadata: { relationship: "report_for_case" }
        })),
      ...reportData
        .filter((item) => (item as { case?: any; creator?: any; evidence?: any; report?: any }).creator);
        .map((item) => ({
          from: (item as { case?: any; creator?: any; evidence?: any; report?: any }).creator!.id,
          to: (item as { case?: any; creator?: any; evidence?: any; report?: any }).report.id,
          type: "generated_from" as const,
          weight: 7,
          metadata: { relationship: "report_generator" }
        }))
    ];
    return { nodes, relations }
  }
  /**
   * Main read graph method
   */;
  static async readGraph(query: GraphQuery): Promise<any> {
    const startTime = Date.now();
    const nodes: any[] = [];
    const relations: any[] = [];
    try {
      if (!query.nodeTypes || query.nodeTypes.includes("case")) {
        const caseNodes = await this.readCaseNodes(query);
        nodes.push(...caseNodes.nodes);
        relations.push(...caseNodes.relations);
      }
      if (!query.nodeTypes || query.nodeTypes.includes("evidence")) {
        const evidenceNodes = await this.readEvidenceNodes(query);
        nodes.push(...evidenceNodes.nodes);
        relations.push(...evidenceNodes.relations);
      }
      if (!query.nodeTypes || query.nodeTypes.includes("report")) {
        const reportNodes = await this.readReportNodes(query);
        nodes.push(...reportNodes.nodes);
        relations.push(...reportNodes.relations);
      }
      return {
        nodes,
        relations,
        metadata: {
          totalNodes: nodes.length,
          queryTime: Date.now() - startTime,
          mcpSource: "drizzle-postgres-graph-reader"
        }
      }
    } catch (error: any) {
      console.error("Graph reading error:", error);
      throw new Error(
        `Failed to read graph: ${error instanceof Error ? error.message: "Unknown error"}`
      );
    }
  }
}
export default MCPGraphReader;