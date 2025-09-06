// Lightweight realtime pipeline store subscribing to ws-fanout events
import { writable, derived } from "svelte/store";

// Define types locally to avoid import issues
export type PipelineStage = 'gpu' | 'wasm' | 'embedding' | 'retrieval' | 'llm' | 'final';

// Mock performance monitoring function
function recordStageLatency(stage: PipelineStage, delta: number): void {
	// Implementation would track stage latency metrics
	console.debug(`Stage ${stage} took ${delta}ms`);
}

// ---- Types ----
export interface StageStatus {
	id: string;
	gpu?: boolean;
	wasm?: boolean;
	embedding?: boolean;
	retrieval?: boolean;
	llm?: boolean;
	final?: boolean;
	receivedAt?: number;
	completedAt?: number;
	stageTimestamps?: Partial<Record<PipelineStage, number>>; // per-stage arrival timestamps
	// Allow additional dynamic stage flags without TS complaints
	[key: string]: unknown; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface FinalResultEntry {
	id: string;
	llmResult?: unknown; // Domain-specific shape not enforced here
	context?: unknown;
	ts: number;
}

export const connectionStatus = writable<string>('disconnected');
export const stages = writable<Record<string, StageStatus>>({}); // traceId -> stage status object;
export const finalResults = writable<FinalResultEntry[]>([]); // list of final LLM outputs;
export const recentEvents = writable<any[]>([]); // rolling window (loosely typed)
let ws: WebSocket | null = null;

export function connectRealtime(url = 'ws://localhost:8080') {
	if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
	connectionStatus.set('connecting');
	try {
		ws = new WebSocket(url);
		ws.onopen = () => connectionStatus.set('connected');
		ws.onclose = () => {
			connectionStatus.set('disconnected');
			setTimeout(() => connectRealtime(url), 3000);
		};
		ws.onerror = () => connectionStatus.set('error');
		ws.onmessage = (ev) => {
			try {
				const data = JSON.parse(ev.data);
				handleEvent(data);
			} catch {
				// Ignore parse errors
			}
		};
	} catch {
		connectionStatus.set('error');
	}
}

export function disconnectRealtime() {
	if (ws) {
		ws.close();
		ws = null;
	}
}

function pushRecent(evt: any) {
	recentEvents.update(list => {
		const next = [evt, ...list];
		return next.slice(0, 100);
	});
}

function handleEvent(wrapper: any) {
	// wrapper shape { type, msg }
	const type = wrapper?.type;
	const msg = wrapper?.msg || {};
	pushRecent({ type, msg, at: Date.now() });

	if (type === 'ai.response') {
		const { id, stage, final } = msg;
		if (!id) return;

		stages.update(map => {
			const next: Record<string, StageStatus> = { ...map };
			const curr: StageStatus = next[id] || { id };
			const now = Date.now();

			if (!curr.stageTimestamps) curr.stageTimestamps = {};

			if (stage) {
				// Only record first time we see this stage to avoid double counting
				if (!curr.stageTimestamps[stage as PipelineStage]) {
					// Determine previous reference time (either receivedAt or last completed stage timestamp)
					const order: PipelineStage[] = ['gpu', 'wasm', 'embedding', 'retrieval', 'llm', 'final'];
					const idx = order.indexOf(stage as PipelineStage);
					let refTime = curr.receivedAt || now;

					if (idx > 0) {
						// find most recent earlier stage timestamp
						for (let i = idx - 1; i >= 0; i--) {
							const prevStage = order[i];
							const ts = curr.stageTimestamps[prevStage];
							if (ts) {
								refTime = ts;
								break;
							}
						}
					}

					(curr as any)[stage] = true;
					curr.stageTimestamps[stage as PipelineStage] = now;

					if (refTime !== now) {
						const delta = now - refTime;
						try {
							recordStageLatency(stage as PipelineStage, delta);
						} catch {
							// Ignore latency recording errors
						}
					}
				} else {
					// Already recorded; just ensure boolean flag remains true
					(curr as any)[stage] = true;
				}
			}

			if (final) {
				curr.final = true;
				curr.completedAt = Date.now();
			}

			next[id] = curr;
			return next;
		});

		if (final) {
			finalResults.update(arr => [
				{
					id,
					llmResult: msg.llmResult,
					context: msg.context,
					ts: Date.now()
				},
				...arr
			].slice(0, 50));
		}
	} else if (type === 'evidence.upload') {
		// seed initial trace
		const id = msg?.traceId;
		if (id) {
			stages.update(map => {
				const next: Record<string, StageStatus> = { ...map };
				if (!next[id]) {
					next[id] = { id, receivedAt: Date.now() };
				}
				return next;
			});
		}
	}
}

export const activePipelines = derived(stages, ($s) =>
	Object.values($s as Record<string, StageStatus>).filter(v => !v.final)
);

export const completedPipelines = derived(stages, ($s) =>
	Object.values($s as Record<string, StageStatus>)
		.filter(v => v.final)
		.sort((a, b) => ((b.completedAt || 0) - (a.completedAt || 0)))
		.slice(0, 20)
);

// Convenience start on import (optional). Comment out if you prefer manual control.
if (typeof window !== 'undefined') {
	connectRealtime();
}

export default {
	connect: connectRealtime,
	disconnect: disconnectRealtime,
	connectionStatus,
	stages,
	finalResults,
	recentEvents,
	activePipelines,
	completedPipelines
};