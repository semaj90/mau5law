import type { Readable } from 'svelte/store';
import { writable, get } from 'svelte/store';

/**
 * RAG Streaming Client Helper (SSE)
 * ---------------------------------
 * Consumes Server-Sent Events from /rag/query/stream and exposes a simple callback API.
 * Robust incremental parser handles partial event frames across network chunks, multiline `data:` fields,
 * trailing buffers, and emits a synthetic `done` if server closes without explicit event.
 *
 * API:;
 *  streamRag({
 *    query: string;
 *    contextIds?: string[];
 *    intent?: string;
 *    model?: string;
 *    signal?: AbortSignal;            // external AbortController for cancellation
 *    endpoint?: string;               // override path (default: /rag/query/stream)
 *    extra?: Record<string, unknown>; // additional payload fields
 *    onToken?: (token: string) => void;
 *    onDone?: () => void;
 *    onError?: (err: Error) => void;
 *  }) => Promise<
 *
 * Usage (Svelte component):
 *  import { streamRag } from '$lib/ai/ragStreamClient';
 *  let tokens: string[] = [];
 *  let abortCtrl: AbortController;
 *  function start(query: string) {
 *    abortCtrl = new AbortController();
 *    streamRag({
 *      query,
 *      signal: abortCtrl.signal,
 *      onToken: t => tokens = [...tokens, t],
 *      onDone: () => console.log('done'),
 *      onError: e => console.error(e)
 *    });
 *  }
 *  function cancel() { abortCtrl?.abort(), }
 */
export interface RagStreamOptions {
  query: string;
  contextIds?: string[];
  intent?: string;
  model?: string;
  ingestionId?: string; // optional correlation id to tie stream to prior ingestion
  signal?: AbortSignal;
  onToken?: (token: string) => void;
  onPatch?: (patch: any) => void; // streaming JSON patch / partial object payload
  onDone?: () => void;
  onError?: (err: Error) => void;
  endpoint?: string;
  extra?: Record<string, unknown>;
}

export interface InternalSSEState {
  currentEvent?: string;
  dataLines: string[];
}

function finalizeEvent(
  state: InternalSSEState,
  emit: (evt: { event?: string; data: string }) => void
) {
  if (state.dataLines.length === 0) return;
  emit({ event: state.currentEvent, data: state.dataLines.join('\n') });
  state.currentEvent = undefined;
  state.dataLines = [];
}

/** Incremental SSE line processor (per complete line without trailing \n) */
function processSSELine(
  line: string,
  state: InternalSSEState,
  emit: (evt: { event?: string; data: string }) => void
) {
  if (line === '' || line === '\r') {
    // Event boundary
    finalizeEvent(state, emit);
    return;
  }
  // Comments (:) ignored per SSE spec
  if (line.startsWith(':')) return;
  if (line.startsWith('event:')) {
    // Flush existing before switching event type
    finalizeEvent(state, emit);
    state.currentEvent = line.slice(6).trim();
    return;
  }
  if (line.startsWith('data:')) {
    state.dataLines.push(line.slice(5).trimStart());
    return;
  }
  // Unknown line type: treat as data fallback
  state.dataLines.push(line.trim());
}

