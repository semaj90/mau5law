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

<tr class={cn("border-b", className)} {...restProps}>
	{@render children?.()}
</tr>

