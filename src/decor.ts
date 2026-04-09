/** Procedural decorative prop sprite generation: crystals, potions, ruins. */
import {
  clamp,
  clampChannel,
  darkenRim,
  drawLine,
  fillRect,
  fillTriangle,
  stampEllipse,
  batchStampEllipses,
  type EllipseSpec,
} from './primitives.js';
import { Rng } from './rng.js';
import { Canvas, type Color } from './types.js';

// ----------------------------------------------------------------
// Shared helpers
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

function jitterColor(rng: Rng, base: Color, delta: number): Color {
  return [
    clampChannel(base[0] + rng.nextInt(-delta, delta)),
    clampChannel(base[1] + rng.nextInt(-delta, delta)),
    clampChannel(base[2] + rng.nextInt(-delta, delta)),
  ];
}

// ================================================================
// Crystal
// ================================================================

export enum CrystalArchetype {
  SHARD   = 'shard',
  CLUSTER = 'cluster',
  GEODE   = 'geode',
}

export interface CrystalOptions {
  archetype?: CrystalArchetype;
  baseColor?: Color;
}

function crystalArchetypeFromSeed(seed: number): CrystalArchetype {
  const r = (seed >>> 0) % 3;
  if (r === 0) return CrystalArchetype.SHARD;
  if (r === 1) return CrystalArchetype.CLUSTER;
  return CrystalArchetype.GEODE;
}

const GEM_COLORS: Color[] = [
  [50,  90,  200], // sapphire
  [40,  170, 80],  // emerald
  [200, 45,  55],  // ruby
  [145, 60,  200], // amethyst
  [210, 180, 50],  // topaz
  [50,  190, 180], // aquamarine
  [220, 155, 30],  // citrine
];

const STONE_COLORS: Color[] = [
  [152, 132, 112], // warm stone
  [120, 128, 140], // cool stone
  [108, 114, 104], // dark stone
];

/** Draw a single crystal shard at (cx, bottomY) with given height and half-width. */
function drawShard(
  canvas: Canvas,
  cx: number,
  bottomY: number,
  halfW: number,
  height: number,
  tiltX: number,
  color: Color,
  rng: Rng,
): void {
  const tipX   = Math.round(cx + tiltX);
  const tipY   = Math.round(bottomY - height);
  const baseL  = Math.round(cx - halfW);
  const baseR  = Math.round(cx + halfW);
  const baseY  = Math.round(bottomY);

  // Main shard face
  fillTriangle(
    canvas,
    tipX, tipY,
    baseL, baseY,
    baseR, baseY,
    color[0], color[1], color[2], 255,
  );

  // Left face (slightly darker)
  const darkFace = shiftColor(color, -45, -45, -40);
  const midL = Math.round(cx - halfW * 0.5 + tiltX * 0.5);
  fillTriangle(
    canvas,
    tipX, tipY,
    baseL, baseY,
    midL, baseY,
    darkFace[0], darkFace[1], darkFace[2], 200,
  );

  // Right face (slightly lighter)
  const lightFace = shiftColor(color, 30, 30, 35);
  const midR  = Math.round(cx + halfW * 0.3 + tiltX * 0.5);
  fillTriangle(
    canvas,
    tipX, tipY,
    midR, baseY,
    baseR, baseY,
    lightFace[0], lightFace[1], lightFace[2], 160,
  );

  // Highlight stripe: thin bright line along one edge from tip downward
  const highlightColor = shiftColor(color, 80, 80, 90);
  const hlX0 = tipX + (rng.nextFloat() > 0.5 ? 1 : 0);
  const hlY0 = tipY + 1;
  const hlX1 = Math.round(cx - halfW * 0.3 + tiltX * 0.3);
  const hlY1 = Math.round(bottomY - height * 0.35);
  drawLine(canvas, hlX0, hlY0, hlX1, hlY1, highlightColor[0], highlightColor[1], highlightColor[2], 200, 1);
}

