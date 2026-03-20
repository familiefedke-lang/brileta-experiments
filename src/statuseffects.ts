/** Procedural status-effect sprite generation. */
import {
  clamp,
  clampChannel,
  drawLine,
  fillRect,
  stampEllipse,
  batchStampEllipses,
  type EllipseSpec,
} from './primitives.js';
import { Rng } from './rng.js';
import { Canvas, type Color, type RGBA } from './types.js';

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[rng.nextInt(0, items.length - 1)];
}

function shiftColor(base: Color, dr: number, dg: number, db: number): Color {
  return [
    clampChannel(base[0] + dr),
    clampChannel(base[1] + dg),
    clampChannel(base[2] + db),
  ];
}

// ----------------------------------------------------------------
// Archetype
// ----------------------------------------------------------------

export enum StatusEffectArchetype {
  POISON = 'poison',
  FIRE   = 'fire',
  FREEZE = 'freeze',
  SHOCK  = 'shock',
  BLEED  = 'bleed',
}

function archetypeFromSeed(seed: number): StatusEffectArchetype {
  const r = (seed >>> 0) % 5;
  if (r === 0) return StatusEffectArchetype.POISON;
  if (r === 1) return StatusEffectArchetype.FIRE;
  if (r === 2) return StatusEffectArchetype.FREEZE;
  if (r === 3) return StatusEffectArchetype.SHOCK;
  return StatusEffectArchetype.BLEED;
}

// ----------------------------------------------------------------
// POISON – green bubbling mist
// ----------------------------------------------------------------

const POISON_COLORS: Color[] = [
  [60,  175, 55],
  [45,  160, 40],
  [80,  190, 65],
];

function generatePoison(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const base = pick(rng, POISON_COLORS);
  const dark = shiftColor(base, -30, -50, -25);
  const lite = shiftColor(base,  30,  35,  20);

  // Mist cloud at bottom
  const cloudY = Math.round(h * 0.55);
  const cloudEllipses: EllipseSpec[] = [];
  const count = rng.nextInt(6, 10);
  for (let i = 0; i < count; i++) {
    cloudEllipses.push({
      cx: rng.nextRange(w * 0.12, w * 0.88),
      cy: cloudY + rng.nextRange(-h * 0.18, h * 0.22),
      rx: rng.nextRange(w * 0.15, w * 0.30),
      ry: rng.nextRange(h * 0.10, h * 0.20),
    });
  }
  batchStampEllipses(canvas, cloudEllipses, base[0], base[1], base[2], 180, 2.0, 0.15);

  // Rising bubbles
  const bubbleCount = rng.nextInt(4, 7);
  for (let i = 0; i < bubbleCount; i++) {
    const bx = rng.nextRange(w * 0.15, w * 0.85);
    const by = rng.nextRange(h * 0.05, h * 0.60);
    const br = rng.nextRange(1.0, 3.0);
    const col = rng.nextFloat() > 0.5 ? base : lite;
    stampEllipse(canvas, bx, by, br, br, col[0], col[1], col[2], rng.nextInt(160, 220), 2.0, 0.4);
    // Bubble glint
    stampEllipse(canvas, bx - br * 0.3, by - br * 0.3, br * 0.35, br * 0.35,
      lite[0], lite[1], lite[2], 150, 1.5, 0.7);
  }

  // Drip from bottom
  const dripX = rng.nextRange(w * 0.3, w * 0.7);
  fillRect(canvas, Math.round(dripX), Math.round(h * 0.75), 2, Math.round(h * 0.20),
    dark[0], dark[1], dark[2], 180);
  stampEllipse(canvas, dripX + 1, h - 3, 2.5, 2.0,
    dark[0], dark[1], dark[2], 200, 2.0, 0.3);
}

// ----------------------------------------------------------------
// FIRE – flame effect
// ----------------------------------------------------------------

const FIRE_PALETTES: RGBA[][] = [
  [[240, 50,  10,  220], [240, 120, 20,  200], [250, 210, 40,  180]],
  [[220, 30,  10,  220], [230, 100, 15,  200], [255, 200, 50,  170]],
];

function generateFire(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const palette = pick(rng, FIRE_PALETTES);

  // Base embers / glow
  const baseEllipses: EllipseSpec[] = [];
  const count = rng.nextInt(5, 9);
  for (let i = 0; i < count; i++) {
    baseEllipses.push({
      cx: rng.nextRange(w * 0.15, w * 0.85),
      cy: rng.nextRange(h * 0.60, h * 0.90),
      rx: rng.nextRange(w * 0.14, w * 0.28),
      ry: rng.nextRange(h * 0.09, h * 0.18),
    });
  }
  batchStampEllipses(canvas, baseEllipses,
    palette[0][0], palette[0][1], palette[0][2], palette[0][3], 2.0, 0.2);

  // Flame tongues – upward elongated ellipses
  const tongues = rng.nextInt(3, 6);
  for (let i = 0; i < tongues; i++) {
    const tx = rng.nextRange(w * 0.10, w * 0.90);
    const ty = rng.nextRange(h * 0.15, h * 0.65);
    const trx = rng.nextRange(w * 0.08, w * 0.18);
    const tryV = rng.nextRange(h * 0.18, h * 0.38);
    const col = palette[rng.nextInt(0, palette.length - 1)];
    stampEllipse(canvas, tx, ty, trx, tryV,
      col[0], col[1], col[2], col[3], 2.5, 0.15);
  }

  // Bright yellow core
  stampEllipse(canvas, w * 0.50, h * 0.62, w * 0.14, h * 0.12,
    palette[2][0], palette[2][1], palette[2][2], palette[2][3], 1.8, 0.35);
}

// ----------------------------------------------------------------
// FREEZE – ice crystals / frost
// ----------------------------------------------------------------

const ICE_COLORS: Color[] = [
  [160, 220, 245],
  [140, 210, 240],
  [175, 230, 250],
];

function generateFreeze(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const base = pick(rng, ICE_COLORS);
  const dark = shiftColor(base, -40, -30, -20);
  const lite = shiftColor(base,  25,  15,   8);

  const cx = Math.round(w / 2);
  const cy = Math.round(h / 2);

  // Central ice blob
  stampEllipse(canvas, cx, cy, w * 0.30, h * 0.28,
    base[0], base[1], base[2], 200, 2.0, 0.30);

  // Crystal spikes – lines radiating outward
  const spikeCount = rng.nextInt(5, 8);
  for (let i = 0; i < spikeCount; i++) {
    const angle = (i / spikeCount) * Math.PI * 2 + rng.nextRange(-0.15, 0.15);
    const len = rng.nextRange(w * 0.25, w * 0.46);
    const ex = cx + Math.cos(angle) * len;
    const ey = cy + Math.sin(angle) * len;
    drawLine(canvas, cx, cy, Math.round(ex), Math.round(ey),
      base[0], base[1], base[2], rng.nextInt(180, 230), 1);

    // Cross-ticks on spike
    const tickDist = len * rng.nextRange(0.45, 0.65);
    const tx = cx + Math.cos(angle) * tickDist;
    const ty = cy + Math.sin(angle) * tickDist;
    const perpAngle = angle + Math.PI / 2;
    const tickLen = rng.nextRange(2.5, 5.0);
    drawLine(canvas,
      Math.round(tx - Math.cos(perpAngle) * tickLen),
      Math.round(ty - Math.sin(perpAngle) * tickLen),
      Math.round(tx + Math.cos(perpAngle) * tickLen),
      Math.round(ty + Math.sin(perpAngle) * tickLen),
      lite[0], lite[1], lite[2], 160, 1);
  }

  // Frost sparkle dots
  const sparkCount = rng.nextInt(4, 8);
  for (let i = 0; i < sparkCount; i++) {
    const sx = rng.nextRange(2, w - 3);
    const sy = rng.nextRange(2, h - 3);
    stampEllipse(canvas, sx, sy, rng.nextRange(0.8, 2.0), rng.nextRange(0.8, 2.0),
      lite[0], lite[1], lite[2], rng.nextInt(160, 220), 1.5, 0.55);
  }

  // Dark outline hint on core
  stampEllipse(canvas, cx + 1, cy + 1, w * 0.29, h * 0.27,
    dark[0], dark[1], dark[2], 60, 1.5, 0.0);
}

// ----------------------------------------------------------------
// SHOCK – electrical sparks
// ----------------------------------------------------------------

