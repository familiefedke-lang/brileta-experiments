/** Procedural environmental prop sprite generation. */
import {
  batchStampEllipses,
  clamp,
  clampChannel,
  darkenRim,
  drawLine,
  fillRect,
  fillTriangle,
  stampEllipse,
  strokeRect,
  type EllipseSpec,
} from './primitives.js';
import { Rng } from './rng.js';
import { Canvas, type Color, type RGBA } from './types.js';

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
// Bush
// ================================================================

export enum BushArchetype {
  ROUND   = 'round',
  WIDE    = 'wide',
  CLUSTER = 'cluster',
}

function bushArchetypeFromSeed(seed: number): BushArchetype {
  const r = (seed >>> 0) % 3;
  if (r === 0) return BushArchetype.ROUND;
  if (r === 1) return BushArchetype.WIDE;
  return BushArchetype.CLUSTER;
}

const BUSH_PALETTES: Color[] = [
  [55, 130, 45],
  [45, 120, 35],
  [65, 140, 40],
  [40, 110, 50],
  [75, 145, 30],
  [50, 125, 55],
  [30, 105, 40],
  [80, 150, 25],
];

function generateBushSprite(canvas: Canvas, size: number, rng: Rng, archetype: BushArchetype): void {
  const baseColor = jitterColor(rng, pick(rng, BUSH_PALETTES), 12, [20, 85, 15], [105, 185, 75]);
  const shadowColor = shiftColor(baseColor, -30, -30, -20);
  const highlightColor = shiftColor(baseColor, 30, 35, 20);

  const cx = size * 0.5 + rng.nextRange(-0.8, 0.8);
  const cy = size * 0.54 + rng.nextRange(-0.5, 0.5);

  let rx: number, ry: number, count: number, spreadX: number, spreadY: number;
  if (archetype === BushArchetype.ROUND) {
    rx = size * rng.nextRange(0.18, 0.25);
    ry = size * rng.nextRange(0.15, 0.22);
    count = rng.nextInt(9, 14);
    spreadX = size * 0.34;
    spreadY = size * 0.30;
  } else if (archetype === BushArchetype.WIDE) {
    rx = size * rng.nextRange(0.16, 0.22);
    ry = size * rng.nextRange(0.12, 0.18);
    count = rng.nextInt(10, 16);
    spreadX = size * 0.42;
    spreadY = size * 0.22;
  } else {
    // CLUSTER: loosely grouped sub-mounds
    rx = size * rng.nextRange(0.14, 0.20);
    ry = size * rng.nextRange(0.12, 0.18);
    count = rng.nextInt(12, 18);
    spreadX = size * 0.40;
    spreadY = size * 0.35;
  }

  const ellipses: EllipseSpec[] = [];
  for (let i = 0; i < count; i++) {
    ellipses.push({
      cx: cx + rng.nextRange(-spreadX, spreadX),
      cy: cy + rng.nextRange(-spreadY, spreadY),
      rx: rx * rng.nextRange(0.7, 1.3),
      ry: ry * rng.nextRange(0.7, 1.3),
    });
  }

  // Shadow pass (shifted slightly down)
  const shadowEllipses: EllipseSpec[] = ellipses.map(e => ({ ...e, cy: e.cy + size * 0.04 }));
  batchStampEllipses(canvas, shadowEllipses, shadowColor[0], shadowColor[1], shadowColor[2], 180, 2.5, 0.15);

  // Body pass
  batchStampEllipses(canvas, ellipses, baseColor[0], baseColor[1], baseColor[2], 220, 2.0, 0.20);

  // Highlight pass (upper-left subset, smaller ellipses)
  const highlightCount = Math.max(1, Math.floor(count * 0.35));
  const highlightEllipses: EllipseSpec[] = [];
  for (let i = 0; i < highlightCount; i++) {
    const e = ellipses[rng.nextInt(0, ellipses.length - 1)];
    highlightEllipses.push({
      cx: e.cx - size * 0.06,
      cy: e.cy - size * 0.06,
      rx: e.rx * 0.55,
      ry: e.ry * 0.55,
    });
  }
  batchStampEllipses(canvas, highlightEllipses, highlightColor[0], highlightColor[1], highlightColor[2], 140, 1.5, 0.25);

  darkenRim(canvas, 20, 22, 14);
}