function generateShard(canvas: Canvas, w: number, h: number, rng: Rng, color: Color): void {
  const cx      = w * 0.5 + rng.nextRange(-1.5, 1.5);
  const height  = h * rng.nextRange(0.68, 0.78);
  const halfW   = w * rng.nextRange(0.18, 0.26);
  const tiltX   = rng.nextRange(-halfW * 0.5, halfW * 0.5);
  const bottomY = h * 0.92;

  drawShard(canvas, cx, bottomY, halfW, height, tiltX, color, rng);
  darkenRim(canvas, 22, 20, 18);
}

function generateCluster(canvas: Canvas, w: number, h: number, rng: Rng, color: Color): void {
  const count    = rng.nextInt(3, 5);
  const baseY    = h * 0.92;
  const spreadX  = w * 0.36;

  for (let i = 0; i < count; i++) {
    const cx     = w * 0.5 + rng.nextRange(-spreadX, spreadX);
    // Outer shards shorter, centre shard tallest
    const scale  = 1 - Math.abs(cx - w * 0.5) / (spreadX * 1.6);
    const height = h * rng.nextRange(0.36, 0.58) * (0.55 + scale * 0.55);
    const halfW  = w * rng.nextRange(0.10, 0.17);
    const tiltX  = rng.nextRange(-halfW * 0.6, halfW * 0.6);
    const c      = jitterColor(rng, color, 18);

    drawShard(canvas, cx, baseY, halfW, height, tiltX, c, rng);
  }
  darkenRim(canvas, 22, 20, 18);
}

function generateGeode(canvas: Canvas, w: number, h: number, rng: Rng, color: Color): void {
  const cx       = w * 0.5;
  const cy       = h * 0.54;
  const stone    = jitterColor(rng, pick(rng, STONE_COLORS), 14);
  const stoneD   = shiftColor(stone, -30, -30, -28);
  const stoneH   = shiftColor(stone,  28,  28,  26);

  // Rocky exterior
  const bodyEllipses: EllipseSpec[] = [
    { cx, cy,                                                   rx: w * 0.38, ry: h * 0.28 },
    { cx: cx - w * 0.04, cy: cy - h * 0.04,                    rx: w * 0.30, ry: h * 0.22 },
    { cx: cx + w * 0.06, cy: cy + h * 0.04,                    rx: w * 0.28, ry: h * 0.20 },
  ];
  batchStampEllipses(canvas, bodyEllipses, stone[0], stone[1], stone[2], 240, 2.0, 0.88);

  // Shadow pass
  batchStampEllipses(
    canvas,
    [{ cx: cx + w * 0.03, cy: cy + h * 0.05, rx: w * 0.40, ry: h * 0.30 }],
    stoneD[0], stoneD[1], stoneD[2], 180, 2.4, 0.82,
  );
  // Highlight pass
  batchStampEllipses(
    canvas,
    [{ cx: cx - w * 0.08, cy: cy - h * 0.10, rx: w * 0.18, ry: h * 0.12 }],
    stoneH[0], stoneH[1], stoneH[2], 140, 1.8, 0.70,
  );

  // Cavity (dark interior hollow)
  const cavRx   = w * rng.nextRange(0.20, 0.26);
  const cavRy   = h * rng.nextRange(0.14, 0.19);
  const cavCx   = cx + rng.nextRange(-1.5, 1.5);
  const cavCy   = cy + rng.nextRange(-1.0, 1.5);
  stampEllipse(canvas, cavCx, cavCy, cavRx, cavRy, 20, 18, 22, 230, 1.8, 0.75);

  // Crystal shards inside cavity
  const innerCount = rng.nextInt(3, 5);
  for (let i = 0; i < innerCount; i++) {
    const angle  = rng.nextRange(-Math.PI * 0.7, Math.PI * 0.1);
    const dist   = rng.nextRange(0.15, 0.65);
    const shardCx  = cavCx + Math.cos(angle) * cavRx * dist;
    const shardBY  = cavCy + Math.sin(angle + Math.PI * 0.5) * cavRy * 0.6 + cavRy * 0.5;
    const shardH   = cavRy * rng.nextRange(0.55, 0.95);
    const shardHW  = cavRx * rng.nextRange(0.12, 0.22);
    const tilt     = rng.nextRange(-shardHW * 0.8, shardHW * 0.8);
    const c        = jitterColor(rng, color, 20);

    const tipX  = Math.round(shardCx + tilt);
    const tipY  = Math.round(shardBY - shardH);
    const bL    = Math.round(shardCx - shardHW);
    const bR    = Math.round(shardCx + shardHW);
    const bY    = Math.round(shardBY);

    fillTriangle(canvas, tipX, tipY, bL, bY, bR, bY, c[0], c[1], c[2], 240);
    const hl = shiftColor(c, 80, 80, 90);
    drawLine(canvas, tipX, tipY + 1, Math.round(shardCx - shardHW * 0.2), Math.round(shardBY - shardH * 0.3), hl[0], hl[1], hl[2], 180, 1);
  }

  darkenRim(canvas, 22, 20, 18);
}