function generateShock(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const cx = Math.round(w / 2);
  const cy = Math.round(h / 2);

  // Glow core
  stampEllipse(canvas, cx, cy, w * 0.18, h * 0.18,
    240, 230, 80, 200, 2.0, 0.25);

  // Lightning bolts
  const boltCount = rng.nextInt(3, 6);
  for (let b = 0; b < boltCount; b++) {
    const angle = (b / boltCount) * Math.PI * 2 + rng.nextRange(-0.2, 0.2);
    let px = cx;
    let py = cy;
    const segments = rng.nextInt(2, 4);
    const maxLen = rng.nextRange(w * 0.25, w * 0.46);
    const segLen = maxLen / segments;

    for (let s = 0; s < segments; s++) {
      const jitter = rng.nextRange(-segLen * 0.55, segLen * 0.55);
      const nx = clamp(Math.round(px + Math.cos(angle) * segLen + Math.sin(angle) * jitter), 0, w - 1);
      const ny = clamp(Math.round(py + Math.sin(angle) * segLen - Math.cos(angle) * jitter), 0, h - 1);
      drawLine(canvas, px, py, nx, ny, 240, 230, 80, 230, 1);
      // White core on bolt
      if (segLen > 4) {
        const mx = Math.round((px + nx) / 2);
        const my = Math.round((py + ny) / 2);
        canvas.setPixel(mx, my, 255, 255, 220, 240);
      }
      px = nx;
      py = ny;
    }
  }

  // Outer electric halo
  stampEllipse(canvas, cx, cy, w * 0.35, h * 0.35,
    200, 210, 60, 70, 2.5, 0.05);
}

// ----------------------------------------------------------------
// BLEED – blood drip / wound effect
// ----------------------------------------------------------------

const BLOOD_COLORS: Color[] = [
  [180, 20,  20],
  [160, 15,  18],
  [195, 25,  22],
];

function generateBleed(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const base = pick(rng, BLOOD_COLORS);
  const dark = shiftColor(base, -30, -10, -10);

  // Source pool at top
  const poolEllipses: EllipseSpec[] = [];
  const pCount = rng.nextInt(3, 6);
  for (let i = 0; i < pCount; i++) {
    poolEllipses.push({
      cx: rng.nextRange(w * 0.20, w * 0.80),
      cy: rng.nextRange(h * 0.08, h * 0.30),
      rx: rng.nextRange(w * 0.10, w * 0.25),
      ry: rng.nextRange(h * 0.06, h * 0.16),
    });
  }
  batchStampEllipses(canvas, poolEllipses, base[0], base[1], base[2], 210, 2.0, 0.2);

  // Vertical drip streams
  const dripCount = rng.nextInt(2, 4);
  for (let i = 0; i < dripCount; i++) {
    const dx = rng.nextRange(w * 0.20, w * 0.80);
    const dyStart = rng.nextRange(h * 0.25, h * 0.45);
    const dyEnd   = rng.nextRange(dyStart + h * 0.20, h - 3);
    const dw = rng.nextInt(1, 2);
    fillRect(canvas, Math.round(dx) - Math.round(dw / 2), Math.round(dyStart),
      dw, Math.round(dyEnd - dyStart),
      base[0], base[1], base[2], rng.nextInt(190, 230));
    // Drip tip
    stampEllipse(canvas, dx, dyEnd, dw + 1.0, dw * 1.2,
      dark[0], dark[1], dark[2], 210, 2.0, 0.35);
  }

  // Puddle / splatter at bottom
  const splatterCount = rng.nextInt(3, 6);
  for (let i = 0; i < splatterCount; i++) {
    const sx = rng.nextRange(w * 0.10, w * 0.90);
    const sy = rng.nextRange(h * 0.72, h * 0.92);
    stampEllipse(canvas, sx, sy,
      rng.nextRange(1.5, 4.0), rng.nextRange(1.0, 3.0),
      base[0], base[1], base[2], rng.nextInt(160, 210), 2.0, 0.2);
  }
}

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

export interface StatusEffectResult {
  canvas: Canvas;
  archetype: StatusEffectArchetype;
}

export function generateStatusEffect(
  seed: number,
  size = 18,
  archetype?: StatusEffectArchetype,
): StatusEffectResult {
  archetype = archetype ?? archetypeFromSeed(seed);
  const rng = new Rng(seed);
  const actualSize = clamp(size + rng.nextInt(-2, 2), 12, 24);
  const canvas = new Canvas(actualSize, actualSize);

  switch (archetype) {
    case StatusEffectArchetype.POISON: generatePoison(canvas, actualSize, actualSize, rng); break;
    case StatusEffectArchetype.FIRE:   generateFire(canvas, actualSize, actualSize, rng);   break;
    case StatusEffectArchetype.FREEZE: generateFreeze(canvas, actualSize, actualSize, rng); break;
    case StatusEffectArchetype.SHOCK:  generateShock(canvas, actualSize, actualSize, rng);  break;
    case StatusEffectArchetype.BLEED:  generateBleed(canvas, actualSize, actualSize, rng);  break;
  }

  return { canvas, archetype };
}
