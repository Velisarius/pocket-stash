// Stash Configuration
// Copy this file to config.js and fill in your values. config.js is gitignored.

const CONFIG = {
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'your-anon-key-here',
  WEB_APP_URL: 'https://your-stash-app.vercel.app',
  USER_ID: 'your-user-uuid-from-supabase-auth',
};

if (typeof module !== 'undefined') {
  module.exports = CONFIG;
}
