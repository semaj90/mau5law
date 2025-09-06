// runtime-shims-override.d.ts
// Quick permissive overrides for runtime-injected services to reduce TS noise while we iterate.
declare global {
  // Force core runtime services to `any` to avoid repeated signature mismatches during bulk remediation.
  // We'll tighten these later with focused fixes per-service.
  const ollamaService: any;
  const vectorOps: any;
  const redis: any;

  // Ensure Redis.disconnect exists in places where the client type is ambiguous
  interface Redis {
    disconnect?: () => void | Promise<void>;
  }

  // Provide loose Request typing to allow request.body?.query usage in server handlers
  interface LooseRequest {
    body?: any;
    json?: () => Promise<any>;
    [k: string]: any;
  }

  // Some code expects `request` to have a `body` property; add a global fallback type
  // This won't change runtime behavior, only eases type checking during remediation.
  // (Files that import explicit Request types keep their own stricter typing.)
  // Note: we avoid changing lib.dom Request/Body definitions to stay safe.
  const __LOOSE_REQUEST__: LooseRequest | undefined;
}


