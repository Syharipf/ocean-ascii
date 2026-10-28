# Laut ASCII (plasma-ascii-ocean)

An animated, top-down ASCII ocean wallpaper for KDE Plasma 6, featuring marine life, dynamic day/night cycles, random rain or snow, rolling waves, and translucent ASCII mist.

![Laut ASCII animated preview](docs/preview.gif)
*Montage of 12 segments (4 phases × 3 weathers: clear, rain, snow; 2 s each = 24 s) highlighting all 14 marine species (11 real, 3 mythic) across active phases and weather conditions.*
**Package ID:** `org.local.lautascii`  
**License:** [MIT](LICENSE)

## Features

- **An evolving ocean:** four large marine animal slots appear simultaneously and rotate naturally between species, alongside colorful schools of fish.
- **20-Minute day-night cycle & dynamic weather:** continuous morning, day, evening, and night phases (5 minutes each) with smooth transitions, accompanied by local stochastic rain or snow spells (snow rarer, 35%).
- **Mood lighting:** each phase tints water, caustics, foam and mist, and the ocean keeps a soft radial caustic glow with peripheral depth vignette instead of a flat single-tone gradient.
- **Clean desktop:** no built-in clock or desktop control overlay.
- **Automatic pause:** animation freezes when application windows are visible on the current virtual desktop and activity. Minimized and hidden windows are ignored; Show Desktop resumes animation. Auto-pause is disabled in the standalone preview.
- **Configurable:** choose animal species, effects, mouse interaction, automatic pause, and a target frame rate.
- **No build step:** the Plasma package runs directly from QML and JavaScript files.

### Marine life

Mixed mode rotates through **14 large-animal types**, with **4 active slots** rather than displaying every species at once: manta ray, sea turtle, whale, jellyfish, hammerhead shark, tiger shark, mako shark, thresher shark, squid, swordfish, and zebra shark. Three mythic creatures join the rotation: megalodon (ancient apex shark), leviathan (abyssal serpent) and kraken (abyssal terror). Animals change species only after leaving the viewport.
Schools use **6 small-fish types**: sardine, anchovy, silverside, mackerel, goby, and tang. Small-fish population scales with viewport size and is capped at 160. These are stylized ASCII representations, not biologically accurate models.

## Platform support and architecture

| Module | Purpose |
| --- | --- |
| `package/contents/ui/environment.mjs` | Pure ECMAScript 20-minute cycle clock, smooth phase palettes, and deterministic stochastic rain scheduler |
| `package/contents/ui/engine.mjs` | Pure ECMAScript simulation, 4-slot spine physics, appearance classification, and snapshot generation |
| `package/contents/ui/Animal.qml` | Hardware-transformed 12-strip native Qt Quick delegate with cached small textures |
| `package/contents/ui/Atmosphere.qml` | Native Qt Quick swells, ASCII mist clouds, rain drops, ripples, and wake particles |
| `package/contents/ui/Ocean.qml` | Portable Qt Quick scene using FrameAnimation and native scene graph transforms; no full-screen Canvas repaint |
| `preview.qml` | Standalone Qt 6 preview with Qt Quick Controls; does not require KDE modules |

**Native wallpaper support is verified on KDE Plasma 6 Wayland only.** X11 has not been tested. The engine and standalone Qt preview are designed to be portable, but Windows and macOS have not been tested. This project does not provide native wallpaper integration for Windows, macOS, GNOME, or other desktop environments/compositors.

## Requirements

- KDE Plasma 6 for desktop wallpaper integration.
- Qt 6 Quick, Kirigami, and the Plasma runtime modules.
- `kpackagetool6`, normally supplied by your distribution's KPackage/Plasma packages.
- **Optional:** `qml6` for the standalone preview and Qt checks.
- **Optional:** Node.js 22+ for engine checks and the Linux CPU/memory sampler.

## Installation

Download and extract this repository, then open a terminal in the project directory. Run as your normal user; no `sudo` is needed:

```sh
kpackagetool6 --type Plasma/Wallpaper --install ./package
```

### Activate the wallpaper

1. Right-click the Plasma desktop and select **Configure Desktop and Wallpaper...**.
2. Set **Wallpaper Type** to **Laut ASCII**.
3. Adjust the animal selection, rain, waves, ASCII mist, mouse interaction, and automatic pause settings.
4. Click **Apply**.

The package is installed in your user-local Plasma wallpaper directory, typically `~/.local/share/plasma/wallpapers/org.local.lautascii/`.

## Updating and refreshing

From the updated project directory:

```sh
kpackagetool6 --type Plasma/Wallpaper --upgrade ./package
```

To reload the wallpaper without clearing caches or restarting Plasma:

1. Open **Configure Desktop and Wallpaper...**.
2. Select **Image** and click **Apply**.
3. Wait a few seconds for the old wallpaper instance to unload.
4. Select **Laut ASCII** again and click **Apply**.

Plasma can retain QML components in memory. If the old version still appears, save your work, log out, and log back in. Do not delete the entire Plasma cache.

## Uninstalling

First switch to another wallpaper, such as **Image**, in Plasma's desktop settings. Then remove the package:

```sh
kpackagetool6 --type Plasma/Wallpaper --remove org.local.lautascii
```

## Performance and limitations

