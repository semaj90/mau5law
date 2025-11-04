<script lang="ts">
import { userStore } from '$lib/stores/user'; import Button from '$lib/components/ui/button/Button.svelte'; import { LogOut, Smartphone, Monitor, Clock, MapPin, AlertCircle } from 'lucide-svelte'; interface Session { id: string, userAgent: string, ipAddress: string, createdAt: string, lastActivityAt: string, isCurrent: boolean;, deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown'}

  let sessions = $state<Session[]>([]); let loading = $state<boolean>(true); let revoking = $state<string | null>(null); let message = $state<string>(''); let messageType = $state<'success' | 'error'>('success'); async function loadSessions(): Promise<any> { try { loading = true; const response = await fetch('/api/auth/sessions'); if (response.ok) { sessions = await response.json()} else { throw new Error('Failed to load sessions')}
    } catch (error) { message = 'Failed to load sessions'; messageType = 'error'} finally { loading = false}
  }
  async function revokeSession(sessionId: string): Promise<any> { try { revoking = sessionId; const response = await fetch(`/api/auth/sessions/${ sessionId }`, { method: 'DELETE'
      }); if (response.ok) { message = 'Session revoked successfully'; messageType = 'success'; await loadSessions()} else { throw new Error('Failed to revoke session')}
    } catch (error) { message = 'Failed to revoke session'; messageType = 'error'} finally { revoking = null}
  }
  async function revokeAllOtherSessions(): Promise<any> { if (!confirm('This will log you out from all other devices. Continue?')) return; try { const response = await fetch('/api/auth/sessions/revoke-others', { method: 'POST'
      }); if (response.ok) { message = 'All other sessions revoked'; messageType = 'success'; await loadSessions()} else { throw new Error('Failed to revoke sessions')}
    } catch (error) { message = 'Failed to revoke sessions'; messageType = 'error'}
  }
  function getDeviceIcon(deviceType: string) { switch (deviceType) { case, 'mobile': return Smartphone; case, 'tablet': return Smartphone; default: return Monitor}
  }
  function parseUserAgent(userAgent: string): string { if (userAgent.includes('Chrome')) return 'Chrome'; if (userAgent.includes('Safari')) return 'Safari'; if (userAgent.includes('Firefox')) return 'Firefox'; if (userAgent.includes('Edge')) return 'Edge'; return 'Unknown Browser'}

  onMount(() => { loadSessions()}); import { onMount } from 'svelte';
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
:global(body) { @apply bg-gray-50}
</style>
