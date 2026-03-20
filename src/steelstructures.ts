/** Procedural steel structure sprite generation. */
import {
  clamp,
  clampChannel,
  darkenRim,
  drawLine,
  fillRect,
  strokeRect,
  stampEllipse,
} from './primitives.js';
import { Rng } from './rng.js';
import { Canvas, type Color } from './types.js';

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

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

export enum SteelStructureArchetype {
  GIRDER    = 'girder',
  SCAFFOLD  = 'scaffold',
  FRAME     = 'frame',
  I_BEAM    = 'i-beam',
}

function archetypeFromSeed(seed: number): SteelStructureArchetype {
  const r = (seed >>> 0) % 4;
  if (r === 0) return SteelStructureArchetype.GIRDER;
  if (r === 1) return SteelStructureArchetype.SCAFFOLD;
  if (r === 2) return SteelStructureArchetype.FRAME;
  return SteelStructureArchetype.I_BEAM;
}

// ----------------------------------------------------------------
// Palettes
// ----------------------------------------------------------------

const STEEL_COLORS: Color[] = [
  [140, 145, 152],
  [120, 125, 132],
  [105, 110, 118],
  [155, 158, 162],
  [90,  95, 102],
];

const RUST_COLORS: Color[] = [
  [155, 85,  40],
  [140, 72,  30],
  [165, 95,  45],
];

// ----------------------------------------------------------------
// GIRDER – horizontal H-beam
// ----------------------------------------------------------------

function generateGirder(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const steelIdx = rng.nextInt(0, STEEL_COLORS.length - 1);
  const base  = STEEL_COLORS[steelIdx];
  const dark  = shiftColor(base, -35, -35, -32);
  const light = shiftColor(base,  32,  32,  30);

  const flangeH = Math.max(3, Math.round(h * 0.22));
  const webH    = h - flangeH * 2;
  const webX    = Math.round(w * 0.10);
  const webW    = w - webX * 2;

  // Top flange
  fillRect(canvas, 0, 0, w, flangeH,
    base[0], base[1], base[2], 255);
  fillRect(canvas, 0, 0, w, 1,
    light[0], light[1], light[2], 180);
  fillRect(canvas, 0, flangeH - 1, w, 1,
    dark[0], dark[1], dark[2], 150);

  // Bottom flange
  fillRect(canvas, 0, h - flangeH, w, flangeH,
    base[0], base[1], base[2], 255);
  fillRect(canvas, 0, h - 1, w, 1,
    dark[0], dark[1], dark[2], 180);
  fillRect(canvas, 0, h - flangeH, w, 1,
    light[0], light[1], light[2], 120);

  // Web
  if (webH > 0) {
    fillRect(canvas, webX, flangeH, webW, webH,
      shiftColor(base, -12, -12, -10)[0],
      shiftColor(base, -12, -12, -10)[1],
      shiftColor(base, -12, -12, -10)[2], 255);
    // Left shadow on web
    fillRect(canvas, webX, flangeH, 1, webH, dark[0], dark[1], dark[2], 140);
    // Right highlight
    fillRect(canvas, webX + webW - 1, flangeH, 1, webH,
      light[0], light[1], light[2], 100);
  }

  // Optional rust patches
  if (rng.nextFloat() > 0.55) {
    const rust = RUST_COLORS[rng.nextInt(0, RUST_COLORS.length - 1)];
    const rpx = rng.nextInt(2, w - 6);
    const rpy = rng.nextInt(1, h - 2);
    stampEllipse(canvas, rpx, rpy, rng.nextRange(1.5, 3.5), rng.nextRange(1.0, 2.5),
      rust[0], rust[1], rust[2], rng.nextInt(100, 160), 2.0, 0.1);
  }

  darkenRim(canvas, 18, 18, 16);
}

// ----------------------------------------------------------------
// SCAFFOLD – vertical scaffolding frame
// ----------------------------------------------------------------

