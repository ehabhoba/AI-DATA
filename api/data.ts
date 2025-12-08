import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // This serves as a demo API endpoint for the generated code snippets.
  // In a real implementation, this would connect to a persistent database (Postgres/Mongo).
  
  const demoData = [
    { id: 1, name: "Project Alpha", status: "Active", budget: 15000 },
    { id: 2, name: "Project Beta", status: "Pending", budget: 8500 },
    { id: 3, name: "Marketing Campaign", status: "Completed", budget: 12000 },
    { id: 4, name: "Server Upgrade", status: "Active", budget: 5000 }
  ];

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  return res.status(200).json(demoData);
}