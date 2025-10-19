<script lang="ts">
  import ButtonImpl from './ButtonImpl.svelte';
  export { default as ButtonImpl } from './ButtonImpl.svelte';

  // Use the Svelte component's $$prop_def to derive the props type
  import type ButtonImplType from './ButtonImpl.svelte';
  export type ButtonProps = ButtonImplType['$$prop_def'];

  type $$Slots = {
    default: {}; // Declare that the component accepts a default slot
  };
</script>

<button>
  <slot /> <!-- Ensure there is a slot to render children -->
</button>
