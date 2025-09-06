<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import type { PageData, ActionData } from './$types';
  import { goto } from '$app/navigation';
  
  let { data }: { data: PageData } = $props();
  
  let showProfileModal = $state(false);
  let showPasswordModal = $state(false);
  let showSessionModal = $state(false);
  let selectedSession = $state<any>(null);
  let formLoading = $state(false);
  
  // Profile form
  let profileForm = $state({
    firstName: data.user.firstName || '',
    lastName: data.user.lastName || ''
  });
  
  // Password form
  let passwordForm = $state({
    newPassword: '',
    confirmPassword: ''
  });
  
  function formatDate(dateStr: string | Date) {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  function formatTokens(tokens: number | null) {
    if (!tokens) return '0';
    return tokens.toLocaleString();
  }
  
  function truncateText(text: string, maxLength: number = 100) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
  
  function getPriorityColor(priority: string) {
    switch (priority) {
      case 'critical': return 'text-red-400 border-red-500';
      case 'high': return 'text-orange-400 border-orange-500';
      case 'medium': return 'text-yellow-400 border-yellow-500';
      case 'low': return 'text-green-400 border-green-500';
      default: return 'text-gray-400 border-gray-500';
    }
  }
  
  function getStatusColor(status: string) {
    switch (status) {
      case 'open': return 'text-blue-400 border-blue-500';
      case 'in_progress': return 'text-yellow-400 border-yellow-500';
      case 'closed': return 'text-green-400 border-green-500';
      default: return 'text-gray-400 border-gray-500';
    }
  }
  
  function openSessionModal(session: any) {
    selectedSession = session;
    showSessionModal = true;
  }
  
  function closeSessionModal() {
    selectedSession = null;
    showSessionModal = false;
  }
  
  function validatePasswordForm() {
    if (passwordForm.newPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return false;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match');
      return false;
    }
    
    return true;
  }
</script>

<svelte:head>
  <title>User Details - {data.user.firstName} {data.user.lastName} - YoRHa Legal AI</title>
</svelte:head>

<div class="min-h-screen bg-black text-amber-300 font-mono">
  <!-- YoRHa Header -->
  <header class="border-b-2 border-amber-300 bg-gray-900 p-4">
    <div class="container mx-auto">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-4">
          <button 
            onclick={() => goto('/admin/users')}
            class="px-4 py-2 bg-gray-700 text-amber-300 border-2 border-amber-300 hover:bg-gray-600 transition-colors"
          >
            [← BACK TO USERS]
          </button>
          <div>
            <h1 class="text-2xl font-bold tracking-wider">USER PROFILE</h1>
            <p class="text-sm text-amber-500">YoRHa Legal AI Platform - User Details</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-green-500"></div>
          <span class="text-sm">ACTIVE</span>
        </div>
      </div>
      
      <!-- User Header Info -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
        <div class="bg-gray-800 p-3 rounded border border-amber-300">
          <div class="font-semibold mb-1">USER ID</div>
          <div class="font-mono text-amber-400">#{data.user.id.toString().padStart(6, '0')}</div>
        </div>
        <div class="bg-gray-800 p-3 rounded border border-amber-300">
          <div class="font-semibold mb-1">EMAIL</div>
          <div class="text-amber-100">{data.user.email}</div>
        </div>
        <div class="bg-gray-800 p-3 rounded border border-amber-300">
          <div class="font-semibold mb-1">FULL NAME</div>
          <div class="text-amber-100">
            {data.user.firstName} {data.user.lastName}
          </div>
        </div>
        <div class="bg-gray-800 p-3 rounded border border-amber-300">
          <div class="font-semibold mb-1">MEMBER SINCE</div>
          <div class="text-amber-100">{formatDate(data.user.created_at)}</div>
        </div>
      </div>
    </div>
  </header>

  <main class="container mx-auto p-6 space-y-6">
    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="bg-gray-900 border-2 border-amber-300 p-6 text-center">
        <div class="text-3xl font-bold text-amber-300 mb-2">{data.stats.casesCount}</div>
        <div class="text-sm text-gray-300 font-semibold tracking-wider">TOTAL CASES</div>
      </div>
      
      <div class="bg-gray-900 border-2 border-amber-300 p-6 text-center">
        <div class="text-3xl font-bold text-amber-300 mb-2">{data.stats.evidenceCount}</div>
        <div class="text-sm text-gray-300 font-semibold tracking-wider">EVIDENCE ITEMS</div>
      </div>
      
      <div class="bg-gray-900 border-2 border-amber-300 p-6 text-center">
        <div class="text-3xl font-bold text-amber-300 mb-2">{data.stats.aiHistoryCount}</div>
        <div class="text-sm text-gray-300 font-semibold tracking-wider">AI INTERACTIONS</div>
      </div>
      
      <div class="bg-gray-900 border-2 border-amber-300 p-6 text-center">
        <div class="text-3xl font-bold text-amber-300 mb-2">{data.stats.sessionsCount}</div>
        <div class="text-sm text-gray-300 font-semibold tracking-wider">ACTIVE SESSIONS</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- User Management Panel -->
      <div class="bg-gray-900 border-2 border-amber-300">
        <div class="border-b border-amber-300 p-4">
          <h2 class="font-bold text-lg">USER MANAGEMENT</h2>
        </div>
        <div class="p-4 space-y-4">
          <button
            onclick={() => showProfileModal = true}
            class="w-full px-4 py-2 bg-gray-700 text-amber-300 border-2 border-amber-300 hover:bg-gray-600 transition-colors text-left"
          >
            [EDIT PROFILE] Update name and details
          </button>
          
          <button
            onclick={() => showPasswordModal = true}
            class="w-full px-4 py-2 bg-orange-900 text-amber-300 border-2 border-orange-500 hover:bg-orange-800 transition-colors text-left"
          >
            [RESET PASSWORD] Force password change
          </button>
          
          <div class="grid grid-cols-2 gap-2">
            <button
              onclick={() => goto(`/admin/users/${data.user.id}/cases`)}
              class="px-4 py-2 bg-blue-900 text-amber-300 border-2 border-blue-500 hover:bg-blue-800 transition-colors text-center"
            >
              [VIEW CASES]
            </button>
            <button
              onclick={() => goto(`/admin/users/${data.user.id}/ai-history`)}
              class="px-4 py-2 bg-purple-900 text-amber-300 border-2 border-purple-500 hover:bg-purple-800 transition-colors text-center"
            >
              [AI HISTORY]
            </button>
          </div>
        </div>
      </div>

      <!-- Recent Cases -->
      <div class="bg-gray-900 border-2 border-amber-300">
        <div class="border-b border-amber-300 p-4">
          <h2 class="font-bold text-lg">RECENT CASES</h2>
        </div>
        <div class="p-4 space-y-3 max-h-64 overflow-y-auto">
          {#each data.recentCases as case_}
            <div class="border border-gray-700 p-3 hover:bg-gray-800 transition-colors">
              <div class="flex items-center justify-between mb-2">
                <div class="font-semibold text-sm truncate">{case_.title}</div>
                <div class="flex gap-2">
                  <span class="px-2 py-1 text-xs border rounded {getStatusColor(case_.status)}">
                    {case_.status.toUpperCase()}
                  </span>
                  <span class="px-2 py-1 text-xs border rounded {getPriorityColor(case_.priority)}">
                    {case_.priority.toUpperCase()}
                  </span>
                </div>
              </div>
              <div class="text-xs text-gray-400">
                Updated: {formatDate(case_.updated_at)}
              </div>
            </div>
          {:else}
            <div class="text-center text-gray-500 py-4">No cases found</div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Recent AI Interactions -->
    <div class="bg-gray-900 border-2 border-amber-300">
      <div class="border-b border-amber-300 p-4">
        <h2 class="font-bold text-lg">RECENT AI INTERACTIONS</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-amber-300 text-black">
            <tr>
              <th class="px-4 py-2 text-left font-bold">TIMESTAMP</th>
              <th class="px-4 py-2 text-left font-bold">AGENT</th>
              <th class="px-4 py-2 text-left font-bold">TYPE</th>
              <th class="px-4 py-2 text-left font-bold">PROMPT</th>
              <th class="px-4 py-2 text-left font-bold">MODEL</th>
              <th class="px-4 py-2 text-right font-bold">TOKENS</th>
            </tr>
          </thead>
          <tbody>
            {#each data.recentAIInteractions as interaction}
              <tr class="border-b border-gray-700 hover:bg-gray-800">
                <td class="px-4 py-3 text-xs text-gray-300">
                  {formatDate(interaction.created_at)}
                </td>
                <td class="px-4 py-3">
                  <span class="px-2 py-1 bg-blue-900 text-blue-300 text-xs border border-blue-500 rounded">
                    {interaction.agent_type}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class="px-2 py-1 bg-green-900 text-green-300 text-xs border border-green-500 rounded">
                    {interaction.interaction_type}
                  </span>
                </td>
                <td class="px-4 py-3 max-w-md">
                  <div class="text-xs text-gray-300">
                    {truncateText(interaction.prompt, 80)}
                  </div>
                </td>
                <td class="px-4 py-3 text-xs text-gray-400">
                  {interaction.model_used || 'N/A'}
                </td>
                <td class="px-4 py-3 text-right text-xs font-mono text-amber-400">
                  {formatTokens(interaction.tokens_used)}
                </td>
              </tr>
            {:else}
              <tr>
                <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                  No AI interactions found
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Active Sessions -->
    <div class="bg-gray-900 border-2 border-amber-300">
      <div class="border-b border-amber-300 p-4">
        <h2 class="font-bold text-lg">ACTIVE SESSIONS</h2>
      </div>
      <div class="p-4">
        {#each data.activeSessions as session}
          <div class="flex items-center justify-between p-3 border border-gray-700 mb-2">
            <div>
              <div class="text-sm font-mono text-amber-400">Session: {session.id.substring(0, 8)}...</div>
              <div class="text-xs text-gray-400">
                Created: {formatDate(session.created_at)} | 
                Expires: {formatDate(session.expires_at)}
              </div>
            </div>
            <button
              onclick={() => openSessionModal(session)}
              class="px-3 py-1 bg-red-800 text-amber-300 text-xs border border-red-500 hover:bg-red-700 transition-colors"
            >
              [REVOKE]
            </button>
          </div>
        {:else}
          <div class="text-center text-gray-500 py-4">No active sessions</div>
        {/each}
      </div>
    </div>
  </main>
</div>

<!-- Profile Edit Modal -->
{#if showProfileModal}
  <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-gray-900 border-2 border-amber-300 p-6 max-w-md w-full mx-4">
      <div class="border-b border-amber-300 pb-4 mb-4">
        <h2 class="text-xl font-bold">EDIT PROFILE</h2>
      </div>
      
      <form method="POST" action="?/updateProfile" use:enhance={() => {
        formLoading = true;
        return ({ result }) => {
          formLoading = false;
          if (result.type === 'success' || result.status === 200) {
            showProfileModal = false;
          }
        };
      }}>
        <div class="space-y-4">
          <div>
            <label for="firstName" class="block text-sm font-bold mb-2">FIRST NAME</label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              bind:value={profileForm.firstName}
              required
              class="w-full px-3 py-2 bg-black border-2 border-amber-300 text-amber-300 focus:outline-none focus:border-amber-400"
            />
          </div>
          
          <div>
            <label for="lastName" class="block text-sm font-bold mb-2">LAST NAME</label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              bind:value={profileForm.lastName}
              required
              class="w-full px-3 py-2 bg-black border-2 border-amber-300 text-amber-300 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
        
        <div class="flex justify-end gap-3 mt-6">
          <button 
            type="button" 
            onclick={() => showProfileModal = false}
            class="px-4 py-2 bg-gray-700 text-amber-300 border-2 border-amber-300 hover:bg-gray-600 transition-colors"
          >
            [CANCEL]
          </button>
          <button 
            type="submit" 
            disabled={formLoading}
            class="px-4 py-2 bg-amber-300 text-black border-2 border-amber-300 hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            {formLoading ? '[UPDATING...]' : '[UPDATE PROFILE]'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Password Reset Modal -->
{#if showPasswordModal}
  <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-gray-900 border-2 border-red-500 p-6 max-w-md w-full mx-4">
      <div class="border-b border-red-500 pb-4 mb-4">
        <h2 class="text-xl font-bold text-red-300">RESET PASSWORD</h2>
      </div>
      
      <div class="bg-red-900/20 border border-red-500 p-4 mb-4">
        <p class="text-red-300 font-bold mb-2">WARNING</p>
        <p class="text-gray-300 text-sm">
          This will reset the user's password and revoke all active sessions.
        </p>
      </div>
      
      <form method="POST" action="?/resetPassword" use:enhance={() => {
        if (!validatePasswordForm()) return false;
        formLoading = true;
        return ({ result }) => {
          formLoading = false;
          if (result.type === 'success' || result.status === 200) {
            showPasswordModal = false;
            passwordForm.newPassword = '';
            passwordForm.confirmPassword = '';
          }
        };
      }}>
        <div class="space-y-4">
          <div>
            <label for="newPassword" class="block text-sm font-bold mb-2">NEW PASSWORD</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              bind:value={passwordForm.newPassword}
              required
              minlength="8"
              class="w-full px-3 py-2 bg-black border-2 border-amber-300 text-amber-300 focus:outline-none focus:border-amber-400"
            />
          </div>
          
          <div>
            <label for="confirmPassword" class="block text-sm font-bold mb-2">CONFIRM PASSWORD</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              bind:value={passwordForm.confirmPassword}
              required
              minlength="8"
              class="w-full px-3 py-2 bg-black border-2 border-amber-300 text-amber-300 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
        
        <div class="flex justify-end gap-3 mt-6">
          <button 
            type="button" 
            onclick={() => showPasswordModal = false}
            class="px-4 py-2 bg-gray-700 text-amber-300 border-2 border-amber-300 hover:bg-gray-600 transition-colors"
          >
            [CANCEL]
          </button>
          <button 
            type="submit" 
            disabled={formLoading}
            class="px-4 py-2 bg-red-800 text-amber-300 border-2 border-red-500 hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {formLoading ? '[RESETTING...]' : '[RESET PASSWORD]'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Session Revoke Modal -->
{#if showSessionModal && selectedSession}
  <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-gray-900 border-2 border-red-500 p-6 max-w-md w-full mx-4">
      <div class="border-b border-red-500 pb-4 mb-4">
        <h2 class="text-xl font-bold text-red-300">REVOKE SESSION</h2>
      </div>
      
      <div class="space-y-4">
        <div class="bg-red-900/20 border border-red-500 p-4">
          <p class="text-red-300 font-bold mb-2">CONFIRM REVOCATION</p>
          <p class="text-gray-300 text-sm">
            This will immediately terminate session {selectedSession.id.substring(0, 8)}... and log the user out.
          </p>
        </div>
        
        <form method="POST" action="?/revokeSession" use:enhance={() => {
          formLoading = true;
          return ({ result }) => {
            formLoading = false;
            if (result.type === 'success' || result.status === 200) {
              closeSessionModal();
            }
          };
        }}>
          <input type="hidden" name="sessionId" value={selectedSession.id} />
          
          <div class="flex justify-end gap-3 mt-6">
            <button 
              type="button" 
              onclick={closeSessionModal}
              class="px-4 py-2 bg-gray-700 text-amber-300 border-2 border-amber-300 hover:bg-gray-600 transition-colors"
            >
              [CANCEL]
            </button>
            <button 
              type="submit" 
              disabled={formLoading}
              class="px-4 py-2 bg-red-800 text-amber-300 border-2 border-red-500 hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {formLoading ? '[REVOKING...]' : '[REVOKE SESSION]'}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<style>
  /* YoRHa cyberpunk aesthetic */
  :global(body) {
    background: #000;
    color: #fbbf24;
  }
  
  /* Custom scrollbar */
  .overflow-y-auto::-webkit-scrollbar,
  .overflow-x-auto::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-track,
  .overflow-x-auto::-webkit-scrollbar-track {
    background: #1f2937;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb,
  .overflow-x-auto::-webkit-scrollbar-thumb {
    background: #fbbf24;
    border-radius: 4px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb:hover,
  .overflow-x-auto::-webkit-scrollbar-thumb:hover {
    background: #f59e0b;
  }
</style>