export function generateBush(
  seed: number,
  size = 16,
): { canvas: Canvas; archetype: BushArchetype } {
  const archetype = bushArchetypeFromSeed(seed);
  const rng = new Rng(seed);
  const actualSize = clamp(size + rng.nextInt(-2, 2), 12, 22);
  const canvas = new Canvas(actualSize, actualSize);
  generateBushSprite(canvas, actualSize, rng, archetype);
  return { canvas, archetype };
}

// ================================================================
// Flower Bed
// ================================================================

export enum FlowerBedArchetype {
  WILDFLOWER = 'wildflower',
  DAISY      = 'daisy',
  TULIP      = 'tulip',
}

function flowerBedArchetypeFromSeed(seed: number): FlowerBedArchetype {
  const r = (seed >>> 0) % 3;
  if (r === 0) return FlowerBedArchetype.WILDFLOWER;
  if (r === 1) return FlowerBedArchetype.DAISY;
  return FlowerBedArchetype.TULIP;
}

const FLOWER_PALETTES: Color[][] = [
  // Wildflower colors
  [[220, 60, 60], [240, 200, 40], [60, 120, 220], [200, 80, 180], [240, 140, 40]],
  // Daisy colors
  [[240, 240, 200], [250, 250, 210], [230, 230, 190], [220, 220, 180]],
  // Tulip colors
  [[220, 40, 40], [220, 80, 40], [180, 40, 130], [240, 200, 60], [200, 60, 120]],
];

const STEM_COLORS: Color[] = [
  [60, 130, 40],
  [50, 120, 35],
  [70, 140, 45],
];

function generateFlowerBedSprite(
  canvas: Canvas,
  w: number,
  h: number,
  rng: Rng,
  archetype: FlowerBedArchetype,
): void {
  const stemBase = jitterColor(rng, pick(rng, STEM_COLORS), 8, [30, 90, 20], [90, 160, 60]);
  const paletteIdx =
    archetype === FlowerBedArchetype.WILDFLOWER ? 0 :
    archetype === FlowerBedArchetype.DAISY      ? 1 : 2;
  const flowerPalette = FLOWER_PALETTES[paletteIdx];

  const count = rng.nextInt(5, 9);
  const soilY = h - 2;

  for (let i = 0; i < count; i++) {
    const fx = (i + 0.5 + rng.nextRange(-0.4, 0.4)) * (w / count);
    const stemHeight = h * rng.nextRange(0.40, 0.62);
    const stemTopY = soilY - stemHeight;

    // Stem line
    drawLine(
      canvas,
      Math.round(fx), Math.round(soilY),
      Math.round(fx + rng.nextRange(-1, 1)), Math.round(stemTopY),
      stemBase[0], stemBase[1], stemBase[2], 255,
      1,
    );

    // Flower head
    const flowerBase = pick(rng, flowerPalette);
    const flowerColor = jitterColor(rng, flowerBase, 15, [30, 20, 20], [255, 255, 255]);
    const fr = w * rng.nextRange(0.058, 0.098);
    stampEllipse(
      canvas, fx, stemTopY, fr, fr * rng.nextRange(0.8, 1.2),
      flowerColor[0], flowerColor[1], flowerColor[2], 240, 1.5, 0.70,
    );

    // Daisy center dot
    if (archetype === FlowerBedArchetype.DAISY) {
      stampEllipse(
        canvas, fx, stemTopY, fr * 0.35, fr * 0.35,
        240, 200, 30, 255, 2.0, 0.85,
      );
    }
  }

  // Soil strip at the base
  fillRect(canvas, 0, soilY, w, 2, 120, 85, 55, 220);
}

export function generateFlowerBed(
  seed: number,
  size = 24,
): { canvas: Canvas; archetype: FlowerBedArchetype } {
  const archetype = flowerBedArchetypeFromSeed(seed);
  const rng = new Rng(seed);
  const w = clamp(size + rng.nextInt(-2, 4), 18, 32);
  const h = clamp(Math.round(size * 0.55) + rng.nextInt(-1, 2), 12, 18);
  const canvas = new Canvas(w, h);
  generateFlowerBedSprite(canvas, w, h, rng, archetype);
  return { canvas, archetype };
}

