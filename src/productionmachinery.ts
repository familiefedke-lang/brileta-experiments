/** Procedural production machinery sprite generation. */
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

export enum ProductionMachineryArchetype {
  CONVEYOR = 'conveyor',
  PRESS    = 'press',
  FURNACE  = 'furnace',
  DRILL    = 'drill',
}

function archetypeFromSeed(seed: number): ProductionMachineryArchetype {
  const r = (seed >>> 0) % 4;
  if (r === 0) return ProductionMachineryArchetype.CONVEYOR;
  if (r === 1) return ProductionMachineryArchetype.PRESS;
  if (r === 2) return ProductionMachineryArchetype.FURNACE;
  return ProductionMachineryArchetype.DRILL;
}

// ----------------------------------------------------------------
// Palettes
// ----------------------------------------------------------------

const INDUSTRIAL_BODY: Color[] = [
  [130, 130, 135],
  [110, 112, 118],
  [85,  88,  95],
  [155, 152, 148],
  [60,  65,  70],
];

const BELT_COLORS: Color[] = [
  [55, 50, 42],
  [45, 42, 35],
  [65, 58, 48],
];

const INDICATOR_COLORS: RGBA[] = [
  [220, 60,  40,  230],
  [60,  200, 80,  230],
  [240, 190, 40,  230],
  [80,  130, 220, 230],
];

// ----------------------------------------------------------------
// CONVEYOR
// ----------------------------------------------------------------

function generateConveyor(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const base  = pick(rng, INDUSTRIAL_BODY);
  const dark  = shiftColor(base, -38, -38, -35);
  const light = shiftColor(base,  30,  30,  28);
  const belt  = pick(rng, BELT_COLORS);

  // Frame / housing
  const frameH = Math.max(3, Math.round(h * 0.28));
  fillRect(canvas, 0, 0, w, frameH, base[0], base[1], base[2], 255);
  fillRect(canvas, 0, h - frameH, w, frameH, base[0], base[1], base[2], 255);

  // Belt track area
  const beltY = frameH;
  const beltH = h - frameH * 2;
  if (beltH > 1) {
    fillRect(canvas, 1, beltY, w - 2, beltH, belt[0], belt[1], belt[2], 255);

    // Belt groove lines
    const grooveCount = rng.nextInt(3, 6);
    for (let i = 0; i < grooveCount; i++) {
      const gx = Math.round(1 + i * (w - 2) / grooveCount);
      fillRect(canvas, gx, beltY, 1, beltH,
        shiftColor(belt, -20, -18, -14)[0],
        shiftColor(belt, -20, -18, -14)[1],
        shiftColor(belt, -20, -18, -14)[2], 160);
    }

    // Belt highlight top
    fillRect(canvas, 1, beltY, w - 2, 1,
      shiftColor(belt, 22, 20, 16)[0],
      shiftColor(belt, 22, 20, 16)[1],
      shiftColor(belt, 22, 20, 16)[2], 120);
  }

  // Drive rollers at each end
  const rollerR = frameH * 0.45;
  const rollerColor: Color = shiftColor(base, 18, 18, 16);
  stampEllipse(canvas, Math.round(w * 0.12), Math.round(h / 2),
    rollerR, rollerR * 1.1,
    rollerColor[0], rollerColor[1], rollerColor[2], 230, 1.8, 0.6);
  stampEllipse(canvas, Math.round(w * 0.88), Math.round(h / 2),
    rollerR, rollerR * 1.1,
    rollerColor[0], rollerColor[1], rollerColor[2], 230, 1.8, 0.6);

  // Frame highlights / shadows
  fillRect(canvas, 0, 0, w, 1, light[0], light[1], light[2], 140);
  fillRect(canvas, 0, h - 1, w, 1, dark[0], dark[1], dark[2], 150);
  fillRect(canvas, 0, 0, 1, h, light[0], light[1], light[2], 110);
  fillRect(canvas, w - 1, 0, 1, h, dark[0], dark[1], dark[2], 110);

  // Indicator LED
  const led = pick(rng, INDICATOR_COLORS);
  stampEllipse(canvas, w - 4, 2, 1.5, 1.5, led[0], led[1], led[2], led[3], 1.6, 0.6);

  darkenRim(canvas, 20, 20, 18);
}

// ----------------------------------------------------------------
// PRESS
// ----------------------------------------------------------------

