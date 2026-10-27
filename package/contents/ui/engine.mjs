import { Environment } from "./environment.mjs";
const TAU = Math.PI * 2;
var clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
var rand = (lo, hi) => lo + Math.random() * (hi - lo);
var randInt = (lo, hi) => Math.floor(rand(lo, hi + 1));
function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
function hash3(x, y, z) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1442695041);
  h = Math.imul(h ^ h >>> 13, 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
var K1 = 1 / 260;
var K2 = 1 / 310;
var K3 = 1 / 190;
var CURRENT_SCALE = 3400;
function current(x, y, t, out) {
  const a = x * K1 + t * 0.07;
  const b = y * K2 - t * 0.05;
  const c = (x + y) * K3 + t * 0.11;
  out.x = (-K2 * Math.sin(a) * Math.sin(b) + 0.5 * K3 * Math.cos(c)) * CURRENT_SCALE;
  out.y = (-K1 * Math.cos(a) * Math.cos(b) - 0.5 * K3 * Math.cos(c)) * CURRENT_SCALE;
  return out;
}

var SPECIES = [
  {
    name: "sardine",
    cruise: 62,
    maxSpeed: 95,
    minSpeed: 28,
    weight: 3,
    schoolSize: [18, 28],
    spacing: [1.8, 1.1],
    align: 1.6,
    cohesion: 1.6,
    jitter: 40,
    mill: 70,
    verticalDrag: 0.5
  },
  {
    name: "anchovy",
    cruise: 75,
    maxSpeed: 110,
    minSpeed: 35,
    weight: 3,
    schoolSize: [20, 32],
    spacing: [1.5, 1],
    align: 3.2,
    cohesion: 0.45,
    jitter: 30,
    mill: 0,
    verticalDrag: 1.4
  },
  {
    name: "silverside",
    cruise: 68,
    maxSpeed: 100,
    minSpeed: 30,
    weight: 3,
    schoolSize: [12, 20],
    spacing: [2, 1.1],
    align: 2.4,
    cohesion: 1.1,
    jitter: 35,
    mill: 0,
    verticalDrag: 1.6
  },
  {
    name: "mackerel",
    cruise: 55,
    maxSpeed: 85,
    minSpeed: 25,
    weight: 2,
    schoolSize: [5, 9],
    spacing: [2.6, 1.3],
    align: 2,
    cohesion: 0.9,
    jitter: 25,
    mill: 0,
    verticalDrag: 2
  },
  {
    name: "goby",
    cruise: 48,
    maxSpeed: 75,
    minSpeed: 20,
    weight: 1,
    schoolSize: [8, 12],
    spacing: [1.4, 1.1],
    align: 0.35,
    cohesion: 1.4,
    jitter: 110,
    mill: 0,
    verticalDrag: 0.3
  },
  {
    name: "tang",
    cruise: 65,
    maxSpeed: 98,
    minSpeed: 30,
    weight: 2,
    schoolSize: [14, 24],
    spacing: [1.6, 1.1],
    align: 2,
    cohesion: 1.2,
    jitter: 35,
    mill: 40,
    verticalDrag: 1
  }
];
var TOTAL_WEIGHT = SPECIES.reduce((sum, s) => sum + s.weight, 0);
function pickSpecies() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (let i = 0; i < SPECIES.length; i++) {
    r -= SPECIES[i].weight;
    if (r <= 0) return i;
  }
  return 0;
}

var SHARK_NODES = 20;
var ALL_SPECIES_POOL = [
  "manta",
  "turtle",
  "whale",
  "jellyfish",
  "hammerhead",
  "tiger",
  "mako",
  "thresher",
  "squid",
  "swordfish",
  "zebra",
  "megalodon",
  "leviathan",
  "kraken"
];

var DEFAULT_SHARKS = [
  { kind: "kraken", size: 1.15 },
  { kind: "megalodon", size: 1.1 },
  { kind: "leviathan", size: 1.2 },
  { kind: "manta", size: 0.95 }
];

