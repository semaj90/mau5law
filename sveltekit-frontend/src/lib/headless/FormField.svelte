<script lang="ts">
  // Runes mode props
  const {
    name,
    errors = undefined,
    describedBy = undefined,
    showError = true,
    inline = true
  } = $props();

  const inputId = `${name}`;
  const errorId = `${name}-error`;
  const hasError = $derived(!!errors && errors.length > 0);
  const ariaDescribed = $derived([describedBy, hasError ? errorId : undefined].filter(Boolean).join(' ') || undefined);
</script>

<div class={inline ? 'flex flex-col gap-1' : ''}>
  <slot
    name="control"
    {inputId}
    fieldName={name}
    let:attrs
  >
    <!-- Default: forward id/name/aria -->
    <slot {inputId} />
  </slot>
  {#if showError && hasError}
    <p id={errorId} class="text-xs text-red-600" role="alert">{errors[0]}</p>
  {/if}
</div>

<!-- Expose helper data via slots -->
<slot name="hint" />

<!-- Usage example:
<FormField name="title" errors={$form.errors.title}>
  <Input slot="control" bind:value={$form.title} id={inputId} name="title" aria-invalid={hasError} aria-describedby={ariaDescribed} />
</FormField>
-->
