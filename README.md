# Shogi12 Online

A fast-paced 십이장기 (12 Shogi) online board game built with **Vite**, **TypeScript**, **Phaser 3**, **Supabase**, and **Capacitor Android**. Play locally, against AI, or through realtime online matchmaking.

## Features
- **Local Play**: Same-device two-player matches.
- **VS Computer**: Built-in Minimax AI with multiple difficulty levels.
- **Online Matchmaking**: Realtime synced multiplayer with 30s turns.
- **ELO Ranking**: Competitive rating system and global leaderboard.
- **Android Monetization**: Capacitor AdMob interstitial and rewarded ads.

## Tech Stack
- Frontend: Vite, TypeScript, Phaser 3
- Backend: Supabase (Auth, Realtime, Database)
- Mobile: Capacitor Android
- Monetization: Google AdMob

## Development Setup

1. Create a local `.env` file and set the runtime values:
   ```env
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=
   VITE_SUPABASE_REDIRECT_URL=com.shogi12.online://login-callback
   VITE_ADMOB_APP_ID=
   VITE_ADMOB_INTERSTITIAL_ID=
   VITE_ADMOB_REWARD_ID=
   VITE_ADMOB_TESTING=true
   ```
   Keep `VITE_ADMOB_TESTING=true` for local builds only. Replace the AdMob IDs before production ad rollout.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start dev server:
   ```bash
   npm run dev
   ```

## Android Build

Create `android/keystore.properties` before producing a Play Store upload bundle:

```properties
storeFile=../upload-keystore.jks
storePassword=your-store-password
keyAlias=upload
keyPassword=your-key-password
```

```bash
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
```