var FISH_SEPARATION_K = 420;
var FISH_ALIGN_K = 1.4;
var FISH_COHESION_K = 1;
var FISH_FLEE_K = 1100;
var BLIND_COS = -0.6;
var World = class {
  /** fishCount overrides the area-based population (the sidebar wants a single small school). */
  constructor(sharkSpecs = DEFAULT_SHARKS, fishCount) {
    this.sharkSpecs = sharkSpecs;
    this.fishCount = fishCount;
    this.width = 0;
    this.height = 0;
    this.time = 0;
    this.fish = [];
    this.sharks = [];
    this.events = [];
    this.pointer = { x: 0, y: 0, active: false };
    /** Fish neighbourhood radius; the spatial hash bucket size matches it. */
    this.perception = 60;
    /** Per-species personal space in px (x, y). */
    this.sepX = [];
    this.sepY = [];
    this.foreignSep = 40;
    this.bucketCols = 0;
    this.bucketRows = 0;
    this.bucketHead = new Int32Array(0);
    this.bucketCount = new Uint16Array(0);
    this.bucketNext = new Int32Array(0);
    this.lastSpawn = 0;
    this.tmp = { x: 0, y: 0 };
  }
  resize(width, height, cellW, cellH) {
    const first = this.width === 0;
    this.width = width;
    this.height = height;
    this.sepX = SPECIES.map((sp) => sp.spacing[0] * cellW);
    this.sepY = SPECIES.map((sp) => sp.spacing[1] * cellH);
    this.perception = Math.max(cellH * 3, cellW * 5.5);
    this.foreignSep = cellW * 3;
    if (first || this.fish.length === 0) {
      this.seed();
      return;
    }
    for (const f of this.fish) {
      f.x = clamp(f.x, 0, width);
      f.y = clamp(f.y, 0, height);
    }
  }
  seed() {
    const { width: W, height: H } = this;
    const minSide = Math.min(W, H);
    const baseLength = clamp(minSide * 0.44, 170, 430);
    const sharkCount = this.sharkSpecs.length;
    this.sharks = [];
    for (let i = 0; i < sharkCount; i++) {
      const { kind, size } = this.sharkSpecs[i];
      const length = baseLength * size;
      const orbitRadius = minSide * rand(0.28, 0.4);
      const a = i / sharkCount * TAU + rand(-0.4, 0.4);
      const orbitDir = i % 2 === 0 ? 1 : -1;
      const x = W / 2 + Math.cos(a) * orbitRadius * (W / minSide) * 0.9;
      const y = H / 2 + Math.sin(a) * orbitRadius;
      const heading = a + orbitDir * Math.PI / 2;
      const nodes = new Float32Array(SHARK_NODES * 2);
      const seg = length / (SHARK_NODES - 1);
      for (let n = 0; n < SHARK_NODES; n++) {
        nodes[n * 2] = x - Math.cos(heading) * seg * n;
        nodes[n * 2 + 1] = y - Math.sin(heading) * seg * n;
      }
      this.sharks.push({
        id: i + 1,
        kind,
        length,
        nodes,
        heading,
        speed: 65,
        phase: rand(0, TAU),
        turn: 0,
        hunger: rand(0.25, 0.75),
        wander: 0,
        orbitDir,
        orbitRadius,
        target: null,
        retargetAt: 0,
        depth: size,
        age: i * 6,
        fixedKind: this.kindFixed ?? false
      });
    }
    this.sharks.sort((a, b) => a.length - b.length);
    const total = this.fishCount ?? clamp(Math.round(W * H / 12000), 80, 160);
    this.fish = [];
    while (this.fish.length < total) {
      const species = pickSpecies();
      const sp = SPECIES[species];
      const size = Math.min(randInt(sp.schoolSize[0], sp.schoolSize[1]), total - this.fish.length);
      const millDir = Math.random() < 0.5 ? 1 : -1;
      const cx = rand(W * 0.06, W * 0.94);
      const cy = rand(H * 0.08, H * 0.92);
      const dir = (Math.random() < 0.5 ? 0 : Math.PI) + rand(-0.5, 0.5);
      for (let k = 0; k < size; k++) {
        this.fish.push({
          x: cx + rand(-1, 1) * this.sepX[species] * Math.sqrt(size),
          y: cy + rand(-1, 1) * this.sepY[species] * Math.sqrt(size) * 0.6,
          vx: Math.cos(dir) * sp.cruise,
          vy: Math.sin(dir) * sp.cruise,
          species,
          alarm: 0,
          alive: true,
          respawnAt: 0,
          phase: rand(0, TAU),
          turn: 0,
          depth: rand(0.55, 1),
          millDir
        });
      }
    }
    this.bucketNext = new Int32Array(this.fish.length);
  }
  splash(x, y) {
    this.events.push({ kind: "splash", x, y });
    const r = 240;
    for (const f of this.fish) {
      if (!f.alive) continue;
      const dx = f.x - x;
      const dy = f.y - y;
      const d = Math.hypot(dx, dy);
      if (d > r || d < 1e-3) continue;
      const k = (1 - d / r) * 260;
      f.vx += dx / d * k;
      f.vy += dy / d * k;
      f.alarm = 1;
    }
  }
  step(dt) {
    this.time += dt;
    this.rebuildHash();
    this.stepFish(dt);
    this.stepSharks(dt);
    this.respawn();
  }
  rebuildHash() {
    const size = this.perception;
    const pad = 2;
    this.bucketCols = Math.ceil(this.width / size) + pad * 2;
    this.bucketRows = Math.ceil(this.height / size) + pad * 2;
    const n = this.bucketCols * this.bucketRows;
    if (this.bucketHead.length !== n) {
      this.bucketHead = new Int32Array(n);
      this.bucketCount = new Uint16Array(n);
    }
    this.bucketHead.fill(-1);
    this.bucketCount.fill(0);
    if (this.bucketNext.length !== this.fish.length) {
      this.bucketNext = new Int32Array(this.fish.length);
    }
    for (let i = 0; i < this.fish.length; i++) {
      const f = this.fish[i];
      if (!f.alive) continue;
      const b = this.bucketOf(f.x, f.y);
      this.bucketNext[i] = this.bucketHead[b];
      this.bucketHead[b] = i;
      this.bucketCount[b]++;
    }
  }
  bucketOf(x, y) {
    const size = this.perception;
    const c = clamp(Math.floor(x / size) + 2, 0, this.bucketCols - 1);
    const r = clamp(Math.floor(y / size) + 2, 0, this.bucketRows - 1);
    return r * this.bucketCols + c;
  }
  stepFish(dt) {
    const { fish, sharks, pointer, width: W, height: H, time } = this;
    const R = this.perception;
    const R2 = R * R;
    const foreignSep = this.foreignSep;
    const size = this.perception;
    const cols = this.bucketCols;
    const rows = this.bucketRows;
    const head = this.bucketHead;
    const next = this.bucketNext;
    const cur = this.tmp;
    const calmDecay = Math.exp(-dt * 0.7);
    const contagion = Math.min(1, dt * 6);
    for (let i = 0; i < fish.length; i++) {
      const f = fish[i];
      if (!f.alive) continue;
      const sp = SPECIES[f.species];
      const spread = 1 + 1.8 * f.alarm;
      const sepX = this.sepX[f.species] * spread;
      const sepY = this.sepY[f.species] * spread;
      const speed = Math.hypot(f.vx, f.vy) || 1;
      const hx = f.vx / speed;
      const hy = f.vy / speed;
      let ax = 0;
      let ay = 0;
      let sx = 0;
      let sy = 0;
      let avx = 0;
      let avy = 0;
      let cx = 0;
      let cy = 0;
      let n = 0;
      let neighbourAlarm = 0;
      const bc = clamp(Math.floor(f.x / size) + 2, 0, cols - 1);
      const br = clamp(Math.floor(f.y / size) + 2, 0, rows - 1);
      for (let r = Math.max(0, br - 1); r <= Math.min(rows - 1, br + 1); r++) {
        for (let c = Math.max(0, bc - 1); c <= Math.min(cols - 1, bc + 1); c++) {
          let j = head[r * cols + c];
          while (j !== -1) {
            if (j !== i) {
              const o = fish[j];
              const dx = o.x - f.x;
              const dy = o.y - f.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < R2 && d2 > 1e-6) {
                const d = Math.sqrt(d2);
                if ((dx * hx + dy * hy) / d > BLIND_COS) {
                  const qx = dx / sepX;
                  const qy = dy / sepY;
                  const q2 = qx * qx + qy * qy;
                  if (q2 < 1) {
                    const q = Math.sqrt(q2) || 1e-3;
                    const k = (1 - q) / q;
                    sx -= qx * k;
                    sy -= qy * k;
                  }
                  if (o.species === f.species) {
                    avx += o.vx;
                    avy += o.vy;
                    cx += dx;
                    cy += dy;
                    n++;
                  } else if (d < foreignSep) {
                    const k = (1 - d / foreignSep) / d * 0.6;
                    sx -= dx * k;
                    sy -= dy * k;
                  }
                  if (o.alarm > neighbourAlarm) neighbourAlarm = o.alarm;
                }
              }
            }
            j = next[j];
          }
        }
      }
      ax += sx * FISH_SEPARATION_K;
      ay += sy * FISH_SEPARATION_K;
      if (n > 0) {
        const alignK = FISH_ALIGN_K * sp.align;
        const cohesionK = FISH_COHESION_K * sp.cohesion * (1 - 0.8 * f.alarm);
        ax += (avx / n - f.vx) * alignK + cx / n * cohesionK;
        ay += (avy / n - f.vy) * alignK + cy / n * cohesionK;
        if (sp.mill > 0) {
          const cl = Math.hypot(cx, cy) || 1;
          ax += -cy / cl * f.millDir * sp.mill * (1 - f.alarm);
          ay += cx / cl * f.millDir * sp.mill * (1 - f.alarm);
        }
      }
      let fear = 0;
      for (const sh of sharks) {
        const fearR = sh.length * 0.6 + 60;
        let best = Infinity;
        let bx = 0;
        let by = 0;
        for (let k = 0; k <= 12; k += 3) {
          const nx = sh.nodes[k * 2];
          const ny = sh.nodes[k * 2 + 1];
          const d2 = (f.x - nx) ** 2 + (f.y - ny) ** 2;
          if (d2 < best) {
            best = d2;
            bx = nx;
            by = ny;
          }
        }
        const d = Math.sqrt(best);
        if (d >= fearR || d < 1e-3) continue;
        let w = 1 - d / fearR;
        w *= w;
        const awayX = (f.x - bx) / d;
        const awayY = (f.y - by) / d;
        const shx = Math.cos(sh.heading);
        const shy = Math.sin(sh.heading);
        const side = shx * (f.y - sh.nodes[1]) - shy * (f.x - sh.nodes[0]) >= 0 ? 1 : -1;
        ax += (awayX * 0.7 - shy * side * 0.9) * FISH_FLEE_K * w;
        ay += (awayY * 0.7 + shx * side * 0.9) * FISH_FLEE_K * w;
        fear = Math.max(fear, Math.sqrt(w));
      }
      if (pointer.active) {
        const pr = 130;
        const dx = f.x - pointer.x;
        const dy = f.y - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < pr && d > 1e-3) {
          const w = (1 - d / pr) ** 2;
          ax += dx / d * FISH_FLEE_K * w;
          ay += dy / d * FISH_FLEE_K * w;
          fear = Math.max(fear, Math.sqrt(w) * 0.8);
        }
      }
      let alarm = Math.max(f.alarm * calmDecay, fear);
      const relayed = neighbourAlarm * 0.86;
      if (relayed > alarm) alarm += (relayed - alarm) * contagion;
      f.alarm = alarm;
      const m = 36;
      if (f.x < m) ax += (m - f.x) * 7;
      else if (f.x > W - m) ax -= (f.x - (W - m)) * 7;
      if (f.y < m) ay += (m - f.y) * 7;
      else if (f.y > H - m) ay -= (f.y - (H - m)) * 7;
      current(f.x, f.y, time, cur);
      ax += cur.x * 0.5 + (Math.random() - 0.5) * sp.jitter;
      ay += cur.y * 0.5 + (Math.random() - 0.5) * sp.jitter;
      ay -= f.vy * sp.verticalDrag * (1 - 0.7 * f.alarm);
      const preferred = sp.cruise * (1 + 1.3 * f.alarm);
      ax += (preferred - speed) * hx * 1.6;
      ay += (preferred - speed) * hy * 1.6;
      const before = Math.atan2(f.vy, f.vx);
      f.vx += ax * dt;
      f.vy += ay * dt;
      const maxSpeed = sp.maxSpeed * (1 + 1.8 * f.alarm);
      const s = Math.hypot(f.vx, f.vy);
      if (s > maxSpeed) {
        f.vx *= maxSpeed / s;
        f.vy *= maxSpeed / s;
      } else if (s < sp.minSpeed && s > 1e-3) {
        f.vx *= sp.minSpeed / s;
        f.vy *= sp.minSpeed / s;
      }
      f.turn += (angleDiff(before, Math.atan2(f.vy, f.vx)) / dt - f.turn) * Math.min(1, dt * 8);
      f.phase += dt * (7 + Math.hypot(f.vx, f.vy) * 0.12);
      f.x = clamp(f.x + f.vx * dt, -60, W + 60);
      f.y = clamp(f.y + f.vy * dt, -60, H + 60);
    }
  }
  stepSharks(dt) {
    const { sharks, width: W, height: H, time } = this;
    const minSide = Math.min(W, H);
    const cxW = W / 2;
    const cyW = H / 2;
    for (const sh of sharks) {
      const L = sh.length;
      const nodes = sh.nodes;
      const hx = nodes[0];
      const hy = nodes[1];
      sh.hunger = Math.min(1, sh.hunger + dt * 0.03);
      let dx = Math.cos(sh.heading);
      let dy = Math.sin(sh.heading);
      sh.wander = clamp(sh.wander + (Math.random() - 0.5) * dt * 3.2, -1.1, 1.1);
      dx += Math.cos(sh.heading + sh.wander) * 0.45;
      dy += Math.sin(sh.heading + sh.wander) * 0.45;
      if (time >= sh.retargetAt) {
        sh.target = this.findPrey(sh);
        sh.retargetAt = time + 0.45;
      }
      const t = sh.target;
      let hunting = false;
      let closing = 0;
      if (t && t.alive && sh.hunger > 0.3) {
        const tx = t.x + t.vx * 0.35 - hx;
        const ty = t.y + t.vy * 0.35 - hy;
        const d = Math.hypot(tx, ty) || 1;
        const w = 1.4 + 2.6 * sh.hunger;
        dx += tx / d * w;
        dy += ty / d * w;
        hunting = true;
        closing = clamp(1 - d / (L * 0.9), 0, 1);
      } else {
        const rx = (hx - cxW) / (W / minSide);
        const ry = hy - cyW;
        const r = Math.hypot(rx, ry) || 1;
        const radius = sh.orbitRadius * (1 + 0.15 * Math.sin(time * 0.05 + sh.id));
        const radial = clamp((radius - r) / radius, -1, 1);
        dx += (-ry / r * sh.orbitDir + rx / r * radial * 0.9) * 0.55;
        dy += (rx / r * sh.orbitDir + ry / r * radial * 0.9) * 0.55;
      }
      for (const other of sharks) {
        if (other === sh) continue;
        for (let k = 0; k < SHARK_NODES; k += 4) {
          const ox = hx - other.nodes[k * 2];
          const oy = hy - other.nodes[k * 2 + 1];
          const d = Math.hypot(ox, oy);
          const range = (L + other.length) * 0.45;
          if (d < range && d > 1e-3) {
            const w = (1 - d / range) * 3;
            dx += ox / d * w;
            dy += oy / d * w;
          }
        }
      }
      const ex = (hx - cxW) / (W * 0.3);
      const ey = (hy - cyW) / (H * 0.16);
      const e2 = ex * ex + ey * ey;
      if (e2 < 1) {
        const e = Math.sqrt(e2) || 1e-3;
        const w = (1 - e) * (hunting ? 1 : 2.5);
        dx += ex / e * w;
        dy += ey / e * w;
      }
      sh.age = (sh.age || 0) + dt;
      let completelyOffscreen = false;
      if (!sh.fixedKind && sh.age > 16) {
        completelyOffscreen = true;
        for (let n = 0; n < SHARK_NODES; n++) {
          const nx = nodes[n * 2];
          const ny = nodes[n * 2 + 1];
          if (nx >= -L * 0.6 && nx <= W + L * 0.6 && ny >= -L * 0.6 && ny <= H + L * 0.6) {
            completelyOffscreen = false;
            break;
          }
        }
      }
      if (completelyOffscreen) {
        const usedKinds = sharks.map((s) => s.kind);
        const available = ALL_SPECIES_POOL.filter((k) => !usedKinds.includes(k));
        const nextKind = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : ALL_SPECIES_POOL[Math.floor(Math.random() * ALL_SPECIES_POOL.length)];
        sh.kind = nextKind;
        sh.age = 0;
        const side = Math.floor(Math.random() * 4);
        let sx = 0;
        let sy = 0;
        let sAngle = 0;
        if (side === 0) {
          sx = -L * 1.1;
          sy = Math.random() * H;
          sAngle = (Math.random() - 0.5) * 0.6;
        } else if (side === 1) {
          sx = W + L * 1.1;
          sy = Math.random() * H;
          sAngle = Math.PI + (Math.random() - 0.5) * 0.6;
        } else if (side === 2) {
          sx = Math.random() * W;
          sy = -L * 1.1;
          sAngle = Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        } else {
          sx = Math.random() * W;
          sy = H + L * 1.1;
          sAngle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        }
        sh.heading = sAngle;
        sh.target = null;
        dx = Math.cos(sAngle);
        dy = Math.sin(sAngle);
        const seg2 = L / (SHARK_NODES - 1);
        for (let n = 0; n < SHARK_NODES; n++) {
          nodes[n * 2] = sx - Math.cos(sAngle) * seg2 * n;
          nodes[n * 2 + 1] = sy - Math.sin(sAngle) * seg2 * n;
        }
      } else if (!sh.fixedKind && sh.age > 24) {
        // Leave along current heading until the entire body and fins are outside.
        dx = Math.cos(sh.heading);
        dy = Math.sin(sh.heading);
      } else {
        const over = Math.max(-hx, hx - W, -hy, hy - H);
        if (over > -L * 0.05) {
          const w = clamp((over + L * 0.05) / (L * 0.35), 0, 1) * 3.5;
          const toX = cxW - hx;
          const toY = cyW - hy;
          const d = Math.hypot(toX, toY) || 1;
          dx += toX / d * w;
          dy += toY / d * w;
        }
      }
      const desired = Math.atan2(dy, dx);
      const agility = Math.min(hunting ? 2.5 + closing : 1.4, sh.speed / (L * 0.18));
      const maxTurn = agility * dt;
      const turned = clamp(angleDiff(sh.heading, desired), -maxTurn, maxTurn);
      sh.heading += turned;
      sh.turn += (turned / dt - sh.turn) * Math.min(1, dt * 4);
      const cruise = 120 + L * 0.18;
      const targetSpeed = hunting ? cruise * (1.45 + closing * 1.5) : cruise;
      sh.speed += (targetSpeed - sh.speed) * Math.min(1, dt * 2.5);
      sh.phase += dt * (4.5 + sh.speed / 14);
      nodes[0] += Math.cos(sh.heading) * sh.speed * dt;
      nodes[1] += Math.sin(sh.heading) * sh.speed * dt;
      const seg = L / (SHARK_NODES - 1);
      const maxBend = 0.16;
      let prevAngle = sh.heading + Math.PI;
      for (let k = 1; k < SHARK_NODES; k++) {
        const px = nodes[(k - 1) * 2];
        const py = nodes[(k - 1) * 2 + 1];
        let angle = Math.atan2(nodes[k * 2 + 1] - py, nodes[k * 2] - px);
        angle = prevAngle + clamp(angleDiff(prevAngle, angle), -maxBend, maxBend);
        nodes[k * 2] = px + Math.cos(angle) * seg;
        nodes[k * 2 + 1] = py + Math.sin(angle) * seg;
        prevAngle = angle;
      }
      if (sh.hunger > 0.15) {
        const mouthR = L * 0.05 + 8;
        const mx = nodes[0];
        const my = nodes[1];
        for (const f of this.fish) {
          if (!f.alive) continue;
          if ((f.x - mx) ** 2 + (f.y - my) ** 2 < mouthR * mouthR) {
            f.alive = false;
            f.respawnAt = time + rand(3, 8);
            sh.hunger = Math.max(0, sh.hunger - 0.16);
            this.events.push({ kind: "eat", x: f.x, y: f.y });
          }
        }
      }
    }
  }
  /**
   * Pick prey in the shark's forward cone, preferring close fish in sparse
   * buckets (stragglers) over fish buried in a dense school.
   */
  findPrey(sh) {
    const range = sh.length * 0.9 + 160;
    const hx = sh.nodes[0];
    const hy = sh.nodes[1];
    const fx = Math.cos(sh.heading);
    const fy = Math.sin(sh.heading);
    let best = null;
    let bestScore = Infinity;
    let currentScore = Infinity;
    for (const f of this.fish) {
      if (!f.alive) continue;
      const dx = f.x - hx;
      const dy = f.y - hy;
      const d = Math.hypot(dx, dy);
      if (d > range || d < 1e-3) continue;
      const cos = (dx * fx + dy * fy) / d;
      if (cos < 0.2) continue;
      const crowd = this.bucketCount[this.bucketOf(f.x, f.y)];
      const score = d * (1 + (1 - cos) * 0.8) * (1 + crowd * 0.07);
      if (score < bestScore) {
        bestScore = score;
        best = f;
      }
      if (f === sh.target) currentScore = score;
    }
    if (sh.target && currentScore < bestScore * 1.3) return sh.target;
    return best;
  }
  respawn() {
    const { time, width: W, height: H } = this;
    const due = [];
    for (const f of this.fish) if (!f.alive && f.respawnAt <= time) due.push(f);
    if (due.length === 0) return;
    if (due.length < 6 && time - this.lastSpawn < 9) return;
    this.lastSpawn = time;
    const side = randInt(0, 3);
    const along = rand(0.15, 0.85);
    const x = side === 0 ? -20 : side === 1 ? W + 20 : along * W;
    const y = side === 2 ? -20 : side === 3 ? H + 20 : along * H;
    const inward = Math.atan2(H / 2 - y, W / 2 - x) + rand(-0.5, 0.5);
    const species = pickSpecies();
    const sp = SPECIES[species];
    const millDir = Math.random() < 0.5 ? 1 : -1;
    for (const f of due.slice(0, sp.schoolSize[1])) {
      f.alive = true;
      f.species = species;
      f.alarm = 0;
      f.turn = 0;
      f.millDir = millDir;
      f.x = x + rand(-1, 1) * this.perception;
      f.y = y + rand(-1, 1) * this.perception;
      f.vx = Math.cos(inward) * sp.cruise * 1.4;
      f.vy = Math.sin(inward) * sp.cruise * 1.4;
    }
  }
};
// Renderer

