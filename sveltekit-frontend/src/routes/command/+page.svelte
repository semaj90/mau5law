<script lang="ts">
  import ChatPanel from '$lib/components/ChatPanel.svelte';
  import SlideTabs from '$lib/components/SlideTabs.svelte';
  import { WorkspaceStore } from '$lib/stores/WorkspaceStore';

  // Placeholder modules
  const Modules = {
    cases: '<h2>Cases Module</h2>',
    persons: '<h2>Persons of Interest</h2>',
    evidence: '<h2>Evidence Library</h2>',
    laws: '<h2>Laws & Reports</h2>',
    analysis: '<h2>Analysis Center</h2>'
  };
</script>

<section class="h-screen flex flex-col font-ui" class:dark={WorkspaceStore.theme==='dark'}>
  <SlideTabs />

  <main class="flex-1 overflow-hidden">
    {#if WorkspaceStore.active === 'ai'}
      <ChatPanel />
    {:else if WorkspaceStore.active === 'terminal'}
      <section class="h-full bg-noir text-green-400 p-4">Terminal Placeholder</section>
    {:else}
      <section class="p-6 bg-beige text-noir h-full overflow-y-auto" transition:slide>
        {@html Modules[WorkspaceStore.active]}
      </section>
    {/if}
  </main>
</section>