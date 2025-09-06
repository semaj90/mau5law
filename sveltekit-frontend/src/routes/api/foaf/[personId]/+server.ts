import type { RequestHandler } from './$types.js';

// Friend-of-a-Friend (FOAF) API endpoint - SSR compatible
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { users, cases, evidence } from '$lib/server/db/schema-unified.js';
import { generateEnhancedEmbedding } from '$lib/server/ai/embeddings-enhanced.js';
import { eq, ne, and, sql } from 'drizzle-orm';
import { URL } from "url";

export interface FOAFRequest {
  personId: string;
  limit?: number;
  maxDepth?: number;
  caseContext?: string;
}

export interface Person {
  id: string;
  name: string;
  handle: string;
  role: string;
  specialization: string;
  confidence: number;
  relationshipPath: string;
}

export interface FOAFResponse {
  people: Person[];
  summary: string;
  totalFound: number;
  processingTimeMs: number;
}

export const GET: RequestHandler = async ({ params, url, fetch }) => {
  const startTime = Date.now();
  const { personId } = params;
  
  if (!personId) {
    throw error(400, 'Person ID is required');
  }

  const limit = parseInt(url.searchParams.get('limit') || '5');
  const maxDepth = parseInt(url.searchParams.get('maxDepth') || '2');
  const caseContext = url.searchParams.get('caseContext') || '';

  try {
    // Check if recommendations service is available (dynamic port)
    let recommendationsPort = '8105'; // Default
    
    try {
      const portsResponse = await fetch('/api/v1/cluster/ports');
      if (portsResponse.ok) {
        const ports = await portsResponse.json();
        recommendationsPort = ports.recommendations_service || '8105';
      }
    } catch (e: any) {
      console.log('Using default recommendations port');
    }

    // Generate FOAF recommendations from database
    const foafRecommendations = await generateDatabaseFOAFRecommendations(personId, {
      limit,
      maxDepth,
      caseContext
    });
    
    const foafData: FOAFResponse = {
      people: foafRecommendations.map(rec => ({
        id: rec.id,
        name: rec.name,
        handle: rec.handle || rec.email || 'unknown@legal.ai',
        role: rec.role || 'user',
        specialization: rec.specialization || 'general',
        confidence: rec.connectionStrength,
        relationshipPath: rec.relationshipPath
      })),
      summary: `Found ${foafRecommendations.length} legal professionals in your extended network`,
      totalFound: foafRecommendations.length,
      processingTimeMs: Date.now() - startTime
    };
    
    // Enhance with LangChain summarization if available
    try {
      const langchainUrl = `http://localhost:8106/api/summarize`;
      const summaryResponse = await fetch(langchainUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `FOAF recommendations for ${personId}: ${foafData.people.map(p => p.name).join(', ')}`,
          context: 'professional network analysis',
          style: 'brief'
        })
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        foafData.summary = summaryData.summary;
      }
    } catch (e: any) {
      console.log('LangChain summarization not available, using default summary');
    }

    foafData.processingTimeMs = Date.now() - startTime;
    return json(foafData);

  } catch (err: any) {
    console.error('FOAF API error:', err);
    throw error(500, 'Failed to fetch FOAF recommendations');
  }
};

export const POST: RequestHandler = async ({ params, request }) => {
  const { personId } = params;
  const body: Partial<FOAFRequest> = await request.json();
  
  try {
    const startTime = Date.now();
    
    const foafRecommendations = await generateDatabaseFOAFRecommendations(personId, {
      limit: body.limit || 10,
      maxDepth: body.maxDepth || 3,
      caseContext: body.caseContext,
      includeEmbedding: true,
      minConnectionStrength: 0.2
    });

    const enhancedResponse: FOAFResponse = {
      people: foafRecommendations.map(rec => ({
        id: rec.id,
        name: rec.name,
        handle: rec.handle || rec.email || 'unknown@legal.ai',
        role: rec.role || 'user',
        specialization: rec.specialization || 'general',
        confidence: rec.connectionStrength,
        relationshipPath: rec.relationshipPath
      })),
      summary: `Enhanced analysis found ${foafRecommendations.length} professionals with ${body.caseContext ? 'case-specific' : 'general'} relevance`,
      totalFound: foafRecommendations.length,
      processingTimeMs: Date.now() - startTime
    };

    return json(enhancedResponse);
  } catch (err: any) {
    console.error('Enhanced FOAF POST error:', err);
    throw error(500, 'Failed to generate enhanced FOAF recommendations');
  }
};

