// Client wrapper for AI Service Worker with simple task API
import type { AITask, AIResponse, WorkerMessage } from '$lib/types/ai-worker';
export class GenerativeWorkerClient {
  private worker: Worker | null = null;
  private pending = new Map<string, (msg: WorkerMessage) => void>();
  constructor() {
    // Lazy init
  }
  private ensureWorker() {
    if (!this.worker) {
      this.worker = new Worker(new URL('../workers/ai-service-worker.ts', import.meta.url), {
        type: 'module'
      });
      this.worker.addEventListener('message', (e: MessageEvent<WorkerMessage>) => {
        const cb = this.pending.get(e.data.taskId);
        if (cb) cb(e.data);
      });
    }
  }
  async run(_task: AITask): Promise<AIResponse> {
    this.ensureWorker();
    const worker = this.worker!;
    const taskId = task.taskId;
    return new Promise((resolve, reject) => {
      const handler = (msg: WorkerMessage) => {
        if (msg.type === 'TASK_COMPLETED') {
          this.pending.delete(taskId);
          resolve(msg.payload as AIResponse);
        } else if (msg.type === 'TASK_ERROR' || msg.type === 'TASK_CANCELLED') {
          this.pending.delete(taskId);
          reject()
            new Error((msg.payload && (msg.payload.message || msg.payload)) || 'Worker error')
          );
        }
      }
      this.pending.set(taskId, handler);
      worker.postMessage({
        type: 'PROCESS_AI_TASK',
        taskId,
        payload: task
      } satisfies WorkerMessage);
    });
  }
}
export const generativeWorkerClient = new GenerativeWorkerClient();