function generateScaffold(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const base  = STEEL_COLORS[rng.nextInt(0, STEEL_COLORS.length - 1)];
  const dark  = shiftColor(base, -40, -40, -38);
  const light = shiftColor(base,  35,  35,  33);

  const poleW = Math.max(2, Math.round(w * 0.14));
  const poleX1 = Math.round(w * 0.10);
  const poleX2 = w - poleX1 - poleW;

  // Left vertical pole
  fillRect(canvas, poleX1, 0, poleW, h, base[0], base[1], base[2], 255);
  fillRect(canvas, poleX1, 0, 1, h, light[0], light[1], light[2], 140);
  fillRect(canvas, poleX1 + poleW - 1, 0, 1, h, dark[0], dark[1], dark[2], 140);

  // Right vertical pole
  fillRect(canvas, poleX2, 0, poleW, h, base[0], base[1], base[2], 255);
  fillRect(canvas, poleX2, 0, 1, h, light[0], light[1], light[2], 140);
  fillRect(canvas, poleX2 + poleW - 1, 0, 1, h, dark[0], dark[1], dark[2], 140);

  // Horizontal cross-bars
  const barCount = rng.nextInt(2, 4);
  for (let i = 0; i <= barCount; i++) {
    const by = Math.round(i * (h - 2) / barCount);
    fillRect(canvas, poleX1 + poleW, by, poleX2 - poleX1 - poleW, 2,
      base[0], base[1], base[2], 255);
    fillRect(canvas, poleX1 + poleW, by, poleX2 - poleX1 - poleW, 1,
      light[0], light[1], light[2], 100);
  }

  // Diagonal bracing
  const diagStartX = poleX1 + poleW;
  const diagEndX   = poleX2;
  for (let i = 0; i < barCount; i++) {
    const y0 = Math.round(i * (h - 2) / barCount);
    const y1 = Math.round((i + 1) * (h - 2) / barCount);
    if (i % 2 === 0) {
      drawLine(canvas, diagStartX, y0, diagEndX, y1,
        dark[0], dark[1], dark[2], 180, 1);
    } else {
      drawLine(canvas, diagEndX, y0, diagStartX, y1,
        dark[0], dark[1], dark[2], 180, 1);
    }
  }

  darkenRim(canvas, 18, 18, 16);
}

// ----------------------------------------------------------------
// FRAME – structural steel frame / window frame
// ----------------------------------------------------------------

function generateFrame(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const base  = STEEL_COLORS[rng.nextInt(0, STEEL_COLORS.length - 1)];
  const dark  = shiftColor(base, -38, -38, -36);
  const light = shiftColor(base,  32,  32,  30);

  const memberW = Math.max(2, Math.round(Math.min(w, h) * 0.14));

  // Outer frame
  fillRect(canvas, 0, 0, w, memberW, base[0], base[1], base[2], 255);
  fillRect(canvas, 0, h - memberW, w, memberW, base[0], base[1], base[2], 255);
  fillRect(canvas, 0, memberW, memberW, h - memberW * 2, base[0], base[1], base[2], 255);
  fillRect(canvas, w - memberW, memberW, memberW, h - memberW * 2, base[0], base[1], base[2], 255);

  // Highlights
  fillRect(canvas, 0, 0, w, 1, light[0], light[1], light[2], 160);
  fillRect(canvas, 0, 0, 1, h, light[0], light[1], light[2], 130);

  // Shadows
  fillRect(canvas, 0, h - 1, w, 1, dark[0], dark[1], dark[2], 160);
  fillRect(canvas, w - 1, 0, 1, h, dark[0], dark[1], dark[2], 130);

  // Cross members
  const crossX = Math.round(w / 2) - Math.round(memberW / 2);
  const crossY = Math.round(h / 2) - Math.round(memberW / 2);
  if (rng.nextFloat() > 0.4) {
    fillRect(canvas, crossX, memberW, memberW, h - memberW * 2,
      base[0], base[1], base[2], 255);
    fillRect(canvas, crossX, memberW, 1, h - memberW * 2,
      light[0], light[1], light[2], 100);
  }
  if (rng.nextFloat() > 0.4) {
    fillRect(canvas, memberW, crossY, w - memberW * 2, memberW,
      base[0], base[1], base[2], 255);
    fillRect(canvas, memberW, crossY, w - memberW * 2, 1,
      light[0], light[1], light[2], 100);
  }

  // Corner gussets (small dark squares)
  fillRect(canvas, 0, 0, memberW + 1, memberW + 1,
    shiftColor(base, -10, -10, -8)[0],
    shiftColor(base, -10, -10, -8)[1],
    shiftColor(base, -10, -10, -8)[2], 230);
  fillRect(canvas, w - memberW - 1, 0, memberW + 1, memberW + 1,
    shiftColor(base, -10, -10, -8)[0],
    shiftColor(base, -10, -10, -8)[1],
    shiftColor(base, -10, -10, -8)[2], 230);
  fillRect(canvas, 0, h - memberW - 1, memberW + 1, memberW + 1,
    shiftColor(base, -10, -10, -8)[0],
    shiftColor(base, -10, -10, -8)[1],
    shiftColor(base, -10, -10, -8)[2], 230);
  fillRect(canvas, w - memberW - 1, h - memberW - 1, memberW + 1, memberW + 1,
    shiftColor(base, -10, -10, -8)[0],
    shiftColor(base, -10, -10, -8)[1],
    shiftColor(base, -10, -10, -8)[2], 230);

  darkenRim(canvas, 18, 18, 16);
}

