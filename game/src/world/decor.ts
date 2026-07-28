import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { drawnMat, hazardTexture } from './textures';

/** Set-dressing factories for mission sites. RULES: decor is never interactable,
 *  and carries NO physics — it can't block carries, walks, or E2E scripts. Roots
 *  parent under a mission/theme root and die with it (dispose(false, true)). */

const solid = (scene: Scene, name: string, hex: string) => {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.FromHexString(hex);
  m.specularColor = new Color3(0.05, 0.05, 0.05);
  return m;
};
const glow = (scene: Scene, name: string, hex: string) => {
  const m = new StandardMaterial(name, scene);
  m.emissiveColor = Color3.FromHexString(hex);
  m.diffuseColor = Color3.Black();
  m.specularColor = Color3.Black();
  return m;
};

/** Free-standing sign on two posts: themed label for a zone ("CHECKOUT", "VAULT"). */
export function zoneSign(scene: Scene, at: Vector3, yaw: number, text: string, accent = '#e8c07a'): TransformNode {
  const root = new TransformNode('dc-sign', scene);
  root.position.copyFrom(at); root.rotation.y = yaw;
  const steel = solid(scene, 'dc-sign-p', '#2c3140');
  for (const dx of [-1.15, 1.15]) {
    const post = MeshBuilder.CreateBox('dc-sign-post', { width: 0.09, height: 2.35, depth: 0.09 }, scene);
    post.parent = root; post.position.set(dx, 1.17, 0); post.material = steel;
  }
  const plate = MeshBuilder.CreatePlane('dc-sign-face', { width: 2.5, height: 0.5 }, scene);
  plate.parent = root; plate.position.set(0, 2.3, -0.02);
  plate.material = drawnMat(scene, 'dc-sign-m' + text, (ctx, w, h) => {
    ctx.fillStyle = '#12151d'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = accent; ctx.lineWidth = 6; ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.font = '700 52px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = accent;
    ctx.fillText(text.toUpperCase().slice(0, 22), w / 2, h / 2 + 2);
  }, 640, 128);
  const back = MeshBuilder.CreateBox('dc-sign-back', { width: 2.5, height: 0.5, depth: 0.05 }, scene);
  back.parent = root; back.position.set(0, 2.3, 0.015); back.material = steel;
  return root;
}

/** Painted floor zone with an optional label — the cheapest "this area means X". */
export function floorZone(
  scene: Scene, at: Vector3, w: number, d: number, hex: string, label?: string, yaw = 0,
): TransformNode {
  const root = new TransformNode('dc-zone', scene);
  root.position.set(at.x, 0, at.z); root.rotation.y = yaw;
  const paint = MeshBuilder.CreateGround('dc-zone-paint', { width: w, height: d }, scene);
  paint.parent = root; paint.position.y = 0.045;
  const m = new StandardMaterial('dc-zone-m', scene);
  m.diffuseColor = Color3.FromHexString(hex);
  m.alpha = 0.55;
  m.specularColor = Color3.Black();
  paint.material = m;
  paint.metadata = { noShadow: true };
  if (label) {
    const tp = MeshBuilder.CreateGround('dc-zone-label', { width: Math.min(w * 0.9, 4), height: 0.8 }, scene);
    tp.parent = root; tp.position.set(0, 0.055, -d / 2 + 0.6);
    tp.material = drawnMat(scene, 'dc-zone-t' + label, (ctx, wpx, hpx) => {
      ctx.clearRect(0, 0, wpx, hpx);
      ctx.font = '700 72px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#c8d4ea';
      ctx.globalAlpha = 0.8;
      ctx.fillText(label.toUpperCase().slice(0, 18), wpx / 2, hpx / 2);
    }, 1024, 160);
    (tp.material as StandardMaterial).emissiveTexture!.hasAlpha = true;
    (tp.material as StandardMaterial).opacityTexture = (tp.material as StandardMaterial).emissiveTexture;
    tp.metadata = { noShadow: true };
  }
  return root;
}

/** Hazard-striped floor strip (dock edges, drill zones, restricted lines). */
export function hazardStrip(scene: Scene, at: Vector3, w: number, d: number, yaw = 0): TransformNode {
  const root = new TransformNode('dc-haz', scene);
  root.position.set(at.x, 0, at.z); root.rotation.y = yaw;
  const s = MeshBuilder.CreateGround('dc-haz-s', { width: w, height: d }, scene);
  s.parent = root; s.position.y = 0.05;
  const m = new StandardMaterial('dc-haz-m', scene);
  const t = hazardTexture(scene, 'dc-haz-t' + Math.random());
  t.uScale = Math.max(1, Math.round(w / 2));
  m.diffuseTexture = t;
  m.specularColor = Color3.Black();
  s.material = m;
  s.metadata = { noShadow: true };
  return root;
}

