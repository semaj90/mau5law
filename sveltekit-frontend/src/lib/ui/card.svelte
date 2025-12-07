<script lang="ts">
  export let clickable = false;
  export let onclick: (() => void) | undefined = undefined;
</script>

<div
  class="panel-soft p-4 {clickable ? 'cursor-pointer hover:bg-panel' : ''}"
  role={clickable ? 'button' : undefined}
  tabindex={clickable ? 0 : undefined}
  onclick={onclick}
  onkeydown={(e) => {
    if (clickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onclick?.();
    }
  }}
>
  <slot />
</div>