// ----------------------------------------------------------------
// I_BEAM – vertical I-beam / column
// ----------------------------------------------------------------

function generateIBeam(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const base  = STEEL_COLORS[rng.nextInt(0, STEEL_COLORS.length - 1)];
  const dark  = shiftColor(base, -38, -38, -36);
  const light = shiftColor(base,  32,  32,  30);

  const flangeW = Math.max(4, Math.round(w * 0.80));
  const flangeH = Math.max(2, Math.round(h * 0.14));
  const webW    = Math.max(2, Math.round(w * 0.25));
  const fx      = Math.round((w - flangeW) / 2);
  const wx      = Math.round((w - webW) / 2);
  const webH    = h - flangeH * 2;

  // Top flange
  fillRect(canvas, fx, 0, flangeW, flangeH,
    base[0], base[1], base[2], 255);
  fillRect(canvas, fx, 0, flangeW, 1,
    light[0], light[1], light[2], 160);
  fillRect(canvas, fx, flangeH - 1, flangeW, 1,
    dark[0], dark[1], dark[2], 140);

  // Bottom flange
  fillRect(canvas, fx, h - flangeH, flangeW, flangeH,
    base[0], base[1], base[2], 255);
  fillRect(canvas, fx, h - 1, flangeW, 1,
    dark[0], dark[1], dark[2], 160);
  fillRect(canvas, fx, h - flangeH, flangeW, 1,
    light[0], light[1], light[2], 110);

  // Web
  if (webH > 0) {
    const webBody = shiftColor(base, -14, -14, -12);
    fillRect(canvas, wx, flangeH, webW, webH,
      webBody[0], webBody[1], webBody[2], 255);
    fillRect(canvas, wx, flangeH, 1, webH, dark[0], dark[1], dark[2], 130);
    fillRect(canvas, wx + webW - 1, flangeH, 1, webH,
      light[0], light[1], light[2], 90);
  }

  // Optional weld bead dots
  const weldCount = rng.nextInt(1, 3);
  for (let i = 0; i < weldCount; i++) {
    const wy = flangeH + Math.round((i + 0.5) * webH / weldCount);
    stampEllipse(canvas, wx, wy, 1.5, 1.5,
      dark[0], dark[1], dark[2], 180, 1.5, 0.5);
    stampEllipse(canvas, wx + webW - 1, wy, 1.5, 1.5,
      dark[0], dark[1], dark[2], 180, 1.5, 0.5);
  }

  // Optional rust
  if (rng.nextFloat() > 0.6) {
    const rust = RUST_COLORS[rng.nextInt(0, RUST_COLORS.length - 1)];
    stampEllipse(canvas, wx + Math.round(webW / 2),
      flangeH + rng.nextInt(2, Math.max(3, webH - 2)),
      rng.nextRange(1.5, 3.0), rng.nextRange(1.0, 2.0),
      rust[0], rust[1], rust[2], rng.nextInt(90, 150), 2.0, 0.1);
  }

  darkenRim(canvas, 18, 18, 16);
}

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

export interface SteelStructureResult {
  canvas: Canvas;
  archetype: SteelStructureArchetype;
}

export function generateSteelStructure(
  seed: number,
  size = 20,
  archetype?: SteelStructureArchetype,
): SteelStructureResult {
  archetype = archetype ?? archetypeFromSeed(seed);
  const rng = new Rng(seed);
  const actualSize = clamp(size + rng.nextInt(-2, 2), 14, 28);
  const canvas = new Canvas(actualSize, actualSize);

  switch (archetype) {
    case SteelStructureArchetype.GIRDER:   generateGirder(canvas, actualSize, actualSize, rng);   break;
    case SteelStructureArchetype.SCAFFOLD: generateScaffold(canvas, actualSize, actualSize, rng); break;
    case SteelStructureArchetype.FRAME:    generateFrame(canvas, actualSize, actualSize, rng);    break;
    case SteelStructureArchetype.I_BEAM:   generateIBeam(canvas, actualSize, actualSize, rng);    break;
  }

  return { canvas, archetype };
}
