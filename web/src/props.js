import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

// Category → colour (mirrors the Unity MaterialFactory palette).
export const PALETTE = {
  networking: 0x3585c6, compute: 0xf09c2e, database: 0x7d66d1,
  edge: 0x33b38c, generic: 0x9ea3a0, storage: 0xd9842e, security: 0xd15656,
  nosql: 0x4aa0d6,
};

const CHEF = 0xefefe8, SKIN = 0xeac79e, STEEL = 0x9fa3aa, WARM = 0xfa8c33;
// Neutral set-dressing palette (decoration, deliberately NOT category-coloured so service props keep
// their semantic colour-coding). Shared across worlds.
const WOOD = 0x6f5138, LINEN = 0xe9e2d4, BRASS = 0xb8924a, LEAF = 0x4f7a43, NIGHT = 0x223049, KRAFT = 0xcfa15a;

function mat(color, emissive = false) {
  return new THREE.MeshStandardMaterial({
    color, roughness: 0.85, metalness: 0.0,
    emissive: emissive ? color : 0x000000, emissiveIntensity: emissive ? 0.9 : 0.0,
  });
}
export function box(w, h, d, color, emissive = false) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, emissive)); }
function cyl(r, h, color) { return new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), mat(color)); }
function sph(r, color) { return new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(color)); }
function add(g, mesh, x, y, z, rx = 0, ry = 0, rz = 0) { mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz); g.add(mesh); return mesh; }
function darker(hex, f = 0.6) { const c = new THREE.Color(hex); c.multiplyScalar(f); return c.getHex(); }

// Yaw (about Y) that turns a prop's front (+z) to point from `from` toward `to`. Uses the SAME
// atan2(dx,dz) convention as the movers, so "facing" and "walking toward" always agree.
export function faceYaw(from, to) { return Math.atan2(to[0] - from[0], to[1] - from[1]); }
export function faceYawDeg(from, to) { return THREE.MathUtils.radToDeg(faceYaw(from, to)); }

// Each prop is built ~1 unit, base on the floor (y=0), "front" facing +z.
function person(color) {
  const g = new THREE.Group();
  add(g, new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.34, 6, 14), mat(color)), 0, 0.33, 0);
  add(g, sph(0.15, SKIN), 0, 0.72, 0);
  return g;
}
function cook(color) {
  const g = new THREE.Group();
  const RW = 1.3, body = darker(color, 0.7), top = 0x484c55, steel = STEEL;
  // The chef lives in a movable sub-group so they can work up and down the range.
  const chef = new THREE.Group();
  add(chef, new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.32, 6, 14), mat(CHEF)), 0, 0.31, 0);
  add(chef, sph(0.14, SKIN), 0, 0.66, 0);
  add(chef, cyl(0.15, 0.12, CHEF), 0, 0.78, 0);    // toque band
  add(chef, sph(0.17, CHEF), 0, 0.9, 0);           // toque puff
  chef.position.set(0, 0, -0.24);   // stands behind the line, facing the cooktop / viewer
  g.add(chef); g.userData.chef = chef;
  // The range, in front of the chef (toward the viewer) so the cooktop reads from above.
  add(g, box(RW, 0.5, 0.5, body), 0, 0.25, 0.2);                       // cabinet
  add(g, box(RW, 0.09, 0.06, color), 0, 0.06, 0.45);                  // colour kickplate (front, category accent)
  add(g, box(RW, 0.06, 0.52, top), 0, 0.53, 0.2);                     // cooktop
  add(g, box(RW - 0.18, 0.32, 0.03, darker(color, 0.85)), 0, 0.24, 0.46); // oven door (front face)
  add(g, box(RW - 0.34, 0.03, 0.05, steel), 0, 0.37, 0.48);           // oven handle
  add(g, box(RW, 0.04, 0.04, steel), 0, 1.05, 0.34);                  // hanging utensil rail (high)
  add(g, box(0.03, 0.2, 0.03, steel), -0.4, 0.95, 0.34);
  add(g, box(0.03, 0.2, 0.03, steel), 0.4, 0.95, 0.34);
  // Burners on top: exposed flickering flames on the middle pair, pots on the outer pair.
  const flames = [];
  [-0.46, -0.16, 0.16, 0.46].forEach((x) => add(g, cyl(0.1, 0.02, 0x202227), x, 0.57, 0.2));
  [-0.16, 0.16].forEach((x) => {
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffc24a, emissive: 0xff6400, emissiveIntensity: 2.2, transparent: true, opacity: 0.95 }));
    fl.position.set(x, 0.61, 0.2); fl.scale.y = 1.3; g.add(fl); flames.push(fl);
  });
  g.userData.flames = flames;
  add(g, cyl(0.12, 0.15, 0x73777f), -0.46, 0.67, 0.2);  // pot
  add(g, cyl(0.13, 0.06, 0x73777f), 0.46, 0.63, 0.2);   // pan
  return g;
}
function pass(color) {
  const g = new THREE.Group();
  add(g, box(0.95, 0.5, 0.55, STEEL), 0, 0.25, 0);
  add(g, box(0.95, 0.5, 0.06, color), 0, 0.25, 0.28);   // coloured front
  add(g, box(0.04, 0.55, 0.04, STEEL), -0.36, 0.55, 0);
  add(g, box(0.04, 0.55, 0.04, STEEL), 0.36, 0.55, 0);
  add(g, box(0.82, 0.08, 0.22, WARM, true), 0, 0.82, 0); // heat lamp (glows)
  add(g, box(0.7, 0.03, 0.03, STEEL), 0, 0.62, 0.31);    // ticket rail
  for (let i = 0; i < 3; i++) add(g, box(0.09, 0.13, 0.01, 0xffffff), -0.22 + i * 0.2, 0.7, 0.31);
  add(g, cyl(0.08, 0.02, 0xffffff), -0.18, 0.52, -0.06); // plate
  add(g, sph(0.06, 0xd27a4d), -0.18, 0.55, -0.06);       // food
  return g;
}
function grabAndGo(color) {
  const g = new THREE.Group();
  add(g, box(0.7, 0.28, 0.5, color), 0, 0.14, 0);
  add(g, box(0.66, 0.24, 0.46, 0xccd6e0), 0, 0.4, 0);    // glass case
  add(g, sph(0.1, 0xe6804d), -0.16, 0.54, 0);
  add(g, sph(0.1, 0xf2cc59), 0, 0.54, 0);
  add(g, sph(0.1, 0xd96b6b), 0.16, 0.54, 0);
  add(g, box(0.82, 0.06, 0.55, darker(color, 0.7)), 0, 0.58, 0); // canopy
  add(g, box(0.72, 0.34, 0.04, 0x2a2c30), 0, 0.82, -0.24);        // menu board
  return g;
}
function hostStand(color) {
  const g = new THREE.Group();
  add(g, box(0.2, 0.5, 0.2, darker(color, 0.7)), 0, 0.25, 0);
  add(g, box(0.42, 0.06, 0.3, color), 0, 0.55, 0.05, -0.38, 0, 0); // slanted lectern
  add(g, box(0.34, 0.2, 0.04, color), 0, 0.66, 0);                  // sign
  return g;
}
function serviceDoor(color) {
  const g = new THREE.Group();
  add(g, box(0.1, 0.8, 0.12, color), -0.28, 0.4, 0);
  add(g, box(0.1, 0.8, 0.12, color), 0.28, 0.4, 0);
  add(g, box(0.74, 0.14, 0.16, darker(color, 0.7)), 0, 0.84, 0);   // lintel
  add(g, box(0.42, 0.66, 0.04, darker(color, 0.9)), 0, 0.35, 0.03, 0, 0.32, 0); // door ajar
  add(g, cyl(0.07, 0.02, 0xb8d4e6), 0.02, 0.5, 0.06, Math.PI / 2, 0, 0);        // porthole
  return g;
}
function pantry(color) {
  const g = new THREE.Group();
  add(g, box(0.6, 0.85, 0.5, color), 0, 0.43, 0);
  add(g, box(0.66, 0.08, 0.56, darker(color, 0.7)), 0, 0.89, 0);   // top
  add(g, box(0.04, 0.5, 0.03, darker(color, 0.55)), 0.2, 0.45, 0.26); // handle
  return g;
}
function station(color) {
  const g = new THREE.Group();
  add(g, box(0.6, 0.5, 0.5, color), 0, 0.25, 0);
  add(g, box(0.66, 0.06, 0.56, darker(color, 0.7)), 0, 0.53, 0);
  return g;
}

