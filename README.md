# Arihant's Food Journal

A warm, private diet tracker built with **Next.js 16** and **React 19**. Log what
you eat, then let an LLM fill in the calories, protein, carbs, fat, and fiber —
so you only ever type the food name, quantity, date, and time. An analysis page
shows weekly trends and a "harvest calendar" where each day grows a colored dot
for every nutrition goal it met.

> **Local-first.** Everything is stored in your browser and works fully offline.
> Signing in with Google (optional) backs your journal up to MongoDB and syncs it
> across devices.

## Features

- **Journal** — add foods for any day; a *Fill nutrition values automatically* button
  estimates the macros with your chosen AI.
- **Bring your own AI** — Claude (Anthropic), ChatGPT (OpenAI), Gemini, OpenRouter,
  Grok (xAI), or a **local model via Ollama**. Keys live on your device by default;
  cloud calls are proxied through the app's own backend. Signed-in users can
  optionally sync their keys to their account (see below).
- **Analysis** — per-nutrient weekly averages, 14-day calorie and 7-day macro
  charts, and a monthly calendar of goals met.
- **Daily targets** — set them by hand, compute them from your body profile, or
  ask the AI to suggest them.
- **Optional cloud sync** — Google One Tap sign-in → MongoDB.

## Getting started

```bash
bun install
bun run dev          # http://localhost:3000
```

The app is usable immediately. To use AI nutrition, open **Settings**, pick a
provider, paste an API key (or point at your Ollama server), and choose a model.

## Configuration

Copy `.env.example` to `.env.local`. **All variables are optional** — they only
enable cloud sync. See the comments in that file for details.

### Using a local model (Ollama)

Because the app may be hosted on Vercel (which can't reach your machine), Ollama
is called **directly from your browser**, so Ollama must allow this site's origin:

```bash
OLLAMA_ORIGINS="*" ollama serve
```

Then in Settings → AI assistant, choose **Local · Ollama**, enter your server
address (e.g. `http://localhost:11434`), and click **Discover installed** to pick
from the models you have pulled.

### Enabling Google sign-in + MongoDB sync

1. In the [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials),
   create an **OAuth 2.0 Client ID** of type **Web application**.
2. Add your site URL (and `http://localhost:3000` for local dev) under
   **Authorized JavaScript origins**.
3. Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID` (same value) in
   `.env.local`.
4. Set `MONGODB_URI` to your MongoDB connection string.
5. Restart the dev server. A **Sign in** button appears in the top-right. Signing in pushes your local entries to MongoDB and keeps them in sync.

### Syncing API keys across devices

By default, AI provider keys never leave the browser they were entered in. Once
signed in, you can tick **Sync API keys to my account** under *Settings → AI
assistant* to also store them in your account, so they're available on every
device you sign in on. Keys are saved per-user via `/api/settings` (the
`settings` collection in MongoDB) and pulled back automatically on sign-in.
Un-ticking the box deletes them from the cloud again. Note the keys are stored
as-is (not encrypted at rest), so this trades some secrecy for convenience —
leave it off if you'd rather keep keys device-only.


## Tech

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Recharts
- MongoDB
- Google Identity Services.

<a href="https://www.flaticon.com/free-icons/food" title="food icons">Food icons created by justicon - Flaticon</a>