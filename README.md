# Rhythm Watchful Helper

A keystroke + sensor anomaly detection helper that flags early signs of stroke via typing rhythm. Backed by a Supabase backend (auth,database, edge functions), a TanStack Start web app deployed on Cloudflare, and a PyTorch autoencoder for ML scoring.

## Project structure

```
.
├── src/                    # TanStack Start web app (React + SSR)
├── native-client/          # Python keystroke capture client
├── ml/                     # PyTorch autoencoder training + inference
├── supabase/               # Supabase migrations + edge functions
├── public/                 # static assets
└── vite.config.ts          # build config (lovable tanstack preset)
```

## Quick start

### 1. Clone and install

```bash
git clone "https://github.com/Parwathi-Jayaram/rhythm-watchful-helper"
cd rhythm-watchful-helper

# Install JS dependencies
npm i
```

### 2. Set up environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` — at minimum you need:

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |
| `SUPABASE_PROJECT_ID` | Supabase project ID |
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` (exposed to the browser) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same publishable key (exposed to the browser) |
| `VITE_SUPABASE_PROJECT_ID` | Same project ID (exposed to the browser) |

> The `VITE_` prefixed variables are bundled into the client at build time.
> The non-prefixed ones are used server-side only.

### 3. Set up the Supabase database

```bash
# Install the Supabase CLI (if you haven't)
npm install -g supabase

# Link the CLI to your project (uses SUPABASE_PROJECT_ID in supabase/config.toml)
supabase link --project-ref nzumozbslzhbmreymjxz

# Push the migrations to create the schema
supabase db push
```

This creates the tables for users, consents, alerts, and contacts, plus the
edge function at `supabase/functions/keystroke-similarity`.

### 5. Start the dev server

```bash
npm run dev
```

## ML model setup (Python)

The `ml/` directory trains and scores a keystroke autoencoder.

### Train a model

```bash
cd ml
pip install numpy torch
python train_model.py
```

This saves `keystroke_autoencoder.pt` (model weights + normalization stats +
anomaly threshold) and prints the suggested threshold.


### Live monitoring

```bash
python live_monitor_v2.py    
```

## Native client (keystroke capture)

```bash
cd native-client
python keystroke_capture.py
```

## Available scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |



