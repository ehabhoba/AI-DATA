import { SheetData, TableSchema, SchemaColumn, Cell } from '../types';

// Convert Sheet Row to simple object based on headers
export const sheetToJson = (data: SheetData): Record<string, any>[] => {
  if (!data || data.length < 2) return [];

  const headers = data[0].map(cell => String(cell.value || '').trim());
  const rows = data.slice(1);

  return rows.map(row => {
    const obj: Record<string, any> = {};
    headers.forEach((header, index) => {
      if (header) {
        // Simple key sanitization
        const key = header.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        obj[key] = row[index]?.value ?? null;
      }
    });
    return obj;
  });
};

// Infer Data Types from the first few rows
export const inferSchema = (data: SheetData, tableName: string = 'MyTable'): TableSchema => {
  if (!data || data.length === 0) {
    return { tableName, columns: [], recordCount: 0 };
  }

  const headers = data[0].map(cell => String(cell.value || ''));
  const sampleRows = data.slice(1, 6); // Check first 5 rows for type inference

  const columns: SchemaColumn[] = headers.map((header, index) => {
    if (!header) return null;

    let detectedType: SchemaColumn['type'] = 'Unknown';
    let sampleValue = null;

    // Check values in this column
    for (const row of sampleRows) {
      const val = row[index]?.value;
      if (val !== null && val !== undefined && val !== '') {
        sampleValue = val;
        if (typeof val === 'number') {
          detectedType = 'Number';
        } else if (typeof val === 'boolean') {
          detectedType = 'Boolean';
        } else if (String(val).match(/^\d{4}-\d{2}-\d{2}/)) {
          detectedType = 'Date';
        } else if (String(val).startsWith('http')) {
          detectedType = 'URL';
        } else {
          detectedType = 'String';
        }
        break; // Stop after finding first non-empty value
      }
    }

    return {
      name: header,
      key: header.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
      type: detectedType === 'Unknown' ? 'String' : detectedType,
      sample: sampleValue
    };
  }).filter(c => c !== null) as SchemaColumn[];

  return {
    tableName,
    columns,
    recordCount: data.length - 1
  };
};

// Generate Code Snippets for API usage
export const generateCodeSnippets = (schema: TableSchema, baseUrl: string = 'https://your-app.vercel.app') => {
  const jsonStructure = JSON.stringify(
    schema.columns.reduce((acc, col) => ({ ...acc, [col.key]: col.type }), {}),
    null,
    2
  );
  
  // Clean URL to remove trailing slash
  const cleanUrl = baseUrl.replace(/\/$/, '');
  const apiUrl = `${cleanUrl}/api/data`;

  return {
    javascript: `
// Install: npm install axios
const axios = require('axios');

const fetchData = async () => {
  try {
    // Connected to: ${cleanUrl}
    const response = await axios.get('${apiUrl}');
    const data = response.data;
    
    // Process your ${schema.tableName}
    console.log(\`Successfully loaded \${data.length} records\`);
    
    data.forEach(item => {
      // Access properties using your schema keys
      // e.g. console.log(item.${schema.columns[0]?.key || 'id'});
      console.log(item);
    });
  } catch (error) {
    console.error('Error connecting to database:', error);
  }
};

fetchData();`,
    
    python: `
import requests
import pandas as pd

def fetch_data():
    # Connect to: ${cleanUrl}
    url = "${apiUrl}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        data = response.json()
        
        # Convert to DataFrame
        df = pd.DataFrame(data)
        print(f"Loaded {len(df)} records from ${schema.tableName}")
        print("-" * 30)
        print(df.head())
        print("-" * 30)
        
        # Example: Filter data
        # filtered = df[df['${schema.columns[0]?.key || 'column'}'] > 0]
        
    except Exception as e:
        print(f"Database connection failed: {e}")

if __name__ == "__main__":
    fetch_data()`,

    typescript: `
// 1. Define Interface
interface ${schema.tableName.replace(/\s/g, '')} {
${schema.columns.map(c => `  ${c.key}: ${c.type === 'Number' ? 'number' : c.type === 'Boolean' ? 'boolean' : 'string'};`).join('\n')}
}

// 2. Fetch Function
async function get${schema.tableName.replace(/\s/g, '')}(): Promise<${schema.tableName.replace(/\s/g, '')}[]> {
  try {
    const res = await fetch('${apiUrl}');
    if (!res.ok) throw new Error('Failed to fetch data');
    return await res.json();
  } catch (error) {
    console.error("Connection error:", error);
    return [];
  }
}

// 3. Usage
// const data = await get${schema.tableName.replace(/\s/g, '')}();
`
  };
};