<script lang="ts">
  import type { PageData } from './$types';

  export let data: PageData;
  const { user, session } = data;
</script>

<svelte:head>
  <title>Protected Area - Legal AI</title>
</svelte:head>

<div class="container mx-auto p-6 max-w-4xl">
  <div class="bg-white rounded-lg shadow-lg p-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-6">🔒 Protected Area</h1>

    <div class="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold text-green-800 mb-4">✅ Authentication Successful</h2>
      <p class="text-green-700">
        You are successfully authenticated and can access this protected area!
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- User Information -->
      <div class="bg-gray-50 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">👤 User Information</h3>
        <div class="space-y-3">
          <div>
            <span class="font-medium text-gray-700">ID:</span>
            <span class="text-gray-600 ml-2 font-mono text-sm">{user.id}</span>
          </div>
          <div>
            <span class="font-medium text-gray-700">Email:</span>
            <span class="text-gray-600 ml-2">{user.email}</span>
          </div>
          <div>
            <span class="font-medium text-gray-700">Name:</span>
            <span class="text-gray-600 ml-2">{user.name || 'Not set'}</span>
          </div>
          <div>
            <span class="font-medium text-gray-700">Role:</span>
            <span class="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm ml-2">
              {user.role}
            </span>
          </div>
          <div>
            <span class="font-medium text-gray-700">Status:</span>
            <span class="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-sm ml-2">
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      <!-- Session Information -->
      <div class="bg-gray-50 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">🔑 Session Information</h3>
        <div class="space-y-3">
          <div>
            <span class="font-medium text-gray-700">Session ID:</span>
            <span class="text-gray-600 ml-2 font-mono text-sm">{session.id}</span>
          </div>
          <div>
            <span class="font-medium text-gray-700">Fresh Session:</span>
            <span class="inline-block px-2 py-1 {session.fresh ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} rounded text-sm ml-2">
              {session.fresh ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span class="font-medium text-gray-700">Expires At:</span>
            <span class="text-gray-600 ml-2 text-sm">
              {new Date(session.expiresAt).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <div class="mt-8 flex flex-wrap gap-4">
      <a href="/" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
        🏠 Home
      </a>
      <a href="/auth/login" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors">
        🔑 Login Page
      </a>
      <a href="/auth/register" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
        📝 Register Page
      </a>
      <form method="POST" action="/api/auth/logout" class="inline">
        <button type="submit" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
          🚪 Logout
        </button>
      </form>
    </div>

    <!-- Features Demo -->
    <div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h3 class="text-lg font-semibold text-blue-900 mb-4">🚀 Your Authentication System Features</h3>
      <ul class="space-y-2 text-blue-800">
        <li>✅ Lucia v3 with Drizzle PostgreSQL adapter</li>
        <li>✅ Argon2id password hashing</li>
        <li>✅ 30-day session expiration</li>
        <li>✅ Email verification support</li>
        <li>✅ Password reset tokens</li>
        <li>✅ Role-based access control</li>
        <li>✅ SvelteKit hooks integration</li>
        <li>✅ Protected routes</li>
      </ul>
    </div>
  </div>
</div>

<style>
  .container {
    animation: fadeIn 0.5s ease-in;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>