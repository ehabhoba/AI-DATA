import React from 'react';
import { SheetData, Cell } from '../types';

interface SpreadsheetProps {
  data: SheetData;
}

const Spreadsheet: React.FC<SpreadsheetProps> = ({ data }) => {
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
      <table className="border-collapse w-full text-sm">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            <th className="border border-gray-300 w-12 bg-gray-200 p-1 text-center font-semibold text-gray-600">#</th>
            {cols.map((colIndex) => (
              <th key={colIndex} className="border border-gray-300 p-2 min-w-[100px] text-center font-semibold text-gray-700">
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
                
                return (
                  <td 
                    key={`${rowIndex}-${colIndex}`} 
                    className="border border-gray-300 p-0 relative"
                    style={{
                      backgroundColor: style.backgroundColor || 'transparent',
                      color: style.color || 'inherit',
                      fontWeight: style.bold ? 'bold' : 'normal',
                      fontStyle: style.italic ? 'italic' : 'normal',
                      textAlign: style.align || 'left'
                    }}
                  >
                    <div className="w-full h-full p-2 whitespace-nowrap overflow-hidden text-ellipsis min-h-[1.5rem] outline-none">
                      {cell.value !== undefined && cell.value !== null ? String(cell.value) : ''}
                    </div>
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