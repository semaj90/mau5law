
import { writable } from "svelte/store";
// Orphaned content: import type { Evidence

// Sidebar state
export const sidebarStore = writable({
  open: false,
  width: 320,
  items: [] as any[],
  searchQuery: "",
  loading: false,
});

// Toolbar state
export const toolbarStore = writable({
  selectedTool: "select",
  formatting: {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    fontSize: 16,
    fontFamily: "Arial",
    color: "#000000",
    backgroundColor: "transparent",
    textAlign: "left",
  },
  drawing: {
    strokeWidth: 2,
    strokeColor: "#000000",
    fillColor: "transparent",
    opacity: 1,
  },
  zoom: 100,
  canUndo: false,
  canRedo: false,
});

// Canvas state
export const canvasStore = writable({
  width: 800,
  height: 600,
  objects: [] as any[],
  selectedObjects: [] as any[],
  clipboard: null as any,
  isDirty: false,
  isLoading: false,
  panX: 0,
  panY: 0,
  scale: 1,
});

// AI state
export const aiStore = writable({
  dialogOpen: false,
  selectedVibe: "professional",
  prompt: "",
  response: "",
  isGenerating: false,
  history: [] as any[],
});

// File upload state
export const uploadStore = writable({
  isUploading: false,
  progress: 0,
  queue: [] as File[],
  uploadedFiles: [] as Evidence[],
});
