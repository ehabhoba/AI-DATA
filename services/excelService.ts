import * as XLSX from 'xlsx';
import { SheetData, Cell } from '../types';

export const readExcelFile = async (file: File): Promise<SheetData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        // Read file - supports xlsx, xls, csv, tsv, txt automatically based on content
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
    const textData = await response.text();
    // Auto-detect delimiter based on extension or content could be added here, 
    // but XLSX.read usually handles comma vs tab well in string mode.
    const workbook = XLSX.read(textData, { type: 'string' });
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
  // Map back to simple values for export
  const simpleData = data.map(row => (row || []).map(cell => cell?.value ?? ""));
  
  const ws = XLSX.utils.aoa_to_sheet(simpleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename);
};

export const exportTsvFile = (data: SheetData, filename: string = 'output.tsv') => {
  const simpleData = data.map(row => (row || []).map(cell => cell?.value ?? ""));
  const ws = XLSX.utils.aoa_to_sheet(simpleData);
  
  // Sheet to CSV with Tab separator
  const tsvOutput = XLSX.utils.sheet_to_csv(ws, { FS: "\t" });
  
  // Create Blob and trigger download manually to ensure encoding and extension behavior
  const blob = new Blob([tsvOutput], { type: 'text/tab-separated-values;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateEmptySheet = (rows: number = 20, cols: number = 10): SheetData => {
  return Array(rows).fill(null).map(() => 
    Array(cols).fill(null).map(() => ({ value: "", style: {} }))
  );
};

// --- Templates ---

export const getShopifyTemplate = (): SheetData => {
  const headers = ["Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published", "Option1 Name", "Option1 Value", "Variant SKU", "Variant Grams", "Variant Inventory Qty", "Variant Price", "Image Src"];
  const exampleRow = ["example-shirt", "Example T-Shirt", "<strong>Good Quality</strong>", "MyBrand", "Shirt", "Summer, Cotton", "TRUE", "Size", "M", "SKU-123", "200", "50", "29.99", ""];
  
  const data = [headers, exampleRow];
  // Fill rest with empty cells
  for(let i=0; i<15; i++) {
    data.push(Array(headers.length).fill(""));
  }
  
  return data.map(row => row.map(val => ({ value: val, style: {} })));
};

export const getGoogleMerchantTemplate = (): SheetData => {
  const headers = ["id", "title", "description", "link", "image_link", "availability", "price", "brand", "gtin", "mpn", "google_product_category"];
  const exampleRow = ["A123", "Wireless Headphones", "Great sound quality", "https://myshop.com/p/123", "https://myshop.com/img/123.jpg", "in_stock", "99.00 USD", "SoundBrand", "1234567890123", "MPN123", "Electronics > Audio > Headphones"];
  
  const data = [headers, exampleRow];
  for(let i=0; i<15; i++) {
    data.push(Array(headers.length).fill(""));
  }
  
  return data.map(row => row.map(val => ({ value: val, style: {} })));
};