
import type { RequestHandler } from './$types';

// Legal Documents API - SvelteKit Server Endpoint
import { db } from "$lib/server/db/index";
import { json } from "@sveltejs/kit";
import { URL } from "url";
import { eq, desc, like, or } from "drizzle-orm";

// Import with fallback for different schema files
let schema: any = {};
try {
  schema = await import("$lib/server/db/unified-schema.js");
} catch (error: any) {
  try {
    schema = await import("$lib/server/db/schema-postgres.js");
  } catch (error2) {
    console.warn("No database schema available");
  }
}
const { legalDocuments } = schema;

// Legal document interface
export interface LegalDocument {
  id?: string;
  title: string;
  content: string;
  documentType: "brief" | "contract" | "motion" | "evidence";
  status: "draft" | "review" | "approved" | "filed";
  caseId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  wordCount?: number;
  metadata?: Record<string, any>;
}
// GET - List all legal documents
export const GET: RequestHandler = async ({ url }) => {
  try {
    const searchParams = url.searchParams;
    const caseId = searchParams.get("caseId");
    const documentType = searchParams.get("type");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Handle case where schema is not available
    if (!legalDocuments) {
      console.warn("Legal documents table not available, returning mock data");
      return json([
        {
          id: "doc-1",
          title: "Motion to Dismiss - Case 2024-001",
          documentType: "motion",
          status: "draft",
          createdAt: new Date("2024-01-15"),
          updatedAt: new Date("2024-01-16"),
          caseId: "case-001",
          wordCount: 1250,
          content: "Sample motion content...",
        },
        {
          id: "doc-2",
          title: "Prosecution Brief - Criminal Case",
          documentType: "brief",
          status: "review",
          createdAt: new Date("2024-01-14"),
          updatedAt: new Date("2024-01-15"),
          caseId: "case-002",
          wordCount: 3500,
          content: "Sample brief content...",
        },
      ]);
    }
    // Build query conditions
    const conditions = [];

    if (caseId) {
      conditions.push(eq(legalDocuments.caseId, caseId));
    }
    if (documentType) {
      conditions.push(eq(legalDocuments.documentType, documentType));
    }
    if (status) {
      conditions.push(eq(legalDocuments.status, status));
    }
    if (search) {
      conditions.push(
        or(
          like(legalDocuments.title, `%${search}%`),
          like(legalDocuments.content, `%${search}%`),
        ),
      );
    }
    // Execute query
    const query = db
      .select()
      .from(legalDocuments)
      .orderBy(desc(legalDocuments.updatedAt))
      .limit(limit)
      .offset(offset);

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }
    const documents = await query;

    // Calculate word count for each document
    const documentsWithWordCount = documents.map((doc) => ({
      ...doc,
      wordCount: doc.content ? doc.content.split(/\s+/).length : 0,
    }));

    return json(documentsWithWordCount);
  } catch (error: any) {
    console.error("Error fetching legal documents:", error);
    return json({ error: "Failed to fetch legal documents" }, { status: 500 });
  }
};

// POST - Create new legal document
export const POST: RequestHandler = async ({ request }) => {
  try {
    const data: LegalDocument = await request.json();

    // Validate required fields
    if (!data.title || !data.content || !data.documentType) {
      return json(
        { error: "Missing required fields: title, content, documentType" },
        { status: 400 },
      );
    }
    // Handle case where schema is not available
    if (!legalDocuments) {
      console.warn(
        "Legal documents table not available, returning mock response",
      );
      return json({
        id: "doc-" + Date.now(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        wordCount: data.content.split(/\s+/).length,
      });
    }
    // Calculate word count
    const wordCount = data.content.split(/\s+/).length;

    // Create document
    const result = await db
      .insert(legalDocuments)
      .values({
        title: data.title,
        content: data.content,
        documentType: data.documentType,
        status: data.status || "draft",
        caseId: data.caseId,
        wordCount,
        metadata: data.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const newDocument = Array.isArray(result) ? result[0] : result;
    return json(newDocument, { status: 201 });
  } catch (error: any) {
    console.error("Error creating legal document:", error);
    return json({ error: "Failed to create legal document" }, { status: 500 });
  }
};

// PUT - Update legal document
export const PUT: RequestHandler = async ({ request, params }) => {
  try {
    const documentId = params?.id;
    if (!documentId) {
      return json({ error: "Document ID is required" }, { status: 400 });
    }
    const data: Partial<LegalDocument> = await request.json();

    // Handle case where schema is not available
    if (!legalDocuments) {
      console.warn(
        "Legal documents table not available, returning mock response",
      );
      return json({
        id: documentId,
        ...data,
        updatedAt: new Date(),
        wordCount: data.content ? data.content.split(/\s+/).length : 0,
      });
    }
    // Calculate word count if content is provided
    const updateData: any = {
      ...data,
      updatedAt: new Date(),
    };

    if (data.content) {
      updateData.wordCount = data.content.split(/\s+/).length;
    }
    // Update document
    const [updatedDocument] = await db
      .update(legalDocuments)
      .set(updateData)
      .where(eq(legalDocuments.id, documentId))
      .returning();

    if (!updatedDocument) {
      return json({ error: "Document not found" }, { status: 404 });
    }
    return json(updatedDocument);
  } catch (error: any) {
    console.error("Error updating legal document:", error);
    return json({ error: "Failed to update legal document" }, { status: 500 });
  }
};

// DELETE - Delete legal document
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const documentId = params?.id;
    if (!documentId) {
      return json({ error: "Document ID is required" }, { status: 400 });
    }
    // Handle case where schema is not available
    if (!legalDocuments) {
      console.warn(
        "Legal documents table not available, returning mock response",
      );
      return json({ success: true });
    }
    // Delete document
    const deleteResult = await db
      .delete(legalDocuments)
      .where(eq(legalDocuments.id, documentId))
      .returning();
    
    const deletedDocument = Array.isArray(deleteResult) ? deleteResult[0] : deleteResult;

    if (!deletedDocument) {
      return json({ error: "Document not found" }, { status: 404 });
    }
    return json({ success: true });
  } catch (error: any) {
    console.error("Error deleting legal document:", error);
    return json({ error: "Failed to delete legal document" }, { status: 500 });
  }
};
