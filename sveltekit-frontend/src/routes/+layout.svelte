<!-- Root layout - Global styles and configuration -->
<script lang="ts">
  // Import UnoCSS globally to avoid FOUC and component-level overhead
  import 'uno.css';
  import Header from '$lib/components/Header.svelte';
  import NavBar from '$lib/components/layout/NavBar.svelte';
  import ToastContainer from '$lib/components/ui/ToastContainer.svelte';

  export let data;
</script>

<NavBar user={data.user} />
<Header />

<div class="min-h-screen bg-gray-50 text-gray-900">
  <main class="container mx-auto p-4">
    <slot />
  </main>
</div>

<ToastContainer />
