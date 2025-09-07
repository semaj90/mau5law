export type WebGPUDiagResult = {
  supported: boolean;
  adapterFound: boolean;
  deviceCreated: boolean;
  error?: string;
  warnings: string[];
  powerPreferenceTried: Array<'high-performance' | 'low-power' | 'default'>;
  powerPreferenceUsed?: 'high-performance' | 'low-power' | 'default';
  timings: {
    requestAdapterMs?: number;
    requestDeviceMs?: number;
  };
  adapter?: {
    // Not all browsers expose name/label; keep optional
    label?: string;
    features: string[];
    limits: Record<string, number>;
    isFallbackAdapter?: boolean;
  };
  deviceLimits?: Record<string, number>;
  recommendedActions: string[];
};

async function tryRequestAdapter(powerPreference: 'high-performance' | 'low-power' | 'default') {
  // Some implementations don't accept 'default'; handle separately
  const opts = powerPreference === 'default' ? {} : { powerPreference };
  // @ts-ignore - types allow this in modern libs; safe to pass
  return navigator.gpu.requestAdapter(opts as any);
}

export async function diagnoseWebGPU(): Promise<WebGPUDiagResult> {
  const warnings: string[] = [];
  const recommended: string[] = [];
  const tried: Array<'high-performance' | 'low-power' | 'default'> = [];

  if (typeof navigator === 'undefined') {
    return {
      supported: false,
      adapterFound: false,
      deviceCreated: false,
      error: 'Navigator is undefined (SSR or non-browser context).',
      warnings,
      powerPreferenceTried: tried,
      timings: {},
      recommendedActions: ['Run diagnostics in a browser context (client-side).'],
    };
  }

  // Basic support check
  // @ts-ignore
  if (!navigator.gpu) {
    recommended.push(
      'Update to latest Chrome/Edge or enable WebGPU support.',
      'On older Chrome versions, try chrome://flags/#enable-unsafe-webgpu (restart browser).',
      'Update GPU drivers (NVIDIA/AMD/Intel).'
    );
    return {
      supported: false,
      adapterFound: false,
      deviceCreated: false,
      error: 'WebGPU not supported by this browser.',
      warnings,
      powerPreferenceTried: tried,
      timings: {},
      recommendedActions: recommended,
    };
  }

  let adapter: GPUAdapter | null = null;
  let device: GPUDevice | null = null;
  let t0 = performance.now();
  let t1: number | undefined;
  let t2: number | undefined;

  // Try high-performance → default → low-power
  for (const pref of ['high-performance', 'default', 'low-power'] as const) {
    tried.push(pref);
    try {
      adapter = await tryRequestAdapter(pref);
      if (adapter) {
        t1 = performance.now();
        // Keep track of which pref yielded an adapter
        var usedPref: 'high-performance' | 'low-power' | 'default' = pref;
        // Try creating device
        try {
          device = await adapter.requestDevice();
          t2 = performance.now();
          const result: WebGPUDiagResult = {
            supported: true,
            adapterFound: true,
            deviceCreated: true,
            warnings,
            powerPreferenceTried: tried,
            powerPreferenceUsed: usedPref,
            timings: {
              requestAdapterMs: t1 - t0,
              requestDeviceMs: t2 - t1,
            },
            adapter: {
              label: (adapter as any).label ?? undefined,
              features: Array.from(adapter.features ?? [] as any),
              limits: Object.fromEntries(Object.entries((adapter.limits as any) || {})),
              isFallbackAdapter: (adapter as any).isFallbackAdapter ?? undefined,
            },
            deviceLimits: Object.fromEntries(
              Object.entries((device.limits as any) || {}).map(([k, v]) => [k, Number(v as any)])
            ),
            recommendedActions: recommended,
          };

          // Heuristics and suggestions
          if ((adapter as any).isFallbackAdapter) {
            warnings.push('Browser reports a fallback adapter (likely no native GPU path).');
            recommended.push(
              'Force high-performance GPU: System Graphics Settings → app-specific → High performance.',
              'For laptops: ensure Windows Power Mode is set to Best Performance.'
            );
          }

          return result;
        } catch (e: any) {
          warnings.push(`requestDevice() failed for ${pref}: ${e?.message || String(e)}`);
          // Try next preference
        }
      } else {
        warnings.push(`No adapter returned for ${pref}.`);
      }
    } catch (e: any) {
      warnings.push(`requestAdapter(${pref}) threw: ${e?.message || String(e)}`);
    }
  }

  // If we reach here, no device acquired
  recommended.push(
    'Update GPU drivers (NVIDIA/AMD/Intel).',
    'Verify chrome://gpu shows WebGPU: Supported.',
    'In Chrome/Edge settings, prefer discrete GPU for this app.',
    'If running in VM/remote or with multiple GPUs, ensure the high-performance adapter is allowed.'
  );

  return {
    supported: true,
    adapterFound: Boolean(adapter),
    deviceCreated: false,
    error: 'Failed to create a WebGPU device after trying multiple power preferences.',
    warnings,
    powerPreferenceTried: tried,
    timings: t1 ? { requestAdapterMs: t1 - t0 } : {},
    adapter: adapter
      ? {
          label: (adapter as any).label ?? undefined,
          features: Array.from(adapter.features ?? [] as any),
          limits: Object.fromEntries(Object.entries((adapter.limits as any) || {})),
          isFallbackAdapter: (adapter as any).isFallbackAdapter ?? undefined,
        }
      : undefined,
    recommendedActions: recommended,
  };
}
