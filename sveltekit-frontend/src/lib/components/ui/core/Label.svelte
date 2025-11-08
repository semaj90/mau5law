<script lang="ts">
  export let forId: string | undefined = undefined;
  export let className: string = '';
  export let text: string = '';
</script>

<label {...forId ? { for: forId } : {}} class={className}>
  {#if text}
    {text}
  {:else}
    <slot />
  {/if}
</label>
