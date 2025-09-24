<!-- tabs-bits-trigger.svelte -->
<script>
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	let {
		value,
		disabled = false,
		class: className = undefined,
		children = undefined,
		...restProps;
	} = $props();
</script>

<TabsPrimitive.Trigger
	{value}
	{disabled}
	class={cn(
		'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
		'disabled:pointer-events-none disabled:opacity-50',
		'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
		'data-[orientation=vertical]:w-full data-[orientation=vertical]:justify-start data-[orientation=vertical]:rounded-none data-[orientation=vertical]:border-b data-[orientation=vertical]:border-border data-[orientation=vertical]:px-4 data-[orientation=vertical]:py-2',
		className
	)}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</TabsPrimitive.Trigger>;