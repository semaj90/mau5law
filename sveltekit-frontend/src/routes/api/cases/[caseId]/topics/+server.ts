import { json, type RequestHandler } from '@sveltejs/kit';
import { QdrantClient } from '@qdrant/js-client-rest';
import { QDRANT_URL } from '$env/static/private';

export const GET: RequestHandler = async ({ params }) => {
  const caseId = params.caseId;

  if (!QDRANT_URL) {
    return json({ error: 'Qdrant not configured' }, { status: 500 });
  }

  try {
    const qdrant = new QdrantClient({ url: QDRANT_URL });

    // Scroll through legal_vectors collection to get topic clusters
    const scrollResponse = await qdrant.scroll('legal_vectors', {
      filter: {
        must: [
          {
            key: 'case_id',
            match: { value: caseId }
          }
        ]
      },
      with_payload: true,
      limit: 10000
    });

    // Group by topic_id and create TopicNode objects
    const topicsById = new Map<number, any[]>();

    for (const point of scrollResponse.points || []) {
      const payload = point.payload || {};
      const topicId = payload.topic_id;

      if (typeof topicId === 'number') {
        if (!topicsById.has(topicId)) {
          topicsById.set(topicId, []);
        }
        topicsById.get(topicId)!.push(point);
      }
    }

    const topics = Array.from(topicsById.entries()).map(([topicId, points]) => {
      const firstPoint = points[0];
      const payload = firstPoint.payload || {};

      // Calculate cluster statistics
      const clusterSize = points.length;
      const avgSeverity = points.reduce((acc: number, p: any) =>
        acc + (p.payload?.severity ?? 0), 0) / Math.max(1, points.length);

      // Use SOM coordinates if available, otherwise random placement
      const somX = payload.som_x ?? Math.random();
      const somY = payload.som_y ?? Math.random();

      // Generate title from tags or use default
      const tags = payload.tags || payload.gemma_tags || [];
      const title = payload.topic_label ||
        (tags.length > 0 ? tags.slice(0, 2).join(' + ') : `Topic ${topicId}`);

      return {
        id: `${caseId}:${topicId}`,
        caseId,
        topicId,
        title,
        somX: Math.max(0, Math.min(1, somX)), // Clamp to [0,1]
        somY: Math.max(0, Math.min(1, somY)), // Clamp to [0,1]
        clusterSize,
        avgSeverity,
        tags
      };
    });

    return json({ topics });

  } catch (error) {
    console.error('Topics API error:', error);
    return json(
      { error: 'Failed to fetch topics', details: String(error) },
      { status: 500 }
    );
  }
};