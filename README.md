# SUNHAVEN BAY

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/verrysimatupang99/makefun-gta6-sunhaven-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/verrysimatupang99/makefun-gta6-sunhaven-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game for the browser — a sun-soaked coastal city with traffic,
pedestrians, a wanted system with police pursuit, and a 4-mission story arc. Built entirely
with three.js (vendored, no network calls) as static files in `game/`.

## Play

```
node serve.ts        # serves game/ on http://localhost:8080
```

Walk with WASD + mouse, press E by a car to steal it, outrun the heat, take jobs from Vinny,
Marisol and the Dockmaster. `?shot=<cover|city|chase|mission>&seed=<n>` renders deterministic
cinematic scenes (see `shots.json`); `shot-capture.mjs` shoots them headless.

## Entry

Handed in by `main.ts`: copies `game/` + `screenshots/` to /output and writes `dossier.json`
via `vendor/makefun-game.ts`. Made for [make.fun](https://make.fun)'s "Make GTA 6" bounty —
[verrysimatupang99/makefun-gta6-sunhaven-01](https://github.com/verrysimatupang99/makefun-gta6-sunhaven-01).
