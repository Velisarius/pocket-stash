# Stash Setup Guide

A simple, self-hosted Pocket replacement with Chrome extension, web app, and cross-device sync.

## Quick Start (15 minutes)

### 1. Set Up Supabase (Free Tier)

1. Go to [supabase.com](https://supabase.com) and sign in with GitHub
2. Create a new project (free tier includes 500MB database, unlimited API requests)
3. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
4. Go to **Project Settings > API** and copy:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - `anon` public key

### 2. Configure (without committing secrets)

Config files with your credentials are **gitignored** so you can push to GitHub safely.

**Extension and web (local):**
1. Copy `extension/config.example.js` to `extension/config.js`
2. Copy `web/config.example.js` to `web/config.js`
3. Fill in your Supabase URL, anon key, user ID (and `WEB_APP_URL` in extension after you deploy)

### 3. Create Your User Account

1. Go to Supabase > **Authentication** > **Users**
2. Click "Add user" > "Create new user"
3. Enter your email and password
4. Copy the user ID (UUID) and add it to your config files

### 4. Install the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension` folder

### 5. Deploy the Web App

**Option A: Vercel (Recommended, no credentials in repo)**
1. Push this repo to GitHub. Your `extension/config.js` and `web/config.js` are gitignored, so they are **not** pushed—only the example files and build script are in the repo. (If you already committed those files earlier, run `git rm --cached extension/config.js web/config.js` before pushing, then commit; consider rotating your Supabase anon key if the repo was ever public.)
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "New Project" > Import your repo
4. Set **Root Directory** to `web`
5. In **Build and Output Settings** set **Build Command** to `npm run build` (this generates `config.js` from env vars at deploy time)
6. Go to **Settings > Environment Variables** and add:
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_ANON_KEY` = your anon public key
   - `USER_ID` = your Supabase user UUID (Authentication > Users)
7. Deploy. Your live URL will use the config built from those env vars.

**Option B: Local Only**
```bash
cd web
python3 -m http.server 3000
```
Then open http://localhost:3000

### 6. Update Config with Web App URL

After deploying to Vercel, set `WEB_APP_URL` in your local `extension/config.js` to your Vercel URL (e.g. `https://your-project.vercel.app`).

## Using Stash

### Chrome Extension

- **Save a page**: Click the Stash icon or right-click > "Save page to Stash"
- **Save a highlight**: Select text > right-click > "Save highlight to Stash"

### Web App

- Works on any device (Mac, iPhone, iPad)
- Add to home screen on mobile for app-like experience
- Full-text search across all saved content
- Organize with tags and folders

### Bookmarklet (for other browsers)

1. Open `bookmarklet/install.html` in your browser
2. Enter your user ID
3. Drag the bookmarklet to your bookmarks bar

### iOS Shortcut (Save from Safari)

See `ios-shortcut/README.md` for setup instructions.

## Features

- **Save articles** - Full text extraction with Readability
- **Save highlights** - Select text and save snippets
- **Kindle import** - Upload My Clippings.txt to import all your book highlights
- **Full-text search** - Search across all your saved content
- **Tags & folders** - Organize your saves
- **Cross-device sync** - Access anywhere via web app
- **PWA support** - Install as an app on mobile

## Importing Kindle Highlights

To import your Kindle highlights:

1. Connect your Kindle to your computer via USB
2. Find `My Clippings.txt` in the `documents` folder
3. Open the Stash web app and click "Import Kindle" in the sidebar
4. Drag and drop the file (or click to browse)
5. Review the highlights and click "Import"

The importer automatically detects duplicates, so you can re-import anytime without creating duplicates.

## Troubleshooting

### Extension not saving
- Verify your Supabase credentials in `config.js`
- Check the browser console (F12) for errors
- Make sure your user ID is correct

### Web app not loading
- Verify the same credentials in `web/config.js`
- Check that the schema was created correctly
- Look for errors in the browser console

### CORS errors
- Make sure you're using the `anon` key, not the `service_role` key
- Supabase handles CORS automatically for the anon key

## Weekly Digest Email (Optional)

Get a weekly email with summaries of everything you saved, plus random Kindle highlights to revisit.

### Setting Up Email (Resend)

1. Create a free account at [resend.com](https://resend.com)
2. Add and verify a domain (or use their testing domain)
3. Create an API key and copy it
4. In Supabase, go to **Project Settings > Edge Functions**
5. Add a secret named `RESEND_API_KEY` with your API key
6. Update the `from` email in `supabase/functions/send-digest/index.ts` to match your verified domain

### Deploying the Edge Function

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login and link your project
supabase login
supabase link --project-ref your-project-id

# Deploy the digest function
supabase functions deploy send-digest
```

### Setting Up Scheduled Sending

To send digest emails automatically, set up a cron job:

**Option A: Supabase pg_cron (Recommended)**

In the SQL Editor, run:
```sql
-- Enable pg_cron extension (if not already enabled)
create extension if not exists pg_cron;

-- Schedule digest to run every hour (it checks user preferences)
select cron.schedule(
  'send-weekly-digest',
  '0 * * * *', -- Every hour at minute 0
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-digest',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

**Option B: External Cron (GitHub Actions, etc.)**

Create a GitHub Action that calls the Edge Function hourly.

### Enabling Digest in the App

1. Click "Digest Settings" in the sidebar
2. Toggle "Enable weekly digest"
3. Enter your email address
4. Choose your preferred day and time (UTC)
5. Save

## Multi-User Setup

By default, Stash runs in single-user mode (hardcoded USER_ID). To enable multi-user:

1. Remove the `USER_ID` from config files
2. Enable Supabase Auth in your project
3. Users will need to sign up/sign in
4. Row Level Security (RLS) ensures users only see their own data

## License

MIT - Do whatever you want with it!
