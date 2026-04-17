# Shogi12 Online

A fast-paced, high-replayability 십이장기 (12 Shogi) multiplier game built for the **CrazyGames Portal**. Play locally, against AI, or fiercely competitive online matchmaking via standard HTML5 browsers.

## Features
- **Instant Play**: Embedded HTML5 format designed for immediate browser portal loading.
- **VS Computer**: Built-in Minimax AI for fast solo sessions.
- **Online Matchmaking**: Realtime synced multiplayer with 30s turns.
- **ELO Ranking**: Competitive rating system and global leaderboard.
- **CrazyGames Integration**: Fully utilizing SDK midroll ads and rewarded gating, strictly adhering to `gameplayStart()` tracking guidelines for analytics.

## Tech Stack
- Frontend: Vite, TypeScript, Phaser 3
- Backend: Supabase (Auth, Realtime, Database)
- Deployment: Dist Zip Bundle -> CrazyGames Developer Portal
- Monetization: CrazyGames SDK interface

## Development Setup

1. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
2. Insert your Supabase details into `.env.local`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start dev server:
   ```bash
   npm run dev
   ```

## Documentation
Check the `docs/` folder for system design, architecture, and current roadmap.
