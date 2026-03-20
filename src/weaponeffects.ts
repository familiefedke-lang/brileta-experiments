/** Procedural weapon-effect sprite generation. */
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

export enum WeaponEffectArchetype {
  BULLET    = 'bullet',
  EXPLOSION = 'explosion',
  SLASH     = 'slash',
  LASER     = 'laser',
  SHOCKWAVE = 'shockwave',
}

function archetypeFromSeed(seed: number): WeaponEffectArchetype {
  const r = (seed >>> 0) % 5;
  if (r === 0) return WeaponEffectArchetype.BULLET;
  if (r === 1) return WeaponEffectArchetype.EXPLOSION;
  if (r === 2) return WeaponEffectArchetype.SLASH;
  if (r === 3) return WeaponEffectArchetype.LASER;
  return WeaponEffectArchetype.SHOCKWAVE;
}

// ----------------------------------------------------------------
// Palettes
// ----------------------------------------------------------------

const MUZZLE_COLORS: RGBA[] = [
  [240, 200, 60,  230],
  [250, 160, 40,  220],
  [255, 230, 80,  230],
];

const EXPLOSION_PALETTES: RGBA[][] = [
  [[240, 60,  15,  225], [240, 130, 20,  200], [255, 210, 50,  175]],
  [[220, 30,  10,  220], [230, 110, 18,  200], [255, 220, 55,  170]],
];

const LASER_COLORS: RGBA[] = [
  [80,  220, 80,  240],
  [80,  160, 240, 240],
  [220, 60,  220, 240],
  [240, 60,  60,  240],
];

// ----------------------------------------------------------------
// BULLET – projectile in flight
// ----------------------------------------------------------------

function generateBullet(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const angle = rng.nextRange(-0.4, 0.4);  // slight randomised trajectory
  const cx = Math.round(w / 2);
  const cy = Math.round(h / 2);

  // Trail / motion blur
  const trailLen = rng.nextInt(4, 8);
  for (let i = trailLen; i >= 1; i--) {
    const tx = cx - Math.round(Math.cos(angle) * i * 2);
    const ty = cy - Math.round(Math.sin(angle) * i * 2);
    const alpha = Math.round(200 * (1 - i / (trailLen + 1)));
    stampEllipse(canvas, tx, ty, 1.2, 0.8,
      240, 220, 140, alpha, 1.8, 0.3);
  }

  // Projectile body
  const bx = cx - Math.round(Math.cos(angle) * 2);
  const by = cy - Math.round(Math.sin(angle) * 2);
  stampEllipse(canvas, bx, by, 2.5, 1.6,
    210, 200, 160, 240, 1.8, 0.55);
  // Copper/brass tip highlight
  stampEllipse(canvas, cx + Math.round(Math.cos(angle) * 2),
    cy + Math.round(Math.sin(angle) * 2),
    1.5, 1.0, 230, 180, 80, 230, 1.6, 0.65);

  // Muzzle flash if near origin (random chance)
  if (rng.nextFloat() > 0.5) {
    const muzzle = pick(rng, MUZZLE_COLORS);
    const mx = cx + Math.round(Math.cos(angle) * 4);
    const my = cy + Math.round(Math.sin(angle) * 4);
    stampEllipse(canvas, mx, my, 3.0, 2.0,
      muzzle[0], muzzle[1], muzzle[2], muzzle[3], 2.2, 0.15);
  }
}

// ----------------------------------------------------------------
// EXPLOSION – burst of debris and fire
// ----------------------------------------------------------------

function generateExplosion(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const palette = pick(rng, EXPLOSION_PALETTES);
  const cx = w / 2 + rng.nextRange(-1, 1);
  const cy = h / 2 + rng.nextRange(-1, 1);
  const radius = Math.min(w, h) * 0.44;

  // Outer smoke / shockwave ring
  const smokeEllipses: EllipseSpec[] = [];
  const smokeCount = rng.nextInt(7, 12);
  for (let i = 0; i < smokeCount; i++) {
    const angle = rng.nextFloat() * Math.PI * 2;
    const dist  = radius * rng.nextRange(0.65, 1.0);
    smokeEllipses.push({
      cx: cx + Math.cos(angle) * dist,
      cy: cy + Math.sin(angle) * dist,
      rx: rng.nextRange(radius * 0.12, radius * 0.26),
      ry: rng.nextRange(radius * 0.10, radius * 0.22),
    });
  }
  batchStampEllipses(canvas, smokeEllipses, 60, 55, 50, 160, 2.0, 0.10);

  // Flame body
  const fireEllipses: EllipseSpec[] = [];
  const fireCount = rng.nextInt(5, 9);
  for (let i = 0; i < fireCount; i++) {
    const angle = rng.nextFloat() * Math.PI * 2;
    const dist  = radius * rng.nextRange(0.0, 0.75);
    fireEllipses.push({
      cx: cx + Math.cos(angle) * dist,
      cy: cy + Math.sin(angle) * dist,
      rx: rng.nextRange(radius * 0.14, radius * 0.30),
      ry: rng.nextRange(radius * 0.14, radius * 0.28),
    });
  }
  const col0 = palette[0];
  batchStampEllipses(canvas, fireEllipses, col0[0], col0[1], col0[2], col0[3], 2.2, 0.15);

  // Mid-range orange
  const col1 = palette[1];
  batchStampEllipses(canvas, fireEllipses.slice(0, Math.round(fireCount * 0.65)),
    col1[0], col1[1], col1[2], col1[3], 2.0, 0.20);

  // Bright yellow core
  const col2 = palette[2];
  stampEllipse(canvas, cx, cy, radius * 0.28, radius * 0.24,
    col2[0], col2[1], col2[2], col2[3], 1.8, 0.35);

  // Flying debris particles
  const debrisCount = rng.nextInt(5, 10);
  for (let i = 0; i < debrisCount; i++) {
    const angle = rng.nextFloat() * Math.PI * 2;
    const dist  = radius * rng.nextRange(0.5, 1.05);
    const dx = clamp(Math.round(cx + Math.cos(angle) * dist), 0, w - 1);
    const dy = clamp(Math.round(cy + Math.sin(angle) * dist), 0, h - 1);
    canvas.setPixel(dx, dy, 40, 35, 30, rng.nextInt(180, 230));
  }
}

