<!-- Example: Svelte 4 Style (Before Migration) -->
<!-- 
<script>
  // Svelte 4 reactive variables
  export let initialCount = 0;
  
  let count = initialCount;
  let doubled;
  let history = [];
  
  // Reactive statement
  $: doubled = count * 2;
  
  // Reactive statement with side effect
  $: if (count > 10) {
    console.log("Count is getting high!");
  }
  
  // Reactive statement updating array
  $: history = [...history.slice(-4), count];
  
  function increment() {
    count += 1;
  }
  
  function reset() {
    count = initialCount;
  }
</script>
-->

<!-- Example: Svelte 5 Style with Runes (After Migration) -->
<script lang="ts">
  // Svelte 5 with runes
  let {
    initialCount = 0
  }: {
    initialCount?: number;
  } = $props();
  
  // State rune replaces regular variables
  let count = $state(initialCount);
  let history = $state<number[]>([]);
  
  // Derived rune replaces reactive statements
  let doubled = $derived(count * 2);
  
  // Effect rune replaces reactive statements with side effects
  $effect(() => {
    if (count > 10) {
      console.log("Count is getting high!");
    }
  });
  
  // Effect rune for updating history
  $effect(() => {
    history = [...history.slice(-4), count];
  });
  
  function increment() {
    count += 1;
  }
  
  function reset() {
    count = initialCount;
  }
</script>

<div class="counter-container">
  <h2>Svelte 5 Counter with Runes</h2>
  
  <div class="display">
    <p>Count: {count}</p>
    <p>Doubled: {doubled}</p>
    <p>History: {history.join(', ')}</p>
  </div>
  
  <div class="controls">
    <button onclick={increment}>Increment</button>
    <button onclick={reset}>Reset</button>
  </div>
</div>

<style>
  .counter-container {
    padding: 2rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    max-width: 400px;
    margin: 2rem auto;
  }
  
  .display {
    margin: 1rem 0;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 4px;
  }
  
  .display p {
    margin: 0.5rem 0;
  }
  
  .controls {
    display: flex;
    gap: 1rem;
  }
  
  button {
    padding: 0.5rem 1rem;
    border: 1px solid #007bff;
    background: #007bff;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  button:hover {
    background: #0056b3;
  }
</style>