import { Color3, DynamicTexture, Scene, StandardMaterial } from '@babylonjs/core';

/** Procedural surface textures — the zero-asset rule holds: every texture in the
 *  game is drawn onto a DynamicTexture at boot. */

export interface GridOpts {
  base: string; //   fill color
  line: string; //   fine cell line
  bold?: string; //  super-grid line (every 4 cells)
  scuff?: boolean; // subtle wear blotches
}

/** One tileable grid cell (2×2 m in world units by convention — set uScale = size/2). */
export function gridTexture(scene: Scene, name: string, opts: GridOpts): DynamicTexture {
  const size = 256;
  const tex = new DynamicTexture(name, { width: size, height: size }, scene, true);
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  ctx.fillStyle = opts.base;
  ctx.fillRect(0, 0, size, size);

  if (opts.scuff) {
    // Faint uneven blotches so big floors don't read as one flat color.
    for (let i = 0; i < 26; i++) {
      const s = Math.sin(i * 91.7) * 43758.55;
      const r = s - Math.floor(s);
      const s2 = Math.sin(i * 33.1) * 24634.63;
      const r2 = s2 - Math.floor(s2);
      ctx.fillStyle = i % 2 ? '#ffffff' : '#000000';
      ctx.globalAlpha = 0.018 + r2 * 0.02;
      ctx.beginPath();
      ctx.ellipse(r * size, r2 * size, 20 + r * 46, 14 + r2 * 30, r * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // fine 1m sub-grid (2 cells per tile)
  ctx.strokeStyle = opts.line;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(size / 2, 0); ctx.lineTo(size / 2, size);
  ctx.moveTo(0, size / 2); ctx.lineTo(size, size / 2);
  ctx.stroke();
  // bold 2m tile edge
  ctx.strokeStyle = opts.bold ?? opts.line;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);
  ctx.globalAlpha = 1;
  tex.update(false);
  return tex;
}

/** Diagonal hazard stripes (for dock edges, lever plinths, restricted floors). */
export function hazardTexture(scene: Scene, name: string, a = '#c9a13b', b = '#20222a'): DynamicTexture {
  const size = 128;
  const tex = new DynamicTexture(name, { width: size, height: size }, scene, true);
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  ctx.fillStyle = b;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = a;
  const w = 24;
  for (let x = -size; x < size * 2; x += w * 2) {
    ctx.beginPath();
    ctx.moveTo(x, size);
    ctx.lineTo(x + size, 0);
    ctx.lineTo(x + size + w, 0);
    ctx.lineTo(x + w, size);
    ctx.fill();
  }
  tex.update(false);
  return tex;
}

/** A floor material with the standard 2m grid; size = mesh dimension in metres. */
export function gridFloorMat(
  scene: Scene, name: string, w: number, d: number, opts: GridOpts,
): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  const tex = gridTexture(scene, name + '-tex', opts);
  tex.uScale = w / 2;
  tex.vScale = d / 2;
  m.diffuseTexture = tex;
  m.diffuseColor = Color3.White();
  m.specularColor = new Color3(0.04, 0.04, 0.05);
  return m;
}
