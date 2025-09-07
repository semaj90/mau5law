import EventEmitter from 'events';
import { redis } from '$lib/server/redis';

export type JobState = 'queued' | 'running' | 'succeeded' | 'failed' | 'retrying' | 'cancelled';

export type JobRecord = {
  id: string;
  state: JobState;
  payload?: any;
  retries?: number;
  lastError?: string | null;
  updatedAt: string;
  createdAt: string;
};

class JobStore extends EventEmitter {
  private items = new Map<string, JobRecord>();

  private nowIso() {
    return new Date().toISOString();
  }

  async setJob(job: Partial<JobRecord> & { id: string }) {
    const existing = this.items.get(job.id) ?? null;
    const record: JobRecord = {
      id: job.id,
      state: job.state ?? (existing?.state ?? 'queued'),
      payload: job.payload ?? existing?.payload,
      retries: typeof job.retries === 'number' ? job.retries : existing?.retries ?? 0,
      lastError: job.lastError ?? existing?.lastError ?? null,
      createdAt: existing?.createdAt ?? this.nowIso(),
      updatedAt: this.nowIso(),
    };
    this.items.set(job.id, record);
    try {
      await redis.set(`jobs:state:${job.id}`, JSON.stringify(record));
    } catch {
      // ignore redis failures
    }
    this.emit('update', record);
    return record;
  }

  async getJob(id: string) {
    const local = this.items.get(id);
    if (local) return local;
    try {
      const raw = await redis.get(`jobs:state:${id}`);
      if (raw) {
        const parsed = JSON.parse(raw) as JobRecord;
        this.items.set(id, parsed);
        return parsed;
      }
    } catch {}
    return null;
  }

  async listJobs() {
    return Array.from(this.items.values()).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  }
}

class JobStateMachine {
  constructor(private store: JobStore, private opts: { concurrency?: number } = {}) {}
  private running = new Set<string>();
  private concurrency = this.opts.concurrency ?? 2;

  async createJob(id: string, payload?: any) {
    return this.store.setJob({ id, state: 'queued', payload });
  }
  async startJob(id: string) {
    if (this.running.size >= this.concurrency) return null;
    this.running.add(id);
    return this.store.setJob({ id, state: 'running' });
  }
  async completeJob(id: string) {
    this.running.delete(id);
    return this.store.setJob({ id, state: 'succeeded' });
  }
  async failJob(id: string, error: unknown, retry = false) {
    this.running.delete(id);
    const job = await this.store.getJob(id);
    const retries = (job?.retries ?? 0) + (retry ? 1 : 0);
    return this.store.setJob({ id, state: retry ? 'retrying' : 'failed', lastError: String((error as any)?.message ?? error), retries });
  }
  onUpdate(cb: (rec: JobRecord) => void) { this.store.on('update', cb); }
}

// Singleton
const globalAny = globalThis as any;
if (!globalAny.__job_store_fe) {
  globalAny.__job_store_fe = new JobStore();
  globalAny.__job_machine_fe = new JobStateMachine(globalAny.__job_store_fe, { concurrency: 4 });
}

export const jobStore: JobStore = globalAny.__job_store_fe;
export const jobMachine: JobStateMachine = globalAny.__job_machine_fe;
