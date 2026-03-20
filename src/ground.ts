/** Procedural ground / dirt tile sprite generation. */
import {
  clamp,
  clampChannel,
  darkenRim,
  drawLine,
  fillRect,
  stampEllipse,
  strokeRect,
} from './primitives.js';
import { Rng } from './rng.js';
import { Canvas, type Color } from './types.js';

// ----------------------------------------------------------------
// Shared helpers
// ----------------------------------------------------------------

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[rng.nextInt(0, items.length - 1)];
}

function jitterColor(
  rng: Rng,
  base: Color,
  delta: number,
  min: Color = [0, 0, 0],
  max: Color = [255, 255, 255],
): Color {
  return [
    clamp(base[0] + rng.nextInt(-delta, delta), min[0], max[0]),
    clamp(base[1] + rng.nextInt(-delta, delta), min[1], max[1]),
    clamp(base[2] + rng.nextInt(-delta, delta), min[2], max[2]),
  ];
}

function shiftColor(base: Color, dr: number, dg: number, db: number): Color {
  return [
    clampChannel(base[0] + dr),
    clampChannel(base[1] + dg),
    clampChannel(base[2] + db),
  ];
}

// ================================================================
// Ground Tile
// ================================================================

export enum GroundArchetype {
  SANDY       = 'sandy',
  CHUNKY      = 'chunky',
  WOODY       = 'woody',
  MUDDY       = 'muddy',
  GRAVELLY    = 'gravelly',
  LEAFY       = 'leafy',
  TRASHY      = 'trashy',
  GRASSY_DARK  = 'grassy_dark',
  GRASSY_LIGHT = 'grassy_light',
}

function groundArchetypeFromSeed(seed: number): GroundArchetype {
  const r = (seed >>> 0) % 9;
  if (r === 0) return GroundArchetype.SANDY;
  if (r === 1) return GroundArchetype.CHUNKY;
  if (r === 2) return GroundArchetype.WOODY;
  if (r === 3) return GroundArchetype.MUDDY;
  if (r === 4) return GroundArchetype.GRAVELLY;
  if (r === 5) return GroundArchetype.LEAFY;
  if (r === 6) return GroundArchetype.TRASHY;
  if (r === 7) return GroundArchetype.GRASSY_DARK;
  return GroundArchetype.GRASSY_LIGHT;
}

// ----------------------------------------------------------------
// Base palettes
// ----------------------------------------------------------------

const SANDY_BASE: Color[] = [
  [210, 190, 140],
  [220, 198, 148],
  [200, 182, 130],
  [215, 195, 150],
];

const CHUNKY_BASE: Color[] = [
  [145, 120, 88],
  [135, 110, 80],
  [155, 130, 96],
  [140, 118, 84],
];

const WOODY_BASE: Color[] = [
  [130, 95, 55],
  [118, 85, 48],
  [140, 102, 60],
  [125, 90, 52],
];

const MUDDY_BASE: Color[] = [
  [100, 80, 58],
  [90, 72, 50],
  [110, 88, 64],
  [95, 76, 55],
];

const GRAVELLY_BASE: Color[] = [
  [160, 155, 148],
  [150, 145, 138],
  [170, 165, 158],
  [155, 150, 144],
];

const LEAFY_BASE: Color[] = [
  [75, 118, 48],
  [65, 108, 40],
  [85, 128, 55],
  [70, 115, 45],
];

const TRASHY_BASE: Color[] = [
  [118, 110, 100],
  [108, 100, 90],
  [125, 118, 108],
  [115, 106, 96],
];

const GRASSY_DARK_BASE: Color[] = [
  [35,  88, 30],
  [30,  78, 25],
  [42,  98, 36],
  [38,  85, 32],
];

const GRASSY_LIGHT_BASE: Color[] = [
  [78,  148, 52],
  [68,  135, 44],
  [88,  160, 60],
  [82,  152, 56],
];

// ----------------------------------------------------------------
// Generators per archetype
// ----------------------------------------------------------------

