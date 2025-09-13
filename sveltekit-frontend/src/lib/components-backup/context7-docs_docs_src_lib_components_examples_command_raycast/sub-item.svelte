<script lang="ts">
  import 'nes.css/css/nes.min.css';
  	import type { Snippet } from "svelte";
  	import { Command } from "bits-ui";

  	let { shortcut, children }: { shortcut: string; children: Snippet } = $props();
</script>

<Command.Item>
	{@render children?.()}
	<div data-command-raycast-submenu-shortcuts="">
		{#each shortcut.split(" ") as key, i (i)}
			<kbd>{key}</kbd>
		{/each}
	</div>
</Command.Item>