var ALPHA_LEVELS = 6;
var FISH_ALPHAS = [0.45, 0.6, 0.75, 0.88, 1];
var DOT_RGB = [
  [48, 52, 235],
  [52, 205, 60],
  [228, 50, 44],
  [190, 212, 255],
  [110, 230, 255]
];
var DOT_BASE_ALPHA = [1, 1, 1, 1, 1];
var WAKE = DOT_RGB.length - 1;
var ACCENTS = ["#ff7a45", "#ff4d4f", "#b37feb", "#36cfc9", "#52c41a", "#ffd666", "#faad14", "#ff85c0", "#13c2c2", "#722ed1"];
var NUM_SPECIES = 6;
var SPECIES_PALETTES = [
  FISH_ALPHAS.map((a) => `rgba(54, 207, 201, ${a})`),
  // 0: Cyan / Electric Teal
  FISH_ALPHAS.map((a) => `rgba(255, 197, 61, ${a})`),
  // 1: Golden Amber
  FISH_ALPHAS.map((a) => `rgba(255, 122, 69, ${a})`),
  // 2: Coral Orange
  FISH_ALPHAS.map((a) => `rgba(82, 196, 26, ${a})`),
  // 3: Emerald Green
  FISH_ALPHAS.map((a) => `rgba(179, 127, 235, ${a})`),
  // 4: Bioluminescent Violet
  FISH_ALPHAS.map((a) => `rgba(255, 133, 192, ${a})`)
  // 5: Neon Pink
];
var SPECIES_GLYPHS = ["-", "~", ">", "=", "*", "\xB7"];
var SKIN_RAMP = ":;t%SX8#@";
var FIN_GLYPHS = "%;tS:";
var RIDGE_GLYPHS = "@8%";
var EDGE_HEAVY = ":;";
var EDGE_LIGHT = ".',`";
var FLAG_BODY = 1;
var FLAG_EDGE = 2;
var FLAG_FIN = 3;
var FLAG_RIDGE = 4;
var FLAG_EYE = 5;
var FLAG_MARK = 6;
var MARK_GLYPHS = "#%@";
function classicHalfWidth(s) {
  if (s < 0.13) return 0.09 * Math.pow(Math.sin(s / 0.13 * Math.PI / 2), 0.95);
  if (s < 0.3) return 0.09 + 0.016 * smoothstep(0.13, 0.3, s);
  if (s < 0.84) return 0.019 + 0.087 * Math.pow(1 - (s - 0.3) / 0.54, 1.25);
  const k = (s - 0.84) / 0.16;
  return 0.019 * (1 - k) + 0.012 * Math.sin(k * Math.PI);
}

