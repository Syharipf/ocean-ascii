# Publishing Guide: Laut ASCII

This guide contains publication templates and instructions for the KDE Store, Reddit, and Linux distribution channels.

## 1. KDE Store Listing

Upload URL: [https://store.kde.org](https://store.kde.org) (requires maintainer login).

- **Product Title:** Laut ASCII
- **Summary:** Animated ASCII ocean wallpaper with a 20-minute day/night cycle, random rain and mythic sea creatures for KDE Plasma 6
- **Category:** Plasma 6 → Wallpaper
- **Tags:** `ascii`, `ocean`, `wallpaper`, `plasma6`, `animated`
- **License:** MIT
- **Release Asset:** `laut-ascii-1.1.0.tar.gz` (packaged root `./package`)

*Note: KDE Store uploads require the maintainer's personal account and the three screenshots generated below.*

### Screenshot Recipe

Run the following command to extract high-resolution representative phase screenshots from `docs/preview.gif`:

```sh
mkdir -p docs/screenshots
ffmpeg -y -i docs/preview.gif -vf "select=eq(n\,15)" -vframes 1 docs/screenshots/morning.png
ffmpeg -y -i docs/preview.gif -vf "select=eq(n\,45)" -vframes 1 docs/screenshots/day-rain.png
ffmpeg -y -i docs/preview.gif -vf "select=eq(n\,105)" -vframes 1 docs/screenshots/night.png
```

## 2. Reddit Post Template

Recommended subreddits: **r/unixporn**, **r/kde**.

**Title:**
`[Plasma 6] Laut ASCII — an animated ASCII ocean wallpaper with a 20-minute day/night cycle and mythic sea creatures`

**Body:**
> Hey everyone,
>
> I just released **Laut ASCII v1.1.0**, a native animated top-down ASCII ocean wallpaper for KDE Plasma 6.
>
> **Key features:**
> - Four rotating marine slots featuring 14 species (including mythic beasts: megalodon, leviathan, kraken).
> - 20-minute continuous cycle across morning, day, evening, and night with smooth 30-second mood palette transitions.
> - Dynamic weather scheduler with stochastic rain showers and surface ripples.
> - Fully native Qt Quick scene (`FrameAnimation`, cached 12-strip creature textures; zero full-screen canvas repaints).
> - Battery-friendly auto-freeze when application windows are visible.
>
> **Repository & Preview:**
> https://github.com/Syharipf/ocean-ascii
>
> *(Preview GIF attached above)*

## 3. Distribution Channels

An AUR package and the KDE Store listing are the two highest-traffic distribution channels, and GitHub topics are already set by this plan.
