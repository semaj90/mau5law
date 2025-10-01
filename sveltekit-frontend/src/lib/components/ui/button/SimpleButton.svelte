<script lang="ts">
  // Simple, typed button component - Svelte 5
  let {
    type = 'button' as 'button' | 'submit' | 'reset',
    variant = 'primary' as 'primary' | 'secondary',
    disabled = false,
    ariaLabel = undefined as string | undefined
  }: {
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
    ariaLabel?: string;
  } = $props();
</script>

<style>
  .btn {
	padding: 0.5rem 1rem;
	border-radius: 6px;
	border: none;
	cursor: pointer;
	font-size: 1rem;
	line-height: 1;
	display: inline-flex;
	align-items: center;
	justify-content: center;
  }

  .primary {
	background-color: #0b72ff;
	color: #fff;
  }

  .secondary {
	background-color: #e5e7eb;
	color: #111827;
  }

  .btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
  }
</style>

<button
  class="btn {variant}"
  {type}
  {disabled}
  aria-label={ariaLabel}
>
  <slot />
</button>
