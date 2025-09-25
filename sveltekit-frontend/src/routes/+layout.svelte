<script lang="ts">
  import '../app.css';

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
</script>

<main class="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
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