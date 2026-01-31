/**
 * Generates web/config.js from environment variables.
 * Used by Vercel at build time so credentials are never committed.
 * Run: node generate-config.js (or npm run build)
 */
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const USER_ID = process.env.USER_ID || '';

const configJs = `// Stash Web App Configuration (generated at build time)
const CONFIG = {
  SUPABASE_URL: '${SUPABASE_URL}',
  SUPABASE_ANON_KEY: '${SUPABASE_ANON_KEY}',
  USER_ID: '${USER_ID}',
};
`;

const outPath = path.join(__dirname, 'config.js');
fs.writeFileSync(outPath, configJs, 'utf8');
console.log('Wrote config.js from environment variables');
