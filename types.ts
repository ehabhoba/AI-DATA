
// Data structure for the spreadsheet

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  color?: string;
  backgroundColor?: string;
  align?: 'left' | 'center' | 'right';
}

export interface Cell {
  value: string | number | boolean | null;
  style?: CellStyle;
}

export type Row = Cell[];
export type SheetData = Row[];

export interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string; // Base64 string for image support
  isError?: boolean;
  timestamp: number;
}

export enum OperationType {
  SET_CELL = 'SET_CELL',
  ADD_ROW = 'ADD_ROW',
  DELETE_ROW = 'DELETE_ROW',
  ADD_COL = 'ADD_COL',       // New: Add Column
  DELETE_COL = 'DELETE_COL', // New: Delete Column
  SET_DATA = 'SET_DATA',     // Replaces entire sheet
  FORMAT_CELL = 'FORMAT_CELL', // Updates style only
  CREATE_TABLE = 'CREATE_TABLE',
}

export interface SheetOperation {
  type: OperationType;
  row?: number; // 0-indexed
  col?: number; // 0-indexed
  value?: string | number;
  style?: CellStyle;
  data?: (string | number | null)[][]; // Simple data for bulk updates
  headers?: string[];
}

export interface AIResponse {
  message: string;
  operations: SheetOperation[];
}

// Database & Schema Types
export interface SchemaColumn {
  name: string;
  key: string; // CamelCase key for JSON
  type: 'String' | 'Number' | 'Boolean' | 'Date' | 'URL' | 'Unknown';
  sample: string | number | null;
}

export interface TableSchema {
  tableName: string;
  columns: SchemaColumn[];
  recordCount: number;
}

export type ViewMode = 'spreadsheet' | 'database';

// Flash Fill Types
export interface FlashFillUpdate {
  r: number;
  c: number;
  value: string | number | boolean;
}

export interface FlashFillSuggestion {
  name: string;
  updates: FlashFillUpdate[];
  sourceColIndex: number;
}
