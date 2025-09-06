
// Missing type definitions for external libraries

declare module 'fuse.js' {
  interface FuseOptions<T> {
    keys?: Array<string | { name: string; weight: number }>;
    threshold?: number;
    includeScore?: boolean;
    includeMatches?: boolean;
    minMatchCharLength?: number;
    ignoreLocation?: boolean;
    findAllMatches?: boolean;
    location?: number;
    distance?: number;
    useExtendedSearch?: boolean;
    getFn?: (obj: T, path: string) => string | string[];
  }

  interface FuseResult<T> {
    item: T;
    score?: number;
    matches?: unknown[];
  }

  class Fuse<T> {
    constructor(list: T[], options?: FuseOptions<T>);
    search(pattern: string): FuseResult<T>[];
    setCollection(docs: T[]): void;
    add(doc: T): void;
    remove(predicate: (doc: T, idx: number) => boolean): T[];
  }

  export = Fuse;
}

declare module '@tiptap/extension-table-row' {
  import { Node } from '@tiptap/core';
  export interface TableRowOptions {
    HTMLAttributes?: Record<string, any>;
  }
  export const TableRow: Node<TableRowOptions>;
  export default TableRow;
}

declare module '@tiptap/extension-table-cell' {
  import { Node } from '@tiptap/core';
  export interface TableCellOptions {
    HTMLAttributes?: Record<string, any>;
    resizable?: boolean;
  }
  export const TableCell: Node<TableCellOptions>;
  export default TableCell;
}

declare module '@tiptap/extension-table-header' {
  import { Node } from '@tiptap/core';
  export interface TableHeaderOptions {
    HTMLAttributes?: Record<string, any>;
    resizable?: boolean;
  }
  export const TableHeader: Node<TableHeaderOptions>;
  export default TableHeader;
}

declare module '@tiptap/extension-table' {
  import { Node } from '@tiptap/core';
  export interface TableOptions {
    HTMLAttributes?: Record<string, any>;
    resizable?: boolean;
    handleWidth?: number;
    cellMinWidth?: number;
    View?: unknown;
    lastColumnResizable?: boolean;
    allowTableNodeSelection?: boolean;
  }
  export const Table: Node<TableOptions>;
  export default Table;
}

declare module '@tailwindcss/postcss' {
  const plugin: any;
  export default plugin;
}

// Global type declarations
declare global {
  interface Window {
    __TAURI__?: unknown;
    electronAPI?: unknown;
  }

  interface HTMLElement {
    inert?: boolean;
  }
}


