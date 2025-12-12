import React, { useState, useEffect } from 'react';
import { SheetData, Cell } from '../types';
import { Trash2, Plus, ArrowRight, ArrowLeft, ArrowDown, ArrowUp, Lock } from 'lucide-react';

interface SpreadsheetProps {
  data: SheetData;
  onCellChange: (rowIndex: number, colIndex: number, value: string) => void;
  onDeleteRow?: (rowIndex: number) => void;
  onAddRow?: (rowIndex: number) => void;
  onDeleteCol?: (colIndex: number) => void;
  onAddCol?: (colIndex: number) => void;
  highlightedCell?: { r: number, c: number } | null;
  selectedCell?: { r: number, c: number } | null;
  onSelect?: (rowIndex: number, colIndex: number) => void;
  readOnly?: boolean;
}

const Spreadsheet: React.FC<SpreadsheetProps> = ({ 
  data, 
  onCellChange, 
  highlightedCell, 
  onDeleteRow, 
  onAddRow,
  onAddCol,
  onDeleteCol,
  selectedCell,
  onSelect,
  readOnly = false
}) => {
  // Context Menu State: Type (row/col), position (x,y), and index
  const [contextMenu, setContextMenu] = useState<{ 
    type: 'row' | 'col', 
    x: number, 
    y: number, 
    index: number 
  } | null>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleRowContextMenu = (e: React.MouseEvent, rowIndex: number) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ type: 'row', x: e.pageX, y: e.pageY, index: rowIndex });
  };

  const handleColContextMenu = (e: React.MouseEvent, colIndex: number) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ type: 'col', x: e.pageX, y: e.pageY, index: colIndex });
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
    <div className={`overflow-auto border rounded-lg shadow-sm bg-white h-full relative ${readOnly ? 'cursor-wait' : ''}`} style={{ direction: 'ltr' }}>
      
      {/* Read Only Overlay */}
      {readOnly && (
        <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-[1px] flex items-center justify-center animate-in fade-in duration-300">
            <div className="bg-white px-6 py-3 rounded-full shadow-lg border border-gray-200 flex items-center gap-2 animate-pulse">
                <Lock size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-600">الجدول مقفل أثناء المعالجة...</span>
            </div>
        </div>
      )}

      <table className="border-collapse w-full text-sm table-fixed">
        <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
          <tr>
            <th className="border border-gray-300 w-12 bg-gray-200 p-1 text-center font-semibold text-gray-600">#</th>
            {cols.map((colIndex) => (
              <th 
                key={colIndex} 
                className={`border border-gray-300 p-2 w-[120px] text-center font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer select-none transition-colors group ${selectedCell?.c === colIndex ? 'bg-blue-100 text-blue-800' : ''}`}
                onContextMenu={(e) => handleColContextMenu(e, colIndex)}
                title={readOnly ? "مقفل" : "انقر بزر الماوس الأيمن للخيارات"}
              >
                {getColumnLabel(colIndex)}
                {!readOnly && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500 opacity-0 group-hover:opacity-100"></div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => {
            if (!row) return null;

            return (
              <tr 
                key={rowIndex} 
                className={`transition-colors group ${selectedCell?.r === rowIndex ? 'bg-blue-50/50' : 'hover:bg-blue-50'}`}
              >
                <td 
                  className={`border border-gray-300 bg-gray-50 text-center text-gray-500 font-mono select-none cursor-pointer hover:bg-gray-200 relative ${selectedCell?.r === rowIndex ? 'bg-blue-100 text-blue-800 font-bold' : ''}`}
                  onContextMenu={(e) => handleRowContextMenu(e, rowIndex)}
                >
                  {rowIndex + 1}
                  {!readOnly && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                </td>
                {cols.map((colIndex) => {
                  const cell: Cell = row[colIndex] || { value: '', style: {} };
                  const style = cell.style || {};
                  
                  // Priority: Highlight (Find) > Selection > Default Style
                  const isHighlighted = highlightedCell?.r === rowIndex && highlightedCell?.c === colIndex;
                  const isSelected = selectedCell?.r === rowIndex && selectedCell?.c === colIndex;
                  
                  return (
                    <td 
                      key={`${rowIndex}-${colIndex}`} 
                      className={`border border-gray-300 p-0 relative ${
                        isHighlighted ? 'ring-2 ring-yellow-400 z-20' : 
                        isSelected ? 'ring-2 ring-blue-500 z-20' : ''
                      }`}
                      style={{
                        backgroundColor: isHighlighted ? '#fef9c3' : (style.backgroundColor || 'transparent')
                      }}
                      onClick={() => !readOnly && onSelect?.(rowIndex, colIndex)}
                    >
                      <input 
                        type="text"
                        disabled={readOnly}
                        className={`w-full h-full p-2 bg-transparent outline-none border-none text-gray-900 focus:bg-white z-10 relative truncate font-sans ${readOnly ? 'cursor-not-allowed text-gray-500' : ''}`}
                        value={cell.value !== undefined && cell.value !== null ? String(cell.value) : ''}
                        onChange={(e) => onCellChange(rowIndex, colIndex, e.target.value)}
                        onFocus={() => !readOnly && onSelect?.(rowIndex, colIndex)}
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
      {contextMenu && !readOnly && (
        <div 
          className="fixed bg-white border border-gray-200 shadow-2xl rounded-lg py-1 z-50 w-56 animate-in fade-in zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          dir="rtl"
        >
           {contextMenu.type === 'row' ? (
             <>
                <button 
                  onClick={() => onDeleteRow?.(contextMenu.index)}
                  className="w-full text-right px-4 py-2 hover:bg-red-50 text-red-600 text-sm flex items-center gap-2"
                >
                  <Trash2 size={16} /> حذف الصف {contextMenu.index + 1}
                </button>
                <button 
                  onClick={() => onAddRow?.(contextMenu.index)}
                  className="w-full text-right px-4 py-2 hover:bg-gray-50 text-gray-700 text-sm flex items-center gap-2"
                >
                  <ArrowDown size={16} /> إضافة صف أسفل
                </button>
             </>
           ) : (
             <>
                <button 
                  onClick={() => onDeleteCol?.(contextMenu.index)}
                  className="w-full text-right px-4 py-2 hover:bg-red-50 text-red-600 text-sm flex items-center gap-2"
                >
                  <Trash2 size={16} /> حذف العمود {getColumnLabel(contextMenu.index)}
                </button>
                <button 
                  onClick={() => onAddCol?.(contextMenu.index)}
                  className="w-full text-right px-4 py-2 hover:bg-gray-50 text-gray-700 text-sm flex items-center gap-2"
                >
                  <ArrowLeft size={16} /> إضافة عمود لليسار
                </button>
                 <button 
                  onClick={() => onAddCol?.(contextMenu.index + 1)}
                  className="w-full text-right px-4 py-2 hover:bg-gray-50 text-gray-700 text-sm flex items-center gap-2"
                >
                  <ArrowRight size={16} /> إضافة عمود لليمين
                </button>
             </>
           )}
        </div>
      )}
    </div>
  );
};

export default Spreadsheet;