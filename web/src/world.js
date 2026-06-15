import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { makeProp, makeDressing, makeExterior, makeToken, makeRunner, applyModel, archBlock, containerWire, box, PALETTE, faceYaw } from './props.js';

const FLOW = { request: 0x66ccff, data: 0x6cda7f, replication: 0xa680e6, network: 0xaeb4bf };
const CONTAINER = { networking: 0x4a9fe0, compute: 0xf2b25a, database: 0x9a86e6, edge: 0x4fc7a3, generic: 0xb0b4b0 };

const v3 = (xz, y = 0) => new THREE.Vector3(xz[0], y, xz[1]);
const line = (pts, color, opacity = 1) => new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
// Blocks whose story prop is a place you fetch stock from (the porter brings the item back).
const FETCH_FROM = new Set(['pantry', 'larder', 'coldroom']);

function buildRestaurant(group) {
  const FLOOR = 0x423a33, WALL = 0x767468, FACADE = 0x66647a, AWNING = 0xb84740, TABLE = 0x73553f;
  const put = (m, x, y, z, ry = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.y = ry; m.rotation.z = rz; group.add(m); };
  put(box(17.5, 0.16, 9.2, FLOOR), -0.75, -0.08, 0);
  put(box(0.25, 1.1, 9.0, WALL), 6.6, 0.55, 0);
  put(box(16.5, 1.1, 0.25, WALL), -0.75, 0.55, 4.3);
  put(box(16.5, 1.1, 0.25, WALL), -0.75, 0.55, -4.3);
  put(box(0.3, 2.0, 3.4, FACADE), -7.6, 1.0, -2.6);
  put(box(0.3, 2.0, 3.4, FACADE), -7.6, 1.0, 2.6);
  put(box(0.5, 0.12, 1.9, AWNING), -7.5, 2.05, 0, 0, 0.384);
  put(box(0.22, 1.4, 3.3, WALL), -4.0, 0.7, -2.45);
  put(box(0.22, 1.4, 3.3, WALL), -4.0, 0.7, 2.45);
  for (const z of [-1.6, 1.6]) {
    put(box(0.9, 0.1, 0.9, TABLE), -6.2, 0.45, z); put(box(0.12, 0.5, 0.12, TABLE), -6.2, 0.2, z);
    const diner = makeProp('customer', 0x9a8c7a); diner.scale.setScalar(0.92); put(diner, -5.45, 0, z, Math.PI / 2);
    const plate = box(0.18, 0.03, 0.18, 0xf2f2f2); put(plate, -6.2, 0.52, z);
  }
}
// A warm "back of house" room (the other topics happen behind the same front door as the kitchen).
function buildOpenFloor(group) {
  const FLOOR = 0x423a33, WALL = 0x726c61, TRIM = 0x534f47, D = 7.8, B = D / 2;
  const put = (m, x, y, z) => { m.position.set(x, y, z); group.add(m); };
  put(box(17.5, 0.16, D, FLOOR), -1.5, -0.08, 0);         // warm floor (snug to the props)
  put(box(17.5, 1.4, 0.25, WALL), -1.5, 0.7, -B - 0.05);  // back wall
  put(box(0.25, 1.4, D, WALL), -10.15, 0.7, 0);           // left wall
  put(box(0.25, 1.4, D, WALL), 7.15, 0.7, 0);             // right wall
  put(box(17.5, 0.18, 0.07, TRIM), -1.5, 0.16, -B + 0.1); // back baseboard
  put(box(17.5, 0.3, 0.22, TRIM), -1.5, 0.15, B + 0.05);  // low front lip
  put(box(2.6, 0.12, 0.5, TRIM), -7.0, 1.15, -B + 0.2);   // back-of-house shelves
  put(box(2.6, 0.12, 0.5, TRIM), 2.0, 1.15, -B + 0.2);
}


