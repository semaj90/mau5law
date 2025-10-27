import { createMachine, assign, interpret } from 'xstate';

export interface SystemMonitorContext {
	// timestamp ms of last user activity
	lastActivity: number | null;
	// last observed network latency in ms
	latency: number | null;
	// whether fallback mode (e.g. CPU-only) is enabled
	fallbackMode: boolean;
}

export type SystemMonitorEvent =
	| { type: 'USER_ACTIVITY' }
	| { type: 'NETWORK_PING'; latency: number }
	| { type: 'NETWORK_TIMEOUT' }
	| { type: 'CHECK_IDLE' }
	| { type: 'FORCE_OFFLINE' }
	| { type: 'FORCE_ONLINE' };

const IDLE_TIMEOUT_MS = 30_000; // 30s
const HIGH_LATENCY_MS = 600;
const LOW_LATENCY_MS = 250;

// remove type generics here to match XState v5 call signature and avoid the many-generic error
// Provide explicit Context/Event generics so assigns/guards/actions get the correct types
export const systemMonitorMachine = createMachine<SystemMonitorContext, SystemMonitorEvent>(
	{
		id: 'systemMonitor',
		initial: 'active',
		context: {
			lastActivity: null,
			latency: null,
			fallbackMode: false,
		},
		states: {
			active: {
				entry: ['logResumeGPU'],
				on: {
					USER_ACTIVITY: { actions: ['updateActivity'] },
					NETWORK_PING: [
						{ cond: 'highLatency', target: 'degraded', actions: ['updateLatency', 'enableFallback'] },
						{ actions: ['updateLatency'] },
					],
					CHECK_IDLE: { cond: 'isIdle', target: 'idle' },
					FORCE_OFFLINE: { target: 'offline', actions: ['notifyOffline', 'enableFallback'] },
				},
			},
			idle: {
				entry: ['pauseGPU', 'markIdle'],
				on: {
					USER_ACTIVITY: { target: 'active', actions: ['updateActivity', 'logResumeGPU'] },
					FORCE_OFFLINE: { target: 'offline', actions: ['notifyOffline', 'enableFallback'] },
				},
			},
			degraded: {
				entry: ['enableFallback', 'notifyLatencyHigh'],
				on: {
					NETWORK_PING: [
						{ cond: 'lowLatency', target: 'active', actions: ['updateLatency', 'resumeGPU'] },
						{ actions: ['updateLatency'] },
					],
					NETWORK_TIMEOUT: { target: 'offline', actions: ['notifyOffline', 'enableFallback'] },
					FORCE_OFFLINE: { target: 'offline', actions: ['notifyOffline', 'enableFallback'] },
				},
			},
			offline: {
				entry: ['enableFallback', 'notifyOffline'],
				on: {
					FORCE_ONLINE: { target: 'active', actions: ['logResumeGPU', 'resumeGPU'] },
					NETWORK_PING: { target: 'active', actions: ['updateLatency', 'resumeGPU'] },
				},
			},
		},
	},
	{
		actions: {
			// typed assigns/actions using explicit Context/Event types handled by top-level generic;
			// remove explicit generics from assign() calls to match XState v5 signatures
			updateActivity: assign(() => ({
				lastActivity: Date.now()
			})),

			// narrow the event union before accessing latency
			updateLatency: assign((ctx, event) => {
				const e = event as SystemMonitorEvent;
				if (e.type === 'NETWORK_PING' && typeof (e as any).latency === 'number') {
					return { latency: Math.max(0, Math.round((e as any).latency)) };
				}
				// no change for other events
				return {};
			}),

			// return partial context objects
			enableFallback: assign(() => ({ fallbackMode: true })),
			resumeGPU: assign(() => ({ fallbackMode: false })),

			// action functions receive correctly-typed ctx now
			logResumeGPU: (ctx) => {
				if (ctx.fallbackMode) {
					console.info('system-monitor: resuming GPU acceleration (fallback disabled)');
				}
			},
			pauseGPU: (ctx) => {
				console.info('system-monitor: pausing GPU usage (idle/fallback)', ctx);
			},
			markIdle: () => {
				console.log('system-monitor: user marked idle');
			},
			notifyLatencyHigh: () => {
				console.warn('system-monitor: network latency high');
			},
			notifyOffline: () => {
				console.error('system-monitor: network/offline detected');
			},
		},
		guards: {
			// typed guards; event narrowing works against SystemMonitorEvent by casting
			isIdle: (ctx) => {
				if (!ctx.lastActivity) return true;
				return Date.now() - ctx.lastActivity > IDLE_TIMEOUT_MS;
			},
			highLatency: (_ctx, event) => {
				const e = event as SystemMonitorEvent;
				return e.type === 'NETWORK_PING' && typeof (e as any).latency === 'number' && (e as any).latency >= HIGH_LATENCY_MS;
			},
			lowLatency: (_ctx, event) => {
				const e = event as SystemMonitorEvent;
				return e.type === 'NETWORK_PING' && typeof (e as any).latency === 'number' && (e as any).latency < LOW_LATENCY_MS;
			},
		},
	}
);

