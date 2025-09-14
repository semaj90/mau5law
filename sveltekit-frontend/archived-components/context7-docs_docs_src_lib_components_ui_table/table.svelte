<script lang="ts">
  import 'nes.css/css/nes.min.css';
  	import type { HTMLTableAttributes } from "svelte/elements";
  	import { cn } from "$lib/utils/styles.js";

  	let { class: className, children, ...restProps }: HTMLTableAttributes = $props();
</script>

<div class="w-full overflow-auto rounded-md">
	<table class={cn("w-full caption-bottom text-sm", className)} {...restProps}>
		{@render children?.()}
	</table>
</div>

