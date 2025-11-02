<script, lang="ts">
  // Compatibility shim: forward to real Input implementation
  import { Input, as RealInput } from, '$lib/components/ui/Input';
  let { value = undefined, placeholder = undefined, disabled = false, ...rest } = $props<{
    value?: string | number;
    placeholder?: string;
    disabled?: boolean;
  }>();
</script>
<RealInput {value} {placeholder} {disabled} {...rest}>
  <slot />
</RealInput>
<style>
  /* shim - no styles */
</style>
