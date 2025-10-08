/**
 * Cases Dashboard - Server Load Function
 * Loads real cases from PostgreSQL database
 */
import type { PageServerLoad } from '@sveltejs/kit';
import postgres from 'postgres';

// Database connection
const sql = postgres(
  process.env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5434/legal_ai_test',
  { max: 10 }
);

export interface CaseData {
  id: string;
  case_number: string;
  title: string;
  status: 'active' | 'pending' | 'closed' | 'archived';
  metadata: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
  // Calculated fields
  progress: number;
  evidenceCount: number;
  lastUpdate: string;
}

export const load: PageServerLoad = async () => {
  try {
    // Fetch cases with evidence counts
    const casesData = await sql`
      SELECT
        c.id,
        c.case_number,
        c.title,
        c.status,
        c.metadata,
        c.created_at,
        c.updated_at,
        COUNT(e.id) as evidence_count
      FROM cases c
      LEFT JOIN evidences e ON e.case_id = c.id
      GROUP BY c.id, c.case_number, c.title, c.status, c.metadata, c.created_at, c.updated_at
      ORDER BY c.created_at DESC
      LIMIT 50
    `;

    // Transform to match component expectations
    const cases: CaseData[] = casesData.map((row: any) => {
      const evidenceCount = parseInt(row.evidence_count || '0');
      const createdAt = new Date(row.created_at);
      const updatedAt = new Date(row.updated_at);

      // Calculate time since last update
      const now = new Date();
      const diffMs = now.getTime() - updatedAt.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      let lastUpdate: string;
      if (diffMins < 1) {
        lastUpdate = 'just now';
      } else if (diffMins < 60) {
        lastUpdate = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        lastUpdate = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      } else {
        lastUpdate = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      }

      // Calculate progress based on evidence analysis completion
      // For now, use a simple heuristic: cases with more evidence = more progress
      let progress = 0;
      if (evidenceCount > 0) {
        progress = Math.min(100, evidenceCount * 10 + 25);
      } else {
        progress = row.status === 'active' ? 25 : 0;
      }

      return {
        id: row.id,
        case_number: row.case_number,
        title: row.title,
        status: row.status as 'active' | 'pending' | 'closed' | 'archived',
        metadata: row.metadata,
        created_at: createdAt,
        updated_at: updatedAt,
        progress,
        evidenceCount,
        lastUpdate,
      };
    });

    return {
      cases,
      summary: {
        total: cases.length,
        active: cases.filter(c => c.status === 'active').length,
        pending: cases.filter(c => c.status === 'pending').length,
        totalEvidence: cases.reduce((sum, c) => sum + c.evidenceCount, 0),
      },
    };
  } catch (error) {
    console.error('❌ Failed to load cases:', error);

    // Return empty data on error (don't crash the page)
    return {
      cases: [],
      summary: {
        total: 0,
        active: 0,
        pending: 0,
        totalEvidence: 0,
      },
      error: error instanceof Error ? error.message : 'Failed to load cases',
    };
  }
};