var SHAPES = {
  classic: {
    halfWidth: classicHalfWidth,
    pectoral: [0.15, 0.43, 0.55, 0.26],
    falcate: true,
    pelvic: [0.57, 0.65, 0.69, 0.085],
    caudal: 0.085,
    dorsal: [0.33, 0.47],
    secondDorsal: [0.71, 0.76],
    eye: [0.1, 0.14],
    gills: [0.19, 0.29],
    tint: [0.92, 0.97, 1.05]
  },
  // Slim neck under a wide, swept-back cephalofoil (drawn in sampleShark),
  // tall first dorsal, long upper tail lobe. Bronze-olive grey.
  hammerhead: {
    halfWidth: (s) => {
      if (s < 0.06) return 0.045;
      if (s < 0.3) return 0.045 + 0.061 * smoothstep(0.06, 0.3, s);
      return classicHalfWidth(s) * 0.92;
    },
    head: { span: 0.17, sweep: 0.035, depth: 0.09, notch: 0 },
    pectoral: [0.17, 0.4, 0.5, 0.22],
    falcate: true,
    pelvic: [0.56, 0.63, 0.67, 0.075],
    caudal: 0.11,
    dorsal: [0.28, 0.44],
    secondDorsal: [0.7, 0.74],
    eye: null,
    gills: [0.16, 0.26],
    tint: [0.96, 0.98, 0.9]
  },
  // Blunt, square snout on a heavy body; barred back. Warm grey-brown.
  tiger: {
    halfWidth: (s) => {
      if (s < 0.13) return 0.1 * Math.pow(Math.sin(s / 0.13 * Math.PI / 2), 0.45);
      if (s < 0.3) return 0.1 + 0.014 * smoothstep(0.13, 0.3, s);
      if (s < 0.84) return 0.019 + 0.095 * Math.pow(1 - (s - 0.3) / 0.54, 1.2);
      const k = (s - 0.84) / 0.16;
      return 0.019 * (1 - k) + 0.012 * Math.sin(k * Math.PI);
    },
    pectoral: [0.15, 0.42, 0.53, 0.25],
    falcate: true,
    pelvic: [0.57, 0.65, 0.69, 0.085],
    caudal: 0.095,
    dorsal: [0.33, 0.46],
    secondDorsal: [0.71, 0.75],
    eye: [0.08, 0.12],
    gills: [0.19, 0.28],
    tint: [1.02, 0.95, 0.84]
  },
  // Short rounded head, body done by half-length, then a long ribbon of a
  // tail fin. Broad rounded pectorals, spotted sandy skin.
  zebra: {
    halfWidth: (s) => {
      if (s < 0.1) return 0.075 * Math.pow(Math.sin(s / 0.1 * Math.PI / 2), 0.7);
      if (s < 0.28) return 0.075 + 0.025 * smoothstep(0.1, 0.28, s);
      if (s < 0.55) return 0.022 + 0.078 * Math.pow(1 - (s - 0.28) / 0.27, 1.1);
      const k = (s - 0.55) / 0.45;
      return 0.022 * (1 - k * k) + 0.012 * Math.sin(k * Math.PI);
    },
    pectoral: [0.12, 0.3, 0.36, 0.19],
    falcate: false,
    pelvic: [0.42, 0.48, 0.51, 0.065],
    caudal: 0,
    dorsal: [0.36, 0.44],
    secondDorsal: [0.49, 0.53],
    eye: [0.06, 0.09],
    gills: [0.13, 0.2],
    tint: [1.08, 0.97, 0.74]
  },
  // Great hammerhead: a broader, nearly straight-edged cephalofoil with a notch at the centre,
  // a towering sickle first dorsal (drawn long and bright from above), and a cooler slate skin.
  greathammer: {
    halfWidth: (s) => {
      if (s < 0.05) return 0.04;
      if (s < 0.3) return 0.04 + 0.07 * smoothstep(0.05, 0.3, s);
      return classicHalfWidth(s) * 0.95;
    },
    head: { span: 0.21, sweep: 6e-3, depth: 0.085, notch: 0.014 },
    pectoral: [0.16, 0.38, 0.49, 0.24],
    falcate: true,
    pelvic: [0.55, 0.62, 0.67, 0.085],
    caudal: 0.13,
    dorsal: [0.24, 0.45],
    secondDorsal: [0.68, 0.74],
    eye: null,
    gills: [0.15, 0.25],
    tint: [0.86, 0.93, 1.02]
  },
  // Shortfin mako: a long conical snout, a torpedo body that narrows hard to the tail stalk,
  // and a tall crescent tail. Metallic indigo back.
  mako: {
    halfWidth: (s) => {
      if (s < 0.17) return 0.088 * Math.pow(Math.sin(s / 0.17 * Math.PI / 2), 1.5);
      if (s < 0.32) return 0.088 + 0.012 * smoothstep(0.17, 0.32, s);
      if (s < 0.86) return 0.014 + 0.086 * Math.pow(1 - (s - 0.32) / 0.54, 1.45);
      const k = (s - 0.86) / 0.14;
      return 0.014 * (1 - k) + 0.01 * Math.sin(k * Math.PI);
    },
    pectoral: [0.18, 0.4, 0.5, 0.21],
    falcate: true,
    pelvic: [0.58, 0.64, 0.68, 0.06],
    caudal: 0.13,
    dorsal: [0.34, 0.45],
    secondDorsal: [0.76, 0.79],
    eye: [0.11, 0.15],
    gills: [0.2, 0.3],
    tint: [0.78, 0.9, 1.2]
  },
  // Thresher: a compact body over the front half, then the upper tail lobe as a long whip
  // that's as long as the shark itself. Big eyes, long sickle pectorals, bronze-violet skin.
  thresher: {
    halfWidth: (s) => {
      if (s < 0.08) return 0.07 * Math.pow(Math.sin(s / 0.08 * Math.PI / 2), 0.75);
      if (s < 0.2) return 0.07 + 0.02 * smoothstep(0.08, 0.2, s);
      if (s < 0.48) return 0.012 + 0.078 * Math.pow(1 - (s - 0.2) / 0.28, 1.3);
      const k = (s - 0.48) / 0.52;
      return 0.012 * (1 - k) + 6e-3 * Math.sin(k * Math.PI * 0.9) + 2e-3;
    },
    pectoral: [0.12, 0.27, 0.36, 0.2],
    falcate: true,
    pelvic: [0.37, 0.41, 0.44, 0.045],
    caudal: 0,
    dorsal: [0.24, 0.32],
    secondDorsal: [0.45, 0.47],
    eye: [0.05, 0.1],
    gills: [0.11, 0.18],
    tint: [1, 0.9, 1.08]
  },
  // Nurse shark: a blunt, broad head, a heavy flattened body with both dorsals set far back,
  // rounded paddle pectorals, and a long low tail with no lower lobe. Tawny brown.
  nurse: {
    halfWidth: (s) => {
      if (s < 0.08) return 0.085 * Math.pow(Math.sin(s / 0.08 * Math.PI / 2), 0.4);
      if (s < 0.3) return 0.085 + 0.02 * smoothstep(0.08, 0.3, s);
      if (s < 0.72) return 0.022 + 0.083 * Math.pow(1 - (s - 0.3) / 0.42, 1.1);
      const k = (s - 0.72) / 0.28;
      return 0.022 * (1 - k * k) + 0.014 * Math.sin(k * Math.PI);
    },
    pectoral: [0.16, 0.34, 0.4, 0.17],
    falcate: false,
    pelvic: [0.45, 0.52, 0.55, 0.075],
    caudal: 0,
    dorsal: [0.5, 0.58],
    secondDorsal: [0.63, 0.69],
    eye: [0.05, 0.075],
    gills: [0.14, 0.22],
    tint: [1.1, 0.96, 0.76]
  },
  manta: {
    halfWidth: (s) => {
      if (s < 0.12) return 0.08 * Math.pow(Math.sin(s / 0.12 * Math.PI * 0.5), 0.6);
      if (s < 0.45) return 0.08 + 0.08 * Math.sin((s - 0.12) / 0.33 * Math.PI);
      if (s < 0.65) return 0.04 + 0.04 * (1 - (s - 0.45) / 0.2);
      return 0.012;
    },
    pectoral: [0.08, 0.48, 0.58, 0.42],
    falcate: true,
    pelvic: [0.55, 0.62, 0.65, 0.07],
    caudal: 0,
    dorsal: [0.52, 0.58],
    secondDorsal: [0.6, 0.64],
    eye: [0.06, 0.11],
    gills: [0.18, 0.32],
    tint: [0.85, 0.75, 1.45]
  },
  turtle: {
    halfWidth: (s) => {
      if (s < 0.18) return 0.06 * Math.sin(s / 0.18 * Math.PI * 0.5);
      if (s < 0.78) return 0.18 * Math.sin((s - 0.18) / 0.6 * Math.PI);
      return 0.02 * (1 - (s - 0.78) / 0.22);
    },
    pectoral: [0.18, 0.38, 0.42, 0.26],
    falcate: false,
    pelvic: [0.64, 0.76, 0.78, 0.16],
    caudal: 0,
    dorsal: [0.35, 0.6],
    secondDorsal: [0.62, 0.7],
    eye: [0.07, 0.12],
    gills: [0.15, 0.16],
    tint: [0.75, 1.35, 0.85]
  },
  whale: {
    halfWidth: (s) => {
      if (s < 0.16) return 0.11 * Math.pow(Math.sin(s / 0.16 * Math.PI * 0.5), 0.7);
      if (s < 0.38) return 0.11 + 0.03 * smoothstep(0.16, 0.38, s);
      if (s < 0.86) return 0.025 + 0.115 * Math.pow(1 - (s - 0.38) / 0.48, 1.3);
      const k = (s - 0.86) / 0.14;
      return 0.025 * (1 - k) + 0.015 * Math.sin(k * Math.PI);
    },
    pectoral: [0.22, 0.42, 0.48, 0.22],
    falcate: true,
    pelvic: [0.62, 0.68, 0.72, 0.06],
    caudal: 0.16,
    dorsal: [0.42, 0.58],
    secondDorsal: [0.75, 0.79],
    eye: [0.12, 0.16],
    gills: [0.24, 0.32],
    tint: [1.15, 1.15, 1.3]
  },
  jellyfish: {
    halfWidth: (s) => {
      if (s < 0.35) return 0.15 * Math.sin(s / 0.35 * Math.PI);
      return 0.04 * (1 - (s - 0.35) / 0.65);
    },
    pectoral: [0.32, 0.55, 0.65, 0.12],
    falcate: false,
    pelvic: [0.55, 0.85, 0.9, 0.08],
    caudal: 0,
    dorsal: [0.15, 0.32],
    secondDorsal: [0.4, 0.5],
    eye: null,
    gills: [0.2, 0.22],
    tint: [1.45, 0.65, 1.25]
  },
  swordfish: {
    halfWidth: (s) => {
      if (s < 0.16) return 0.015;
      if (s < 0.38) return 0.015 + 0.085 * smoothstep(0.16, 0.38, s);
      if (s < 0.86) return 0.018 + 0.082 * Math.pow(1 - (s - 0.38) / 0.48, 1.3);
      return 0.018;
    },
    pectoral: [0.2, 0.38, 0.46, 0.22],
    falcate: true,
    pelvic: [0.58, 0.64, 0.68, 0.05],
    caudal: 0.15,
    dorsal: [0.18, 0.45],
    // Tall sail dorsal
    secondDorsal: [0.75, 0.79],
    eye: [0.17, 0.21],
    gills: [0.24, 0.32],
    tint: [0.72, 0.95, 1.45]
    // Cobalt electric cyan/blue
  },
  squid: {
    halfWidth: (s) => {
      if (s < 0.26) return 0.04 * (1 + 0.5 * Math.sin(s * 40));
      if (s < 0.75) return 0.12 * Math.sin((s - 0.26) / 0.49 * Math.PI);
      return 0.02 * (1 - (s - 0.75) / 0.25);
    },
    pectoral: [0.55, 0.85, 0.92, 0.18],
    falcate: false,
    pelvic: [0.45, 0.55, 0.6, 0.05],
    caudal: 0,
    dorsal: [0.28, 0.34],
    secondDorsal: [0.42, 0.48],
    eye: [0.24, 0.28],
    gills: [0.27, 0.28],
    tint: [1.45, 0.82, 0.65]
  },
  // Ancient apex predator: massive broad jaws, jagged dorsal, menacing crimson tint
  megalodon: {
    halfWidth: (s) => {
      if (s < 0.18) return 0.14 * Math.pow(Math.sin(s / 0.18 * Math.PI / 2), 0.5);
      if (s < 0.42) return 0.14 + 0.04 * smoothstep(0.18, 0.42, s);
      if (s < 0.82) return 0.03 + 0.15 * Math.pow(1 - (s - 0.42) / 0.4, 1.15);
      return 0.03 * (1 - (s - 0.82) / 0.18);
    },
    pectoral: [0.18, 0.48, 0.62, 0.32],
    falcate: true,
    pelvic: [0.58, 0.68, 0.73, 0.11],
    caudal: 0.14,
    dorsal: [0.32, 0.52],
    secondDorsal: [0.72, 0.78],
    eye: [0.12, 0.16],
    gills: [0.2, 0.32],
    tint: [1.35, 0.62, 0.55]
  },
  // Mythical abyssal serpent: undulating serpentine body, bioluminescent dragon fins
  leviathan: {
    halfWidth: (s) => {
      if (s < 0.12) return 0.08 * Math.sin(s / 0.12 * Math.PI / 2);
      if (s < 0.85) return 0.08 + 0.02 * Math.sin(s * Math.PI * 4);
      return 0.08 * (1 - (s - 0.85) / 0.15);
    },
    pectoral: [0.12, 0.28, 0.36, 0.2],
    falcate: false,
    pelvic: [0.46, 0.56, 0.64, 0.18],
    caudal: 0.16,
    dorsal: [0.15, 0.75],
    secondDorsal: [0.76, 0.85],
    eye: [0.08, 0.12],
    gills: [0.13, 0.2],
    tint: [0.45, 1.35, 1.45]
  },
  // Mythical abyssal terror: broad crowned mantle, massive tentacular spread, deep violet glow
  kraken: {
    halfWidth: (s) => {
      if (s < 0.35) return 0.18 * Math.sin(s / 0.35 * Math.PI / 2);
      if (s < 0.7) return 0.18 * (1 - (s - 0.35) / 0.35 * 0.4);
      return 0.108 * (1 + 0.4 * Math.sin(s * 30)) * (1 - (s - 0.7) / 0.3);
    },
    pectoral: [0.3, 0.75, 0.9, 0.36],
    falcate: false,
    pelvic: [0.4, 0.65, 0.8, 0.24],
    caudal: 0.08,
    dorsal: [0.15, 0.35],
    secondDorsal: [0.4, 0.55],
    eye: [0.22, 0.28],
    gills: [0.28, 0.32],
    tint: [1.25, 0.52, 1.45]
  }
};
var KINDS = Object.keys(SHAPES);
function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}
function paintGrid(g, W, H, cw, ch, dpr) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.strokeStyle = "rgba(255,255,255,0.055)";
  g.lineWidth = 1;
  g.beginPath();
  for (let c = 0; c <= Math.ceil(W / cw); c++) {
    const x = Math.round(c * cw * dpr) + 0.5;
    g.moveTo(x, 0);
    g.lineTo(x, H * dpr);
  }
  for (let r = 0; r <= Math.ceil(H / ch); r++) {
    const y = Math.round(r * ch * dpr) + 0.5;
    g.moveTo(0, y);
    g.lineTo(W * dpr, y);
  }
  g.stroke();
}


