import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const caseId = params.id;

    // Mock data - in production, query from database
    const evidence = [
      {
        id: 'ev-001',
        title: 'Witness Statement - John Doe',
        classification: 'confidential',
        status: 'approved',
        type: 'document',
        boardPosition: { x: 100, y: 100 },
      },
      {
        id: 'ev-002',
        title: 'Security Footage - Location A',
        classification: 'confidential',
        status: 'approved',
        type: 'video',
        boardPosition: { x: 400, y: 100 },
      },
      {
        id: 'ev-003',
        title: 'Phone Records - Suspect',
        classification: 'sealed',
        status: 'locked',
        type: 'document',
        boardPosition: { x: 250, y: 300 },
      },
      {
        id: 'ev-004',
        title: 'Financial Records',
        classification: 'confidential',
        status: 'pending',
        type: 'document',
        boardPosition: { x: 100, y: 500 },
      },
    ];

    const relationships = [
      {
        id: 'rel-001',
        sourceNodeId: 'ev-001',
        targetNodeId: 'ev-002',
        type: 'mentions',
        confidence: 0.95,
      },
      {
        id: 'rel-002',
        sourceNodeId: 'ev-002',
        targetNodeId: 'ev-003',
        type: 'supports',
        confidence: 0.87,
      },
      {
        id: 'rel-003',
        sourceNodeId: 'ev-003',
        targetNodeId: 'ev-004',
        type: 'contradicts',
        confidence: 0.72,
      },
    ];

    return json(
      {
        caseId,
        evidence,
        relationships,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'max-age=60',
        },
      }
    );
  } catch (error) {
    console.error('Evidence board error:', error);
    return json(
      {
        error: 'Failed to load evidence board',
        evidence: [],
        relationships: [],
      },
      { status: 500 }
    );
  }
};
