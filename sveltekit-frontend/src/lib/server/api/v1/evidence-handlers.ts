import { json } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { EvidenceDetectiveService } from '$lib/server/evidence-detective';

interface UserType {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export async function getEvidence(user: UserType, request: Request, db: any, schema: any) {
  try {
    const drizzleDb = db as PostgresJsDatabase<typeof schema>;
    const evidenceItems = await drizzleDb.query.evidenceTable.findMany({
      where: eq(schema.evidenceTable.uploadedBy, user.id), // Assuming uploadedBy is userId
    });
    return json({ success: true, data: evidenceItems });
  } catch (error) {
    console.error('Error fetching evidence:', error);
    return json({ success: false, error: 'Failed to fetch evidence' }, { status: 500 });
  }
}

export async function getEvidenceItem(user: UserType, evidenceId: string, db: any, schema: any) {
  try {
    const drizzleDb = db as PostgresJsDatabase<typeof schema>;
    const evidenceItem = await drizzleDb.query.evidenceTable.findFirst({
      where: and(eq(schema.evidenceTable.id, evidenceId), eq(schema.evidenceTable.uploadedBy, user.id)),
    });
    if (!evidenceItem) {
      return json({ success: false, error: 'Evidence item not found or unauthorized' }, { status: 404 });
    }
    return json({ success: true, data: evidenceItem });
  } catch (error) {
    console.error('Error fetching evidence item:', error);
    return json({ success: false, error: 'Failed to fetch evidence item' }, { status: 500 });
  }
}

export async function handleCreateEvidence(user: UserType, request: Request, db: any, schema: any) {
  try {
    const { title, description, fileName, mimeType, fileSize, caseId } = await request.json();
    if (!title || !fileName) {
      return json({ success: false, error: 'Title and filename are required' }, { status: 400 });
    }
    const drizzleDb = db as PostgresJsDatabase<typeof schema>;
    const [newEvidence] = await drizzleDb.insert(schema.evidenceTable).values({
      title,
      description,
      fileName,
      mimeType,
      fileSize,
      caseId,
      uploadedBy: user.id,
      hash: 'placeholder-hash',
      tags: [],
      chainOfCustody: [],
      labAnalysis: {},
      aiAnalysis: {},
      aiTags: [],
    }).returning();
    return json({ success: true, data: newEvidence }, { status: 201 });
  } catch (error) {
    console.error('Error creating evidence:', error);
    return json({ success: false, error: 'Failed to create evidence' }, { status: 500 });
  }
}

export async function handleEvidenceDetective(user: UserType, request: Request, evidenceDetectiveService: EvidenceDetectiveService) {
  try {
    const { evidenceId, query } = await request.json();
    if (!evidenceId || !query) {
      return json({ success: false, error: 'Evidence ID and query are required' }, { status: 400 });
    }
    // Placeholder for evidence detective service
    // const result = await evidenceDetectiveService.analyzeEvidence(evidenceId, query);
    return json({ success: true, data: { evidenceId, query, analysis: 'Placeholder detective analysis' } });
  } catch (error) {
    console.error('Error running evidence detective:', error);
    return json({ success: false, error: 'Failed to run evidence detective' }, { status: 500 });
  }
}