function animalAppearance(kind, length, cellWidth, cellHeight) {
  const L = length;
  const cw = cellWidth;
  const ch = cellHeight;
  const shape = SHAPES[kind] || SHAPES.classic;
  const key = kind + ":" + Math.round(L) + ":" + cw + ":" + ch;

  const N = SHARK_NODES;
  const spine = new Float32Array(N * 2);
  const arc = new Float32Array(N);
  const segSx = new Float32Array(N);
  const segSy = new Float32Array(N);
  const segLen = new Float32Array(N);
  const invLen2 = new Float32Array(N);

  for (let k = 0; k < N; k++) {
    spine[k * 2] = L * k / (N - 1);
    spine[k * 2 + 1] = 0;
    arc[k] = L * k / (N - 1);
    segSx[k] = L / (N - 1);
    segSy[k] = 0;
    segLen[k] = L / (N - 1);
    invLen2[k] = 1 / (segLen[k] * segLen[k]);
  }
  const arcTotal = L;
  const finTipRight = L * shape.pectoral[3];
  const finTipLeft = finTipRight;
  const reach = L * Math.max(shape.pectoral[3], shape.head?.span || 0,
                             shape.pelvic[3], shape.caudal || 0, 0.2);

  const sampler = {
    spine, arc, segSx, segSy, segLen, invLen2, arcTotal,
    finTipLeft, finTipRight, shape, sharkId: 1,
    hitFlag: 0, hitShade: 0
  };

  function marked(s, v, L, across) {
    if (shape === SHAPES.tiger) {
      if (s < 0.2 || s > 0.9 || across > 0.85) return false;
      const wobble = 0.35 * Math.sin(v / L * 25 + s * 5);
      const bar = Math.sin(s * Math.PI * 2 * 9 + wobble);
      return bar > 0.65 - 0.5 * smoothstep(0.2, 0.42, s) + 0.4 * smoothstep(0.8, 0.9, s);
    }
    if (shape === SHAPES.zebra) {
      if (s < 0.07) return false;
      const gu = s * L / (L * 0.06);
      const gv = v / (L * 0.045);
      const cu = Math.floor(gu);
      const cv = Math.floor(gv);
      const jx = hash3(cu, cv, sampler.sharkId) * 0.5 + 0.25;
      const jy = hash3(cu, cv, sampler.sharkId + 11) * 0.5 + 0.25;
      return (gu - cu - jx) ** 2 + (gv - cv - jy) ** 2 < 0.08;
    }
    return false;
  }

  function sampleShark(px, py, L) {
    const N = SHARK_NODES;
    let best = Infinity;
    let bestIndex = 0;
    let bestU = 0;
    const firstSegment = clamp(Math.floor(px / L * (N - 1)), 0, N - 2);
    for (let k = firstSegment; k <= firstSegment; k++) {
      const ax = spine[k * 2];
      const ay = spine[k * 2 + 1];
      const sx = segSx[k];
      const sy = segSy[k];
      const dx = px - ax;
      const dy = py - ay;
      const bx = Math.max(0, Math.min(ax, ax + sx) - px, px - Math.max(ax, ax + sx));
      const by = Math.max(0, Math.min(ay, ay + sy) - py, py - Math.max(ay, ay + sy));
      if (bx * bx + by * by >= best) continue;
      const u2 = clamp((dx * sx + dy * sy) * invLen2[k], 0, 1);
      const qx = ax + sx * u2;
      const qy = ay + sy * u2;
      const d2 = (px - qx) ** 2 + (py - qy) ** 2;
      if (d2 < best) {
        best = d2;
        bestIndex = k;
        bestU = u2;
      }
    }
    const len = segLen[bestIndex];
    const sx = segSx[bestIndex];
    const sy = segSy[bestIndex];
    const ax = spine[bestIndex * 2];
    const ay = spine[bestIndex * 2 + 1];
    const bestS = (arc[bestIndex] + bestU * len) / arcTotal;
    const bestSign = sx * (py - ay) - sy * (px - ax) >= 0 ? 1 : -1;
    const bestNx = -sy / len * bestSign;
    const bestNy = sx / len * bestSign;
    const a = Math.sqrt(best);
    const s = bestS;
    const u = s * L;
    const w = shape.halfWidth(s) * L;
    sampler.hitDist = a;
    sampler.hitS = s;
    sampler.hitV = a * bestSign;
    const head = shape.head;
    if (head && u < L * (head.sweep + head.depth + head.notch)) {
      const span = L * head.span;
      const r = a / span;
      const front = L * head.sweep * r * r + L * head.notch * Math.max(0, 1 - r / 0.14);
      const depth = L * head.depth * (1 - 0.2 * r * r * r * r);
      if (r <= 1 && u >= front && u <= front + depth) {
        sampler.hitFlag = r > 0.84 ? FLAG_EYE : FLAG_BODY;
        sampler.hitShade = r > 0.84 ? 0 : 0.62 - 0.2 * r + (u < front + L * 0.012 ? 0.1 : 0);
        return true;
      }
    }
    if (a <= w) {
      const across = a / (w || 1);
      const facing = (bestNx * -0.6 + bestNy * -0.8) * across;
      let shade = 0.58 - across * across * 0.42 + facing * 0.26;
      let flag = FLAG_BODY;
      if (s > shape.dorsal[0] && s < shape.dorsal[1] && across < 0.3) {
        flag = FLAG_RIDGE;
        shade = 1;
      } else if (s > shape.secondDorsal[0] && s < shape.secondDorsal[1] && across < 0.4) {
        shade = Math.max(shade, 0.82);
      } else if (shape.eye && s > shape.eye[0] && s < shape.eye[1] && across > 0.6) {
        flag = FLAG_EYE;
        shade = 0;
      } else if (s > shape.gills[0] && s < shape.gills[1] && across > 0.58) {
        if (Math.floor((s - shape.gills[0]) / (shape.gills[1] - shape.gills[0]) * 5) % 2 === 0) shade *= 0.45;
      } else if (s < 0.05) {
        shade = Math.max(shade, 0.7);
      } else if (shape === SHAPES.zebra && s > 0.08 && s < 0.55 && (across < 0.1 || Math.abs(across - 0.6) < 0.08)) {
        shade = Math.max(shade, 0.8);
      } else if (marked(s, a * bestSign, L, across)) {
        flag = FLAG_MARK;
      }
      sampler.hitFlag = flag;
      sampler.hitShade = shade;
      return true;
    }
    const tip = bestSign > 0 ? finTipRight : finTipLeft;
    const [p0, p1, p2] = shape.pectoral;
    if (inTriangle(u, a, L * p0, 0, L * p1, 0, L * p2, tip) &&
    !(shape.falcate && inTriangle(u, a, L * p1, 0, L * (p1 + (p2 - p1) * 0.33), tip * 0.55, L * p2, tip))) {
      sampler.hitFlag = marked(s, a * bestSign, L, 0) ? FLAG_MARK : FLAG_FIN;
      sampler.hitShade = 0.38 + 0.22 * (1 - clamp(a / tip, 0, 1));
      return true;
    }
    const [v0, v1, v2, vr] = shape.pelvic;
    if (inTriangle(u, a, L * v0, 0, L * v1, 0, L * v2, L * vr) ||
    shape.caudal > 0 && inTriangle(u, a, L * 0.86, 0, L * 0.95, 0, L, L * shape.caudal)) {
      sampler.hitFlag = FLAG_FIN;
      sampler.hitShade = 0.36;
      return true;
    }
    return false;
  }

  const stripCount = 12;
  const strips = [];
  for (let s = 0; s < stripCount; s++) {
    strips.push({
      start: L * s / stripCount,
      end: L * (s + 1) / stripCount,
      cells: []
    });
  }

  const spacing = Math.min(cw, ch) * 0.85;
  const [tr, tg, tb] = shape.tint;

  for (let x = 0; x <= L; x += spacing) {
    let sIdx = Math.floor(x / L * stripCount);
    if (sIdx >= stripCount) sIdx = stripCount - 1;
    const strip = strips[sIdx];
    const localX = x - strip.start;

    for (let y = -reach; y <= reach; y += spacing) {
      if (sampleShark(x, y, L)) {
        const flag = sampler.hitFlag;
        const shade = sampler.hitShade;
        const hashVal = hash3(Math.round(x), Math.round(y), 1) * 4294967295 >>> 0;
        let glyph;
        let level;
        if (flag === FLAG_RIDGE) {
          level = 226;
          glyph = RIDGE_GLYPHS[(hashVal >>> 8) % RIDGE_GLYPHS.length];
        } else if (flag === FLAG_EYE) {
          level = 12;
          glyph = "o";
        } else if (flag === FLAG_MARK) {
          level = 24 + shade * 22;
          glyph = MARK_GLYPHS[(hashVal >>> 8) % MARK_GLYPHS.length];
        } else if (flag === FLAG_FIN) {
          level = 40 + shade * 120;
          glyph = FIN_GLYPHS[(hashVal >>> 8) % FIN_GLYPHS.length];
        } else {
          level = 46 + shade * 160;
          const jitter = (hashVal >>> 4) % 3 - 1;
          glyph = SKIN_RAMP[clamp(Math.floor((1 - shade) * 8.99) + jitter, 0, SKIN_RAMP.length - 1)];
        }
        const bgR = Math.min(255, Math.round(level * tr));
        const bgG = Math.min(255, Math.round(level * tg));
        const bgB = Math.min(255, Math.round(level * tb + 4));
        const bg = "rgb(" + bgR + "," + bgG + "," + bgB + ")";

        const roll = hash3(hashVal, 0, 7);
        let fg;
        if (flag === FLAG_EYE) fg = "#9aa0ad";
        else if (flag === FLAG_MARK) fg = "rgb(" + Math.round(70 * tr) + "," + Math.round(70 * tg) + "," + Math.round(70 * tb) + ")";
        else if (roll < 0.09) fg = ACCENTS[hashVal % ACCENTS.length];
        else if (roll < 0.13) fg = "#ffffff";
        else fg = shade > 0.55 ? "#0e0f13" : "#1b1d24";

        strip.cells.push({ x: localX, y, glyph, background: bg, foreground: fg });
      }
    }
  }

  return {
    key,
    length: L,
    reach,
    cellWidth: cw,
    cellHeight: ch,
    strips
  };
}

