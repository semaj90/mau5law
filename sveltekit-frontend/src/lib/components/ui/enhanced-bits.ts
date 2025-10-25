import DropdownRoot from './BitsDropdown/Root.svelte';
import DropdownTrigger from './BitsDropdown/Trigger.svelte';
import DropdownContent from './BitsDropdown/Content.svelte';
import DropdownItem from './BitsDropdown/Item.svelte';
import DropdownSeparator from './BitsDropdown/Separator.svelte';
import Button from './button/Button.svelte';
import Card from './Card.svelte';
import CardHeader from './CardHeader.svelte';
import CardTitle from './CardTitle.svelte';
import CardContent from './CardContent.svelte';
import { default as Input } from './input/InputBits.svelte';
import { default as Label } from './label/LabelCompat.svelte';
import { default as Select } from './select/Select.svelte';
import * as Dialog from './dialog/index';
import { default as Textarea } from './textarea/Textarea.svelte';
import { default as Separator } from './separator/Separator.svelte';

// Named exports for new code
export {
  DropdownRoot,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Label,
  Select,
  Dialog,
  Textarea,
  Separator,
};

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
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Label,
  Select,
  Dialog,
  Textarea,
  Separator,
  DropdownMenu,
};
