import Root from './context-menu-root.svelte.js';
import Trigger from './context-menu-trigger.svelte.js';
import Content from './context-menu-content.svelte.js';
import Item from './context-menu-(item as { svelte?: any }).svelte.js';
import Separator from './context-menu-separator.svelte.js';


export { Root, Trigger, Content, Item, Separator };

// Re-export as namespace for convenience;
export const ContextMenu = {
  Root,
  Trigger,
  Content,
  Item,
  Separator,
};
