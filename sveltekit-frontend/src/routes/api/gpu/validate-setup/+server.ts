/// <reference types="vite/client" />
import type { RequestHandler } from './$types.js'
/*
 * GPU Setup Validation API - Check AI readiness for Legal PDF processing
 * Tests GPU, Ollama, and model availability
 */
const GO_BASE = import.meta.env.GO_SERVICE_URL || import.meta.env.GO_SERVER_URL || import.meta.env.GO_MICROSERVICE_URL || "http://localhost:8084"
// Tiny retry wrapper to smooth transient failures
async function fetchWithTimeout<T = unknown>(path: string, timeoutMs = 2500): Promise<T> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${GO_BASE}${path}`, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(t)
  }
}
// Ollama service helper
const ollamaService = {
  isHealthy: async () => {
    try {
      const response = await fetch('http://localhost:11434/api/tags')
      return response.ok
    } catch {
      return false
    }
  },
  listModels: async () => {
    try {
      const response = await fetch('http://localhost:11434/api/tags')
      if (response.ok) {
        const data = await response.json()
        return data.models || []
      }
    } catch {
      return []
    }
    return []
  }
}
type OllamaModel = {
  name?: string
}
type GPUStatus = {
  available?: boolean
  cuda?: {
    available?: boolean
    version?: string
    device_id?: number
  }
  device?: {
    name?: string
  }
  memory?: {
    free?: number
    total?: number
    used?: number
  }
  temperature_c?: number
}
type HealthPayload = {
  services?: {
    gpu?: string | boolean
  }
}
type AISummarizeChecks = {
  gpu: boolean
  ollama: boolean
  model: boolean
}
type Details = {
  ollama: {
    ok: boolean
    models_count: number
    required_model: string
    model_present: boolean
  }
  go_service: {
    ok: boolean
    endpoint: string
    source?: string
    version?: string
    raw?: GPUStatus
    health?: HealthPayload
  }
  ai_summarize_checks: AISummarizeChecks
}
type CachePayload = {
  ok: boolean;
  details: Details
  message?: string
}
// Simple in-process cache
let cache: { ts?: number; data?: CachePayload } = {}
export const GET: RequestHandler = async () => {
  try {
    // Simple in-process cache (5s) to avoid repeated probing and UI flapping
    const now = Date.now();
    if (cache.ts && cache.data && now - cache.ts < 5000) {
      return json(cache.data);
    }
    // Try gpu-status once; if it fails, wait briefly and retry once
    const gpuAttempt = await Promise.allSettled([fetchWithTimeout<GPUStatus>('/api/gpu-status')]);
    let gpuStatus = gpuAttempt[0];
    if (gpuStatus.status === 'rejected') {
      await new Promise(r => setTimeout(r, 150));
      gpuStatus = (await Promise.allSettled([fetchWithTimeout<GPUStatus>('/api/gpu-status')]))[0];
    }
    const [ollamaHealthy, health] = await Promise.allSettled([
      ollamaService.isHealthy(),
      fetchWithTimeout<HealthPayload>('/api/health'),
    ]);
    const ollama_ok = ollamaHealthy.status === 'fulfilled' && Boolean(ollamaHealthy.value);

    const ollamaModels = ollama_ok ? await ollamaService.listModels() : [];
    const requiredModel = 'gemma3'; // As per instructions, gemma3 is a key model
    const model_present = ollamaModels.some((m: OllamaModel) => m.name?.includes(requiredModel));

    const go_service_ok = health.status === 'fulfilled' && health.value?.services?.gpu === 'ok';

    const ai_summarize_checks: AISummarizeChecks = {
      gpu: go_service_ok && gpuStatus.status === 'fulfilled' && Boolean(gpuStatus.value?.available),
      ollama: ollama_ok,
      model: model_present,
    };

    const details: Details = {
      ollama: {
        ok: ollama_ok,
        models_count: ollamaModels.length,
        required_model: requiredModel,
        model_present: model_present,
      },
      go_service: {
        ok: go_service_ok,
        endpoint: GO_BASE,
        source: health.status === 'fulfilled' ? health.value?.services?.gpu?.toString() : 'unknown',
        version: health.status === 'fulfilled' ? 'v1.0' : 'unknown', // Placeholder, actual version might come from health.value
        raw: gpuStatus.status === 'fulfilled' ? gpuStatus.value : undefined,
        health: health.status === 'fulfilled' ? health.value : undefined,
      },
      ai_summarize_checks: ai_summarize_checks,
    };

    const payload: CachePayload = {
      ok: ai_summarize_checks.gpu && ai_summarize_checks.ollama && ai_summarize_checks.model,
      details: details,
      message: ai_summarize_checks.gpu && ai_summarize_checks.ollama && ai_summarize_checks.model
        ? 'All AI components are ready for legal PDF processing.'
        : 'Some AI components are not fully ready. Check details.',
    };

    cache = { ts: now, data: payload };
    return json(payload);
  } catch (error) {
    console.error('GPU setup validation failed:', error);
    const errorPayload: CachePayload = {
      ok: false,
      details: {
        ollama: { ok: false, models_count: 0, required_model: 'gemma3', model_present: false },
        go_service: { ok: false, endpoint: GO_BASE },
        ai_summarize_checks: { gpu: false, ollama: false, model: false },
      },
      message: `Failed to validate GPU setup: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
    return json(errorPayload, { status: 500 });
  }
}