# top100-archive
25 Seasons • Google Sheets Database • Live Updates

# Top 100 Position Archive

A comprehensive digital archive of 25 seasons of Top 100 Soccer Manager Worlds history.

## Features

- 🔍 Search across all seasons and teams
- 📊 Interactive league tables by season/division
- 🏆 Complete position history tracking
- 📱 Mobile-responsive design
- ⚡ Live data from Google Sheets

## Setup

1. Get Google Sheets API key from Google Cloud Console
2. Add environment variables in Netlify:
   - `REACT_APP_SHEET_ID=17-BZlcYuAQCfUV5gxAzS93Dsy6bq8mk_yRat88R5t-w`
   - `REACT_APP_GOOGLE_API_KEY=your_api_key`
3. For the live current season, add the public Supabase credentials (server-side, used by `netlify/functions/live-season.js`):
   - `SUPABASE_URL=https://xxntutejknolhmbssqdf.supabase.co`
   - `SUPABASE_ANON_KEY=your_anon_key` (the public anon key, never the service-role key)
4. Deploy!

## Data Source

Connects to: https://docs.google.com/spreadsheets/d/17-BZlcYuAQCfUV5gxAzS93Dsy6bq8mk_yRat88R5t-w/edit

The current season comes live from Soccer Manager Sync (`public_league_season_rows`, in the shared Supabase project) until the sheet has it, so tables no longer need pasting in during the season. Titles, promotions and sackings only count once all 38 games are played. When the season is over, **Download Sxx rows for the sheet** produces the final table in the Full History column layout, ready to paste under the last row. Once the sheet has the season, the sheet wins.

## Built With

- React 18
- Tailwind CSS
- Lucide React Icons
- Google Sheets API
