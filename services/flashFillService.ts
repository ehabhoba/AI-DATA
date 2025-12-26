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
  if (targetVal.length < 1) return null; // Relaxed length check

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
    const delimiters = [' ', ',', '.', '-', '_', '@', '/', '|'];
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

         if (targetVal === targetVal.toUpperCase() && sourceVal !== sourceVal.toUpperCase()) {
             type = "تحويل لأحرف كبيرة";
             transform = (s) => s.toUpperCase();
         } else if (targetVal === targetVal.toLowerCase() && sourceVal !== sourceVal.toLowerCase()) {
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

    // --- Pattern 4: Combination (First + Last) ---
    // This requires checking a SECOND source column, which complicates the loop O(n^2).
    // For now, we stick to 1:1 derivation for performance.
  }

  return null;
};

/**
 * Scans the entire sheet to find potential fill opportunities.
 * Returns the suggestion with the most potential updates.
 */
export const scanForFlashFillPatterns = (data: SheetData): FlashFillSuggestion | null => {
    if (!data || data.length < 2) return null;

    let bestSuggestion: FlashFillSuggestion | null = null;
    let maxUpdates = 0;

    const rowCount = data.length;
    // Limit to first 20 columns to avoid freezing large sheets
    const colCount = Math.min(data[0]?.length || 0, 20); 

    // Iterate through columns that might need filling (Target Columns)
    for (let targetCol = 0; targetCol < colCount; targetCol++) {
        
        // Find a non-empty cell in this target column to use as a "seed" for pattern detection
        // We look for the last non-empty cell as it's likely the user just typed it
        let seedRowIdx = -1;
        
        // Find a row where Target is filled AND potential Source is filled
        for (let r = rowCount - 1; r >= 1; r--) {
             const cell = data[r][targetCol];
             if (cell && cell.value !== '' && cell.value !== null) {
                 seedRowIdx = r;
                 break;
             }
        }

        if (seedRowIdx !== -1) {
            const seedValue = data[seedRowIdx][targetCol].value;
            // Attempt to detect pattern using this seed
            const suggestion = detectFlashFillPattern(data, seedRowIdx, targetCol, seedValue);
            
            if (suggestion && suggestion.updates.length > maxUpdates) {
                maxUpdates = suggestion.updates.length;
                bestSuggestion = suggestion;
            }
        }
    }

    return bestSuggestion;
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