/** Background row of non-interactive server cabinets — instant "data hall". */
export function serverRow(scene: Scene, at: Vector3, yaw: number, n = 4, accent = '#57c7e3'): TransformNode {
  const root = new TransformNode('dc-racks', scene);
  root.position.copyFrom(at); root.rotation.y = yaw;
  const body = solid(scene, 'dc-rack-b', '#1d212c');
  const led = glow(scene, 'dc-rack-l', accent);
  for (let i = 0; i < n; i++) {
    const b = MeshBuilder.CreateBox('dc-rack', { width: 0.85, height: 1.85, depth: 0.65 }, scene);
    b.parent = root; b.position.set(i * 1.0 - ((n - 1) * 1.0) / 2, 0.925, 0); b.material = body;
    for (let r = 0; r < 3; r++) {
      const l = MeshBuilder.CreateBox('dc-rack-led', { width: 0.5, height: 0.03, depth: 0.02 }, scene);
      l.parent = root;
      l.position.set(b.position.x + (Math.sin(i * 7 + r) * 0.08), 0.5 + r * 0.45, 0.34);
      l.material = led;
    }
  }
  return root;
}

/** Overhead cable tray between two floor points (posts at both ends). */
export function cableTray(scene: Scene, from: Vector3, to: Vector3, h = 2.6): TransformNode {
  const root = new TransformNode('dc-tray', scene);
  const steel = solid(scene, 'dc-tray-m', '#3a4152');
  const dark = solid(scene, 'dc-tray-c', '#20242f');
  const dx = to.x - from.x; const dz = to.z - from.z;
  const len = Math.hypot(dx, dz);
  const yawT = Math.atan2(dx, dz);
  for (const p of [from, to]) {
    const post = MeshBuilder.CreateBox('dc-tray-p', { width: 0.09, height: h, depth: 0.09 }, scene);
    post.parent = root; post.position.set(p.x, h / 2, p.z); post.material = steel;
  }
  const tray = MeshBuilder.CreateBox('dc-tray-t', { width: 0.34, height: 0.08, depth: len }, scene);
  tray.parent = root; tray.position.set((from.x + to.x) / 2, h, (from.z + to.z) / 2);
  tray.rotation.y = yawT; tray.material = steel;
  const cable = MeshBuilder.CreateBox('dc-tray-cb', { width: 0.16, height: 0.05, depth: len }, scene);
  cable.parent = root; cable.position.set((from.x + to.x) / 2, h + 0.065, (from.z + to.z) / 2);
  cable.rotation.y = yawT; cable.material = dark;
  return root;
}

/** Floor pipe run with elbows — reads as plumbing/power between machines. */
export function pipeRun(scene: Scene, from: Vector3, to: Vector3, hex = '#5a6378'): TransformNode {
  const root = new TransformNode('dc-pipe', scene);
  const m = solid(scene, 'dc-pipe-m', hex);
  const dx = to.x - from.x; const dz = to.z - from.z;
  const len = Math.hypot(dx, dz);
  const pipe = MeshBuilder.CreateCylinder('dc-pipe-c', { diameter: 0.16, height: len, tessellation: 10 }, scene);
  pipe.parent = root;
  pipe.position.set((from.x + to.x) / 2, 0.12, (from.z + to.z) / 2);
  pipe.rotation.z = Math.PI / 2;
  pipe.rotation.y = Math.atan2(dx, dz) + Math.PI / 2;
  pipe.material = m;
  for (const p of [from, to]) {
    const elbow = MeshBuilder.CreateSphere('dc-pipe-e', { diameter: 0.2, segments: 8 }, scene);
    elbow.parent = root; elbow.position.set(p.x, 0.12, p.z); elbow.material = m;
  }
  return root;
}

/** Standing site floodlight — warm pool of implied light (emissive head only). */
export function siteLight(scene: Scene, at: Vector3, yaw = 0): TransformNode {
  const root = new TransformNode('dc-light', scene);
  root.position.copyFrom(at); root.rotation.y = yaw;
  const steel = solid(scene, 'dc-light-p', '#2c3140');
  const pole = MeshBuilder.CreateCylinder('dc-light-pole', { diameter: 0.11, height: 3.4, tessellation: 8 }, scene);
  pole.parent = root; pole.position.y = 1.7; pole.material = steel;
  const arm = MeshBuilder.CreateBox('dc-light-arm', { width: 0.08, height: 0.08, depth: 0.55 }, scene);
  arm.parent = root; arm.position.set(0, 3.35, 0.25); arm.material = steel;
  const head = MeshBuilder.CreateBox('dc-light-h', { width: 0.4, height: 0.18, depth: 0.28 }, scene);
  head.parent = root; head.position.set(0, 3.3, 0.52); head.rotation.x = 0.5; head.material = steel;
  const lens = MeshBuilder.CreatePlane('dc-light-l', { width: 0.34, height: 0.2 }, scene);
  lens.parent = root; lens.position.set(0, 3.24, 0.58); lens.rotation.x = 0.5 - Math.PI / 2 + 1.2;
  lens.material = glow(scene, 'dc-light-g', '#e8c07a');
  return root;
}