// Per-world room mood (floor/wall/trim colours). A world's character comes mostly from its dressing
// and service props; the shell just sets the tone.
const WORLD_MOOD = {
  restaurant: { floor: 0x1d1d24, checker: 0xece6d6, wall: 0xdcd2bc, trim: 0xcf3a33 }, // old-school diner: checkerboard floor, cream walls, cherry-red trim
  sortingoffice: { floor: 0x44474f, wall: 0x6f7480, trim: 0x535761 },
  transit: { floor: 0x3c4049, wall: 0x5a606d, trim: 0x474c57 },
  library: { floor: 0x4a3a2a, wall: 0x8a7048, trim: 0x5c4836 },
};
// Build a bespoke, decorated scene from a topic's `scene` config (works for any world). Adds the room
// shell + zone tints + ambient dressing to storyGroup; functional service props are added afterwards
// by _buildBlocks at their authored story.pos. Dressing never gets a blockId, so it stays label-free
// and non-pickable. A single post-build traverse collects the animatable pieces into world._ambient.
function buildScene(group, scene, world, w) {
  const M = WORLD_MOOD[world] || WORLD_MOOD.restaurant;
  const b = Object.assign({ w: 22, d: 13, x: -0.75 }, scene.bounds || {});
  const put = (m, x, y, z, ry = 0) => { m.position.set(x, y, z); m.rotation.y = ry; group.add(m); };
  if (M.checker) {                                                        // diner checkerboard floor (one mesh, tiled texture)
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const cx = cv.getContext('2d');
    const hex = (n) => '#' + n.toString(16).padStart(6, '0');
    cx.fillStyle = hex(M.floor); cx.fillRect(0, 0, 64, 64); cx.fillStyle = hex(M.checker); cx.fillRect(0, 0, 32, 32); cx.fillRect(32, 32, 32, 32);
    const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.magFilter = THREE.NearestFilter; tex.repeat.set(Math.round(b.w / 1.4), Math.round(b.d / 1.4));
    const fl = new THREE.Mesh(new THREE.BoxGeometry(b.w, 0.16, b.d), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.05 }));
    fl.position.set(b.x, -0.08, 0); group.add(fl);
  } else put(box(b.w, 0.16, b.d, M.floor), b.x, -0.08, 0);                // plain floor
  put(box(b.w, 1.5, 0.25, M.wall), b.x, 0.75, -b.d / 2 - 0.05);           // back wall
  put(box(0.25, 1.5, b.d, M.wall), b.x - b.w / 2 - 0.05, 0.75, 0);        // left wall
  put(box(0.25, 1.5, b.d, M.wall), b.x + b.w / 2 + 0.05, 0.75, 0);        // right wall
  put(box(b.w, 0.18, 0.07, M.trim), b.x, 0.16, -b.d / 2 + 0.1);           // back baseboard
  put(box(b.w, 0.3, 0.22, M.trim), b.x, 0.15, b.d / 2 + 0.05);            // low front lip
  for (const pt of (scene.partitions || [])) {                           // interior wall splitting zones (e.g. front/back of house), with a doorway gap
    const gx = pt.x, z0 = pt.z0 ?? (-b.d / 2 + 0.2), z1 = pt.z1 ?? (b.d / 2 - 0.2), gap = pt.gap;
    const segs = gap ? [[z0, gap[0]], [gap[1], z1]] : [[z0, z1]];
    for (const [za, zc] of segs) { const len = Math.abs(zc - za); if (len < 0.05) continue; put(box(0.2, 1.3, len, M.wall), gx, 0.65, (za + zc) / 2); }
    if (gap) put(box(0.3, 0.2, Math.abs(gap[1] - gap[0]) + 0.4, M.trim), gx, 1.35, (gap[0] + gap[1]) / 2); // lintel over the doorway
  }
  if (!M.checker) (scene.zones || []).forEach((z, zi) => {                // per-zone floor tint (skipped on the diner checkerboard); tiny y stagger avoids z-fight
    if (z.rect && z.floorTint != null) { const r = z.rect; put(box(Math.abs(r.x1 - r.x0), 0.02, Math.abs(r.z1 - r.z0), z.floorTint), (r.x0 + r.x1) / 2, 0.012 + zi * 0.002, (r.z0 + r.z1) / 2); }
  });
  for (const z of (scene.zones || [])) for (const d of (z.dressing || [])) { // ambient dressing scatter
    const piece = makeDressing(d.kind, Object.assign({ accent: z.accent }, d.opts || {}));
    if (!piece) continue;
    piece.position.set(d.pos[0], d.y || 0, d.pos[1]);
    piece.rotation.y = THREE.MathUtils.degToRad(d.yaw || 0);
    group.add(piece);
  }
  if (scene.exterior !== false) group.add(makeExterior(world, b)); // surrounding neighbourhood
  w._collectAmbient(group);
}

export class World {
  constructor(scene, topic) {
    this.scene = scene; this.topic = topic; this.mode = 'story'; this.stageIndex = 0; this.tweens = []; this.animators = []; this.t = 0; this._stageObjs = []; this._ambient = null;
    this.archGroup = new THREE.Group(); this.storyGroup = new THREE.Group();
    scene.add(this.archGroup, this.storyGroup);
    this.blocks = {}; this.conns = {};
    if (topic.scene) buildScene(this.storyGroup, topic.scene, topic.world || 'restaurant', this);
    else if (topic.scenery === 'restaurant') buildRestaurant(this.storyGroup);
    else buildOpenFloor(this.storyGroup);
    this._buildBlocks(); this._buildConns();
    this.storyGroup.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.applyStage(0);
  }

