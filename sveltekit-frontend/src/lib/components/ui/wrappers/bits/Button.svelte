<script lang="ts">
  import { onMount } from 'svelte';
  import { getBitsOverrides } from './bits-overrides';

  export let className: string = '';
  export let disabled: boolean = false;
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let ariaLabel: string | undefined;
  export let onclick: ((evt: MouseEvent) => void) | undefined;

  let Btn: unknown = null;
  const overrides = getBitsOverrides();
  if (overrides && overrides.Button) {
    Btn = overrides.Button;
  }

  onMount(async () => {
    if (Btn) return;
    try {
      // dynamic import typed loosely on purpose (runtime fallback)
      const mod: any = await import('bits-ui');
      Btn = mod?.Button?.Root ?? mod?.Button ?? mod?.default ?? null;
    } catch (err) {
      // keep Btn null to fall back to native button
      Btn = null;
      // eslint-disable-next-line no-console
      console.debug('bits-ui not available at runtime for Button wrapper', err);
    }
  });

  function handleClick(e: MouseEvent) {
    if (disabled) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    onclick?.(e);
  }
</script>

{#if Btn}
  <svelte:component this={Btn} class={className} disabled={disabled} {type} aria-label={ariaLabel} on:click={handleClick}>
    <slot />
  </svelte:component>
{:else}
  <button class={className} disabled={disabled} {type} aria-label={ariaLabel} on:click={handleClick}>
    <slot />
  </button>
{/if}