/** Stack of shipping crates (visual only — the physical ones live in the hub). */
export function crateStack(scene: Scene, at: Vector3, yaw = 0, hex = '#8a6a3c'): TransformNode {
  const root = new TransformNode('dc-crates', scene);
  root.position.copyFrom(at); root.rotation.y = yaw;
  const m = solid(scene, 'dc-crate-m', hex);
  const band = solid(scene, 'dc-crate-b', '#3a3325');
  const mk = (x: number, y: number, z: number, s: number) => {
    const c = MeshBuilder.CreateBox('dc-crate', { size: s }, scene);
    c.parent = root; c.position.set(x, y, z); c.material = m;
    const b = MeshBuilder.CreateBox('dc-crate-band', { width: s + 0.02, height: 0.08, depth: s + 0.02 }, scene);
    b.parent = root; b.position.set(x, y, z); b.material = band;
  };
  mk(0, 0.35, 0, 0.7); mk(0.75, 0.3, 0.15, 0.6); mk(0.28, 0.95, 0.05, 0.5);
  return root;
}

/** Oil-drum style barrels — warehouse/cost dressing. */
export function barrels(scene: Scene, at: Vector3, hex = '#6a7a4a'): TransformNode {
  const root = new TransformNode('dc-barrels', scene);
  root.position.copyFrom(at);
  const m = solid(scene, 'dc-barrel-m', hex);
  const rim = solid(scene, 'dc-barrel-r', '#242a2a');
  for (const [dx, dz, s] of [[0, 0, 1], [0.55, 0.18, 1], [0.22, 0.55, 0.92]] as const) {
    const b = MeshBuilder.CreateCylinder('dc-barrel', { diameter: 0.5 * s, height: 0.75 * s, tessellation: 12 }, scene);
    b.parent = root; b.position.set(dx, 0.375 * s, dz); b.material = m;
    const r = MeshBuilder.CreateCylinder('dc-barrel-rim', { diameter: 0.52 * s, height: 0.04, tessellation: 12 }, scene);
    r.parent = root; r.position.set(dx, 0.55 * s, dz); r.material = rim;
  }
  return root;
}

/** Wall-mounted vent block with fins — texture for otherwise flat walls. */
export function ventBlock(scene: Scene, at: Vector3, yaw = 0): TransformNode {
  const root = new TransformNode('dc-vent', scene);
  root.position.copyFrom(at); root.rotation.y = yaw;
  const m = solid(scene, 'dc-vent-m', '#333a4a');
  const fin = solid(scene, 'dc-vent-f', '#20242f');
  const box = MeshBuilder.CreateBox('dc-vent-b', { width: 1.1, height: 0.8, depth: 0.35 }, scene);
  box.parent = root; box.position.y = 0.6; box.material = m;
  for (let i = 0; i < 4; i++) {
    const f = MeshBuilder.CreateBox('dc-vent-fin', { width: 0.95, height: 0.07, depth: 0.03 }, scene);
    f.parent = root; f.position.set(0, 0.38 + i * 0.15, 0.19); f.rotation.x = 0.5; f.material = fin;
  }
  return root;
}

/** Overhead gantry frame spanning the pad — carries themed strip lights. */
export function gantry(scene: Scene, at: Vector3, yaw: number, span: number, accent: string): TransformNode {
  const root = new TransformNode('dc-gantry', scene);
  root.position.copyFrom(at); root.rotation.y = yaw;
  const steel = solid(scene, 'dc-gantry-m', '#262c3a');
  for (const dx of [-span / 2, span / 2]) {
    const leg = MeshBuilder.CreateBox('dc-gantry-leg', { width: 0.22, height: 4.4, depth: 0.22 }, scene);
    leg.parent = root; leg.position.set(dx, 2.2, 0); leg.material = steel;
  }
  const beam = MeshBuilder.CreateBox('dc-gantry-beam', { width: span, height: 0.3, depth: 0.34 }, scene);
  beam.parent = root; beam.position.y = 4.4; beam.material = steel;
  const strip = MeshBuilder.CreateBox('dc-gantry-strip', { width: span * 0.86, height: 0.07, depth: 0.12 }, scene);
  strip.parent = root; strip.position.y = 4.22; strip.material = glow(scene, 'dc-gantry-g', accent);
  return root;
}

