<script lang="ts">
</script>
  import { onMount } from 'svelte';

  type Theme = 'light' | 'dark' | 'system';
  const THEME_KEY = 'theme';

  let theme: Theme = 'system';

  function applyTheme(t: Theme) {
	if (t === 'system') {
	  const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
	  document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
	} else {
	  document.documentElement.setAttribute('data-theme', t);
	}
  }

  function setTheme(t: Theme) {
	theme = t;
	try {
	  localStorage.setItem(THEME_KEY, t);
	} catch {
	  // ignore storage errors (e.g. private mode)
	}
	applyTheme(t);
  }

  onMount(() => {
	try {
	  const stored = localStorage.getItem(THEME_KEY) as Theme | null;
	  if (stored === 'light' || stored === 'dark' || stored === 'system') {
		theme = stored;
	  }
	} catch {
	  // ignore
	}

	applyTheme(theme);

	// react to system preference changes when using 'system'
	const mq = window.matchMedia('(prefers-color-scheme: dark)');
	const listener = () => {
	  if (theme === 'system') applyTheme('system');
	};

	if (mq.addEventListener) {
	  mq.addEventListener('change', listener);
	} else {
	  // fallback for older browsers
	  // @ts-ignore - legacy API
	  mq.addListener(listener);
	}

	return () => {
	  if (mq.removeEventListener) {
		mq.removeEventListener('change', listener);
	  } else {
		// @ts-ignore - legacy API
		mq.removeListener(listener);
	  }
	};
  });
</script>

<div class="theme-selector" role="group" aria-label="Theme selector">
  <button
	type="button"
	class="btn"
	aria-pressed={theme === 'light'}
	onclick={() => setTheme('light')}
	title="Light theme"
  >
	☀️ Light
  </button>

  <button
	type="button"
	class="btn"
	aria-pressed={theme === 'dark'}
	onclick={() => setTheme('dark')}
	title="Dark theme"
  >
	🌙 Dark
  </button>

  <button
	type="button"
	class="btn"
	aria-pressed={theme === 'system'}
	onclick={() => setTheme('system')}
	title="Use system preference"
  >
	🖥️ System
  </button>
</div>

<style>
  .theme-selector {
	display: inline-flex;
	gap: 0.5rem;
	align-items: center;
  }

  .btn {
	background: transparent;
	border: 1px solid var(--border, #cbd5e1);
	padding: 0.375rem 0.75rem;
	border-radius: 0.375rem;
	cursor: pointer;
	font-size: 0.9rem;
  }

  .btn[aria-pressed="true"] {
	background: var(--accent, #111827);
	color: white;
	border-color: transparent;
  }
</style>

