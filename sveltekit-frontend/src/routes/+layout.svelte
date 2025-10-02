<script lang="ts">
  import '../app.css';
  import Navigation from '$lib/components/Navigation.svelte';

  interface Props {
    children: any;
    data?: {
      user?: any;
      session?: any;
      isAuthenticated?: boolean;
      startupStatus?: any;
    }
  }

  let { children, data }: Props = $props();
</script>

<div class="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
  <Navigation />
  <main class="container mx-auto p-4">
    {@render children()}
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: 'JetBrains Mono', monospace;
    background: black;
  }
</style>