  _buildBlocks() {
    for (const b of this.topic.blocks) {
      const cat = b.cat || 'generic';
      let arch;
      if (b.arch.container) {
        arch = containerWire(b.arch.size[0], b.arch.size[1], b.arch.size[2], CONTAINER[cat] ?? 0xb0b4b0);
      } else {
        arch = archBlock(PALETTE[cat] ?? PALETTE.generic);
      }
      arch.position.set(...b.arch.pos);
      arch.userData.blockId = b.id;
      this.archGroup.add(arch);

      let story = null;
      if (b.story && b.story.prop) {
        story = makeProp(b.story.prop, PALETTE[cat] ?? PALETTE.generic);
        story.position.set(b.story.pos[0], 0, b.story.pos[1]);
        story.rotation.y = b.story.face != null ? this._resolveFace(b.story) : THREE.MathUtils.degToRad(b.story.yaw || 0);
        story.userData.blockId = b.id;
        this.storyGroup.add(story);
        applyModel(story, b.story.prop, { clip: 'Idle' });
      }

      const el = document.createElement('div'); el.className = 'label';
      const label = new CSS2DObject(el); this.scene.add(label);
      this.blocks[b.id] = { spec: b, arch, story, label };
    }
  }

  _buildConns() {
    for (const c of this.topic.connections) {
      const a = this.blocks[c.from], d = this.blocks[c.to];
      if (!a || !d) continue;
      const color = FLOW[c.flow] ?? 0x88aabb;
      const phase = Math.random() * 6.28;
      // Faint, ethereal paths — the people and messages moving along them carry the story.
      const archLine = line([new THREE.Vector3(...a.spec.arch.pos), new THREE.Vector3(...d.spec.arch.pos)], color, 0.7);
      archLine.userData = { baseOpacity: 0.7, phase };
      this.archGroup.add(archLine);
      const storyLine = line([v3(a.spec.story.pos, 0.55), v3(d.spec.story.pos, 0.55)], color, 0.26);
      storyLine.userData = { baseOpacity: 0.26, phase };
      this.storyGroup.add(storyLine);
      this.conns[c.id] = { spec: c, archLine, storyLine };
    }
  }

  setMode(mode) {
    this.mode = mode;
    this.archGroup.visible = mode === 'arch';
    this.storyGroup.visible = mode === 'story';
    this.applyStage(this.stageIndex);
  }

  applyStage(i) {
    this.stageIndex = i;
    const st = this.topic.stages[i];
    this._focusId = st.focus;
    const vis = new Set(st.blocks), vc = new Set(st.conns);
    for (const tw of this.tweens) tw.done && tw.done();
    for (const o of this._stageObjs) this._disposeObj(o);
    this.tweens = []; this.animators = []; this._stageObjs = [];
    for (const id in this.blocks) {
      const e = this.blocks[id], b = e.spec, visible = vis.has(id), isC = !!b.arch.container;
      if (e.arch) { e.arch.position.set(...b.arch.pos); e.arch.scale.setScalar(1); e.arch.visible = visible && this.mode === 'arch'; }
      if (e.story) { e.story.position.set(b.story.pos[0], 0, b.story.pos[1]); e.story.scale.setScalar(1); e.story.visible = visible && this.mode === 'story'; }
      const storyProp = !!(b.story && b.story.prop);
      const labelVisible = visible && (this.mode === 'arch' ? true : storyProp);
      e.label.visible = labelVisible;
      if (labelVisible) {
        if (this.mode === 'arch') {
          e.label.element.textContent = b.name;
          e.label.position.set(b.arch.pos[0], b.arch.pos[1] + (isC ? b.arch.size[1] / 2 + 0.4 : 0.95), b.arch.pos[2]);
        } else {
          e.label.element.textContent = b.story.name;
          e.label.position.set(b.story.pos[0], 1.3, b.story.pos[1]);
        }
      }
    }
    for (const id in this.conns) {
      const c = this.conns[id], visible = vc.has(id);
      c.archLine.visible = visible && this.mode === 'arch';
      c.storyLine.visible = visible && this.mode === 'story';
    }
    this._setupAnimation(st);
  }