// Architecture-view primitives.
export function archBlock(color) { return box(1.1, 1.1, 1.1, color); }
export function containerWire(w, h, d, color) {
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d));
  return new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color }));
}

function larder(color) {
  const g = new THREE.Group(); const stock = 0xa9855a, dk = darker(color, 0.6);
  add(g, box(0.05, 0.9, 0.42, dk), -0.34, 0.45, 0);
  add(g, box(0.05, 0.9, 0.42, dk), 0.34, 0.45, 0);
  add(g, box(0.7, 0.9, 0.05, darker(color, 0.75)), 0, 0.45, -0.2);
  for (const y of [0.2, 0.45, 0.7]) add(g, box(0.66, 0.05, 0.4, darker(color, 0.85)), 0, y, 0);
  add(g, box(0.18, 0.18, 0.18, stock), -0.16, 0.3, 0.05);
  add(g, box(0.18, 0.18, 0.18, stock), 0.16, 0.55, 0.05);
  add(g, box(0.18, 0.18, 0.18, stock), -0.04, 0.78, 0.05);
  return g;
}
function coldroom(color) {
  const g = new THREE.Group(); const ice = 0xb8d2e6;
  add(g, box(0.7, 0.85, 0.6, ice), 0, 0.43, 0);
  add(g, box(0.5, 0.7, 0.04, 0xd2e6f2), 0, 0.4, 0.31);
  add(g, box(0.04, 0.3, 0.04, 0x808890), 0.18, 0.4, 0.34);
  add(g, box(0.76, 0.08, 0.66, darker(color, 0.7)), 0, 0.89, 0);
  return g;
}
function securitydesk(color) {
  const g = new THREE.Group(); const key = 0xd9c766;
  add(g, box(0.7, 0.4, 0.4, color), 0, 0.2, 0.1);
  add(g, box(0.74, 0.06, 0.06, darker(color, 0.7)), 0, 0.4, 0.3);
  add(g, box(0.66, 0.5, 0.05, darker(color, 0.8)), 0, 0.55, -0.2);
  for (const x of [-0.2, 0, 0.2]) add(g, box(0.05, 0.12, 0.03, key), x, 0.57, -0.16);
  return g;
}
function bouncer(color) {
  const g = new THREE.Group();
  add(g, new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.34, 6, 14), mat(0x33343c)), -0.12, 0.33, 0);
  add(g, sph(0.15, SKIN), -0.12, 0.72, 0);
  add(g, cyl(0.06, 0.5, color), 0.22, 0.25, 0);
  add(g, sph(0.1, color), 0.22, 0.5, 0);
  return g;
}
function guardpost(color) {
  const g = new THREE.Group();
  add(g, box(0.55, 0.8, 0.5, darker(color, 0.85)), 0, 0.4, 0);
  add(g, box(0.4, 0.3, 0.04, 0xb8d4e6), 0, 0.55, 0.26);
  add(g, box(0.66, 0.1, 0.6, darker(color, 0.6)), 0, 0.85, 0);
  add(g, box(0.5, 0.05, 0.05, 0xe68033), 0.42, 0.3, 0);
  return g;
}
function ticketrail(color) {
  const g = new THREE.Group();
  add(g, box(0.05, 0.55, 0.05, STEEL), -0.42, 0.55, 0);
  add(g, box(0.05, 0.55, 0.05, STEEL), 0.42, 0.55, 0);
  add(g, box(0.92, 0.04, 0.04, STEEL), 0, 0.78, 0);
  for (let i = 0; i < 5; i++) add(g, box(0.11, 0.15, 0.01, 0xffffff), -0.32 + i * 0.16, 0.66, 0);
  add(g, box(0.92, 0.1, 0.3, darker(color, 0.8)), 0, 0.06, 0);
  return g;
}
// A wall of numbered pickup cubbies (DynamoDB — grab any item by its key).
function cubbies(color) {
  const g = new THREE.Group(); const frame = darker(color, 0.55), hole = darker(color, 0.92);
  add(g, box(0.86, 0.92, 0.32, frame), 0, 0.5, 0);                                  // cabinet
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) add(g, box(0.22, 0.22, 0.2, hole), -0.26 + c * 0.26, 0.27 + r * 0.27, 0.1); // cubbies
  add(g, box(0.9, 0.06, 0.36, color), 0, 0.97, 0);                                  // top trim (accent)
  return g;
}
// A monitor on a stand showing gauges (CloudWatch dashboard).
function dashboard(color) {
  const g = new THREE.Group(); const bar = [0x6cda7f, 0xf5c451, 0xe06b6b, 0x66ccff], frame = darker(color, 0.55);
  add(g, box(0.5, 0.1, 0.42, darker(color, 0.45)), 0, 0.05, 0);           // base
  add(g, box(0.14, 0.5, 0.14, frame), 0, 0.3, 0);                         // stand
  add(g, box(1.02, 0.68, 0.13, frame), 0, 0.8, 0);                        // monitor body
  add(g, box(0.9, 0.56, 0.04, 0x12151c), 0, 0.8, 0.08);                   // screen
  for (let i = 0; i < 4; i++) { const h = 0.12 + 0.08 * (i % 3); add(g, box(0.14, h, 0.02, bar[i]), -0.3 + i * 0.2, 0.64 + h / 2, 0.11); }
  return g;
}
// A PA speaker on a post (SNS broadcast / alarm).
function tannoy(color) {
  const g = new THREE.Group(); const dk = darker(color, 0.55);
  add(g, box(0.42, 0.1, 0.42, darker(color, 0.45)), 0, 0.05, 0);          // base
  add(g, box(0.11, 0.8, 0.11, dk), 0, 0.45, 0);                           // post
  add(g, box(0.36, 0.34, 0.3, color), 0, 0.96, 0);                        // speaker box
  add(g, new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.3, 18, 1, true), mat(darker(color, 0.85))), 0, 0.96, 0.3, -Math.PI / 2); // horn (+z)
  return g;
}
// A heavy vault with a dial (KMS — the master keys).
function safe(color) {
  const g = new THREE.Group(); const steel = darker(color, 0.6), gold = 0xd9c766;
  add(g, box(0.72, 0.82, 0.6, steel), 0, 0.42, 0);                 // body
  add(g, box(0.6, 0.68, 0.04, darker(color, 0.82)), 0, 0.42, 0.31); // door
  add(g, cyl(0.11, 0.06, gold), 0.06, 0.46, 0.34, Math.PI / 2, 0, 0); // dial
  add(g, box(0.04, 0.18, 0.04, gold), -0.16, 0.3, 0.34);           // handle
  add(g, box(0.76, 0.06, 0.64, color), 0, 0.85, 0);                // top accent
  return g;
}
// A stack of identical packaged units (containers / images).
function crate(color) {
  const g = new THREE.Group(); const seam = darker(color, 0.55), alt = darker(color, 0.82);
  add(g, box(0.52, 0.3, 0.42, color), 0, 0.15, 0);
  add(g, box(0.52, 0.3, 0.42, alt), 0, 0.47, 0);
  add(g, box(0.48, 0.04, 0.38, seam), 0, 0.31, 0);
  add(g, box(0.48, 0.04, 0.38, seam), 0, 0.63, 0);
  add(g, box(0.16, 0.16, 0.02, seam), 0, 0.3, 0.22);                       // a stamped label
  return g;
}

