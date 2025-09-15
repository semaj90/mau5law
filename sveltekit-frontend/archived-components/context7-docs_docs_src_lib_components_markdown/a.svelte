<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import type { HTMLAnchorAttributes } from "svelte/elements";
  import { cn } from "$lib/utils/styles.js";

  // Public props
  export let href: string = "";
  export let className: string = "";

  // derive whether the link is internal
  $: isInternal = !!href && (href.startsWith("/") || href.startsWith("#"));

  // reactive derived attributes for external links
  $: rel = !isInternal && href ? "noopener noreferrer" : undefined;
  $: target = !isInternal && href ? "_blank" : undefined;
</script>

<a href={href} target={target} rel={rel} class={cn("link leading-7", className)} {...$$restProps}>
  <slot />
</a>

