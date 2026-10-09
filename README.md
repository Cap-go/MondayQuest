# Monday Quest

30 weekly challenges, each starting on a Monday morning. White-paper minimalism, black ink, the clipped page corner, and real ink checks. Website: https://mondayquest.com

- **6 levels of 5 challenges**, English by default with a French translation. A level unlocks once the previous one is finished.
- **Bonus level**: create your own challenges.
- **Hardcore mode**: start all 5 challenges of a level in the same week.

Stack: Vue 3 + Vite + Tailwind 4 + Pinia, Capacitor 8, Bun.

## Each challenge has its own tracker

| # | Challenge | Interaction | Native |
|---|---|---|---|
| 1 | Le flâneur | 30 min walk ring, footprints, live steps | pedometer, Live Activity, notification |
| 2 | Soleil levant | sun on the horizon, "I'm up" stamp | **real system alarm** (AlarmKit / Clock), brightness boost, date picker |
| 3 | Vitamines N | plate with 4 slices, suggestion chips | — |
| 4 | Défoncé à la vie | live "free for" clock, hold the water glass on a craving | haptics |
| 5 | Aseptisation | rub the dust off the screen, one room at a time | canvas scratch |
| 6 | Fourchettes en l'air | lunch/dinner boxes, chew pacer metronome | haptics |
| 7 | Abstinence aréligieuse | hold-to-commit ring | heartbeat haptics |
| 8 | Back to school | opens ted.com, picks up the talk title | in-app browser |
| 9 | Souplesse féline | 8-step guided stretch, top to bottom | speech synthesis, keep awake, Live Activity |
| 10 | A minima | flick the object into the bin | shake to throw |
| 11 | Zen chef | breathing circle, full-screen zen mode | Health (mindful minutes), keep awake, home indicator |
| 12 | Douche de James Bond | stopwatch with frost and shivers | volume buttons stop it (wet hands) |
| 13 | Yes man | "OUI" rubber stamp | — |
| 14 | Réflexion | polaroid, rear camera only ("no selfies!") | camera preview, photo library |
| 15 | Gratitude | 3 lines, heart fills | speech recognition, reply from the notification |
| 16–30 | water bottle that follows the tilt, page flip reader, sketchbook, offline hour that pauses when you reconnect, wrist band, barometer stairs, nose-tap push-ups, compass explorer, sugar cube, curfew with light sensor, morning pages word count, fear flame before/after, envelope, 16:8 fasting clock | accelerometer, network, barometer, compass, light sensor, notifications |

Everywhere: hand-drawn check animation with a pen-scratch sound and haptics, long-press to erase, page-turn between "Read" and "Track", DONE rubber stamp with confetti, shareable card, in-app review after the first DONE.

## Capgo plugins used

`capacitor-updater` (live updates), `capacitor-native-navigation` (native tab bar, Liquid Glass on iOS 26), `capacitor-transitions` (page transitions + swipe back), `capacitor-sheets`, `capacitor-pretty-toast`, `capacitor-alarm`, `capacitor-rich-notifications` (actions + inline reply), `capacitor-widget-kit` (home/lock-screen widget with an interactive check + Live Activity / Dynamic Island), `capacitor-native-audio`, `capacitor-pedometer`, `capacitor-health`, `camera-preview`, `capacitor-photo-library`, `capacitor-speech-recognition`, `capacitor-speech-synthesis`, `capacitor-keep-awake`, `capacitor-shake`, `capacitor-volume-buttons`, `capacitor-accelerometer`, `capacitor-barometer`, `capacitor-compass`, `capacitor-light-sensor`, `capacitor-brightness`, `capacitor-home-indicator`, `capacitor-navigation-bar`, `capacitor-inappbrowser`, `capacitor-date-picker`, `capacitor-file-sharer`, `capacitor-in-app-review`.

All sounds are synthesised by `scripts/gen-sounds.ts` (`bun run sounds`), no third-party samples.

## Develop

```bash
bun install
bun run dev          # browser (native features degrade gracefully)
bun run test
bun run lint
bun run ios          # build + sync + open Xcode
bun run android
```

After `cap add` (or when changing permissions), run `bun run native:setup`. It applies the Info.plist keys, the URL scheme `mondayquest://`, the entitlements (HealthKit + App Group `group.ee.forgr.mondayquest.widgetkit`), adds the `MondayQuestWidget` extension target, and patches the Android manifest. The widget SwiftUI source lives in `native/ios/MondayQuestWidget/`.

## Release (GitHub Actions → Capgo)

`.github/workflows/capgo.yml` runs on every push to `main` and on `v*` tags:

1. Lint, test, build.
2. `capgo bundle releaseType` decides: JS-only change → **live update** (`bundle upload --delta` to the channel); native change → **Capgo Cloud Build** for iOS and Android.
3. Run it manually from the Actions tab to force OTA or native, choose the platform, channel and build mode.

One-time setup:

```bash
bunx @capgo/cli@latest app add ee.forgr.mondayquest
bunx @capgo/cli@latest build init   # iOS signing onboarding (app + widget bundle IDs)
```

Repository secrets:

| Secret | For |
|---|---|
| `CAPGO_TOKEN` | everything |
| `BUILD_CERTIFICATE_BASE64`, `P12_PASSWORD` | iOS signing |
| `CAPGO_IOS_PROVISIONING_MAP` | profiles for `ee.forgr.mondayquest` **and** `ee.forgr.mondayquest.widget` |
| `APP_STORE_CONNECT_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_ISSUER_ID`, `APPLE_KEY_CONTENT` | TestFlight upload |
| `ANDROID_KEYSTORE_FILE`, `KEYSTORE_KEY_ALIAS`, `KEYSTORE_KEY_PASSWORD`, `KEYSTORE_STORE_PASSWORD` | Android signing |
| `PLAY_CONFIG_JSON` (optional) | Play upload; without it the build only produces a download link |

In the Apple Developer portal, enable **App Groups**, **HealthKit** and **Live Activities** for the app ID, and **App Groups** for the widget ID. AlarmKit needs iOS 26; older iOS falls back to a notification.
