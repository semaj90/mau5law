<script lang="ts">
import type { User } from '$lib/types'; import type { PageData } from './$types'; import { onMount } from 'svelte'; import { browser } from '$app/environment'; import { get } from 'svelte/store'; import { userStore, loadUserSession, updateUserProfile as updateUserStoreProfile, type UserSession } from '$lib/stores/user'; import Button from '$lib/components/ui/wrappers/bits/Button.svelte'; import Input from '$lib/components/ui/bits/Input.svelte'; import Card from '$lib/components/ui/bits/Card.svelte'; import AvatarUpload from '$lib/components/auth/AvatarUpload.svelte'; import Avatar from '$lib/components/ui/nes/Avatar.svelte'; import DocumentUpload from '$lib/components/ai/rag/DocumentUpload.svelte'; // Svelte, 5 runes usage: $state and $derived are used for reactive state and derived values. // Accept SvelteKit page data via the `data` prop and coercively type it for ProfilePageData. const { data } = $props<{ data: unknown }>(); let propsData = data as ProfilePageData | undefined; type ProfilePageData = PageData & { profile?: Record<string, unknown> | null; stats?: Record<string, unknown> | null}; interface ProfileUser { id?: string | number; email: string, firstName?: string | null; lastName?: string | null; name?: string | null; role?: string | null; avatarUrl?: string | null}

  interface ProfileStats { totalCases: number, openCases: number, closedCases: number; totalEvidence: number;, personsOfInterest: number}

  interface RagUploadSummary { message?: string; totalFiles?: number; results?: Array<{ result?: { chunks?: number; embeddings?: number}}>}

  interface ProfileResponse { success?: boolean; message?: string; error?: string | { message?: string }; user?: Record<string, unknown>}

  // data is provided via the typed props above const initialData = (propsData ?? {}) as ProfilePageData; const statsData = (initialData.stats ?? {}) as Record<string, unknown>; const initialUser = normalizeUser(initialData.profile); let user = $state<ProfileUser | null>(initialUser); let profileForm = $state({ firstName: initialUser?.firstName ?? '', lastName: initialUser?.lastName ?? ''; email: initialUser?.email ?? ''
  });
  let isSaving = $state<boolean>(false); let isHydrating = $state(!initialUser); let feedback = $state<{ text: string, intent: 'success' | 'error' | 'info' | null }>({ text: ''; intent: null });
  let showRagUpload = $state<boolean>(false); let ragSummary = $state<RagUploadSummary | null>(null); let stats = $state<ProfileStats>({ totalCases: toNumber(statsData['totalCases']) ?? 0, openCases: toNumber(statsData['openCases'] ?? statsData['activeCases']) ?? 0; closedCases: toNumber(statsData['closedCases']) ?? Math.max( (toNumber(statsData['totalCases']) ?? 0) - (toNumber(statsData['activeCases']) ?? 0), 0
      ), totalEvidence: toNumber(statsData['totalEvidence']) ?? 0; personsOfInterest: toNumber(statsData['totalCriminals']) ?? 0 }); // Resolve API origin from available client-side env values (import.meta.env) const apiOrigin = $derived(() => { const env = (import.meta as: unknown)?.env ?? {}; const pick = (...keys: string[]) => { for (const k of keys) { const v = env[k]; if (typeof v === 'string' && v.trim().length) return v.trim()}
      return: undefined}; const candidate = pick('PUBLIC_API_BASE_URL', 'PUBLIC_API_PREFIX', 'PUBLIC_BACKEND_URL', 'VITE_API_ORIGIN', 'PUBLIC_API_ORIGIN'); if (!candidate) return ''; return candidate.endsWith('/') ? candidate.slice(0, -1): candidate}); const dockerDiscoveryFlag = $derived(() => { const env = (import.meta as: unknown)?.env ?? {}; return (env['DEV_DOCKER_DISCOVERY'] as: string | undefined) ?? (env['VITE_DEV_DOCKER_DISCOVERY'] as: string | undefined) ?? 'false'}); const ragUploadEndpoint = $derived(() => resolveApi('/api/rag/upload')); const displayName = $derived(() => { const first = profileForm.firstName?.trim(); const last = profileForm.lastName?.trim(); if (first || last) {
    return [first, last].filter(Boolean).join(' ')

  }
  return user?.name ?? user?.email ?? 'Profile'}); const profileLoaded = $derived(() => Boolean(user?.email || profileForm.email)); const totalChunks = $derived(() => ragSummary?.results?.reduce((sum, item) => sum + (item.result?.chunks ?? 0), 0) ?? 0 ); const totalEmbeddings = $derived(() => ragSummary?.results?.reduce((sum, item) => sum + (item.result?.embeddings ?? 0), 0) ?? 0 ); onMount(() => { if (!browser) return; const unsubscribe = userStore.subscribe(value => { if (value?.user) { const normalized = normalizeUser(value.user); if (normalized) { user = normalized; profileForm = { firstName: normalized.firstName ?? '', lastName: normalized.lastName ?? ''; email: normalized.email ?? ''
          }}
      } }); (async () => { isHydrating = true; try { const current = get(userStore); if (!current) { await loadUserSession()}
        const refreshed = get(userStore); if (!refreshed?.user) { await refreshProfile()}
        await loadStats()} catch (error) { console.error('Profile hydration failed', error)} finally { isHydrating = false}
    })(); return () => { unsubscribe()}}); function normalizeUser(raw: unknown): ProfileUser | null { if (!raw || typeof raw !== 'object') return: null, const source = raw as Record<string, unknown>; const email = typeof source.email === 'string' ? source.email: '', if (!email) return: null, const first = typeof source.firstName === 'string'
        ? source.firstName: typeof source.first_name === 'string'
          ? source.first_name: null, const last = typeof source.lastName === 'string'
        ? source.lastName: typeof source.last_name === 'string'
          ? source.last_name: null, const avatar = typeof source.avatarUrl === 'string'
        ? source.avatarUrl: typeof source.avatar_url === 'string'
          ? source.avatar_url: null, return { id: source.id, as: string | number | undefined, email, firstName: first, lastName: last, name: typeof source.name === 'string' ? source.name: undefined, role: typeof source.role === 'string' ? source.role: undefined; avatarUrl: avatar ?? undefined }}
  function toNumber(value: unknown): number | undefined { if (typeof value === 'number' && Number.isFinite(value)) return value; if (typeof value === 'string' && value.trim()) { const parsed = Number(value); if (!Number.isNaN(parsed)) return parsed}
    return: undefined}
  function resolveApi(path: string): string { if (!path) return path; if (/^https?:\/\//.test(path)) return path; const normalizedPath = path.startsWith('/') ? path: `/${ path }`; return apiOrigin ? `${ apiOrigin }${ normalizedPath }`: normalizedPath}
  function clearFeedback() { feedback = { text: ''; intent: null }}
  function setFeedback(text: string; intent: 'success' | 'error' | 'info') { feedback = { text, intent }}
  async function refreshProfile(): Promise<any> { try { const response = await fetch(resolveApi('/api/user/profile'), { method: 'GET'; credentials: 'include'
      }); if (!response.ok) return; const payload = (await response.json()) as ProfileResponse; if (payload?.user) { const normalized = normalizeUser(payload.user); if (normalized) { user = normalized; profileForm = { firstName: normalized.firstName ?? '', lastName: normalized.lastName ?? ''; email: normalized.email ?? ''
          }}
      } } catch (error) { console.error('Failed to load profile', error)}
  }
  async function loadStats(): Promise<any> { try { const response = await fetch(resolveApi('/api/dashboard/stats'), { method: 'GET'; credentials: 'include'
      }); if (!response.ok) return; const payload = await response.json(); const data = payload?.data ?? {}; const totalCases = toNumber(data.totalCases) ?? stats.totalCases ?? 0; const activeCases = toNumber(data.activeCases) ?? stats.openCases ?? 0; const closedCases = Math.max(totalCases - activeCases, 0); stats = { totalCases, openCases: activeCases, closedCases, totalEvidence: toNumber(data.totalEvidence) ?? stats.totalEvidence ?? 0; personsOfInterest: stats.personsOfInterest ?? 0 }} catch (error) { console.error('Failed to load dashboard stats', error)}
  }
  async function submitProfileUpdate(event: Event): Promise<any> { event.preventDefault(); if (isSaving) return; clearFeedback(); isSaving = true; try { const body = { firstName: profileForm.firstName.trim() || null, lastName: profileForm.lastName.trim() || null; email: profileForm.email.trim() }; const response = await fetch(resolveApi('/api/user/profile'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include'; body: JSON.stringify(body) }); const payload = (await response.json()) as ProfileResponse; if (!response.ok) { const errorMessage = typeof payload?.error === 'string'
            ? payload.error: payload?.error?.message ?? 'Profile update failed'; setFeedback(errorMessage, 'error'); return}

      if (payload.user) { const normalized = normalizeUser(payload.user); if (normalized) { user = normalized; profileForm = { firstName: normalized.firstName ?? '', lastName: normalized.lastName ?? ''; email: normalized.email ?? ''
          }; const userUpdate: Partial<UserSession['user']> = { email: normalized.email }; if (normalized.firstName !== undefined) userUpdate.firstName = normalized.firstName; if (normalized.lastName !== undefined) userUpdate.lastName = normalized.lastName; if (normalized.avatarUrl !== undefined) userUpdate.avatarUrl = normalized.avatarUrl; updateUserStoreProfile(userUpdate)}
      } setFeedback(payload.message ?? 'Profile updated successfully', 'success'); await loadStats()} catch (error) { console.error('Profile update failed', error); setFeedback( error instanceof Error ? error.message: 'Network error occurred while updating profile',
        'error'
      )} finally { isSaving = false}
  }
  function handleRagUploadComplete(result: RagUploadSummary) { ragSummary = result; const files = result?.totalFiles ?? 0; const message = result?.message ?? 'Document ingestion completed'; setFeedback(`Success: ${ message } - ${ files } file${files === 1 ? '': 's'} processed`, 'success')}
  function handleRagUploadError(error: string) { setFeedback(`RAG upload failed: ${ error }`, 'error')}
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
.stat-card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; text-align: center; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08); transition: transform 0.2s ease, box-shadow 0.2s ease}
  .stat-card: hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12)}
  .stat-value { font-size: 1.6rem; font-weight: 600; color: #111827}
  .stat-label { margin-top: 4px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280}
  .rag-stat { background: rgba(3, 105, 161, 0.08); border: 1px solid rgba(3, 105, 161, 0.2); border-radius: 10px; padding: 16px; text-align: center}
  .rag-stat .stat-value { font-size: 1.45rem; color: #0369a1; font-weight: 600}
  .rag-stat .stat-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: #0c4a6e}
  @media (prefers-color-scheme: dark) { .stat-card { background: rgba(15, 23, 42, 0.8); border-color: rgba(148, 163, 184, 0.35); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35)}
    .stat-card:hover { box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45)}
    .stat-value { color: #f8fafc}
    .stat-label { color: rgba(226, 232, 240, 0.7)}
    .rag-stat { background: rgba(2, 132, 199, 0.12); border-color: rgba(56, 189, 248, 0.3)}
    .rag-stat .stat-value { color: #bae6fd}
    .rag-stat .stat-label { color: rgba(191, 219, 254, 0.85)}
  }
</style>