function generateSandy(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const base = jitterColor(rng, pick(rng, SANDY_BASE), 10, [170, 155, 100], [245, 225, 180]);
  const light = shiftColor(base, 18, 14, 8);
  const dark  = shiftColor(base, -22, -18, -12);

  // Base fill
  fillRect(canvas, 0, 0, w, h, base[0], base[1], base[2], 255);

  // Subtle ripple bands (horizontal gradient-like streaks)
  const bandCount = rng.nextInt(3, 6);
  for (let i = 0; i < bandCount; i++) {
    const by = rng.nextInt(0, h - 1);
    const bh = rng.nextInt(1, 2);
    const bandColor = rng.nextFloat() > 0.5 ? light : dark;
    fillRect(canvas, 0, by, w, bh, bandColor[0], bandColor[1], bandColor[2], rng.nextInt(30, 70));
  }

  // Large soft dune-like clumps
  const clumpCount = rng.nextInt(3, 6);
  for (let i = 0; i < clumpCount; i++) {
    const cx = rng.nextInt(0, w);
    const cy = rng.nextInt(0, h);
    const rx = rng.nextRange(w * 0.18, w * 0.38);
    const ry = rng.nextRange(h * 0.12, h * 0.25);
    const clumpColor = rng.nextFloat() > 0.5 ? light : dark;
    stampEllipse(canvas, cx, cy, rx, ry, clumpColor[0], clumpColor[1], clumpColor[2], rng.nextInt(25, 55), 1.5, 0.0);
  }

  // Micro speckle (individual pixels)
  const speckleCount = rng.nextInt(18, 38);
  for (let i = 0; i < speckleCount; i++) {
    const px = rng.nextInt(0, w - 1);
    const py = rng.nextInt(0, h - 1);
    const sc = rng.nextFloat() > 0.5 ? light : dark;
    const idx = (py * w + px) * 4;
    canvas.data[idx]     = sc[0];
    canvas.data[idx + 1] = sc[1];
    canvas.data[idx + 2] = sc[2];
    canvas.data[idx + 3] = rng.nextInt(80, 160);
  }
}

function generateChunky(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const base = jitterColor(rng, pick(rng, CHUNKY_BASE), 12, [100, 78, 50], [195, 168, 125]);
  const pebbleDark  = shiftColor(base, -35, -28, -18);
  const pebbleLight = shiftColor(base, 28, 22, 14);

  // Base fill
  fillRect(canvas, 0, 0, w, h, base[0], base[1], base[2], 255);

  // Medium texture – irregular earthy patches
  const patchCount = rng.nextInt(5, 9);
  for (let i = 0; i < patchCount; i++) {
    const px = rng.nextInt(0, w);
    const py = rng.nextInt(0, h);
    const prx = rng.nextRange(w * 0.08, w * 0.20);
    const pry = rng.nextRange(h * 0.07, h * 0.18);
    const patchColor = rng.nextFloat() > 0.5 ? pebbleDark : pebbleLight;
    stampEllipse(canvas, px, py, prx, pry, patchColor[0], patchColor[1], patchColor[2], rng.nextInt(60, 130), 1.8, 0.55);
  }

  // Larger pebble-like blotches
  const pebbleCount = rng.nextInt(4, 8);
  for (let i = 0; i < pebbleCount; i++) {
    const px = rng.nextInt(1, w - 2);
    const py = rng.nextInt(1, h - 2);
    const prx = rng.nextRange(w * 0.05, w * 0.12);
    const pry = prx * rng.nextRange(0.6, 1.0);
    stampEllipse(canvas, px, py, prx, pry, pebbleDark[0], pebbleDark[1], pebbleDark[2], rng.nextInt(100, 200), 2.0, 0.70);
    // Pebble highlight
    stampEllipse(canvas, px - 1, py - 1, prx * 0.5, pry * 0.5, pebbleLight[0], pebbleLight[1], pebbleLight[2], rng.nextInt(60, 120), 2.0, 0.70);
  }

  // Micro speckle
  const speckleCount = rng.nextInt(10, 22);
  for (let i = 0; i < speckleCount; i++) {
    const px = rng.nextInt(0, w - 1);
    const py = rng.nextInt(0, h - 1);
    const sc = rng.nextFloat() > 0.5 ? pebbleDark : pebbleLight;
    const idx = (py * w + px) * 4;
    canvas.data[idx]     = sc[0];
    canvas.data[idx + 1] = sc[1];
    canvas.data[idx + 2] = sc[2];
    canvas.data[idx + 3] = rng.nextInt(120, 220);
  }
}

