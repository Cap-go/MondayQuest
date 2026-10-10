# Store assets

Rendered from the real web build at the exact device sizes (run `bunx vite preview --port 5288` first):

| Set | Command | Size |
|---|---|---|
| iPhone 6.9" | `bun store/screenshots.ts 430 932 iphone 3` | 1290×2796 |
| iPad 13" | `bun store/screenshots.ts 1024 1366 ipad 2` | 2048×2732 |
| iPhone Duo inner | `bun store/screenshots.ts 669 951 inner 3` | 2007×2853 |
| iPhone Duo outer | `bun store/screenshots.ts 466 678 outer 3` | 1398×2034 |

Add `fr-FR` (or any locale) as the 5th argument for translated screenshots. `store/seed.ts` builds the demo notebook (`bun store/seed.ts > /tmp/mq-seed.json`).

Creative assets (product page header 3840×1646, search result 3840×2560): `store/creative/*.html`, rendered by `store/creative/render.ts` (expects the iPhone screenshots copied next to them as s1–s4.png and the Archivo/Didact fonts).
