
// YoRHa Table and Grid Components
export { default as YoRHaTable } from './YoRHaTable.svelte';
export { default as YoRHaDataGrid } from './YoRHaDataGrid.svelte';

// Table utilities and stores
export {
  tableManager,
  createTableStats,
  formatTableData,
  exportTableData,
  legalAITableConfigs,
  type TableState,
  type TableNotification
} from '$lib/stores/tables';

// Table-related types for components  
export interface YoRHaTableColumn {
  key: string;
  title: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'number' | 'date' | 'status' | 'action';
}

export interface YoRHaTableRow {
  id: string | number;
    [key: string]: unknown;
  }

export interface YoRHaGridColumn {
  key: string;
  title: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  editable?: boolean;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'action';
    options?: Array<{ label: string; value: any }>;
    formatter?: (value: any, row: any) => string;
    validator?: (value: any) => boolean | string;
  }

// (presets and utilities omitted for brevity in this quick fix)
export const yorhaTablePresets = {} as const;
export const yorhaGridPresets = {} as const;
;
// Status formatters for legal AI
export const statusFormatters = {
    caseStatus: (status: string) => status?.toUpperCase() || 'UNKNOWN',
    priority: (p: string) => p?.toUpperCase() || 'NORMAL',
    evidenceType: (t: string) => t?.toUpperCase() || 'OTHER',
    userRole: (r: string) => r?.toUpperCase() || 'USER'
  };

// Import stores used in convenience object
import {
  tableManager as importedTableManager,
  createTableStats as importedCreateTableStats
} from '$lib/stores/tables';

// Export convenience object as named export only
export const YoRHa = {
  YoRHaTable: () => import('./YoRHaTable.svelte'),
  YoRHaDataGrid: () => import('./YoRHaDataGrid.svelte'),
  tableManager: importedTableManager,
  createTableStats: importedCreateTableStats,
  yorhaTablePresets,
  yorhaGridPresets,
  statusFormatters
};