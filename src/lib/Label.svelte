<script lang="ts">
	import { cn } from "$lib/utils";

	let className: string | undefined = undefined;
	export { className as class };

	export let htmlFor: string | undefined = undefined;
</script>

<label
	for={htmlFor}
	class={cn(
		"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
		className
	)}
	{...$$restProps}
>
	<slot />
</label>