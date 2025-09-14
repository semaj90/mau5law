<script lang="ts">
  import 'nes.css/css/nes.min.css';
  	import type { HTMLAttributes } from "svelte/elements";
  	import { cn } from "$lib/utils/styles.js";

  	let {
  		class: className,
  		children,
  		...restProps
  	}: HTMLAttributes<HTMLTableSectionElement> = $props();
</script>

<tfoot class={cn("bg-primary text-primary-foreground font-medium", className)} {...restProps}>
	{@render children?.()}
</tfoot>

