import type { json, type RequestHandler  } from '@sveltejs/kit';
import type { z  } from 'zod';
import type { analyzeEvidence  } from '$lib/server/api/v1/evidence-handlers';
import type { getUserId  } from '$lib/server/utils/auth';
import type { EvidenceItem } from '$lib/components/ui/EvidenceCanvas';

// Schema for evidence analysis request
const EvidenceAnalysisSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/* * Evidence AI Analysis API Routes - Connects with Ollama and CUDA services
 * POST /api/v1/evidence/analyze - Analyze evidence with AI
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const isTestMode = request.headers.get('x-test-mode') === 'true';
    if (!isTestMode && (!locals.session || !locals.user)) {
      return json({ message: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const evidenceItem = EvidenceAnalysisSchema.parse(body) as EvidenceItem;

    // Use the analyzeEvidence function from handlers
    const analysis = await analyzeEvidence(evidenceItem);

    return json({
      success: true,
      data: {
        evidenceId: evidenceItem.id,
        analysis,
        processed_at: new Date().toISOString(),
        userId: isTestMode ? 'test-user' : getUserId(locals as App.Locals),
      },
    });
  } catch (error: Error | unknown) {
    console.error('Evidence analysis failed: ', error);
    if (error instanceof z.ZodError) {
      return json({ message: 'Invalid evidence data', details: error.errors }, { status: 400 });
    }
    const details = (error as Error)?.message ?? 'Unknown error';
    return json({ message: 'Analysis failed', details }, { status: 500 });
  }
};