// A small object that travels along a connection — shaped by the kind of flow.
export function makeToken(flow) {
  const g = new THREE.Group();
  if (flow === 'data') {                 // a plate of food
    add(g, cyl(0.12, 0.025, 0xf2f2f2), 0, 0, 0);
    add(g, sph(0.06, 0xd27a4d), 0, 0.05, 0);
  } else if (flow === 'network') {       // a glowing network packet
    add(g, box(0.15, 0.15, 0.15, 0x8fd0ff, true), 0, 0.04, 0);
  } else if (flow === 'replication') {   // a duplicated ledger
    add(g, box(0.2, 0.05, 0.15, 0xece6f7), -0.02, 0, 0.02);
    add(g, box(0.2, 0.05, 0.15, 0xcdbef0), 0.03, 0.06, -0.03);
  } else {                               // request: an order ticket on a clip
    add(g, box(0.13, 0.18, 0.02, 0xffffff), 0, 0.05, 0);
    add(g, box(0.13, 0.035, 0.03, WARM), 0, 0.15, 0);
  }
  return g;
}

// A neutral courier who walks the floor carrying a token on a tray.
export function makeRunner(color) {
  const g = new THREE.Group();
  add(g, new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.26, 6, 12), mat(0x3a4150)), 0, 0.27, 0);
  add(g, sph(0.13, SKIN), 0, 0.62, 0);
  add(g, box(0.28, 0.04, 0.2, STEEL), 0, 0.44, 0.17);   // tray, held out front (+z)
  add(g, box(0.06, 0.05, 0.06, color), 0.16, 0.46, 0.17); // colour tab = which service it serves
  g.userData.tray = new THREE.Vector3(0, 0.52, 0.18);
  return g;
}

// ---- Optional real glTF models (CC0) -----------------------------------------------------------
// Registry maps a prop kind to a model. A kind with no entry keeps its procedural prop. Models load
// async and swap in when ready, so nothing blocks. Use only where the prop's colour is NOT semantic
// (people are cat 'generic'), so the service-category colour-coding on the other props survives.
export const MODELS = {
  customer: { url: './assets/models/human.glb', scale: 0.18, yaw: 0, y: 0 },
};

