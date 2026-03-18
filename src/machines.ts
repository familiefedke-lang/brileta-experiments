/** Procedural machine/device sprite generation. */
import {
  clamp,
  clampChannel,
  darkenRim,
  fillRect,
  stampEllipse,
} from './primitives.js';
import { Rng } from './rng.js';
import { Canvas, type Color, type RGBA } from './types.js';

// ----------------------------------------------------------------
// Archetype
// ----------------------------------------------------------------

export enum MachineArchetype {
  TERMINAL = 'terminal',
  CONSOLE  = 'console',
  SERVER   = 'server',
}

/** Pick archetype from raw seed hash. ~33 % each. */
function archetypeFromSeed(seed: number): MachineArchetype {
  const r = (seed >>> 0) % 3;
  if (r === 0) return MachineArchetype.TERMINAL;
  if (r === 1) return MachineArchetype.CONSOLE;
  return MachineArchetype.SERVER;
}

// ----------------------------------------------------------------
// Color palettes
// ----------------------------------------------------------------

/** Machine body base colors: classic beige, various grays, charcoals. */
const BODY_PALETTES: Color[] = [
  [200, 196, 186],
  [180, 180, 180],
  [160, 158, 152],
  [140, 140, 145],
  [160, 155, 150],
  [60,  65,  70],
  [80,  85,  90],
  [50,  52,  58],
];

/** Screen phosphor / display colors. */
const SCREEN_PALETTES: Color[] = [
  [30, 180, 90],
  [220, 160, 40],
  [80, 160, 220],
  [200, 200, 220],
  [40, 200, 180],
];

/** Button / indicator-LED accent colors (RGBA, premultiplied-ready). */
const BUTTON_COLORS: RGBA[] = [
  [200, 60,  60,  230],
  [60,  190, 80,  230],
  [240, 200, 40,  230],
  [80,  120, 220, 230],
  [200, 80,  180, 230],
  [240, 130, 40,  230],
];

/** Derive shadow / base / highlight triple from a base palette entry. */
function pickBodyColors(rng: Rng): [Color, Color, Color] {
  const base = BODY_PALETTES[rng.nextInt(0, BODY_PALETTES.length - 1)];
  const shadow: Color = [
    clampChannel(base[0] - 32),
    clampChannel(base[1] - 32),
    clampChannel(base[2] - 30),
  ];
  const highlight: Color = [
    clampChannel(base[0] + 30),
    clampChannel(base[1] + 30),
    clampChannel(base[2] + 32),
  ];
  return [shadow, base, highlight];
}

// ----------------------------------------------------------------
// Shared helpers
// ----------------------------------------------------------------

/** Draw a bevel-shaded rectangular chassis panel. */
function drawChassis(
  canvas: Canvas,
  x: number,
  y: number,
  w: number,
  h: number,
  shadow: Color,
  body: Color,
  highlight: Color,
): void {
  fillRect(canvas, x, y, w, h, body[0], body[1], body[2], 255);
  // Bottom and right edges darkened.
  fillRect(canvas, x, y + h - 2, w, 2, shadow[0], shadow[1], shadow[2], 200);
  fillRect(canvas, x + w - 2, y, 2, h, shadow[0], shadow[1], shadow[2], 200);
  // Top and left edges brightened.
  fillRect(canvas, x, y, w, 1, highlight[0], highlight[1], highlight[2], 190);
  fillRect(canvas, x, y, 1, h, highlight[0], highlight[1], highlight[2], 190);
}

/** Draw a recessed screen area (dark bezel + dim glow fill). */
function drawScreen(
  canvas: Canvas,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  screenColor: Color,
  shadow: Color,
): void {
  // One-pixel bezel in shadow color.
  fillRect(canvas, sx - 1, sy - 1, sw + 2, sh + 2, shadow[0], shadow[1], shadow[2], 255);
  // Very dim base fill so the screen looks powered-on.
  const dr = Math.round(screenColor[0] * 0.22);
  const dg = Math.round(screenColor[1] * 0.22);
  const db = Math.round(screenColor[2] * 0.22);
  fillRect(canvas, sx, sy, sw, sh, dr, dg, db, 255);
  // Subtle top-left highlight glint.
  fillRect(canvas, sx, sy, Math.round(sw * 0.40), 1,
    screenColor[0], screenColor[1], screenColor[2], 150);
  fillRect(canvas, sx, sy, 1, Math.round(sh * 0.35),
    screenColor[0], screenColor[1], screenColor[2], 130);
}

