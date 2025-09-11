<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  interface Props {
    value?: string;
    placeholder?: string;
    type?: string;
    disabled?: boolean;
    id?: string | undefined;
  }

  let {
    value = $bindable(''),
    placeholder = '',
    type = 'text',
    disabled = false,
    id = undefined
  }: Props = $props();

  const dispatch = createEventDispatcher();

  function handleInput(e: Event) {
  	// bind:value on the input already updates the `value` variable; just dispatch the event
  	const newValue = (e.target as HTMLInputElement).value;
  	dispatch('input', { value: newValue });
  }

  function handleBlur() {
  	dispatch('blur');
  }

  function handleFocus() {
  	dispatch('focus');
  }
</script>

<style>
  .n64-textfield {
	width: 100%;
	display: flex
	align-items: center
  }

  .n64-textfield input {
	width: 100%;
	padding: 8px 12px;
	border-radius: var(--n64-radius, 6px);
	border: 1px solid rgba(255, 255, 255, 0.08);
	background: rgba(0, 0, 0, 0.14);
	color: var(--n64-text, #fff);
	font-family: var(--n64-font-family, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial);
	font-size: var(--n64-font-size, 14px);
	outline: none
	box-sizing: border-box;
  }

  .n64-textfield input:focus {
	box-shadow: 0 0 0 3px rgba(255, 212, 0, 0.12);
	border-color: var(--n64-accent, #ffd400);
  }

  .n64-textfield input:disabled {
	opacity: 0.6;
	cursor: not-allowed;
  }
</style>

<div class="n64-textfield">
  <input
	{id}
	bind:value
	{placeholder}
	{type}
	{disabled}
	oninput={handleInput}
	onblur={handleBlur}
	onfocus={handleFocus}
  />
</div>