const _gltf = new GLTFLoader();
const _modelCache = new Map(); // url -> Promise<gltf>
function _loadModel(url) {
  if (!_modelCache.has(url)) _modelCache.set(url, new Promise((res, rej) => _gltf.load(url, res, undefined, rej)));
  return _modelCache.get(url);
}
// Swap a prop group's procedural children for a registered model, keeping the group's own
// position/rotation/userData. The model is rigged: we play a clip (opts.clip, e.g. 'Idle' or
// 'Walk') via an AnimationMixer stored at group.userData.mixer so the figure isn't a frozen statue;
// the world advances that mixer each frame. Silent fallback to the procedural prop on any failure.
export function applyModel(group, kind, opts = {}) {
  const m = MODELS[kind]; if (!m) return;
  _loadModel(m.url).then((gltf) => {
    const model = cloneSkinned(gltf.scene); // SkeletonUtils → each instance gets its own skeleton (independent animation)
    model.scale.setScalar(m.scale || 1);
    model.rotation.y = m.yaw || 0;
    model.position.y = m.y || 0;
    model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    if (gltf.animations && gltf.animations.length) {
      const want = opts.clip || 'Idle';
      const clip = gltf.animations.find((a) => a.name.includes(want)) || gltf.animations.find((a) => a.name.includes('Idle')) || gltf.animations[0];
      const mixer = new THREE.AnimationMixer(model);
      mixer.clipAction(clip).play();
      mixer.timeScale = opts.timeScale || 1;
      group.userData.mixer = mixer;
    }
    for (let i = group.children.length - 1; i >= 0; i--) group.remove(group.children[i]);
    group.add(model);
  }).catch(() => { /* keep procedural prop */ });
}

// A central hub with radial connectors (Transit Gateway / event bus).
function hub(color) {
  const g = new THREE.Group(); const dk = darker(color, 0.6);
  add(g, cyl(0.1, 0.55, dk), 0, 0.28, 0);                       // post
  add(g, cyl(0.36, 0.18, color), 0, 0.62, 0);                   // hub body
  add(g, cyl(0.42, 0.05, darker(color, 0.45)), 0, 0.73, 0);     // cap ring
  add(g, box(0.18, 0.18, 0.18, color, true), 0, 0.62, 0);       // glowing core
  for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; add(g, box(0.16, 0.06, 0.06, dk), Math.cos(a) * 0.42, 0.62, Math.sin(a) * 0.42, 0, -a, 0); } // spokes
  return g;
}

// A security camera on a post (threat detection — watching for intruders).
function cctv(color) {
  const g = new THREE.Group(); const dk = darker(color, 0.55);
  add(g, box(0.08, 0.8, 0.08, dk), 0, 0.4, 0);                     // post
  add(g, box(0.34, 0.22, 0.4, color), 0, 0.86, 0.05, 0.22, 0, 0); // body, tilted down-forward
  add(g, cyl(0.1, 0.12, darker(color, 0.35)), 0, 0.82, 0.28, Math.PI / 2, 0, 0); // lens (+z)
  add(g, box(0.06, 0.06, 0.06, 0xff5a5a, true), 0.14, 0.97, 0.04); // recording light
  return g;
}

export function makeProp(kind, color) {
  switch (kind) {
    case 'customer': return person(color);
    case 'cook': return cook(color);
    case 'pass': return pass(color);
    case 'grabandgo': return grabAndGo(color);
    case 'host': return hostStand(color);
    case 'servicedoor': return serviceDoor(color);
    case 'pantry': return pantry(color);
    case 'larder': return larder(color);
    case 'coldroom': return coldroom(color);
    case 'securitydesk': return securitydesk(color);
    case 'bouncer': return bouncer(color);
    case 'guardpost': return guardpost(color);
    case 'ticketrail': return ticketrail(color);
    case 'cubbies': return cubbies(color);
    case 'dashboard': return dashboard(color);
    case 'tannoy': return tannoy(color);
    case 'crate': return crate(color);
    case 'safe': return safe(color);
    case 'hub': return hub(color);
    case 'cctv': return cctv(color);
    // Sorting Office world (depot) service props.
    case 'intake': return intakeDesk(color);
    case 'sorter': return sorter(color);
    case 'mailbin': return mailbin(color);
    case 'clerk': return clerk(color);
    case 'conveyor': return conveyor(color);
    // Transit / City world service props.
    case 'district': return district(color);
    case 'interchange': return interchange(color);
    case 'dispatchboard': return dispatchboard(color);
    case 'gate': return gate(color);
    case 'tunnel': return tunnel(color);
    case 'freight': return freight(color);
    // Library / Archive world service props.
    case 'stacks': return stacks(color);
    case 'archive': return archive(color);
    case 'cardcatalog': return cardcatalog(color);
    case 'readingtable': return readingtable(color);
    case 'librarian': return librarian(color);
    case 'branchdesk': return branchdesk(color);
    default: return station(color);
  }
}

// ===== Sorting Office (depot) service props =================================================
// publisher drop-off counter (SNS Publish)
function intakeDesk(color) {
  const g = new THREE.Group(); const dk = darker(color, 0.78);
  add(g, box(0.8, 0.5, 0.5, dk), 0, 0.25, 0);
  add(g, box(0.84, 0.06, 0.54, color), 0, 0.5, 0);          // accent counter top
  add(g, box(0.34, 0.14, 0.22, KRAFT), 0, 0.61, 0.08);       // a parcel waiting to be sent
  add(g, box(0.5, 0.34, 0.04, dk), 0, 0.74, -0.22);          // back board
  add(g, box(0.4, 0.02, 0.02, color, true), 0, 0.86, -0.2);  // glowing "IN" strip
  return g;
}
// SNS topic = a sorting machine with a pigeonhole wall that fans one item to many slots
function sorter(color) {
  const g = new THREE.Group(); const fr = darker(color, 0.6);
  add(g, box(1.0, 1.0, 0.4, fr), 0, 0.5, 0);                 // cabinet
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) add(g, box(0.24, 0.24, 0.18, darker(color, 0.95)), -0.3 + c * 0.3, 0.27 + r * 0.3, 0.12); // pigeonholes
  add(g, box(1.06, 0.08, 0.46, color, true), 0, 1.02, 0);    // glowing sort bar
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.5, 0.28, 4), mat(darker(color, 0.5))), 0, 1.2, 0, 0, Math.PI / 4, 0); // intake hopper on top
  return g;
}
// SQS queue = a labelled bin / chute with letters stacked, waiting to be pulled
function mailbin(color) {
  const g = new THREE.Group();
  add(g, box(0.5, 0.6, 0.42, darker(color, 0.75)), 0, 0.3, 0);
  add(g, box(0.54, 0.06, 0.46, color), 0, 0.6, 0);           // accent rim
  for (let i = 0; i < 4; i++) add(g, box(0.34, 0.02, 0.26, 0xffffff), 0, 0.5 - i * 0.06, 0); // stacked letters peeking out
  add(g, box(0.3, 0.18, 0.02, 0xf0ead8), 0, 0.4, 0.22);      // label card on the front
  return g;
}
// subscriber department = a clerk working at a small sorting desk
function clerk(color) {
  const g = new THREE.Group();
  add(g, new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.3, 6, 12), mat(0x415a76)), 0, 0.3, -0.18);
  add(g, sph(0.14, SKIN), 0, 0.62, -0.18);
  add(g, box(0.6, 0.4, 0.4, darker(color, 0.8)), 0, 0.2, 0.05);
  add(g, box(0.64, 0.05, 0.44, color), 0, 0.4, 0.05);
  add(g, box(0.2, 0.1, 0.14, KRAFT), 0, 0.47, 0.1);          // a parcel being handled
  return g;
}

