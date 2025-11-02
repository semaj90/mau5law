<script, lang="ts">
	import { cn } from '$lib/utils'; // Import cn utility

	// Use $props() for Svelte 5 runes mode
	let {
		type = 'button',
		variant = 'primary',
		size = 'md',
		disabled = false,
		className = '',
		...rest
	} = $props() as {
		type?: 'button' | 'submit' | 'reset';
		variant?: 'primary' | 'secondary' | 'ghost';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		className?: string;
	};

	const base = 'inline-flex items-center justify-center rounded-2xl border transition-colors duration-150 select-none';

	// Use $derived for reactive computed values
	const byVariant = $derived(
		variant === 'primary'
			? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800'
			: variant === 'secondary'
			? 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
			: 'bg-transparent text-gray-700 border-transparent hover:bg-gray-100'
	);

	const bySize = $derived(size === 'sm' ? 'h-8 px-3 text-sm' : size === 'lg' ? 'h-12 px-6 text-base' : 'h-10 px-4 text-sm');

	// Use $derived for merging classes
	const classes = $derived(
		cn(
			base,
			byVariant,
			bySize,
			disabled && 'opacity-60 cursor-not-allowed', // Apply disabled styles conditionally
			className
		)
	);
</script>

<button
	{type}
	{disabled}
	aria-disabled={disabled}
	class={classes}
	{...rest}
>
	<slot />
</button>