export async function streamRag(opts: RagStreamOptions): Promise<any> {
  const {
    query,
    contextIds = [],
    intent,
    model = 'default',
    ingestionId,
    signal,
    onToken,
    onPatch,
    onDone,
    onError,
    endpoint = '/rag/query/stream',
    extra = {}
  } = opts;
  let doneEmitted = false;
  try {
    const body = JSON.stringify({ query, contextIds, intent, model, ingestionId, ...extra });
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal
    });
    if (!resp.ok || !resp.body) {
      throw new Error(`Stream request failed: ${resp.status}`);
    }
    const traceparent = resp.headers.get('traceparent') || undefined;
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    const state: InternalSSEState = { dataLines: [] };
    let buffer = '';
    const emit = (evt: { event?: string; data: string }) => {
      const ev = evt.event || 'message';
      if (ev === 'token' || ev === 'message') {
        if (evt.data && onToken) onToken(evt.data);
      } else if (ev === 'patch') {
        if (evt.data && onPatch) {
          try {
            onPatch(JSON.parse(evt.data));
          } catch {
            /* ignore malformed patch */
          }
        }
      } else if (ev === 'error') {
        if (onError) onError(new Error(evt.data));
      } else if (ev === 'done') {
        doneEmitted = true;
        onDone?.();
      }
    };
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Process complete lines; keep trailing partial in buffer
      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const rawLine = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine; // normalize CRLF
        processSSELine(line, state, emit);
      }
      // Early exit if aborted
      if (signal?.aborted) break;
    }
    // Flush any final line without newline
    if (buffer.length) {
      processSSELine(buffer, state, emit);
    }
    // Finalize any pending event data
    finalizeEvent(state, emit);
    if (!doneEmitted) {
      // Server closed without explicit done; emit once
      onDone?.();
    }
    return { traceparent };
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      // Silent abort (treat as graceful cancel). Do not call onError.
      return {};
    }
    onError?.(e instanceof Error ? e : new Error(String(e)));
    return {};
  }
}

// ---------------------------------------------
// Async generator + backoff + Svelte store API
// ---------------------------------------------

export interface RagStreamGeneratorOptions extends RagStreamOptions {
  maxRetries?: number; // default 0 (no reconnect)
  backoffMs?: number; // initial backoff (default 500ms)
  backoffFactor?: number; // exponential factor (default 2)
  retryStatusCodes?: number[]; // default [502,503,504]
}

export type RagStreamYield =
  | { type: 'token'; token: string }
  | { type: 'done' }
  | { type: 'error'; error: Error; final: boolean; attempt: number }
  | { type: 'reconnect'; attempt: number; nextDelayMs: number }
  | { type: 'meta'; traceparent?: string; streamId?: string }
  | { type: 'patch'; patch: any }
  | { type: 'summary'; summary: string; source: 'server' | 'local' };

function isRetryableStatus(status: number, retryStatusCodes: number[]) {
  return retryStatusCodes.includes(status);
}

export async function* streamRagGenerator(
  opts: RagStreamGeneratorOptions
): AsyncGenerator<RagStreamYield, void, unknown> {
  const {
    maxRetries = 0,
    backoffMs = 500,
    backoffFactor = 2,
    retryStatusCodes = [502, 503, 504],
    signal,
    ...base
  } = opts;
  const outerAbort = new AbortController();
  if (signal) {
    if (signal.aborted) outerAbort.abort();
    else signal.addEventListener('abort', () => outerAbort.abort(), { once: true });
  }
  let attempt = 0;
  while (true) {
    let doneEmitted = false;
    try {
      const body = JSON.stringify({
        query: base.query,
        contextIds: base.contextIds ?? [],
        intent: base.intent,
        model: base.model ?? 'default',
        ingestionId: base.ingestionId,
        ...(base.extra || {})
      });
      const resp = await fetch(base.endpoint || '/rag/query/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: outerAbort.signal
      });
      if (!resp.ok || !resp.body) {
        if (attempt < maxRetries && isRetryableStatus(resp.status, retryStatusCodes)) {
          const delay = backoffMs * Math.pow(backoffFactor, attempt);
          yield { type: 'reconnect', attempt: attempt + 1, nextDelayMs: delay };
          await new Promise((r) => setTimeout(r, delay));
          attempt++;
          continue;
        }
        yield {
          type: 'error',
          error: new Error(`Stream request failed: ${resp.status}`),
          final: true,
          attempt
        };
        return;
      }
      const traceparent = resp.headers.get('traceparent') || undefined;
      const streamIdHeader = resp.headers.get('x-stream-id') || undefined;
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      const state: InternalSSEState = { dataLines: [] };
      let buffer = '';
      const queue: RagStreamYield[] = [];
      queue.push({ type: 'meta', traceparent, streamId: streamIdHeader });
      const enqueue = (evt: { event?: string; data: string }) => {
        const ev = evt.event || 'message';
        if (ev === 'token' || ev === 'message') {
          if (evt.data) {
            for (const piece of evt.data.split(/\n+/)) {
              if (piece) queue.push({ type: 'token', token: piece });
            }
          }
        } else if (ev === 'patch') {
          if (evt.data) {
            try {
              queue.push({ type: 'patch', patch: JSON.parse(evt.data) });
            } catch {
              /* ignore */
            }
          }
        } else if (ev === 'summary') {
          if (evt.data) {
            queue.push({ type: 'summary', summary: evt.data, source: 'server' });
          }
        } else if (ev === 'error') {
          queue.push({ type: 'error', error: new Error(evt.data), final: false, attempt });
        } else if (ev === 'done') {
          doneEmitted = true;
          queue.push({ type: 'done' });
        }
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          const rawLine = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
          processSSELine(line, state, enqueue);
        }
        while (queue.length) yield queue.shift()!;
        if (outerAbort.signal.aborted) break;
      }
      if (buffer.length) processSSELine(buffer, state, enqueue);
      finalizeEvent(state, enqueue);
      while (queue.length) yield queue.shift()!;
      if (!doneEmitted) yield { type: 'done' };
      return;
    } catch (err: any) {
      if (outerAbort.signal.aborted) return;
      const errorObj = err instanceof Error ? err : new Error(String(err));
      const canRetry = attempt < maxRetries;
      yield { type: 'error', error: errorObj, final: !canRetry, attempt };
      if (!canRetry) return;
      const delay = backoffMs * Math.pow(backoffFactor, attempt);
      yield { type: 'reconnect', attempt: attempt + 1, nextDelayMs: delay };
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
      continue;
    }
  }
}

