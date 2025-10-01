<script lang="ts">
  let {
    className = '',
    disabled = false,
    onclick,
    onitemclick
  }: {
    className?: string;
    disabled?: boolean;
    onclick?: (e: MouseEvent) => void;
    onitemclick?: (e: MouseEvent) => void;
  } = $props();

  function handleClick(e: MouseEvent) {
    if (disabled) {
      e.preventDefault();
      return;
    }
    // notify parent usage and bubble original click
    onclick?.(e);
    onitemclick?.(e);
  }
</script>

<button
  class={`dropdown-item ${className}`}
  role="menuitem"
  onclick={handleClick}
  disabled={disabled}
>
  {@render children()}
</button>