- **Target FPS is not guaranteed FPS.** Actual frame rates depend on screen resolution, hardware, Qt, and the selected effects.
- **Rendering is native scene-graph work.** Creatures are 12 cached strip textures moved and rotated by Qt Quick; fish, waves, mist, rain and ripples are native text/rectangle items; caustic specks are a cached Canvas repainted about once per second and the per-phase ambience is native text/rectangle items. No full-screen Canvas is repainted per frame.
- **Work is bounded:** animal shapes are classified once and then warped along their moving spines. ASCII mist uses cached native text. Frames are paced to avoid continuously queuing work.
- **Automatic pause saves work, not all Plasma CPU usage.** It stops wallpaper simulation and periodic painting; panels and other widgets may still consume resources.
- **Battery use:** animated wallpaper still consumes power while running. Keep automatic pause enabled, disable effects, or use a static wallpaper when battery life matters most.
- **Privacy:** no network requests, telemetry, or global mouse capture outside the wallpaper surface.

### Local measurements

Measured on CachyOS, Wayland, with 12 logical CPUs. These samples are not guarantees for other machines.

| Condition / metric | Measured result |
| --- | --- |
| Scene updates, 1920 × 1200, target 30 FPS | 30.0 updates/s (presented 59.8 FPS window swaps) |
| Frame update cost, p95 | 8 ms (median 4 ms, mean 4.5 ms, max 12 ms; qualityLevel 0) |
| Plasma with wallpaper running, 10-second sample | 83.5% of one logical CPU; 6.96% of total 12-CPU capacity; RSS 469.3 MiB |
| Plasma with automatic pause settled, 10-second sample | 0.00% of one logical CPU; RSS 470.3 MiB |
| docs/preview.gif | 960 × 600, 120 frames, 12.0 s, 3.70 MB |

CPU and memory values cover **the entire `plasmashell` process**, including panels and other widgets—not the wallpaper alone. The renderer deliberately leaves idle time between paints, so it can miss its FPS target even when individual render time is lower than the complete frame interval.

## Preview, checks, and benchmarks

Run these commands from the project directory.

### Standalone preview

```sh
qml6 preview.qml
```

This opens the same ocean scene without installing or changing your desktop wallpaper. Automatic pause is disabled in this preview.

### Deterministic engine checks

```sh
node checks/fish-check.mjs
```

Checks simulation invariants, species rotation, fixed-species selection, pointer interaction, and pause/reset behavior. GitHub Actions runs this check on pushes and pull requests.

### Native scene benchmark

```sh
qml6 checks/benchmark.qml
```

Measures native Qt Quick scene updates and presented frame rates, reporting `sceneUpdatesPerSecond`, `presentedFramesPerSecond`, `meanUpdateMs`, `p95UpdateMs`, `maxUpdateMs`, and `qualityLevel` (presented frames are window swaps, not monitor scanout). Run it while the desktop wallpaper is paused to avoid doubling the rendering workload.

### Cycle and weather checks

```sh
node checks/environment-check.mjs
```

Validates the 20-minute cycle clock, mood palette transitions, and deterministic weather scheduler boundaries.

### Documentation recording

```sh
qml6 checks/capture-gif.qml
```

Records 240 PNG frames to `/tmp/laut-gif-frames` across all 12 combinations (4 phases × clear, rain, snow; 20 frames / 2 s each) for building `docs/preview.gif`.

### Qt lifecycle regression check

```sh
qml6 checks/ocean-check.qml
```

Exercises real rendering, pause/resume, resize, and KDE application-window auto-pause. Unlike the standalone preview and benchmark, this check requires KDE modules. It writes scene snapshots to `/tmp/laut-ascii-release-before.png` and `/tmp/laut-ascii-release-after.png`.

### Linux CPU and memory sampling

```sh
node checks/usage.mjs 10
```

Reads Linux `/proc` for ten seconds and reports CPU usage relative to one logical CPU and total logical CPU capacity, plus the resident memory of the entire current user's `plasmashell` process. This sampler is Linux-specific.

## Troubleshooting

Confirm that Plasma recognizes the installed package:

```sh
kpackagetool6 --type Plasma/Wallpaper --show org.local.lautascii
```

If Qt logs do not appear in the terminal, enable stderr logging for a preview or check:

```sh
QT_FORCE_STDERR_LOGGING=1 qml6 preview.qml
```

On systems using the Plasma systemd user service, inspect its logs:

```sh
journalctl --user -b -u plasma-plasmashell.service
```

For a live log view:

```sh
journalctl --user -f -u plasma-plasmashell.service
```

If animation appears frozen, check whether automatic pause is enabled and an application window is still visible on the current desktop. Minimize application windows or use Show Desktop to resume.

## Contributing

Bug reports and pull requests are welcome. Include your Plasma and Qt versions, desktop session type, display resolution/scaling, relevant settings, and reproduction steps. For performance reports, include actual Qt benchmark output rather than results from a mock drawing context.

Keep changes small and dependency-free where practical. Run the engine checks and, for visual or lifecycle changes, the relevant Qt checks before submitting. See [CHANGELOG.md](CHANGELOG.md) for release notes.

## License and credits

Released under the [MIT License](LICENSE). The installed wallpaper package also includes its own copy of the license.

The simulation and renderer derive from [ascii-sharks](https://github.com/stackedlol/ascii-sharks) by drewdi, based on revision `a0074c16a106f0abc665fe9712ca445f8f98ad8e`. Original copyright and permission notices are preserved. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for provenance and the upstream license.
