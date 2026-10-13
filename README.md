# Cat Block Rescue Club

A mobile-first, single-page 2D cat rescue game hosted with GitHub Pages.

## Current build
- Rebuilt from scratch in `index.html`; the previous game UI and blurred room asset have been removed.
- Cozy room drawn as crisp, layered SVG artwork; the cat, care meters, furniture, and toys are separate visual layers.
- Room, feed, shop, cats, tasks, garden, settings, and 8×8 block puzzle screens.
- Food purchases update hunger and coins; care actions update happiness/cleanliness.
- Shop purchases are saved and placed into the room; buying an existing item places it without charging again.
- Puzzle placement validates bounds and occupied cells, clears completed rows, awards coins, and advances levels.
- New save namespace: `cat-block-rescue-club-v2` to avoid mixing data from the old prototype.

## Run locally
Serve the repository root over HTTP, then open it in a browser. The smoke test expects a server at `http://127.0.0.1:4173`.

## Test
`node tests/ui-smoke.mjs` (requires Playwright and Chromium).

## Live
https://vidocq911.github.io/cat-block-puzzle/
