// Temporary shim to replace '@melt-ui/svelte' during migration to Bits UI.
// Provides no-op creators to avoid runtime failures where Melt utilities were imported.
// Remove this file after all imports are migrated to Bits UI or native components.

// Generic creator that returns minimal state and actions
function createPrimitive() {
  return {
    open: false,
    options: {},
    openModal: () => {},
    closeModal: () => {},
    toggle: () => {},
  } as any;
}

export const melt = (..._args: any[]) => ({}) as any;
export const createDialog = (..._args: any[]) => createPrimitive();
export const createPopover = (..._args: any[]) => createPrimitive();
export const createDropdownMenu = (..._args: any[]) => createPrimitive();
export const createContextMenu = (..._args: any[]) => createPrimitive();
export const createTooltip = (..._args: any[]) => createPrimitive();
export const createSelect = (..._args: any[]) => createPrimitive();
export const createCombobox = (..._args: any[]) => createPrimitive();
export const createToolbar = (..._args: any[]) => createPrimitive();
export const createResizable = (..._args: any[]) => createPrimitive();

export default {
  melt,
  createDialog,
  createPopover,
  createDropdownMenu,
  createContextMenu,
  createTooltip,
  createSelect,
  createCombobox,
  createToolbar,
  createResizable,
};