// ----------------------------------------------------------------
// Archetype generators
// ----------------------------------------------------------------

/**
 * TERMINAL – a chunky CRT monitor/computer terminal.
 * Layout: boxy chassis, recessed screen in the upper area,
 * a row of small indicator buttons below the screen.
 */
function generateTerminal(canvas: Canvas, size: number, rng: Rng): void {
  const [shadow, body, highlight] = pickBodyColors(rng);
  const screenColor = SCREEN_PALETTES[rng.nextInt(0, SCREEN_PALETTES.length - 1)];

  const margin = Math.max(1, Math.round(size * 0.06));
  const bx = margin, by = margin;
  const bw = size - margin * 2, bh = size - margin * 2;

  drawChassis(canvas, bx, by, bw, bh, shadow, body, highlight);

  // Screen – upper 50-55 % of the interior.
  const padH = Math.max(2, Math.round(bw * 0.12));
  const padV = Math.max(2, Math.round(bh * 0.10));
  const sx = bx + padH, sy = by + padV;
  const sw = bw - padH * 2;
  const sh = Math.round(bh * 0.52);

  drawScreen(canvas, sx, sy, sw, sh, screenColor, shadow);

  // Horizontal scan-line hints on the screen.
  const nLines = rng.nextInt(2, 4);
  for (let i = 0; i < nLines; i++) {
    const ly = sy + Math.round((i + 1) * sh / (nLines + 1));
    fillRect(canvas, sx, ly, sw, 1,
      clampChannel(Math.round(screenColor[0] * 0.45)),
      clampChannel(Math.round(screenColor[1] * 0.45)),
      clampChannel(Math.round(screenColor[2] * 0.45)),
      110);
  }

  // Button row below the screen.
  const panelY = sy + sh + padV;
  const panelH = by + bh - panelY - padV;
  if (panelH >= 3) {
    const btnCount = rng.nextInt(3, 5);
    const btnSz = Math.max(2, Math.round(
      Math.min(panelH * 0.65, (sw) / (btnCount * 1.6)),
    ));
    const totalW = btnCount * btnSz + (btnCount - 1);
    const bStartX = bx + Math.round((bw - totalW) / 2);
    const btnY = panelY + Math.round((panelH - btnSz) / 2);

    for (let i = 0; i < btnCount; i++) {
      const btn = BUTTON_COLORS[rng.nextInt(0, BUTTON_COLORS.length - 1)];
      const px = bStartX + i * (btnSz + 1);
      fillRect(canvas, px, btnY, btnSz, btnSz, btn[0], btn[1], btn[2], btn[3]);
      // Top-edge highlight on each button.
      fillRect(canvas, px, btnY, btnSz, 1,
        clampChannel(btn[0] + 60), clampChannel(btn[1] + 60), clampChannel(btn[2] + 60), 200);
    }

    // Small ventilation slots on the right of the panel.
    const ventX = bx + bw - padH - 2;
    if (ventX > bStartX + totalW + 4) {
      const nVents = Math.min(3, Math.floor(panelH / 3));
      for (let v = 0; v < nVents; v++) {
        fillRect(canvas, ventX - 3, panelY + 1 + v * 3, 3, 1,
          shadow[0], shadow[1], shadow[2], 200);
      }
    }
  }

  darkenRim(canvas, 22, 22, 20);
}

/**
 * CONSOLE – a wide control panel with a data display and a grid
 * of buttons, sliders and indicator LEDs.
 */
