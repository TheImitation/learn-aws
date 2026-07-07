import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';

export type Outcome = 'deliver' | 'drop';

export interface SimNodeSpec {
  id: string;
  anchor: Vector3; // world-space token waypoint
  /** Routing decision when a token arrives here: next node id, or a terminal outcome. */
  next: (token: Token) => string | Outcome;
}

export interface Token {
  id: number;
  kind: string;
  mesh: Mesh;
  logical: Vector3; // true position (mesh adds a hover bob on top)
  at: string;
  target: string | null;
  outcome: Outcome | null;
  fade: number;
  phase: number;
  meta: Record<string, boolean>; // breadcrumbs set by nodes (e.g. viaNat) for path-dependent routing
}

export interface TrafficReport {
  running: boolean;
  total: number;
  resolved: number;
  delivered: number;
  dropped: number;
  pass: boolean | null;
}

const SPEED = 2.6;
const BOB = 0.05;

/** Kinematic flow simulation: tokens (requests/parcels) hop between machine nodes;
 *  each node decides the next hop — mission faults live inside those decisions. */
export class FlowSim {
  onOutcome?: (o: Outcome) => void;
  onTokenResolved?: (t: Token, o: Outcome) => void; // per-token hook (missions score custom tests by kind)

  private scene: Scene;
  private nodes = new Map<string, SimNodeSpec>();
  private tokens: Token[] = [];
  private queue: { at: string; kind: string; delay: number }[] = [];
  private nextId = 1;
  private report: TrafficReport = { running: false, total: 0, resolved: 0, delivered: 0, dropped: 0, pass: null };
  private mNeutral: StandardMaterial;
  private mGood: StandardMaterial;
  private mBad: StandardMaterial;

  constructor(scene: Scene) {
    this.scene = scene;
    const emissive = (name: string, hex: string) => {
      const m = new StandardMaterial(name, scene);
      m.emissiveColor = Color3.FromHexString(hex);
      m.diffuseColor = Color3.Black();
      m.specularColor = Color3.Black();
      return m;
    };
    this.mNeutral = emissive('tok-n', '#57c7e3');
    this.mGood = emissive('tok-g', '#5fd29a');
    this.mBad = emissive('tok-b', '#e85f5f');
  }

  addNode(spec: SimNodeSpec) { this.nodes.set(spec.id, spec); }
  get activeTokens() { return this.tokens.length; }
  get trafficReport(): TrafficReport { return { ...this.report }; }

  /** Tear down the whole graph and any in-flight tokens (called between missions). */
  clear() {
    for (const t of this.tokens) t.mesh.dispose();
    this.tokens = [];
    this.queue = [];
    this.nodes.clear();
    this.report = { running: false, total: 0, resolved: 0, delivered: 0, dropped: 0, pass: null };
  }

  /** Launch a scored test: n tokens spawned round-robin from the given sources. */
  trafficTest(fromIds: string[], n: number, spacing = 0.45) {
    this.report = { running: true, total: n, resolved: 0, delivered: 0, dropped: 0, pass: null };
    for (let i = 0; i < n; i++) {
      this.queue.push({ at: fromIds[i % fromIds.length], kind: 'parcel', delay: i * spacing });
    }
  }

  spawn(atId: string, kind = 'parcel'): Token | null {
    const node = this.nodes.get(atId);
    if (!node) return null;
    const mesh = MeshBuilder.CreateBox(`tok${this.nextId}`, { size: 0.22 }, this.scene);
    mesh.material = this.mNeutral;
    mesh.rotation.y = Math.PI / 5;
    const t: Token = {
      id: this.nextId++, kind, mesh,
      logical: node.anchor.clone(),
      at: atId, target: null, outcome: null, fade: 0, phase: Math.random() * 6.28, meta: {},
    };
    this.tokens.push(t);
    this.route(t);
    return t;
  }

  update(dt: number) {
    // timed spawns
    for (const q of this.queue) q.delay -= dt;
    this.queue = this.queue.filter((q) => {
      if (q.delay <= 0) { this.spawn(q.at, q.kind); return false; }
      return true;
    });

    for (const t of this.tokens) {
      t.phase += dt * 7;
      if (t.outcome) {
        // outcome animation: delivered pops up + fades, dropped tumbles down
        t.fade -= dt;
        const k = Math.max(0, t.fade / 0.6);
        if (t.outcome === 'deliver') t.logical.y += dt * 1.6;
        else { t.logical.y -= dt * 2.2; t.mesh.rotation.x += dt * 9; }
        t.mesh.scaling.setAll(0.4 + k * 0.6);
        t.mesh.visibility = k;
      } else if (t.target) {
        const dest = this.nodes.get(t.target);
        if (!dest) { this.resolve(t, 'drop'); continue; }
        const d = dest.anchor.subtract(t.logical);
        const dist = d.length();
        const step = SPEED * dt;
        if (dist <= step) {
          t.logical.copyFrom(dest.anchor);
          t.at = t.target;
          this.route(t);
        } else {
          t.logical.addInPlace(d.scale(step / dist));
        }
      }
      t.mesh.position.copyFrom(t.logical);
      if (!t.outcome) t.mesh.position.y += Math.sin(t.phase) * BOB;
    }

    // sweep fully-faded tokens
    this.tokens = this.tokens.filter((t) => {
      if (t.outcome && t.fade <= 0) { t.mesh.dispose(); return false; }
      return true;
    });
  }

  private route(t: Token) {
    const node = this.nodes.get(t.at);
    if (!node) { this.resolve(t, 'drop'); return; }
    const nxt = node.next(t);
    if (nxt === 'deliver' || nxt === 'drop') this.resolve(t, nxt);
    else t.target = nxt;
  }

  private resolve(t: Token, outcome: Outcome) {
    if (t.outcome) return;
    t.outcome = outcome;
    t.fade = 0.6;
    t.target = null;
    t.mesh.material = outcome === 'deliver' ? this.mGood : this.mBad;
    if (this.report.running) {
      this.report.resolved++;
      if (outcome === 'deliver') this.report.delivered++;
      else this.report.dropped++;
      if (this.report.resolved >= this.report.total) {
        this.report.running = false;
        this.report.pass = this.report.delivered === this.report.total;
      }
    }
    this.onOutcome?.(outcome);
    this.onTokenResolved?.(t, outcome);
  }
}