function generateWoody(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const base = jitterColor(rng, pick(rng, WOODY_BASE), 10, [90, 62, 30], [175, 135, 80]);
  const grainDark  = shiftColor(base, -40, -30, -18);
  const grainLight = shiftColor(base, 32, 24, 14);

  // Base fill
  fillRect(canvas, 0, 0, w, h, base[0], base[1], base[2], 255);

  // Fibrous bark-like grain streaks (near-vertical or diagonal lines)
  const grainCount = rng.nextInt(8, 16);
  for (let i = 0; i < grainCount; i++) {
    const gx = rng.nextInt(0, w - 1);
    const angle = rng.nextRange(-0.15, 0.15);
    const len = rng.nextInt(h >> 1, h);
    const x2 = gx + Math.round(Math.sin(angle) * len);
    const y2 = rng.nextInt(0, h - 1);
    const gc = rng.nextFloat() > 0.4 ? grainDark : grainLight;
    drawLine(canvas, gx, 0, clamp(x2, 0, w - 1), y2, gc[0], gc[1], gc[2], rng.nextInt(60, 130), 1);
  }

  // Dark vein slivers
  const veinCount = rng.nextInt(3, 6);
  for (let i = 0; i < veinCount; i++) {
    const vx = rng.nextInt(1, w - 2);
    const vy = rng.nextInt(0, h - 1);
    const vlen = rng.nextInt(2, 5);
    fillRect(canvas, vx, vy, 1, vlen, grainDark[0], grainDark[1], grainDark[2], rng.nextInt(130, 210));
  }

  // Chipped / fragment patches
  const chipCount = rng.nextInt(2, 5);
  for (let i = 0; i < chipCount; i++) {
    const cx = rng.nextInt(1, w - 3);
    const cy = rng.nextInt(1, h - 3);
    const cw = rng.nextInt(2, 5);
    const ch = rng.nextInt(1, 3);
    fillRect(canvas, cx, cy, cw, ch, grainDark[0], grainDark[1], grainDark[2], rng.nextInt(90, 160));
  }

  darkenRim(canvas, 14, 10, 6);
}

function generateMuddy(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const base = jitterColor(rng, pick(rng, MUDDY_BASE), 8, [60, 45, 30], [145, 118, 88]);
  const wetDark  = shiftColor(base, -30, -22, -14);
  const dryLight = shiftColor(base, 22, 16, 10);

  // Base fill (slightly darker – wet look)
  fillRect(canvas, 0, 0, w, h, base[0], base[1], base[2], 255);

  // Wet/dry variation blobs
  const blobCount = rng.nextInt(4, 8);
  for (let i = 0; i < blobCount; i++) {
    const bx = rng.nextInt(0, w);
    const by = rng.nextInt(0, h);
    const brx = rng.nextRange(w * 0.12, w * 0.32);
    const bry = rng.nextRange(h * 0.10, h * 0.28);
    const bc = rng.nextFloat() > 0.55 ? wetDark : dryLight;
    stampEllipse(canvas, bx, by, brx, bry, bc[0], bc[1], bc[2], rng.nextInt(40, 90), 1.2, 0.0);
  }

  // Puddle-like sheen (single large very translucent ellipse)
  if (rng.nextFloat() > 0.45) {
    const px = rng.nextInt(w >> 2, (3 * w) >> 2);
    const py = rng.nextInt(h >> 2, (3 * h) >> 2);
    stampEllipse(canvas, px, py, w * 0.28, h * 0.18, 80, 100, 130, rng.nextInt(30, 55), 1.0, 0.0);
  }

  // Mud crack lines
  const crackCount = rng.nextInt(2, 5);
  for (let i = 0; i < crackCount; i++) {
    const x1 = rng.nextInt(0, w - 1);
    const y1 = rng.nextInt(0, h - 1);
    const x2 = clamp(x1 + rng.nextInt(-6, 6), 0, w - 1);
    const y2 = clamp(y1 + rng.nextInt(-4, 4), 0, h - 1);
    drawLine(canvas, x1, y1, x2, y2, wetDark[0], wetDark[1], wetDark[2], rng.nextInt(90, 160), 1);
  }

  // Micro speckle
  const speckleCount = rng.nextInt(8, 18);
  for (let i = 0; i < speckleCount; i++) {
    const px = rng.nextInt(0, w - 1);
    const py = rng.nextInt(0, h - 1);
    const idx = (py * w + px) * 4;
    canvas.data[idx]     = wetDark[0];
    canvas.data[idx + 1] = wetDark[1];
    canvas.data[idx + 2] = wetDark[2];
    canvas.data[idx + 3] = rng.nextInt(60, 130);
  }
}

