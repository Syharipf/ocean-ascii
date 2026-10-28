const TAU = Math.PI * 2;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

function parseHex(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
}

function toHex(r, g, b) {
  const R = clamp(Math.round(r), 0, 255).toString(16).padStart(2, "0");
  const G = clamp(Math.round(g), 0, 255).toString(16).padStart(2, "0");
  const B = clamp(Math.round(b), 0, 255).toString(16).padStart(2, "0");
  return `#${R}${G}${B}`;
}

const PALETTES = {
  // Golden sunrise: warm teal water, amber golden glow, soft rosy clouds
  morning: {
    sea: "#163f4c",
    seaGrad: "#204e57",
    grid: "#335e69",
    foam: "#f6d59b",
    cloud: "#f4dbd4",
    glow: "#ffb86c",
    caustics: "#ffd384",
    light: 0.95
  },
  // Crisp midday: vibrant tropical deep azure, sparkling cyan foam, bright silver clouds
  day: {
    sea: "#0e4b5c",
    seaGrad: "#196b7d",
    grid: "#2a7f92",
    foam: "#c2f5ff",
    cloud: "#e4f3f5",
    glow: "#a0eaff",
    caustics: "#7ee8fa",
    light: 1.05
  },
  // Sunset / Senja: rich twilight violet-indigo, fiery coral-amber glow, warm mist
  evening: {
    sea: "#2a223e",
    seaGrad: "#3d2d4d",
    grid: "#543c5b",
    foam: "#ffa382",
    cloud: "#d69bb8",
    glow: "#ff7052",
    caustics: "#f3906c",
    light: 0.90
  },
  // Abyssal midnight: deep bioluminescent navy, electric cyan highlights, ethereal glow
  night: {
    sea: "#020914",
    seaGrad: "#08182b",
    grid: "#132c40",
    foam: "#5ae0ea",
    cloud: "#6389a3",
    glow: "#36b0cc",
    caustics: "#239db8",
    light: 0.78
  }
};

const PHASE_SEQUENCE = ["morning", "day", "evening", "night"];

function lerpColor(c1, c2, t) {
  const [r1, g1, b1] = parseHex(c1);
  const [r2, g2, b2] = parseHex(c2);
  return toHex(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t
  );
}

function lerpPalette(p1, p2, t) {
  return {
    sea: lerpColor(p1.sea, p2.sea, t),
    seaGrad: lerpColor(p1.seaGrad, p2.seaGrad, t),
    grid: lerpColor(p1.grid, p2.grid, t),
    foam: lerpColor(p1.foam, p2.foam, t),
    cloud: lerpColor(p1.cloud, p2.cloud, t),
    glow: lerpColor(p1.glow, p2.glow, t),
    caustics: lerpColor(p1.caustics, p2.caustics, t),
    light: p1.light + (p2.light - p1.light) * t
  };
}

class Environment {
  constructor({ random = Math.random } = {}) {
    this.random = random;
    this.elapsed = 0;

    // Weather schedule
    this.weatherKind = "clear"; // "clear" | "rain" | "snow"
    this.intervalStart = 0;
    this.intervalDuration = 180 + this.random() * 180; // dry 180-360s
    this.peakIntensity = 0.45 + this.random() * 0.40;  // 0.45-0.85
    this.whirlpoolCount = 0; // planned whirlpools for the current wet spell
  }

  advance(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    this.elapsed += seconds;

    while (this.elapsed >= this.intervalStart + this.intervalDuration) {
      this.intervalStart += this.intervalDuration;
      if (this.weatherKind === "clear") {
        this.weatherKind = this.random() < 0.35 ? "snow" : "rain";
        this.intervalDuration = 60 + this.random() * 60;   // wet 60-120s
        this.peakIntensity = 0.45 + this.random() * 0.40;  // peak 0.45-0.85
        this.whirlpoolCount = 0;
        if (this.weatherKind === "rain") {
          const roll = this.random();
          this.whirlpoolCount = roll < 0.65 ? 0 : roll < 0.92 ? 1 : 2;
        }
      } else {
        this.weatherKind = "clear";
        this.intervalDuration = 180 + this.random() * 180; // dry 180-360s
        this.whirlpoolCount = 0;
      }
    }
  }

  currentPrecipitationIntensity() {
    if (this.weatherKind === "clear") return 0;
    const t = this.elapsed - this.intervalStart;
    const dur = this.intervalDuration;
    const fade = 10;
    if (t < fade) {
      return this.peakIntensity * smoothstep(0, fade, t);
    }
    if (t > dur - fade) {
      return this.peakIntensity * (1 - smoothstep(dur - fade, dur, t));
    }
    return this.peakIntensity;
  }

  snapshot({ phase = "auto", weather = "auto" } = {}) {
    const cycleSeconds = this.elapsed % 1200;
    let autoPhaseIndex = Math.floor(cycleSeconds / 300);
    if (autoPhaseIndex > 3) autoPhaseIndex = 3;
    const autoPhase = PHASE_SEQUENCE[autoPhaseIndex];

    const phaseOffset = cycleSeconds - autoPhaseIndex * 300;
    let transition = 0;
    if (phaseOffset >= 270) {
      transition = smoothstep(270, 300, phaseOffset);
    }

    const nextPhaseIndex = (autoPhaseIndex + 1) % 4;
    const basePalette = PALETTES[autoPhase];
    const targetPalette = PALETTES[PHASE_SEQUENCE[nextPhaseIndex]];
    const autoPalette = transition > 0 ? lerpPalette(basePalette, targetPalette, transition) : basePalette;

    let effectivePhase = autoPhase;
    let effectivePalette = autoPalette;
    let effectiveTransition = transition;

    if (phase !== "auto" && PALETTES[phase]) {
      effectivePhase = phase;
      effectivePalette = PALETTES[phase];
      effectiveTransition = 0;
    }

    let resolvedWeather = this.weatherKind;
    let rainIntensity = 0;
    let snowIntensity = 0;
    let whirlpoolCount = this.whirlpoolCount;
    if (weather === "clear") {
      resolvedWeather = "clear";
      whirlpoolCount = 0;
    } else if (weather === "rain") {
      resolvedWeather = "rain";
      rainIntensity = 0.65;
      whirlpoolCount = 1;
    } else if (weather === "snow") {
      resolvedWeather = "snow";
      snowIntensity = 0.65;
      whirlpoolCount = 0;
    } else {
      const precip = this.currentPrecipitationIntensity();
      if (this.weatherKind === "rain") {
        rainIntensity = precip;
      } else if (this.weatherKind === "snow") {
        snowIntensity = precip;
      }
    }

    return {
      phase: effectivePhase,
      weather: resolvedWeather,
      cycleSeconds,
      transition: effectiveTransition,
      rainIntensity,
      snowIntensity,
      whirlpoolCount,
      palette: effectivePalette
    };
  }
}

export {
  Environment,
  PALETTES,
  PHASE_SEQUENCE,
  lerpPalette
};
