<script lang="ts">
  const { value: string = '', placeholder: string = '', disabled: boolean = false, id: string | undefined, name: string | undefined, className: string = '' } = $props();

  import { createEventDispatcher } from 'svelte';
  
  
  
  
  
  

  const dispatch = createEventDispatcher();

  function onInput(e: Event) {
  	const target = e.target as HTMLInputElement;
  	value = target.value;
  	dispatch('input', { value });
  }

  function onChange(e: Event) {
  	const target = e.target as HTMLInputElement;
  	value = target.value;
  	dispatch('change', { value });
  }
</script>

<input
  {id}
  {name}
  class="n64-textfield {className}"
  type="text"
  bind:value
  {placeholder}
  {disabled}
  oninput={onInput}
  onchange={onChange}
  aria-label={placeholder || 'N64 text field'}
/>

<style>
  .n64-textfield {
	box-sizing: border-box;
	padding: 0.5rem 0.75rem;
	border: 2px solid #3b3b3b;
	background: linear-gradient(180deg, #e6e6e6 0%, #cfcfcf 100%);
	color: #111;
	border-radius: 6px;
	outline: none;
	font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
	font-size: 0.95rem;
	transition: box-shadow 0.12s ease, transform 0.06s ease;
	box-shadow: inset 0 -2px 0 rgba(0,0,0,0.08);
  }

  .n64-textfield:focus {
	box-shadow: 0 0 0 3px rgba(66,153,225,0.12), inset 0 -2px 0 rgba(0,0,0,0.08);
	transform: translateY(-1px);
	border-color: #2b6cb0;
  }

  .n64-textfield[disabled] {
	opacity: 0.6;
	cursor: not-allowed;
  }
</style>