// ================================================================
// Mushroom
// ================================================================

export enum MushroomArchetype {
  TOADSTOOL = 'toadstool',
  BROWN_CAP = 'brown_cap',
  PUFFBALL  = 'puffball',
}

function mushroomArchetypeFromSeed(seed: number): MushroomArchetype {
  const r = (seed >>> 0) % 3;
  if (r === 0) return MushroomArchetype.TOADSTOOL;
  if (r === 1) return MushroomArchetype.BROWN_CAP;
  return MushroomArchetype.PUFFBALL;
}

const CAP_PALETTES: Record<MushroomArchetype, Color[]> = {
  [MushroomArchetype.TOADSTOOL]: [[200, 45, 30], [210, 55, 35], [180, 40, 25], [220, 60, 40]],
  [MushroomArchetype.BROWN_CAP]: [[160, 110, 60], [140, 95, 50], [175, 125, 70], [130, 90, 45]],
  [MushroomArchetype.PUFFBALL]:  [[230, 220, 180], [220, 210, 170], [240, 230, 190], [200, 195, 155]],
};

const MUSHROOM_STEM_PALETTE: Color[] = [
  [220, 210, 185],
  [210, 200, 175],
  [230, 220, 195],
];

function generateMushroomSprite(
  canvas: Canvas,
  size: number,
  rng: Rng,
  archetype: MushroomArchetype,
): void {
  const capBase = jitterColor(rng, pick(rng, CAP_PALETTES[archetype]), 12);
  const stemBase = jitterColor(rng, pick(rng, MUSHROOM_STEM_PALETTE), 10);
  const cx = size * 0.5 + rng.nextRange(-0.5, 0.5);

  // Stem geometry
  const stemW = clamp(Math.round(size * rng.nextRange(0.25, 0.35)), 2, 6);
  const stemH = Math.round(size * rng.nextRange(0.32, 0.45));
  const stemX = Math.round(cx - stemW * 0.5);
  const stemY = size - stemH;

  // Cap geometry
  const capRx = size * rng.nextRange(0.35, 0.46);
  const capRy = archetype === MushroomArchetype.PUFFBALL
    ? capRx * rng.nextRange(0.85, 1.1)
    : size * rng.nextRange(0.22, 0.32);
  const capCy = stemY - capRy * 0.25;

  // Shadow: darker, shifted right and down
  const shadowColor = shiftColor(capBase, -35, -30, -25);
  stampEllipse(
    canvas,
    cx + size * 0.08, capCy + size * 0.08,
    capRx * 1.06, capRy * 1.06,
    shadowColor[0], shadowColor[1], shadowColor[2], 180, 2.0, 0.50,
  );

  // Stem body
  const stemShadow = shiftColor(stemBase, -25, -22, -18);
  fillRect(canvas, stemX, stemY, stemW, stemH, stemBase[0], stemBase[1], stemBase[2], 255);
  // Stem right-side shadow strip
  fillRect(canvas, stemX + stemW - 1, stemY, 1, stemH, stemShadow[0], stemShadow[1], stemShadow[2], 200);

  // Cap body
  stampEllipse(
    canvas, cx, capCy, capRx, capRy,
    capBase[0], capBase[1], capBase[2], 245, 2.0, 0.75,
  );

  // Highlight: small bright ellipse upper-left of cap
  const hlColor = shiftColor(capBase, 45, 40, 30);
  stampEllipse(
    canvas,
    cx - capRx * 0.30, capCy - capRy * 0.28,
    capRx * 0.35, capRy * 0.32,
    hlColor[0], hlColor[1], hlColor[2], 160, 1.5, 0.55,
  );

  // White spots for toadstool archetype
  if (archetype === MushroomArchetype.TOADSTOOL) {
    const spotCount = rng.nextInt(3, 6);
    for (let i = 0; i < spotCount; i++) {
      const angle = rng.nextRange(0, Math.PI);
      const dist = rng.nextRange(0.3, 0.78);
      const sx = cx + Math.cos(angle) * capRx * dist;
      const sy = capCy + Math.sin(angle) * capRy * dist - capRy * 0.1;
      const sr = capRx * rng.nextRange(0.08, 0.15);
      stampEllipse(canvas, sx, sy, sr, sr * 0.85, 240, 235, 220, 210, 1.8, 0.80);
    }
  }

  darkenRim(canvas, 22, 18, 14);
}