  focusPoint(id) {
    const e = this.blocks[id]; if (!e) return new THREE.Vector3(0, 0.5, 0);
    if (this.mode === 'arch') return new THREE.Vector3(...e.spec.arch.pos);
    return v3(e.spec.story.pos, 0.6);
  }
  focusDistance(id) {
    const e = this.blocks[id]; if (!e) return 14;
    if (e.spec.arch.container && this.mode === 'arch') { const s = e.spec.arch.size; return Math.min(Math.max(s[0], s[2]) * 1.7, 34); }
    return this.mode === 'arch' ? 9 : 8;
  }
  // Centroid of the blocks visible this stage, biased toward the focus block, so the camera frames
  // the whole active set instead of pushing edge blocks (e.g. a far-left producer) off-screen.
  stageCenter(stage) {
    const ids = (stage.blocks || []).filter((id) => this.blocks[id]);
    if (!ids.length) return this.focusPoint(stage.focus);
    const c = new THREE.Vector3();
    for (const id of ids) c.add(this.focusPoint(id));
    c.multiplyScalar(1 / ids.length);
    if (stage.focus && this.blocks[stage.focus]) c.lerp(this.focusPoint(stage.focus), 0.3); // lean toward the subject
    return c;
  }

  _endpoints(connId) {
    const c = this.conns[connId]; if (!c) return null;
    const a = this.blocks[c.spec.from], d = this.blocks[c.spec.to];
    if (this.mode === 'arch') return [new THREE.Vector3(...a.spec.arch.pos), new THREE.Vector3(...d.spec.arch.pos)];
    return [v3(a.spec.story.pos, 0.6), v3(d.spec.story.pos, 0.6)];
  }
  _disposeObj(o) { o.traverse((n) => { if (n.geometry) n.geometry.dispose(); if (n.material) { Array.isArray(n.material) ? n.material.forEach((m) => m.dispose()) : n.material.dispose(); } }); this.scene.remove(o); }

  // Orientation: turn a prop to face a target (another block, a floor point, or a named anchor),
  // overriding manual yaw. Resolves against static block specs so build order never matters.
  _resolveFace(story) {
    const f = story.face; let target = null;
    if (Array.isArray(f)) target = f;
    else if (f === 'door' || f === 'entrance') target = (this.topic.anchors && this.topic.anchors[f]) || null;
    else if (typeof f === 'string') { const b = this.topic.blocks.find((x) => x.id === f); target = b && b.story ? b.story.pos : null; }
    return target ? faceYaw(story.pos, target) : THREE.MathUtils.degToRad(story.yaw || 0);
  }

  // Ambient set-dressing: collected once at build, animated by one batched updater (perf: a handful
  // of meshes, independent of the per-stage animators).
  _collectAmbient(group) {
    const a = { flickers: [], diners: [], cars: [] };
    group.traverse((o) => {
      if (o.userData && o.userData.flicker) { o.userData.ph = o.userData.ph ?? Math.random() * 6.28; a.flickers.push(o); }
      if (o.userData && o.userData.diner) { o.userData.ph = o.userData.ph ?? Math.random() * 6.28; a.diners.push(o); }
      if (o.userData && o.userData.car) a.cars.push(o);
    });
    this._ambient = a;
  }
  _updateAmbient() {
    const t = this.t;
    for (const f of this._ambient.flickers) { if (f.material) f.material.emissiveIntensity = (f.userData.base || 1) * (0.78 + 0.22 * Math.sin(t * 7 + f.userData.ph) + 0.08 * Math.sin(t * 13 + f.userData.ph)); }
    for (const d of this._ambient.diners) d.rotation.z = Math.sin(t * 1.4 + d.userData.ph) * 0.045;
    for (const c of this._ambient.cars) { const u = c.userData.car, p = ((t * u.speed) + u.off) % u.span; c.position.x = u.dir > 0 ? u.x0 + p : u.x0 + u.span - p; c.rotation.y = u.dir > 0 ? 0 : Math.PI; } // looping traffic
  }

  // A mover's route through the scene. Story mode threads optional connection waypoints so people and
  // messages walk believable paths (e.g. through a doorway) instead of clipping walls; arch mode keeps
  // the straight topology edge. No waypoints ⇒ [A,B], identical to the old straight-line behaviour.
  _pathPoints(connId, ep, opts) {
    const A = ep[0].clone(); A.y = 0; const B = ep[1].clone(); B.y = 0;
    const wps = this.conns[connId] && this.conns[connId].spec.waypoints;
    if (this.mode === 'story' && wps && wps.length) return [A, ...wps.map((p) => new THREE.Vector3(p[0], 0, p[1])), B];
    return [A, B];
  }
  _polyline(pts) {
    const seg = [], yaws = []; let total = 0;
    for (let i = 0; i < pts.length - 1; i++) { const dx = pts[i + 1].x - pts[i].x, dz = pts[i + 1].z - pts[i].z; const L = Math.hypot(dx, dz) || 1e-6; seg.push(L); total += L; yaws.push(Math.atan2(dx, dz)); }
    return { pts, seg, total, yaws };
  }
  _alongPath(pl, dist) {
    let d = Math.max(0, Math.min(dist, pl.total));
    for (let i = 0; i < pl.seg.length; i++) {
      if (d <= pl.seg[i] || i === pl.seg.length - 1) { const tt = pl.seg[i] ? d / pl.seg[i] : 0, a = pl.pts[i], b = pl.pts[i + 1]; return { x: a.x + (b.x - a.x) * tt, z: a.z + (b.z - a.z) * tt, yaw: pl.yaws[i] }; }
      d -= pl.seg[i];
    }
    const last = pl.pts[pl.pts.length - 1]; return { x: last.x, z: last.z, yaw: pl.yaws[pl.yaws.length - 1] || 0 };
  }