/**
 * Browser helper to start the system monitor interpreter and attach lightweight
 * integrations: user activity listeners (mousemove/keydown), periodic network
 * pings (with timeout), idle checks, rAF frame-drop detection, and network
 * effectiveType hints.
 */
export function startSystemMonitorService(opts?: {
	pingIntervalMs?: number;
	pingUrl?: string;
	pingTimeoutMs?: number;
	idleCheckIntervalMs?: number;
	rafThresholdMs?: number;
}) {
	const pingIntervalMs = opts?.pingIntervalMs ?? 10_000;
	const pingUrl = opts?.pingUrl ?? '/api/health/ping';
	const pingTimeoutMs = opts?.pingTimeoutMs ?? 3_000;
	const idleCheckIntervalMs = opts?.idleCheckIntervalMs ?? 10_000;
	const rafThresholdMs = opts?.rafThresholdMs ?? 120; // detect frame pauses >120ms

	const service = interpret(systemMonitorMachine).start();

	// Short-circuit: only run browser-specific hooks when window is available
	if (typeof window !== 'undefined' && typeof document !== 'undefined') {
		// user activity -> immediate refresh of lastActivity
		const onActivity = () => service.send({ type: 'USER_ACTIVITY' });
		window.addEventListener('mousemove', onActivity, { passive: true });
		window.addEventListener('keydown', onActivity, { passive: true });

		// periodic idle checks
		const idleTimer = setInterval(() => service.send({ type: 'CHECK_IDLE' }), idleCheckIntervalMs);

		// periodic network ping with timeout
		let pingTimer: ReturnType<typeof setInterval> | null = null;
		const doPing = async () => {
			try {
				const controller = new AbortController();
				const id = setTimeout(() => controller.abort(), pingTimeoutMs);
				const start = performance.now();
				const resp = await fetch(pingUrl, { method: 'GET', cache: 'no-store', signal: controller.signal });
				clearTimeout(id);
				const latency = Math.max(0, Math.round(performance.now() - start));
				if (resp && resp.ok) {
					service.send({ type: 'NETWORK_PING', latency });
				} else {
					service.send({ type: 'NETWORK_TIMEOUT' });
				}
			} catch (err) {
				service.send({ type: 'NETWORK_TIMEOUT' });
			}
		};
		// start immediately and then interval
		doPing();
		pingTimer = setInterval(doPing, pingIntervalMs);

		// network effectiveType hint (if supported)
		try {
			type NetworkConnection = { effectiveType?: string } | undefined;
			const nav = (navigator as unknown) as { connection?: NetworkConnection; mozConnection?: NetworkConnection; webkitConnection?: NetworkConnection };
			const conn = nav?.connection ?? nav?.mozConnection ?? nav?.webkitConnection;
			if (conn && typeof conn.effectiveType === 'string') {
				const et = String(conn.effectiveType);
				// map slow effective types to high-latency event
				if (et === 'slow-2g' || et === '2g') {
					// approximate a high-latency ping
					service.send({ type: 'NETWORK_PING', latency: HIGH_LATENCY_MS + 50 });
				}
			}
		} catch (_e) {
			// ignore
		}

		// rAF-based frame-drop detection
		let lastFrame = performance.now();
		let rafId: number | null = null;
		const rafCheck = (ts: number) => {
			const delta = ts - lastFrame;
			lastFrame = ts;
			if (delta > rafThresholdMs) {
				// send a NETWORK_PING-like event using the observed delta
				service.send({ type: 'NETWORK_PING', latency: Math.round(delta) });
			}
			rafId = requestAnimationFrame(rafCheck);
		};
		rafId = requestAnimationFrame(rafCheck);

		// cleanup function
		const stop = () => {
			service.stop();
			window.removeEventListener('mousemove', onActivity);
			window.removeEventListener('keydown', onActivity);
			if (idleTimer) clearInterval(idleTimer);
			if (pingTimer) clearInterval(pingTimer);
			if (rafId !== null) cancelAnimationFrame(rafId);
		};

		// use ReturnType<typeof interpret> instead of InterpreterFrom to avoid deprecated type import
		return { service, stop } as { service: ReturnType<typeof interpret>; stop: () => void };
	}

	// non-browser fallback: return started interpreter with noop stop
	return { service, stop: () => service.stop() } as { service: ReturnType<typeof interpret>; stop: () => void };
}

export default systemMonitorMachine;

