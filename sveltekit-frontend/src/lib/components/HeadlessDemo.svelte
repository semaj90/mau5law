<script lang="ts">
  interface Props {
    items?: string[];
  }
  let {
    items = ['Active Cases', 'Pending Cases', 'Closed Cases']
  }: Props = $props();

  import { fade } from 'svelte/transition';
  export const title = 'Legal Case Manager';
  let dialogOpen = $state(false);
  let selectOpen = $state(false);
  let selectedItem = $state(items[0]);

  function toggleDialog() {
    dialogOpen = !dialogOpen;
  }

  function toggleSelect() {
    selectOpen = !selectOpen;
  }

  function selectItem(item: string) {
    selectedItem = item;
    selectOpen = false;
  }
</script>

<div class="space-y-4">
  <h2 class="text-xl font-semibold">Headless UI Components Demo</h2>
  
  <!-- Basic Button -->
  <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
    Primary Action Button
  </button>
  
  <!-- Simple Select -->
  <div class="space-y-4 relative">
    <button 
      onclick={toggleSelect}
      class="border border-gray-300 rounded px-4 py-2 w-full text-left"
      aria-label="Case Type Filter"
    >
      {selectedItem || 'Select case type...'}
    </button>
    
    {#if selectOpen}
      <div 
        class="absolute top-full left-0 w-full bg-white border border-gray-300 rounded shadow-lg mt-1 z-10"
        transition:fade={{ duration: 150 }}
      >
        {#each items as item}
          <div 
            class="p-2 hover:bg-gray-100 cursor-pointer"
            onclick={() => selectItem(item)}
          >
            {item}
          </div>
        {/each}
      </div>
    {/if}
  </div>
  
  <!-- Dialog Trigger -->
  <button 
    onclick={toggleDialog}
    class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
  >
    Open Case Details Dialog
  </button>
  
  <!-- Dialog -->
  {#if dialogOpen}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" transition:fade={{ duration: 150 }}>
      <div 
        class="bg-white p-6 rounded shadow-lg max-w-md w-full"
        role="dialog"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-desc"
      >
        <h3 id="dialog-title" class="text-lg font-semibold mb-4">
          Case Management System
        </h3>
        <p id="dialog-desc" class="text-gray-600 mb-6">
          This is a demo of simple UI components integrated with Tailwind styling for legal case management.
        </p>
        
        <div class="flex gap-2 justify-end">
          <button onclick={toggleDialog} class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
            Cancel
          </button>
          <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
