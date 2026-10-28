const PHASE_INDEX = { morning: 0, day: 1, evening: 2, night: 3 };

// Per-phase budgets and motion. Load-bearing: the checks assert these exact counts.
const AMBIENCE_PROFILES = [
  { glints: 23, motes: 60, birds: 2, glintGlyphs: ["·", "˙", "∙", "*"],
    moteGlyph: "·", moteAlpha: 0.20, moteRise: -3.2, moteDrift: 2.4,
    bandAlpha: 0.16, bandWidth: 0.34 },
  { glints: 35, motes: 34, birds: 0, glintGlyphs: ["·", "∙", "*", "~"],
    moteGlyph: "˙", moteAlpha: 0.14, moteRise: -2.0, moteDrift: 3.6,
    bandAlpha: 0.22, bandWidth: 0.30 },
  { glints: 26, motes: 66, birds: 2, glintGlyphs: ["·", "˙", "~", "*"],
    moteGlyph: "·", moteAlpha: 0.22, moteRise: -4.0, moteDrift: 2.8,
    bandAlpha: 0.20, bandWidth: 0.42 },
  { glints: 19, motes: 78, birds: 0, glintGlyphs: ["·", "∙", "*", "˙"],
    moteGlyph: "·", moteAlpha: 0.26, moteRise: -1.4, moteDrift: 1.6,
    bandAlpha: 0.13, bandWidth: 0.26 }
];

class Ambience {
  constructor({ random = Math.random } = {}) {
    this.random = random;
    this.width = 0;
    this.height = 0;
    this.phase = "morning";
    this.profile = AMBIENCE_PROFILES[0];
    this.glints = [];
    this.motes = [];
    this.birds = [];
    this.band = { x: 0.5, width: 0.34, alpha: 0 };
    this.elapsed = 0;
    this.cache = null;
  }

  resize(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return;
    this.width = width;
    this.height = height;
    this.seed();
  }

  setPhase(phase) {
    if (!(phase in PHASE_INDEX) || phase === this.phase) return;
    this.phase = phase;
    this.seed();
  }

  seed() {
    const W = this.width;
    const H = this.height;
    const p = this.profile = AMBIENCE_PROFILES[PHASE_INDEX[this.phase]];
    this.glints = [];
    this.motes = [];
    this.birds = [];
    this.cache = null;
    if (W <= 0 || H <= 0) return;
    for (let i = 0; i < p.glints; i++) {
      this.glints.push({
        x: this.random() * W,
        y: this.random() * H,
        glyph: p.glintGlyphs[Math.floor(this.random() * p.glintGlyphs.length)],
        size: 8 + Math.floor(this.random() * 5),
        phase: this.random() * Math.PI * 2,
        freq: 0.8 + this.random() * 2.2
      });
    }
    for (let i = 0; i < p.motes; i++) {
      this.motes.push({
        x: this.random() * W,
        y: this.random() * H,
        vx: (this.random() - 0.5) * p.moteDrift,
        vy: p.moteRise * (0.5 + this.random() * 0.8),
        glyph: p.moteGlyph,
        alpha: p.moteAlpha * (0.4 + this.random() * 0.6)
      });
    }
    for (let i = 0; i < p.birds; i++) {
      const dir = this.random() < 0.5 ? 1 : -1;
      this.birds.push({
        x: this.random() * W,
        y: this.random() * H * 0.8,
        vx: dir * (22 + this.random() * 18),
        text: i % 2 === 0 ? "~v~" : "^^",
        alpha: 0.28 + this.random() * 0.22
      });
    }
    this.band = { x: 0.5, width: p.bandWidth, alpha: p.bandAlpha };
  }

  step(dt, phase) {
    this.setPhase(phase);
    const p = this.profile;
    this.elapsed += dt;
    const W = this.width;
    const H = this.height;
    if (W <= 0 || H <= 0) return;
    for (const m of this.motes) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.y < -20) { m.y = H + 20; m.x = this.random() * W; }
      if (m.y > H + 20) { m.y = -20; m.x = this.random() * W; }
      if (m.x < -20) m.x = W + 20;
      if (m.x > W + 20) m.x = -20;
    }
    for (const b of this.birds) {
      b.x += b.vx * dt;
      if (b.x < -90) b.x = W + 90;
      if (b.x > W + 90) b.x = -90;
    }
    const t = this.elapsed;
    this.band.x = 0.5 + Math.sin(t * 0.021) * 0.18;
    this.band.width = p.bandWidth * (0.85 + 0.15 * Math.sin(t * 0.13));
    this.band.alpha = p.bandAlpha * (0.8 + 0.2 * Math.sin(t * 0.27));
  }

  snapshot() {
    if (!this.cache) this.cache = {};
    this.cache.glints = this.glints;
    this.cache.motes = this.motes;
    this.cache.birds = this.birds;
    this.cache.band = this.band;
    return this.cache;
  }
}

export { Ambience, AMBIENCE_PROFILES };
