# Store assets

## Native iPhone Duo screenshots

Store screenshots come from the installed iOS app. No browser rendering, image resizing, framing, or HTML reconstruction is used. Only the alpha channel is removed for Apple's required RGB upload format; untouched originals are retained under `store/screenshots/raw/<locale>/`. The native UI uses `@capgo/capacitor-native-navigation` 8.14's sidebar placement and reported content insets. The available content width controls whether Levels uses one or two columns.

Build and install the app on a dedicated iPhone Duo simulator before capturing:

```sh
bun install --frozen-lockfile
bun run cap:sync
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -sdk iphonesimulator -destination "id=$IOS_DEVICE_ID" \
  -derivedDataPath /tmp/mondayquest-ios CODE_SIGNING_ALLOWED=NO build
xcrun simctl install "$IOS_DEVICE_ID" /tmp/mondayquest-ios/Build/Products/Debug-iphonesimulator/App.app
IOS_DEVICE_ID="$IOS_DEVICE_ID" DUOCTL_PATH=/path/to/duoctl \
  SCREENSHOT_SEED=1 SCREENSHOT_LOCALE=en-US bun run screenshots
```

Select Xcode 27.1 or set `DEVELOPER_DIR` to its developer directory. Install [duoctl](https://github.com/skarol/duoctl) for active-display capture and fold/rotation control. Standard `simctl io screenshot` can capture the inactive inner display when the phone is folded.

`IOS_DEVICE_ID` is required to avoid touching other running simulators. `SCREENSHOT_SEED=1` shuts down that simulator and writes demo progress into the app's native Preferences store while it is offline, then boots it again. Use a dedicated simulator, not a personal device or one containing progress you want to keep. Omit the flag to capture its current data. Set `SCREENSHOT_LOCALE=fr-FR` for French demo progress and UI.

The command captures Today, Levels, and water tracking on each display configuration:

| Configuration | PNG size |
|---|---|
| Folded cover, portrait | 1398 × 2034 |
| Inner, portrait | 2007 × 2853 |
| Inner, landscape | 2853 × 2007 |

Nine RGB PNGs per locale are saved in `store/screenshots/<locale>/duo/`. The adjacent `store/screenshots/<locale>/capture.json` records the simulator, bundle ID, routes, pixel dimensions, capture time, and raw/upload SHA-256 hashes. Keep metadata outside the upload folder because the CLI validates every file there as an image. A small macOS Vision helper detects and accepts iOS deep-link confirmation dialogs, then checks the actual screen's text before capturing. Review every image before uploading. In particular, confirm the real native rail, correct language, tracker controls, and two-column Levels layout when unfolded in landscape.

## Upload with App Store Connect CLI

With `asc` installed and authenticated:

```sh
asc screenshots validate --path store/screenshots/en-US/duo --device-type IPHONE_DUO
asc screenshots upload --app 6820978787 --version 1.0.21 --locale en-US \
  --device-type IPHONE_DUO --path store/screenshots/en-US/duo --replace --dry-run
asc screenshots upload --app 6820978787 --version 1.0.21 --locale en-US \
  --device-type IPHONE_DUO --path store/screenshots/en-US/duo --replace --confirm
asc screenshots list --app 6820978787 --version 1.0.21 --locale en-US
```

Repeat for `fr-FR` using its screenshot folder. Replacement affects only the selected locale's Duo screenshot set, not its iPhone/iPad sets. This uploads screenshots to the draft version; it does not submit the app for review or upload a signed app binary.

## Browser layout regression checks

`bun run test:layout` checks plugin-provided side insets, web fallback tabs, water tracking, and progress preservation through responsive resizing against a preview server on port 5288. Override `SCREENSHOT_URL` or `CHROMIUM_PATH` as needed. It does not generate store screenshots or replace native verification.

## Other creative assets

Creative assets live in `store/creative/`. `store/creative/render.ts` expects iPhone screenshots copied next to the templates as s1–s4.png and the Archivo/Didact fonts.

## Website screenshots

Run `bun add --no-save playwright sharp`, start `bun run dev --port 5288`, then run `bun store/site-screenshots.mjs`. This refreshes the three WebP images in `site/public/img` for the website, not App Store Connect. Set `CHROMIUM_PATH` if needed. Bump the image query version in `site/public/index.html` after refreshing.
