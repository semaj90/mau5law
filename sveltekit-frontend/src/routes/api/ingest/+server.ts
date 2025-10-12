import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

// Single, canonical ingestion route (no duplicates).
// - Accepts multipart/form-data (field `file`) or JSON { minioUrl }
// - Uses session user id when available, otherwise creates anon id and sets HttpOnly cookie
// - Pushes job to local sharedWorkerPool when available; otherwise proxies to Go service at localhost:8080

type IngestRequest = { minioUrl?: string; userId?: string; metadata?: Record<string, unknown> }
type IngestResponse = { success: boolean; jobId?: string; queued?: boolean; error?: string; warnings?: string[]; anonId?: string }

const optional: any = { loaded: false }

async function ensureOptionalLoaded() {
	if (optional.loaded) return
	optional.loaded = true
	try {
		optional.sharedWorkerPool = (await import('$lib/server/ingest/worker-pool-simple.js')).sharedWorkerPool
	} catch (_) {
		optional.sharedWorkerPool = null
	}
	try {
		const minio = await import('$lib/server/ingest/minio.js')
		optional.detectContentType = minio.detectContentType
		optional.validateContentForIngestion = minio.validateContentForIngestion
	} catch (_) {}
	try {
		optional.checkEmbeddingEndpointHealth = (await import('$lib/server/ingest/embed.js')).checkEmbeddingEndpointHealth
	} catch (_) {
		optional.checkEmbeddingEndpointHealth = undefined
	}
	try {
		const idx = await import('$lib/server/index.js')
		optional.db = idx.db
		optional.userDocuments = idx.userDocuments
	} catch (_) {
		optional.db = null
	}
}

function generateAnonId() {
	return `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

async function proxyToGo(path: string, init?: RequestInit) {
	const url = `http://localhost:8080${path}`
	try {
		const res = await fetch(url, init)
		const body = await res.text()
		const headers: Record<string, string> = {}
		res.headers.forEach((v, k) => (headers[k] = v))
		return new Response(body, { status: res.status, headers })
	} catch (err) {
		return new Response(JSON.stringify({ success: false, error: String(err) }), { status: 502, headers: { 'content-type': 'application/json' } })
	}
}