export interface DatabaseFOAFRecommendation {
  id: string;
  name: string;
  email?: string;
  handle?: string;
  role?: string;
  specialization?: string;
  connectionStrength: number;
  relationshipPath: string;
  sharedCases?: number;
  sharedEvidence?: number;
  reasoning: string;
  metadata?: any;
}

async function generateDatabaseFOAFRecommendations(
  personId: string,
  options: {
    limit?: number;
    maxDepth?: number;
    caseContext?: string;
    includeEmbedding?: boolean;
    minConnectionStrength?: number;
  } = {}
): Promise<DatabaseFOAFRecommendation[]> {
  const {
    limit = 5,
    maxDepth = 2,
    caseContext = '',
    includeEmbedding = false,
    minConnectionStrength = 0.3
  } = options;

  try {
    // Get the target person's information
    const targetPerson = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        role: users.role
      })
      .from(users)
      .where(eq(users.id, personId))
      .limit(1);

    if (!targetPerson.length) {
      return [];
    }

    const person = targetPerson[0];

    // Get shared case connections
    const sharedCaseConnections = await db
      .select({
        userId: users.id,
        displayName: users.displayName,
        email: users.email,
        role: users.role,
        sharedCases: sql<number>`count(distinct ${cases.id})`.as('sharedCases')
      })
      .from(users)
      .leftJoin(cases, eq(cases.userId, users.id))
      .where(
        and(
          ne(users.id, personId),
          sql`${cases.id} IN (
            SELECT DISTINCT case_id FROM evidence 
            WHERE user_id = ${personId} OR case_id IN (
              SELECT id FROM cases WHERE user_id = ${personId}
            )
          )`
        )
      )
      .groupBy(users.id, users.displayName, users.email, users.role)
      .having(sql`count(distinct ${cases.id}) > 0`);

    // Get shared evidence connections
    const sharedEvidenceConnections = await db
      .select({
        userId: users.id,
        displayName: users.displayName,
        email: users.email,
        role: users.role,
        sharedEvidence: sql<number>`count(distinct ${evidence.id})`.as('sharedEvidence')
      })
      .from(users)
      .leftJoin(evidence, eq(evidence.userId, users.id))
      .where(
        and(
          ne(users.id, personId),
          sql`${evidence.caseId} IN (
            SELECT DISTINCT case_id FROM evidence WHERE user_id = ${personId}
            UNION
            SELECT DISTINCT id FROM cases WHERE user_id = ${personId}
          )`
        )
      )
      .groupBy(users.id, users.displayName, users.email, users.role)
      .having(sql`count(distinct ${evidence.id}) > 0`);

    // Get role-based connections
    const roleBasedConnections = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        role: users.role,
        caseCount: sql<number>`count(distinct ${cases.id})`.as('caseCount')
      })
      .from(users)
      .leftJoin(cases, eq(cases.userId, users.id))
      .where(
        and(
          ne(users.id, personId),
          eq(users.role, person.role || '')
        )
      )
      .groupBy(users.id, users.displayName, users.email, users.role)
      .limit(20);

    // Combine and score connections
    const recommendations: DatabaseFOAFRecommendation[] = [];

    // Process shared case connections
    for (const conn of sharedCaseConnections) {
      const connectionStrength = Math.min(0.9, (conn.sharedCases || 0) * 0.2 + 0.4);
      if (connectionStrength >= minConnectionStrength) {
        recommendations.push({
          id: conn.userId,
          name: conn.displayName || 'Unknown User',
          email: conn.email || undefined,
          handle: conn.email || undefined,
          role: conn.role || 'user',
          specialization: conn.role || 'general',
          connectionStrength,
          relationshipPath: `Legal Network → Shared Cases → ${conn.role}`,
          sharedCases: conn.sharedCases || 0,
          reasoning: `Collaborated on ${conn.sharedCases} shared case${(conn.sharedCases || 0) > 1 ? 's' : ''}`,
          metadata: { connectionType: 'case_collaboration' }
        });
      }
    }

    // Process shared evidence connections
    for (const conn of sharedEvidenceConnections) {
      const existingIndex = recommendations.findIndex(r => r.id === conn.userId);
      const evidenceScore = Math.min(0.6, (conn.sharedEvidence || 0) * 0.1 + 0.3);
      
      if (existingIndex >= 0) {
        recommendations[existingIndex].connectionStrength = Math.min(0.95, 
          recommendations[existingIndex].connectionStrength + evidenceScore);
        recommendations[existingIndex].sharedEvidence = conn.sharedEvidence || 0;
        recommendations[existingIndex].reasoning += ` and ${conn.sharedEvidence} shared evidence item${(conn.sharedEvidence || 0) > 1 ? 's' : ''}`;
      } else if (evidenceScore >= minConnectionStrength) {
        recommendations.push({
          id: conn.userId,
          name: conn.displayName || 'Unknown User',
          email: conn.email || undefined,
          handle: conn.email || undefined,
          role: conn.role || 'user',
          specialization: conn.role || 'general',
          connectionStrength: evidenceScore,
          relationshipPath: `Legal Network → Evidence Collaboration → ${conn.role}`,
          sharedEvidence: conn.sharedEvidence || 0,
          reasoning: `Worked with ${conn.sharedEvidence} shared evidence item${(conn.sharedEvidence || 0) > 1 ? 's' : ''}`,
          metadata: { connectionType: 'evidence_collaboration' }
        });
      }
    }

    // Process role-based connections
    for (const conn of roleBasedConnections) {
      const exists = recommendations.some(r => r.id === conn.id);
      if (!exists) {
        const roleScore = Math.min(0.5, (conn.caseCount || 0) * 0.03 + 0.2);
        if (roleScore >= minConnectionStrength) {
          recommendations.push({
            id: conn.id,
            name: conn.displayName || 'Unknown User',
            email: conn.email || undefined,
            handle: conn.email || undefined,
            role: conn.role || 'user',
            specialization: conn.role || 'general',
            connectionStrength: roleScore,
            relationshipPath: `Legal Network → ${conn.role} Peers`,
            reasoning: `Same role (${conn.role}) with ${conn.caseCount} cases`,
            metadata: { connectionType: 'role_based', caseCount: conn.caseCount }
          });
        }
      }
    }

    // Apply embedding-based enhancements if requested
    if (includeEmbedding && recommendations.length > 0) {
      await enhanceRecommendationsWithEmbeddings(personId, recommendations);
    }

    // Sort by connection strength and limit results
    return recommendations
      .sort((a, b) => b.connectionStrength - a.connectionStrength)
      .slice(0, limit);

  } catch (error: any) {
    console.error('Error generating database FOAF recommendations:', error);
    return [];
  }
}

