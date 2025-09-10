<script>
</script>
  import './N64Theme.css';

  // Dimensions can be strings like "320px" or "100%"
  export let width = '560px';
  export let height = '420px';

  // variant: "info" | "success" | "warning" | "error"
  export let variant = 'info';

  export let ariaLabel = 'N64 Screen';
</script>

<div
  class="n64-screen {variant}"
  role="region"
  aria-label={ariaLabel}
  style="width: {width}; height: {height};"
>
  <div class="screen-content" tabindex="0">
	<slot>
	  <!-- default fallback content -->
	  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
		<rect width="24" height="24" rx="4" fill="rgba(255,255,255,0.04)"></rect>
		<path d="M6 12h12" stroke="rgba(255,255,255,0.16)" stroke-width="1.5" stroke-linecap="round"></path>
	  </svg>
	</slot>
  </div>
</div>

<style>
  .n64-screen {
	background: linear-gradient(180deg, rgba(0,0,0,0.12), rgba(255,255,255,0.02)), var(--n64-bg-info);
	color: var(--n64-text);
	border-radius: calc(var(--n64-radius) + 4px);
	padding: 10px;
	box-shadow: var(--n64-shadow);
	display: inline-block;
	overflow: hidden;
	box-sizing: border-box;
  }

  .n64-screen.success {
	background: linear-gradient(180deg, rgba(0,0,0,0.12), rgba(255,255,255,0.02)), var(--n64-bg-success);
  }
  .n64-screen.warning {
	background: linear-gradient(180deg, rgba(0,0,0,0.12), rgba(255,255,255,0.02)), var(--n64-bg-warning);
  }
  .n64-screen.error {
	background: linear-gradient(180deg, rgba(0,0,0,0.12), rgba(255,255,255,0.02)), var(--n64-bg-error);
  }

  .n64-screen .screen-content {
	width: 100%;
	height: 100%;
	background: rgba(0,0,0,0.16);
	border-radius: calc(var(--n64-radius) - 2px);
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--n64-text);
	font-family: var(--n64-font-family);
	font-size: var(--n64-font-size);
	outline: none;
  }

  .n64-screen .screen-content:focus {
	box-shadow: 0 6px 18px rgba(0,0,0,0.28), 0 0 0 3px rgba(255,212,64,0.06);
  }
</style>