/** Perimeter wall panel segment (dressier than the bare knee wall). */
export function wallPanels(
  scene: Scene, at: Vector3, yaw: number, len: number, accent: string, h = 2.6,
): TransformNode {
  const root = new TransformNode('dc-wallp', scene);
  root.position.copyFrom(at); root.rotation.y = yaw;
  const shell = solid(scene, 'dc-wallp-m', '#1c212e');
  const trim = solid(scene, 'dc-wallp-t', '#2e3547');
  const stripe = glow(scene, 'dc-wallp-g', accent);
  const n = Math.max(1, Math.round(len / 3));
  const w = len / n;
  for (let i = 0; i < n; i++) {
    const x = i * w - len / 2 + w / 2;
    const p = MeshBuilder.CreateBox('dc-wallp-p', { width: w - 0.14, height: h, depth: 0.18 }, scene);
    p.parent = root; p.position.set(x, h / 2, 0); p.material = shell;
    const post = MeshBuilder.CreateBox('dc-wallp-post', { width: 0.16, height: h + 0.25, depth: 0.26 }, scene);
    post.parent = root; post.position.set(x - w / 2, (h + 0.25) / 2, 0); post.material = trim;
  }
  const cap = MeshBuilder.CreateBox('dc-wallp-cap', { width: len, height: 0.09, depth: 0.3 }, scene);
  cap.parent = root; cap.position.set(0, h + 0.07, 0); cap.material = trim;
  const st = MeshBuilder.CreateBox('dc-wallp-stripe', { width: len, height: 0.05, depth: 0.2 }, scene);
  st.parent = root; st.position.set(0, h - 0.35, 0); st.material = stripe;
  return root;
}

/** Corner camera pole — Secure-domain flavor. */
export function cameraPole(scene: Scene, at: Vector3, yawToward = 0): TransformNode {
  const root = new TransformNode('dc-cam', scene);
  root.position.copyFrom(at); root.rotation.y = yawToward;
  const steel = solid(scene, 'dc-cam-m', '#2c3140');
  const pole = MeshBuilder.CreateCylinder('dc-cam-pole', { diameter: 0.1, height: 3.0, tessellation: 8 }, scene);
  pole.parent = root; pole.position.y = 1.5; pole.material = steel;
  const cam = MeshBuilder.CreateBox('dc-cam-b', { width: 0.16, height: 0.16, depth: 0.34 }, scene);
  cam.parent = root; cam.position.set(0, 2.95, 0.15); cam.rotation.x = 0.45; cam.material = steel;
  const eye = MeshBuilder.CreateSphere('dc-cam-eye', { diameter: 0.07, segments: 6 }, scene);
  eye.parent = root; eye.position.set(0, 2.89, 0.32);
  eye.material = glow(scene, 'dc-cam-g', '#e85f5f');
  return root;
}

/** Entry arch over the site spawn — names the site, sells "you have arrived". */
export function entryArch(scene: Scene, at: Vector3, yaw: number, label: string, accent: string): TransformNode {
  const root = new TransformNode('dc-arch', scene);
  root.position.copyFrom(at); root.rotation.y = yaw;
  const steel = solid(scene, 'dc-arch-m', '#232936');
  for (const dx of [-3.2, 3.2]) {
    const leg = MeshBuilder.CreateBox('dc-arch-leg', { width: 0.45, height: 3.8, depth: 0.45 }, scene);
    leg.parent = root; leg.position.set(dx, 1.9, 0); leg.material = steel;
  }
  const beam = MeshBuilder.CreateBox('dc-arch-beam', { width: 7.3, height: 0.55, depth: 0.5 }, scene);
  beam.parent = root; beam.position.y = 4.0; beam.material = steel;
  const face = MeshBuilder.CreatePlane('dc-arch-face', { width: 6.4, height: 0.44 }, scene);
  face.parent = root; face.position.set(0, 4.0, 0.27); face.rotation.y = Math.PI;
  face.material = drawnMat(scene, 'dc-arch-t' + label, (ctx, w, h) => {
    ctx.fillStyle = '#0e1118'; ctx.fillRect(0, 0, w, h);
    ctx.font = '700 58px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = accent;
    ctx.fillText(label.toUpperCase().slice(0, 34), w / 2, h / 2 + 2);
  }, 1280, 96);
  return root;
}