export interface RagStreamStore {
  tokens: Readable<string[]>;
  status: Readable<
    'idle' | 'connecting' | 'streaming' | 'reconnecting' | 'done' | 'error' | 'aborted'
  >;
  error: Readable<Error | null>;
  tokenCount: Readable<number>;
  metrics: Readable<any>;
  traceparent: Readable<string | undefined>;
  streamId: Readable<string | undefined>;
  patches: Readable<any[]>;
  appliedObject?: Readable<any>; // auto-applied object derived from patches
  summary: Readable<string | undefined>;
  start: (
    opts: Omit<RagStreamGeneratorOptions, 'signal'> & { signal?: AbortSignal }
  ) => Promise<void>;
  cancel: () => void;
  interrupt: (mode?: 'graceful' | 'force') => Promise<void>; // request server to stop; fallback to local summary
  clear: () => void;
  resetMetrics: () => void;
  rebuildApplied: (upToIndex?: number) => void; // rebuild derived object up to index,
  undoLast: (count?: number) => void; // undo last N patches
}

export interface RagStreamStoreInit extends Partial<RagStreamGeneratorOptions> {
  persistence?: {
    enabled?: boolean;
    key?: string; // override key; default rag:<query>
    storage?: 'local' | 'session';
    maxTokens?: number; // cap stored tokens
    deltaCompression?: boolean; // store as single newline-joined string; append-only
  };
  batching?: {
    enabled?: boolean;
    intervalMs?: number; // flush interval (default 40ms)
    maxBatchSize?: number; // flush immediately if size reached (default 32)
    adaptive?: boolean; // enable latency-aware adaptive interval
    minIntervalMs?: number; // adaptive lower bound (default 15)
    maxIntervalMs?: number; // adaptive upper bound (default 80)
  };
  patches?: {
    autoApply?: boolean; // apply patches to derived object
    mode?: 'auto' | 'json-patch' | 'merge'; // auto tries json-patch then merge
    initialObject?: unknown; // seed object
    keepInverses?: boolean; // maintain inverse operations (JSON Patch only)
    snapshotInterval?: number; // take full snapshot every N patches (default 20)
  };
  summarization?: {
    localOnMissing?: boolean; // generate local summary if server did not send one
    maxSentences?: number; // default 3
    minSentenceLength?: number; // default 20 chars
  };
}

