import type { RequestEvent } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { db } from "$lib/server/db/index";
import { documentMetadata } from "$lib/server/db/schema-unified";
import { eq } from "drizzle-orm";
import type { RequestHandler } from './$types';


// Real Document API Endpoint - No Mock Data

// GET /api/documents/[id] - Get a specific document
export async function GET({ params }: RequestEvent): Promise<any> {
  try {
    const documentId = params.id;

    if (!documentId) {
      return json(
        {
          success: false,
          error: "Document ID is required",
        },
        { status: 400 },
      );
    }
    // Fetch from real database (no fallback to mock data)
    const document = await db
      .select()
      .from(documentMetadata)
      .where(eq(documentMetadata.id, documentId))
      .limit(1);

    if (document.length === 0) {
      return json(
        {
          success: false,
          error: "Document not found",
        },
        { status: 404 },
      );
    }
    
    return json({
      success: true,
      document: document[0],
    });
  } catch (error: any) {
    console.error("Error fetching document:", error);
    return json(
      {
        success: false,
        error: "Failed to fetch document",
      },
      { status: 500 },
    );
  }
}
// PUT /api/documents/[id] - Update a document
export async function PUT({ params, request }: RequestEvent): Promise<any> {
  try {
    const documentId = params.id;
    const body = await request.json();

    if (!documentId) {
      return json(
        {
          success: false,
          error: "Document ID is required",
        },
        { status: 400 },
      );
    }
    const { title, content, documentType, status, citations, tags, metadata } =
      body;

    // Update in real database (no mock fallback)
    const updates: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updates.originalFilename = title;
    if (content !== undefined) {
      updates.extractedText = content;
      updates.summary = content.substring(0, 500); // Create summary from content
    }
    if (documentType !== undefined) updates.documentType = documentType;
    if (status !== undefined) updates.processingStatus = status;
    if (metadata !== undefined) updates.metadata = metadata;

    const updatedDocument = await db
      .update(documentMetadata)
      .set(updates)
      .where(eq(documentMetadata.id, documentId))
      .returning();

    if (updatedDocument.length === 0) {
      return json(
        {
          success: false,
          error: "Document not found",
        },
        { status: 404 },
      );
    }
    
    return json({
      success: true,
      document: updatedDocument[0],
    });
  } catch (error: any) {
    console.error("Error updating document:", error);
    return json(
      {
        success: false,
        error: "Failed to update document",
      },
      { status: 500 },
    );
  }
}
// DELETE /api/documents/[id] - Delete a document
export async function DELETE({ params }: RequestEvent): Promise<any> {
  try {
    const documentId = params.id;

    if (!documentId) {
      return json(
        {
          success: false,
          error: "Document ID is required",
        },
        { status: 400 },
      );
    }
    // Delete from real database (no mock fallback)
    const deletedDocument = await db
      .delete(documentMetadata)
      .where(eq(documentMetadata.id, documentId))
      .returning();

    if (deletedDocument.length === 0) {
      return json(
        {
          success: false,
          error: "Document not found",
        },
        { status: 404 },
      );
    }
    
    return json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting document:", error);
    return json(
      {
        success: false,
        error: "Failed to delete document",
      },
      { status: 500 },
    );
  }
}
