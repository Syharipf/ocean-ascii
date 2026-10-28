import test from "node:test";
import assert from "node:assert/strict";
import { Environment, PALETTES } from "../package/contents/ui/environment.mjs";

test("deterministic random 0.5 schedule & phase boundaries", () => {
  const env = new Environment({ random: () => 0.5 });
  // dry duration: 180 + 0.5*180 = 270s
  // rain duration: 60 + 0.5*60 = 90s (from 270 to 360)
  // peak intensity: 0.45 + 0.5*0.4 = 0.65

  // t=0
  let s0 = env.snapshot();
  assert.equal(s0.phase, "morning");
  assert.equal(s0.cycleSeconds, 0);
  assert.equal(s0.rainIntensity, 0);
  assert.deepEqual(s0.palette, PALETTES.morning);

  // t=270: rain starts
  env.advance(270);
  let s270 = env.snapshot();
  assert.equal(s270.rainIntensity, 0);

  // t=275: 5s into rain (fade in 0..10s), intensity between 0 and 0.65
  env.advance(5);
  let s275 = env.snapshot();
  assert(s275.rainIntensity > 0 && s275.rainIntensity < 0.65, `s275 rainIntensity was ${s275.rainIntensity}`);

  // t=285: 15s into rain (>=10s fade), intensity at peak 0.65
  env.advance(10);
  let s285 = env.snapshot();
  assert.equal(Math.round(s285.rainIntensity * 1000) / 1000, 0.65);

  // t=300: day phase starts
  env.advance(15);
  let s300 = env.snapshot();
  assert.equal(s300.phase, "day");
  assert.equal(s300.cycleSeconds, 300);

  // t=355: 85s into rain (in fade out 80..90s), intensity between 0 and 0.65
  env.advance(55);
  let s355 = env.snapshot();
  assert(s355.rainIntensity > 0 && s355.rainIntensity < 0.65, `s355 rainIntensity was ${s355.rainIntensity}`);

  // t=360: rain ends, back to 0
  env.advance(5);
  let s360 = env.snapshot();
  assert.equal(s360.rainIntensity, 0);

  // Phase progression: t=600 evening, t=900 night, t=1200 morning
  env.advance(240); // t=600
  assert.equal(env.snapshot().phase, "evening");

  env.advance(300); // t=900
  assert.equal(env.snapshot().phase, "night");

  env.advance(300); // t=1200
  assert.equal(env.snapshot().phase, "morning");
  assert.equal(env.snapshot().cycleSeconds, 0);
});

test("color transition continuity at boundaries", () => {
  const env = new Environment({ random: () => 0.5 });
  env.advance(299.999);
  const s299 = env.snapshot();
  env.advance(0.001);
  const s300 = env.snapshot();

  // Tolerance RGB < 1
  assert.equal(s299.palette.sea, s300.palette.sea);
  assert.equal(s299.palette.grid, s300.palette.grid);
  assert.equal(s299.palette.foam, s300.palette.foam);
  assert.equal(s299.palette.cloud, s300.palette.cloud);
  assert(Math.abs(s299.palette.light - s300.palette.light) < 0.005);

  // Night -> morning at 1199.999 and 1200
  env.advance(899.999); // t=1199.999
  const s1199 = env.snapshot();
  env.advance(0.001); // t=1200
  const s1200 = env.snapshot();
  assert.equal(s1199.palette.sea, s1200.palette.sea);
  assert.equal(s1199.palette.grid, s1200.palette.grid);
  assert(Math.abs(s1199.palette.light - s1200.palette.light) < 0.005);
});

test("large advance equivalence to step-by-step advance", () => {
  let callCount1 = 0;
  const env1 = new Environment({ random: () => { callCount1++; return 0.42; } });
  for (let i = 0; i < 1200; i++) {
    env1.advance(1);
  }
  const s1 = env1.snapshot();

  let callCount2 = 0;
  const env2 = new Environment({ random: () => { callCount2++; return 0.42; } });
  env2.advance(1200);
  const s2 = env2.snapshot();

  assert.equal(s1.phase, s2.phase);
  assert.equal(s1.cycleSeconds, s2.cycleSeconds);
  assert.equal(s1.rainIntensity, s2.rainIntensity);
  assert.equal(s1.snowIntensity, s2.snowIntensity);
  assert.equal(s1.weather, s2.weather);
  assert.deepEqual(s1.palette, s2.palette);
  assert.equal(callCount1, callCount2);
});

test("preview overrides don't mutate elapsed or RNG state", () => {
  const env = new Environment({ random: () => 0.5 });
  env.advance(50); // t=50, morning, dry
  const beforeElapsed = env.elapsed;

  const overridden = env.snapshot({ phase: "night", weather: "rain" });
  assert.equal(overridden.phase, "night");
  assert.equal(overridden.rainIntensity, 0.65);
  assert.deepEqual(overridden.palette, PALETTES.night);

  const backToAuto = env.snapshot({ phase: "auto", weather: "auto" });
  assert.equal(backToAuto.phase, "morning");
  assert.equal(backToAuto.rainIntensity, 0);
  assert.equal(env.elapsed, beforeElapsed);
});

test("snow override in snapshot", () => {
  const env = new Environment({ random: () => 0.5 });
  const snap = env.snapshot({ weather: "snow" });
  assert.equal(snap.weather, "snow");
  assert.equal(snap.snowIntensity, 0.65);
  assert.equal(snap.rainIntensity, 0);
});

test("deterministic snow schedule with random 0.1", () => {
  const env = new Environment({ random: () => 0.1 });
  // dry: 180 + 0.1*180 = 198s
  assert.equal(env.snapshot().weather, "clear");
  assert.equal(env.snapshot().snowIntensity, 0);

  env.advance(198); // t=198: snow starts (0.1 < 0.35)
  const s198 = env.snapshot();
  assert.equal(s198.weather, "snow");
  assert.equal(s198.snowIntensity, 0);

  env.advance(5); // t=203: fading in
  const s203 = env.snapshot();
  assert(s203.snowIntensity > 0 && s203.snowIntensity < 0.49);

  env.advance(10); // t=213: peak at 0.45 + 0.1*0.4 = 0.49
  const s213 = env.snapshot();
  assert.equal(Math.round(s213.snowIntensity * 1000) / 1000, 0.49);
  assert.equal(s213.rainIntensity, 0);
});