function generateGravelly(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const base = jitterColor(rng, pick(rng, GRAVELLY_BASE), 10, [120, 115, 108], [200, 195, 188]);
  const stoneDark  = shiftColor(base, -38, -36, -32);
  const stoneLight = shiftColor(base, 32, 30, 26);

  // Base fill
  fillRect(canvas, 0, 0, w, h, base[0], base[1], base[2], 255);

  // Individual gravel stones
  const stoneCount = rng.nextInt(12, 22);
  for (let i = 0; i < stoneCount; i++) {
    const sx = rng.nextInt(1, w - 2);
    const sy = rng.nextInt(1, h - 2);
    const srx = rng.nextRange(1.0, w * 0.10);
    const sry = srx * rng.nextRange(0.55, 1.0);
    const stoneBase = jitterColor(rng, base, 18);
    const sd = shiftColor(stoneBase, -28, -26, -24);
    const sl = shiftColor(stoneBase, 26, 24, 20);
    stampEllipse(canvas, sx, sy, srx, sry, stoneBase[0], stoneBase[1], stoneBase[2], 255, 2.0, 0.85);
    // Shadow lower-right edge
    stampEllipse(canvas, sx + 0.5, sy + 0.5, srx * 0.7, sry * 0.7, sd[0], sd[1], sd[2], 100, 2.0, 0.4);
    // Highlight upper-left edge
    stampEllipse(canvas, sx - 0.5, sy - 0.5, srx * 0.5, sry * 0.5, sl[0], sl[1], sl[2], 80, 2.0, 0.4);
  }

  // Fine dust / grit speckle between stones
  const speckleCount = rng.nextInt(14, 28);
  for (let i = 0; i < speckleCount; i++) {
    const px = rng.nextInt(0, w - 1);
    const py = rng.nextInt(0, h - 1);
    const sc = rng.nextFloat() > 0.5 ? stoneDark : stoneLight;
    const idx = (py * w + px) * 4;
    canvas.data[idx]     = sc[0];
    canvas.data[idx + 1] = sc[1];
    canvas.data[idx + 2] = sc[2];
    canvas.data[idx + 3] = rng.nextInt(100, 190);
  }
}

function generateLeafy(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const base = jitterColor(rng, pick(rng, LEAFY_BASE), 12, [40, 75, 25], [115, 165, 80]);
  const leafDark  = shiftColor(base, -30, -28, -15);
  const leafLight = shiftColor(base, 25, 30, 12);

  // Base fill (soil underneath)
  const soilColor: Color = [105, 82, 55];
  fillRect(canvas, 0, 0, w, h, soilColor[0], soilColor[1], soilColor[2], 255);

  // Leaf clusters – larger blobs
  const clusterCount = rng.nextInt(5, 10);
  for (let i = 0; i < clusterCount; i++) {
    const cx = rng.nextInt(0, w);
    const cy = rng.nextInt(0, h);
    const crx = rng.nextRange(w * 0.12, w * 0.28);
    const cry = rng.nextRange(h * 0.10, h * 0.24);
    const lc = jitterColor(rng, base, 14, [35, 70, 20], [125, 175, 85]);
    stampEllipse(canvas, cx, cy, crx, cry, lc[0], lc[1], lc[2], rng.nextInt(160, 230), 1.8, 0.30);
  }

  // Individual leaf silhouettes (small ellipses at angles)
  const leafCount = rng.nextInt(6, 12);
  for (let i = 0; i < leafCount; i++) {
    const lx = rng.nextInt(0, w);
    const ly = rng.nextInt(0, h);
    const lrx = rng.nextRange(1.5, w * 0.10);
    const lry = lrx * rng.nextRange(0.35, 0.65);
    const lc = rng.nextFloat() > 0.5 ? leafDark : leafLight;
    stampEllipse(canvas, lx, ly, lrx, lry, lc[0], lc[1], lc[2], rng.nextInt(150, 220), 2.0, 0.60);
  }

  // Leaf vein lines on top
  const veinCount = rng.nextInt(2, 5);
  for (let i = 0; i < veinCount; i++) {
    const vx = rng.nextInt(2, w - 3);
    const vy = rng.nextInt(2, h - 3);
    drawLine(canvas, vx, vy, vx + rng.nextInt(-4, 4), vy + rng.nextInt(-3, 3), leafDark[0], leafDark[1], leafDark[2], rng.nextInt(80, 140), 1);
  }
}