export function generateCrystal(
  seed: number,
  size = 16,
  options: CrystalOptions = {},
): { canvas: Canvas; archetype: CrystalArchetype } {
  const archetype = options.archetype ?? crystalArchetypeFromSeed(seed);
  const rng       = new Rng(seed);
  const actualSize = clamp(size + rng.nextInt(-1, 1), 12, 22);
  const canvas    = new Canvas(actualSize, actualSize);
  const baseColor = options.baseColor ?? jitterColor(rng, pick(rng, GEM_COLORS), 15);

  if (archetype === CrystalArchetype.SHARD) {
    generateShard(canvas, actualSize, actualSize, rng, baseColor);
  } else if (archetype === CrystalArchetype.CLUSTER) {
    generateCluster(canvas, actualSize, actualSize, rng, baseColor);
  } else {
    generateGeode(canvas, actualSize, actualSize, rng, baseColor);
  }

  return { canvas, archetype };
}

// ================================================================
// Potion
// ================================================================

export enum PotionArchetype {
  ROUND = 'round',
  VIAL  = 'vial',
  FLASK = 'flask',
}

export interface PotionOptions {
  archetype?: PotionArchetype;
  liquidColor?: Color;
}

function potionArchetypeFromSeed(seed: number): PotionArchetype {
  const r = (seed >>> 0) % 3;
  if (r === 0) return PotionArchetype.ROUND;
  if (r === 1) return PotionArchetype.VIAL;
  return PotionArchetype.FLASK;
}

const LIQUID_COLORS: Color[] = [
  [210, 45,  45],  // health red
  [55,  80,  210], // mana blue
  [55,  180, 60],  // poison green
  [150, 50,  200], // mystery purple
  [210, 175, 30],  // gold
  [60,  200, 220], // frost cyan
];

const GLASS_COLOR:    Color = [220, 225, 230];
const GLASS_HIGHLIGHT: Color = [255, 255, 255];
const CORK_COLOR:     Color = [130, 90,  50];

/** Blend glass color with a hint of the liquid. */
function tintedGlass(liquid: Color): Color {
  return [
    clampChannel(GLASS_COLOR[0] + Math.round((liquid[0] - 128) * 0.12)),
    clampChannel(GLASS_COLOR[1] + Math.round((liquid[1] - 128) * 0.12)),
    clampChannel(GLASS_COLOR[2] + Math.round((liquid[2] - 128) * 0.12)),
  ];
}

