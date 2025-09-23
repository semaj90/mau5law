<script lang="ts">
  // Minimal dashboard implementation - SSR friendly
</script>

<svelte:head>
  <title>Dashboard - WardenNet Legal</title>
  <meta
    name="description"
    content="Legal AI dashboard with real-time analytics and system monitoring"
  />
</svelte:head>

<div class="min-h-screen bg-gray-900 text-white">
  <main class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Legal AI Dashboard</h1>
    <p class="mb-4">Dashboard loading - temporarily simplified for SSR compatibility.</p>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="nes-container is-dark">
        <h2 class="title text-lg">Active Cases</h2>
        <p class="text-2xl font-bold text-green-400">42</p>
      </div>

      <div class="nes-container is-dark">
        <h2 class="title text-lg">Evidence Items</h2>
        <p class="text-2xl font-bold text-blue-400">1,337</p>
      </div>

      <div class="nes-container is-dark">
        <h2 class="title text-lg">AI Analysis</h2>
        <p class="text-2xl font-bold text-purple-400">89%</p>
      </div>

      <div class="nes-container is-dark">
        <h2 class="title text-lg">System Status</h2>
        <p class="text-2xl font-bold text-green-400">Healthy</p>
      </div>
    </div>

    <div class="mt-8">
      <button class="nes-btn is-primary">View Full Dashboard</button>
    </div>
  </main>
</div>