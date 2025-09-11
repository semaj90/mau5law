<!-- @migration-task Error while migrating Svelte code: `</script>` attempted to close an element that was not open
https://svelte.dev/e/element_invalid_closing_tag -->
<!-- @migration-task Error while migrating Svelte code: `</script>` attempted to close an element that was not open -->
<script>
  const { theme = 'light' } = $props();

</script>
  import { setContext } from 'svelte';

  // supported themes: "light" or "dark"
  

  // expose theme to descendants via context
  // TODO: Convert to $derived: setContext('theme', theme)
</script>

<style>
  .theme-provider {
	min-height: 100%;
	display: block;
  }

  .theme-provider.light {
	--bg: #ffffff;
	--text: #111111;
	background-color: var(--bg);
	color: var(--text);
  }

  .theme-provider.dark {
	--bg: #0b0b0b;
	--text: #f5f5f5;
	background-color: var(--bg);
	color: var(--text);
  }
</style>

<div class="theme-provider {theme}">
  <slot />
</div>

