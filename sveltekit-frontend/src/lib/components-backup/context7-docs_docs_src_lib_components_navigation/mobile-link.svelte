<script lang="ts">
  import 'nes.css/css/nes.min.css';
  	import type { HTMLAnchorAttributes } from "svelte/elements";
  	import { cn } from "$lib/utils/styles.js";

  	let {
  		onClose,
  		href = "#",
  		children,
  		class: className,
  		...restProps
  	}: HTMLAnchorAttributes & { onClose?: () => void } = $props();
</script>

<a {href} onclick={onClose} class={cn(className)} {...restProps}>
	{@render children?.()}
</a>

