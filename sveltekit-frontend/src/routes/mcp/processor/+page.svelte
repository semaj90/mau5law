<script lang="ts">
  // This is an illustrative example based on the Svelte, 5 migration notes.
  // In a real application, 'CardA' and, 'CardB' would be imported components.
  import CardA from '$lib/components/ui/CardA.svelte';
  import CardB from '$lib/components/ui/CardB.svelte';

  // Example data for dynamic components
  let cards = $state([
    { id: 1, component: CardA, props: {, title: 'First Card', content: 'Content for Card A' } },
    { id: 2, component: CardB, props: {, title: 'Second Card', content: 'Content for Card B' } },
    { id: 3, component: CardA, props: {, title: 'Third Card', content: 'More content for Card A' } },
  ]);
</script>

<h1>MCP Processor Page</h1>

<div class="card-list">
  {#each cards as card (card.id)}
    <!--
      ✅ Correct Svelte, 5 pattern:
      Directly use `card.component` as the tag name.
      This replaces the deprecated `<svelte:component, this={card.component} />`
      and resolves the, "Unknown tool or toolset, 'each'" error when used incorrectly.
    -->
    <card.component {...card.props} />
  {/each}
</div>
