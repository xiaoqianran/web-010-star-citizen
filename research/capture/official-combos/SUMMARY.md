# Official untested-combo pass

Captured: 2026-08-16T19:56:01Z  
Script: `scripts/traverse-official-combos.mjs`  
Site: ARK Starmap 9.536.0 window mode  
Does not save official binaries. PNGs are gitignored.

## Methods used

Ranked in `research/METHODS.md`. This pass is tier 2 (class-based puppeteer) plus tier 3 (2015 CIG tutorial) for what to click.

Pixel check on `03-right-center.png`: the DOM lists INSPECT at (410,226) with `opacity:1`, but that crop is empty starfield. Those `<a>` tags are in the tree and not painted until a disc is actually open.

## Right-click

- Galaxy empty space (7 points including Sol-ish): **no painted context menu**. Camera URL did not change. Clicking the hidden INSPECT node also did not set `location`.
- After search-enter Terra STAR SYSTEM, system view shows the **routing disc** (`BACK` / `SET AS:DEPARTURE` / `SET AS:DESTINATION` / `AVOID`) and `starmap-disc`.
- System-view right-click at canvas center did not add a new INSPECT list; the routing disc was already open.
- Double-click in Terra: `location` / `camera` unchanged.

2015 tutorial still stands as first-party intent (right-click object → INSPECT). On 9.536.0 window mode, empty-space right-click is a no-op.

ComputerUse follow-up (2026-08-16, window mode): right-click on a **labeled galaxy system (SOL)** also paints **no** INSPECT/INFORMATION/ROUTING/BOOKMARK menu. The system only gets a green highlight. Left-click likewise highlights; double-click does not enter the system. Control-disc pages still exist in leftover DOM and paint after a disc is actually open — they are not a floating right-click menu.

## Search + Enter

Official table appears after Enter (window-mode dock). Caption is `N ITEMS FOUND` / `1 ITEM FOUND`. Columns NAME | TYPE | BOOKMARK.

| Query | Official UI |
| --- | --- |
| Terra | 26 ITEMS FOUND. First row `TERRA` STAR SYSTEM, then `TERRA NOVA IN TERRA` STAR, planets, satellites |
| Cassel | `1 ITEM FOUND` · `CASSEL IN GOSS` PLANET |
| jump | `NO OBJECTS FOUND WITH FILTERS.` |
| Goss A | `1 ITEM FOUND` · `GOSS A IN GOSS` STAR |
| ARK | `2 ITEMS FOUND` · MARKAHIL STAR + `THE ARK IN TAYAC` MAN-MADE |
| a | no table (too short) |
| Kayfa | `9 ITEMS FOUND` · no STAR SYSTEM row; names use `KAI'PUA (KAYFA)` |
| Levski | `1 ITEM FOUND` · `LEVSKI IN NYX` **LANDING ZONE** |
| empty field | no autocomplete this session (no prior visits stored) |

Clicking Terra STAR SYSTEM briefly uses `?selection=TERRA`, then `?location=TERRA&camera=60,0,0.002,0,0`.

## System DISPLAY (`sm-system-display-tab`)

Locked from `dump-system-display.json` + `10-system-display.png`:

- **Only** SENSORS (POPULATION / ECONOMY / THREAT) + CAMERA (3D / 2D)
- **No** FACTIONS, **no** JUMP TUNNELS
- Bar is 60px tall at the bottom (`y=989`)

Galaxy DISPLAY still has the four groups from leftover.

## Routes Calculate (3s wait, still in Terra system)

GOSS / TERRA fields filled, S/M/L clicked, `CALCULATE >` clicked. Body text had no `JUMP` / `THROUGH` / shortest table. Overlay crop is the existing routing disc, not a result card. Calculate result table still not captured in system view / window dock.

## Keyboard / camera

- Keys after canvas click: **no** `camera=` change (URL often dropped query while on `/routes`)
- Left-drag **did** write `camera=50,-19.69,0.002,0,0`
- Compass / 2D / 3D `clickText` missed (labels are icon-bar, not short buttons)

## Clone follow-up from this pass

- Disc + right-click menu include 查看 (INSPECT); INSPECT flies the camera and does not open the info card
- System DISPLAY hides factions / jump tunnels
- Search object rows use `名称 于 星系` to match `CASSEL IN GOSS`
- Search submits on Enter (min 3 chars). System rows match name prefix only, so Kayfa=9 and no STAR SYSTEM, ARK=2.
- Galaxy left-click highlights with a green ring; SYS enters the highlighted system. Search STAR SYSTEM still enters.
