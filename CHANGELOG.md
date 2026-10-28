# Changelog

## 1.3.0

- **Reworked mythic creature silhouettes:**
  - **Kraken**: True cephalopod anatomy with a forward-streaming arm crown of 8 undulating tentacles, 2 extended paddle-tipped feeding tentacles trailing along the flanks, glowing lateral eyes, and a hydrodynamic muscular mantle with terminal fins.
  - **Megalodon**: Colossal apex predator proportions with a broad blunt snout, massive barrel girth (~39% body length), expansive swept falcate pectoral wings, imposing dorsal ridge, and high-aspect crescent tail.
  - **Leviathan**: Refined sea serpent silhouette with undulating reptilian humps, unbroken serrated dorsal frill, paired flippers, and luminous bioluminescent skin without facial voids.
- **Rain maelstroms (whirlpools):** Enlarged vortex radius (120–360 px), 4 curved spiral glyph arms (58 glyphs per pool), and borderless dark vortex core for natural visual blending.

## 1.2.0

- **Realistic top-down precipitation:** Rain drops streak through the air and strike the water surface, triggering instantaneous splash crowns and expanding circular ripple waves (`o` -> `( )`). Snow flakes descend with wind sway, land softly on the sea, float with the ocean swell, and melt into seawater.
- **Dynamic ambient system:** Caustic light specks, foam sparkles, floating dust motes, and distant seabirds rendered per cycle phase.
- **12-Combination standalone preview tour:** Automated 2-second tour cycling all 4 day/night phases across Clear, Rain, and Snow weather states.
- **English configuration UI:** Full English localization across all settings, creature names, and package metadata.
- **High-performance native rendering:** Zero-anchor flat item hierarchy maintaining 30 FPS scene updates with 8 ms p95 frame update times.
- **Rebuilt 24-second preview:** `docs/preview.gif` montage covering all 12 combinations within budget ($7.70\text{ MB} \le 8\text{ MB}$).

## 1.1.0

- Four simultaneous creature slots instead of three.
- 20-minute morning, day, evening, and night cycle with mood palettes and smooth 30-second transitions.
- Random dry/rain scheduler with fade in and fade out; existing rain toggle now acts as random rain permission.
- Mythic creatures megalodon, leviathan, and kraken alongside the 11 real species.
- Native `FrameAnimation` scene (no full-screen Canvas repaint) with 12-strip cached creature textures.
- Phase/weather overrides and zebra shark in the standalone preview.
- New `checks/environment-check.mjs`, native `checks/benchmark.qml` metrics, and updated `checks/ocean-check.qml`.

## 1.0.0

- Native KDE Plasma 6 wallpaper: rotating ASCII marine life, colored schools, rain, waves, and transparent ASCII mist; clock-free.
- Auto-freeze tracking visible windows across the current activity and virtual desktop; Show Desktop resumes animation.
- Clean resume discarding pause duration, coalesced resize, and unqueued rendering.
- Configurable FPS and creature filters with persistent settings; standalone preview independent of auto-freeze.
- Node unit checks, Qt lifecycle smoke tests, Canvas benchmarks, and Linux CPU/RAM measurement scripts without extra dependencies.
- MIT license, `ascii-sharks` attribution, and installation instructions via `kpackagetool6`.
