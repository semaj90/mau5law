<script lang="ts">
  let { query = "" } = $props // TODO: Verify store subscription is correct for Svelte 5();
  export let onSearch;
</script>

<input
  class="nes-input w-full p-2 text-lg bg-black text-white border border-cyan-400"
  placeholder="Search witnesses, objects, locations, contradictions..."
  bind:value={query}
  oninput={(e)=>onSearch(e.target.value)}
/>