function generateConsole(canvas: Canvas, size: number, rng: Rng): void {
  const [shadow, body, highlight] = pickBodyColors(rng);
  const screenColor = SCREEN_PALETTES[rng.nextInt(0, SCREEN_PALETTES.length - 1)];

  const margin = Math.max(1, Math.round(size * 0.06));
  const bx = margin, by = margin;
  const bw = size - margin * 2, bh = size - margin * 2;

  drawChassis(canvas, bx, by, bw, bh, shadow, body, highlight);

  // Wide display in the upper ~40 % of the interior.
  const padX = Math.max(2, Math.round(bw * 0.10));
  const padY = Math.max(2, Math.round(bh * 0.10));
  const sx = bx + padX, sy = by + padY;
  const sw = bw - padX * 2;
  const sh = Math.round(bh * 0.40);

  drawScreen(canvas, sx, sy, sw, sh, screenColor, shadow);

  // Horizontal bar-chart data on screen.
  const nBars = rng.nextInt(3, 6);
  const barH = Math.max(1, Math.round((sh - 4) / (nBars * 2)));
  for (let i = 0; i < nBars; i++) {
    const barLen = Math.round(sw * rng.nextRange(0.2, 0.85));
    const barY = sy + 2 + i * (barH * 2);
    if (barY + barH <= sy + sh - 1) {
      fillRect(canvas, sx + 1, barY, barLen, barH,
        screenColor[0], screenColor[1], screenColor[2], 200);
    }
  }

  // Grid of buttons / controls below the screen.
  const ctrlTopY = sy + sh + padY;
  const ctrlH = by + bh - ctrlTopY - padY;
  if (ctrlH >= 4) {
    const btnRows = rng.nextInt(2, 3);
    const btnCols = rng.nextInt(4, 6);
    const cellW = Math.round(sw / btnCols);
    const cellH = Math.max(2, Math.round(ctrlH / btnRows));

    for (let row = 0; row < btnRows; row++) {
      for (let col = 0; col < btnCols; col++) {
        const px = sx + col * cellW + 1;
        const py = ctrlTopY + row * cellH + 1;
        const pw = cellW - 2, ph = cellH - 2;
        if (pw < 1 || ph < 1) continue;

        const type = rng.nextInt(0, 3);
        if (type === 0) {
          // Colored push-button.
          const btn = BUTTON_COLORS[rng.nextInt(0, BUTTON_COLORS.length - 1)];
          fillRect(canvas, px, py, pw, ph, btn[0], btn[1], btn[2], btn[3]);
          fillRect(canvas, px, py, pw, 1,
            clampChannel(btn[0] + 55), clampChannel(btn[1] + 55), clampChannel(btn[2] + 55), 180);
        } else if (type === 1) {
          // Slider with a moveable nub.
          fillRect(canvas, px, py, pw, ph, shadow[0], shadow[1], shadow[2], 255);
          const nubX = px + rng.nextInt(0, Math.max(0, pw - 2));
          fillRect(canvas, nubX, py, 2, ph, highlight[0], highlight[1], highlight[2], 230);
        } else if (type === 2) {
          // Circular indicator LED.
          const led = BUTTON_COLORS[rng.nextInt(0, BUTTON_COLORS.length - 1)];
          stampEllipse(canvas,
            px + Math.floor(pw / 2), py + Math.floor(ph / 2),
            pw * 0.4, ph * 0.4,
            led[0], led[1], led[2], led[3], 1.5, 0.55);
        } else {
          // Recessed blank panel section.
          fillRect(canvas, px, py, pw, ph,
            clampChannel(body[0] - 12), clampChannel(body[1] - 12), clampChannel(body[2] - 12), 210);
        }
      }
    }
  }

  darkenRim(canvas, 22, 22, 20);
}

/**
 * SERVER – a rack-mounted server unit.
 * Layout: tall chassis, horizontal drive bays with recessed faces,
 * a narrow LED-strip column on the right, a top front-panel strip
 * with a power button and port slots.
 */