function generateRoundPotion(canvas: Canvas, w: number, h: number, rng: Rng, liquid: Color): void {
  const glass = tintedGlass(liquid);
  const dark  = shiftColor(glass, -45, -45, -42);

  // Body: round ellipse occupying ~65% height, centred horizontally
  const bodyCx = w * 0.5;
  const bodyCy = h * 0.66;
  const bodyRx = w * 0.34;
  const bodyRy = h * 0.26;

  // Shadow pass behind body
  stampEllipse(canvas, bodyCx, bodyCy + bodyRy * 0.18, bodyRx * 1.06, bodyRy * 1.10,
    dark[0], dark[1], dark[2], 200, 2.2, 0.84);

  // Liquid fill (fills lower 70% of body)
  const liqCy = bodyCy + bodyRy * 0.15;
  stampEllipse(canvas, bodyCx, liqCy, bodyRx * 0.84, bodyRy * 0.82,
    liquid[0], liquid[1], liquid[2], 230, 1.9, 0.80);

  // Glass body on top
  stampEllipse(canvas, bodyCx, bodyCy, bodyRx, bodyRy,
    glass[0], glass[1], glass[2], 160, 2.0, 0.82);

  // Glass highlight: diagonal bright streak top-left
  const hlX0 = Math.round(bodyCx - bodyRx * 0.50);
  const hlY0 = Math.round(bodyCy - bodyRy * 0.62);
  const hlX1 = Math.round(bodyCx - bodyRx * 0.10);
  const hlY1 = Math.round(bodyCy - bodyRy * 0.18);
  drawLine(canvas, hlX0, hlY0, hlX1, hlY1,
    GLASS_HIGHLIGHT[0], GLASS_HIGHLIGHT[1], GLASS_HIGHLIGHT[2], 210, 1);

  // Neck: narrow fillRect above body
  const neckW = Math.max(3, Math.round(w * 0.22));
  const neckX = Math.round(bodyCx - neckW * 0.5);
  const neckTop  = Math.round(bodyCy - bodyRy * 1.05);
  const neckH    = Math.round(bodyRy * 0.70);
  fillRect(canvas, neckX, neckTop, neckW, neckH,
    glass[0], glass[1], glass[2], 200);
  // Neck highlight (left 1px)
  fillRect(canvas, neckX, neckTop, 1, neckH,
    GLASS_HIGHLIGHT[0], GLASS_HIGHLIGHT[1], GLASS_HIGHLIGHT[2], 140);
  // Neck shadow (right 1px)
  fillRect(canvas, neckX + neckW - 1, neckTop, 1, neckH,
    dark[0], dark[1], dark[2], 160);

  // Cork
  const corkH = Math.max(2, Math.round(h * 0.10));
  const corkW = neckW + 2;
  const corkX = Math.round(bodyCx - corkW * 0.5);
  const corkY = neckTop - corkH;
  fillRect(canvas, corkX, corkY, corkW, corkH,
    CORK_COLOR[0], CORK_COLOR[1], CORK_COLOR[2], 255);
  // Cork highlight
  fillRect(canvas, corkX, corkY, corkW, 1,
    clampChannel(CORK_COLOR[0] + 35), clampChannel(CORK_COLOR[1] + 25), clampChannel(CORK_COLOR[2] + 15), 200);
  // Cork shadow
  fillRect(canvas, corkX, corkY + corkH - 1, corkW, 1,
    clampChannel(CORK_COLOR[0] - 35), clampChannel(CORK_COLOR[1] - 28), clampChannel(CORK_COLOR[2] - 20), 200);

  darkenRim(canvas, 18, 18, 16);
}

function generateVialPotion(canvas: Canvas, w: number, h: number, rng: Rng, liquid: Color): void {
  const glass = tintedGlass(liquid);
  const dark  = shiftColor(glass, -50, -50, -48);

  const bodyW  = Math.max(4, Math.round(w * 0.50));
  const bodyX  = Math.round(w * 0.5 - bodyW * 0.5);
  const corkH  = Math.max(2, Math.round(h * 0.10));
  const bodyTop = corkH + 1;
  const bodyH  = h - bodyTop - 1;

  // Glass body
  fillRect(canvas, bodyX, bodyTop, bodyW, bodyH,
    glass[0], glass[1], glass[2], 210);

  // Liquid (lower 65% of body)
  const liqH = Math.round(bodyH * 0.65);
  const liqY = bodyTop + bodyH - liqH;
  fillRect(canvas, bodyX + 1, liqY, bodyW - 2, liqH,
    liquid[0], liquid[1], liquid[2], 220);

  // Rounded bottom
  stampEllipse(canvas, w * 0.5, bodyTop + bodyH - 0.5, bodyW * 0.50, 1.8,
    glass[0], glass[1], glass[2], 180, 1.8, 0.70);

  // Glass highlight: vertical bright line left side
  drawLine(canvas, bodyX + 1, bodyTop + 2, bodyX + 1, bodyTop + bodyH - 3,
    GLASS_HIGHLIGHT[0], GLASS_HIGHLIGHT[1], GLASS_HIGHLIGHT[2], 190, 1);

  // Shadow right side
  fillRect(canvas, bodyX + bodyW - 1, bodyTop, 1, bodyH,
    dark[0], dark[1], dark[2], 160);

  // Flat stopper cap
  const capW  = bodyW + 2;
  const capX  = Math.round(w * 0.5 - capW * 0.5);
  fillRect(canvas, capX, bodyTop - corkH, capW, corkH,
    CORK_COLOR[0], CORK_COLOR[1], CORK_COLOR[2], 255);
  fillRect(canvas, capX, bodyTop - corkH, capW, 1,
    clampChannel(CORK_COLOR[0] + 35), clampChannel(CORK_COLOR[1] + 25), clampChannel(CORK_COLOR[2] + 15), 200);

  darkenRim(canvas, 18, 18, 16);
}

