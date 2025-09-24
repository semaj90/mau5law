<!-- tabs-bits-list.svelte -->
<script>
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';
	let {
		class: className = undefined,
		children = undefined,
		...restProp;
	} = $props();
</script>
<TabsPrimitive.List
	class={cn(
		'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
		'data-[orientation=vertical]:h-auto data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-start data-[orientation=vertical]:rounded-md data-[orientation=vertical]:border data-[orientation=vertical]:border-border data-[orientation=vertical]:bg-transparent data-[orientation=vertical]:p-0',
		className
	)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</TabsPrimitive.List>