<script lang="ts">
  import StatuteColumn from '$lib/components/laws/StatuteColumn.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<div class="statute-page">
  <StatuteColumn
    title={data.statute.title}
    section={data.statute.section}
    body={data.statute.content}
    statuteId={data.statute.id}
  />
</div>

<style>
  .statute-page {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
