import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { cases, caseNotes, evidence } from '$lib/server/db/schema-postgres';
import { buildCaseSynthesis } from '$lib/server/cases/caseSynthesis';
import { generateLegalPacketPDF } from '$lib/server/pdf/legalPacketGenerator';
import { eq } from 'drizzle-orm';

/**
 * POST /api/cases/[id]/export/packet
 * Generate complete case packet PDF including notes, evidence, and AI analysis
 */
export async function POST({ params }) {
  try {
    const { id: caseId } = params;

    if (!caseId) {
      throw error(400, 'Case ID is required');
    }

    // Build comprehensive case synthesis
    const synthesis = await buildCaseSynthesis(caseId);

    // Fetch case details
    const caseData = await db
      .select()
      .from(cases)
      .where(eq(cases.id, caseId))
      .limit(1);

    if (!caseData.length) {
      throw error(404, 'Case not found');
    }

    // Generate PDF packet
    const pdfBuffer = await generateLegalPacketPDF({
      caseData: caseData[0],
      synthesis,
    });

    // Return PDF as downloadable blob
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="case_${caseId}_packet_${Date.now()}.pdf"`,
      },
    });

  } catch (err) {
    console.error('Packet export error:', err);
    throw error(500, 'Failed to generate case packet');
  }
}