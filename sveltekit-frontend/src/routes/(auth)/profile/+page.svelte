<script lang="ts">
  import { userStore, clearUserSession, updateUserProfile } from '$lib/stores/user';
  import Button from '$lib/components/ui/button/Button.svelte';
  import AvatarUpload from '$lib/components/auth/AvatarUpload.svelte';
  import { LogOut, Mail, User } from 'lucide-svelte';

  let editMode = $state(false);
  let loading = $state(false);
  let message = $state('');
  let messageType = $state<'success' | 'error'>('success');

  let formData = $state({
    firstName: '',
    lastName: '',
    email: '',
  });

  // Load user data from store
  $effect(() => {
    if ($userStore) {
      formData.firstName = $userStore.user.firstName || '';
      formData.lastName = $userStore.user.lastName || '';
      formData.email = $userStore.user.email;
    }
  });

  async function handleLogout() {
    try {
      loading = true;
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        clearUserSession();
        window.location.href = '/';
      } else {
        throw new Error('Logout failed');
      }
    } catch (error) {
      message = 'Failed to logout';
      messageType = 'error';
    } finally {
      loading = false;
    }
  }

  async function handleSaveProfile() {
    try {
      loading = true;
      message = '';
      const response = await fetch('/api/auth/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        updateUserProfile({
          firstName: formData.firstName,
          lastName: formData.lastName,
        });
        message = 'Profile updated successfully';
        messageType = 'success';
        editMode = false;
      } else {
        message = data.error?.message || 'Failed to update profile';
        messageType = 'error';
      }
    } catch (error) {
      message = 'An error occurred while updating profile';
      messageType = 'error';
    } finally {
      loading = false;
    }
  }

  function copyEmail() {
    navigator.clipboard.writeText($userStore?.user.email || '');
    message = 'Email copied to clipboard';
    messageType = 'success';
  }
</script>

{#if !$userStore}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="bg-white p-8 rounded-lg shadow-md text-center">
      <h1 class="text-2xl font-bold text-gray-900 mb-4">Not Authenticated</h1>
      <p class="text-gray-600 mb-6">Please log in to view your profile</p>
      <a href="/" class="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Back to Home
      </a>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
    <div class="max-w-2xl mx-auto">
      <!-- Header -->
      <div class="bg-white rounded-lg shadow-lg p-8 mb-6">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-3xl font-bold text-gray-900">Profile</h1>
          <Button
            onclick={handleLogout}
            disabled={loading}
            class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            <LogOut class="w-4 h-4" />
            Logout
          </Button>
        </div>

        {#if message}
          <div class="mb-6 p-4 rounded {messageType === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}">
            {message}
          </div>
        {/if}

        <!-- User Avatar -->
        <div class="flex items-center mb-8">
          <div class="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center mr-6">
            <User class="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 class="text-xl font-semibold text-gray-900">
              {$userStore.user.firstName} {$userStore.user.lastName}
            </h2>
            <p class="text-gray-500">{$userStore.user.role}</p>
          </div>
        </div>

        <!-- Profile Information -->
        <div class="space-y-4">
          {#if editMode}
            <!-- Edit Mode -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">First Name</label>
              <input
                type="text"
                bind:value={formData.firstName}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
              <input
                type="text"
                bind:value={formData.lastName}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                disabled
                class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          {:else}
            <!-- View Mode -->
            <div class="grid grid-cols-2 gap-6">
              <div>
                <p class="text-sm text-gray-500 mb-1">First Name</p>
                <p class="text-lg font-medium text-gray-900">{formData.firstName || 'Not set'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500 mb-1">Last Name</p>
                <p class="text-lg font-medium text-gray-900">{formData.lastName || 'Not set'}</p>
              </div>
            </div>
            <div>
              <p class="text-sm text-gray-500 mb-2">Email</p>
              <div class="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                <div class="flex items-center gap-2">
                  <Mail class="w-5 h-5 text-gray-400" />
                  <p class="text-lg text-gray-900">{formData.email}</p>
                </div>
                <button onclick={copyEmail} class="p-2 hover:bg-gray-200 rounded">
                  📋
                </button>
              </div>
            </div>
          {/if}
        </div>

        <!-- Action Buttons -->
        <div class="mt-8 flex gap-4">
          {#if editMode}
            <Button
              onclick={handleSaveProfile}
              disabled={loading}
              class="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              onclick={() => (editMode = false)}
              disabled={loading}
              class="flex-1 px-4 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400"
            >
              Cancel
            </Button>
          {:else}
            <Button
              onclick={() => (editMode = true)}
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Edit Profile
            </Button>
          {/if}
        </div>
      </div>

      <!-- Avatar Upload Section -->
      <div class="bg-white rounded-lg shadow-lg p-8 mb-6">
        <AvatarUpload userId={$userStore.user.id} currentAvatar={$userStore.user.avatarUrl} />
      </div>

      <!-- Session Info -->
      <div class="bg-white rounded-lg shadow-lg p-8">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Session Information</h3>
          <a
            href="/sessions"
            class="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Manage Sessions
          </a>
        </div>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Session ID:</span>
            <span class="text-gray-900 font-mono text-xs">{$userStore.session.id.slice(0, 16)}...</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Expires At:</span>
            <span class="text-gray-900">{new Date($userStore.session.expiresAt).toLocaleString()}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">User Role:</span>
            <span class="text-gray-900 capitalize">{$userStore.user.role}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(body) {
    @apply bg-gray-50;
  }
</style>