function generateFlaskPotion(canvas: Canvas, w: number, h: number, rng: Rng, liquid: Color): void {
  const glass  = tintedGlass(liquid);
  const dark   = shiftColor(glass, -50, -50, -48);

  // Wide ellipse body at bottom
  const bodyCx  = w * 0.5;
  const bodyCy  = h * 0.70;
  const bodyRx  = w * 0.38;
  const bodyRy  = h * 0.22;

  // Shadow behind body
  stampEllipse(canvas, bodyCx, bodyCy + bodyRy * 0.22, bodyRx * 1.08, bodyRy * 1.12,
    dark[0], dark[1], dark[2], 200, 2.2, 0.84);

  // Liquid fills lower 60% of body
  stampEllipse(canvas, bodyCx, bodyCy + bodyRy * 0.12, bodyRx * 0.78, bodyRy * 0.80,
    liquid[0], liquid[1], liquid[2], 235, 1.9, 0.82);

  // Glass body
  stampEllipse(canvas, bodyCx, bodyCy, bodyRx, bodyRy,
    glass[0], glass[1], glass[2], 165, 2.0, 0.82);

  // Glass highlight top-left of body
  const hlX0 = Math.round(bodyCx - bodyRx * 0.52);
  const hlY0 = Math.round(bodyCy - bodyRy * 0.65);
  const hlX1 = Math.round(bodyCx - bodyRx * 0.14);
  const hlY1 = Math.round(bodyCy - bodyRy * 0.15);
  drawLine(canvas, hlX0, hlY0, hlX1, hlY1,
    GLASS_HIGHLIGHT[0], GLASS_HIGHLIGHT[1], GLASS_HIGHLIGHT[2], 210, 1);

  // Narrow neck
  const neckW   = Math.max(3, Math.round(w * 0.20));
  const neckX   = Math.round(bodyCx - neckW * 0.5);
  const neckTop = Math.round(bodyCy - bodyRy * 1.0);
  const corkH   = Math.max(2, Math.round(h * 0.10));
  const neckH   = Math.round(bodyRy * 0.90);
  fillRect(canvas, neckX, neckTop, neckW, neckH,
    glass[0], glass[1], glass[2], 200);
  fillRect(canvas, neckX, neckTop, 1, neckH,
    GLASS_HIGHLIGHT[0], GLASS_HIGHLIGHT[1], GLASS_HIGHLIGHT[2], 140);
  fillRect(canvas, neckX + neckW - 1, neckTop, 1, neckH,
    dark[0], dark[1], dark[2], 160);

  // Cork
  const corkW  = neckW + 2;
  const corkX  = Math.round(bodyCx - corkW * 0.5);
  const corkY  = neckTop - corkH;
  fillRect(canvas, corkX, corkY, corkW, corkH,
    CORK_COLOR[0], CORK_COLOR[1], CORK_COLOR[2], 255);
  fillRect(canvas, corkX, corkY, corkW, 1,
    clampChannel(CORK_COLOR[0] + 35), clampChannel(CORK_COLOR[1] + 25), clampChannel(CORK_COLOR[2] + 15), 200);
  fillRect(canvas, corkX, corkY + corkH - 1, corkW, 1,
    clampChannel(CORK_COLOR[0] - 35), clampChannel(CORK_COLOR[1] - 28), clampChannel(CORK_COLOR[2] - 20), 200);

  darkenRim(canvas, 18, 18, 16);
}

