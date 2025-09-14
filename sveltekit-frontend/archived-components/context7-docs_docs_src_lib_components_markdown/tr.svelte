<script lang="ts">
  import 'nes.css/css/nes.min.css';
  	import type { HTMLAttributes } from "svelte/elements";
  	import { cn } from "$lib/utils/styles.js";

  	let {
  		class: className,
  		children,
  		...restProps
  	}: HTMLAttributes<HTMLTableRowElement> = $props();
</script>

<tr class={cn("m-0 border-t p-0", className)} {...restProps}>
	{@render children?.()}
</tr>

