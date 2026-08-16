# Official restore pass

Captured: 2026-08-16T20:38:21.694Z  
Script: `scripts/traverse-official-restore.mjs`  
Does not save official binaries. PNGs are gitignored.

## HUD leftover geometry (window mode, cookie banner on)

After window enter the map is live (`?camera=10,0,0.4,0,0`). SEARCH / ROUTES tabs open. Terra row click and CALCULATE body text still empty (headless inputs + cookie overlay). Header boxes **did** paint:

Search (`/search`) leftover columns, empty header text (CSS labels):

| class | box |
|---|---|
| `sm-table-container` | 552×76 at y=825 |
| `sm-name` | 186×34 |
| `sm-type` | 150×34 |
| `sm-bookmark-container` | 150×34 |
| `sm-go-container` | 38×34 |

Routes (`/routes`) leftover columns after CALCULATE / LARGE (still no JUMP/THROUGH text):

| class | box |
|---|---|
| `sm-list-region` | 1920×76 at y=825 |
| `sm-table-container` | 567×76 |
| `sm-label` | 200×34 |
| `sm-jumps` | 70×34 |
| `sm-distance` | 125×34 |
| `sm-selection` | 145×34 |
| `sm-navigation` | hidden 0×0 |

Form bar stays 60px at y=989: DEPARTURE / DESTINATION / SHIP SIZE / SMALL / MEDIUM / LARGE / CALCULATE.

## API (this pass used the live POST probe, not this HUD)

See `research/capture/probe/REPORT.json`. `ship_size` is the real key.
