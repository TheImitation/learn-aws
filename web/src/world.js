import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { makeProp, archBlock, containerWire, box, PALETTE } from './props.js';

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
  for (const z of [-1.6, 1.6]) { put(box(0.9, 0.1, 0.9, TABLE), -6.2, 0.45, z); put(box(0.12, 0.5, 0.12, TABLE), -6.2, 0.2, z); }
}
function buildOpenFloor(group) {
  group.add(Object.assign(box(17, 0.16, 9, 0x2a2c33), { position: new THREE.Vector3(0, -0.08, 0) }));
}

export class World {
  constructor(scene, topic) {
    this.scene = scene; this.topic = topic; this.mode = 'story'; this.stageIndex = 0; this.tweens = [];
    this.archGroup = new THREE.Group(); this.storyGroup = new THREE.Group();
    scene.add(this.archGroup, this.storyGroup);
    this.blocks = {}; this.conns = {};
    if (topic.scenery === 'restaurant') buildRestaurant(this.storyGroup); else buildOpenFloor(this.storyGroup);
    this._buildBlocks(); this._buildConns();
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
    this.tweens = [];
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
    this._runAnimation(st);
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

  _endpoints(connId) {
    const c = this.conns[connId]; if (!c) return null;
    const a = this.blocks[c.spec.from], d = this.blocks[c.spec.to];
    if (this.mode === 'arch') return [new THREE.Vector3(...a.spec.arch.pos), new THREE.Vector3(...d.spec.arch.pos)];
    return [v3(a.spec.story.pos, 0.6), v3(d.spec.story.pos, 0.6)];
  }
  _pulse(connId, delay = 0, dur = 1.0) {
    const ep = this._endpoints(connId); if (!ep) return;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    dot.visible = false; this.scene.add(dot);
    this.tweens.push({ t: -delay, dur, update(tw) { if (tw.t < 0) { dot.visible = false; return; } dot.visible = true; dot.position.lerpVectors(ep[0], ep[1], Math.min(tw.t / tw.dur, 1)); }, done: () => { this.scene.remove(dot); dot.geometry.dispose(); } });
  }
  _obj(id) { const e = this.blocks[id]; if (!e) return null; return this.mode === 'story' ? e.story : e.arch; }
  _shake(id) { const o = this._obj(id); if (!o) return; const bx = o.position.x; this.tweens.push({ t: 0, dur: 1.2, update(tw) { o.position.x = bx + (Math.random() - 0.5) * 0.08; }, done: () => { o.position.x = bx; } }); }
  _pop(id) { const o = this._obj(id); if (!o) return; this.tweens.push({ t: 0, dur: 0.5, update(tw) { o.scale.setScalar(0.2 + 0.8 * Math.min(tw.t / 0.5, 1)); }, done: () => o.scale.setScalar(1) }); }
  _runAnimation(st) {
    if (!st.anim) return;
    if (st.anim === 'pulse' && st.animConn) this._pulse(st.animConn);
    else if (st.anim === 'chain' && st.chain) st.chain.forEach((id, i) => this._pulse(id, i * 0.55));
    else if (st.anim === 'overload') { if (st.animConn) for (let i = 0; i < 5; i++) this._pulse(st.animConn, i * 0.18, 0.45); this._shake(st.focus); }
    else if (st.anim === 'spike') { this._pop(st.focus); }
    else if (st.anim === 'failover') { this._pulse('c_alb_ec2B', 0.3); this._pulse('c_ec2B_rds', 0.9); this._pop('rdsStandby'); this._shake('rdsPrimary'); }
  }

  update(dt) {
    for (const tw of this.tweens) { tw.t += dt; tw.update(tw); if (tw.t >= tw.dur && !tw._done) { tw._done = true; tw.done && tw.done(); } }
    this.tweens = this.tweens.filter((tw) => !tw._done);
  }

  raycastTargets() {
    const arr = [];
    for (const id in this.blocks) { const o = this._obj(id); if (o && o.visible) arr.push(o); }
    return arr;
  }
  dispose() {
    this.scene.remove(this.archGroup); this.scene.remove(this.storyGroup);
    for (const id in this.blocks) this.scene.remove(this.blocks[id].label);
  }
}
