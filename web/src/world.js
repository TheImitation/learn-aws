import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { makeProp, makeToken, makeRunner, applyModel, archBlock, containerWire, box, PALETTE } from './props.js';

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
  const FLOOR = 0x423a33, WALL = 0x726c61, TRIM = 0x534f47;
  const put = (m, x, y, z) => { m.position.set(x, y, z); group.add(m); };
  put(box(18, 0.16, 11, FLOOR), -1.5, -0.08, 0);          // warm floor
  put(box(18, 1.4, 0.25, WALL), -1.5, 0.7, -5.45);        // back wall
  put(box(0.25, 1.4, 11, WALL), -10.4, 0.7, 0);           // left wall
  put(box(0.25, 1.4, 11, WALL), 7.4, 0.7, 0);             // right wall
  put(box(18, 0.18, 0.07, TRIM), -1.5, 0.16, -5.31);      // back baseboard
  put(box(18, 0.3, 0.22, TRIM), -1.5, 0.15, 5.45);        // low front lip
  put(box(2.6, 0.12, 0.5, TRIM), -7.0, 1.15, -5.2);       // a back-of-house shelf
  put(box(2.6, 0.12, 0.5, TRIM), 2.0, 1.15, -5.2);
}


export class World {
  constructor(scene, topic) {
    this.scene = scene; this.topic = topic; this.mode = 'story'; this.stageIndex = 0; this.tweens = []; this.animators = []; this.t = 0; this._stageObjs = [];
    this.archGroup = new THREE.Group(); this.storyGroup = new THREE.Group();
    scene.add(this.archGroup, this.storyGroup);
    this.blocks = {}; this.conns = {};
    if (topic.scenery === 'restaurant') buildRestaurant(this.storyGroup); else buildOpenFloor(this.storyGroup);
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
        story.rotation.y = THREE.MathUtils.degToRad(b.story.yaw || 0);
        story.userData.blockId = b.id;
        this.storyGroup.add(story);
        applyModel(story, b.story.prop);
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
      const storyLine = line([v3(a.spec.story.pos, 0.55), v3(d.spec.story.pos, 0.55)], color, 0.16);
      storyLine.userData = { baseOpacity: 0.16, phase };
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
    const A = ep[0].clone(); A.y = 0; const B = ep[1].clone(); B.y = 0;
    const isPerson = opts.mover === 'person';
    let mover, token = null;
    if (isPerson) {
      mover = makeProp('customer', 0x9a8c7a); applyModel(mover, 'customer'); // a guest (uses the human model when it loads)
    } else {
      mover = makeRunner(FLOW[c.spec.flow] ?? 0xffffff);
      token = makeToken(c.spec.flow); token.position.copy(mover.userData.tray); mover.add(token);
    }
    mover.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    mover.visible = false; this.scene.add(mover); this._stageObjs.push(mover);
    const cycle = opts.cycle || (isPerson ? 5.2 : 4.4), reach = opts.stuck ? 0.74 : 1.0;
    const oneWay = opts.oneWay ?? isPerson, fetch = !!opts.fetch;
    const fwd = Math.atan2(B.x - A.x, B.z - A.z), back = Math.atan2(A.x - B.x, A.z - B.z);
    this.animators.push({ timer: -(opts.delay || 0), fn: (t, dt, a) => {
      a.timer += dt; if (a.timer < 0) { mover.visible = false; return; }
      const p = (a.timer % cycle) / cycle;
      let k, forward, yaw;
      if (p < 0.5) { k = reach * (p / 0.5); forward = true; yaw = fwd; }
      else { k = reach * (1 - (p - 0.5) / 0.5); forward = false; yaw = back; }
      mover.visible = !(oneWay && !forward);                       // one-way movers vanish on the way back
      mover.position.lerpVectors(A, B, k);
      mover.position.y = Math.abs(Math.sin(p * Math.PI * 9)) * 0.05; // step bounce
      mover.rotation.y = yaw;
      if (opts.stuck && forward && k > reach - 0.03) mover.position.x += (Math.random() - 0.5) * 0.06; // blocked
      if (token) token.visible = fetch ? !forward : forward;        // deliver carries out; fetch brings back
    } });
  }
  // Which kind of mover fulfils a connection, and how it carries the item.
  _moverFor(spec) {
    if (!spec) return {};
    const fromProp = this.blocks[spec.from]?.spec.story?.prop;
    const toProp = this.blocks[spec.to]?.spec.story?.prop;
    if (spec.flow === 'request' && fromProp === 'customer') return { mover: 'person', oneWay: true }; // a guest walks in
    return { mover: 'porter', fetch: FETCH_FROM.has(toProp) };                                        // a runner fulfils it
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
      }
    }
  }
  // Compile the `anim` shorthand into beats: people and porters move along the visible connections so
  // each relationship is told by movement; only the overflow streams as faint tokens.
  _beatsFromAnim(st) {
    const vis = this.topic.connections.filter((c) => st.conns.includes(c.id));
    const a = st.anim, CAP = 5;
    if (a === 'overload') {
      const m = this._moverFor(this.conns[st.animConn]?.spec);
      return [{ type: 'carry', conn: st.animConn, stuck: true, ...m, oneWay: false }, { type: 'shake', id: st.focus }];
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
    const beats = [];
    const carried = order.slice(0, CAP);
    carried.forEach((id, i) => beats.push({ type: 'carry', conn: id, delay: i * 0.6, ...this._moverFor(this.conns[id].spec) }));
    if (a === 'spike') beats.push({ type: 'pop', id: st.focus });
    const rest = order.slice(CAP).filter((id) => this.conns[id].spec.flow !== 'replication');
    if (rest.length) beats.push({ type: 'flow', conns: rest });
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
        if (p === 'cook' || p === 'customer' || p === 'host' || p === 'bouncer') this._bob(id);
        if (p === 'cook' || p === 'pass') this._steam(v3(e.spec.story.pos, p === 'pass' ? 0.9 : 0.55));
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
  dispose() {
    for (const tw of this.tweens) tw.done && tw.done();
    for (const o of this._stageObjs) this._disposeObj(o);
    this.scene.remove(this.archGroup); this.scene.remove(this.storyGroup);
    for (const id in this.blocks) this.scene.remove(this.blocks[id].label);
  }
}