  // Replication reads as a synchronized mirrored pair held in lockstep (primary ↔ standby), not a
  // one-way delivery. Two ledger tokens pulse out from the midpoint to each end together.
  _replicate(connId) {
    const c = this.conns[connId]; const ep = this._endpoints(connId); if (!ep || !c) return;
    if (this.mode !== 'story') { this._flow([connId], 2.0); return; }
    const A = ep[0].clone(); A.y = 0; const B = ep[1].clone(); B.y = 0; const mid = A.clone().lerp(B, 0.5);
    const t1 = makeToken('replication'), t2 = makeToken('replication');
    [t1, t2].forEach((tk) => { tk.visible = false; this.scene.add(tk); this._stageObjs.push(tk); });
    const cycle = 2.4;
    this.animators.push({ timer: 0, fn: (t, dt, a) => {
      a.timer += dt; const p = (a.timer % cycle) / cycle, k = p < 0.5 ? p / 0.5 : 1 - (p - 0.5) / 0.5;
      t1.visible = t2.visible = true;
      t1.position.lerpVectors(mid, A, k); t1.position.y = 0.3 + Math.sin(k * Math.PI) * 0.12;
      t2.position.lerpVectors(mid, B, k); t2.position.y = 0.3 + Math.sin(k * Math.PI) * 0.12;
    } });
  }