export const POST: RequestHandler = async ({ request, locals }) => {
	await ensureOptionalLoaded()
	try {
		const contentType = (request.headers.get('content-type') || '').toLowerCase()
		const warnings: string[] = []

		// Resolve user id / anon fallback
		let userId: string | undefined = (locals as any)?.session?.user?.id
		let anonIdCreated: string | undefined
		if (!userId && (locals as any)?.anonId) userId = (locals as any).anonId
		if (!userId) {
			if (process.env.STRICT_UPLOADS === 'true') throw error(401, 'Authentication required')
			userId = generateAnonId()
			anonIdCreated = userId
		}

		// Optional embedding health check (non-blocking)
		if (optional.checkEmbeddingEndpointHealth) {
			try {
				const h = await optional.checkEmbeddingEndpointHealth()
				if (!h?.healthy) warnings.push(`Embedding endpoint unhealthy: ${h?.error || 'unknown'}`)
			} catch (e) {
				warnings.push(`Embedding health check failed: ${String(e)}`)
			}
		}

		// Multipart upload path
		if (contentType.includes('multipart/form-data')) {
			const formData = await request.formData()
			const file = formData.get('file') as File | null
			if (!file) throw error(400, 'No file provided')
			const buffer = Buffer.from(await file.arrayBuffer())

			const detected = optional.detectContentType ? optional.detectContentType(buffer, file.name) : file.type || 'application/octet-stream'
			const validation = optional.validateContentForIngestion ? optional.validateContentForIngestion(detected, buffer.length) : { valid: true }
			if (!validation.valid) throw error(400, `Content validation failed: ${validation.reason || 'invalid'}`)

			const jobId = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`
			const job = {
				id: jobId,
				fileBuffer: buffer,
				filename: file.name,
				userId,
				contentType: detected,
				metadata: { uploadedAt: new Date().toISOString(), originalName: file.name, size: buffer.length, anon: !!anonIdCreated }
			}

			if (optional.sharedWorkerPool) {
				optional.sharedWorkerPool.push(job)
				const resp: IngestResponse = { success: true, jobId, queued: true, warnings: warnings.length ? warnings : undefined, anonId: anonIdCreated }
				if (anonIdCreated) return json(resp, { status: 200, headers: { 'set-cookie': `anonId=${anonIdCreated}; Path=/; Max-Age=3600; HttpOnly` } })
				return json(resp)
			}

			// Proxy multipart to Go when worker not available
			const body = new FormData()
			body.append('file', new Blob([buffer]), file.name)
			body.append('userId', userId)
			const init: RequestInit = { method: 'POST', body }
			if (anonIdCreated) init.headers = { 'x-anon-id': anonIdCreated }
			return await proxyToGo('/api/ingest', init)
		}

		// JSON path (minioUrl)
		const data = (await request.json()) as IngestRequest
		if (!data?.minioUrl) throw error(400, 'minioUrl is required')
		const jobId = `minio_${Date.now()}_${Math.random().toString(36).slice(2)}`
		const job = { id: jobId, minioUrl: data.minioUrl, userId: data.userId ?? userId, metadata: { requestedAt: new Date().toISOString(), anon: !!anonIdCreated, ...(data.metadata || {}) } }

		if (optional.sharedWorkerPool) {
			optional.sharedWorkerPool.push(job)
			const resp: IngestResponse = { success: true, jobId, queued: true, warnings: warnings.length ? warnings : undefined, anonId: anonIdCreated }
			if (anonIdCreated) return json(resp, { status: 200, headers: { 'set-cookie': `anonId=${anonIdCreated}; Path=/; Max-Age=3600; HttpOnly` } })
			return json(resp)
		}

		const init: RequestInit = { method: 'POST', body: JSON.stringify(data), headers: { 'content-type': 'application/json' } }
		if (anonIdCreated) init.headers = { ...(init.headers || {}), 'x-anon-id': anonIdCreated }
		return await proxyToGo('/api/ingest', init)
	} catch (err) {
		console.error('Ingest POST error:', err)
		return json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
	}
}

export const GET: RequestHandler = async ({ url }) => {
	await ensureOptionalLoaded()
	try {
		if (optional.db && optional.userDocuments && optional.sharedWorkerPool) {
			const userId = url.searchParams.get('userId') || 'anonymous'
			const limit = parseInt(url.searchParams.get('limit') || '10')
			// keep query minimal and generic (index export may vary)
			const recentDocuments = await optional.db.select().from(optional.userDocuments).where({ userId }).limit(limit)
			const workerStats = optional.sharedWorkerPool.getStats ? optional.sharedWorkerPool.getStats() : { queued: 0 }
			const embeddingHealth = optional.checkEmbeddingEndpointHealth ? await optional.checkEmbeddingEndpointHealth() : { healthy: true }
			return json({ success: true, recentDocuments, workerStats, embeddingHealth })
		}
		return await proxyToGo('/api/ingest')
	} catch (err) {
		console.error('Ingest GET error:', err)
		return json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
	}
}

/*
Notes / follow-ups:
- This route sets a short-lived HttpOnly cookie `anonId` when creating a new anon id. In production, set Secure and SameSite appropriately when using HTTPS.
- Follow-ups to implement:
  - POST /api/ingest/claim to reassign jobs from anonId to authenticated user after login
  - Presigned MinIO URL generation for authenticated users (server+client)
- Security: add rate-limiting, CAPTCHA, and virus scanning for anon uploads in production.
*/
      if (!file) throw error(400, 'No file provided')
      const buffer = Buffer.from(await file.arrayBuffer())

      const jobId = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const job = { id: jobId, fileBuffer: buffer, filename: file.name, userId, contentType: file.type || 'application/octet-stream', metadata: { uploadedAt: new Date().toISOString(), size: buffer.length, anon: !!anonIdCreated } }

      if (optional.sharedWorkerPool) {
        optional.sharedWorkerPool.push(job)
        const resp: IngestResponse = { success: true, jobId, queued: true, anonId: anonIdCreated }
        if (anonIdCreated) return new Response(JSON.stringify(resp), { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': `anonId=${anonIdCreated}; Path=/; Max-Age=3600; HttpOnly` } })
        return json(resp)
      }

      const body = new FormData()
      body.append('file', new Blob([buffer]), file.name)
      body.append('userId', userId)
      const init: RequestInit = { method: 'POST', body }
      if (anonIdCreated) init.headers = { 'x-anon-id': anonIdCreated }
      return await proxyToGo('/api/ingest', init)
    }

    const data = (await request.json()) as IngestRequest
    if (!data?.minioUrl) throw error(400, 'minioUrl is required')
    const jobId = `minio_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const job = { id: jobId, minioUrl: data.minioUrl, userId: data.userId ?? userId, metadata: { requestedAt: new Date().toISOString(), anon: !!anonIdCreated, ...(data.metadata || {}) } }

    if (optional.sharedWorkerPool) {
      optional.sharedWorkerPool.push(job)
      const resp: IngestResponse = { success: true, jobId, queued: true, anonId: anonIdCreated }
      if (anonIdCreated) return new Response(JSON.stringify(resp), { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': `anonId=${anonIdCreated}; Path=/; Max-Age=3600; HttpOnly` } })
      return json(resp)
    }

    const init: RequestInit = { method: 'POST', body: JSON.stringify(data), headers: { 'content-type': 'application/json' } }
    if (anonIdCreated) init.headers = { ...(init.headers || {}), 'x-anon-id': anonIdCreated }
    return await proxyToGo('/api/ingest', init)
  } catch (err) {
    console.error('Ingest POST error:', err)
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export const GET: RequestHandler = async ({ url }) => {
  await ensureOptionalLoaded()
  try {
    if (optional.db && optional.userDocuments && optional.sharedWorkerPool) {
      const userId = url.searchParams.get('userId') || 'anonymous'
      const limit = parseInt(url.searchParams.get('limit') || '10')
      const recentDocuments = await optional.db.select().from(optional.userDocuments).where({ userId }).limit(limit)
      const workerStats = optional.sharedWorkerPool.getStats()
      const embeddingHealth = optional.checkEmbeddingEndpointHealth ? await optional.checkEmbeddingEndpointHealth() : { healthy: true }
      return json({ success: true, recentDocuments, workerStats, embeddingHealth })
    }
    return await proxyToGo('/api/ingest')
  } catch (err) {
    console.error('Ingest GET error:', err)
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

/* Follow-ups: POST /api/ingest/claim, presigned URL generation, virus-scan, rate-limits */
}

/* Follow-ups:
- POST /api/ingest/claim to reassign anon uploads
- Presigned MinIO URL generation for authenticated users
- Virus-scan, rate-limits and CAPTCHA protections for anon uploads
*/
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

// Canonical ingestion route (server-side anonymous upload fallback)
// - Accepts multipart file (form field `file`) or JSON { minioUrl }
// - If authenticated, uses session user id; otherwise creates anon_<ts>_<rnd> and sets HttpOnly cookie
// - Pushes job to local sharedWorkerPool when available; otherwise proxies to Go service at localhost:8080

type IngestRequest = { minioUrl?: string; userId?: string; metadata?: Record<string, unknown> }
type IngestResponse = { success: boolean; jobId?: string; queued?: boolean; error?: string; warnings?: string[]; anonId?: string }
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

// Single canonical ingestion route with anonymous upload fallback.
// Supports multipart file upload (form field `file`) and JSON { minioUrl }.

type IngestRequest = { minioUrl?: string; userId?: string; metadata?: Record<string, unknown> }
type IngestResponse = { success: boolean; jobId?: string; queued?: boolean; error?: string; warnings?: string[]; anonId?: string }

const optional: any = { loaded: false }

async function ensureOptionalLoaded() {
  if (optional.loaded) return
  optional.loaded = true
  try { optional.sharedWorkerPool = (await import('$lib/server/ingest/worker-pool-simple.js')).sharedWorkerPool } catch (_) { optional.sharedWorkerPool = null }
  try { const minio = await import('$lib/server/ingest/minio.js'); optional.detectContentType = minio.detectContentType; optional.validateContentForIngestion = minio.validateContentForIngestion } catch (_) {}
  try { optional.checkEmbeddingEndpointHealth = (await import('$lib/server/ingest/embed.js')).checkEmbeddingEndpointHealth } catch (_) { optional.checkEmbeddingEndpointHealth = undefined }
  try { const idx = await import('$lib/server/index.js'); optional.db = idx.db; optional.userDocuments = idx.userDocuments } catch (_) { optional.db = null }
}

function generateAnonId() {
  return `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

async function proxyToGo(path: string, init?: RequestInit) {
  const url = `http://localhost:8080${path}`
  try {
    const res = await fetch(url, init)
    const body = await res.text()
    const headers: Record<string, string> = {}
    res.headers.forEach((v, k) => (headers[k] = v))
    return new Response(body, { status: res.status, headers })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), { status: 502, headers: { 'content-type': 'application/json' } })
  }
}

export const POST: RequestHandler = async ({ request, locals }) => {
  await ensureOptionalLoaded()
  try {
    const contentType = request.headers.get('content-type') || ''
    let userId: string | undefined = (locals as any)?.session?.user?.id
    let anonIdCreated: string | undefined
    if (!userId && (locals as any)?.anonId) userId = (locals as any).anonId
    if (!userId) {
      if (process.env.STRICT_UPLOADS === 'true') throw error(401, 'Authentication required')
      userId = generateAnonId()
      anonIdCreated = userId
    }

    const warnings: string[] = []

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file) throw error(400, 'No file provided')
      const buffer = Buffer.from(await file.arrayBuffer())

      const detectedContentType = optional.detectContentType ? optional.detectContentType(buffer, file.name) : file.type || 'application/octet-stream'
      const validation = optional.validateContentForIngestion ? optional.validateContentForIngestion(detectedContentType, buffer.length) : { valid: true }
      if (!validation.valid) throw error(400, `Content validation failed: ${validation.reason || 'unknown'}`)

      const jobId = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const job = {
        id: jobId,
        fileBuffer: buffer,
        filename: file.name,
        userId,
        contentType: detectedContentType,
        metadata: { uploadedAt: new Date().toISOString(), originalName: file.name, size: buffer.length, anon: !!anonIdCreated }
      }

      if (optional.sharedWorkerPool) {
        optional.sharedWorkerPool.push(job)
        const resp: IngestResponse = { success: true, jobId, queued: true, anonId: anonIdCreated }
        if (anonIdCreated) return new Response(JSON.stringify(resp), { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': `anonId=${anonIdCreated}; Path=/; Max-Age=3600; HttpOnly` } })
        return json(resp)
      }

      const body = new FormData()
      body.append('file', new Blob([buffer]), file.name)
      body.append('userId', userId)
      const init: RequestInit = { method: 'POST', body }
      if (anonIdCreated) init.headers = { 'x-anon-id': anonIdCreated }
      return await proxyToGo('/api/ingest', init)
    }

    const data = (await request.json()) as IngestRequest
    if (!data?.minioUrl) throw error(400, 'minioUrl is required')
    const jobId = `minio_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const job = {
      id: jobId,
      minioUrl: data.minioUrl,
      userId: data.userId ?? userId,
      metadata: { requestedAt: new Date().toISOString(), anon: !!anonIdCreated, ...(data.metadata || {}) }
    }

    if (optional.sharedWorkerPool) {
      optional.sharedWorkerPool.push(job)
      const resp: IngestResponse = { success: true, jobId, queued: true, anonId: anonIdCreated }
      if (anonIdCreated) return new Response(JSON.stringify(resp), { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': `anonId=${anonIdCreated}; Path=/; Max-Age=3600; HttpOnly` } })
      return json(resp)
    }

    const init: RequestInit = { method: 'POST', body: JSON.stringify(data), headers: { 'content-type': 'application/json' } }
    if (anonIdCreated) init.headers = { ...(init.headers || {}), 'x-anon-id': anonIdCreated }
    return await proxyToGo('/api/ingest', init)
  } catch (err) {
    console.error('Ingest POST error:', err)
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export const GET: RequestHandler = async ({ url }) => {
  await ensureOptionalLoaded()
  try {
    if (optional.db && optional.userDocuments && optional.sharedWorkerPool) {
      const userId = url.searchParams.get('userId') || 'anonymous'
      const limit = parseInt(url.searchParams.get('limit') || '10')
      const recentDocuments = await optional.db.select().from(optional.userDocuments).where({ userId }).limit(limit)
      const workerStats = optional.sharedWorkerPool.getStats()
      const embeddingHealth = optional.checkEmbeddingEndpointHealth ? await optional.checkEmbeddingEndpointHealth() : { healthy: true }
      return json({ success: true, recentDocuments, workerStats, embeddingHealth })
    }
    return await proxyToGo('/api/ingest')
  } catch (err) {
    console.error('Ingest GET error:', err)
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

/* Follow-ups:
- POST /api/ingest/claim to reassign anon uploads
- Presigned MinIO URL generation for authenticated users
- Virus-scan, rate-limits and CAPTCHA protections for anon uploads
*/
type IngestResponse = { success: boolean; jobId?: string; queued?: boolean; error?: string; anonId?: string }

const optional: any = { loaded: false }

async function ensureOptionalLoaded() {
  if (optional.loaded) return
  optional.loaded = true
  try { optional.sharedWorkerPool = (await import('$lib/server/ingest/worker-pool-simple.js')).sharedWorkerPool } catch (_) { optional.sharedWorkerPool = null }
}

function generateAnonId() { return `anon_${Date.now()}_${Math.random().toString(36).slice(2)}` }

async function proxyToGo(path: string, init?: RequestInit) {
  const url = `http://localhost:8080${path}`
  try {
    const res = await fetch(url, init)
    const body = await res.text()
    const headers: Record<string, string> = {}
    res.headers.forEach((v, k) => (headers[k] = v))
    return new Response(body, { status: res.status, headers })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), { status: 502, headers: { 'content-type': 'application/json' } })
  }
}

export const POST: RequestHandler = async ({ request, locals }) => {
  await ensureOptionalLoaded()
  try {
    const contentType = request.headers.get('content-type') || ''
    let userId: string | undefined = (locals as any)?.session?.user?.id
    let anonIdCreated: string | undefined
    if (!userId && (locals as any)?.anonId) userId = (locals as any).anonId
    if (!userId) {
      if (process.env.STRICT_UPLOADS === 'true') throw error(401, 'Authentication required')
      userId = generateAnonId()
      anonIdCreated = userId
    }

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file) throw error(400, 'No file provided')
      const buffer = Buffer.from(await file.arrayBuffer())

      const jobId = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const job = { id: jobId, fileBuffer: buffer, filename: file.name, userId, contentType: file.type || 'application/octet-stream', metadata: { uploadedAt: new Date().toISOString(), size: buffer.length, anon: !!anonIdCreated } }

      if (optional.sharedWorkerPool) {
        optional.sharedWorkerPool.push(job)
        const resp: IngestResponse = { success: true, jobId, queued: true, anonId: anonIdCreated }
        if (anonIdCreated) return new Response(JSON.stringify(resp), { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': `anonId=${anonIdCreated}; Path=/; Max-Age=3600; HttpOnly` } })
        return json(resp)
      }

      const body = new FormData()
      body.append('file', new Blob([buffer]), file.name)
      body.append('userId', userId)
      const init: RequestInit = { method: 'POST', body }
      if (anonIdCreated) init.headers = { 'x-anon-id': anonIdCreated }
      return await proxyToGo('/api/ingest', init)
    }

    const data = (await request.json()) as IngestRequest
    if (!data?.minioUrl) throw error(400, 'minioUrl is required')
    const jobId = `minio_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const job = { id: jobId, minioUrl: data.minioUrl, userId: data.userId ?? userId, metadata: { requestedAt: new Date().toISOString(), anon: !!anonIdCreated, ...(data.metadata || {}) } }

    if (optional.sharedWorkerPool) {
      optional.sharedWorkerPool.push(job)
      const resp: IngestResponse = { success: true, jobId, queued: true, anonId: anonIdCreated }
      if (anonIdCreated) return new Response(JSON.stringify(resp), { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': `anonId=${anonIdCreated}; Path=/; Max-Age=3600; HttpOnly` } })
      return json(resp)
    }

    const init: RequestInit = { method: 'POST', body: JSON.stringify(data), headers: { 'content-type': 'application/json' } }
    if (anonIdCreated) init.headers = { ...(init.headers || {}), 'x-anon-id': anonIdCreated }
    return await proxyToGo('/api/ingest', init)
  } catch (err) {
    console.error('Ingest POST error:', err)
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export const GET: RequestHandler = async ({ url }) => {
  await ensureOptionalLoaded()
  try {
    if (optional.db && optional.userDocuments && optional.sharedWorkerPool) {
      const userId = url.searchParams.get('userId') || 'anonymous'
      const limit = parseInt(url.searchParams.get('limit') || '10')
      const recentDocuments = await optional.db.select().from(optional.userDocuments).where({ userId }).limit(limit)
      const workerStats = optional.sharedWorkerPool.getStats()
      const embeddingHealth = optional.checkEmbeddingEndpointHealth ? await optional.checkEmbeddingEndpointHealth() : { healthy: true }
      return json({ success: true, recentDocuments, workerStats, embeddingHealth })
    }
    return await proxyToGo('/api/ingest')
  } catch (err) {
    console.error('Ingest GET error:', err)
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

/* Follow-ups: POST /api/ingest/claim, presigned URL generation, virus-scan, rate-limits */
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

// Clean, minimal ingestion route. Supports multipart upload (file) and JSON { minioUrl }.

type IngestRequest = { minioUrl?: string; userId?: string; metadata?: Record<string, unknown> }
type IngestResponse = { success: boolean; jobId?: string; queued?: boolean; error?: string; warnings?: string[]; anonId?: string }

const optional: any = { loaded: false }

async function ensureOptionalLoaded() {
  if (optional.loaded) return
  optional.loaded = true
  try { optional.sharedWorkerPool = (await import('$lib/server/ingest/worker-pool-simple.js')).sharedWorkerPool } catch (_) { optional.sharedWorkerPool = null }
}

function generateAnonId() { return `anon_${Date.now()}_${Math.random().toString(36).slice(2)}` }

async function proxyToGo(path: string, init?: RequestInit) {
  const url = `http://localhost:8080${path}`
  try {
    const res = await fetch(url, init)
    const body = await res.text()
    const headers: Record<string, string> = {}
    res.headers.forEach((v, k) => (headers[k] = v))
    return new Response(body, { status: res.status, headers })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), { status: 502, headers: { 'content-type': 'application/json' } })
  }
}

export const POST: RequestHandler = async ({ request, locals }) => {
  await ensureOptionalLoaded()
  try {
    const contentType = request.headers.get('content-type') || ''
    let userId: string | undefined = (locals as any)?.session?.user?.id
    let anonIdCreated: string | undefined
    if (!userId && (locals as any)?.anonId) userId = (locals as any).anonId
    if (!userId) {
      if (process.env.STRICT_UPLOADS === 'true') throw error(401, 'Authentication required')
      userId = generateAnonId()
      anonIdCreated = userId
    }

    const warnings: string[] = []

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file) throw error(400, 'No file provided')
      const buffer = Buffer.from(await file.arrayBuffer())

      const jobId = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const job = {
        id: jobId,
        fileBuffer: buffer,
        filename: file.name,
        userId,
        contentType: file.type || 'application/octet-stream',
        metadata: { uploadedAt: new Date().toISOString(), originalName: file.name, size: buffer.length, anon: !!anonIdCreated }
      }

      if (optional.sharedWorkerPool) {
        optional.sharedWorkerPool.push(job)
        const resp: IngestResponse = { success: true, jobId, queued: true, anonId: anonIdCreated }
        if (anonIdCreated) return new Response(JSON.stringify(resp), { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': `anonId=${anonIdCreated}; Path=/; Max-Age=3600; HttpOnly` } })
        return json(resp)
      }

      const body = new FormData()
      body.append('file', new Blob([buffer]), file.name)
      body.append('userId', userId)
      const init: RequestInit = { method: 'POST', body }
      if (anonIdCreated) init.headers = { 'x-anon-id': anonIdCreated }
      return await proxyToGo('/api/ingest', init)
    }

    const data = (await request.json()) as IngestRequest
    if (!data?.minioUrl) throw error(400, 'minioUrl is required')
    const jobId = `minio_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const job = { id: jobId, minioUrl: data.minioUrl, userId: data.userId ?? userId, metadata: { requestedAt: new Date().toISOString(), anon: !!anonIdCreated, ...(data.metadata || {}) } }

    if (optional.sharedWorkerPool) {
      optional.sharedWorkerPool.push(job)
      const resp: IngestResponse = { success: true, jobId, queued: true, anonId: anonIdCreated }
      if (anonIdCreated) return new Response(JSON.stringify(resp), { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': `anonId=${anonIdCreated}; Path=/; Max-Age=3600; HttpOnly` } })
      return json(resp)
    }

    const init: RequestInit = { method: 'POST', body: JSON.stringify(data), headers: { 'content-type': 'application/json' } }
    if (anonIdCreated) init.headers = { ...(init.headers || {}), 'x-anon-id': anonIdCreated }
    return await proxyToGo('/api/ingest', init)
  } catch (err) {
    console.error('Ingest POST error:', err)
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export const GET: RequestHandler = async ({ url }) => {
  await ensureOptionalLoaded()
  try {
    if (optional.db && optional.userDocuments && optional.sharedWorkerPool) {
      const userId = url.searchParams.get('userId') || 'anonymous'
      const limit = parseInt(url.searchParams.get('limit') || '10')
      const recentDocuments = await optional.db.select().from(optional.userDocuments).where({ userId }).limit(limit)
      const workerStats = optional.sharedWorkerPool.getStats()
      const embeddingHealth = optional.checkEmbeddingEndpointHealth ? await optional.checkEmbeddingEndpointHealth() : { healthy: true }
      return json({ success: true, recentDocuments, workerStats, embeddingHealth })
    }
    return await proxyToGo('/api/ingest')
  } catch (err) {
    console.error('Ingest GET error:', err)
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

/* Follow-ups: implement POST /api/ingest/claim, presigned URLs, virus-scan, rate-limits */
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

// Ingestion route with anonymous upload fallback
// - If a session user exists, use that userId
// - Otherwise (unless STRICT_UPLOADS=true) create an anonId and set a short-lived cookie

type IngestRequest = { minioUrl?: string; userId?: string; metadata?: Record<string, unknown> }
type IngestResponse = { success: boolean; jobId?: string; queued?: boolean; error?: string; warnings?: string[]; anonId?: string }

const optional: any = { loaded: false }

async function ensureOptionalLoaded() {
  if (optional.loaded) return
  optional.loaded = true
  try { optional.sharedWorkerPool = (await import('$lib/server/ingest/worker-pool-simple.js')).sharedWorkerPool } catch (_) { optional.sharedWorkerPool = null }
  try { const minio = await import('$lib/server/ingest/minio.js'); optional.detectContentType = minio.detectContentType; optional.validateContentForIngestion = minio.validateContentForIngestion } catch (_) {}
  try { optional.checkEmbeddingEndpointHealth = (await import('$lib/server/ingest/embed.js')).checkEmbeddingEndpointHealth } catch (_) { optional.checkEmbeddingEndpointHealth = undefined }
  try { const idx = await import('$lib/server/index.js'); optional.db = idx.db; optional.userDocuments = idx.userDocuments } catch (_) { optional.db = null }
}

function generateAnonId() {
  // lightweight anon id - collisions extremely unlikely for our use
  return `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

// Single, clean ingestion route with anonymous upload fallback.
// Behavior:
// - Accept multipart uploads (form field `file`) or JSON { minioUrl }
// - Use authenticated user id if available in locals.session.user.id
// - Otherwise create a short-lived anon id (anon_<ts>_<rand>) and set HttpOnly cookie
// - Try to push to local sharedWorkerPool when available, otherwise proxy to Go service

type IngestRequest = { minioUrl?: string; userId?: string; metadata?: Record<string, unknown> }
type IngestResponse = { success: boolean; jobId?: string; queued?: boolean; error?: string; warnings?: string[]; anonId?: string }

const optional: any = { loaded: false }

async function ensureOptionalLoaded() {
  if (optional.loaded) return
  optional.loaded = true
  try { optional.sharedWorkerPool = (await import('$lib/server/ingest/worker-pool-simple.js')).sharedWorkerPool } catch (_) { optional.sharedWorkerPool = null }
  try { const minio = await import('$lib/server/ingest/minio.js'); optional.detectContentType = minio.detectContentType; optional.validateContentForIngestion = minio.validateContentForIngestion } catch (_) {}
  try { optional.checkEmbeddingEndpointHealth = (await import('$lib/server/ingest/embed.js')).checkEmbeddingEndpointHealth } catch (_) { optional.checkEmbeddingEndpointHealth = undefined }
  try { const idx = await import('$lib/server/index.js'); optional.db = idx.db; optional.userDocuments = idx.userDocuments } catch (_) { optional.db = null }
}

function generateAnonId() {
  return `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

async function proxyToGo(path: string, init?: RequestInit) {
  const url = `http://localhost:8080${path}`
  try {
    const res = await fetch(url, init)
    const body = await res.text()
    const headers: Record<string, string> = {}
    res.headers.forEach((v, k) => (headers[k] = v))
    return new Response(body, { status: res.status, headers })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), { status: 502, headers: { 'content-type': 'application/json' } })
  }
}

export const POST: RequestHandler = async ({ request, locals }) => {
  await ensureOptionalLoaded()
  try {
    const contentType = request.headers.get('content-type') || ''
    const warnings: string[] = []

    // Resolve user id
    let userId: string | undefined = (locals as any)?.session?.user?.id
    let anonIdCreated: string | undefined
    if (!userId && (locals as any)?.anonId) userId = (locals as any).anonId
    if (!userId) {
      if (process.env.STRICT_UPLOADS === 'true') throw error(401, 'Authentication required')
      userId = generateAnonId()
      anonIdCreated = userId
    }

    // Optional embedding health check
    if (optional.checkEmbeddingEndpointHealth) {
      try {
        const h = await optional.checkEmbeddingEndpointHealth()
        if (!h?.healthy) warnings.push(`Embedding endpoint unhealthy: ${h?.error || 'unknown'}`)
      } catch (e) {
        warnings.push(`Embedding health check failed: ${String(e)}`)
      }
    }

    // Multipart upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file) throw error(400, 'No file provided')
      const buffer = Buffer.from(await file.arrayBuffer())

      const detected = optional.detectContentType ? optional.detectContentType(buffer, file.name) : 'application/octet-stream'
      const validation = optional.validateContentForIngestion ? optional.validateContentForIngestion(detected, buffer.length) : { valid: true }
      if (!validation.valid) throw error(400, `Content validation failed: ${validation.reason || 'invalid'}`)

      const jobId = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const job = {
        id: jobId,
        fileBuffer: buffer,
        filename: file.name,
        userId,
        contentType: detected,
        metadata: { uploadedAt: new Date().toISOString(), originalName: file.name, size: buffer.length, anon: !!anonIdCreated }
      }

      if (optional.sharedWorkerPool) {
        optional.sharedWorkerPool.push(job)
        const resp: IngestResponse = { success: true, jobId, queued: true, warnings: warnings.length ? warnings : undefined, anonId: anonIdCreated }
        if (anonIdCreated) return new Response(JSON.stringify(resp), { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': `anonId=${anonIdCreated}; Path=/; Max-Age=3600; HttpOnly` } })
        return json(resp)
      }

      // Proxy multipart to Go
      const body = new FormData()
      body.append('file', new Blob([buffer]), file.name)
      body.append('userId', userId)
      const init: RequestInit = { method: 'POST', body }
      if (anonIdCreated) init.headers = { 'x-anon-id': anonIdCreated }
      return await proxyToGo('/api/ingest', init)
    }

    // JSON path (minioUrl)
    const data = (await request.json()) as IngestRequest
    if (!data?.minioUrl) throw error(400, 'minioUrl is required')
    const jobId = `minio_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const job = { id: jobId, minioUrl: data.minioUrl, userId: data.userId ?? userId, metadata: { requestedAt: new Date().toISOString(), anon: !!anonIdCreated, ...(data.metadata || {}) } }

    if (optional.sharedWorkerPool) {
      optional.sharedWorkerPool.push(job)
      const resp: IngestResponse = { success: true, jobId, queued: true, anonId: anonIdCreated }
      if (anonIdCreated) return new Response(JSON.stringify(resp), { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': `anonId=${anonIdCreated}; Path=/; Max-Age=3600; HttpOnly` } })
      return json(resp)
    }

    const init: RequestInit = { method: 'POST', body: JSON.stringify(data), headers: { 'content-type': 'application/json' } }
    if (anonIdCreated) init.headers = { ...(init.headers || {}), 'x-anon-id': anonIdCreated }
    return await proxyToGo('/api/ingest', init)
  } catch (err) {
    console.error('Ingest POST error:', err)
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export const GET: RequestHandler = async ({ url }) => {
  await ensureOptionalLoaded()
  try {
    if (optional.db && optional.userDocuments && optional.sharedWorkerPool) {
      const userId = url.searchParams.get('userId') || 'anonymous'
      const limit = parseInt(url.searchParams.get('limit') || '10')
      const recentDocuments = await optional.db.select().from(optional.userDocuments).where({ userId }).limit(limit)
      const workerStats = optional.sharedWorkerPool.getStats()
      const embeddingHealth = optional.checkEmbeddingEndpointHealth ? await optional.checkEmbeddingEndpointHealth() : { healthy: true }
      return json({ success: true, recentDocuments, workerStats, embeddingHealth })
    }

    return await proxyToGo('/api/ingest')
  } catch (err) {
    console.error('Ingest GET error:', err)
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

/*
Notes / follow-ups:
- This route sets a short-lived HttpOnly cookie `anonId` when creating a new anon id. In production, set Secure and SameSite appropriately when using HTTPS.
- Follow-ups to implement:
  - POST /api/ingest/claim to reassign jobs from anonId to authenticated user after login
  - Presigned MinIO URL generation for authenticated users (server+client)
- Security: add rate-limiting, CAPTCHA, and virus scanning for anon uploads in production.
*/

import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

// Clean, guarded ingestion route (single implementation).
type IngestRequest = { minioUrl?: string; userId?: string; metadata?: Record<string, unknown> }
type IngestResponse = { success: boolean; jobId?: string; queued?: boolean; error?: string; warnings?: string[] }

const optional: any = { loaded: false }

async function ensureOptionalLoaded() {
  if (optional.loaded) return
  optional.loaded = true
  try { optional.sharedWorkerPool = (await import('$lib/server/ingest/worker-pool-simple.js')).sharedWorkerPool } catch (_) { optional.sharedWorkerPool = null }
  try {
    const minio = await import('$lib/server/ingest/minio.js')
    optional.detectContentType = minio.detectContentType
    optional.validateContentForIngestion = minio.validateContentForIngestion
  } catch (_) {}
  try { optional.checkEmbeddingEndpointHealth = (await import('$lib/server/ingest/embed.js')).checkEmbeddingEndpointHealth } catch (_) { optional.checkEmbeddingEndpointHealth = undefined }
  try { const idx = await import('$lib/server/index.js'); optional.db = idx.db; optional.userDocuments = idx.userDocuments } catch (_) { optional.db = null }
}

async function proxyToGo(path: string, init?: RequestInit) {
  const url = `http://localhost:8080${path}`
  try {
    const res = await fetch(url, init)
    const body = await res.text()
    const headers: Record<string, string> = {}
    res.headers.forEach((v, k) => (headers[k] = v))
    return new Response(body, { status: res.status, headers })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), { status: 502, headers: { 'content-type': 'application/json' } })
  }
}

export const POST: RequestHandler = async ({ request }) => {
  await ensureOptionalLoaded()
  try {
    const contentType = request.headers.get('content-type') || ''
    const warnings: string[] = []

    if (optional.checkEmbeddingEndpointHealth) {
      try {
        const h = await optional.checkEmbeddingEndpointHealth()
        if (!h?.healthy) warnings.push(`Embedding endpoint unhealthy: ${h?.error || 'unknown'}`)
      } catch (e) {
        warnings.push(`Embedding health check failed: ${String(e)}`)
      }
    }

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const userId = (formData.get('userId') as string) ?? 'anonymous'
      if (!file) throw error(400, 'No file provided')
      const buffer = Buffer.from(await file.arrayBuffer())

      const detected = optional.detectContentType ? optional.detectContentType(buffer, file.name) : 'application/octet-stream'
      const validation = optional.validateContentForIngestion ? optional.validateContentForIngestion(detected, buffer.length) : { valid: true }
      if (!validation.valid) throw error(400, `Content validation failed: ${validation.reason || 'invalid'}`)

      const jobId = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const job = {
        id: jobId,
        fileBuffer: buffer,
        filename: file.name,
        userId,
        contentType: detected,
        metadata: { uploadedAt: new Date().toISOString(), originalName: file.name, size: buffer.length }
      }

      if (optional.sharedWorkerPool) {
        optional.sharedWorkerPool.push(job)
        const resp: IngestResponse = { success: true, jobId, queued: true, warnings: warnings.length ? warnings : undefined }
        return json(resp)
      }

      const body = new FormData()
      body.append('file', new Blob([buffer]), file.name)
      body.append('userId', userId)
      return await proxyToGo('/api/ingest', { method: 'POST', body })
    } else {
      const data = (await request.json()) as IngestRequest
      if (!data?.minioUrl) throw error(400, 'minioUrl is required')
      const jobId = `minio_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const job = { id: jobId, minioUrl: data.minioUrl, userId: data.userId ?? 'anonymous', metadata: { requestedAt: new Date().toISOString(), ...(data.metadata || {}) } }

      if (optional.sharedWorkerPool) {
        optional.sharedWorkerPool.push(job)
        return json({ success: true, jobId, queued: true })
      }

      return await proxyToGo('/api/ingest', { method: 'POST', body: JSON.stringify(data), headers: { 'content-type': 'application/json' } })
    }
  } catch (err) {
    console.error('Ingest POST error:', err)
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export const GET: RequestHandler = async ({ url }) => {
  await ensureOptionalLoaded()
  try {
    if (optional.db && optional.userDocuments && optional.sharedWorkerPool) {
      const userId = url.searchParams.get('userId') || 'anonymous'
      const limit = parseInt(url.searchParams.get('limit') || '10')
      const recentDocuments = await optional.db.select().from(optional.userDocuments).where({ userId }).limit(limit)
      const workerStats = optional.sharedWorkerPool.getStats()
      const embeddingHealth = optional.checkEmbeddingEndpointHealth ? await optional.checkEmbeddingEndpointHealth() : { healthy: true }
      return json({ success: true, recentDocuments, workerStats, embeddingHealth })
    }

    return await proxyToGo('/api/ingest')
  } catch (err) {
    console.error('Ingest GET error:', err)
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

    // Check embedding endpoint health
    const healthCheck = await checkEmbeddingEndpointHealth()
    const warnings: string[] = []
    if (!healthCheck.healthy) {
      warnings.push(`Embedding endpoint unhealthy: ${healthCheck.error}`)
    }
    // Parse request
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData()
      const file = formData.get('file') as File
      const userId = (formData.get('userId') as string) ?? 'anonymous'
      if (!file) {
        throw error(400, 'No file provided in form data')
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      const detectedContentType = detectContentType(buffer, file.name)
      // Validate content
      const validation = validateContentForIngestion(detectedContentType, buffer.length)
      if (!validation.valid) {
        throw error(400, `Content validation failed: ${validation.reason}`)
      }
      // Create job and queue it
      const jobId = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const job = {
        id: jobId,
        fileBuffer: buffer,
        filename: file.name,
        userId,
        contentType: detectedContentTyp,
        metadata: {
          uploadedAt: new Date().toISOString(),
          originalName: file.name,
          size: buffer.length
        }
      }
      sharedWorkerPool.push(job)
      return json({
        success: true,
        jobId,
        queued: true,
        warnings: warnings.length > 0 ? warnings : undefined
      })
    } else {
      // Handle JSON request with MinIO URL
      const requestData: IngestRequest = await request.json()
      if (!requestData.minioUrl) {
        throw error(400, 'Either file upload or minioUrl required')
      }
      const userId = requestData.userId ?? 'anonymous'
      const jobId = `minio_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const job = {
        id: jobId,
        minioUrl: requestData.minioUrl,
        userId,
        metadata: {
          requestedAt: new Date().toISOString(),
          ...requestData.metadata
        }
      }
      sharedWorkerPool.push(job)
      return json({
        success: true,
        jobId,
        queued: true,
        warnings: warnings.length > 0 ? warnings : undefined
      })
    }
  } catch (err) {
    console.error('Ingestion error:', err);
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
};

// GET /api/ingest - health/stats proxy
export const GET: RequestHandler = async ({ url }) => {
  try {
    const userId = url.searchParams.get('userId') || 'anonymous'
    const limit = parseInt(url.searchParams.get('limit') || '10')
    // Get recent documents for this user
    const recentDocuments = await db
      .select({
        id: userDocuments.id,
        source: userDocuments.source,
        content: userDocuments.content,
        contentType: userDocuments.contentType,
        createdAt: userDocuments.createdAt,
        metadata: userDocuments.metadata
      })
      .from(userDocuments)
      .where(eq(userDocuments.userId, userId)
      .orderBy(desc(userDocuments.createdAt)
      .limit(limit)
    // Get worker pool stats
    const workerStats = sharedWorkerPool.getStats()
    return json({
      success: true,
      recentDocuments,
      workerStats,
      embeddingHealth: await checkEmbeddingEndpointHealth()
    })
  } catch (err) {
    return json()
      {
        success: false,
        error,: err instanceof Error ? err.message: String(err)
      },
      { status: 500 }
    )
  }
};
