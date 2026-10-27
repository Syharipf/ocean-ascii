import assert from "node:assert/strict";
import { OceanEngine, getSharkSpecs } from "../package/contents/ui/engine.mjs";

console.log("Running ASCII Ocean deterministic test suite...");

// Deterministic LCG RNG to override Math.random during testing
let seed = 123456789;
function seededRandom() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

const origRandom = Math.random;
Math.random = seededRandom;

try {
  // 1. Shark specifications exist for all supported kinds
  const speciesList = ["manta", "turtle", "whale", "jellyfish", "hammerhead", "tiger", "mako", "thresher", "swordfish", "squid", "all"];
  for (const kind of speciesList) {
    const specs = getSharkSpecs(kind);
    assert(Array.isArray(specs) && specs.length > 0, `Species ${kind} must provide specs`);
    for (const spec of specs) {
      assert(typeof spec.kind === "string" && spec.kind.length > 0, "Spec kind must be string");
      assert(Number.isFinite(spec.size) && spec.size > 0, "Spec size must be positive finite");
    }
  }

  // 2. Engine initialization & finite bounds across zero/small resize
  const engine = new OceanEngine({
    sharkKind: "all",
    showRain: true,
    showWaves: true,
    showClouds: true,
    mouseInteraction: true,
    externalClouds: true
  });

  // Zero and negative dimension guards
  engine.resize(0, 0);
  assert.equal(engine.width, 0, "Zero resize width must remain zero");
  assert.equal(engine.height, 0, "Zero resize height must remain zero");

  engine.resize(-100, -50);
  assert.equal(engine.width, 0, "Negative resize must be ignored");

  // Small viewport
  engine.resize(32, 24);
  assert(engine.world.sharks.length > 0, "World should initialize sharks on small dimensions");
  for (const s of engine.world.sharks) {
    for (let i = 0; i < s.nodes.length; i++) {
      assert(Number.isFinite(s.nodes[i]), "Shark spine nodes must be finite on small dimensions");
    }
  }

  // Standard viewport
  engine.resize(1920, 1080);
  assert(engine.world.sharks.length > 0, "Sharks initialized");
  assert(engine.world.fish.length > 0, "Fish initialized");
  assert(Array.isArray(engine.clouds.clouds), "Clouds array exposed");
  assert(engine.clouds.epoch > 0, "Cloud epoch increments on resize");

  // 3. Movement and coordinates are finite
  const initShark0Pos = engine.world.sharks[0].nodes[0];
  for (let i = 0; i < 30; i++) {
    engine.step(1 / 60);
  }
  assert.notEqual(engine.world.sharks[0].nodes[0], initShark0Pos, "Shark spine node advances after steps");
  for (const s of engine.world.sharks) {
    assert(Number.isFinite(s.heading), "Shark heading must be finite");
    assert(Number.isFinite(s.speed) && s.speed > 0, "Shark speed must be positive finite");
    for (let i = 0; i < s.nodes.length; i++) {
      assert(Number.isFinite(s.nodes[i]), "Shark node coordinates must be finite");
    }
  }
  for (const f of engine.world.fish) {
    assert(Number.isFinite(f.x) && Number.isFinite(f.y), "Fish coordinates must be finite");
    assert(Number.isFinite(f.vx) && Number.isFinite(f.vy), "Fish velocities must be finite");
  }

  // 4. Mouse pointer interactions and disabling
  engine.mouseInteraction = true;
  engine.onPointerMove(500, 400);
  assert.equal(engine.world.pointer.active, true, "Pointer must become active on move");
  assert.equal(engine.world.pointer.x, 500);
  assert.equal(engine.world.pointer.y, 400);

  const prevEvents = engine.world.events.length;
  engine.onPointerDown(500, 400);
  assert(engine.world.events.length > prevEvents, "onPointerDown triggers splash when interaction enabled");

  engine.onPointerLeave();
  assert.equal(engine.world.pointer.active, false, "Pointer deactivates on leave");

  // Disabled pointer creates no splash
  engine.mouseInteraction = false;
  const eventsBeforeDisabledClick = engine.world.events.length;
  engine.onPointerDown(500, 400);
  assert.equal(engine.world.events.length, eventsBeforeDisabledClick, "Disabled pointer interaction ignores onPointerDown");
  engine.mouseInteraction = true;

  // 5. Accumulator clamp and resetStep
  engine.step(0.5); // large delta
  assert(engine.acc <= 4 * (1 / 60) + 1e-6, "Accumulator must clamp to MAX_STEPS * STEP without dropping fractional progression");
  engine.resetStep();
  assert.equal(engine.acc, 0, "resetStep zeroes accumulator");
  const timeBeforeZeroDelta = engine.world.time;
  engine.step(0);
  assert.equal(engine.world.time, timeBeforeZeroDelta, "Zero delta step advances no simulation time");

  // 6. Species rotation: actual transition at boundary when age elapsed
  engine.setSharkKind("all");
  assert.equal(engine.world.kindFixed, false, "'all' mode must allow rotation");
  const testShark = engine.world.sharks[0];
  const oldKind = testShark.kind;
  testShark.age = 20; // elapsed age > 16

  // Force all nodes offscreen
  const W = engine.width;
  const H = engine.height;
  const L = testShark.length;
  for (let n = 0; n < testShark.nodes.length; n += 2) {
    testShark.nodes[n] = W + L * 2;
    testShark.nodes[n + 1] = H + L * 2;
  }

  // Step physics to trigger rotation transition
  engine.step(1 / 60);

  // Shark must have rotated to a new valid species and respawned
  assert.equal(testShark.age, 0, "Rotated shark age resets to 0");
  assert.notEqual(testShark.kind, oldKind, "Rotation selects a different species");
  assert(typeof testShark.kind === "string", "Shark has valid kind after rotation");
  assert(Number.isFinite(testShark.nodes[0]), "Respawned shark has finite position");

  // 7. Fixed kind stays explicit across forced offscreen boundary
  engine.setSharkKind("mako");
  assert.equal(engine.world.kindFixed, true, "Explicit species sets kindFixed");
  const fixedShark = engine.world.sharks[0];
  assert.equal(fixedShark.kind, "mako");
  assert.equal(fixedShark.fixedKind, true);
  fixedShark.age = 25;
  for (let n = 0; n < fixedShark.nodes.length; n += 2) {
    fixedShark.nodes[n] = W + L * 2;
    fixedShark.nodes[n + 1] = H + L * 2;
  }

  engine.step(1 / 60);
  assert.equal(fixedShark.kind, "mako", "Explicit species must NOT rotate even when forced offscreen with elapsed age");

  const rotating = new OceanEngine({ sharkKind: "all" });
  rotating.resize(1366, 768);
  const initialKinds = rotating.world.sharks.map(s => s.kind);
  let rotatedNaturally = false;
  for (let tick = 0; tick < 60 * 60; tick++) {
    rotating.step(1 / 60);
    if (rotating.world.sharks.some((s, i) => s.kind !== initialKinds[i])) {
      rotatedNaturally = true;
      break;
    }
  }
  assert(rotatedNaturally, "Mixed mode must naturally rotate within one simulated minute");

  console.log("Deterministic self-check PASSED.");
} finally {
  Math.random = origRandom;
}