  // One shaped token (ticket / plate / packet) travels a connection, arcing as it goes.
  _pulse(connId, delay = 0, dur = 1.0) {
    const c = this.conns[connId]; const ep = this._endpoints(connId); if (!ep || !c) return;
    const tok = makeToken(c.spec.flow); tok.visible = false; this.scene.add(tok);
    const lift = this.mode === 'story' ? 0.22 : 0.0;
    const yaw = Math.atan2(ep[1].x - ep[0].x, ep[1].z - ep[0].z);
    this.tweens.push({ t: -delay, dur, update(tw) {
      if (tw.t < 0) { tok.visible = false; return; }
      tok.visible = true; const k = Math.min(tw.t / tw.dur, 1);
      tok.position.lerpVectors(ep[0], ep[1], k); tok.position.y += Math.sin(k * Math.PI) * lift; tok.rotation.y = yaw;
    }, done: () => this._disposeObj(tok) });
  }
  _obj(id) { const e = this.blocks[id]; if (!e) return null; return this.mode === 'story' ? e.story : e.arch; }
  _pop(id) { const o = this._obj(id); if (!o) return; this.tweens.push({ t: 0, dur: 0.5, update(tw) { o.scale.setScalar(0.2 + 0.8 * Math.min(tw.t / 0.5, 1)); }, done: () => o.scale.setScalar(1) }); }
  _bob(id) { const o = this._obj(id); if (!o) return; const by = o.position.y, ph = Math.random() * 6.28; this.animators.push({ fn: (t) => { o.position.y = by + Math.sin(t * 2.4 + ph) * 0.05; } }); }
  _shakeLoop(id) { const o = this._obj(id); if (!o) return; const bx = o.position.x; this.animators.push({ fn: () => { o.position.x = bx + (Math.random() - 0.5) * 0.07; } }); }
  // Soft wisps of steam rising from a cooking station — ambient kitchen life.
  _steam(pos) {
    const puffs = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xeef2f5, transparent: true, opacity: 0, depthWrite: false }));
      m.position.set(pos.x, pos.y, pos.z); this.scene.add(m); this._stageObjs.push(m); puffs.push({ m, ph: i / 4 });
    }
    this.animators.push({ fn: (t) => {
      for (const p of puffs) {
        const k = (t * 0.45 + p.ph) % 1;
        p.m.position.y = pos.y + k * 0.75;
        p.m.scale.setScalar(0.5 + k * 1.8);
        p.m.material.opacity = 0.2 * Math.sin(k * Math.PI);
      }
    } });
  }

  // The chef works up and down the range, pausing at stations, with a busy bob and a lean to the heat.
  _workRange(id) {
    const o = this._obj(id); if (!o || !o.userData.chef) return;
    const chef = o.userData.chef, baseZ = chef.position.z, ph = Math.random() * 10, span = 0.5, cyc = 6.0;
    this.animators.push({ fn: (t) => {
      const p = ((t + ph) % cyc) / cyc, tri = p < 0.5 ? p * 2 : 2 - p * 2, e = tri * tri * (3 - 2 * tri);
      chef.position.x = (e - 0.5) * 2 * span;
      chef.position.y = Math.abs(Math.sin((t + ph) * 4)) * 0.03;
      chef.position.z = baseZ + Math.sin((t + ph) * 2) * 0.02;
    } });
  }
  // Burner flames flicker.
  _flicker(id) {
    const o = this._obj(id); if (!o || !o.userData.flames || !o.userData.flames.length) return;
    const flames = o.userData.flames, ph = flames.map(() => Math.random() * 10);
    this.animators.push({ fn: (t) => {
      flames.forEach((f, i) => {
        const k = 0.7 + 0.3 * Math.sin(t * 14 + ph[i]) + 0.1 * Math.sin(t * 23 + ph[i]);
        f.scale.set(1, 1.3 * k, 1); f.material.emissiveIntensity = 1.7 + 0.9 * k; f.material.opacity = 0.8 + 0.18 * k;
      });
    } });
  }
  // Continuously send waves of tokens along a path (work flowing through the system).
  _flow(connIds, interval = 2.6, hop = 0.5) {
    if (!connIds || !connIds.length) return;
    const wave = () => connIds.forEach((id, i) => this._pulse(id, i * hop, hop * 1.2));
    wave();
    this.animators.push({ timer: 0, fn: (t, dt, a) => { a.timer += dt; if (a.timer >= interval) { a.timer = 0; wave(); } } });
  }
  _floodConn(connId, interval = 0.3) {
    if (!connId) return;
    this.animators.push({ timer: 0, fn: (t, dt, a) => { a.timer += dt; if (a.timer >= interval) { a.timer = 0; this._pulse(connId, 0, 0.5); } } });
  }
  // Someone physically moves along a connection so the relationship reads as people/messages flowing
  // through the kitchen, not a hard pipe (story view only; degrades to a travelling token in the
  // architecture diagram). opts.mover: 'person' = a guest who walks themselves in (one-way arrivals);
  // 'porter' = a runner who fulfils the request for someone else, carrying a tray. opts.fetch = the
  // item is brought back (the porter goes empty, returns loaded). opts.stuck = can't reach the far
  // end (backs off + jitters) for overloaded/blocked beats.
  _carry(connId, opts = {}) {
    const c = this.conns[connId]; const ep = this._endpoints(connId); if (!ep || !c) return;
    if (this.mode !== 'story') { this._flow([connId], opts.interval || 2.4); return; }
    const isPerson = opts.mover === 'person';
    const cycle = opts.cycle || (isPerson ? 5.2 : 4.4), count = Math.max(1, opts.count || 1);
    for (let i = 0; i < count; i++) this._carryOne(connId, ep, { ...opts, cycle, delay: (opts.delay || 0) + i * (cycle / count) });
  }
  _carryOne(connId, ep, opts) {
    const c = this.conns[connId];
    const pl = this._polyline(this._pathPoints(connId, ep, opts)); // straight line when no waypoints
    const isPerson = opts.mover === 'person';
    let mover, token = null;
    if (isPerson) {
      mover = makeProp('customer', 0x9a8c7a); applyModel(mover, 'customer', { clip: 'Walk' }); // a guest (human model, walking)
    } else {
      mover = makeRunner(FLOW[c.spec.flow] ?? 0xffffff);
      token = makeToken(c.spec.flow); token.position.copy(mover.userData.tray); mover.add(token);
    }
    mover.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    mover.visible = false; this.scene.add(mover); this._stageObjs.push(mover);
    const cycle = opts.cycle || 4.4, reach = opts.stuck ? 0.74 : 1.0;
    const oneWay = opts.oneWay ?? isPerson, fetch = !!opts.fetch;
    this.animators.push({ timer: -(opts.delay || 0), fn: (t, dt, a) => {
      a.timer += dt; if (mover.userData.mixer) mover.userData.mixer.update(dt);
      if (a.timer < 0) { mover.visible = false; return; }
      const p = (a.timer % cycle) / cycle;
      let k, forward;
      if (p < 0.5) { k = reach * (p / 0.5); forward = true; }
      else { k = reach * (1 - (p - 0.5) / 0.5); forward = false; }
      mover.visible = !(oneWay && !forward);                       // one-way movers vanish on the way back
      const at = this._alongPath(pl, k * pl.total);
      mover.position.set(at.x, Math.abs(Math.sin(p * Math.PI * 9)) * 0.05, at.z); // along the route + step bounce
      mover.rotation.y = forward ? at.yaw : at.yaw + Math.PI;       // face travel direction per segment
      if (opts.stuck && forward && k > reach - 0.03) mover.position.x += (Math.random() - 0.5) * 0.06; // blocked
      if (token) token.visible = fetch ? !forward : forward;        // deliver carries out; fetch brings back
    } });
  }
  // Which kind of mover fulfils a connection, and how it carries the item.
  _moverFor(spec) {
    if (!spec) return {};
    const fromProp = this.blocks[spec.from]?.spec.story?.prop;
    const toProp = this.blocks[spec.to]?.spec.story?.prop;
    if (spec.flow === 'request' && fromProp === 'customer') return { mover: 'person', oneWay: true, count: 2 }; // a stream of guests
    return { mover: 'porter', fetch: FETCH_FROM.has(toProp), count: 2 };                                        // runners fulfilling it
  }

  // Run a list of beats. A stage can author `script: [...]` for bespoke choreography, or rely on
  // the `anim` shorthand which _beatsFromAnim compiles into the same beats — one code path.
  _choreograph(beats) {
    for (const b of beats || []) {
      switch (b.type) {
        case 'carry': this._carry(b.conn, b); break;
        case 'flow': this._flow(b.conns, b.interval, b.hop); break;
        case 'flood': this._floodConn(b.conn, b.interval); break;
        case 'pulse': this._pulse(b.conn, b.delay || 0, b.dur || 1.0); break;
        case 'pop': this._pop(b.id); break;
        case 'shake': this._shakeLoop(b.id); break;
        case 'bob': this._bob(b.id); break;
        case 'replicate': this._replicate(b.conn); break;
      }
    }
  }
  // Compile the `anim` shorthand into beats: people and porters move along the visible connections so
  // each relationship is told by movement; only the overflow streams as faint tokens.
  _beatsFromAnim(st) {
    const vis = this.topic.connections.filter((c) => st.conns.includes(c.id));
    const a = st.anim, CAP = 6;
    if (a === 'overload') {
      const m = this._moverFor(this.conns[st.animConn]?.spec);
      return [{ type: 'carry', conn: st.animConn, stuck: true, ...m, oneWay: false, count: 1 }, { type: 'shake', id: st.focus }];
    }
    if (a === 'failover') {
      const reroute = vis.filter((c) => !c.id.includes('ec2A')).map((c) => c.id);
      const ids = reroute.length ? reroute : vis.map((c) => c.id);
      const beats = [{ type: 'shake', id: 'rdsPrimary' }, { type: 'pop', id: 'rdsStandby' }];
      ids.slice(0, CAP).forEach((id, i) => beats.push({ type: 'carry', conn: id, delay: i * 0.5, ...this._moverFor(this.conns[id].spec) }));
      return beats;
    }
    // Order the connections: a chain plays down the line; otherwise guests-first, then focus-linked.
    let order;
    if (a === 'chain' && st.chain && st.chain.length) {
      const inChain = st.chain.filter((id) => vis.some((c) => c.id === id));
      order = [...inChain, ...vis.map((c) => c.id).filter((id) => !inChain.includes(id))];
    } else {
      order = vis.map((c) => c.id).sort((x, y) => this._connScore(y, st.focus) - this._connScore(x, st.focus));
    }
    // Per-flow visual language: request/data are carried by people/porters; replication is a mirrored
    // pair; network streams as faint tokens. Overflow past the mover cap also streams.
    const beats = [];
    const flowOf = (id) => this.conns[id].spec.flow;
    const movable = order.filter((id) => flowOf(id) !== 'replication' && flowOf(id) !== 'network');
    const carried = movable.slice(0, CAP);
    carried.forEach((id, i) => beats.push({ type: 'carry', conn: id, delay: i * 0.6, ...this._moverFor(this.conns[id].spec) }));
    if (a === 'spike') beats.push({ type: 'pop', id: st.focus });
    order.filter((id) => flowOf(id) === 'replication').forEach((id) => beats.push({ type: 'replicate', conn: id }));
    const streamed = order.filter((id) => flowOf(id) === 'network').concat(movable.slice(CAP));
    if (streamed.length) beats.push({ type: 'flow', conns: streamed });
    return beats.length ? beats : [{ type: 'flow', conns: vis.map((c) => c.id) }];
  }
  _connScore(id, focus) {
    const s = this.conns[id].spec;
    return (this.blocks[s.from]?.spec.story?.prop === 'customer' ? 2 : 0) + (s.from === focus || s.to === focus ? 1 : 0);
  }
  // Ambient + event animation for a stage; loops while the stage is active so the scene feels alive.
  _setupAnimation(st) {
    if (this.mode === 'story') {
      for (const id in this.blocks) {
        const e = this.blocks[id]; if (!e.story || !e.story.visible) continue;
        const p = e.spec.story.prop;
        if (p === 'cook') { this._workRange(id); this._flicker(id); }
        else if (p === 'customer' || p === 'host' || p === 'bouncer') this._bob(id);
        if (p === 'cook' || p === 'pass') this._steam(v3(e.spec.story.pos, p === 'pass' ? 0.9 : 0.78));
      }
    }
    this._choreograph(st.script || this._beatsFromAnim(st));
  }

  update(dt) {
    this.t += dt;
    // Ethereal shimmer on the visible connection lines.
    for (const id in this.conns) {
      const ln = this.mode === 'story' ? this.conns[id].storyLine : this.conns[id].archLine;
      if (ln && ln.visible) ln.material.opacity = ln.userData.baseOpacity * (0.6 + 0.4 * (0.5 + 0.5 * Math.sin(this.t * 1.3 + ln.userData.phase)));
    }
    if (this.mode === 'story') for (const id in this.blocks) { const s = this.blocks[id].story; if (s && s.userData.mixer) s.userData.mixer.update(dt); } // idle animation on standing people
    if (this.mode === 'story' && this._ambient) this._updateAmbient(); // batched set-dressing life
    for (const a of this.animators) a.fn(this.t, dt, a);
    for (const tw of this.tweens) { tw.t += dt; tw.update(tw); if (tw.t >= tw.dur && !tw._done) { tw._done = true; tw.done && tw.done(); } }
    this.tweens = this.tweens.filter((tw) => !tw._done);
  }

  // Screen-space declutter: when projected labels overlap, keep the highest-priority one
  // (focus block > service names > container chrome, nearer wins) and fade the rest. Re-runs each
  // frame, so hidden labels reappear as the camera moves. Mostly matters in the dense arch view.
  declutterLabels(camera) {
    const v = new THREE.Vector3(); const entries = [];
    const W = window.innerWidth, H = window.innerHeight;
    for (const id in this.blocks) {
      const e = this.blocks[id], el = e.label.element;
      if (!e.label.visible) { el.style.opacity = ''; continue; }
      v.copy(e.label.position).project(camera);
      if (v.z > 1) { el.style.opacity = '0'; continue; }   // behind camera
      const px = (v.x * 0.5 + 0.5) * W, py = (-v.y * 0.5 + 0.5) * H;
      const w = (el.offsetWidth || 80) + 8, h = (el.offsetHeight || 18) + 6;   // pad so neighbours don't touch
      entries.push({ el, l: px - w / 2, r: px + w / 2, t: py - h / 2, b: py + h / 2, dist: camera.position.distanceTo(e.label.position), isC: e.spec.arch.container ? 1 : 0, focus: id === this._focusId ? 1 : 0 });
    }
    // priority: service names always beat container chrome; focus and camera distance break ties
    entries.sort((a, b) => (a.isC - b.isC) || (b.focus - a.focus) || (a.dist - b.dist));
    const kept = [];
    for (const en of entries) {
      const clash = kept.some((k) => en.l < k.r && en.r > k.l && en.t < k.b && en.b > k.t); // AABB overlap
      if (clash) { en.el.style.opacity = '0'; }
      else { en.el.style.opacity = ''; kept.push(en); }
    }
  }

  raycastTargets() {
    const arr = [];
    for (const id in this.blocks) { const o = this._obj(id); if (o && o.visible) arr.push(o); }
    return arr;
  }
  _disposeGroup(g) { g.traverse((n) => { if (n.geometry) n.geometry.dispose(); if (n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => m.dispose()); }); }
  dispose() {
    for (const tw of this.tweens) tw.done && tw.done();
    for (const o of this._stageObjs) this._disposeObj(o);
    this._disposeGroup(this.archGroup); this._disposeGroup(this.storyGroup); // free GPU geometry/materials
    this.scene.remove(this.archGroup); this.scene.remove(this.storyGroup);
    for (const id in this.blocks) this.scene.remove(this.blocks[id].label);
    this._ambient = null;
  }
}
