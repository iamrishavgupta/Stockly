# Stockly — AI-Powered Stock Tracker

Track real-time stock prices, manage your watchlist, and get AI-generated market summaries powered by Gemini.

## Tech Stack

Next.js · TypeScript · TailwindCSS · MongoDB · Better Auth · Finnhub API · Gemini AI · Shadcn UI

## Features

- **Stock Search & Charts** — Real-time prices with interactive TradingView charts
- **Watchlist** — Save and track your favorite stocks
- **AI Summary** — Plain-English market summaries powered by Gemini
- **Top Stories** — Latest market news from Finnhub
- **Auth** — Secure email/password authentication via Better Auth

## Quick Start

```bash
git clone https://github.com/iamrishavgupta/Stockly.git
cd Stockly
npm install
```

Create `.env.local`:

```env
NODE_ENV=development
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_FINNHUB_API_KEY=
FINNHUB_API_KEY=
FINNHUB_BASE_URL=https://finnhub.io/api/v1
MONGODB_URI=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
GEMINI_API_KEY=
NODEMAILER_EMAIL=
NODEMAILER_PASSWORD=
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Live Demo

[stockly-five-livid.vercel.app](https://stockly-five-livid.vercel.app)
