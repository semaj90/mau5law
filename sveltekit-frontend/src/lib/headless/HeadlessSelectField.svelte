<script lang="ts">
  import * as Select from '$lib/components/ui/select/index.js';
  import FormField from './FormField.svelte';
  import { createEventDispatcher, onMount } from 'svelte';

  // Using custom wrapper and bits-ui re-exports; some may be undefined if not provided
  const SelectRoot = (Select as any).Select || (Select as any).Root || Select.default || (Select as any);
  const SelectTrigger = (Select as any).SelectTrigger || (Select as any).Trigger || (Select as any).SelectTrigger || (Select as any).Select?.Trigger;
  const SelectContent = (Select as any).SelectContent || (Select as any).Content || (Select as any).Select?.Content;
  const SelectValue = (Select as any).SelectValue || (Select as any).Value || (Select as any).Select?.Value;
  const SelectItem = (Select as any).SelectItem || (Select as any).Item || (Select as any).Select?.Item;

  const dispatch = createEventDispatcher<{ change: { name: string; value: string | null } }>();

  // Runes props (read-only)
  const {
    name,
    value: incomingValue = undefined,
    selected: incomingSelected = undefined,
    options = [],
    placeholder = 'Select option',
    errors = undefined,
    disabled = false,
    autoSelectFirst = false,
    emptyOptionLabel = undefined,
    required = false,
    description = undefined,
    class: className = '',
    ...rest
  } = $props();

  // Internal controlled state mirror (uncontrolled fallback)
  let current = $state<string | null>(incomingSelected ?? incomingValue ?? null);

  $: normalized = options.map(o => typeof o === 'string' ? { value: o, label: o } : { value: o.value, label: o.label ?? o.value });

  // Sync down from external props if they change
  $: if (incomingSelected !== undefined && incomingSelected !== current) {
    current = incomingSelected;
  } else if (incomingValue !== undefined && incomingValue !== current) {
    current = incomingValue;
  }

  onMount(() => {
    if (autoSelectFirst && (current == null || current === '') && normalized.length > 0) {
      updateValue(normalized[0].value);
    }
  });

  function updateValue(v: string | null) {
    if (current === v) return;
    current = v;
    dispatch('change', { name, value: v });
  }
</script>

<FormField name={name} errors={errors}>
  <div slot="control" class={className} {...rest}>
    <SelectRoot bind:value={current} disabled={disabled} on:valueChange={(e: CustomEvent<string>) => updateValue(e.detail)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {#if emptyOptionLabel}
          <SelectItem value="">{emptyOptionLabel}</SelectItem>
        {/if}
        {#each normalized as opt (opt.value)}
          <SelectItem value={opt.value}>{opt.label}</SelectItem>
        {/each}
      </SelectContent>
    </SelectRoot>
    <input type="hidden" name={name} value={current || ''} />
  </div>
</FormField>
