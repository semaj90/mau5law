<script lang="ts">
</script>
  import type { Snippet } from 'svelte';

  interface GridColumn {
    key: string;
    title: string;
    formatter?: (value: any, row: any) => string;
  }

  interface DataGridProps {
    columns?: GridColumn[];
    data?: any[];
    loading?: boolean;
    className?: string;
    actionsSnippet?: Snippet<[any, number]>;
  }

  let {
    columns = [],
    data = [],
    loading = false,
    className = '',
    actionsSnippet
  }: DataGridProps = $props();

  function format(value: any, col: GridColumn, row: any) {
    return col.formatter ? col.formatter(value, row) : value;
  }
</script>

<div class="yorha-data-grid {className}">
  {#if loading}
    <div class="grid-loading">Loading...</div>
  {:else}
    <div class="grid-scroll">
      <table class="grid-table">
        <thead>
          <tr>
            {#each columns as col}
              <th>{col.title}</th>
            {/each}
            {#if actionsSnippet}
              <th>Actions</th>
            {/if}
          </tr>
        </thead>
        <tbody>
          {#each data as row, i (row?.id ?? i)}
            <tr>
              {#each columns as col}
                <td>{format(row?.[col.key], col, row)}</td>
              {/each}
              {#if actionsSnippet}
                <td>{@render actionsSnippet(row, i)}</td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
  {#if !loading && (!data || data.length === 0)}
    <div class="grid-empty">No data</div>
  {/if}
</div>

<style>
  .yorha-data-grid {
    border: 2px solid #ffbf00;
    background: #0a0a0a;
    color: #e0e0e0;
    font-family: 'JetBrains Mono', monospace;
  }
  .grid-scroll { overflow: auto; max-height: 500px; }
  .grid-table { width: 100%; border-collapse: collapse; }
  thead th { position: sticky; top: 0; background: #ffd700; color: #000; text-align: left; padding: 8px; border-bottom: 2px solid #ffbf00; }
  td { padding: 8px; border-bottom: 1px solid #333; }
  tr:nth-child(even) td { background: #151515; }
  .grid-loading, .grid-empty { padding: 12px; color: #ffbf00; }
</style>