export function generateMushroom(
  seed: number,
  size = 14,
): { canvas: Canvas; archetype: MushroomArchetype } {
  const archetype = mushroomArchetypeFromSeed(seed);
  const rng = new Rng(seed);
  const actualSize = clamp(size + rng.nextInt(-2, 2), 10, 20);
  const canvas = new Canvas(actualSize, actualSize);
  generateMushroomSprite(canvas, actualSize, rng, archetype);
  return { canvas, archetype };
}

// ================================================================
// Fence Segment
// ================================================================

export enum FenceArchetype {
  PICKET    = 'picket',
  RAIL      = 'rail',
  LOG_FENCE = 'log_fence',
}

function fenceArchetypeFromSeed(seed: number): FenceArchetype {
  const r = (seed >>> 0) % 3;
  if (r === 0) return FenceArchetype.PICKET;
  if (r === 1) return FenceArchetype.RAIL;
  return FenceArchetype.LOG_FENCE;
}

const WOOD_PALETTES: Color[] = [
  [160, 118, 72],
  [145, 105, 62],
  [175, 132, 80],
  [130, 98, 58],
  [190, 150, 95],
];

function generateFenceSprite(
  canvas: Canvas,
  w: number,
  h: number,
  rng: Rng,
  archetype: FenceArchetype,
): void {
  const woodBase = jitterColor(rng, pick(rng, WOOD_PALETTES), 12, [90, 65, 35], [210, 175, 115]);
  const woodShadow = shiftColor(woodBase, -35, -28, -20);
  const woodHighlight = shiftColor(woodBase, 28, 22, 14);

  if (archetype === FenceArchetype.PICKET) {
    const postCount = rng.nextInt(3, 5);
    const postW = clamp(Math.round(w * 0.10), 2, 4);
    const railH = clamp(Math.round(h * 0.12), 1, 3);
    const topRailY = Math.round(h * 0.28);
    const botRailY = Math.round(h * 0.62);
    const spacing = w / postCount;

    // Posts (vertical planks with pointed caps)
    for (let i = 0; i < postCount; i++) {
      const px = Math.round(i * spacing + spacing * 0.5 - postW * 0.5);
      fillRect(canvas, px, topRailY - 4, postW, h - topRailY + 4, woodBase[0], woodBase[1], woodBase[2], 255);
      // Pointed tip pixel
      fillRect(canvas, px + Math.floor(postW / 2), topRailY - 7, 1, 3, woodHighlight[0], woodHighlight[1], woodHighlight[2], 255);
      // Shadow right edge
      fillRect(canvas, px + postW - 1, topRailY - 4, 1, h - topRailY + 4, woodShadow[0], woodShadow[1], woodShadow[2], 200);
    }

    // Horizontal rails
    fillRect(canvas, 0, topRailY, w, railH, woodShadow[0], woodShadow[1], woodShadow[2], 255);
    fillRect(canvas, 0, botRailY, w, railH, woodShadow[0], woodShadow[1], woodShadow[2], 255);
    fillRect(canvas, 0, topRailY, w, 1, woodHighlight[0], woodHighlight[1], woodHighlight[2], 200);
    fillRect(canvas, 0, botRailY, w, 1, woodHighlight[0], woodHighlight[1], woodHighlight[2], 200);

  } else if (archetype === FenceArchetype.RAIL) {
    const postCount = rng.nextInt(2, 3);
    const postW = clamp(Math.round(w * 0.10), 2, 4);
    const railH = clamp(Math.round(h * 0.12), 1, 3);
    const spacing = w / postCount;

    // Tall posts
    for (let i = 0; i <= postCount; i++) {
      const px = Math.round(i * spacing - postW * 0.5);
      fillRect(canvas, clamp(px, 0, w - postW), 0, postW, h, woodBase[0], woodBase[1], woodBase[2], 255);
      fillRect(canvas, clamp(px + postW - 1, 0, w - 1), 0, 1, h, woodShadow[0], woodShadow[1], woodShadow[2], 200);
    }

    // Three horizontal rails
    for (const ry of [Math.round(h * 0.20), Math.round(h * 0.50), Math.round(h * 0.80)]) {
      fillRect(canvas, 0, ry, w, railH, woodBase[0], woodBase[1], woodBase[2], 255);
      fillRect(canvas, 0, ry, w, 1, woodHighlight[0], woodHighlight[1], woodHighlight[2], 200);
    }

  } else {
    // LOG_FENCE: stacked rounded log rounds
    const logW = clamp(Math.round(w * 0.32), 6, 12);
    const logH = clamp(Math.round(h * 0.28), 4, 8);
    const cols = Math.ceil(w / logW) + 1;
    const rows = Math.ceil(h / logH) + 1;

    for (let row = 0; row < rows; row++) {
      const offset = (row % 2) * Math.round(logW * 0.5);
      for (let col = 0; col < cols; col++) {
        const lx = col * logW - offset;
        const ly = row * logH;
        const logColor = jitterColor(rng, woodBase, 8);
        fillRect(canvas, lx, ly, logW - 1, logH - 1, logColor[0], logColor[1], logColor[2], 255);
        // Shadow right and bottom edges
        fillRect(canvas, lx + logW - 2, ly, 1, logH - 1, woodShadow[0], woodShadow[1], woodShadow[2], 200);
        fillRect(canvas, lx, ly + logH - 2, logW - 1, 1, woodShadow[0], woodShadow[1], woodShadow[2], 200);
        // Highlight top edge
        fillRect(canvas, lx, ly, logW - 1, 1, woodHighlight[0], woodHighlight[1], woodHighlight[2], 180);
      }
    }
  }
}

