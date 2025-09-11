<script lang="ts">
  // Runes mode props
  const {
    name,
    errors = undefined,
    describedBy = undefined,
    showError = true,
    inline = true,
    // Snippet props replacing legacy slots
    control = undefined,
    hint = undefined
  } = $props();

  const inputId = `${name}`;
  const errorId = `${name}-error`;
  const hasError = $derived(!!errors && errors.length > 0);
  const ariaDescribed = $derived([describedBy, hasError ? errorId : undefined].filter(Boolean).join(' ') || undefined);
</script>

<div class={inline ? 'flex flex-col gap-1' : ''}>
  {#if control}
    {#key control}
      {@render control?.({ inputId, fieldName: name })}
    {/key}
  {:else}
    <!-- Default control rendering (no provided control snippet) -->
    <input id={inputId} name={name} aria-describedby={ariaDescribed} class="border rounded px-2 py-1 text-sm" />
  {/if}
  {#if showError && hasError}
    <p id={errorId} class="text-xs text-red-600" role="alert">{errors[0]}</p>
  {/if}
</div>

<!-- Hint snippet rendering -->
{@render hint?.({ inputId, fieldName: name })}

<!-- Usage example (runes mode snippet prop):
<FormField name="title" errors={$form.errors.title} control={({ inputId, fieldName }) => (
  <Input id={inputId} name={fieldName} bind:value={$form.title} aria-invalid={hasError} aria-describedby={ariaDescribed} />
)} />
-->
