import { json, type RequestHandler } from '@sveltejs/kit';
import { RedisTaskQueue } from '$lib/services/redis-orchestrator';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { taskType, query, metadata = {}, priority = 100 } = body;
    if (!taskType || !query) {
      return json({ success: false, message: 'taskType and query are required' }, { status: 400 });
    }
    const validTaskTypes = ['complex_legal', 'document_analysis', 'case_synthesis', 'risk_assessment'];
    if (!validTaskTypes.includes(taskType)) {
      return json({ success: false, message: `taskType must be one of: ${validTaskTypes.join(', ')}` }, { status: 400 });
    }
    const taskId = await RedisTaskQueue.queueComplexTask(taskType, query, metadata, priority);
    return json({ success: true, taskId, message: `${taskType} task queued successfully`, priority });
  } catch (err) {
    console.error('Task queuing failed:', err);
    return json({ success: false, message: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
};
};
