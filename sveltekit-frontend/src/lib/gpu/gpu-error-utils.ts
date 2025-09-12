export type GPUErrorCategory = 'compile' | 'resource' | 'execution' | 'timeout' | 'unsupported' | 'unknown';

export interface ClassifiedGPUError {
  category: GPUErrorCategory;
  message: string;
  original: unknown;
  retryable: boolean;
}

const COMPILE_HINTS = ['compile', 'shader', 'program link', 'link failed'];
const RESOURCE_HINTS = ['out of memory', 'allocation', 'buffer', 'texture'];
const EXEC_HINTS = ['dispatch', 'execution', 'device lost'];
const TIMEOUT_HINTS = ['timeout', 'hung'];
const UNSUPPORTED_HINTS = ['unsupported', 'not implemented'];

export function classifyGPUError(err: unknown): ClassifiedGPUError {
  const msg = (err instanceof Error ? err.message : String(err || ''))?.toLowerCase();

  const match = (hints: string[]) => hints.some(h => msg.includes(h));

  let category: GPUErrorCategory = 'unknown';
  if (match(COMPILE_HINTS)) category = 'compile';
  else if (match(RESOURCE_HINTS)) category = 'resource';
  else if (match(EXEC_HINTS)) category = 'execution';
  else if (match(TIMEOUT_HINTS)) category = 'timeout';
  else if (match(UNSUPPORTED_HINTS)) category = 'unsupported';

  const retryable = category === 'execution' || category === 'resource';

  return {
    category,
    message: msg,
    original: err,
    retryable
  };
}

export interface RetryPolicyConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
}

export const DEFAULT_RETRY_POLICY: RetryPolicyConfig = {
  maxAttempts: 3,
  baseDelayMs: 40,
  maxDelayMs: 500,
  jitter: true
};

export function computeBackoff(attempt: number, policy: RetryPolicyConfig = DEFAULT_RETRY_POLICY): number {
  const exp = Math.min(policy.maxDelayMs, policy.baseDelayMs * Math.pow(2, attempt));
  if (!policy.jitter) return exp;
  const rand = exp * (0.85 + Math.random() * 0.3);
  return Math.min(policy.maxDelayMs, rand);
}