export function generatePotion(
  seed: number,
  size = 14,
  options: PotionOptions = {},
): { canvas: Canvas; archetype: PotionArchetype } {
  const archetype = options.archetype ?? potionArchetypeFromSeed(seed);
  const rng       = new Rng(seed);

  const w = clamp(Math.round(size * 0.82) + rng.nextInt(-1, 1), 9, 18);
  const h = clamp(size + rng.nextInt(-1, 1), 12, 20);
  const canvas    = new Canvas(w, h);
  const liquid    = options.liquidColor ?? jitterColor(rng, pick(rng, LIQUID_COLORS), 12);

  if (archetype === PotionArchetype.ROUND) {
    generateRoundPotion(canvas, w, h, rng, liquid);
  } else if (archetype === PotionArchetype.VIAL) {
    generateVialPotion(canvas, w, h, rng, liquid);
  } else {
    generateFlaskPotion(canvas, w, h, rng, liquid);
  }

  return { canvas, archetype };
}

// ================================================================
// Ruins
// ================================================================

export enum RuinsArchetype {
  PILLAR     = 'pillar',
  WALL_CHUNK = 'wall-chunk',
  ARCH_PIECE = 'arch-piece',
}

export interface RuinsOptions {
  archetype?: RuinsArchetype;
  stoneColor?: Color;
}

function ruinsArchetypeFromSeed(seed: number): RuinsArchetype {
  const r = (seed >>> 0) % 3;
  if (r === 0) return RuinsArchetype.PILLAR;
  if (r === 1) return RuinsArchetype.WALL_CHUNK;
  return RuinsArchetype.ARCH_PIECE;
}

function pickStoneColor(rng: Rng): Color {
  return jitterColor(rng, pick(rng, STONE_COLORS), 16);
}

function addCrack(canvas: Canvas, rng: Rng, x: number, y: number, w: number, h: number, stone: Color): void {
  const crackR = clampChannel(stone[0] - 38);
  const crackG = clampChannel(stone[1] - 38);
  const crackB = clampChannel(stone[2] - 36);
  const sx = x + rng.nextInt(2, w - 3);
  const sy = y + rng.nextInt(1, Math.max(1, Math.round(h * 0.4)));
  const ex = sx + rng.nextInt(-3, 3);
  const ey = sy + rng.nextInt(2, Math.max(2, Math.round(h * 0.5)));
  drawLine(canvas, sx, sy, ex, Math.min(ey, y + h - 1), crackR, crackG, crackB, 200, 1);
}

function generatePillar(canvas: Canvas, w: number, h: number, rng: Rng, stone: Color): void {
  const sectionCount = rng.nextInt(2, 4);
  const sectionH     = Math.floor((h * 0.88) / sectionCount);
  const baseY        = h - 1;
  const shadow       = shiftColor(stone, -38, -38, -36);
  const highlight    = shiftColor(stone,  36,  36,  34);
  const mortar: Color = [
    clampChannel(stone[0] - 22),
    clampChannel(stone[1] - 22),
    clampChannel(stone[2] - 20),
  ];

  for (let s = 0; s < sectionCount; s++) {
    // Vary width slightly per section for worn look
    const jitterW = rng.nextInt(-1, 1);
    const secW    = clamp(Math.round(w * 0.62) + jitterW, Math.round(w * 0.44), w - 2);
    const secX    = Math.round(w * 0.5 - secW * 0.5);
    const secY    = baseY - (s + 1) * sectionH + 1;
    const c       = jitterColor(rng, stone, 8);

    // Section body
    fillRect(canvas, secX, secY, secW, sectionH - 1,
      c[0], c[1], c[2], 255);

    // Left highlight
    fillRect(canvas, secX, secY, 1, sectionH - 1,
      highlight[0], highlight[1], highlight[2], 170);
    // Right shadow
    fillRect(canvas, secX + secW - 1, secY, 1, sectionH - 1,
      shadow[0], shadow[1], shadow[2], 180);
    // Top highlight
    fillRect(canvas, secX, secY, secW, 1,
      highlight[0], highlight[1], highlight[2], 130);

    // Mortar line below this section (between drums)
    if (s < sectionCount - 1) {
      drawLine(canvas, secX, secY + sectionH - 1, secX + secW - 1, secY + sectionH - 1,
        mortar[0], mortar[1], mortar[2], 220, 1);
    }
  }

  // Broken/chipped top: draw a jagged top edge using a triangle cutout
  const topSec    = sectionCount - 1;
  const topSecW   = clamp(Math.round(w * 0.62), Math.round(w * 0.44), w - 2);
  const topSecX   = Math.round(w * 0.5 - topSecW * 0.5);
  const topSecY   = baseY - sectionCount * sectionH + 1;
  const chipW     = rng.nextInt(3, Math.max(3, Math.round(topSecW * 0.45)));
  const chipSide  = rng.nextFloat() > 0.5 ? 0 : 1;
  const chipX0    = chipSide === 0 ? topSecX : topSecX + topSecW - chipW;
  const chipTipX  = chipX0 + Math.round(chipW * 0.5);
  const chipTipY  = topSecY + rng.nextInt(2, Math.max(2, Math.round(sectionH * 0.7)));

  // "Erase" the chip by drawing transparent triangle over it
  fillTriangle(
    canvas,
    chipX0, topSecY,
    chipX0 + chipW, topSecY,
    chipTipX, chipTipY,
    0, 0, 0, 0,
  );

  // Add 1-2 cracks
  const crackCount = rng.nextInt(1, 2);
  for (let i = 0; i < crackCount; i++) {
    addCrack(canvas, rng, Math.round(w * 0.5 - topSecW * 0.5), topSecY + sectionH, topSecW, (sectionCount - 1) * sectionH, stone);
  }

  darkenRim(canvas, 20, 18, 16);
}

