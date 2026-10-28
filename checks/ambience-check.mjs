import test from "node:test";
import assert from "node:assert/strict";
import { Ambience, AMBIENCE_PROFILES } from "../package/contents/ui/ambience.mjs";

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test("per-phase budgets match the profile table", () => {
  const amb = new Ambience({ random: seeded(7) });
  amb.resize(1920, 1200);
  const phases = ["morning", "day", "evening", "night"];
  for (let i = 0; i < phases.length; i++) {
    amb.step(0.033, phases[i]);
    assert.equal(amb.glints.length, AMBIENCE_PROFILES[i].glints);
    assert.equal(amb.motes.length, AMBIENCE_PROFILES[i].motes);
    assert.equal(amb.birds.length, AMBIENCE_PROFILES[i].birds);
  }
});

test("identical seeds produce identical fields", () => {
  const a = new Ambience({ random: seeded(11) });
  const b = new Ambience({ random: seeded(11) });
  a.resize(1280, 720);
  b.resize(1280, 720);
  a.step(0.033, "evening");
  b.step(0.033, "evening");
  assert.deepEqual(a.glints.map(g => [g.x, g.y, g.glyph]), b.glints.map(g => [g.x, g.y, g.glyph]));
  assert.deepEqual(a.motes.map(m => [m.x, m.y]), b.motes.map(m => [m.x, m.y]));
});

test("motes and birds stay within wrapped bounds after long simulation", () => {
  const amb = new Ambience({ random: seeded(23) });
  amb.resize(800, 600);
  amb.step(0.033, "night");
  for (let i = 0; i < 3000; i++) amb.step(0.1, "night");
  for (const m of amb.motes) {
    assert(m.x >= -21 && m.x <= 821, `mote x ${m.x}`);
    assert(m.y >= -21 && m.y <= 621, `mote y ${m.y}`);
  }
  for (const b of amb.birds) {
    assert(b.x >= -91 && b.x <= 891, `bird x ${b.x}`);
  }
});

test("phase switch before resize yields empty fields without throwing", () => {
  const amb = new Ambience({ random: seeded(31) });
  amb.step(0.033, "day");
  assert.equal(amb.glints.length, 0);
  assert.equal(amb.motes.length, 0);
  amb.resize(640, 480);
  assert.equal(amb.glints.length, AMBIENCE_PROFILES[1].glints);
});