// ----------------------------------------------------------------
// SLASH – blade-trail arc
// ----------------------------------------------------------------

const SLASH_COLORS: Color[] = [
  [220, 220, 235],
  [210, 215, 230],
  [230, 225, 240],
];

function generateSlash(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const base  = pick(rng, SLASH_COLORS);
  const lite: Color = [255, 255, 255];
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.42;

  // Arc of the slash – multiple offset lines forming a sweep
  const arcSegments = rng.nextInt(5, 9);
  const startAngle = rng.nextRange(-2.2, -1.2);
  const endAngle   = startAngle + rng.nextRange(1.8, 2.8);

  for (let layer = 0; layer < 3; layer++) {
    const layerRadius = radius * (0.75 + layer * 0.12);
    const alpha = 230 - layer * 55;
    for (let i = 0; i < arcSegments; i++) {
      const a0 = startAngle + (i / arcSegments) * (endAngle - startAngle);
      const a1 = startAngle + ((i + 1) / arcSegments) * (endAngle - startAngle);
      const x0 = clamp(Math.round(cx + Math.cos(a0) * layerRadius), 0, w - 1);
      const y0 = clamp(Math.round(cy + Math.sin(a0) * layerRadius), 0, h - 1);
      const x1 = clamp(Math.round(cx + Math.cos(a1) * layerRadius), 0, w - 1);
      const y1 = clamp(Math.round(cy + Math.sin(a1) * layerRadius), 0, h - 1);
      drawLine(canvas, x0, y0, x1, y1, base[0], base[1], base[2], alpha, 1);
    }
  }

  // Bright edge / glint at the leading tip
  const tipAngle = endAngle;
  const tipX = clamp(Math.round(cx + Math.cos(tipAngle) * radius), 1, w - 2);
  const tipY = clamp(Math.round(cy + Math.sin(tipAngle) * radius), 1, h - 2);
  stampEllipse(canvas, tipX, tipY, 2.0, 2.0,
    lite[0], lite[1], lite[2], 220, 1.8, 0.55);

  // Fading tail
  const tailAngle = startAngle;
  const tailX = clamp(Math.round(cx + Math.cos(tailAngle) * radius * 0.6), 1, w - 2);
  const tailY = clamp(Math.round(cy + Math.sin(tailAngle) * radius * 0.6), 1, h - 2);
  stampEllipse(canvas, tailX, tailY, 3.5, 1.5,
    base[0], base[1], base[2], 100, 2.5, 0.1);
}

// ----------------------------------------------------------------
// LASER – energy beam
// ----------------------------------------------------------------

function generateLaser(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const beamColor = pick(rng, LASER_COLORS);
  const coreColor: RGBA = [
    clamp(beamColor[0] + 40, 0, 255),
    clamp(beamColor[1] + 40, 0, 255),
    clamp(beamColor[2] + 40, 0, 255),
    255,
  ];

  const angle = rng.nextRange(-0.3, 0.3);
  const cx = w / 2;
  const cy = h / 2;

  // Glow halo – wide soft beam
  for (let t = 0; t < 1.0; t += 0.08) {
    const px = clamp(Math.round(cx + Math.cos(angle) * (t - 0.5) * w), 0, w - 1);
    const py = clamp(Math.round(cy + Math.sin(angle) * (t - 0.5) * w), 0, h - 1);
    stampEllipse(canvas, px, py, 4.0, 2.5,
      beamColor[0], beamColor[1], beamColor[2], 70, 2.5, 0.05);
  }

  // Mid glow
  for (let t = 0; t < 1.0; t += 0.05) {
    const px = clamp(Math.round(cx + Math.cos(angle) * (t - 0.5) * w), 0, w - 1);
    const py = clamp(Math.round(cy + Math.sin(angle) * (t - 0.5) * w), 0, h - 1);
    stampEllipse(canvas, px, py, 2.0, 1.2,
      beamColor[0], beamColor[1], beamColor[2], 140, 2.0, 0.15);
  }

  // Hard core beam
  const x0 = clamp(Math.round(cx - Math.cos(angle) * w * 0.48), 0, w - 1);
  const y0 = clamp(Math.round(cy - Math.sin(angle) * w * 0.48), 0, h - 1);
  const x1 = clamp(Math.round(cx + Math.cos(angle) * w * 0.48), 0, w - 1);
  const y1 = clamp(Math.round(cy + Math.sin(angle) * w * 0.48), 0, h - 1);
  drawLine(canvas, x0, y0, x1, y1,
    coreColor[0], coreColor[1], coreColor[2], coreColor[3], 1);

  // Bright terminus flares
  stampEllipse(canvas, x1, y1, 3.0, 3.0,
    coreColor[0], coreColor[1], coreColor[2], 220, 1.8, 0.45);
  stampEllipse(canvas, x0, y0, 3.0, 3.0,
    coreColor[0], coreColor[1], coreColor[2], 180, 2.0, 0.35);
}

