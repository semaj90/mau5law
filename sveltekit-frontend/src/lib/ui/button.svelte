<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'danger' = 'primary';
  export let disabled = false;
  export let type: 'button' | 'submit' = 'button';
  export let onclick: (() => void) | undefined = undefined;
</script>

<button
  {type}
  {disabled}
  onclick={onclick}
  class={variant === 'primary'
    ? 'btn-primary'
    : variant === 'secondary'
      ? 'btn-secondary'
      : 'btn-danger'}
>
  <slot />
</button>
