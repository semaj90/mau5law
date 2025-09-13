<script lang="ts">
  import 'nes.css/css/nes.min.css';
  	import type { HTMLAttributes } from "svelte/elements";
  	import { cn } from "$lib/utils/styles.js";

  	let { class: className, ...restProps }: HTMLAttributes<HTMLElement> = $props();
</script>

<hr class={cn("my-4 md:my-8", className)} {...restProps} />