async function enhanceRecommendationsWithEmbeddings(
  personId: string,
  recommendations: DatabaseFOAFRecommendation[]
): Promise<void> {
  try {
    // Get the target person's case content for embedding
    const targetActivity = await db
      .select({
        content: cases.description
      })
      .from(cases)
      .where(eq(cases.userId, personId))
      .limit(10);

    if (targetActivity.length === 0) return;

    const targetProfile = targetActivity
      .map(activity => activity.content)
      .filter(Boolean)
      .join(' ');

    if (targetProfile.length < 50) return;

    const targetEmbedding = await generateEnhancedEmbedding(targetProfile, {
      provider: 'nomic-embed',
      legalDomain: true,
      cache: true
    }) as number[];

    // Enhance each recommendation
    for (const rec of recommendations) {
      try {
        const recActivity = await db
          .select({
            content: cases.description
          })
          .from(cases)
          .where(eq(cases.userId, rec.id))
          .limit(10);

        if (recActivity.length > 0) {
          const recProfile = recActivity
            .map(activity => activity.content)
            .filter(Boolean)
            .join(' ');

          if (recProfile.length >= 50) {
            const recEmbedding = await generateEnhancedEmbedding(recProfile, {
              provider: 'nomic-embed',
              legalDomain: true,
              cache: true
            }) as number[];

            const similarity = cosineSimilarity(targetEmbedding, recEmbedding);
            
            // Boost connection strength based on semantic similarity
            rec.connectionStrength = Math.min(0.99, rec.connectionStrength + (similarity * 0.15));
            rec.reasoning += ` (${Math.round(similarity * 100)}% content similarity)`;
            rec.metadata = { ...rec.metadata, semanticSimilarity: similarity };
          }
        }
      } catch (error: any) {
        console.warn(`Failed to enhance recommendation ${rec.id} with embedding:`, error);
      }
    }
  } catch (error: any) {
    console.warn('Failed to enhance recommendations with embeddings:', error);
  }
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same length for similarity calculation');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}