<script lang="ts">
  // Minimal settings implementation - SSR friendly
</script>

<svelte:head>
  <title>Settings - WardenNet Legal</title>
  <meta name="description" content="Application settings and user preferences" />
</svelte:head>
<div class="min-h-screen bg-gray-900 text-white">
  <main class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Settings</h1>
    <p class="mb-4">Settings page temporarily simplified for SSR compatibility.</p>
    <div class="space-y-6">
      <div class="nes-container is-dark">
        <h2 class="title text-lg">Profile Settings</h2>
        <div class="field">
          <label for="name">Name:</label>
          <input type="text" id="name" class="nes-input is-dark" placeholder="Enter your name" />
        </div>
        <div class="field">
          <label for="email">Email:</label>
          <input type="email" id="email" class="nes-input is-dark" placeholder="Enter your email" />
        </div>
      </div>
      <div class="nes-container is-dark">
        <h2 class="title text-lg">System Preferences</h2>
        <label>
          <input type="checkbox" class="nes-checkbox is-dark" />
          <span>Enable dark mode</span>
        </label>
        <label>
          <input type="checkbox" class="nes-checkbox is-dark" />
          <span>Enable notifications</span>
        </label>
      </div>
      <div class="nes-container is-dark">
        <h2 class="title text-lg">Security</h2>
        <button class="nes-btn is-warning">Change Password</button>
        <button class="nes-btn is-error">Export Data</button>
      </div>
      <div class="mt-8">
        <button class="nes-btn is-primary">Save Settings</button>
        <button class="nes-btn">Cancel</button>
      </div>
    </div>
  </main>
</div>
