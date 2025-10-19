// Loose module declarations for @tiptap packages to silence TS module-not-found/type errors.

declare module '@tiptap/core' {
  const TipTapCore: any;
  export const Editor: any;
  export default TipTapCore;
}

declare module '@tiptap/starter-kit' {
  const StarterKit: any;
  export default StarterKit;
}

declare module '@tiptap/extension-image' { const mod: any; export default mod; }
declare module '@tiptap/extension-text-align' { const mod: any; export default mod; }
declare module '@tiptap/extension-highlight' { const mod: any; export default mod; }
declare module '@tiptap/extension-typography' { const mod: any; export default mod; }
declare module '@tiptap/extension-placeholder' { const mod: any; export default mod; }
declare module '@tiptap/extension-table' { const mod: any; export default mod; }
declare module '@tiptap/extension-table-row' { const mod: any; export default mod; }
declare module '@tiptap/extension-table-header' { const mod: any; export default mod; }
declare module '@tiptap/extension-table-cell' { const mod: any; export default mod; }
declare module '@tiptap/extension-text-style' { const mod: any; export default mod; }
declare module '@tiptap/extension-color' { const mod: any; export default mod; }
declare module '@tiptap/extension-font-family' { const mod: any; export default mod; }

// Fallback catch-all for any other @tiptap/* modules
declare module '@tiptap/*' {
  const mod: any;
  export default mod;
}