function generatePress(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const base  = pick(rng, INDUSTRIAL_BODY);
  const dark  = shiftColor(base, -40, -40, -38);
  const light = shiftColor(base,  32,  32,  30);

  const baseH = Math.max(4, Math.round(h * 0.28));
  const armW  = Math.max(3, Math.round(w * 0.35));
  const armX  = Math.round((w - armW) / 2);

  // Base plate
  fillRect(canvas, 0, h - baseH, w, baseH,
    base[0], base[1], base[2], 255);
  fillRect(canvas, 0, h - baseH, w, 1,
    light[0], light[1], light[2], 140);
  fillRect(canvas, 0, h - 1, w, 1,
    dark[0], dark[1], dark[2], 160);

  // Vertical arm / column
  const colTopY = Math.round(h * 0.10);
  const colH    = h - baseH - colTopY;
  fillRect(canvas, armX, colTopY, armW, colH,
    shiftColor(base, -12, -12, -10)[0],
    shiftColor(base, -12, -12, -10)[1],
    shiftColor(base, -12, -12, -10)[2], 255);
  fillRect(canvas, armX, colTopY, 1, colH,
    light[0], light[1], light[2], 120);
  fillRect(canvas, armX + armW - 1, colTopY, 1, colH,
    dark[0], dark[1], dark[2], 120);

  // Top cross-beam
  fillRect(canvas, 0, colTopY, w, Math.max(3, Math.round(h * 0.12)),
    base[0], base[1], base[2], 255);
  fillRect(canvas, 0, colTopY, w, 1,
    light[0], light[1], light[2], 140);

  // Ram / punch (descending)
  const ramH = Math.max(4, Math.round(h * 0.22));
  const ramY = colTopY + Math.round(h * 0.12) + rng.nextInt(0, 4);
  fillRect(canvas, armX + 1, ramY, armW - 2, ramH,
    shiftColor(base, 15, 15, 14)[0],
    shiftColor(base, 15, 15, 14)[1],
    shiftColor(base, 15, 15, 14)[2], 255);
  fillRect(canvas, armX + 1, ramY + ramH - 2, armW - 2, 2,
    dark[0], dark[1], dark[2], 180);
  strokeRect(canvas, armX + 1, ramY, armW - 2, ramH,
    dark[0], dark[1], dark[2], 180, 1);

  // Indicator panel on side
  const led = pick(rng, INDICATOR_COLORS);
  stampEllipse(canvas, armX - 4, Math.round(h * 0.40),
    1.5, 1.5, led[0], led[1], led[2], led[3], 1.6, 0.6);

  darkenRim(canvas, 20, 20, 18);
}

// ----------------------------------------------------------------
// FURNACE
// ----------------------------------------------------------------

function generateFurnace(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const base  = pick(rng, INDUSTRIAL_BODY);
  const dark  = shiftColor(base, -42, -42, -40);
  const light = shiftColor(base,  28,  28,  26);

  // Main body
  const margin = 1;
  fillRect(canvas, margin, margin, w - margin * 2, h - margin * 2,
    base[0], base[1], base[2], 255);

  // Door opening (firebox) – dark rect with glow
  const doorX = Math.round(w * 0.14);
  const doorY = Math.round(h * 0.28);
  const doorW = Math.round(w * 0.72);
  const doorH = Math.round(h * 0.44);

  fillRect(canvas, doorX, doorY, doorW, doorH, 20, 14, 10, 255);
  // Orange/red glow from inside
  const glowAlpha = rng.nextInt(180, 230);
  fillRect(canvas, doorX + 2, doorY + 2, doorW - 4, doorH - 4,
    rng.nextInt(180, 220), rng.nextInt(60, 100), 10, glowAlpha);
  // Central bright spot
  stampEllipse(canvas, doorX + Math.round(doorW / 2), doorY + Math.round(doorH / 2),
    doorW * 0.28, doorH * 0.22,
    240, 180, 60, 200, 2.0, 0.3);

  strokeRect(canvas, doorX, doorY, doorW, doorH, dark[0], dark[1], dark[2], 220, 1);

  // Pipe / chimney on top
  const pipeW = Math.max(3, Math.round(w * 0.18));
  const pipeX = Math.round(w * 0.65);
  const pipeH = Math.round(h * 0.22);
  fillRect(canvas, pipeX, 0, pipeW, pipeH + margin,
    shiftColor(base, -15, -15, -13)[0],
    shiftColor(base, -15, -15, -13)[1],
    shiftColor(base, -15, -15, -13)[2], 255);
  fillRect(canvas, pipeX, 0, 1, pipeH,
    light[0], light[1], light[2], 120);

  // Control panel below door
  const panelY = doorY + doorH + 2;
  if (panelY < h - margin - 2) {
    const nButtons = rng.nextInt(2, 4);
    const bW = 3;
    for (let i = 0; i < nButtons; i++) {
      const bx = doorX + 1 + i * (bW + 2);
      const btn = pick(rng, INDICATOR_COLORS);
      fillRect(canvas, bx, panelY, bW, 3,
        btn[0], btn[1], btn[2], btn[3]);
    }
  }

  // Frame edges
  fillRect(canvas, margin, margin, w - margin * 2, 1,
    light[0], light[1], light[2], 140);
  fillRect(canvas, margin, h - margin - 1, w - margin * 2, 1,
    dark[0], dark[1], dark[2], 160);

  darkenRim(canvas, 20, 20, 18);
}

