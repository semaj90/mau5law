/// <reference types="vite/client" />
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
// Base URL for Go GPU status service (fallback to localhost)
const GO_BASE =
    import.meta.env.GO_SERVICE_URL ||
    import.meta.env.GO_SERVER_URL ||
    import.meta.env.GO_MICROSERVICE_URL ||
    'http://localhost:8084'
async function fetchWithTimeout(path: string, timeoutMs = 2500): Promise<any> {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), timeoutMs)
    try {
        const res = await fetch(`${GO_BASE}${path}`, { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return await res.json()
    } finally {
        clearTimeout(t)
    }
}
export const GET: RequestHandler = async () => {
    try {
        const data = await fetchWithTimeout('/api/gpu-status')
        const memory = {
            free: data?.memory?.free ?? null,
            total: data?.memory?.total ?? null,
            used:
                data?.memory?.total != null && data?.memory?.free != null
                    ? data.memory.total - data.memory.free: null
        }
        return json({
            success: true
            ok: true
            source: 'go',
            memory
        })
    } catch (err: any) {
        console.error('GPU memory status error:', err)
        return json({
            success: false
            error: 'failure default to mock',
            ok: false
            source: 'mock',
            memory: {
                free: 8192, // Mock 8GB free
                total: 12288, // Mock 12GB total
                used: 4096, // Mock 4GB used
                mockDevice: 'RTX 3060 (Simulated)'
            }
        }, { status: 500 })
    }
}