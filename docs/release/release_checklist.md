# Release Checklist — Shogi12 Online

## App Assets

- [ ] App icon 512x512 PNG (`release_assets/icons/icon-512.png`)
- [ ] Adaptive icon foreground PNG
- [ ] Adaptive icon background PNG
- [ ] Screenshots (minimum 2, maximum 8)
  - [ ] Main menu screenshot
  - [ ] Local match screenshot
  - [ ] VS Computer screenshot
  - [ ] Online match screenshot
  - [ ] Rules page screenshot
  - [ ] Result screen screenshot
- [ ] Feature graphic 1024x500 PNG (Play Store banner)

## Store Listing

- [ ] App title finalized (`docs/release/store_copy_en.md` / `store_copy_ko.md`)
- [ ] Short description finalized (under 80 chars)
- [ ] Long description finalized
- [ ] Feature bullet points finalized
- [ ] Release notes written for v1.0.0
- [ ] Category selected: Games > Board

## Build

- [ ] `npm run build` succeeds with no errors
- [ ] `tsc --noEmit` passes with no type errors
- [ ] Capacitor Android project generated (`npx cap add android`)
- [ ] `npx cap sync` run after build
- [ ] Release AAB built via Android Studio or `./gradlew bundleRelease`
- [ ] AAB signed with release keystore
- [ ] Keystore backed up securely (not committed to git)

## Environment & Secrets

- [ ] `.env` file present locally with all required keys
- [ ] `.env` is in `.gitignore` (never committed)
- [ ] Supabase project created and schema applied
- [ ] Supabase RLS policies reviewed
- [ ] No service role key in client-side code

## Ads (Future)

- [ ] AdMob account created
- [ ] App registered in AdMob console
- [ ] Ad unit IDs created (interstitial, rewarded, banner)
- [ ] AdMob Capacitor plugin installed
- [ ] ADMOB_APP_ID added to `.env` and Android manifest
- [ ] Ad placements tested

## Play Console Submission

- [ ] Play Console developer account active
- [ ] App created in Play Console
- [ ] Internal testing track upload completed
- [ ] Content rating questionnaire completed
- [ ] Privacy policy URL provided (if applicable)
- [ ] Target audience and content settings configured
- [ ] Data safety section completed
- [ ] AAB uploaded to production track
- [ ] Release reviewed and submitted
