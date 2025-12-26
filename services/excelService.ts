import * as XLSX from 'xlsx';
import { SheetData, Cell } from '../types';
import { sheetToJson } from './databaseService';

export const readExcelFile = async (file: File): Promise<SheetData> => {
  return new Promise((resolve, reject) => {
    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          resolve(jsonToSheetData(json));
        } catch (err) {
          reject(new Error("ملف JSON غير صالح."));
        }
      };
      reader.readAsText(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        resolve(rawData.map(row => row.map(v => ({ value: v, style: {} }))));
      } catch (error) { reject(error); }
    };
    reader.readAsBinaryString(file);
  });
};

/**
 * Smart JSON flattener for nested product structures
 */
const flattenValue = (val: any): string => {
  if (val === null || val === undefined) return "";
  if (Array.isArray(val)) {
    return val.map(item => typeof item === 'object' ? (item.name || item.id || JSON.stringify(item)) : item).join(", ");
  }
  if (typeof val === 'object') return val.name || val.title || JSON.stringify(val);
  return String(val);
};

const jsonToSheetData = (json: any): SheetData => {
  const dataArray = Array.isArray(json) ? json : [json];
  if (dataArray.length === 0) return [];

  const allKeys = new Set<string>();
  dataArray.forEach(obj => Object.keys(obj).forEach(k => allKeys.add(k)));
  const headers = Array.from(allKeys);

  const sheetData: SheetData = [];
  sheetData.push(headers.map(h => ({ value: h, style: { bold: true, backgroundColor: '#f3f4f6' } })));

  dataArray.forEach(obj => {
    sheetData.push(headers.map(header => ({
      value: flattenValue(obj[header]),
      style: {}
    })));
  });

  return sheetData;
};

export const fetchCsvFromUrl = async (url: string): Promise<SheetData> => {
  const response = await fetch(url);
  const textData = await response.text();
  const workbook = XLSX.read(textData, { type: 'string' });
  const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }) as any[][];
  return rawData.map(row => row.map(v => ({ value: v, style: {} })));
};

export const exportExcelFile = (data: SheetData, filename: string = 'export.xlsx') => {
  const simple = data.map(row => row.map(c => c?.value ?? ""));
  const ws = XLSX.utils.aoa_to_sheet(simple);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename);
};

export const exportJsonFile = (data: SheetData, filename: string = 'export.json') => {
  const json = sheetToJson(data);
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
};

export const generateEmptySheet = (rows = 20, cols = 10): SheetData => 
  Array(rows).fill(null).map(() => Array(cols).fill(null).map(() => ({ value: "", style: {} })));

export const getShopifyTemplate = () => jsonToSheetData([{ Handle: "", Title: "", "Body (HTML)": "", Vendor: "", Type: "", Tags: "", Published: "TRUE", "Variant Price": "", "Image Src": "" }]);
export const getEasyOrderTemplate = () => jsonToSheetData([{ "الاسم بالكامل": "", "رقم الهاتف": "", "العنوان": "", "المدينة": "", "المنتج": "", "الكمية": "", "السعر": "" }]);
