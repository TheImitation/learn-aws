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
    default: return station(color);
  }
}
