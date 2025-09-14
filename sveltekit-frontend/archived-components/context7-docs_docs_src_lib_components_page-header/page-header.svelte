<script lang="ts">
  import 'nes.css/css/nes.min.css';
  	import type { HTMLAttributes } from "svelte/elements";
  	import { cn } from "$lib/utils/styles.js";
  	let { class: className, children, ...restProps }: HTMLAttributes<HTMLElement> = $props();
</script>

<section class={cn("relative", className)} {...restProps}>
	{@render children?.()}
</section>

