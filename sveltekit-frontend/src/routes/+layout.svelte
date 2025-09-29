<script lang="ts">
  import '../app.css';
  import Navigation from '$lib/components/Navigation.svelte';

  interface NavItem {
    label: string;
    path: string;
    priority?: number;
  }

  interface Props {
    children: any;
    data: {
      user: any;
      session: any;
      isAuthenticated?: boolean;
      startupStatus?: any;
    }
  }

  let { children, data }: Props = $props();

  const navItems: NavItem[] = [
    { label: 'Home', path: '/' },
    { label: 'AI Assistant', path: '/ai/assistant', priority: 1 },
    { label: 'Evidence Board', path: '/evidence/board', priority: 1 },
    { label: 'Admin', path: '/admin', priority: 2 },
    { label: 'Login', path: '/login' },
  ].sort((a, b) => (a.priority || 999) - (b.priority || 999));
</script>

<main class="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
  <Navigation navItems={navItems} />
  <div class="container mx-auto p-4">
    <h1 class="text-2xl text-amber-400 mb-4">YoRHa Legal AI Platform</h1>
    {@render children()}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: 'JetBrains Mono', monospace;
    background: black;
  }
</style>