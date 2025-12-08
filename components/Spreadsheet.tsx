import React from 'react';
import { SheetData, Cell } from '../types';
import { AlertCircle } from 'lucide-react';

interface SpreadsheetProps {
  data: SheetData;
  onCellChange: (rowIndex: number, colIndex: number, value: string) => void;
}

const Spreadsheet: React.FC<SpreadsheetProps> = ({ data, onCellChange }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 bg-white border rounded-lg">
        <p>لا توجد بيانات لعرضها.</p>
      </div>
    );
  }

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

  const maxCols = Math.max(...data.map(row => row.length), 5); 
  const cols = Array.from({ length: maxCols }, (_, i) => i);

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
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-blue-50 transition-colors">
              <td className="border border-gray-300 bg-gray-50 text-center text-gray-500 font-mono select-none">
                {rowIndex + 1}
              </td>
              {cols.map((colIndex) => {
                const cell: Cell = row[colIndex] || { value: '', style: {} };
                const style = cell.style || {};
                const isInvalid = cell.isValid === false;
                
                return (
                  <td 
                    key={`${rowIndex}-${colIndex}`} 
                    className={`border border-gray-300 p-0 relative ${isInvalid ? 'bg-red-50' : ''}`}
                    style={{
                      backgroundColor: style.backgroundColor || (isInvalid ? '#FEF2F2' : 'transparent')
                    }}
                  >
                    <input 
                      type="text"
                      className={`w-full h-full p-2 bg-transparent outline-none border-none text-gray-900 focus:ring-2 focus:ring-inset z-10 relative truncate
                        ${isInvalid 
                            ? 'text-red-700 focus:ring-red-500 placeholder-red-300' 
                            : 'text-gray-900 focus:bg-blue-50 focus:ring-blue-500'
                        }`}
                      value={cell.value !== undefined && cell.value !== null ? String(cell.value) : ''}
                      onChange={(e) => onCellChange(rowIndex, colIndex, e.target.value)}
                      title={cell.validationMessage || ''}
                      style={{
                        color: style.color || (isInvalid ? '#B91C1C' : 'inherit'),
                        fontWeight: style.bold ? 'bold' : 'normal',
                        fontStyle: style.italic ? 'italic' : 'normal',
                        textAlign: style.align || 'left'
                      }}
                    />
                    {isInvalid && (
                        <div className="absolute top-1 right-1 pointer-events-none" title={cell.validationMessage}>
                            <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm" />
                        </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Spreadsheet;