function generateTrashy(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const base = jitterColor(rng, pick(rng, TRASHY_BASE), 10, [80, 72, 62], [158, 148, 138]);
  const grimeDark  = shiftColor(base, -35, -33, -30);
  const grimeLight = shiftColor(base, 28, 26, 22);

  // Base fill (grimy asphalt/concrete)
  fillRect(canvas, 0, 0, w, h, base[0], base[1], base[2], 255);

  // Stain blobs
  const stainCount = rng.nextInt(3, 6);
  for (let i = 0; i < stainCount; i++) {
    const sx = rng.nextInt(0, w);
    const sy = rng.nextInt(0, h);
    const srx = rng.nextRange(w * 0.10, w * 0.28);
    const sry = rng.nextRange(h * 0.08, h * 0.22);
    stampEllipse(canvas, sx, sy, srx, sry, grimeDark[0], grimeDark[1], grimeDark[2], rng.nextInt(35, 75), 1.2, 0.0);
  }

  // Paper / wrapper debris shapes
  const debrisCount = rng.nextInt(3, 7);
  for (let i = 0; i < debrisCount; i++) {
    const dx = rng.nextInt(1, w - 4);
    const dy = rng.nextInt(1, h - 4);
    const dw = rng.nextInt(2, 6);
    const dh = rng.nextInt(1, 3);
    // Random debris tint (could be pale wrapper or dark wrapper)
    const debrisR = rng.nextInt(180, 240);
    const debrisG = rng.nextInt(170, 230);
    const debrisB = rng.nextInt(155, 215);
    fillRect(canvas, dx, dy, dw, dh, debrisR, debrisG, debrisB, rng.nextInt(160, 230));
  }

  // Dark grime lines (cracks / tire marks)
  const lineCount = rng.nextInt(2, 5);
  for (let i = 0; i < lineCount; i++) {
    const lx1 = rng.nextInt(0, w - 1);
    const ly1 = rng.nextInt(0, h - 1);
    const lx2 = clamp(lx1 + rng.nextInt(-8, 8), 0, w - 1);
    const ly2 = clamp(ly1 + rng.nextInt(-5, 5), 0, h - 1);
    drawLine(canvas, lx1, ly1, lx2, ly2, grimeDark[0], grimeDark[1], grimeDark[2], rng.nextInt(80, 150), 1);
  }

  // Micro speckle
  const speckleCount = rng.nextInt(10, 22);
  for (let i = 0; i < speckleCount; i++) {
    const px = rng.nextInt(0, w - 1);
    const py = rng.nextInt(0, h - 1);
    const sc = rng.nextFloat() > 0.5 ? grimeDark : grimeLight;
    const idx = (py * w + px) * 4;
    canvas.data[idx]     = sc[0];
    canvas.data[idx + 1] = sc[1];
    canvas.data[idx + 2] = sc[2];
    canvas.data[idx + 3] = rng.nextInt(90, 170);
  }

  // Edge darkening for worn / grimy look
  darkenRim(canvas, 12, 10, 8);

  // Outer border hint
  strokeRect(canvas, 0, 0, w, h, grimeDark[0], grimeDark[1], grimeDark[2], 60, 1);
}

// ----------------------------------------------------------------
// Main generator dispatcher
// ----------------------------------------------------------------