// Kinesis stream = an ordered conveyor of records several clerks can read at once.
function conveyor(color) {
  const g = new THREE.Group(); const belt = darker(color, 0.5);
  add(g, box(1.5, 0.12, 0.5, belt), 0, 0.5, 0);                                   // belt surface
  add(g, box(1.5, 0.3, 0.06, darker(color, 0.7)), 0, 0.35, 0.27); add(g, box(1.5, 0.3, 0.06, darker(color, 0.7)), 0, 0.35, -0.27); // side rails
  for (const x of [-0.55, 0, 0.55]) add(g, cyl(0.08, 0.52, 0x6a6f78), x, 0.4, 0, Math.PI / 2); // rollers across the belt
  for (let i = 0; i < 3; i++) add(g, box(0.2, 0.14, 0.2, KRAFT), -0.4 + i * 0.4, 0.63, 0);      // records riding the belt
  return g;
}

// ===== Transit / City world service props ====================================================
function district(color) {                                              // a city block (cluster of buildings) = a VPC / region
  const g = new THREE.Group(); const b = darker(color, 0.75);
  add(g, box(0.9, 0.7, 0.9, b), 0, 0.35, 0);
  add(g, box(0.4, 1.1, 0.4, darker(color, 0.9)), -0.2, 0.55, -0.2);     // a taller tower
  add(g, box(0.3, 0.5, 0.3, b), 0.28, 0.25, 0.25);
  for (const [x, y, z] of [[-0.2, 0.7, 0.205], [-0.2, 0.95, 0.205], [0.2, 0.4, 0.46]]) add(g, box(0.08, 0.1, 0.02, 0xffe6a0, true), x, y, z); // lit windows
  add(g, box(1.0, 0.06, 1.0, color), 0, 0.72, 0);                       // accent roofline
  return g;
}
function interchange(color) {                                           // a road interchange / roundabout = Transit Gateway
  const g = new THREE.Group(); const road = 0x2c2f36;
  add(g, cyl(0.5, 0.06, road), 0, 0.06, 0);                             // roundabout disc
  add(g, cyl(0.18, 0.14, color, true), 0, 0.13, 0);                     // glowing centre
  for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; add(g, box(0.5, 0.05, 0.16, road), Math.cos(a) * 0.55, 0.05, Math.sin(a) * 0.55, 0, -a, 0); } // radiating roads
  return g;
}
function dispatchboard(color) {                                         // a departures / dispatch board = Route 53 directing each traveller
  const g = new THREE.Group(); const dk = darker(color, 0.5);
  add(g, box(0.12, 1.0, 0.12, dk), -0.5, 0.5, 0); add(g, box(0.12, 1.0, 0.12, dk), 0.5, 0.5, 0); // posts
  add(g, box(1.2, 0.6, 0.1, 0x12151c), 0, 1.0, 0);                      // board
  for (let r = 0; r < 3; r++) add(g, box(0.9, 0.06, 0.02, [0x6cda7f, 0xf5c451, 0x66ccff][r], true), 0, 1.16 - r * 0.18, 0.06); // glowing rows
  return g;
}
function gate(color) {                                                  // an express-motorway gantry = Global Accelerator anycast entry
  const g = new THREE.Group(); const dk = darker(color, 0.6);
  add(g, box(0.16, 1.0, 0.16, dk), -0.5, 0.5, 0); add(g, box(0.16, 1.0, 0.16, dk), 0.5, 0.5, 0); // gantry posts
  add(g, box(1.2, 0.16, 0.2, dk), 0, 1.0, 0);                           // gantry beam
  add(g, box(0.9, 0.12, 0.05, color, true), 0, 1.0, 0.12);             // glowing sign
  add(g, box(0.26, 0.18, 0.05, 0xffffff), 0, 0.66, 0.1);              // arrow panel
  return g;
}
function tunnel(color) {                                                // a private tunnel portal = Direct Connect / VPC peering
  const g = new THREE.Group(); const stone = darker(color, 0.55);
  add(g, box(1.1, 0.9, 0.4, stone), 0, 0.45, 0);                        // portal block
  add(g, box(0.6, 0.7, 0.12, 0x14171d), 0, 0.38, 0.2);                  // dark opening
  add(g, box(1.16, 0.1, 0.44, color), 0, 0.92, 0);                      // accent lintel
  return g;
}
function freight(color) {                                               // a freight truck = Snow Family / DataSync bulk transfer
  const g = new THREE.Group(); const cab = darker(color, 0.8), body = 0x5a5f68;
  add(g, box(0.5, 0.5, 0.5, cab), -0.55, 0.35, 0);                      // cab
  add(g, box(1.0, 0.7, 0.6, body), 0.25, 0.45, 0);                      // container
  add(g, box(1.02, 0.06, 0.62, color), 0.25, 0.8, 0);                   // accent stripe
  for (const x of [-0.6, -0.2, 0.5]) { add(g, cyl(0.14, 0.1, 0x202227), x, 0.12, 0.3, Math.PI / 2); add(g, cyl(0.14, 0.1, 0x202227), x, 0.12, -0.3, Math.PI / 2); } // wheels
  return g;
}

