import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Simple Glyph Generation Test API
 * Tests glyph diffusion without database or MinIO dependencies
 */

export const GET: RequestHandler = async () => {
  console.log('🎨 Glyph test endpoint accessed via GET');
  return json({
    success: true,
    message: 'Glyph diffusion test endpoint is working',
    status: 'ok'
  });
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    console.log('🎨 Testing glyph generation:', body);

    // Simulate glyph generation without database/MinIO
    const mockGlyphResponse = {
      success: true,
      data: {
        evidence_id: body.evidence_id || 123,
        glyph_url: `data:image/svg+xml,${encodeURIComponent(`
          <svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
            <rect width="256" height="256" fill="#1f2937"/>
            <circle cx="128" cy="128" r="80" fill="#3b82f6" opacity="0.7"/>
            <text x="128" y="138" font-family="Arial" font-size="16" fill="white" text-anchor="middle">
              ${body.style || 'legal'}
            </text>
            <text x="128" y="158" font-family="Arial" font-size="12" fill="#9ca3af" text-anchor="middle">
              ${(body.prompt || 'test').slice(0, 20)}...
            </text>
          </svg>
        `)}`,
        generation_time_ms: Math.floor(Math.random() * 200 + 50),
        cache_hits: 0,
        tensor_ids: ['mock_tensor_1', 'mock_tensor_2'],
        neural_sprite_results: null,
        metadata: {
          style: body.style || 'legal',
          prompt: body.prompt || 'test',
          dimensions: body.dimensions || [256, 256]
        }
      }
    };

    console.log('✅ Mock glyph generated successfully');
    return json(mockGlyphResponse);

  } catch (error) {
    console.error('❌ Glyph test generation failed:', error);
    return json({
      success: false,
      error: 'Glyph test generation failed: ' + error.message
    }, { status: 500 });
  }
};