function generateServer(canvas: Canvas, size: number, rng: Rng): void {
  const [shadow, body, highlight] = pickBodyColors(rng);
  const accentColor = SCREEN_PALETTES[rng.nextInt(0, SCREEN_PALETTES.length - 1)];

  const margin = Math.max(1, Math.round(size * 0.05));
  const bx = margin, by = margin;
  const bw = size - margin * 2, bh = size - margin * 2;

  drawChassis(canvas, bx, by, bw, bh, shadow, body, highlight);

  // Top front-panel strip.
  const panelH = Math.max(3, Math.round(bh * 0.13));
  fillRect(canvas, bx + 1, by + 1, bw - 2, panelH - 1,
    clampChannel(body[0] - 16), clampChannel(body[1] - 16), clampChannel(body[2] - 16), 255);

  // Power button (glowing dot).
  const pwrCx = bx + Math.round(bw * 0.20);
  const pwrCy = by + Math.round(panelH / 2);
  const pwrR = Math.max(1.5, panelH * 0.28);
  stampEllipse(canvas, pwrCx, pwrCy, pwrR, pwrR,
    accentColor[0], accentColor[1], accentColor[2], 230, 1.6, 0.55);

  // USB / I/O port slots.
  const nPorts = rng.nextInt(1, 3);
  for (let p = 0; p < nPorts; p++) {
    const px = bx + Math.round(bw * (0.40 + p * 0.18));
    fillRect(canvas, px, by + 2, 4, panelH - 3, shadow[0], shadow[1], shadow[2], 255);
    fillRect(canvas, px + 1, by + 3, 2, panelH - 5,
      clampChannel(shadow[0] + 18), clampChannel(shadow[1] + 18), clampChannel(shadow[2] + 18), 180);
  }

  // LED column on the right.
  const ledColW = Math.max(3, Math.round(bw * 0.18));
  const ledX = bx + bw - ledColW - 1;

  // Drive bay rows filling the rest of the chassis height.
  const baysTop = by + panelH + 2;
  const baysH = by + bh - baysTop - 2;
  const rowCount = rng.nextInt(4, 6);
  const rowH = Math.max(3, Math.floor(baysH / rowCount));

  for (let i = 0; i < rowCount; i++) {
    const ry = baysTop + i * rowH;
    const bayW = ledX - bx - 3;

    // Recessed bay face.
    fillRect(canvas, bx + 2, ry + 1, bayW, rowH - 2, shadow[0], shadow[1], shadow[2], 230);
    // Top highlight on bay lip.
    fillRect(canvas, bx + 2, ry + 1, bayW, 1,
      clampChannel(shadow[0] + 22), clampChannel(shadow[1] + 22), clampChannel(shadow[2] + 22), 200);

    // Status LED for this bay.
    const lcy = ry + Math.floor(rowH / 2);
    const lcx = ledX + Math.floor(ledColW / 2);
    const isActive = rng.nextFloat() > 0.35;
    if (isActive) {
      const led = BUTTON_COLORS[rng.nextInt(0, BUTTON_COLORS.length - 1)];
      stampEllipse(canvas, lcx, lcy, 1.5, 1.5, led[0], led[1], led[2], 240, 1.5, 0.6);
    } else {
      stampEllipse(canvas, lcx, lcy, 1.5, 1.5,
        clampChannel(shadow[0] + 12), clampChannel(shadow[1] + 12), clampChannel(shadow[2] + 12),
        200, 1.5, 0.6);
    }
  }

  darkenRim(canvas, 22, 22, 20);
}

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

export interface MachineResult {
  canvas: Canvas;
  archetype: MachineArchetype;
}

export function generateMachine(
  seed: number,
  size = 20,
  archetype?: MachineArchetype,
): MachineResult {
  archetype = archetype ?? archetypeFromSeed(seed);
  const rng = new Rng(seed);

  const actualSize = clamp(size + rng.nextInt(-1, 2), 16, 28);
  const canvas = new Canvas(actualSize, actualSize);

  if (archetype === MachineArchetype.TERMINAL) {
    generateTerminal(canvas, actualSize, rng);
  } else if (archetype === MachineArchetype.CONSOLE) {
    generateConsole(canvas, actualSize, rng);
  } else {
    generateServer(canvas, actualSize, rng);
  }

  return { canvas, archetype };
}
