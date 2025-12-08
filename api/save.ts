import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow POST method only
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;

    if (!data) {
      return res.status(400).json({ error: 'No data provided' });
    }

    // Save the array of objects to Vercel KV
    // key: 'sheet_data_json'
    await kv.set('sheet_data_json', data);

    return res.status(200).json({ success: true, message: 'Data saved to cloud database successfully.' });
  } catch (error) {
    console.error("Save API Error:", error);
    return res.status(500).json({ 
      error: 'Failed to save data',
      details: 'Check if Vercel KV is configured correctly in the project settings.' 
    });
  }
}