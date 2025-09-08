import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hmmSomEngine } from '$lib/services/predictive-hmm-som';
import { putCHRManifest } from '$lib/server/cache/index-cache';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { userId = 'anon', som, context, catalog } = body as {
      userId?: string;
      som: { width: number; height: number; active: Array<{ x: number; y: number; weight?: number }>; };
      context: { documentType?: string; interactionType?: string; complexity?: 'low' | 'medium' | 'high' };
      catalog: Array<{ assetId: string; assetType: string; semanticTags: string[]; legalContext: string; complexity: 'low' | 'medium' | 'high' }>;
    };

  const predictions = await hmmSomEngine.updateAndPredict(userId, som, context, catalog);
    const chrKeys = predictions.map((p) => `chr_rom_3d_${p.assetId}`);
    const manifestId = `pred:${Date.now()}:${Math.random().toString(36).slice(2,8)}`;
    await putCHRManifest({ id: manifestId, keys: chrKeys, ttlSec: 300, createdAt: new Date().toISOString() });

    return json({ predictions, manifestId });
  } catch (e: any) {
    return json({ error: 'prediction_failed', message: e?.message ?? String(e) }, { status: 400 });
  }
};
