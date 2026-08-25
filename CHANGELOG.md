# CHANGELOG — Firebase Cloud Live Sync Fix

This changelog documents every file added or modified while fixing the Firebase
Cloud Live Sync system. **No UI, animations, CSS, overlay markup, or Google
Sheets integration (`js/*.js` gviz fetchers) were touched.** All changes are
scoped strictly to the Firebase/localStorage theme-sync layer.

## New file

### `control/gs-firebase.js` (new — the single reusable Firebase module)
Central module used by `setup.js`, `manager.js`, and `theme-runtime.js`. Consolidates:
- **SDK loading (deduped):** loads `firebase-app-compat.js` + `firebase-database-compat.js`
  (v9.23.0) exactly once per page via a cached promise (`loadSDK()`), instead of each
  consumer having its own copy-pasted loader.
- **App init guard:** `initApp()` only calls `firebase.initializeApp()` if no app
  instance exists yet (`firebase.apps.length` check), safe to call from multiple places.
- **Config encode/decode:** `enc()`/`dec()` — identical base64/URI-safe JSON helpers
  previously duplicated in `setup.js` and `theme-runtime.js`.
- **Room ID resolution (bug fix, requirement #2/#11):** `getRoom()` reads the URL
  `?room=` param first, then `localStorage['gs-room']`, and — critically — never
  returns the literal string `"default"`. If both sources are empty or exactly
  `"default"`, it falls back to the real default room `gs-event-2026` (matching the
  UI's placeholder/default). `setRoom()` applies the same normalization when persisting.
- **Fixed Firebase path (requirement #3):** `overlayPath()`/`overlayRef()` always
  build `gs-production/{room}/overlays/{overlay}` using the corrected `getRoom()`.
- **`saveOverlay()`:** used by the Theme Manager to push a theme to Firebase.
- **`listenOverlay()` (requirement #4 + #10):** realtime `.on("value", ...)` listener
  plus a `.info/connected` monitor:
  - Reports connect/disconnect via `onStatus`.
  - On reconnect after a drop, forces a fresh `.once("value")` read so no update is
    missed while offline.
  - On listener error, auto-retries with exponential backoff (1s → 15s cap) instead
    of silently dying.
  - Returns a `{ stop() }` handle for clean teardown.
- Exposed as `window.GSFirebase` (no build step / bundler required — plain script tag).

## Modified files

### `control/theme-runtime.js`
- Removed the embedded Firebase SDK loader (duplicate #1) — now delegates to
  `window.GSFirebase.loadSDK()`/`ready()` via the shared module (requirement #5/#6).
- Removed local `room()`/`decodeCfg()` — now uses `GSFirebase.getRoom()` /
  `GSFirebase.getConfig()`, fixing the `"|| 'default'"` fallback bug (requirement #2/#11).
- Replaced the raw `ref.on("value", ...)` call (no reconnect) with
  `GSFirebase.listenOverlay()`, which adds connection-state monitoring and automatic
  reconnection (requirement #10) and guarantees instant cross-PC updates without a
  page refresh (requirement #4).
- If `gs-firebase.js` hasn't loaded yet for any reason, it now lazily injects it
  (resolved relative to `theme-runtime.js`'s own script `src`, not to `location.pathname`)
  so it keeps working under GitHub Pages project sub-paths (requirement #9).
- Local (`gs-overlay-{overlay}`) theme application on page load is unchanged
  (requirement #7 — full localStorage backward compatibility preserved).

### `control/manager.js`
- `cfg()` and `room()` now delegate to `GSFirebase.getConfig()` / `GSFirebase.getRoom()`
  instead of duplicating base64-decode logic and the buggy `|| 'default'` fallback
  (requirement #2/#11).
- Removed the embedded `loadFirebase()` function (duplicate #2 of the SDK loader) —
  `save()` now calls `GSFirebase.saveOverlay(overlay, state, cfg)`, which internally
  reuses the shared, deduped loader/init logic (requirement #5/#6).
- `save()` still writes to the same path (`gs-production/{room}/overlays/{overlay}`,
  requirement #3) but now with the corrected room resolution, and shows the resolved
  room ID in the success alert for operator confidence.
- `save()` failure now surfaces the actual error message instead of silently doing
  nothing beyond the local save.
- `cloudQuery()` (used to build the manager's live preview iframe URL) now sources the
  encoded config via `GSFirebase.getRawConfigForQuery()` for consistency.
- All theme presets, color math, schema/labels, preset UI, undo history, and preview
  iframe logic are untouched.

### `control/setup.js`
- Rewritten to use `GSFirebase.getConfig()/setConfig()/getRoom()/setRoom()/getRawConfigForQuery()`
  instead of inline `enc()/dec()` and raw `localStorage` calls.
- Fixes the room-fallback inconsistency (requirement #2/#11): saving now always
  normalizes an empty/`"default"` room input to the real default `gs-event-2026`
  (previously it silently stored the literal string `"default"`, which then
  propagated into every overlay's Firebase path).
- "GENERATE STREAMER LINKS" now reads the room/config back through the shared module
  so generated per-overlay URLs (`?room=...&cfg=...`) always carry a real room id.
- No changes to the setup page's UI/copy/layout.

### `control/setup.html`
- Added `<script src="gs-firebase.js"></script>` before `setup.js` so the shared
  module is available.

### `control/manager.html`
- Added `<script src="gs-firebase.js"></script>` before `manager.js` so the shared
  module is available.

### 12 overlay pages — `AliveStatus.html`, `Domination.html`, `ElimBroadcast.html`,
`FirstPick.html`, `MVP.html`, `MatchResult.html`, `OverallResult.html`, `PrizePool.html`,
`TeamPreview.html`, `TopAliveStatus.html`, `WWCD.html`, `ZoneTimer.html`
- Added `<script src="control/gs-firebase.js"></script>` immediately before the
  existing `<script src="control/theme-runtime.js"></script>` tag so every overlay
  loads the shared Firebase module before the runtime sync script runs
  (requirement #8). Each overlay's own `js/{Overlay}.js` (Google Sheets data fetch)
  and its `<link rel="stylesheet">` remain in their original position and are
  completely unmodified (requirement #12).

## Files intentionally NOT modified
- Every `js/*.js` overlay data script (Google Sheets `gviz` fetch logic) — verified
  to contain zero Firebase/localStorage references; fully independent of the theming
  system.
- Every `css/*.css` file, `control/control.css`, `control/overlay-config.json`
  (theme/CSS-variable defaults).
- `index.html`, `admin.html`, `dashboard.html`, `bgmi-slot-overlay.html`,
  `dashboard.js`, `bgmi-slot-overlay.js`.
- `vercel.json`, `README.md`, `README-FIRST.txt`.

## Why this satisfies the requirements
1. **Cloud Live Sync fixed** — realtime listener now has connection-state tracking,
   auto-retry, and a resync-on-reconnect read.
2. **Room ID always honored** — `getRoom()`/`setRoom()` never return/persist the
   literal `"default"`; a real default (`gs-event-2026`) is used only when nothing
   valid was supplied.
3. **Correct Firebase path** — `gs-production/{room}/overlays/{overlay}`, unchanged
   structurally, now fed by the corrected room resolver.
4. **Instant updates across PCs** — `.on("value", ...)` via `listenOverlay()` pushes
   `apply(data)` to `document.documentElement.style` immediately, no refresh needed.
5. **No duplicate Firebase init** — SDK loading/init lives in exactly one place
   (`gs-firebase.js`); `manager.js`'s and `theme-runtime.js`'s own loaders were removed.
6. **One reusable module** — `control/gs-firebase.js`, imported by all three consumers
   plus every overlay page.
7. **localStorage backward compatibility** — all original keys (`gs-firebase-config`,
   `gs-room`, `gs-overlay-{overlay}`) are read/written in the same format; pages with
   no cloud setup keep working exactly as before (local-only theme application).
8. **setup.js / manager.js / theme-runtime.js / all overlays fixed** — see above.
9. **GitHub Pages compatible** — all script/style references remain relative; the
   dynamic `gs-firebase.js` fallback loader in `theme-runtime.js` resolves its own
   script path via `document.currentScript.src` rather than assuming a fixed root,
   so it works from any repository sub-path.
10. **Reconnect handling** — `.info/connected` monitoring + exponential-backoff retry
    on listener errors, implemented once in `gs-firebase.js`.
11. **Room selection / cloud setup / listener bugs removed** — the three previously
    inconsistent `|| 'default'` fallbacks are gone, replaced by one shared resolver.
12. **No regressions** — all overlay markup, CSS, animations, per-overlay Google
    Sheets `js/*.js` fetch logic, Theme Manager presets/color tools/undo history, and
    hosting configuration are unchanged; a full local-reference scan after the
    refactor found zero broken file paths.
