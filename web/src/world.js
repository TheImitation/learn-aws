import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { makeProp, makeToken, makeRunner, archBlock, containerWire, box, PALETTE } from './props.js';

const FLOW = { request: 0x66ccff, data: 0x6cda7f, replication: 0xa680e6, network: 0xaeb4bf };
const CONTAINER = { networking: 0x4a9fe0, compute: 0xf2b25a, database: 0x9a86e6, edge: 0x4fc7a3, generic: 0xb0b4b0 };

const v3 = (xz, y = 0) => new THREE.Vector3(xz[0], y, xz[1]);
const line = (pts, color) => new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color }));

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
function buildOpenFloor(group) {
  const f = box(17, 0.16, 9, 0x2a2c33); f.position.set(0, -0.08, 0); group.add(f);
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
      const archLine = line([new THREE.Vector3(...a.spec.arch.pos), new THREE.Vector3(...d.spec.arch.pos)], color);
      this.archGroup.add(archLine);
      const storyLine = line([v3(a.spec.story.pos, 0.6), v3(d.spec.story.pos, 0.6)], color);
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
  // A courier physically walks the token from one block to the next and back (story view only;
  // in the architecture diagram it degrades to a travelling token). `stuck` = can't reach the far
  // end — it backs off and jitters, for "overloaded / blocked" beats.
  _carry(connId, opts = {}) {
    const c = this.conns[connId]; const ep = this._endpoints(connId); if (!ep || !c) return;
    if (this.mode !== 'story') { this._flow([connId], opts.interval || 2.4); return; }
    const A = ep[0].clone(); A.y = 0; const B = ep[1].clone(); B.y = 0;
    const runner = makeRunner(FLOW[c.spec.flow] ?? 0xffffff);
    runner.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const token = makeToken(c.spec.flow); token.position.copy(runner.userData.tray); runner.add(token);
    runner.visible = false; this.scene.add(runner); this._stageObjs.push(runner);
    const cycle = opts.cycle || 4.4, reach = opts.stuck ? 0.74 : 1.0;
    const fwd = Math.atan2(B.x - A.x, B.z - A.z), back = Math.atan2(A.x - B.x, A.z - B.z);
    this.animators.push({ timer: -(opts.delay || 0), fn: (t, dt, a) => {
      a.timer += dt; if (a.timer < 0) { runner.visible = false; return; }
      runner.visible = true; const p = (a.timer % cycle) / cycle;
      let k, carrying, yaw;
      if (p < 0.5) { k = reach * (p / 0.5); carrying = true; yaw = fwd; }
      else { k = reach * (1 - (p - 0.5) / 0.5); carrying = false; yaw = back; }
      runner.position.lerpVectors(A, B, k);
      runner.position.y = Math.abs(Math.sin(p * Math.PI * 9)) * 0.05;                          // step bounce
      runner.rotation.y = yaw;
      if (opts.stuck && carrying && k > reach - 0.03) runner.position.x += (Math.random() - 0.5) * 0.06; // blocked at the door
      token.visible = carrying;
    } });
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
  // The lead request is physically carried by a courier; supporting flows stream as tokens.
  _beatsFromAnim(st) {
    const vis = this.topic.connections.filter((c) => st.conns.includes(c.id));
    const flowConns = vis.filter((c) => c.flow !== 'replication').map((c) => c.id);
    const a = st.anim;
    if (a === 'overload') return [{ type: 'carry', conn: st.animConn, stuck: true }, { type: 'shake', id: st.focus }];
    if (a === 'failover') {
      const reroute = flowConns.filter((id) => !id.includes('ec2A'));
      return [{ type: 'shake', id: 'rdsPrimary' }, { type: 'pop', id: 'rdsStandby' }, { type: 'flow', conns: reroute.length ? reroute : flowConns, interval: 1.9, hop: 0.45 }];
    }
    const lead = (a === 'pulse' && st.animConn) ? st.animConn
      : (a === 'chain' && st.chain && st.chain.length) ? st.chain[0]
      : (vis.find((c) => c.flow === 'request') || {}).id;
    const beats = [];
    if (lead) beats.push({ type: 'carry', conn: lead });
    if (a === 'spike') beats.push({ type: 'pop', id: st.focus });
    const rest = flowConns.filter((id) => id !== lead);
    if (rest.length) beats.push({ type: 'flow', conns: rest });
    if (!beats.length) beats.push({ type: 'flow', conns: flowConns });
    return beats;
  }
  // Ambient + event animation for a stage; loops while the stage is active so the scene feels alive.
  _setupAnimation(st) {
    if (this.mode === 'story') {
      for (const id in this.blocks) {
        const e = this.blocks[id]; if (!e.story || !e.story.visible) continue;
        const p = e.spec.story.prop;
        if (p === 'cook' || p === 'customer' || p === 'host' || p === 'bouncer') this._bob(id);
      }
    }
    this._choreograph(st.script || this._beatsFromAnim(st));
  }

  update(dt) {
    this.t += dt;
    for (const a of this.animators) a.fn(this.t, dt, a);
    for (const tw of this.tweens) { tw.t += dt; tw.update(tw); if (tw.t >= tw.dur && !tw._done) { tw._done = true; tw.done && tw.done(); } }
    this.tweens = this.tweens.filter((tw) => !tw._done);
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