export function generateFenceSegment(
  seed: number,
  size = 24,
): { canvas: Canvas; archetype: FenceArchetype } {
  const archetype = fenceArchetypeFromSeed(seed);
  const rng = new Rng(seed);
  const w = clamp(size + rng.nextInt(-2, 4), 18, 32);
  const h = clamp(Math.round(size * 0.65) + rng.nextInt(-1, 2), 12, 20);
  const canvas = new Canvas(w, h);
  generateFenceSprite(canvas, w, h, rng, archetype);
  return { canvas, archetype };
}

// ================================================================
// Campfire
// ================================================================

export enum CampfireArchetype {
  SMALL  = 'small',
  MEDIUM = 'medium',
  EMBER  = 'ember',
}

function campfireArchetypeFromSeed(seed: number): CampfireArchetype {
  const r = (seed >>> 0) % 3;
  if (r === 0) return CampfireArchetype.SMALL;
  if (r === 1) return CampfireArchetype.MEDIUM;
  return CampfireArchetype.EMBER;
}

const STONE_PALETTES: Color[] = [
  [120, 118, 112],
  [110, 108, 104],
  [130, 128, 122],
  [140, 132, 118],
];

const FLAME_COLORS: RGBA[] = [
  [240, 60, 20, 230],
  [240, 120, 20, 220],
  [250, 200, 40, 210],
  [220, 40, 10, 220],
];

const LOG_COLORS: Color[] = [
  [110, 72, 38],
  [100, 65, 32],
  [125, 82, 45],
];

