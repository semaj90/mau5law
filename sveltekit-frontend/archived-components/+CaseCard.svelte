<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import type { Case } from '$lib/data/types';

  interface Props {
    caseItem: Case;
  }

  let { caseItem }: Props = $props();

</script>

<div class="nier-bits-card h-100 shadow-sm">
  <div class="nier-bits-card-body d-flex flex-column">
    <h5 class="nier-bits-nes-text is-primary text-primary">{caseItem.title}</h5>
    {#if caseItem.createdAt}
      <p class="nier-bits-card-text text-muted mb-2"><small>Created: {new Date(caseItem.createdAt).toLocaleDateString()}</small></p>
    {/if}
    <p class="nier-bits-card-text flex-grow-1">{caseItem.description ? caseItem.description.substring(0, 100) : 'No description.'}{caseItem.description && caseItem.description.length > 100 ? '...' : ''}</p>
    <a href="/case/{caseItem.id}" class="btn nes-btn-primary mt-auto" aria-label="View details for {caseItem.title}">View Details &rarr;</a>
  </div>
</div>