function generateWallChunk(canvas: Canvas, w: number, h: number, rng: Rng, stone: Color): void {
  const shadow    = shiftColor(stone, -36, -36, -34);
  const highlight = shiftColor(stone,  32,  32,  30);
  const mortar: Color = [
    clampChannel(stone[0] - 20),
    clampChannel(stone[1] - 20),
    clampChannel(stone[2] - 18),
  ];

  // Build courses of blocks bottom-to-top; irregular top edge for crumbled look
  const courseH  = rng.nextInt(4, 6);
  const courses  = Math.floor(h * 0.88 / courseH);
  const baseY    = h - 2;

  for (let row = 0; row < courses; row++) {
    const rowY   = baseY - (row + 1) * courseH + 1;
    // Taper the wall width toward the top (crumbled)
    const taperFraction = row / Math.max(1, courses - 1);
    const rowW   = Math.round(w * clamp(0.92 - taperFraction * 0.30, 0.50, 0.92));
    const rowX   = Math.round(w * 0.5 - rowW * 0.5) + rng.nextInt(-1, 1);

    // Alternate block offset per row
    const blockCount  = rng.nextInt(2, 3);
    const blockW      = Math.floor(rowW / blockCount);

    for (let col = 0; col < blockCount; col++) {
      const bx   = rowX + col * blockW + rng.nextInt(0, 1);
      const bw   = blockW - rng.nextInt(0, 1);
      const bh   = courseH - 1;
      const c    = jitterColor(rng, stone, 10);

      fillRect(canvas, bx, rowY, bw, bh, c[0], c[1], c[2], 255);
      // Top-left highlight
      fillRect(canvas, bx, rowY, bw, 1, highlight[0], highlight[1], highlight[2], 150);
      fillRect(canvas, bx, rowY, 1, bh,  highlight[0], highlight[1], highlight[2], 120);
      // Bottom-right shadow
      fillRect(canvas, bx + bw - 1, rowY, 1, bh, shadow[0], shadow[1], shadow[2], 160);
      fillRect(canvas, bx, rowY + bh - 1, bw, 1, shadow[0], shadow[1], shadow[2], 130);
    }

    // Mortar line between courses
    drawLine(canvas, rowX, rowY + courseH - 1, rowX + rowW - 1, rowY + courseH - 1,
      mortar[0], mortar[1], mortar[2], 200, 1);
  }

  // Crack detail
  addCrack(canvas, rng, 1, Math.round(h * 0.1), w - 2, Math.round(h * 0.65), stone);

  darkenRim(canvas, 20, 18, 16);
}

