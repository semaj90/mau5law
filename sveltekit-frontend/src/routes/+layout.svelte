<!-- Root layout - Global styles and configuration -->
<script lang="ts">
  // Import UnoCSS globally to avoid FOUC and component-level overhead
  import 'uno.css';
</script>

<div class="min-h-screen bg-gray-900 text-white">
  <main class="container mx-auto p-4">
    <slot />
  </main>
</div>
