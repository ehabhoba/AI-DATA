import * as XLSX from 'xlsx';
import { SheetData, Cell } from '../types';

export const readExcelFile = async (file: File): Promise<SheetData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to array of arrays (raw values)
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string|number|null)[][];
        
        // Convert to Cell objects
        const formattedData: SheetData = rawData.map(row => 
          row.map(value => ({ value: value, style: {} }))
        );
        
        resolve(formattedData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const fetchCsvFromUrl = async (url: string): Promise<SheetData> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch URL");
    const csvText = await response.text();
    const workbook = XLSX.read(csvText, { type: 'string' });
    const sheetName = workbook.SheetNames[0];
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }) as (string|number|null)[][];
    
    return rawData.map(row => 
      row.map(value => ({ value: value, style: {} }))
    );
  } catch (error) {
    throw error;
  }
};

export const exportExcelFile = (data: SheetData, filename: string = 'output.xlsx') => {
  // Map back to simple values for export (basic export)
  const simpleData = data.map(row => row.map(cell => cell.value));
  
  const ws = XLSX.utils.aoa_to_sheet(simpleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename);
};

export const generateEmptySheet = (rows: number = 20, cols: number = 10): SheetData => {
  return Array(rows).fill(null).map(() => 
    Array(cols).fill(null).map(() => ({ value: "", style: {} }))
  );
};