function generateCampfireSprite(
  canvas: Canvas,
  size: number,
  rng: Rng,
  archetype: CampfireArchetype,
): void {
  const cx = size * 0.5;
  const baseY = size - Math.round(size * 0.10);
  const stoneColor = jitterColor(rng, pick(rng, STONE_PALETTES), 10);
  const logColor = jitterColor(rng, pick(rng, LOG_COLORS), 10);

  // Stone ring
  const stoneCount = rng.nextInt(6, 10);
  const stoneRing = size * 0.32;
  for (let i = 0; i < stoneCount; i++) {
    const angle = (i / stoneCount) * Math.PI * 2;
    const sx = cx + Math.cos(angle) * stoneRing;
    const sy = baseY + Math.sin(angle) * stoneRing * 0.45;
    const srx = size * rng.nextRange(0.055, 0.090);
    const sry = srx * rng.nextRange(0.65, 0.85);
    stampEllipse(canvas, sx, sy, srx, sry, stoneColor[0], stoneColor[1], stoneColor[2], 240, 2.0, 0.80);
  }

  // Logs (lines radiating from center)
  const logCount = rng.nextInt(2, 3);
  for (let i = 0; i < logCount; i++) {
    const angle = rng.nextRange(0, Math.PI);
    const len = stoneRing * rng.nextRange(0.7, 0.95);
    const lx0 = Math.round(cx - Math.cos(angle) * len);
    const ly0 = Math.round(baseY - Math.sin(angle) * len * 0.45);
    const lx1 = Math.round(cx + Math.cos(angle) * len);
    const ly1 = Math.round(baseY + Math.sin(angle) * len * 0.45);
    drawLine(canvas, lx0, ly0, lx1, ly1, logColor[0], logColor[1], logColor[2], 255, 2);
  }

  // Flames (triangles stacked above center)
  if (archetype !== CampfireArchetype.EMBER) {
    const flameCount = archetype === CampfireArchetype.MEDIUM
      ? rng.nextInt(3, 5)
      : rng.nextInt(2, 3);
    const flameBaseY = baseY - Math.round(size * 0.05);
    const flameBaseW = size * 0.28;

    for (let i = 0; i < flameCount; i++) {
      const fCx = cx + rng.nextRange(-size * 0.12, size * 0.12);
      const flameH = size * rng.nextRange(0.28, 0.50) *
        (archetype === CampfireArchetype.MEDIUM ? 1.2 : 1.0);
      const fHalf = flameBaseW * rng.nextRange(0.5, 1.0) * 0.5;
      const flameColor = pick(rng, FLAME_COLORS);
      fillTriangle(
        canvas,
        Math.round(fCx),    Math.round(flameBaseY - flameH),
        Math.round(fCx - fHalf), Math.round(flameBaseY),
        Math.round(fCx + fHalf), Math.round(flameBaseY),
        flameColor[0], flameColor[1], flameColor[2], flameColor[3],
      );
    }

    // Inner bright flame
    const innerH = size * rng.nextRange(0.15, 0.25);
    const innerHalf = size * 0.10;
    fillTriangle(
      canvas,
      Math.round(cx),            Math.round(flameBaseY - innerH),
      Math.round(cx - innerHalf), Math.round(flameBaseY),
      Math.round(cx + innerHalf), Math.round(flameBaseY),
      250, 220, 60, 200,
    );
  } else {
    // Ember: glowing ellipse only
    stampEllipse(canvas, cx, baseY - size * 0.05, size * 0.14, size * 0.07, 200, 70, 20, 220, 1.5, 0.60);
    stampEllipse(canvas, cx, baseY - size * 0.06, size * 0.08, size * 0.04, 240, 160, 40, 200, 1.5, 0.70);
  }
}

export function generateCampfire(
  seed: number,
  size = 20,
): { canvas: Canvas; archetype: CampfireArchetype } {
  const archetype = campfireArchetypeFromSeed(seed);
  const rng = new Rng(seed);
  const actualSize = clamp(size + rng.nextInt(-2, 2), 14, 26);
  const canvas = new Canvas(actualSize, actualSize);
  generateCampfireSprite(canvas, actualSize, rng, archetype);
  return { canvas, archetype };
}

// ================================================================
// Crate
// ================================================================

export enum CrateArchetype {
  WOODEN     = 'wooden',
  REINFORCED = 'reinforced',
  SMALL_BOX  = 'small_box',
}

function crateArchetypeFromSeed(seed: number): CrateArchetype {
  const r = (seed >>> 0) % 3;
  if (r === 0) return CrateArchetype.WOODEN;
  if (r === 1) return CrateArchetype.REINFORCED;
  return CrateArchetype.SMALL_BOX;
}

const CRATE_PALETTES: Color[] = [
  [180, 145, 88],
  [165, 132, 78],
  [195, 158, 96],
  [155, 122, 68],
  [170, 138, 82],
];

const BAND_COLORS: Color[] = [
  [90, 80, 70],
  [100, 88, 76],
  [80, 72, 62],
];

