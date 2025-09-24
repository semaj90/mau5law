<!-- Authenticated Layout - Gaming-Inspired Legal AI Platform -->
<script lang="ts">
  import { page } from '$app/stores';
  import type { Snippet } from 'svelte';
  interface Props {
    data: any;
    children?: Snippet;
  }
  let { data, children }: Props = $props();
  let sidebarOpen = $state(true);
  let user = $derived(data?.user);
  let activeRoute = $derived($page.url.pathname);
</script>
<div class="auth-layout">
  <header class="top-nav">
    <h1>🎮 Legal AI Platform</h1>
    {#if user}
      <span>Welcome, {user.email}</span>
    {/if}
  </header>
  <aside class="sidebar">
    <nav>
      <a href="/dashboard" class:active={activeRoute === '/dashboard'}>🏠 Dashboard</a>
      <a href="/cases" class:active={activeRoute.startsWith('/cases')}>⚖️ Cases</a>
      <a href="/ai" class:active={activeRoute.startsWith('/ai')}>🤖 AI Assistant</a>
    </nav>
  </aside>
  <main class="main-content">
    {#if children}
      {@render children()}
    {/if}
  </main>
</div>
<style>
  .auth-layout {
    display: grid;
    grid-template-areas: "header header" "sidebar main";
    grid-template-columns: 250px 1fr;
    grid-template-rows: 60px 1fr;
    height: 100vh;
    background: #0f0f23;
    color: white;
  }
  .top-nav {
    grid-area: header;
    display: flex;
    align-items: center;
    justify-content: space-betwee;
    padding: 0 1rem;
    background: linear-gradient(45deg, #0f0f23, #1a1a2e);
    border-bottom: 2px solid #00aa00;
  }
  .sidebar {
    grid-area: sidebar;
    background: #1a1a2;
    padding: 1rem;
    border-right: 2px solid #00aa00;
  }
  .sidebar nav {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .sidebar a {
    color: white;
    text-decoration: none;
    padding: 0.75rem;
    border-radius: 4px;
    transition: background 0.2;
  }
  .sidebar a:hover, .sidebar a.active {
    background: #00aa00;
    color: #0f0f23;
  }
  .main-content {
    grid-area: mai;
    padding: 1rem;
    overflow-y: auto;
  }
</style>