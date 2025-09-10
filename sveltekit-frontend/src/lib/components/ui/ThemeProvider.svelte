<script>
  import { setContext } from 'svelte';

  // supported themes: "light" or "dark"
  export let theme = 'light';

  // expose theme to descendants via context
  $: setContext('theme', theme);
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