// ===== Library / Archive world service props ==================================================
function stacks(color) {                                                // open library shelves of books = S3 / data lake
  const g = new THREE.Group(); const fr = darker(color, 0.6); const spine = [0x9a5a4a, 0x4a6a8a, 0x6a8a5a, 0xb0843a, 0x7d66d1];
  add(g, box(0.05, 1.1, 0.5, fr), -0.5, 0.55, 0); add(g, box(0.05, 1.1, 0.5, fr), 0.5, 0.55, 0); add(g, box(1.0, 0.06, 0.5, fr), 0, 1.08, 0);
  for (const y of [0.28, 0.58, 0.88]) { add(g, box(1.0, 0.04, 0.5, darker(fr, 1.2)), 0, y, 0); for (let i = 0; i < 8; i++) add(g, box(0.1, 0.2 + (i % 3) * 0.02, 0.36, spine[i % 5]), -0.42 + i * 0.11, y + 0.13, 0); }
  return g;
}
function archive(color) {                                               // a closed deep-storage cabinet = Glacier / cold tier
  const g = new THREE.Group();
  add(g, box(0.8, 1.0, 0.55, darker(color, 0.7)), 0, 0.5, 0);
  add(g, box(0.6, 0.8, 0.04, darker(color, 0.9)), 0, 0.5, 0.28);        // door
  for (const y of [0.35, 0.6, 0.85]) add(g, box(0.5, 0.02, 0.04, 0x8fa6c0), 0, y, 0.31); // drawer slits
  add(g, box(0.84, 0.06, 0.6, color), 0, 1.02, 0);
  add(g, box(0.1, 0.1, 0.02, 0xb8d2e6, true), 0.18, 0.5, 0.31);         // frost indicator
  return g;
}
function cardcatalog(color) {                                           // a card-catalog cabinet of indexed drawers = RDS
  const g = new THREE.Group(); const wood = darker(color, 0.7);
  add(g, box(0.8, 0.9, 0.5, wood), 0, 0.45, 0);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { add(g, box(0.22, 0.22, 0.04, darker(color, 0.85)), -0.26 + c * 0.26, 0.2 + r * 0.27, 0.26); add(g, box(0.05, 0.03, 0.03, 0xd9c766), -0.26 + c * 0.26, 0.2 + r * 0.27, 0.29); } // drawers + brass pulls
  add(g, box(0.84, 0.06, 0.54, color), 0, 0.9, 0);
  return g;
}
function readingtable(color) {                                          // a reading-room analysis table = Redshift
  const g = new THREE.Group(); const wood = darker(color, 0.7);
  add(g, box(1.2, 0.06, 0.7, wood), 0, 0.55, 0);
  for (const [x, z] of [[-0.5, -0.28], [0.5, -0.28], [-0.5, 0.28], [0.5, 0.28]]) add(g, box(0.06, 0.55, 0.06, darker(wood, 0.8)), x, 0.27, z);
  add(g, box(0.5, 0.06, 0.34, 0x12151c), -0.2, 0.6, 0);                 // an open ledger
  add(g, box(0.04, 0.22, 0.04, BRASS), 0.42, 0.66, -0.12); add(g, box(0.2, 0.08, 0.2, 0x2e6a3a, true), 0.42, 0.78, -0.12); // banker's lamp
  return g;
}
function librarian(color) {                                             // a librarian who searches the stacks = Athena
  const g = new THREE.Group();
  add(g, new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.3, 6, 12), mat(0x5a4a6a)), 0, 0.3, -0.18); add(g, sph(0.14, SKIN), 0, 0.62, -0.18);
  add(g, box(0.7, 0.4, 0.4, darker(color, 0.8)), 0, 0.2, 0.05); add(g, box(0.74, 0.05, 0.44, color), 0, 0.4, 0.05);
  add(g, box(0.16, 0.12, 0.02, 0xffffff), 0, 0.47, 0.12);              // a query slip / catalogue card
  return g;
}
function branchdesk(color) {                                            // a lending / branch desk near readers = CloudFront edge
  const g = new THREE.Group(); const book = [0x9a5a4a, 0x4a6a8a, 0x6a8a5a];
  add(g, box(0.9, 0.5, 0.5, darker(color, 0.75)), 0, 0.25, 0); add(g, box(0.94, 0.06, 0.54, color), 0, 0.5, 0);
  for (let i = 0; i < 3; i++) add(g, box(0.12, 0.16, 0.3, book[i]), -0.2 + i * 0.2, 0.61, 0); // books ready to lend
  add(g, box(0.5, 0.3, 0.04, darker(color, 0.6)), 0, 0.72, -0.22);     // sign
  return g;
}

