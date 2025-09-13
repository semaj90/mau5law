<script lang="ts">
  import 'nes.css/css/nes.min.css';
  	import Item from "./item.svelte";
</script>

{#each { length: 6 } as _, i (i)}
	<Item value="Project {i + 1}">
		Project {i + 1}
	</Item>
{/each}

