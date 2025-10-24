<script context="module" lang="ts">
	// Provide typings for forwarded native attributes on a button element
	import type { HTMLAttributes } from 'svelte/elements';
	declare const $$restProps: HTMLAttributes<HTMLButtonElement>;
</script>

<script lang="ts">
	// (keep instance-level props as before)
	export let type: 'button' | 'submit' | 'reset' = 'button';
	export let variant: 'primary' | 'secondary' | 'ghost' = 'primary';
	export let size: 'sm' | 'md' | 'lg' = 'md';
	export let disabled: boolean = false;
	export let className = '';

	const base = 'inline-flex items-center justify-center rounded-2xl border transition-colors duration-150 select-none';

	// reactive variants/sizes so changes to props update classes
	$: byVariant =
		variant === 'primary'
			? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800'
			: variant === 'secondary'
			? 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
			: 'bg-transparent text-gray-700 border-transparent hover:bg-gray-100';

	$: bySize = size === 'sm' ? 'h-8 px-3 text-sm' : size === 'lg' ? 'h-12 px-6 text-base' : 'h-10 px-4 text-sm';

	$: classes = `${base} ${byVariant} ${bySize} disabled:opacity-60 disabled:cursor-not-allowed ${className}`.trim();
</script>

<button
	{type}
	{disabled}
	aria-disabled={disabled}
	class={classes}
	{...$$restProps}
>
	<slot />
</button>