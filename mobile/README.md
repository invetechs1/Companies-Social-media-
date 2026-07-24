# Bassir Social Pro — Mobile App (iOS & Android)

React Native (Expo) companion app for the Bassir Social Pro platform. Team members sign in with the same accounts as the web dashboard and can review, approve, compose, schedule and publish posts from their phone.

## Features

- **Sign in to any deployment** — enter your server URL once (e.g. `https://social.yourcompany.com`); works for every company you resell to
- **Overview** — followers-at-a-glance stats, recent posts per workspace
- **Posts** — filter by status, publish now, submit for approval, delete
- **Compose** — pick target accounts (with X character limit), schedule, request approval
- **Approvals** — managers approve/reject pending posts on the go
- **Settings** — switch between company workspaces, view connected accounts, sign out

Auth uses the Bearer token returned by `POST /api/auth/login` (30-day JWT).

## Run in development

```bash
cd mobile
npm install
npm start          # scan the QR code with the Expo Go app (iOS/Android)
```

Requirements: Node 18+, the [Expo Go](https://expo.dev/go) app on your phone. The phone must be able to reach your server URL (for local dev, use your machine's LAN IP, e.g. `http://192.168.1.10:3000`).

## Build for the App Store / Play Store

Uses [EAS Build](https://docs.expo.dev/build/introduction/) (free tier available):

```bash
npm install -g eas-cli
eas login                        # free Expo account
eas build:configure
eas build --platform android     # produces an .aab for Play Store
eas build --platform ios         # produces an .ipa (requires Apple Developer account, $99/yr)
eas submit                       # optional: submit directly to the stores
```

Bundle IDs are pre-configured in `app.json`:
- iOS: `com.invetechs.bassirsocialpro`
- Android: `com.invetechs.bassirsocialpro`

Add your app icon (1024×1024 PNG) as `assets/icon.png` and reference it in `app.json` (`"icon": "./assets/icon.png"`) before store submission.

## Notes / v1 scope

- **Connecting social accounts** (OAuth with Facebook, X, TikTok…) happens in the browser — the Settings tab deep-links to the web dashboard for that. Once connected, everything else works from the phone.
- **Media attachments** are v1-limited to the web dashboard; mobile posts are text (image upload from the phone is a straightforward v2 addition using `expo-image-picker` + the existing `/api/orgs/:id/media` endpoint).

