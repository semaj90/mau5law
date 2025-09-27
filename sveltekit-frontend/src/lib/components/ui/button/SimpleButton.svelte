<script lang="ts">
  // Simple, typed button component
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let variant: 'primary' | 'secondary' = 'primary';
  export let disabled: boolean = false;
  export let ariaLabel: string | undefined;

  // Optional click handler can be provided by consumers via on:click
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
  type={type}
  disabled={disabled}
  aria-label={ariaLabel}
>
  <slot />
</button>
