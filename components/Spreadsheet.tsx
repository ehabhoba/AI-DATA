import React, { useState, useEffect } from 'react';
import { SheetData, Cell } from '../types';
import { Trash2, Plus, Eraser, MoreHorizontal } from 'lucide-react';

interface SpreadsheetProps {
  data: SheetData;
  onCellChange: (rowIndex: number, colIndex: number, value: string) => void;
  onDeleteRow?: (rowIndex: number) => void;
  onAddRow?: (rowIndex: number) => void;
  highlightedCell?: { r: number, c: number } | null;
}

const Spreadsheet: React.FC<SpreadsheetProps> = ({ data, onCellChange, highlightedCell, onDeleteRow, onAddRow }) => {
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, rowIndex: number } | null>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, rowIndex: number) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, rowIndex });
  };

  // Safety check for data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 bg-white border rounded-lg">
        <p>لا توجد بيانات لعرضها.</p>
      </div>
    );
  }

  // Calculate max columns safely ignoring undefined rows
  const maxCols = Math.max(
    ...data.map(row => (row ? row.length : 0)), 
    5
  ); 
  const cols = Array.from({ length: maxCols }, (_, i) => i);

  // Generate column headers (A, B, C...)
  const getColumnLabel = (index: number) => {
    let label = '';
    let i = index;
    while (i >= 0) {
      label = String.fromCharCode((i % 26) + 65) + label;
      i = Math.floor(i / 26) - 1;
    }
    return label;
  };

  return (
    <div className="overflow-auto border rounded-lg shadow-sm bg-white h-full relative" style={{ direction: 'ltr' }}>
      <table className="border-collapse w-full text-sm table-fixed">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            <th className="border border-gray-300 w-12 bg-gray-200 p-1 text-center font-semibold text-gray-600">#</th>
            {cols.map((colIndex) => (
              <th key={colIndex} className="border border-gray-300 p-2 w-[120px] text-center font-semibold text-gray-700">
                {getColumnLabel(colIndex)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => {
            // Check if row is defined
            if (!row) return null;

            return (
              <tr 
                key={rowIndex} 
                className="hover:bg-blue-50 transition-colors group"
                onContextMenu={(e) => handleContextMenu(e, rowIndex)}
              >
                <td className="border border-gray-300 bg-gray-50 text-center text-gray-500 font-mono select-none relative">
                  {rowIndex + 1}
                  {/* Row Indicator for context menu hint */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </td>
                {cols.map((colIndex) => {
                  // Fallback for undefined cell or row hole
                  const cell: Cell = row[colIndex] || { value: '', style: {} };
                  const style = cell.style || {};
                  const isHighlighted = highlightedCell?.r === rowIndex && highlightedCell?.c === colIndex;
                  
                  return (
                    <td 
                      key={`${rowIndex}-${colIndex}`} 
                      className={`border border-gray-300 p-0 relative ${isHighlighted ? 'ring-2 ring-yellow-400 z-20' : ''}`}
                      style={{
                        backgroundColor: isHighlighted ? '#fef9c3' : (style.backgroundColor || 'transparent')
                      }}
                    >
                      <input 
                        type="text"
                        className="w-full h-full p-2 bg-transparent outline-none border-none text-gray-900 focus:bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:ring-inset z-10 relative truncate"
                        value={cell.value !== undefined && cell.value !== null ? String(cell.value) : ''}
                        onChange={(e) => onCellChange(rowIndex, colIndex, e.target.value)}
                        style={{
                          color: style.color || 'inherit',
                          fontWeight: style.bold ? 'bold' : 'normal',
                          fontStyle: style.italic ? 'italic' : 'normal',
                          textAlign: style.align || 'left'
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed bg-white border border-gray-200 shadow-xl rounded-lg py-1 z-50 w-48 animate-in fade-in zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          dir="rtl"
        >
           <button 
             onClick={() => onDeleteRow?.(contextMenu.rowIndex)}
             className="w-full text-right px-4 py-2 hover:bg-red-50 text-red-600 text-sm flex items-center gap-2"
           >
             <Trash2 size={16} /> حذف الصف {contextMenu.rowIndex + 1}
           </button>
           <button 
             onClick={() => onAddRow?.(contextMenu.rowIndex)}
             className="w-full text-right px-4 py-2 hover:bg-gray-50 text-gray-700 text-sm flex items-center gap-2"
           >
             <Plus size={16} /> إضافة صف أسفل
           </button>
        </div>
      )}
    </div>
  );
};

export default Spreadsheet;