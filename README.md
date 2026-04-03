# Shogi12 Online

4x3 미니 전략 보드게임 — 로컬 대국, AI 대전, 온라인 멀티플레이 지원

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript |
| Game Framework | Phaser 3 |
| Backend | Supabase |
| Build Tool | Vite |
| Packaging (future) | Capacitor (Android) |
| Ads (future) | Google AdMob |

---

## Local Development

### 1. Prerequisites

- Node.js 18+
- npm 9+

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your Supabase project URL and anon key
```

### 4. Start dev server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key into `.env`
3. Apply the database schema:

```bash
# In Supabase SQL Editor, run:
supabase/schema.sql
```

---

## Build

```bash
npm run build
```

Output is in `dist/`.

---

## Project Structure

```
src/
├── types/      # Shared TypeScript types (GameState, Piece, etc.)
├── engine/     # Pure game logic (rules, win conditions, timer)
├── ai/         # AI opponent logic
├── state/      # State management (local + online)
├── online/     # Supabase integration (rooms, sync, realtime)
├── scenes/     # Phaser scenes (Menu, Game, Rules, etc.)
├── ui/         # Phaser UI components (Board, HUD, etc.)
├── i18n/       # Korean / English locale strings
├── ads/        # AdMob service boundary (future)
└── config/     # Game and Phaser configuration
```

---

## Game Rules

See the in-game Rules page, or refer to `src/i18n/ko.ts` / `src/i18n/en.ts` for full rule text.

### Quick Summary

- 4x3 board, turn-based strategy
- 30 seconds per turn (timeout = instant loss)
- Captured pieces can be dropped as your own pieces
- Win by capturing opponent 王 or Entry Victory (王 reaches last row)

---

## Release

See `docs/release/` for:
- `store_copy_ko.md` — Korean store description
- `store_copy_en.md` — English store description
- `release_checklist.md` — Full release checklist

See `release_assets/` for icon and screenshot placeholders.

---

## Implementation Status

| Phase | Status |
|-------|--------|
| Project bootstrap | ✅ Done |
| TypeScript types + GameState | 🔲 Pending |
| Core rules engine | 🔲 Pending |
| Win condition logic | 🔲 Pending |
| Timer logic | 🔲 Pending |
| Local match flow | 🔲 Pending |
| AI opponent | 🔲 Pending |
| UI scenes (Phaser) | 🔲 Pending |
| i18n | 🔲 Pending |
| Rules page | 🔲 Pending |
| Supabase schema + client | 🔲 Pending |
| Online multiplayer | 🔲 Pending |
| Release docs scaffolding | ✅ Done |