function generateArchPiece(canvas: Canvas, w: number, h: number, rng: Rng, stone: Color): void {
  const shadow    = shiftColor(stone, -36, -36, -34);
  const highlight = shiftColor(stone,  32,  32,  30);
  const mortar: Color = [
    clampChannel(stone[0] - 20),
    clampChannel(stone[1] - 20),
    clampChannel(stone[2] - 18),
  ];

  // The arch is a quarter of a circle drawn as stacked rectangular voussoir blocks
  // radiating from an implied centre below the canvas
  const cx     = Math.round(w * 0.15);   // arch centre X (left side)
  const cy     = h - 1;                   // arch centre Y (bottom of canvas)
  const rInner = Math.round(h * 0.55);
  const rOuter = Math.round(h * 0.90);

  const segCount = rng.nextInt(4, 6);     // number of arch stones

  for (let s = 0; s < segCount; s++) {
    // Angle range: 0 (horizontal) → ~80° (near vertical)
    const t0 = (s    / segCount) * (Math.PI * 0.44);
    const t1 = ((s + 1) / segCount) * (Math.PI * 0.44);
    const tMid = (t0 + t1) * 0.5;

    // Four corners of this arch block
    const ix0 = Math.round(cx + Math.cos(t0) * rInner);
    const iy0 = Math.round(cy - Math.sin(t0) * rInner);
    const ix1 = Math.round(cx + Math.cos(t1) * rInner);
    const iy1 = Math.round(cy - Math.sin(t1) * rInner);
    const ox0 = Math.round(cx + Math.cos(t0) * rOuter);
    const oy0 = Math.round(cy - Math.sin(t0) * rOuter);
    const ox1 = Math.round(cx + Math.cos(t1) * rOuter);
    const oy1 = Math.round(cy - Math.sin(t1) * rOuter);

    const c = jitterColor(rng, stone, 9);

    // Draw the voussoir as two triangles forming a quad
    fillTriangle(canvas, ix0, iy0, ix1, iy1, ox0, oy0, c[0], c[1], c[2], 255);
    fillTriangle(canvas, ix1, iy1, ox1, oy1, ox0, oy0, c[0], c[1], c[2], 255);

    // Face highlight (top-left direction favoured when angle < 45°)
    const isUpperHalf = tMid < Math.PI * 0.22;
    if (isUpperHalf) {
      fillTriangle(canvas, ox0, oy0, ox1, oy1,
        Math.round((ox0 + ox1) * 0.5), Math.round((oy0 + oy1) * 0.5),
        highlight[0], highlight[1], highlight[2], 80);
    }

    // Mortar joint line between this block and next
    if (s < segCount - 1) {
      drawLine(canvas, ix1, iy1, ox1, oy1, mortar[0], mortar[1], mortar[2], 220, 1);
    }

    // Horizontal texture lines within the block (stone layering)
    const lineY = Math.round((iy0 + iy1) * 0.5);
    const lineX0 = Math.min(ix0, ix1) + 1;
    const lineX1 = Math.max(ox0, ox1) - 1;
    if (lineX1 > lineX0) {
      drawLine(canvas, lineX0, lineY, lineX1, lineY,
        shadow[0], shadow[1], shadow[2], 70, 1);
    }
  }

  // Crack detail on the arch face
  addCrack(canvas, rng, cx, Math.round(h * 0.05), w - cx - 1, Math.round(h * 0.80), stone);

  darkenRim(canvas, 20, 18, 16);
}

export function generateRuins(
  seed: number,
  size = 16,
  options: RuinsOptions = {},
): { canvas: Canvas; archetype: RuinsArchetype } {
  const archetype  = options.archetype ?? ruinsArchetypeFromSeed(seed);
  const rng        = new Rng(seed);
  const actualSize = clamp(size + rng.nextInt(-1, 1), 14, 24);
  const w          = actualSize;
  const h          = clamp(Math.round(actualSize * 1.25), 16, 28);
  const canvas     = new Canvas(w, h);
  const stone      = options.stoneColor ?? pickStoneColor(rng);

  if (archetype === RuinsArchetype.PILLAR) {
    generatePillar(canvas, w, h, rng, stone);
  } else if (archetype === RuinsArchetype.WALL_CHUNK) {
    generateWallChunk(canvas, w, h, rng, stone);
  } else {
    generateArchPiece(canvas, w, h, rng, stone);
  }

  return { canvas, archetype };
}
