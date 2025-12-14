<script lang="ts">
  interface Props {
    selectedItems: any[];
    onAction: (action: string, items: any[]) => void;
  }

  let { selectedItems, onAction }: Props = $props();

  function handleToolbar(action: string) {
    onAction(action, selectedItems);
  }
</script>

<div class="toolbar">
  <div class="selection-info">
    {selectedItems.length} items selected
  </div>

  <div class="actions">
    <button onclick={() => handleToolbar('analyze')} disabled={selectedItems.length === 0}>
      Analyze
    </button>
    <button onclick={() => handleToolbar('connect')} disabled={selectedItems.length < 2}>
      Connect
    </button>
    <button onclick={() => handleToolbar('export')} disabled={selectedItems.length === 0}>
      Export
    </button>
    <button onclick={() => handleToolbar('delete')} disabled={selectedItems.length === 0}>
      Delete
    </button>
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f5f5f5;
    border-bottom: 1px solid #ddd;
  }

  .selection-info {
    font-weight: bold;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  button {
    padding: 0.5rem 1rem;
    border: 1px solid #ccc;
    background: white;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    background: #e0e0e0;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