function generateCrateSprite(
  canvas: Canvas,
  size: number,
  rng: Rng,
  archetype: CrateArchetype,
): void {
  const woodBase = jitterColor(rng, pick(rng, CRATE_PALETTES), 10, [110, 85, 45], [220, 180, 120]);
  const woodShadow = shiftColor(woodBase, -40, -34, -24);
  const woodHighlight = shiftColor(woodBase, 38, 32, 20);
  const bandBase = jitterColor(rng, pick(rng, BAND_COLORS), 8);
  const bandHighlight = shiftColor(bandBase, 22, 20, 18);

  const margin = Math.round(size * 0.04);
  const boxW = size - margin * 2;
  const boxH = size - margin * 2;
  const x0 = margin;
  const y0 = margin;

  // Body fill
  fillRect(canvas, x0, y0, boxW, boxH, woodBase[0], woodBase[1], woodBase[2], 255);

  // Right shadow edge
  fillRect(canvas, x0 + boxW - 2, y0, 2, boxH, woodShadow[0], woodShadow[1], woodShadow[2], 200);
  // Bottom shadow edge
  fillRect(canvas, x0, y0 + boxH - 2, boxW, 2, woodShadow[0], woodShadow[1], woodShadow[2], 200);
  // Top highlight edge
  fillRect(canvas, x0, y0, boxW, 1, woodHighlight[0], woodHighlight[1], woodHighlight[2], 200);
  // Left highlight edge
  fillRect(canvas, x0, y0, 1, boxH, woodHighlight[0], woodHighlight[1], woodHighlight[2], 180);

  // Horizontal plank lines
  const plankCount = archetype === CrateArchetype.SMALL_BOX
    ? rng.nextInt(2, 3)
    : rng.nextInt(3, 5);
  for (let i = 1; i < plankCount; i++) {
    const ply = y0 + Math.round(i * boxH / plankCount);
    drawLine(canvas, x0, ply, x0 + boxW - 1, ply, woodShadow[0], woodShadow[1], woodShadow[2], 160, 1);
  }

  if (archetype === CrateArchetype.REINFORCED) {
    // Metal corner brackets
    const bandW = Math.max(2, Math.round(size * 0.14));
    fillRect(canvas, x0,                  y0,                  bandW, bandW, bandBase[0], bandBase[1], bandBase[2], 230);
    fillRect(canvas, x0 + boxW - bandW,   y0,                  bandW, bandW, bandBase[0], bandBase[1], bandBase[2], 230);
    fillRect(canvas, x0,                  y0 + boxH - bandW,   bandW, bandW, bandBase[0], bandBase[1], bandBase[2], 230);
    fillRect(canvas, x0 + boxW - bandW,   y0 + boxH - bandW,   bandW, bandW, bandBase[0], bandBase[1], bandBase[2], 230);
    // Horizontal center band
    const midY = y0 + Math.round(boxH / 2) - 1;
    fillRect(canvas, x0, midY, boxW, 2, bandBase[0], bandBase[1], bandBase[2], 220);
    fillRect(canvas, x0, midY, boxW, 1, bandHighlight[0], bandHighlight[1], bandHighlight[2], 160);

  } else if (archetype === CrateArchetype.WOODEN) {
    // Vertical plank dividers
    const vCount = rng.nextInt(1, 2);
    for (let i = 1; i <= vCount; i++) {
      const vlx = x0 + Math.round(i * boxW / (vCount + 1));
      drawLine(canvas, vlx, y0, vlx, y0 + boxH - 1, woodShadow[0], woodShadow[1], woodShadow[2], 140, 1);
    }
  }

  // Outer border
  strokeRect(canvas, x0, y0, boxW, boxH, woodShadow[0], woodShadow[1], woodShadow[2], 255, 1);
}

export function generateCrate(
  seed: number,
  size = 16,
): { canvas: Canvas; archetype: CrateArchetype } {
  const archetype = crateArchetypeFromSeed(seed);
  const rng = new Rng(seed);
  const actualSize = clamp(size + rng.nextInt(-2, 2), 12, 22);
  const canvas = new Canvas(actualSize, actualSize);
  generateCrateSprite(canvas, actualSize, rng, archetype);
  return { canvas, archetype };
}
