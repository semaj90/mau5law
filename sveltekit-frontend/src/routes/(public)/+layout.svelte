<!-- Public Layout - Gaming-Inspired Legal AI Platform -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    data?: any;
    children?: Snippet;
  }

  let { data, children }: Props = $props();
</script>

<div class="public-layout">
  <header class="public-nav">
    <div class="nav-left">
      <h1>🎮 Legal AI Platform</h1>
    </div>
    <nav class="nav-links">
      <a href="/about">About</a>
      <a href="/login">Login</a>
      <a href="/register">Register</a>
    </nav>
  </header>

  <main class="public-content">
    {#if children}
      {@render children()}
    {/if}
  </main>

  <footer class="public-footer">
    <p>&copy; 2024 Enhanced Legal AI Platform - Gaming-Inspired Innovation</p>
  </footer>
</div>

<style>
  .public-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(135deg, #0f0f23, #1a1a2e);
    color: white;
  }

  .public-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 2rem;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 2px solid #00aa00;
  }

  .nav-left h1 {
    margin: 0;
    color: #00aa00;
    font-family: monospace;
  }

  .nav-links {
    display: flex;
    gap: 1rem;
  }

  .nav-links a {
    color: white;
    text-decoration: none;
    padding: 0.5rem 1rem;
    border: 1px solid transparent;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .nav-links a:hover {
    border-color: #00aa00;
    background: rgba(0, 170, 0, 0.1);
  }

  .public-content {
    flex: 1;
    padding: 2rem;
  }

  .public-footer {
    padding: 1rem 2rem;
    text-align: center;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
  }
</style>
