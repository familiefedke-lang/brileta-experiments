/** Procedural house rooftop and wall-surface sprite generation. */
import {
  clamp,
  clampChannel,
  darkenRim,
  drawLine,
  fillParallelogram,
  fillRect,
  fillTriangle,
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
// Rooftop
// ================================================================

/**
 * Rooftop sprite archetypes, rendered from a top-down perspective.
 * - GABLED  : two rectangular slopes divided by a central ridge.
 * - HIP     : four triangular/trapezoidal panels converging to a ridge.
 * - FLAT    : flat surface with raised parapet border.
 */
export enum RooftopArchetype {
  GABLED = 'gabled',
  HIP    = 'hip',
  FLAT   = 'flat',
}

function rooftopArchetypeFromSeed(seed: number): RooftopArchetype {
  const r = (seed >>> 0) % 3;
  if (r === 0) return RooftopArchetype.GABLED;
  if (r === 1) return RooftopArchetype.HIP;
  return RooftopArchetype.FLAT;
}

const ROOF_PALETTES: Color[] = [
  [165,  75,  55],  // terracotta
  [140,  90,  60],  // brown shingle
  [110, 105,  95],  // grey slate
  [ 85,  80,  75],  // dark slate
  [180, 160,  90],  // thatch / straw
  [130,  70,  50],  // dark terracotta
  [155, 140, 120],  // light stone
  [100,  90, 100],  // blue-grey
];

function generateRooftopSprite(
  canvas: Canvas,
  w: number,
  h: number,
  rng: Rng,
  archetype: RooftopArchetype,
): void {
  const roofBase      = jitterColor(rng, pick(rng, ROOF_PALETTES), 12, [50, 40, 30], [210, 195, 155]);
  const roofLight     = shiftColor(roofBase,  28,  22,  16);
  const roofShadow    = shiftColor(roofBase, -32, -26, -18);
  const roofDark      = shiftColor(roofBase, -18, -14, -10);
  const roofRidge     = shiftColor(roofBase,  -8,  -6,  -4);
  const shingleScore  = shiftColor(roofBase, -14, -11,  -8);

  if (archetype === RooftopArchetype.GABLED) {
    // Two rectangular panels split by a horizontal ridge running left-to-right.
    // Upper panel = front slope (faces viewer → lighter).
    // Lower panel = rear slope (faces away  → darker).
    const ridgeY   = Math.round(h * rng.nextRange(0.42, 0.54));
    const eaveInset = Math.max(1, Math.round(w * 0.04));

    fillRect(canvas, 0,       0,      w,           ridgeY + 1, roofLight[0],  roofLight[1],  roofLight[2],  255);
    fillRect(canvas, 0,       ridgeY, w,           h - ridgeY, roofShadow[0], roofShadow[1], roofShadow[2], 255);

    // Ridge line
    fillRect(canvas, eaveInset, ridgeY, w - eaveInset * 2, 1, roofRidge[0], roofRidge[1], roofRidge[2], 255);

    // Eave border
    strokeRect(canvas, 0, 0, w, h, roofDark[0], roofDark[1], roofDark[2], 220, 1);

    // Horizontal shingle score lines on front slope
    const frontRows = Math.max(2, Math.round(ridgeY / Math.max(2, Math.round(h * 0.12))));
    for (let i = 1; i < frontRows; i++) {
      const sy = Math.round(i * ridgeY / frontRows);
      fillRect(canvas, 1, sy, w - 2, 1, shingleScore[0], shingleScore[1], shingleScore[2], 100);
    }

    // Shingle score lines on back slope
    const backShingleScore = shiftColor(roofShadow, 10, 8, 6);
    const backRows = Math.max(2, Math.round((h - ridgeY) / Math.max(2, Math.round(h * 0.12))));
    for (let i = 1; i < backRows; i++) {
      const sy = ridgeY + Math.round(i * (h - ridgeY) / backRows);
      fillRect(canvas, 1, sy, w - 2, 1, backShingleScore[0], backShingleScore[1], backShingleScore[2], 90);
    }

  } else if (archetype === RooftopArchetype.HIP) {
    // Four panels meet at a horizontal center ridge.
    // Ridge runs roughly one-third of the width on either side of center.
    const ridgeY  = Math.round(h * rng.nextRange(0.42, 0.54));
    const ridgeHalf = Math.round(w * rng.nextRange(0.22, 0.34));
    const rx0 = Math.round(w / 2) - ridgeHalf;
    const rx1 = Math.round(w / 2) + ridgeHalf;

    // Front panel (top trapezoid, lighter)
    fillTriangle(canvas,   0,  0,    w,    0, rx1, ridgeY, roofLight[0],  roofLight[1],  roofLight[2],  255);
    fillTriangle(canvas,   0,  0, rx0, ridgeY, rx1, ridgeY, roofLight[0],  roofLight[1],  roofLight[2],  255);

    // Back panel (bottom trapezoid, darker)
    fillTriangle(canvas,   0,  h,    w,    h, rx1, ridgeY, roofShadow[0], roofShadow[1], roofShadow[2], 255);
    fillTriangle(canvas,   0,  h, rx0, ridgeY, rx1, ridgeY, roofShadow[0], roofShadow[1], roofShadow[2], 255);

    // Left end triangle (mid tone)
    fillTriangle(canvas,   0,  0,    0,    h, rx0, ridgeY, roofBase[0],   roofBase[1],   roofBase[2],   255);

    // Right end triangle (slightly darker mid tone, shadow side)
    fillTriangle(canvas,   w,  0,    w,    h, rx1, ridgeY, roofDark[0],   roofDark[1],   roofDark[2],   255);

    // Ridge line
    drawLine(canvas, rx0, ridgeY, rx1, ridgeY,
      roofRidge[0], roofRidge[1], roofRidge[2], 255, 1);

    // Eave border
    strokeRect(canvas, 0, 0, w, h, roofDark[0], roofDark[1], roofDark[2], 180, 1);

    // Shingle score lines on front panel
    const hipRows = Math.max(2, Math.round(ridgeY / Math.max(2, Math.round(h * 0.13))));
    for (let i = 1; i < hipRows; i++) {
      const sy = Math.round(i * ridgeY / hipRows);
      // Interpolated x bounds from the trapezoidal front panel
      const t   = i / hipRows;
      const lx  = Math.max(1, Math.round(rx0 * t));
      const rx  = Math.min(w - 2, Math.round(w - (w - rx1) * t));
      fillRect(canvas, lx, sy, rx - lx, 1, shingleScore[0], shingleScore[1], shingleScore[2], 90);
    }

  } else {
    // FLAT roof: rectangle with raised parapet on all sides and a drain dot.
    const parapetW  = Math.max(2, Math.round(w * 0.11));
    const parapetH  = Math.max(2, Math.round(h * 0.14));
    const parapetTop  = shiftColor(roofBase, 12,  9,  6);
    const parapetBot  = shiftColor(roofBase, -22, -17, -12);
    const parapetSide = shiftColor(roofBase,   6,  5,  3);

    // Main roof field
    fillRect(canvas, 0, 0, w, h, roofBase[0], roofBase[1], roofBase[2], 255);

    // Recessed inner surface
    const innerX = parapetW;
    const innerY = parapetH;
    const innerW = w - parapetW * 2;
    const innerH = h - parapetH * 2;
    if (innerW > 2 && innerH > 2) {
      const surfaceColor = shiftColor(roofBase, -10, -8, -5);
      fillRect(canvas, innerX, innerY, innerW, innerH,
        surfaceColor[0], surfaceColor[1], surfaceColor[2], 255);
    }

    // Parapet faces: top (bright), bottom (shadow), sides
    fillRect(canvas, 0,           0,           w,         parapetH, parapetTop[0],  parapetTop[1],  parapetTop[2],  255);
    fillRect(canvas, 0,           h - parapetH, w,        parapetH, parapetBot[0],  parapetBot[1],  parapetBot[2],  255);
    fillRect(canvas, 0,           parapetH,    parapetW,  h - parapetH * 2, parapetSide[0], parapetSide[1], parapetSide[2], 255);
    fillRect(canvas, w - parapetW, parapetH,   parapetW,  h - parapetH * 2, parapetBot[0],  parapetBot[1],  parapetBot[2],  255);

    // Highlight top edge of top parapet
    fillRect(canvas, 0, 0, w, 1,
      shiftColor(parapetTop, 20, 16, 10)[0],
      shiftColor(parapetTop, 20, 16, 10)[1],
      shiftColor(parapetTop, 20, 16, 10)[2], 220);

    // Roof drain (center ellipse)
    if (innerW > 4 && innerH > 4) {
      const drainX = Math.round(w * 0.5);
      const drainY = Math.round(h * 0.5);
      stampEllipse(canvas, drainX, drainY, w * 0.065, h * 0.065,
        shiftColor(roofBase, -28, -22, -16)[0],
        shiftColor(roofBase, -28, -22, -16)[1],
        shiftColor(roofBase, -28, -22, -16)[2], 210, 2.0, 0.85);
    }
  }
}

export function generateRooftop(
  seed: number,
  size = 24,
): { canvas: Canvas; archetype: RooftopArchetype } {
  const archetype = rooftopArchetypeFromSeed(seed);
  const rng = new Rng(seed);
  const w = clamp(size + rng.nextInt(-2, 4), 18, 34);
  const h = clamp(Math.round(size * 0.58) + rng.nextInt(-2, 2), 12, 22);
  const canvas = new Canvas(w, h);
  generateRooftopSprite(canvas, w, h, rng, archetype);
  return { canvas, archetype };
}

// ================================================================
// House Surface
// ================================================================

/**
 * House wall surface archetypes, rendered as a front-facing swatch.
 * - BRICK   : staggered brick courses with mortar joints.
 * - STONE   : irregular fitted stone blocks with mortar gaps.
 * - PLASTER : smooth plastered wall with subtle cracks and patches.
 */
export enum HouseSurfaceArchetype {
  BRICK   = 'brick',
  STONE   = 'stone',
  PLASTER = 'plaster',
}

function houseSurfaceArchetypeFromSeed(seed: number): HouseSurfaceArchetype {
  const r = (seed >>> 0) % 3;
  if (r === 0) return HouseSurfaceArchetype.BRICK;
  if (r === 1) return HouseSurfaceArchetype.STONE;
  return HouseSurfaceArchetype.PLASTER;
}

const BRICK_PALETTES: Color[] = [
  [190,  90,  60],  // classic red
  [175, 110,  70],  // brown brick
  [210, 140,  90],  // buff / light brick
  [155,  75,  50],  // dark red
  [185, 155, 100],  // sandstone
  [160,  85,  55],  // warm red
];

const STONE_WALL_PALETTES: Color[] = [
  [150, 145, 135],  // mid grey
  [130, 120, 108],  // dark grey
  [170, 162, 148],  // light grey
  [155, 148, 125],  // warm grey
  [120, 115, 100],  // dark warm
  [140, 135, 118],  // sandstone grey
];

const PLASTER_PALETTES: Color[] = [
  [220, 210, 185],  // cream
  [235, 225, 200],  // white
  [200, 190, 165],  // aged
  [215, 205, 175],  // warm white
  [195, 185, 160],  // beige
  [225, 215, 190],  // pale yellow
];

function generateHouseSurfaceSprite(
  canvas: Canvas,
  w: number,
  h: number,
  rng: Rng,
  archetype: HouseSurfaceArchetype,
): void {
  if (archetype === HouseSurfaceArchetype.BRICK) {
    const brickBase    = jitterColor(rng, pick(rng, BRICK_PALETTES), 12, [100, 50, 30], [235, 175, 125]);
    const mortarColor: Color = [
      clamp(brickBase[0] - 55, 105, 185),
      clamp(brickBase[1] - 35, 100, 175),
      clamp(brickBase[2] - 20, 88, 162),
    ];
    const brickShadow  = shiftColor(brickBase, -30, -24, -18);

    // Mortar background
    fillRect(canvas, 0, 0, w, h, mortarColor[0], mortarColor[1], mortarColor[2], 255);

    const brickH  = Math.max(3, Math.round(h * 0.18));
    const brickW  = Math.max(6, Math.round(w * 0.28));
    const mortarT = 1;
    const stride  = brickH + mortarT;
    const rows    = Math.ceil(h / stride) + 1;

    for (let row = 0; row < rows; row++) {
      const ry     = row * stride;
      const offset = (row % 2) * Math.round(brickW * 0.5);
      const cols   = Math.ceil((w + offset) / (brickW + mortarT)) + 1;

      for (let col = 0; col < cols; col++) {
        const bx = col * (brickW + mortarT) - offset;
        if (bx + brickW < 0 || bx >= w) continue;
        if (ry + brickH < 0 || ry >= h) continue;

        const thisBrick = jitterColor(rng, brickBase, 8, [80, 40, 20], [240, 185, 140]);
        fillRect(canvas, bx, ry, brickW, brickH,
          thisBrick[0], thisBrick[1], thisBrick[2], 255);
        // Right shadow edge
        fillRect(canvas, bx + brickW - 1, ry, 1, brickH,
          brickShadow[0], brickShadow[1], brickShadow[2], 170);
        // Bottom shadow edge
        fillRect(canvas, bx, ry + brickH - 1, brickW, 1,
          brickShadow[0], brickShadow[1], brickShadow[2], 150);
      }
    }

    // Outer border to clean up partial bricks at edges
    strokeRect(canvas, 0, 0, w, h, mortarColor[0], mortarColor[1], mortarColor[2], 255, 1);

  } else if (archetype === HouseSurfaceArchetype.STONE) {
    const stoneBase      = jitterColor(rng, pick(rng, STONE_WALL_PALETTES), 10, [80, 75, 65], [200, 195, 180]);
    const mortarColor: Color = [
      clamp(stoneBase[0] - 32, 70, 160),
      clamp(stoneBase[1] - 30, 68, 155),
      clamp(stoneBase[2] - 24, 60, 150),
    ];
    const stoneShadow    = shiftColor(stoneBase, -30, -28, -22);
    const stoneHighlight = shiftColor(stoneBase,  25,  22,  18);

    // Mortar background
    fillRect(canvas, 0, 0, w, h, mortarColor[0], mortarColor[1], mortarColor[2], 255);

    // Irregular stone blocks arranged in rough horizontal courses
    let y = 1;
    while (y < h - 1) {
      const courseH = rng.nextInt(
        Math.max(3, Math.round(h * 0.14)),
        Math.max(5, Math.round(h * 0.28)),
      );
      if (y + courseH > h - 1) break;
      let x = 1;
      while (x < w - 1) {
        const stoneW  = rng.nextInt(
          Math.max(5, Math.round(w * 0.18)),
          Math.max(9, Math.round(w * 0.38)),
        );
        const actualW = Math.min(stoneW, w - 1 - x);
        if (actualW < 3) break;

        const thisStone = jitterColor(rng, stoneBase, 12);
        fillRect(canvas, x, y, actualW, courseH,
          thisStone[0], thisStone[1], thisStone[2], 255);
        // Top-left highlight
        fillRect(canvas, x, y, actualW, 1,
          stoneHighlight[0], stoneHighlight[1], stoneHighlight[2], 160);
        fillRect(canvas, x, y, 1, courseH,
          stoneHighlight[0], stoneHighlight[1], stoneHighlight[2], 120);
        // Bottom-right shadow
        fillRect(canvas, x, y + courseH - 1, actualW, 1,
          stoneShadow[0], stoneShadow[1], stoneShadow[2], 180);
        fillRect(canvas, x + actualW - 1, y, 1, courseH,
          stoneShadow[0], stoneShadow[1], stoneShadow[2], 160);

        x += actualW + 1;  // +1 mortar gap
      }
      y += courseH + 1;    // +1 mortar gap
    }

    // Outer border to clean up partial blocks at canvas edges
    strokeRect(canvas, 0, 0, w, h, mortarColor[0], mortarColor[1], mortarColor[2], 255, 1);

  } else {
    // PLASTER: smooth wall with subtle patches and hairline cracks.
    const plasterBase      = jitterColor(rng, pick(rng, PLASTER_PALETTES), 8, [160, 155, 130], [250, 245, 225]);
    const plasterShadow    = shiftColor(plasterBase, -22, -18, -14);
    const plasterHighlight = shiftColor(plasterBase,  15,  12,   8);

    // Base fill
    fillRect(canvas, 0, 0, w, h, plasterBase[0], plasterBase[1], plasterBase[2], 255);

    // Subtle discoloration patches (weathering / staining)
    const patchCount = rng.nextInt(3, 8);
    for (let i = 0; i < patchCount; i++) {
      const px = rng.nextInt(1, w - 3);
      const py = rng.nextInt(1, h - 3);
      const pw = rng.nextInt(2, Math.max(3, Math.round(w * 0.22)));
      const ph = rng.nextInt(1, Math.max(2, Math.round(h * 0.16)));
      const patchColor = jitterColor(rng, plasterBase, 10);
      fillRect(canvas, px, py, pw, ph,
        patchColor[0], patchColor[1], patchColor[2], 170);
    }

    // Hairline cracks
    const crackCount = rng.nextInt(1, 3);
    for (let i = 0; i < crackCount; i++) {
      const cx0 = rng.nextInt(2, w - 3);
      const cy0 = rng.nextInt(2, h - 3);
      const cx1 = clamp(cx0 + rng.nextInt(-5, 5), 1, w - 2);
      const cy1 = clamp(cy0 + rng.nextInt(-6, 6), 1, h - 2);
      drawLine(canvas, cx0, cy0, cx1, cy1,
        plasterShadow[0], plasterShadow[1], plasterShadow[2], 130, 1);
    }

    // Edge shading: bright top/left, shadow bottom/right
    fillRect(canvas, 0,     0,     w,     1, plasterHighlight[0], plasterHighlight[1], plasterHighlight[2], 200);
    fillRect(canvas, 0,     h - 1, w,     1, plasterShadow[0],    plasterShadow[1],    plasterShadow[2],    200);
    fillRect(canvas, 0,     0,     1,     h, plasterHighlight[0], plasterHighlight[1], plasterHighlight[2], 160);
    fillRect(canvas, w - 1, 0,     1,     h, plasterShadow[0],    plasterShadow[1],    plasterShadow[2],    180);
  }
}

export function generateHouseSurface(
  seed: number,
  size = 24,
): { canvas: Canvas; archetype: HouseSurfaceArchetype } {
  const archetype = houseSurfaceArchetypeFromSeed(seed);
  const rng = new Rng(seed);
  const w = clamp(size + rng.nextInt(-2, 4), 18, 34);
  const h = clamp(Math.round(size * 0.72) + rng.nextInt(-2, 2), 14, 28);
  const canvas = new Canvas(w, h);
  generateHouseSurfaceSprite(canvas, w, h, rng, archetype);
  return { canvas, archetype };
}
