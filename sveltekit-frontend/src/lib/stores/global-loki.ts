import Loki from '$lib/compat/lokijs';
import type Redis from 'ioredis';

// Lightweight global Loki store for job lifecycle sync across workers via Redis pub/sub
export class GlobalLokiStore {
  private db: Loki;
  private jobs: Collection<any>;
  private redis?: Redis;
  private pubChannel = 'loki:jobs:updates';

  constructor() {
    this.db = new Loki('global.loki');
    // Use simple unique id index
    this.jobs = this.db.addCollection('jobs', { unique: ['id'] }) as any;
  }

  initRedis(redisClient?: Redis | any) {
    try {
      // ioredis instance expected; accept undefined for fallback
      if (!redisClient) return;
      this.redis = redisClient as Redis;
      // Subscribe on a duplicate connection to avoid interference
      const sub = (this.redis as any).duplicate ? (this.redis as any).duplicate() : undefined;
        if (sub && typeof (sub as any).connect === 'function') {
          (sub as any)
            .connect()
            .then(() => {
              try {
                if (typeof (sub as any).subscribe === 'function') {
                  (sub as any).subscribe(this.pubChannel);
                }
                if (typeof (sub as any).on === 'function') {
                  (sub as any).on('message', (_ch: string, msg: string) => {
                    try {
                      const payload = JSON.parse(msg);
                      this.applyRemoteUpdate(payload);
                    } catch (_) {}
                  });
                }
              } catch (_) {}
            })
            .catch(() => {});
        } else if (sub && typeof (sub as any).subscribe === 'function') {
          // Older ioredis versions auto-connect
          try {
            (sub as any).subscribe(this.pubChannel);
          } catch {}
          if (typeof (sub as any).on === 'function') {
            (sub as any).on('message', (_ch: string, msg: string) => {
              try {
                const payload = JSON.parse(msg);
                this.applyRemoteUpdate(payload);
              } catch (_) {}
            });
          }
        }
    } catch (_) {}
  }

  private publish(update: any) {
    try {
      if (this.redis && typeof (this.redis as any).publish === 'function') {
          const r = this.redis as any;
          if (r && typeof r.publish === 'function') {
            r.publish(this.pubChannel, JSON.stringify(update));
          }
      }
    } catch (_) {}
  }

  private upsertLocal(doc: any) {
    try {
      const existing = (this.jobs as any).by('id', doc.id);
      if (existing) {
        (this.jobs as any).update({ ...existing, ...doc, updatedAt: Date.now() });
      } else {
        (this.jobs as any).insert({ ...doc, updatedAt: Date.now() });
      }
    } catch (e) {
      // Fallback simple try-insert
      try {(this.jobs as any).insert({ ...doc, updatedAt: Date.now() });} catch {}
    }
  }

  applyRemoteUpdate(update: any) {
    if (!update || !update.id) return;
    this.upsertLocal(update);
  }

  async startJob(jobMeta: { id: string; [k: string]: any }) {
    const doc = { ...jobMeta, state: 'queued' };
    this.upsertLocal(doc);
    this.publish(doc);
  }

  async updateJob(jobId: string, patch: any) {
    const existing = (this.jobs as any).by('id', jobId);
    const merged = { ...(existing || { id: jobId }), ...patch };
    this.upsertLocal(merged);
    this.publish(merged);
  }

  async completeJob(jobId: string, result?: any) {
    await this.updateJob(jobId, { state: 'completed', result });
  }

  async failJob(jobId: string, error: string) {
    await this.updateJob(jobId, { state: 'failed', error });
  }
}

export const globalLoki = new GlobalLokiStore();
