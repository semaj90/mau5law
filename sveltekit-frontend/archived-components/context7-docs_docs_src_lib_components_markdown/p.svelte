<script lang="ts">
  import 'nes.css/css/nes.min.css';
  	import type { HTMLAttributes } from "svelte/elements";
  	import { cn } from "$lib/utils/styles.js";

  	let {
  		class: className,
  		children,
  		...restProps
  	}: HTMLAttributes<HTMLParagraphElement> = $props();
</script>

<p class={cn("not-first:mt-6 leading-7", className)} {...restProps}>
	{@render children?.()}
</p>