// ----------------------------------------------------------------
// SHOCKWAVE – expanding ring
// ----------------------------------------------------------------

function generateShockwave(canvas: Canvas, w: number, h: number, rng: Rng): void {
  const cx = w / 2 + rng.nextRange(-1, 1);
  const cy = h / 2 + rng.nextRange(-1, 1);
  const outerR = Math.min(w, h) * rng.nextRange(0.38, 0.46);
  const ringW  = Math.max(1.5, outerR * rng.nextRange(0.10, 0.18));

  // Choose ring hue: electric-blue, orange, or white
  const hues: Color[] = [
    [100, 180, 240],
    [240, 130, 40],
    [235, 235, 235],
  ];
  const ringBase = pick(rng, hues);
  const ringLite = shiftColor(ringBase, 30, 30, 28);

  // Draw ring by sampling points on the circumference
  const steps = 80;
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    for (let dr = -Math.round(ringW); dr <= Math.round(ringW); dr++) {
      const r = outerR + dr;
      if (r <= 0) continue;
      const px = clamp(Math.round(cx + Math.cos(angle) * r), 0, w - 1);
      const py = clamp(Math.round(cy + Math.sin(angle) * r), 0, h - 1);
      const dist = Math.abs(dr) / ringW;
      const alpha = Math.round((1 - dist) * 200);
      if (alpha <= 0) continue;
      const col = dr === 0 ? ringLite : ringBase;
      const cur = canvas.getPixel(px, py);
      const blended: [number, number, number, number] = [
        clamp(col[0] * alpha / 255 + cur[0] * (1 - alpha / 255), 0, 255),
        clamp(col[1] * alpha / 255 + cur[1] * (1 - alpha / 255), 0, 255),
        clamp(col[2] * alpha / 255 + cur[2] * (1 - alpha / 255), 0, 255),
        clamp(cur[3] + alpha, 0, 255),
      ];
      canvas.setPixel(px, py, blended[0], blended[1], blended[2], blended[3]);
    }
  }

  // Central impact glow
  stampEllipse(canvas, cx, cy, outerR * 0.22, outerR * 0.22,
    ringLite[0], ringLite[1], ringLite[2], 140, 2.5, 0.15);

  // Debris sparks at ring
  const sparkCount = rng.nextInt(4, 8);
  for (let i = 0; i < sparkCount; i++) {
    const angle = rng.nextFloat() * Math.PI * 2;
    const dist  = outerR * rng.nextRange(0.85, 1.15);
    const sx = clamp(Math.round(cx + Math.cos(angle) * dist), 0, w - 1);
    const sy = clamp(Math.round(cy + Math.sin(angle) * dist), 0, h - 1);
    canvas.setPixel(sx, sy, ringLite[0], ringLite[1], ringLite[2], rng.nextInt(180, 230));
  }
}

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

export interface WeaponEffectResult {
  canvas: Canvas;
  archetype: WeaponEffectArchetype;
}

export function generateWeaponEffect(
  seed: number,
  size = 20,
  archetype?: WeaponEffectArchetype,
): WeaponEffectResult {
  archetype = archetype ?? archetypeFromSeed(seed);
  const rng = new Rng(seed);
  const actualSize = clamp(size + rng.nextInt(-2, 2), 14, 26);
  const canvas = new Canvas(actualSize, actualSize);

  switch (archetype) {
    case WeaponEffectArchetype.BULLET:    generateBullet(canvas, actualSize, actualSize, rng);    break;
    case WeaponEffectArchetype.EXPLOSION: generateExplosion(canvas, actualSize, actualSize, rng); break;
    case WeaponEffectArchetype.SLASH:     generateSlash(canvas, actualSize, actualSize, rng);     break;
    case WeaponEffectArchetype.LASER:     generateLaser(canvas, actualSize, actualSize, rng);     break;
    case WeaponEffectArchetype.SHOCKWAVE: generateShockwave(canvas, actualSize, actualSize, rng); break;
  }

  return { canvas, archetype };
}
