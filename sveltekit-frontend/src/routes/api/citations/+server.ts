
/**
 * Citations API with Rich Text Editor Integration
 * 
 * Provides comprehensive citation management for legal cases
 * Integrates with detective mode and case management system
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { eq, and, or, ilike, count, desc } from 'drizzle-orm';
import { citations } from '$lib/server/db/schemas/cases-schema.js';
import { caseManagementService } from '$lib/services/case-management-service.js';


// Sample citations for when database is not available or for demo data
const sampleCitations = [
  {
    id: "1",
    title: "Miranda v. Arizona",
    content:
      "The Court held that both inculpatory and exculpatory statements made in response to interrogation by a defendant in police custody will be admissible at trial only if the prosecution can show that the defendant was informed of the right to consult with an attorney.",
    author: "U.S. Supreme Court",
    date: "1966",
    source: "384 U.S. 436",
    type: "case",
    tags: ["criminal procedure", "constitutional law", "miranda rights"],
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    title: "Federal Rules of Evidence Rule 404",
    content:
      "Evidence of a person's character or character trait is not admissible to prove that on a particular occasion the person acted in accordance with the character or trait.",
    source: "Fed. R. Evid. 404",
    type: "statute",
    tags: ["evidence", "character evidence", "federal rules"],
    createdAt: new Date("2024-01-16"),
    updatedAt: new Date("2024-01-16"),
  },
  {
    id: "3",
    title: "Daubert v. Merrell Dow Pharmaceuticals",
    content:
      "The Federal Rules of Evidence, not Frye, provide the standard for admitting expert scientific testimony in federal court.",
    author: "U.S. Supreme Court",
    date: "1993",
    source: "509 U.S. 579",
    type: "case",
    tags: ["expert testimony", "scientific evidence", "daubert standard"],
    createdAt: new Date("2024-01-17"),
    updatedAt: new Date("2024-01-17"),
  },
];

// UUID validation regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}
function isDemoCase(caseId: string): boolean {
  return caseId === "demo-case-123" || caseId.startsWith("demo-");
}
export const GET: RequestHandler = async ({ url }) => {
  try {
    const caseId = url.searchParams.get('caseId');
    const citationType = url.searchParams.get('type');
    const search = url.searchParams.get('search');
    const verified = url.searchParams.get('verified');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!caseId) {
      return json({
        success: false,
        error: 'caseId parameter is required'
      }, { status: 400 });
    }

    // Build where conditions
    const whereConditions: any[] = [
      eq(citations.caseId, caseId)
    ];

    if (citationType) {
      whereConditions.push(eq(citations.citationType, citationType));
    }

    if (verified !== null && verified !== undefined) {
      whereConditions.push(eq(citations.verified, verified === 'true'));
    }

    if (search) {
      whereConditions.push(
        or(
          ilike(citations.title, `%${search}%`),
          ilike(citations.author, `%${search}%`),
          ilike(citations.source, `%${search}%`),
          ilike(citations.citation, `%${search}%`),
          ilike(citations.abstract, `%${search}%`)
        )
      );
    }

    // Get citations with pagination
    const citationsQuery = db
      .select()
      .from(citations)
      .where(and(...whereConditions))
      .orderBy(desc(citations.relevanceScore), desc(citations.dateCreated))
      .limit(limit)
      .offset(offset);

    const citationResults = await citationsQuery;

    // Get total count for pagination
    const totalQuery = db
      .select({ count: count() })
      .from(citations)
      .where(and(...whereConditions));

    const [{ count: totalCount }] = await totalQuery;

    return json({
      success: true,
      citations: citationResults,
      pagination: {
        limit,
        offset,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      filters: { caseId, citationType, search, verified }
    });

  } catch (error: any) {
    console.error('Citations fetch error:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      citations: []
    }, { status: 500 });
  }
};
export const POST: RequestHandler = async ({ request }) => {
  try {
    const citationData = await request.json();

    // Validate required fields
    const { caseId, title, citationType } = citationData;
    if (!caseId || !title || !citationType) {
      return json({
        success: false,
        error: 'caseId, title, and citationType are required'
      }, { status: 400 });
    }

    // Verify case exists
    const caseDetails = await caseManagementService.getCaseById(caseId);
    if (!caseDetails) {
      return json({
        success: false,
        error: 'Case not found'
      }, { status: 404 });
    }

    // Create citation record
    const [newCitation] = await db
      .insert(citations)
      .values({
        caseId,
        citationType,
        title,
        author: citationData.author || null,
        source: citationData.source || null,
        citation: citationData.citation || null,
        url: citationData.url || null,
        doi: citationData.doi || null,
        abstract: citationData.abstract || null,
        relevantQuote: citationData.relevantQuote || null,
        contextNotes: citationData.contextNotes || null,
        relevanceScore: citationData.relevanceScore || 5,
        citationPurpose: citationData.citationPurpose || 'support',
        publicationDate: citationData.publicationDate ? new Date(citationData.publicationDate) : null,
        jurisdiction: citationData.jurisdiction || null,
        court: citationData.court || null,
        verified: citationData.verified || false,
        metadata: citationData.metadata || {},
        tags: citationData.tags || [],
        createdBy: citationData.createdBy || null
      })
      .returning();

    // Add to case timeline if detective mode is enabled
    if (caseDetails.detectiveMode) {
      await caseManagementService.addTimelineEvent(caseId, {
        eventType: 'citation_added',
        title: `Citation added: ${title}`,
        description: `New ${citationType} citation added to case`,
        relatedEntityId: newCitation.id,
        relatedEntityType: 'citation',
        eventData: {
          citationType,
          relevanceScore: newCitation.relevanceScore,
          purpose: newCitation.citationPurpose
        },
        importance: 'medium',
        eventDate: new Date()
      });
    }

    return json({
      success: true,
      citation: newCitation
    }, { status: 201 });

  } catch (error: any) {
    console.error('Citation creation error:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const { id, ...updateData } = await request.json();

    if (!id) {
      return json({
        success: false,
        error: 'Citation ID is required'
      }, { status: 400 });
    }

    // Check if citation exists
    const existingCitation = await db
      .select()
      .from(citations)
      .where(eq(citations.id, id))
      .limit(1);

    if (!existingCitation.length) {
      return json({
        success: false,
        error: 'Citation not found'
      }, { status: 404 });
    }

    // Update citation
    const [updatedCitation] = await db
      .update(citations)
      .set({
        ...updateData,
        dateModified: new Date()
      })
      .where(eq(citations.id, id))
      .returning();

    return json({
      success: true,
      citation: updatedCitation
    });

  } catch (error: any) {
    console.error('Citation update error:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const { id } = await request.json();

    if (!id) {
      return json({
        success: false,
        error: 'Citation ID is required'
      }, { status: 400 });
    }

    // Check if citation exists
    const existingCitation = await db
      .select()
      .from(citations)
      .where(eq(citations.id, id))
      .limit(1);

    if (!existingCitation.length) {
      return json({
        success: false,
        error: 'Citation not found'
      }, { status: 404 });
    }

    // Delete the citation
    await db.delete(citations).where(eq(citations.id, id));

    return json({
      success: true,
      message: 'Citation deleted successfully'
    });

  } catch (error: any) {
    console.error('Citation deletion error:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};
