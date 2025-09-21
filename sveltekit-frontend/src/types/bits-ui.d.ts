declare module 'bits-ui' {
  // Minimal ambient declarations for bits-ui used during development.
  // Use Svelte's SvelteComponentTyped constructor shape to avoid `any` ESLint/TS warnings.
  import type { SvelteComponentTyped } from 'svelte';

  type ComponentCtor = new (...args: unknown[]) => SvelteComponentTyped<unknown, unknown, unknown>;

  export const Dialog: ComponentCtor;
  export const Button: ComponentCtor;
  export const Badge: ComponentCtor;
  export const Card: ComponentCtor;
  export const Checkbox: ComponentCtor;
  export const Select: ComponentCtor;
  export const Tabs: ComponentCtor;
  export const Toast: ComponentCtor;
  export const Popover: ComponentCtor;
  export const Tooltip: ComponentCtor;
  export const Avatar: ComponentCtor;
  export const Menu: ComponentCtor;
  export const ScrollAreaViewport: ComponentCtor;

  const _default: {
    Dialog: ComponentCtor;
    Button: ComponentCtor;
    Badge: ComponentCtor;
    Card: ComponentCtor;
    Checkbox: ComponentCtor;
    Select: ComponentCtor;
    Tabs: ComponentCtor;
    Toast: ComponentCtor;
    Popover: ComponentCtor;
    Tooltip: ComponentCtor;
    Avatar: ComponentCtor;
    Menu: ComponentCtor;
    ScrollAreaViewport: ComponentCtor;
  };

  export default _default;
}
