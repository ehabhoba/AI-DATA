import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers allowing external access (The "Database" feature)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 1. Try to fetch real data from Vercel KV (Redis)
    // We store the data under the key 'sheet_data_json'
    const dbData = await kv.get('sheet_data_json');

    if (dbData) {
      // If data exists in DB, return it
      return res.status(200).json(dbData);
    } else {
      // If DB is empty or not connected, return a helpful message/structure
      // This ensures the API always returns valid JSON even if empty
      return res.status(200).json([
        { 
          message: "Database is initialized but empty.", 
          instruction: "Go to the App Dashboard and click 'Publish to Cloud' to save your Excel data here." 
        }
      ]);
    }
  } catch (error) {
    console.error("Database Connection Error:", error);
    
    // Fallback for when Vercel KV is not set up yet
    return res.status(500).json({
      error: "Database Connection Failed",
      details: "Please ensure Vercel KV is linked to your project in the Vercel Dashboard > Storage tab.",
      originalError: String(error)
    });
  }
}