// The world beyond the building: ground, roads, street trees and a backdrop of other (night-lit)
// buildings, so each scene sits in a neighbourhood instead of a void. Tall buildings go to the back
// and sides; the front (camera side, +z) stays low so the interior is never hidden. Tuned per world.
export function makeExterior(world, b) {
  const g = new THREE.Group();
  const L = b.x - b.w / 2, R = b.x + b.w / 2, BK = -b.d / 2, FR = b.d / 2;
  const cfg = ({
    transit: { tall: 9, lamp: 0xbcd2e0, tree: 0x35502f, ground: 0x191b21, facade: 0x262a33 },
    sortingoffice: { tall: 5, lamp: 0xcfe0a0, tree: 0x3a4a30, ground: 0x1b1d22, facade: 0x2a2c30 },
    library: { tall: 6, lamp: 0xffd9a0, tree: 0x35502f, ground: 0x1c1a18, facade: 0x2b2620 },
    restaurant: { tall: 6, lamp: 0xffce8a, tree: 0x35502f, ground: 0x1b1916, facade: 0x29251f },
  })[world] || { tall: 6, lamp: 0xffd9a0, tree: 0x35502f, ground: 0x1b1b20, facade: 0x262a33 };
  const put = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); };
  put(box(b.w * 3.4, 0.04, b.d * 3.6, cfg.ground), b.x, -0.12, 0);                 // ground
  const roadZ = FR + 2.8;
  put(box(b.w * 2.6, 0.05, 2.4, 0x111318), b.x, -0.09, roadZ);                     // front road
  for (let i = -7; i <= 7; i++) put(box(0.7, 0.06, 0.14, 0x7a7f5a), b.x + i * 1.7, -0.06, roadZ); // lane dashes
  put(box(2.4, 0.05, b.d * 2.2, 0x111318), L - 3.4, -0.09, 0);                     // side roads
  put(box(2.4, 0.05, b.d * 2.2, 0x111318), R + 3.4, -0.09, 0);
  const tree = (x, z, s = 1) => {
    const t = new THREE.Group();
    add(t, cyl(0.1 * s, 0.7 * s, 0x5a4631), 0, 0.35 * s, 0);
    add(t, sph(0.5 * s, cfg.tree), 0, 0.9 * s, 0);
    add(t, sph(0.36 * s, darker(cfg.tree, 1.18)), 0.2 * s, 1.04 * s, 0.1 * s);
    add(t, sph(0.32 * s, darker(cfg.tree, 0.85)), -0.18 * s, 0.98 * s, -0.08 * s);
    t.position.set(x, 0, z); g.add(t);
  };
  const bld = (x, z, w, h, d) => {
    add(g, box(w, h, d, cfg.facade), x, h / 2, z);
    add(g, box(w + 0.12, 0.18, d + 0.12, darker(cfg.facade, 0.7)), x, h, z);        // roof lip
    const cols = Math.max(1, Math.round(w / 0.8)), rows = Math.max(1, Math.round(h / 1.0));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if ((r * 5 + c * 3 + (x * 2 | 0)) % 3 === 0) add(g, box(0.22, 0.3, 0.02, 0xffe0a0, true), x - w / 2 + 0.4 + c * (w / cols), 0.7 + r * 1.0, z + d / 2 + 0.02); // lit windows
  };
  for (let i = 0; i < 7; i++) bld(L + 1 + i * (b.w / 6.5), BK - 4 - (i % 2) * 2.5, 2.4 + (i % 3) * 0.7, cfg.tall - (i % 3) * 2, 2.4); // backdrop skyline
  for (let i = 0; i < 4; i++) { const z = BK + 2 + i * (b.d / 3.5); bld(L - 6 - (i % 2) * 1.4, z, 2.2, cfg.tall - 2 - (i % 2) * 1.5, 2.6); bld(R + 6 + (i % 2) * 1.4, z, 2.2, cfg.tall - 2 - (i % 2) * 1.5, 2.6); } // side buildings
  for (let i = 0; i < 6; i++) tree(L + 1 + i * (b.w / 6), FR + 1.3, 1);             // front-edge trees (low)
  for (let i = 0; i < 3; i++) { tree(L - 1.9, BK + 3 + i * 3, 0.9); tree(R + 1.9, BK + 3 + i * 3, 0.9); } // side trees
  for (let i = -2; i <= 2; i++) { const lp = new THREE.Group(); add(lp, box(0.08, 1.5, 0.08, 0x33363f), 0, 0.75, 0); add(lp, box(0.5, 0.07, 0.07, 0x33363f), 0.21, 1.48, 0); add(lp, box(0.16, 0.1, 0.16, cfg.lamp, true), 0.42, 1.45, 0); lp.position.set(b.x + i * 4.2, 0, roadZ - 1.4); g.add(lp); } // street lamps
  return g;
}

