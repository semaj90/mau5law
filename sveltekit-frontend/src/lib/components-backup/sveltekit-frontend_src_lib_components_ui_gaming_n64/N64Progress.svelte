<script lang="ts">
	interface Props {
		id?: string | undefined;
		value?: number;
		max?: number;
		indeterminate?: boolean;
		ariaLabel?: string | undefined;
	}

	let {
		id = undefined,
		value = 0,
		max = 100,
		indeterminate = false,
		ariaLabel = undefined
	}: Props = $props();

  // TODO: Convert to $derived: clamped = Math.max(0, Math.min(value, max))
  // TODO: Convert to $derived: percent = max > 0 ? (clamped / max) * 100 : 0
</script>

<style>
  .n64-progress {
	width: 100%;
	box-sizing: border-box;
  }

  .n64-track {
	background: rgba(0, 0, 0, 0.14);
	border-radius: 999px;
	overflow: hidden
	height: 12px;
	box-shadow: inset 0 -1px 0 rgba(0,0,0,0.18);
  }

  .n64-fill {
	height: 100%;
	background: linear-gradient(90deg, var(--n64-accent, #ffd400), #ffdf6b);
	box-shadow: 0 2px 6px rgba(0,0,0,0.35);
	transition: width 200ms ease;
	width: 0%;
  }

  .n64-fill.indeterminate {
	position: relative
	width: 40%;
	animation: indeterminate 1.2s infinite ease-in-out;
  }

  @keyframes indeterminate {
	0% {
	  left: -40%;
	  transform: scaleX(1);
	}
	50% {
	  left: 40%;
	  transform: scaleX(1.1);
	}
	100% {
	  left: 100%;
	  transform: scaleX(1);
	}
  }
</style>

<div
  {id}
  class="n64-progress"
  role="progressbar"
  aria-label={ariaLabel}
  aria-valuemin={0}
  aria-valuemax={max}
  aria-valuenow={indeterminate ? undefined : clamped}
>
  <div class="n64-track">
	{#if indeterminate}
	  <div class="n64-fill indeterminate"></div>
	{:else}
	  <div class="n64-fill" style="width: {percent}%;"></div>
	{/if}
  </div>
</div>