// ----------------------------------------------------------------
// DRILL
// ----------------------------------------------------------------

function generateDrill(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const base  = pick(rng, INDUSTRIAL_BODY);
  const dark  = shiftColor(base, -38, -38, -35);
  const light = shiftColor(base,  30,  30,  28);

  const armW = Math.max(4, Math.round(w * 0.45));
  const armX = Math.round((w - armW) / 2);

  // Upper housing / motor block
  const motorH = Math.round(h * 0.35);
  fillRect(canvas, armX - 2, 1, armW + 4, motorH,
    base[0], base[1], base[2], 255);
  fillRect(canvas, armX - 2, 1, armW + 4, 1,
    light[0], light[1], light[2], 150);
  strokeRect(canvas, armX - 2, 1, armW + 4, motorH,
    dark[0], dark[1], dark[2], 180, 1);

  // Cooling fins on motor
  const finCount = rng.nextInt(2, 4);
  for (let i = 0; i < finCount; i++) {
    const fy = 2 + Math.round(i * (motorH - 2) / finCount);
    fillRect(canvas, armX - 2, fy, armW + 4, 1,
      dark[0], dark[1], dark[2], 100);
  }

  // Chuck / bit holder
  const chuckH = Math.max(3, Math.round(h * 0.12));
  const chuckW = Math.max(3, Math.round(armW * 0.65));
  const chuckX = armX + Math.round((armW - chuckW) / 2);
  fillRect(canvas, chuckX, 1 + motorH, chuckW, chuckH,
    shiftColor(base, 20, 20, 18)[0],
    shiftColor(base, 20, 20, 18)[1],
    shiftColor(base, 20, 20, 18)[2], 255);

  // Drill bit
  const bitW = Math.max(2, Math.round(chuckW * 0.45));
  const bitX = chuckX + Math.round((chuckW - bitW) / 2);
  const bitY = 1 + motorH + chuckH;
  const bitH = h - bitY - 1;
  if (bitH > 2) {
    fillRect(canvas, bitX, bitY, bitW, bitH,
      shiftColor(base, 22, 20, 15)[0],
      shiftColor(base, 22, 20, 15)[1],
      shiftColor(base, 22, 20, 15)[2], 255);
    fillRect(canvas, bitX, bitY, 1, bitH,
      light[0], light[1], light[2], 120);
    // Bit tip – triangle-like taper
    const tipCx = bitX + Math.round(bitW / 2);
    drawLine(canvas, bitX, bitY + bitH - 1, tipCx, bitY + bitH + 2,
      dark[0], dark[1], dark[2], 200, 1);
    drawLine(canvas, bitX + bitW, bitY + bitH - 1, tipCx, bitY + bitH + 2,
      dark[0], dark[1], dark[2], 200, 1);
    // Helical flutes
    const fluteCount = rng.nextInt(2, 5);
    for (let f = 0; f < fluteCount; f++) {
      const fy = bitY + Math.round(f * bitH / fluteCount);
      fillRect(canvas, bitX, fy, bitW, 1, dark[0], dark[1], dark[2], 80);
    }
  }

  // Indicator LED
  const led = pick(rng, INDICATOR_COLORS);
  stampEllipse(canvas, armX + armW + 1, 3, 1.5, 1.5,
    led[0], led[1], led[2], led[3], 1.6, 0.6);

  darkenRim(canvas, 20, 20, 18);
}

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

export interface ProductionMachineryResult {
  canvas: Canvas;
  archetype: ProductionMachineryArchetype;
}

export function generateProductionMachinery(
  seed: number,
  size = 22,
  archetype?: ProductionMachineryArchetype,
): ProductionMachineryResult {
  archetype = archetype ?? archetypeFromSeed(seed);
  const rng = new Rng(seed);
  const actualSize = clamp(size + rng.nextInt(-2, 3), 16, 30);
  const canvas = new Canvas(actualSize, actualSize);

  switch (archetype) {
    case ProductionMachineryArchetype.CONVEYOR: generateConveyor(canvas, actualSize, actualSize, rng); break;
    case ProductionMachineryArchetype.PRESS:    generatePress(canvas, actualSize, actualSize, rng);    break;
    case ProductionMachineryArchetype.FURNACE:  generateFurnace(canvas, actualSize, actualSize, rng);  break;
    case ProductionMachineryArchetype.DRILL:    generateDrill(canvas, actualSize, actualSize, rng);    break;
  }

  return { canvas, archetype };
}
