<script>
  let { name = 'world', count = 0 } = $props();

  let doubled = $derived(count * 2);

  function increment() {
    count += 1;
  }
</script>

<button onclick={increment}>
  Hello {name}, count is {count}, doubled is {doubled}
</button>
