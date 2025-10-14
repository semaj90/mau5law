import DropdownRoot from './BitsDropdown/Root.svelte';
import DropdownTrigger from './BitsDropdown/Trigger.svelte';
import DropdownContent from './BitsDropdown/Content.svelte';
import DropdownItem from './BitsDropdown/Item.svelte';
import DropdownSeparator from './BitsDropdown/Separator.svelte';

// Named exports for new code
export { DropdownRoot, DropdownTrigger, DropdownContent, DropdownItem, DropdownSeparator };

// Compatibility namespace for legacy "bits.DropdownMenu.*" usage
export const DropdownMenu = {
  Root: DropdownRoot,
  Trigger: DropdownTrigger,
  Content: DropdownContent,
  Item: DropdownItem,
  Separator: DropdownSeparator,
};

// default export includes both for flexible imports
export default {
  DropdownRoot,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownMenu,
};
