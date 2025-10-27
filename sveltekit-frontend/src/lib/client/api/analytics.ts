export interface SystemMetrics {
  [key: string]: unknown;
}

export async function getSystemMetrics(): Promise<SystemMetrics> {
  const res = await fetch('/api/analytics');
  return await res.json();
}