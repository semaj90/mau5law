<script lang="ts">
  import 'nes.css/css/nes.min.css';
  	import type { HTMLAttributes } from "svelte/elements";
  	import { cn } from "$lib/utils/styles.js";

  	let { class: className, children, ...restProps }: HTMLAttributes<HTMLTableElement> = $props();
</script>

<div class="my-6 w-full overflow-y-auto">
	<table class={cn("w-full", className)} {...restProps}>
		{@render children?.()}
	</table>
</div>