function generateGrassyDark(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const base  = jitterColor(rng, pick(rng, GRASSY_DARK_BASE), 6, [20, 60, 16], [60, 118, 50]);
  const dark  = shiftColor(base, -18, -22, -10);
  const light = shiftColor(base,  18,  24,  10);

  // Solid base fill
  fillRect(canvas, 0, 0, w, h, base[0], base[1], base[2], 255);

  // A few broad, soft patches for gentle tonal variation
  const patchCount = rng.nextInt(3, 5);
  for (let i = 0; i < patchCount; i++) {
    const px  = rng.nextInt(0, w);
    const py  = rng.nextInt(0, h);
    const prx = rng.nextRange(w * 0.20, w * 0.40);
    const pry = rng.nextRange(h * 0.18, h * 0.36);
    const pc  = rng.nextFloat() > 0.5 ? dark : light;
    stampEllipse(canvas, px, py, prx, pry, pc[0], pc[1], pc[2], rng.nextInt(28, 55), 1.2, 0.0);
  }

  // Light speckle (restrained – only a handful of pixels)
  const speckleCount = rng.nextInt(6, 14);
  for (let i = 0; i < speckleCount; i++) {
    const sx = rng.nextInt(0, w - 1);
    const sy = rng.nextInt(0, h - 1);
    const sc = rng.nextFloat() > 0.5 ? light : dark;
    const idx = (sy * w + sx) * 4;
    canvas.data[idx]     = sc[0];
    canvas.data[idx + 1] = sc[1];
    canvas.data[idx + 2] = sc[2];
    canvas.data[idx + 3] = rng.nextInt(50, 110);
  }
}

function generateGrassyLight(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const base  = jitterColor(rng, pick(rng, GRASSY_LIGHT_BASE), 8, [50, 110, 30], [118, 185, 80]);
  const dark  = shiftColor(base, -20, -26, -12);
  const light = shiftColor(base,  20,  28,  14);

  // Solid base fill
  fillRect(canvas, 0, 0, w, h, base[0], base[1], base[2], 255);

  // Broad soft patches
  const patchCount = rng.nextInt(3, 5);
  for (let i = 0; i < patchCount; i++) {
    const px  = rng.nextInt(0, w);
    const py  = rng.nextInt(0, h);
    const prx = rng.nextRange(w * 0.18, w * 0.38);
    const pry = rng.nextRange(h * 0.16, h * 0.34);
    const pc  = rng.nextFloat() > 0.5 ? dark : light;
    stampEllipse(canvas, px, py, prx, pry, pc[0], pc[1], pc[2], rng.nextInt(25, 50), 1.2, 0.0);
  }

  // Very light speckling
  const speckleCount = rng.nextInt(6, 14);
  for (let i = 0; i < speckleCount; i++) {
    const sx = rng.nextInt(0, w - 1);
    const sy = rng.nextInt(0, h - 1);
    const sc = rng.nextFloat() > 0.6 ? light : dark;
    const idx = (sy * w + sx) * 4;
    canvas.data[idx]     = sc[0];
    canvas.data[idx + 1] = sc[1];
    canvas.data[idx + 2] = sc[2];
    canvas.data[idx + 3] = rng.nextInt(45, 100);
  }
}

function generateGroundSprite(
  canvas: Canvas,
  w: number,
  h: number,
  rng: Rng,
  archetype: GroundArchetype,
): void {
  switch (archetype) {
    case GroundArchetype.SANDY:        generateSandy(canvas, w, h, rng);        break;
    case GroundArchetype.CHUNKY:       generateChunky(canvas, w, h, rng);       break;
    case GroundArchetype.WOODY:        generateWoody(canvas, w, h, rng);        break;
    case GroundArchetype.MUDDY:        generateMuddy(canvas, w, h, rng);        break;
    case GroundArchetype.GRAVELLY:     generateGravelly(canvas, w, h, rng);     break;
    case GroundArchetype.LEAFY:        generateLeafy(canvas, w, h, rng);        break;
    case GroundArchetype.TRASHY:       generateTrashy(canvas, w, h, rng);       break;
    case GroundArchetype.GRASSY_DARK:  generateGrassyDark(canvas, w, h, rng);  break;
    case GroundArchetype.GRASSY_LIGHT: generateGrassyLight(canvas, w, h, rng); break;
  }
}

export function generateGroundTile(
  seed: number,
  size = 16,
): { canvas: Canvas; archetype: GroundArchetype } {
  const archetype = groundArchetypeFromSeed(seed);
  const rng = new Rng(seed);
  const actualSize = clamp(size + rng.nextInt(-2, 2), 12, 24);
  const canvas = new Canvas(actualSize, actualSize);
  generateGroundSprite(canvas, actualSize, actualSize, rng, archetype);
  return { canvas, archetype };
}
