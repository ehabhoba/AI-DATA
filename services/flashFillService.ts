import { SheetData, FlashFillSuggestion, FlashFillUpdate } from '../types';

/**
 * Detects basic patterns (Split, Substring, Email construction) based on the user's input
 * relative to other columns in the same row.
 */
export const detectFlashFillPattern = (
  data: SheetData,
  rowIdx: number,
  colIdx: number,
  value: string | number | boolean | null
): FlashFillSuggestion | null => {
  if (value === null || value === '') return null;
  
  const targetVal = String(value).trim();
  if (targetVal.length < 2) return null; // Ignore very short inputs

  const row = data[rowIdx];
  if (!row) return null;

  // We iterate through all other columns to see if 'targetVal' can be derived from them
  for (let c = 0; c < row.length; c++) {
    if (c === colIdx) continue;
    
    const cell = row[c];
    if (!cell || cell.value === null || cell.value === '') continue;
    
    const sourceVal = String(cell.value).trim();
    if (sourceVal === targetVal) continue; // Exact match, probably copy-paste, ignore

    // --- Pattern 1: Delimiter Split (e.g. "John" from "John Doe") ---
    const delimiters = [' ', ',', '.', '-', '_', '@', '/'];
    for (const delim of delimiters) {
      if (sourceVal.includes(delim)) {
        const parts = sourceVal.split(delim);
        
        // Check if target matches exactly one of the parts
        const partIndex = parts.findIndex(p => p.trim() === targetVal);
        if (partIndex !== -1) {
          // Verify if this pattern is useful (i.e. applies to empty cells in this column)
          const updates = simulatePattern(data, c, colIdx, (val) => {
             const p = String(val).split(delim);
             return p[partIndex] ? p[partIndex].trim() : null;
          });

          if (updates.length > 0) {
            return {
              name: `استخراج النص (الفاصل: '${delim}')`,
              sourceColIndex: c,
              updates: updates
            };
          }
        }
        
        // Check if target matches the *rest* (e.g. "Doe" from "John Doe" - might be index 1 onwards)
        // This is simplified, let's stick to single part extraction for robustness first
      }
    }

    // --- Pattern 2: Email Generation (Basic) ---
    // If target looks like email, check if it contains sourceVal
    if (targetVal.includes('@') && targetVal.toLowerCase().includes(sourceVal.toLowerCase())) {
        const domain = targetVal.split('@')[1];
        if (domain) {
           const updates = simulatePattern(data, c, colIdx, (val) => {
               const cleanSource = String(val).trim().toLowerCase().replace(/\s+/g, '');
               return `${cleanSource}@${domain}`;
           });
           if (updates.length > 0) {
               return {
                   name: `إنشاء بريد إلكتروني (@${domain})`,
                   sourceColIndex: c,
                   updates: updates
               };
           }
        }
    }
    
    // --- Pattern 3: Case Transformation ---
    if (sourceVal.toLowerCase() === targetVal.toLowerCase()) {
         let type = "";
         let transform: ((s: string) => string) | null = null;

         if (targetVal === targetVal.toUpperCase()) {
             type = "تحويل لأحرف كبيرة";
             transform = (s) => s.toUpperCase();
         } else if (targetVal === targetVal.toLowerCase()) {
             type = "تحويل لأحرف صغيرة";
             transform = (s) => s.toLowerCase();
         }
         
         if (transform) {
             const updates = simulatePattern(data, c, colIdx, (val) => transform!(String(val)));
             if (updates.length > 0) {
                 return { name: type, sourceColIndex: c, updates };
             }
         }
    }
  }

  return null;
};

/**
 * Generates updates for the target column based on the transformation rule.
 * Only targets EMPTY cells to avoid overwriting user data.
 */
const simulatePattern = (
    data: SheetData, 
    sourceCol: number, 
    targetCol: number, 
    transform: (source: string | number | boolean) => string | null
): FlashFillUpdate[] => {
    const updates: FlashFillUpdate[] = [];
    
    // We check a max of 200 rows for performance in this demo
    // Start from row 0 to catch missed ones, or start from current row? 
    // Usually Flash Fill fills the whole column.
    
    for (let r = 0; r < data.length; r++) {
        const targetCell = data[r][targetCol];
        const sourceCell = data[r][sourceCol];
        
        // Skip if target is already filled (we only fill empty cells)
        if (targetCell && (targetCell.value !== '' && targetCell.value !== null)) continue;
        
        // Skip if source is empty
        if (!sourceCell || sourceCell.value === '' || sourceCell.value === null) continue;

        const result = transform(sourceCell.value);
        if (result !== null && result !== '') {
            updates.push({ r, c: targetCol, value: result });
        }
    }

    return updates;
};
