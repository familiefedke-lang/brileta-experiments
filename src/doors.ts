/** Procedural door sprite generation. */
import {
  clamp,
  clampChannel,
  darkenRim,
  fillRect,
  stampEllipse,
  strokeRect,
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

export enum DoorArchetype {
  WOODEN     = 'wooden',
  METAL      = 'metal',
  REINFORCED = 'reinforced',
  ARCH       = 'arch',
}

function archetypeFromSeed(seed: number): DoorArchetype {
  const r = (seed >>> 0) % 4;
  if (r === 0) return DoorArchetype.WOODEN;
  if (r === 1) return DoorArchetype.METAL;
  if (r === 2) return DoorArchetype.REINFORCED;
  return DoorArchetype.ARCH;
}

// ----------------------------------------------------------------
// Palettes
// ----------------------------------------------------------------

const WOOD_COLORS: Color[] = [
  [140, 90, 48],
  [120, 78, 38],
  [160, 105, 55],
  [100, 65, 30],
  [175, 125, 70],
];

const METAL_COLORS: Color[] = [
  [130, 135, 140],
  [100, 110, 120],
  [80,  85,  90],
  [150, 148, 145],
];

const ACCENT_COLORS: RGBA[] = [
  [200, 180, 60,  220],
  [180, 140, 50,  220],
  [190, 160, 55,  220],
];

// ----------------------------------------------------------------
// WOODEN door
// ----------------------------------------------------------------

function generateWoodenDoor(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const baseColor = pick(rng, WOOD_COLORS);
  const dark  = shiftColor(baseColor, -35, -25, -15);
  const light = shiftColor(baseColor,  30,  22,  12);
  const grainColor: Color = [
    clampChannel(baseColor[0] - 18),
    clampChannel(baseColor[1] - 12),
    clampChannel(baseColor[2] - 8),
  ];

  const frame = 2;
  // Door body
  fillRect(canvas, frame, frame, w - frame * 2, h - frame * 2,
    baseColor[0], baseColor[1], baseColor[2], 255);

  // Vertical wood grain lines
  const grainCount = rng.nextInt(3, 6);
  for (let i = 0; i < grainCount; i++) {
    const gx = frame + 1 + Math.round(i * (w - frame * 2 - 2) / grainCount);
    fillRect(canvas, gx, frame + 1, 1, h - frame * 2 - 2,
      grainColor[0], grainColor[1], grainColor[2], rng.nextInt(60, 110));
  }

  // Door frame border
  strokeRect(canvas, frame, frame, w - frame * 2, h - frame * 2,
    dark[0], dark[1], dark[2], 200, 1);

  // Recessed panel(s)
  const panelCount = rng.nextInt(1, 2);
  const panelH = Math.round((h - frame * 2 - 6) / panelCount) - 2;
  for (let p = 0; p < panelCount; p++) {
    const panelX = frame + 3;
    const panelY = frame + 3 + p * (panelH + 2);
    const panelW = w - frame * 2 - 6;
    if (panelH < 4 || panelW < 4) continue;
    fillRect(canvas, panelX, panelY, panelW, panelH,
      dark[0], dark[1], dark[2], 60);
    strokeRect(canvas, panelX, panelY, panelW, panelH,
      dark[0], dark[1], dark[2], 180, 1);
    fillRect(canvas, panelX, panelY, panelW, 1,
      light[0], light[1], light[2], 100);
  }

  // Door handle (knob)
  const handleX = w - frame - 4;
  const handleY = Math.round(h * 0.52);
  const accent = pick(rng, ACCENT_COLORS);
  stampEllipse(canvas, handleX, handleY, 2.0, 2.0,
    accent[0], accent[1], accent[2], accent[3], 1.8, 0.6);

  darkenRim(canvas, 20, 15, 10);
}

// ----------------------------------------------------------------
// METAL door
// ----------------------------------------------------------------

function generateMetalDoor(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const baseColor = pick(rng, METAL_COLORS);
  const dark  = shiftColor(baseColor, -40, -40, -38);
  const light = shiftColor(baseColor,  35,  35,  33);

  const frame = 2;
  fillRect(canvas, frame, frame, w - frame * 2, h - frame * 2,
    baseColor[0], baseColor[1], baseColor[2], 255);

  // Highlight left edge
  fillRect(canvas, frame, frame, 1, h - frame * 2,
    light[0], light[1], light[2], 160);
  // Shadow right edge
  fillRect(canvas, w - frame - 1, frame, 1, h - frame * 2,
    dark[0], dark[1], dark[2], 160);
  // Top highlight
  fillRect(canvas, frame, frame, w - frame * 2, 1,
    light[0], light[1], light[2], 120);
  // Bottom shadow
  fillRect(canvas, frame, h - frame - 1, w - frame * 2, 1,
    dark[0], dark[1], dark[2], 120);

  // Rivets / bolts at corners
  const rivetColor: RGBA = [
    clampChannel(baseColor[0] + 18),
    clampChannel(baseColor[1] + 18),
    clampChannel(baseColor[2] + 18),
    210,
  ];
  const rivetPositions = [
    [frame + 3, frame + 3],
    [w - frame - 4, frame + 3],
    [frame + 3, h - frame - 4],
    [w - frame - 4, h - frame - 4],
  ];
  for (const [rx, ry] of rivetPositions) {
    stampEllipse(canvas, rx, ry, 1.5, 1.5,
      rivetColor[0], rivetColor[1], rivetColor[2], rivetColor[3], 1.6, 0.55);
  }

  // Horizontal seam / reinforcement stripe
  const seamY = Math.round(h * 0.5);
  fillRect(canvas, frame + 1, seamY - 1, w - frame * 2 - 2, 2,
    dark[0], dark[1], dark[2], 120);

  // Handle
  const handleX = w - frame - 4;
  const handleY = Math.round(h * 0.52);
  const accent = pick(rng, ACCENT_COLORS);
  stampEllipse(canvas, handleX, handleY, 2.0, 2.0,
    accent[0], accent[1], accent[2], accent[3], 1.8, 0.6);

  strokeRect(canvas, frame, frame, w - frame * 2, h - frame * 2,
    dark[0], dark[1], dark[2], 200, 1);

  darkenRim(canvas, 22, 22, 20);
}

// ----------------------------------------------------------------
// REINFORCED door
// ----------------------------------------------------------------

function generateReinforcedDoor(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const baseColor: Color = [
    rng.nextInt(55, 85),
    rng.nextInt(55, 80),
    rng.nextInt(58, 88),
  ];
  const dark  = shiftColor(baseColor, -30, -30, -28);
  const light = shiftColor(baseColor,  28,  28,  26);
  const barColor: Color = [
    clampChannel(baseColor[0] - 18),
    clampChannel(baseColor[1] - 18),
    clampChannel(baseColor[2] - 16),
  ];

  const frame = 2;
  fillRect(canvas, frame, frame, w - frame * 2, h - frame * 2,
    baseColor[0], baseColor[1], baseColor[2], 255);

  // Horizontal reinforcement bars
  const barCount = rng.nextInt(2, 4);
  for (let i = 0; i < barCount; i++) {
    const by = frame + 2 + Math.round(i * (h - frame * 2 - 4) / (barCount));
    fillRect(canvas, frame + 1, by, w - frame * 2 - 2, 3,
      barColor[0], barColor[1], barColor[2], 220);
    fillRect(canvas, frame + 1, by, w - frame * 2 - 2, 1,
      light[0], light[1], light[2], 80);
  }

  // Vertical center bar
  const midX = Math.round(w / 2);
  fillRect(canvas, midX - 1, frame + 1, 2, h - frame * 2 - 2,
    barColor[0], barColor[1], barColor[2], 200);

  // Heavy rivets
  const rivetPositions = [
    [frame + 3,     frame + 3],
    [w - frame - 4, frame + 3],
    [frame + 3,     h - frame - 4],
    [w - frame - 4, h - frame - 4],
    [midX,          frame + 3],
    [midX,          h - frame - 4],
  ];
  const rivetColor: RGBA = [
    clampChannel(baseColor[0] + 22),
    clampChannel(baseColor[1] + 22),
    clampChannel(baseColor[2] + 20),
    220,
  ];
  for (const [rx, ry] of rivetPositions) {
    stampEllipse(canvas, rx, ry, 2.0, 2.0,
      rivetColor[0], rivetColor[1], rivetColor[2], rivetColor[3], 1.8, 0.7);
  }

  strokeRect(canvas, frame, frame, w - frame * 2, h - frame * 2,
    dark[0], dark[1], dark[2], 200, 1);

  darkenRim(canvas, 22, 22, 20);
}

// ----------------------------------------------------------------
// ARCH door
// ----------------------------------------------------------------

function generateArchDoor(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const baseColor = pick(rng, WOOD_COLORS);
  const dark  = shiftColor(baseColor, -35, -25, -15);
  const light = shiftColor(baseColor,  30,  22,  12);
  const grainColor: Color = [
    clampChannel(baseColor[0] - 16),
    clampChannel(baseColor[1] - 10),
    clampChannel(baseColor[2] - 6),
  ];

  const cx = Math.round(w / 2);
  const archRadius = Math.round(w * 0.42);
  const archCy = Math.round(h * 0.36);
  const bodyTop = archCy;
  const bodyH = h - bodyTop - 2;

  // Draw arch body as a series of horizontal spans inside the arch ellipse
  for (let row = 2; row < archCy; row++) {
    const dy = (row - archCy) / archRadius;
    if (dy * dy >= 1) continue;
    const halfW = Math.round(archRadius * Math.sqrt(Math.max(0, 1 - dy * dy)));
    const x0 = clamp(cx - halfW, 2, w - 3);
    const x1 = clamp(cx + halfW, 2, w - 3);
    if (x1 <= x0) continue;
    fillRect(canvas, x0, row, x1 - x0 + 1, 1,
      baseColor[0], baseColor[1], baseColor[2], 255);
  }

  // Door rectangular body below the arch
  if (bodyH > 1) {
    fillRect(canvas, 2, bodyTop, w - 4, bodyH,
      baseColor[0], baseColor[1], baseColor[2], 255);
  }

  // Grain lines
  const grainCount = rng.nextInt(3, 5);
  for (let i = 0; i < grainCount; i++) {
    const gx = 3 + Math.round(i * (w - 7) / grainCount);
    fillRect(canvas, gx, bodyTop, 1, bodyH,
      grainColor[0], grainColor[1], grainColor[2], rng.nextInt(55, 100));
  }

  // Arch outline
  for (let row = 1; row < archCy + 1; row++) {
    const dy = (row - archCy) / archRadius;
    if (dy * dy >= 1) continue;
    const halfW = Math.round(archRadius * Math.sqrt(Math.max(0, 1 - dy * dy)));
    const x0 = clamp(cx - halfW, 1, w - 2);
    const x1 = clamp(cx + halfW, 1, w - 2);
    canvas.setPixel(x0, row, dark[0], dark[1], dark[2], 200);
    canvas.setPixel(x1, row, dark[0], dark[1], dark[2], 200);
  }

  // Top highlight on arch
  for (let row = 2; row < archCy; row++) {
    const dy = (row - archCy) / archRadius;
    if (dy * dy >= 1) continue;
    const halfW = Math.round(archRadius * Math.sqrt(Math.max(0, 1 - dy * dy)));
    const x0 = clamp(cx - halfW + 1, 2, w - 3);
    canvas.setPixel(x0, row, light[0], light[1], light[2], 100);
  }

  // Side borders of body
  if (bodyH > 1) {
    fillRect(canvas, 2, bodyTop, 1, bodyH, dark[0], dark[1], dark[2], 180);
    fillRect(canvas, w - 3, bodyTop, 1, bodyH, dark[0], dark[1], dark[2], 180);
    fillRect(canvas, 2, bodyTop + bodyH - 1, w - 4, 1, dark[0], dark[1], dark[2], 180);
  }

  // Door knob
  const accent = pick(rng, ACCENT_COLORS);
  stampEllipse(canvas, w - 5, Math.round(h * 0.6), 2.0, 2.0,
    accent[0], accent[1], accent[2], accent[3], 1.8, 0.6);

  darkenRim(canvas, 20, 15, 10);
}

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

export interface DoorResult {
  canvas: Canvas;
  archetype: DoorArchetype;
}

export function generateDoor(
  seed: number,
  size = 20,
  archetype?: DoorArchetype,
): DoorResult {
  archetype = archetype ?? archetypeFromSeed(seed);
  const rng = new Rng(seed);
  const w = clamp(size + rng.nextInt(-2, 2), 14, 26);
  const h = clamp(Math.round(size * 1.5) + rng.nextInt(-2, 2), 20, 36);
  const canvas = new Canvas(w, h);

  switch (archetype) {
    case DoorArchetype.WOODEN:     generateWoodenDoor(canvas, w, h, rng);     break;
    case DoorArchetype.METAL:      generateMetalDoor(canvas, w, h, rng);      break;
    case DoorArchetype.REINFORCED: generateReinforcedDoor(canvas, w, h, rng); break;
    case DoorArchetype.ARCH:       generateArchDoor(canvas, w, h, rng);       break;
  }

  return { canvas, archetype };
}