export function createRagStreamStore(initial?: RagStreamStoreInit): RagStreamStore {
  // Add a small explicit type for metrics so we can add startedAt later
  type Metrics = {
    reconnects: number;
    errors: number;
    startedAt?: number | undefined;
  };

  const tokensW = writable<string[]>([]);
  const statusW = writable<
    'idle' | 'connecting' | 'streaming' | 'reconnecting' | 'done' | 'error' | 'aborted'
  >('idle');
  const errorW = writable<Error | null>(null);
  const tokenCountW = writable<number>(0);
  // Typed metrics store (startedAt is optional)
  const metricsW = writable<Metrics>({ reconnects: 0, errors: 0, startedAt: undefined });
  const traceparentW = writable<string | undefined>(undefined);
  const streamIdW = writable<string | undefined>(undefined);
  const patchesW = writable<any[]>([]);
  const appliedObjectW = writable<any>(initial?.patches?.initialObject ?? {});
  const summaryW = writable<string | undefined>(undefined);
  const inverseStack: any[][] = [];
  const snapshots: { index: number; object: any }[] = [];
  let patchCount = 0;
  const snapshotInterval = initial?.patches?.snapshotInterval ?? 20;
  // (Re)declared runtime state variables (restored after edit)
  let persistenceKey: string | undefined;
  let pendingBatch: string[] = [];
  let batchTimer: ReturnType<typeof setTimeout> | null = null;
  let lastTokenTs: number | null = null;
  let emaInterArrival = 0;
  const EMA_ALPHA = 0.25;
  let abortCtrl: AbortController | null = null;
  let running = false;

  // Added: batching control flags derived from initial options
  const batchingEnabled = initial?.batching?.enabled ?? false;
  const maxBatch = initial?.batching?.maxBatchSize ?? 32;

  function getStorage(storage?: 'local' | 'session') {
    if (typeof window === 'undefined') return undefined;
    return storage === 'session' ? window.sessionStorage : window.localStorage;
  }

  function loadPersisted(query: string) {
    if (!initial?.persistence?.enabled) return [] as string[];
    persistenceKey = initial.persistence?.key || `rag:${query}`;
    const store = getStorage(initial.persistence?.storage);
    if (!store) return [];
    try {
      const raw = store.getItem(persistenceKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as string[]; // legacy format
      if (
        parsed &&
        typeof parsed === 'object' &&
        parsed.version === 1 &&
        typeof parsed.data === 'string'
      ) {
        return parsed.data.length ? parsed.data.split('\n') : [];
      }
    } catch (error) {}
    return [];
  }

  function persist(tokens: string[]) {
    if (!initial?.persistence?.enabled || !persistenceKey) return;
    const store = getStorage(initial.persistence?.storage);
    if (!store) return;
    const maxTokens = initial.persistence?.maxTokens || 5000;
    try {
      if (initial.persistence?.deltaCompression) {
        const slice = tokens.slice(-maxTokens);
        store.setItem(persistenceKey, JSON.stringify({ version: 1, data: slice.join('\n') }));
      } else {
        store.setItem(persistenceKey, JSON.stringify(tokens.slice(-maxTokens)));
      }
    } catch (error) {}
  }

  function flushBatch() {
    if (!pendingBatch.length) return;
    tokensW.update((a) => {
      const next = [...a, ...pendingBatch];
      tokenCountW.set(next.length);
      persist(next);
      return next;
    });
    pendingBatch = [];
    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }
  }

  function scheduleBatch() {
    if (!batchingEnabled) return; // no-op when batching disabled
    if (batchTimer) return;
    let interval = initial?.batching?.intervalMs ?? 40;
    if (initial?.batching?.adaptive) {
      // Use EMA of inter-arrival; flush sooner if slow, batch tighter if fast;
      if (emaInterArrival > 0) {
        const minI = initial.batching?.minIntervalMs ?? 15;
        const maxI = initial.batching?.maxIntervalMs ?? 80;
        interval = Math.min(maxI, Math.max(minI, emaInterArrival * 0.8));
      }
    }
    batchTimer = setTimeout(() => flushBatch(), interval);
  }

  // Patch application helpers
  function applyJsonPatch(target: any, patch: any[]): boolean {
    try {
      for (const op of patch) {
        if (!op || typeof op !== 'object') return false;
        const { op: operation, path, value } = op as any;
        if (typeof path !== 'string' || !path.startsWith('/')) return false;
        const segments = path
          .slice(1)
          .split('/')
          .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
        let parent = target;
        for (let i = 0; i < segments.length - 1; i++) {
          const seg = segments[i];
          if (!(seg in parent) || typeof parent[seg] !== 'object') parent[seg] = {};
          parent = parent[seg];
        }
        const key = segments[segments.length - 1];
        switch (operation) {
          case 'add':
          case 'replace':
            parent[key] = value;
            break;
          case 'remove':
            if (Array.isArray(parent)) parent.splice(Number(key), 1);
            else delete parent[key];
            break;
          default:
            return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  function deepMerge(target: any, src: any) {
    if (src && typeof src === 'object') {
      for (const k of Object.keys(src)) {
        const sv = src[k];
        if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
          if (!target[k] || typeof target[k] !== 'object') target[k] = {};
          deepMerge(target[k], sv);
        } else {
          target[k] = sv;
        }
      }
    }
    return target;
  }

  // Add a local cancel helper so start() can call it safely
  function cancel() {
    abortCtrl?.abort();
    running = false;
    statusW.set('aborted');
    try {
      flushBatch();
    } catch {
      /* ignore flush errors on cancel */
    }
  }

  async function start(opts: Omit<RagStreamGeneratorOptions, 'signal'> & { signal?: AbortSignal }): Promise<any> {
    if (running) cancel(); // now refers to the local helper
    const merged: RagStreamGeneratorOptions = { ...(initial as any), ...(opts as any) } as any;
    abortCtrl = new AbortController();
    if (merged.signal) {
      if (merged.signal.aborted) abortCtrl.abort();
      else merged.signal.addEventListener('abort', () => abortCtrl?.abort(), { once: true });
    }
    const restored = loadPersisted(merged.query);
    tokensW.set(restored);
    tokenCountW.set(restored.length);
    errorW.set(null);
    statusW.set('connecting');
    // set startedAt via the typed store - use update to avoid overload/type mismatch
    metricsW.update(() => ({ reconnects: 0, errors: 0, startedAt: Date.now() }));
    summaryW.set(undefined);
    streamIdW.set(undefined);
    running = true;

    try {
      // Added: attempt counter local to start()
      let attempt = 0;
      for await (const ev of streamRagGenerator({ ...merged, signal: abortCtrl.signal })) {
        switch (ev.type) {
          case 'token':
            statusW.update((s) => (s === 'connecting' || s === 'reconnecting' ? 'streaming' : s));
            if (batchingEnabled) {
              // batching path
              pendingBatch.push(ev.token);
              if (pendingBatch.length >= maxBatch) flushBatch();
              else scheduleBatch();
            } else {
              // direct push path
              tokensW.update((a) => {
                const next = [...a, ev.token];
                tokenCountW.set(next.length);
                persist(next);
                return next;
              });
            }
            break;
          case 'reconnect':
            statusW.set('reconnecting');
            // use typed update (no any)
            metricsW.update((m) => ({ ...m, reconnects: (m?.reconnects ?? 0) + 1 }));
            break;
          case 'patch':
            patchesW.update((p) => [...p, ev.patch]);
            if (initial?.patches?.autoApply) {
              const prevObj = get(appliedObjectW) ?? (initial?.patches?.initialObject ?? {});
              const mode = initial.patches?.mode || 'auto';
              let newObj = prevObj ? JSON.parse(JSON.stringify(prevObj)) : {};
              let changed = false;
              let inverseForPatch: any[] | null = null;
              const keepInv = initial?.patches?.keepInverses;
              if ((mode === 'auto' || mode === 'json-patch') && Array.isArray(ev.patch)) {
                if (keepInv) {
                  inverseForPatch = [];
                  for (let i = ev.patch.length - 1; i >= 0; i--) {
                    const op = ev.patch[i];
                    if (op?.op === 'remove' && typeof op.path === 'string') {
                      // Remove operations are inherently reversible (no-op inverse)
                      inverseForPatch.push({ op: 'add', path: op.path, value: undefined });
                    } else {
                      const success = applyJsonPatch(newObj, [op]);
                      changed = changed || success;
                      if (success && keepInv) {
                        // Add inverse for successful patch
                        const invOp = { op: 'remove', path: op.path };
                        inverseForPatch.push(invOp);
                      }
                    }
                  }
                  if (changed) {
                    deepMerge(newObj, prevObj);
                    appliedObjectW.set(newObj);
                  }
                  // Apply inverses as separate patches (if any)
                  if (inverseForPatch?.length) {
                    for (const inv of inverseForPatch) {
                      patchesW.update((p) => [...p, inv]);
                    }
                  }
                } else {
                  // Simple replace for non-mergeable cases
                  applyJsonPatch(newObj, ev.patch);
                  appliedObjectW.set(newObj);
                }
              } else if (mode === 'merge') {
                deepMerge(newObj, ev.patch);
                appliedObjectW.set(newObj);
              }
            }
            break;
          case 'done':
            statusW.set('done');
            break;
          case 'error':
            errorW.set(new Error(ev.error));
            statusW.set('error');
            break;
          default:
            console.warn('Unknown event type:', ev);
        }
        if
    }
  }

  return {
    tokens: tokensW,
    status: statusW,
    error: errorW,
    tokenCount: tokenCountW,
    metrics: metricsW,
    traceparent: traceparentW,
    streamId: streamIdW,
    patches: patchesW,
    appliedObject: appliedObjectW,
    summary: summaryW,
    start,
    cancel() {
      abortCtrl?.abort();
    },
    async interrupt(mode: 'graceful' | 'force' = 'graceful') {
      if (running) {
        if (mode === 'graceful') {
          // Graceful stop: request server to stop streaming
          try {
            await streamRag({
              query: initial?.query ?? '',
              contextIds: initial?.contextIds,
              intent: initial?.intent,
              model: initial?.model,
              signal: abortCtrl?.signal,
              onDone: () => {},
              onError: () => {}
            });
          } catch (e) {
            console.error('Graceful interrupt error:', e);
          }
        }
        // Force cancel the ongoing request
        abortCtrl?.abort();
      }
    },
    clear() {
      tokensW.set([]);
      tokenCountW.set(0);
      patchesW.set([]);
      appliedObjectW.set(initial?.patches?.initialObject ?? {});
      summaryW.set(undefined);
      persist([]);
    },
    resetMetrics() {
      metricsW.set({ reconnects: 0, errors: 0, startedAt: undefined });
    },
    rebuildApplied(upToIndex?: number) {
      const allPatches = get(patchesW);
      const targetPatches = upToIndex != null ? allPatches.slice(0, upToIndex) : allPatches;
      const initialObj = initial?.patches?.initialObject ?? {};
      const newObj = targetPatches.reduce((obj, patch) => {
        applyJsonPatch(obj, patch);
        return obj;
      }, JSON.parse(JSON.stringify(initialObj)));
      appliedObjectW.set(newObj);
    },
    undoLast(count = 1) {
      const allPatches = get(patchesW);
      const newPatches = allPatches.slice(0, -count);
      patchesW.set(newPatches);
      // Reapply remaining patches to update the derived object
      const initialObj = initial?.patches?.initialObject ?? {};
      const newObj = newPatches.reduce((obj, patch) => {
        applyJsonPatch(obj, patch);
        return obj;
      }, JSON.parse(JSON.stringify(initialObj)));
      appliedObjectW.set(newObj);
    }
  };
}
