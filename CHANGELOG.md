# Changelog

## 1.2.0

- Dynamic ambient particles: caustics specks, foam sparkles, floating dust motes, and surface birds per cycle phase.
- Snow weather system with drifting flakes and swaying trajectories alongside rain.
- Standalone preview tour cycling all 12 phase and weather combinations.
- Rebuilt preview animation covering all 12 combinations in 24 seconds.

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