var RainSystem = class {
  constructor(count = 64) {
    this.drops = [];
    this.ripples = [];
    this.width = 0;
    this.height = 0;
    this.enabled = true;
    this.dropCount = count;
  }
  resize(w, h) {
    this.width = w;
    this.height = h;
    this.drops = [];
    this.ripples = [];
    if (w <= 0 || h <= 0) return;
    for (let i = 0; i < this.dropCount; i++) {
      this.drops.push(this.createDrop(true));
    }
  }
  createDrop(initialRandomY = false) {
    const angle = 1.3;
    const speed = 700 + Math.random() * 300;
    return {
      x: Math.random() * (this.width + 300) - 150,
      y: initialRandomY ? Math.random() * this.height : -20 - Math.random() * 50,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 0.45 + Math.random() * 0.45,
      // Crisp & clearly visible!
      length: 12 + Math.random() * 14
    };
  }
  step(dt, onSplash) {
    if (!this.enabled || this.width <= 0 || this.height <= 0) return;
    for (let i = 0; i < this.drops.length; i++) {
      const d = this.drops[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.y >= this.height || (d.y > 50 && Math.random() < (1 - Math.exp(-2.45 * dt)))) {
        if (d.x >= 0 && d.x <= this.width && d.y >= 0 && d.y <= this.height) {
          if (this.ripples.length < 32) {
            this.ripples.push({
              x: d.x,
              y: d.y,
              radius: 1,
              maxRadius: 10 + Math.random() * 12,
              alpha: 0.85 + Math.random() * 0.15
            });
            if (onSplash) onSplash(d.x, d.y);
          }
        }
        this.drops[i] = this.createDrop(false);
      }
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += 24 * dt;
      if (r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }
  }
  render(ctx, cw, ch) {
    if (!this.enabled || this.width <= 0 || this.height <= 0) return;
    ctx.save();
    for (const r of this.ripples) {
      const progress = r.radius / r.maxRadius;
      const a = (1 - progress) * r.alpha;
      if (a <= 0.02) continue;
      ctx.strokeStyle = `rgba(130, 230, 255, ${a.toFixed(3)})`;
      ctx.lineWidth = 1.2;
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.scale(1.8, 0.75);
      ctx.beginPath();
      ctx.arc(0, 0, r.radius, 0, Math.PI * 2);
      ctx.restore();
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (progress < 0.35) {
        ctx.fillText("o", r.x, r.y);
      } else if (progress < 0.7) {
        ctx.fillText("( )", r.x, r.y);
      }
    }
    for (const d of this.drops) {
      if (d.y < 0 || d.y > this.height || d.x < 0 || d.x > this.width) continue;
      ctx.strokeStyle = `rgba(175, 225, 255, ${d.alpha.toFixed(3)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 3.5, d.y - d.length);
      ctx.stroke();
      ctx.fillStyle = `rgba(210, 245, 255, ${d.alpha.toFixed(3)})`;
      ctx.font = "10px monospace";
      ctx.fillText("'", d.x, d.y);
    }
    ctx.restore();
  }
};
var OceanWaves = class {
  constructor() {
    this.width = 0;
    this.height = 0;
    this.enabled = true;
    this.swells = [
      { offset: 0, speed: 38, amplitude: 35, wavelength: 420, phase: 0, curve: 0.42 },
      { offset: 250, speed: 34, amplitude: 42, wavelength: 480, phase: 1.8, curve: 0.38 },
      { offset: 500, speed: 40, amplitude: 30, wavelength: 390, phase: 3.5, curve: 0.45 },
      { offset: 750, speed: 36, amplitude: 38, wavelength: 450, phase: 5.1, curve: 0.4 },
      { offset: 1e3, speed: 35, amplitude: 32, wavelength: 410, phase: 2.3, curve: 0.44 },
      { offset: 1250, speed: 39, amplitude: 36, wavelength: 460, phase: 4, curve: 0.39 }
    ];
  }
  resize(w, h) {
    this.width = w;
    this.height = h;
  }
  render(ctx, time) {
    if (!this.enabled || this.width <= 0 || this.height <= 0) return;
    const W = this.width;
    const H = this.height;
    const loopDistance = W + H + 500;
    ctx.save();
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let sIdx = 0; sIdx < this.swells.length; sIdx++) {
      const sw = this.swells[sIdx];
      const swellPos = (sw.offset + time * sw.speed) % loopDistance - 250;
      const swellStrength = 0.5 + 0.5 * Math.sin(time * 0.75 + sw.phase);
      if (swellStrength < 0.1) continue;
      const stepX = 24;
      const numPoints = Math.ceil(W / stepX);
      for (let p = 0; p <= numPoints; p++) {
        const x = p * stepX;
        const waveYDisplacement = sw.amplitude * Math.sin(x / sw.wavelength * Math.PI * 2 + time * 0.9 + sw.phase) + sw.amplitude * 0.4 * Math.sin(x / (sw.wavelength * 0.45) * Math.PI * 2 - time * 0.5);
        const y = swellPos + x * sw.curve + waveYDisplacement;
        if (y < -20 || y > H + 20) continue;
        const patchNoise = Math.sin(x * 0.012 + time * 0.4 + sw.phase * 0.7);
        if (patchNoise < -0.15) continue;
        const foamBrightness = swellStrength * (0.4 + 0.6 * Math.max(0, patchNoise));
        const alpha = Math.min(0.7, 0.15 + 0.55 * foamBrightness);
        if (foamBrightness > 0.65) {
          ctx.fillStyle = `rgba(130, 235, 255, ${alpha.toFixed(3)})`;
          ctx.fillText("~", x, y);
        } else if (foamBrightness > 0.38) {
          ctx.fillStyle = `rgba(75, 185, 215, ${(alpha * 0.85).toFixed(3)})`;
          ctx.fillText("~", x, y);
        } else {
          ctx.fillStyle = `rgba(45, 135, 170, ${(alpha * 0.6).toFixed(3)})`;
          ctx.fillText(".", x, y);
        }
      }
    }
    ctx.restore();
  }
};

var CLOUD_TEMPLATES = [
  [
    "                  .  ,  :  ,  .                  ",
    "            .  ,  :  ;  :  :  ,  .            ",
    "      .  ,  :  ;  :  ;  ;  :  ;  :  ,  .      ",
    "   .  ,  :  ;  :  :  ;  ;  :  :  ;  :  ,  .   ",
    " .  ,  :  :  ;  ;  :  :  ;  :  :  ;  :  ,  . ",
    "   .  ,  :  ;  :  :  ;  ;  :  :  ;  :  ,  .   ",
    "      .  ,  :  ;  :  ;  ;  :  ;  :  ,  .      ",
    "            .  ,  :  ;  :  :  ,  .            ",
    "                  .  ,  :  ,  .                  "
  ],
  [
    "                     .  ,  .                     ",
    "               .  ,  :  ;  :  ,  .               ",
    "         .  ,  :  :  ;  ;  :  :  ,  .         ",
    "   .  ,  :  ;  :  ;  ;  ;  ;  :  ;  :  ,  .   ",
    " .  :  ;  :  ;  ;  :  ;  ;  :  ;  ;  :  :  . ",
    "   .  ,  :  ;  :  ;  ;  ;  ;  :  ;  :  ,  .   ",
    "         .  ,  :  :  ;  ;  :  :  ,  .         ",
    "               .  ,  :  ;  :  ,  .               ",
    "                     .  ,  .                     "
  ],
  [
    "                        .  ,  .                        ",
    "               .  ,  :  ;  :  :  ,  .               ",
    "         .  ,  :  ;  ;  ;  :  ;  ;  :  ,  .         ",
    "   .  ,  :  :  ;  ;  :  :  ;  :  :  ;  :  :  ,  .   ",
    " .  ,  :  ;  :  ;  :  ;  ;  :  ;  :  ;  :  ;  ,  . ",
    "   .  ,  :  :  ;  ;  :  :  ;  :  :  ;  :  :  ,  .   ",
    "         .  ,  :  ;  ;  ;  :  ;  ;  :  ,  .         ",
    "               .  ,  :  ;  :  :  ,  .               ",
    "                        .  ,  .                        "
  ]
];

var CloudSystem = class {
  constructor() {
    this.clouds = [];
    this.width = 0;
    this.height = 0;
    this.enabled = true;
    this.epoch = 0;
  }
  resize(w, h) {
    this.width = w;
    this.height = h;
    this.clouds = [];
    this.epoch++;
    if (w <= 0 || h <= 0) return;
    const count = 5;
    for (let i = 0; i < count; i++) {
      this.clouds.push(this.createCloud(true));
    }
  }
  createCloud(randomInitialX = false) {
    const w = this.width;
    const h = this.height;
    const speed = 14 + Math.random() * 10;
    const angle = 0.32;
    const lines = CLOUD_TEMPLATES[Math.floor(Math.random() * CLOUD_TEMPLATES.length)];
    const text = lines.join("\n");
    return {
      x: randomInitialX ? Math.random() * (w + 400) - 200 : -350,
      y: Math.random() * (h + 200) - 100,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 0.12 + Math.random() * 0.14,
      lines,
      text,
      width: lines[0].length * 7.2,
      height: lines.length * 13
    };
  }
  step(dt) {
    if (!this.enabled || this.width <= 0 || this.height <= 0) return;
    const w = this.width;
    const h = this.height;
    this.epoch++;
    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (c.x > w + 450 || c.y > h + 450) {
        this.clouds[i] = this.createCloud(false);
      }
    }
  }
  render(ctx) {
    if (!this.enabled || this.width <= 0 || this.height <= 0) return;
    ctx.save();
    ctx.font = "12px monospace";
    ctx.fillStyle = "rgba(132, 168, 189, 0.22)";
    for (const c of this.clouds) {
      if (c.x + c.width < 0 || c.x > this.width || c.y + c.height < 0 || c.y > this.height) continue;
      let lineY = c.y;
      for (let l = 0; l < c.lines.length; l++) {
        ctx.fillText(c.lines[l], c.x, lineY);
        lineY += 13;
      }
    }
    ctx.restore();
  }
};


function getSharkSpecs(kind) {
  switch (kind) {
    case "manta":
      return [
        { kind: "manta", size: 1.0 },
        { kind: "manta", size: 0.88 },
        { kind: "manta", size: 0.78 },
        { kind: "manta", size: 0.68 }
      ];
    case "turtle":
      return [
        { kind: "turtle", size: 1.0 },
        { kind: "turtle", size: 0.88 },
        { kind: "turtle", size: 0.78 },
        { kind: "turtle", size: 0.68 }
      ];
    case "whale":
      return [
        { kind: "whale", size: 1.0 },
        { kind: "whale", size: 0.88 },
        { kind: "whale", size: 0.78 },
        { kind: "whale", size: 0.68 }
      ];
    case "jellyfish":
      return [
        { kind: "jellyfish", size: 1.0 },
        { kind: "jellyfish", size: 0.88 },
        { kind: "jellyfish", size: 0.78 },
        { kind: "jellyfish", size: 0.68 }
      ];
    case "hammerhead":
      return [
        { kind: "hammerhead", size: 1.0 },
        { kind: "greathammer", size: 0.88 },
        { kind: "hammerhead", size: 0.78 },
        { kind: "greathammer", size: 0.68 }
      ];
    case "tiger":
      return [
        { kind: "tiger", size: 1.0 },
        { kind: "tiger", size: 0.88 },
        { kind: "tiger", size: 0.78 },
        { kind: "tiger", size: 0.68 }
      ];
    case "mako":
      return [
        { kind: "mako", size: 1.0 },
        { kind: "mako", size: 0.88 },
        { kind: "mako", size: 0.78 },
        { kind: "mako", size: 0.68 }
      ];
    case "thresher":
      return [
        { kind: "thresher", size: 1.0 },
        { kind: "thresher", size: 0.88 },
        { kind: "thresher", size: 0.78 },
        { kind: "thresher", size: 0.68 }
      ];
    case "swordfish":
      return [
        { kind: "swordfish", size: 1.0 },
        { kind: "swordfish", size: 0.88 },
        { kind: "swordfish", size: 0.78 },
        { kind: "swordfish", size: 0.68 }
      ];
    case "squid":
      return [
        { kind: "squid", size: 1.0 },
        { kind: "squid", size: 0.88 },
        { kind: "squid", size: 0.78 },
        { kind: "squid", size: 0.68 }
      ];
    case "zebra":
      return [
        { kind: "zebra", size: 1.0 },
        { kind: "zebra", size: 0.88 },
        { kind: "zebra", size: 0.78 },
        { kind: "zebra", size: 0.68 }
      ];
    case "megalodon":
      return [
        { kind: "megalodon", size: 1.25 },
        { kind: "megalodon", size: 1.05 },
        { kind: "megalodon", size: 0.90 },
        { kind: "megalodon", size: 0.78 }
      ];
    case "leviathan":
      return [
        { kind: "leviathan", size: 1.35 },
        { kind: "leviathan", size: 1.15 },
        { kind: "leviathan", size: 0.95 },
        { kind: "leviathan", size: 0.8 }
      ];
    case "kraken":
      return [
        { kind: "kraken", size: 1.3 },
        { kind: "kraken", size: 1.1 },
        { kind: "kraken", size: 0.9 },
        { kind: "kraken", size: 0.75 }
      ];
    case "all":
    default:
      return [
        { kind: "kraken", size: 1.15 },
        { kind: "megalodon", size: 1.1 },
        { kind: "leviathan", size: 1.2 },
        { kind: "manta", size: 0.95 }
      ];
  }
}


class OceanEngine {
  constructor(opts) {
    this.currentKind = opts?.sharkKind ?? "all";
    this.showRain = opts?.showRain ?? true;
    this.showWaves = opts?.showWaves ?? true;
    this.showClouds = opts?.showClouds ?? true;
    this.mouseInteraction = opts?.mouseInteraction ?? true;
    this.acc = 0;
    this.width = 0;
    this.height = 0;

    this.cellWidth = 12;
    this.cellHeight = 18;

    this.environment = new Environment();
    this.rain = new RainSystem(64);
    this.rain.enabled = this.showRain;
    this.waves = new OceanWaves();
    this.waves.enabled = this.showWaves;
    this.clouds = new CloudSystem();
    this.clouds.enabled = this.showClouds;

    this.world = new World(getSharkSpecs(this.currentKind));
    this.world.kindFixed = this.currentKind !== "all";

    this.appearanceCache = new Map();
    this.wakePool = [];
    this.maxWakes = 128;
    this.wakeHead = 0;
    for (let i = 0; i < this.maxWakes; i++) {
      this.wakePool.push({ x: 0, y: 0, age: 99, glyph: ".", active: false });
    }
    this.wakeTimer = 0;

    this.prevWorldSharks = [];
    this.frame = {
      animals: [],
      fish: [],
      rainDrops: [],
      ripples: [],
      wakes: [],
      clouds: [],
      swells: [],
      time: 0,
      interpolation: 0
    };
  }

  setSharkKind(kind) {
    if (kind === this.currentKind) return;
    this.currentKind = kind;
    this.world = new World(getSharkSpecs(kind));
    this.world.kindFixed = kind !== "all";
    if (this.width > 0 && this.height > 0) {
      this.world.resize(this.width, this.height, this.cellWidth, this.cellHeight);
    }
    this.prevWorldSharks = [];
  }

  setShowRain(show) {
    this.showRain = show;
    this.rain.enabled = show;
  }

  setShowWaves(show) {
    this.showWaves = show;
    this.waves.enabled = show;
  }

  setShowClouds(show) {
    this.showClouds = show;
    this.clouds.enabled = show;
  }

  resize(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return;
    this.width = width;
    this.height = height;

    this.cellWidth = clamp(Math.round(width / 112), 8, 18);
    this.cellHeight = Math.round(this.cellWidth * 1.45);

    this.world.resize(width, height, this.cellWidth, this.cellHeight);
    this.rain.resize(width, height);
    this.waves.resize(width, height);
    this.clouds.resize(width, height);

    this.appearanceCache.clear();
    this.prevWorldSharks = [];
  }

  resetStep() {
    this.acc = 0;
  }

  getAppearance(kind, length) {
    const key = kind + ":" + Math.round(length) + ":" + this.cellWidth + ":" + this.cellHeight;
    let app = this.appearanceCache.get(key);
    if (!app) {
      app = animalAppearance(kind, length, this.cellWidth, this.cellHeight);
      this.appearanceCache.set(key, app);
    }
    return app;
  }

  advance(dt, overrides = {}) {
    if (!Number.isFinite(dt) || dt <= 0) {
      return this.frame;
    }
    const clampedDt = Math.min(0.1, dt);

    this.environment.advance(clampedDt);
    const envSnap = this.environment.snapshot(overrides);

    if (this.prevWorldSharks.length !== this.world.sharks.length) {
      this.prevWorldSharks = this.world.sharks.map(s => ({
        nodes: new Float32Array(s.nodes)
      }));
    } else {
      for (let i = 0; i < this.world.sharks.length; i++) {
        this.prevWorldSharks[i].nodes.set(this.world.sharks[i].nodes);
      }
    }

    const PHYS_STEP = 1 / 30;
    const MAX_PHYS_STEPS = 3;
    this.acc += clampedDt;
    if (this.acc > MAX_PHYS_STEPS * PHYS_STEP) {
      this.acc = MAX_PHYS_STEPS * PHYS_STEP;
    }
    let steps = 0;
    while (this.acc >= PHYS_STEP && steps < MAX_PHYS_STEPS) {
      this.world.step(PHYS_STEP);
      this.acc -= PHYS_STEP;
      steps++;
    }

    const alpha = clamp(this.acc / PHYS_STEP, 0, 1);

    const effRainIntensity = this.showRain ? envSnap.rainIntensity : 0;
    if (effRainIntensity > 0) {
      this.rain.enabled = true;
      this.rain.step(clampedDt);
    } else {
      this.rain.enabled = false;
    }

    if (this.showClouds) {
      this.clouds.step(clampedDt);
    }

    this.wakeTimer += clampedDt;
    if (this.wakeTimer >= 0.1) {
      this.wakeTimer = 0;
      for (const sh of this.world.sharks) {
        const tailIdx = (SHARK_NODES - 1) * 2;
        const wx = sh.nodes[tailIdx];
        const wy = sh.nodes[tailIdx + 1];
        const slot = this.wakePool[this.wakeHead];
        this.wakeHead = (this.wakeHead + 1) % this.maxWakes;
        slot.x = wx;
        slot.y = wy;
        slot.age = 0;
        slot.glyph = Math.random() < 0.5 ? "." : ",";
        slot.active = true;
      }
    }
    for (const w of this.wakePool) {
      if (w.active) {
        w.age += clampedDt;
        if (w.age >= 1.5) w.active = false;
      }
    }

    if (this.frame.animals.length !== this.world.sharks.length) {
      this.frame.animals = this.world.sharks.map((sh) => ({
        id: sh.id,
        kind: sh.kind,
        appearance: this.getAppearance(sh.kind, sh.length),
        nodes: new Float32Array(sh.nodes.length),
        phase: sh.phase,
        turn: sh.turn,
        depth: sh.depth
      }));
    }
    for (let i = 0; i < this.world.sharks.length; i++) {
      const sh = this.world.sharks[i];
      const fa = this.frame.animals[i];
      fa.id = sh.id;
      if (fa.kind !== sh.kind || !fa.appearance) {
        fa.kind = sh.kind;
        fa.appearance = this.getAppearance(sh.kind, sh.length);
      }
      fa.phase = sh.phase;
      fa.turn = sh.turn;
      fa.depth = sh.depth;

      const prev = this.prevWorldSharks[i]?.nodes;
      if (prev && prev.length === sh.nodes.length) {
        for (let n = 0; n < sh.nodes.length; n++) {
          fa.nodes[n] = prev[n] + (sh.nodes[n] - prev[n]) * alpha;
        }
      } else {
        fa.nodes.set(sh.nodes);
      }
    }

    this.frame.fish = this.world.fish;
    this.frame.rainDrops = this.rain.drops;
    this.frame.ripples = this.rain.ripples;
    this.frame.wakes = this.wakePool;
    this.frame.clouds = this.clouds.clouds;
    this.frame.swells = this.waves.swells;
    this.frame.time = this.world.time;
    this.frame.interpolation = alpha;
    this.frame.environment = envSnap;

    return this.frame;
  }

  step(dt) {
    this.advance(dt);
  }

  onPointerMove(x, y) {
    if (!this.mouseInteraction) return;
    this.world.pointer.x = x;
    this.world.pointer.y = y;
    this.world.pointer.active = true;
  }

  onPointerDown(x, y) {
    if (!this.mouseInteraction) return;
    this.world.splash(x, y);
    if (this.rain && this.rain.ripples.length < 32) {
      this.rain.ripples.push({
        x, y, radius: 1, maxRadius: 22, alpha: 1.0
      });
    }
  }

  onPointerLeave() {
    this.world.pointer.active = false;
  }
}


export {
  World,
  OceanEngine,
  getSharkSpecs,
  animalAppearance
};
