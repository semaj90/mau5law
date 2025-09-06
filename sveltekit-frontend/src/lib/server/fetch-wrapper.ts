// Unified fetch wrapper with timeout, retry, JSON guard
export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  expectedStatus?: number | number[];
}

export async function safeFetchJson<T=any>(url: string, options: FetchOptions = {}): Promise<{ ok: boolean; status: number; data?: T; error?: string; }> {
  const { timeoutMs = 10000, retries = 1, retryDelayMs = 250, expectedStatus } = options;

  let attempt = 0;
  let lastError: any;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      const acceptable = expectedStatus
        ? Array.isArray(expectedStatus)
          ? expectedStatus.includes(res.status)
          : res.status === expectedStatus
        : res.ok;

      let data: any;
      const text = await res.text();
      try { data = text ? JSON.parse(text) : undefined; } catch { data = text as any; }

      if (!acceptable) {
        return { ok: false, status: res.status, data, error: `Unexpected status ${res.status}` };
      }
      return { ok: true, status: res.status, data };
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      if (attempt === retries) break;
      await new Promise(r => setTimeout(r, retryDelayMs * (attempt + 1)));
    }
    attempt++;
  }
  return { ok: false, status: 0, error: lastError?.message || 'fetch failed' };
}