// ===== Set-dressing (ambient decoration) ====================================================
// Never given a userData.blockId by the caller → automatically label-free and non-pickable.
// Animatable pieces tag a child with userData.flicker / userData.diner so one world updater finds them.
function diningTable(o = {}) {
  const g = new THREE.Group(); const top = o.color || WOOD;
  add(g, cyl(0.42, 0.06, top), 0, 0.52, 0);                  // round top
  add(g, cyl(0.05, 0.5, darker(top, 0.7)), 0, 0.26, 0);      // pedestal
  add(g, cyl(0.22, 0.04, darker(top, 0.6)), 0, 0.02, 0);     // foot
  for (const s of [-1, 1]) add(g, cyl(0.09, 0.015, 0xf2f2f2), s * 0.22, 0.555, 0); // two place settings
  add(g, cyl(0.02, 0.1, LINEN), 0, 0.6, 0);                  // candle
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xff8a1e, emissiveIntensity: 2.0, transparent: true, opacity: 0.95 }));
  flame.position.set(0, 0.68, 0); flame.userData.flicker = true; flame.userData.ph = Math.random() * 6.28; flame.userData.base = 2.0; g.add(flame);
  return g;
}
function chair(o = {}) {
  const g = new THREE.Group(); const c = o.color || darker(WOOD, 0.9);
  add(g, box(0.3, 0.04, 0.3, c), 0, 0.26, 0);                // seat
  add(g, box(0.3, 0.34, 0.04, c), 0, 0.43, -0.13);           // back
  for (const [x, z] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) add(g, box(0.04, 0.26, 0.04, darker(c, 0.8)), x, 0.13, z);
  if (o.occupied) { const d = person(o.dinerColor || 0x9a8c7a); d.scale.setScalar(0.9); d.position.set(0, 0.26, 0.03); d.userData.diner = true; d.userData.ph = Math.random() * 6.28; g.add(d); }
  return g;
}
function pendant(o = {}) {
  const g = new THREE.Group();
  add(g, cyl(0.012, 0.5, 0x2a2c30), 0, 0.75, 0);             // cord
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.18, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x3a3d44, emissive: 0xffd9a0, emissiveIntensity: 1.4, side: THREE.DoubleSide }));
  shade.position.set(0, 0.5, 0); shade.userData.flicker = true; shade.userData.ph = Math.random() * 6.28; shade.userData.base = 1.4; g.add(shade);
  return g;
}
function windowPanel(o = {}) {
  const g = new THREE.Group(); const night = o.variant === 'night';
  add(g, box(0.1, 1.0, 1.4, darker(WOOD, 0.5)), 0, 0.7, 0);  // frame (thin in x → sits in a side wall)
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.84, 1.24), new THREE.MeshStandardMaterial({ color: night ? NIGHT : 0xbfe0ff, emissive: night ? 0x2a3b66 : 0x8fb6e6, emissiveIntensity: night ? 0.85 : 0.5 })), 0.04, 0.7, 0);
  add(g, box(0.06, 0.06, 1.3, darker(WOOD, 0.4)), 0, 0.7, 0); add(g, box(0.06, 0.9, 0.06, darker(WOOD, 0.4)), 0, 0.7, 0); // mullions
  return g;
}
function plant(o = {}) {
  const g = new THREE.Group();
  add(g, cyl(0.13, 0.22, 0xb07a4a), 0, 0.11, 0);
  add(g, sph(0.22, LEAF), 0, 0.42, 0); add(g, sph(0.15, darker(LEAF, 1.1)), 0.1, 0.55, 0.05); add(g, sph(0.15, darker(LEAF, 0.9)), -0.1, 0.5, -0.05);
  return g;
}
function potRack(o = {}) {                                    // ceiling-hung; place at y≈1.7
  const g = new THREE.Group();
  add(g, box(1.2, 0.05, 0.3, STEEL), 0, 0.3, 0);
  for (const x of [-0.4, -0.1, 0.2, 0.45]) { add(g, box(0.02, 0.12, 0.02, STEEL), x, 0.2, 0); add(g, cyl(0.1, 0.12, 0x73777f), x, 0.08, 0); }
  return g;
}
function extractorHood(o = {}) {                              // place at y≈1.5 over the line
  const g = new THREE.Group();
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.85, 0.4, 4), mat(darker(STEEL, 0.8))), 0, 0.2, 0, 0, Math.PI / 4, 0);
  add(g, box(1.5, 0.1, 0.8, STEEL), 0, 0.42, 0);
  return g;
}
function prepTable(o = {}) {
  const g = new THREE.Group();
  add(g, box(1.0, 0.06, 0.5, STEEL), 0, 0.52, 0); add(g, box(1.0, 0.46, 0.46, darker(STEEL, 0.7)), 0, 0.26, 0);
  add(g, box(0.34, 0.03, 0.24, WOOD), -0.2, 0.56, 0);        // cutting board
  add(g, box(0.06, 0.12, 0.06, 0x2a2c30), 0.18, 0.6, 0);     // knife block
  return g;
}
function shelving(o = {}) {
  const g = new THREE.Group(); const fr = darker(o.color || WOOD, 0.6), stock = 0xa9855a;
  add(g, box(0.05, 1.1, 0.4, fr), -0.45, 0.55, 0); add(g, box(0.05, 1.1, 0.4, fr), 0.45, 0.55, 0);
  for (const y of [0.3, 0.6, 0.9]) { add(g, box(0.95, 0.04, 0.4, darker(fr, 1.2)), 0, y, 0); for (const x of [-0.28, 0, 0.28]) add(g, box(0.16, 0.16, 0.16, darker(stock, 0.8 + Math.random() * 0.5)), x, y + 0.12, 0); }
  return g;
}
function binDress() { const g = new THREE.Group(); add(g, cyl(0.16, 0.4, darker(STEEL, 0.7)), 0, 0.2, 0); add(g, cyl(0.17, 0.04, STEEL), 0, 0.42, 0); return g; }
function barCounter(o = {}) {
  const g = new THREE.Group(); const top = o.color || WOOD;
  add(g, box(2.0, 0.9, 0.5, darker(top, 0.8)), 0, 0.45, 0); add(g, box(2.1, 0.08, 0.6, top), 0, 0.92, 0);
  for (const x of [-0.7, -0.4, 0.4, 0.7]) add(g, cyl(0.035, 0.3, [0x6a8f5a, 0x8f6a5a, 0x5a6a8f][Math.floor(Math.random() * 3)]), x, 1.07, -0.18); // bottles
  return g;
}
function barStool(o = {}) { const g = new THREE.Group(); add(g, cyl(0.14, 0.04, darker(WOOD, 0.9)), 0, 0.55, 0); add(g, cyl(0.04, 0.55, STEEL), 0, 0.28, 0); add(g, cyl(0.16, 0.03, STEEL), 0, 0.06, 0); return g; }
function officeDesk(o = {}) {
  const g = new THREE.Group();
  add(g, box(0.9, 0.04, 0.5, WOOD), 0, 0.5, 0); add(g, box(0.06, 0.5, 0.46, darker(WOOD, 0.7)), -0.4, 0.25, 0); add(g, box(0.06, 0.5, 0.46, darker(WOOD, 0.7)), 0.4, 0.25, 0);
  add(g, box(0.34, 0.24, 0.03, 0x12151c), 0, 0.66, -0.1); add(g, box(0.36, 0.02, 0.2, 0x2a2c30), 0, 0.53, 0.05); // monitor + keyboard
  return g;
}
function wallArt(o = {}) { const g = new THREE.Group(); add(g, box(0.06, 0.5, 0.7, darker(BRASS, 0.8)), 0, 0, 0); add(g, box(0.02, 0.4, 0.6, o.color || 0x6a8caf), 0.03, 0, 0); return g; } // mount on a wall at y≈1.1
function signage(o = {}) { // a glowing zone strip (mesh only; no text)
  const g = new THREE.Group();
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, Math.max(0.6, (o.label || '').length * 0.12)), new THREE.MeshStandardMaterial({ color: 0x1a1d24, emissive: o.accent || 0x8fb6e6, emissiveIntensity: 0.7 })), 0, 0, 0);
  return g;
}
function parcelStack(o = {}) { const g = new THREE.Group(); const cols = [KRAFT, 0xb98b50, 0xd8b878]; let y = 0; for (let i = 0; i < 3; i++) { const s = 0.32 - i * 0.05; add(g, box(s, 0.18, s, cols[i % 3]), (Math.random() - 0.5) * 0.1, y + 0.09, (Math.random() - 0.5) * 0.1); y += 0.18; } return g; }
function loadingDock(o = {}) { const g = new THREE.Group(); add(g, box(1.2, 0.3, 0.8, darker(STEEL, 0.7)), 0, 0.15, 0); add(g, box(1.2, 0.04, 0.8, STEEL), 0, 0.32, 0); return g; }

// Factory for ambient decoration (sibling to makeProp). Returns null for unknown kinds.
export function makeDressing(kind, opts = {}) {
  switch (kind) {
    case 'diningtable': return diningTable(opts);
    case 'chair': return chair(opts);
    case 'pendant': return pendant(opts);
    case 'window': return windowPanel(opts);
    case 'plant': return plant(opts);
    case 'potrack': return potRack(opts);
    case 'extractor': return extractorHood(opts);
    case 'preptable': return prepTable(opts);
    case 'shelving': return shelving(opts);
    case 'bin': return binDress(opts);
    case 'bar': return barCounter(opts);
    case 'barstool': return barStool(opts);
    case 'officedesk': return officeDesk(opts);
    case 'wallart': return wallArt(opts);
    case 'signage': return signage(opts);
    case 'parcels': return parcelStack(opts);
    case 'dock': return loadingDock(opts);
    default: return null;
  }
}
