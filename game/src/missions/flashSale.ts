import { Vector3 } from '@babylonjs/core';
import type { Topic } from '@content';
import {
  aimPointer, crowdGate, dbTower, moduleBox, serverRack, socketRing, statusConsole,
  strobeBeacon, supplyPallet, type CarryModule,
} from '../world/kit';
import type { Carryable } from '../interact/carry';
import { Socket } from '../interact/sockets';
import { esc } from '../ui/uiShell';
import { MissionBase, type MissionStep, type TicketInfo } from './base';
import type { MissionDeps } from './manager';


type Beat = 'load' | 'drill';

const SLA = 50; // p99 ms
const BEATS: { id: Beat; label: string }[] = [
  { id: 'load', label: 'flash-sale load test' },
  { id: 'drill', label: 'failover drill (kill the cache node)' },
];

interface ModuleDef {
  id: string;
  kind: string;
  label: string;
  spot: [number, number]; // pallet slot (origin-relative x,z)
  visual: Parameters<typeof moduleBox>[2];
}

const MODULES: ModuleDef[] = [
  { id: 'mod-mem', kind: 'cache-mem', label: 'Memcached node', spot: [-7.3, -3.15], visual: { hex: '#2e6e80', glowHex: '#57c7e3' } },
  { id: 'mod-redis', kind: 'cache-redis', label: 'Redis primary', spot: [-6.5, -3.15], visual: { hex: '#8a3030', glowHex: '#ff8080' } },
  { id: 'mod-redis-rep', kind: 'cache-redis-rep', label: 'Redis standby replica', spot: [-5.7, -3.15], visual: { hex: '#5e2a2a', glowHex: '#c96a6a' } },
  { id: 'mod-rep1', kind: 'replica', label: 'Postgres read replica', spot: [-7.1, -4.05], visual: { hex: '#4b3f68', glowHex: '#8f7ae6', cyl: true, w: 0.6, h: 0.62 } },
  { id: 'mod-rep2', kind: 'replica', label: 'Postgres read replica', spot: [-6.2, -4.05], visual: { hex: '#4b3f68', glowHex: '#8f7ae6', cyl: true, w: 0.6, h: 0.62 } },
  { id: 'mod-bypass', kind: 'bypass', label: 'Debug bypass kit', spot: [-5.3, -4.05], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.34 } },
];

/** Flagship 6 (High-Performing), tangible edition: the fix is PHYSICAL. Carry
 *  modules from the delivery pallet, socket them (wrong bays refuse, the insecure
 *  bypass kit trips the security klaxon), and swing the read-path pointer so the
 *  app actually asks the cache (cache-aside is application-side). Traps: read
 *  replicas stay disk-bound; Memcached passes load and dies in the failover
 *  drill; a lone Redis primary without its standby dies the same way. */
export class FlashSaleMission extends MissionBase {
  private aimedAt: 'db' | 'cache' = 'db';
  private primaryDead = false;
  private beatsPassed = new Set<Beat>();
  private test: { beat: Beat; total: number; resolved: number } | null = null;
  private lastP99: string = '—';
  private modules = new Map<string, Carryable>();
  private bay!: Socket;
  private standby!: Socket;
  private pens: Socket[] = [];
  private m!: {
    gate: ReturnType<typeof crowdGate>;
    api: ReturnType<typeof serverRack>;
    db: ReturnType<typeof dbTower>;
    pointer: ReturnType<typeof aimPointer>;
    term: ReturnType<typeof statusConsole>;
  };
  private angDb = 0;
  private angCache = 0;

  constructor(deps: MissionDeps, topic: Topic) {
    super(deps, topic);
    this.buildLevel();
    this.wireSim();
    this.wireInteractables();
    this.applyLamps();
  }

  protected onUpdate(dt: number) {
    this.bay.update(dt);
    this.standby.update(dt);
    for (const p of this.pens) p.update(dt);
  }

  protected onDispose() {
    // if the engineer walks off site still holding a module, take it back
    const held = this.d.carry.held;
    if (held && this.modules.has(held.id)) this.d.carry.release();
    this.d.sim.onTokenResolved = undefined;
  }

  e2e() {
    const mods: Record<string, { x: number; z: number; socketed: boolean }> = {};
    for (const [id, c] of this.modules) {
      const p = c.root.getAbsolutePosition();
      mods[id] = { x: +p.x.toFixed(2), z: +p.z.toFixed(2), socketed: this.isSocketed(id) };
    }
    return {
      ...super.e2e(),
      aimedAt: this.aimedAt,
      bay: this.bay.occupant?.kind ?? null,
      standby: this.standby.occupant !== null,
      replicas: this.pens.filter((p) => p.occupant).length,
      primaryDead: this.primaryDead,
      mods,
    };
  }

  protected ticket(): TicketInfo {
    return {
      incident: 'INC-7031', reporter: 'storefront', sev: 'SEV-2', title: 'Flash-Sale Meltdown',
      bodyHtml:
        `<div>${esc('Tonight’s flash sale starts at 20:00 and the catalog is already on its knees: a handful of sale items drives almost every read, each one straight into the RDS primary. Marketing will not move the sale; the DBA will not approve a data-model change. Procurement dropped a pallet of equipment on site.')}</div>` +
        `<pre>p99 read latency .... 220 ms   (SLA: ${SLA} ms)\ndb primary CPU ...... 97%\ntraffic ............. 90% of reads → ~40 SKUs\nconstraint .......... same data model, tight budget</pre>`,
      hint: 'Probe the machines, diagnose at the field terminal, then get your hands dirty: carry modules to sockets and aim the read path. Load test AND failover drill must pass.',
    };
  }

  protected objectiveFor(step: MissionStep): [string, string] {
    const next = BEATS.find((b) => !this.beatsPassed.has(b.id));
    switch (step) {
      case 'investigate': return ['Investigate', `Probe the site (${Math.min(this.probes.size, 4)}/4) · diagnose at the field terminal`];
      case 'fix': return ['Fix', 'Carry a module from the pallet to a socket · aim the read path'];
      case 'verify': return ['Verify', next ? `Run the ${next.label} at the field terminal` : 'All tests passed'];
      case 'signoff': return ['Sign-off', 'Close the ticket at the field terminal (quiz)'];
      case 'done': return ['Resolved', 'INC-7031 closed — hot reads served from memory.'];
      default: return ['Ticket', 'Read the SEV-2 briefing'];
    }
  }

  protected summaryText(): string {
    return 'Symptom: a small hot set of repeated reads hammered the RDS primary (p99 220 ms vs 50 ms SLA). Fix: ElastiCache for Redis with a standby replica in front of the DB, read path aimed at the cache (cache-aside is application-side) — miss reads the DB once and populates, repeats come from memory. p99 7 ms, primary CPU 97→22%, and the node-kill drill failed over automatically. Memcached or a lone primary loses the whole hot set instead.';
  }

  // ------------------------------------------------------------------ level
  private buildLevel() {
    const s = this.d.scene;
    const o = this.d.origin;
    this.m = {
      gate: this.own(crowdGate(s, o.add(new Vector3(-8, 0, 0)), Math.PI / 2)),
      api: this.own(serverRack(s, o.add(new Vector3(-3, 0, 0)), Math.PI / 2)),
      db: this.own(dbTower(s, o.add(new Vector3(3, 0, 1.8)))),
      pointer: this.own(aimPointer(s, o.add(new Vector3(0, 0, -0.6)))),
      term: this.own(statusConsole(s, o.add(new Vector3(-7, 0, -6.5)), Math.PI)),
    };
    this.own(supplyPallet(s, o.add(new Vector3(-6.5, 0, -3.6))));

    // pointer target angles (front = +Z yaw convention)
    const px = 0, pz = -0.6;
    this.angDb = Math.atan2(3 - px, 1.8 - pz);
    this.angCache = Math.atan2(3 - px, -2.2 - pz);
    this.m.pointer.setAngle(this.angDb);

    // alarm strobes on two corners
    for (const [bx, bz] of [[-8.5, 6.5], [8.5, -6.5]] as const) {
      const b = strobeBeacon(s, o.add(new Vector3(bx, 0, bz)));
      this.ownNode(b.root);
      this.d.alarm.bindBeacon(b.setLevel);
    }

    // sockets: cache bay, standby bay, replica pen ×2 (interactable at the ring)
    const mkSocket = (id: string, label: string, at: Vector3, accepts: Socket['spec']['accepts']) => {
      const ring = socketRing(s, at);
      this.ownNode(ring.root);
      const socket = new Socket({ id, label, at, ring, accepts, onChange: () => this.onLayoutChange() });
      this.reg({
        id, node: ring.root, radius: 1.9,
        prompt: () => {
          const held = this.d.carry.held;
          if (held && this.modules.has(held.id)) return `Plug ${held.label} into the ${label}`;
          if (socket.occupant) return `Take out ${socket.occupant.label}`;
          return `Inspect ${label}`;
        },
        onInteract: () => this.socketInteract(socket),
      });
      return socket;
    };
    this.bay = mkSocket('so-bay', 'cache bay', o.add(new Vector3(3, 0, -2.2)), (k) => this.acceptsBay(k));
    this.standby = mkSocket('so-standby', 'standby bay', o.add(new Vector3(4.6, 0, -3.2)), (k) => this.acceptsStandby(k));
    this.pens = [
      mkSocket('so-pen1', 'replica pen', o.add(new Vector3(5.1, 0, 0.7)), (k) => this.acceptsPen(k)),
      mkSocket('so-pen2', 'replica pen', o.add(new Vector3(5.1, 0, 2.9)), (k) => this.acceptsPen(k)),
    ];

    // the pallet cargo: carryable modules with real bodies
    for (const def of MODULES) {
      const mod: CarryModule = moduleBox(s, o.add(new Vector3(def.spot[0], 0.24, def.spot[1])), def.visual);
      this.own(mod);
      this.modules.set(def.id, {
        id: def.id, kind: def.kind, label: def.label,
        root: mod.root, halfHeight: mod.halfHeight,
        killBody: mod.killBody, makeBody: mod.makeBody,
      });
    }
  }

  // ------------------------------------------------------------ socket rules
  private acceptsBay(kind: string) {
    if (kind === 'cache-mem' || kind === 'cache-redis') return { ok: true as const };
    if (kind === 'cache-redis-rep') return { ok: false as const, reason: 'That’s the standby replica — the PRIMARY goes here. The standby has its own bay behind.' };
    if (kind === 'replica') return { ok: false as const, reason: 'That’s a disk-bound Postgres engine. This bay feeds a MEMORY module — it would just be a slower, weirder database.' };
    return {
      ok: false as const,
      reason: 'BLOCKED: the debug bypass would expose the database port to the public internet. Fast, and fired-by-Friday insecure.',
      alarm: 'SECURITY — PUBLIC PORT EXPOSURE ATTEMPT',
    };
  }

  private acceptsStandby(kind: string) {
    if (kind === 'cache-redis-rep') {
      if (this.bay.occupant?.kind !== 'cache-redis') return { ok: false as const, reason: 'A standby FOLLOWS a Redis primary — socket the primary in the cache bay first.' };
      return { ok: true as const };
    }
    if (kind === 'cache-mem') return { ok: false as const, reason: 'Memcached has no replication — there is no standby for it. That’s the whole point (and the whole problem).' };
    if (kind === 'cache-redis') return { ok: false as const, reason: 'That’s the primary — it belongs in the main cache bay.' };
    if (kind === 'replica') return { ok: false as const, reason: 'Postgres replicas live in the replica pen by the database.' };
    return {
      ok: false as const,
      reason: 'BLOCKED: the debug bypass would expose the database port to the public internet.',
      alarm: 'SECURITY — PUBLIC PORT EXPOSURE ATTEMPT',
    };
  }

  private acceptsPen(kind: string) {
    if (kind === 'replica') return { ok: true as const };
    if (kind.startsWith('cache-')) return { ok: false as const, reason: 'Memory modules don’t speak Postgres replication — the pen is for database read replicas.' };
    return {
      ok: false as const,
      reason: 'BLOCKED: the debug bypass would expose the database port to the public internet.',
      alarm: 'SECURITY — PUBLIC PORT EXPOSURE ATTEMPT',
    };
  }

  /** Any physical change (plug/unplug/aim) invalidates test results. */
  private onLayoutChange() {
    this.primaryDead = false;
    if (this.beatsPassed.size) this.d.toast.show('Layout changed — test results reset.', 'info', 2);
    this.beatsPassed.clear();
    if (this.step === 'fix') this.step = 'verify';
    this.applyLamps();
    this.refreshObjective();
  }

  private state() {
    return {
      cacheKind: this.bay.occupant?.kind ?? null,
      standby: this.standby.occupant !== null,
      replicas: this.pens.filter((p) => p.occupant).length,
    };
  }

  // -------------------------------------------------------------------- sim
  private wireSim() {
    const { sim } = this.d;
    const o = this.d.origin;
    sim.addNode({ id: 'gate', anchor: this.m.gate.anchor, next: () => 'api' });
    sim.addNode({
      id: 'api', anchor: this.m.api.anchor,
      next: (t) => {
        if (this.aimedAt !== 'cache') return 'dbm';
        const s = this.state();
        if (!s.cacheKind) return 'cache'; // aimed at an empty bay: tokens die at the socket
        if (this.primaryDead) return s.standby && s.cacheKind === 'cache-redis' ? 'rep' : 'dbm';
        return t.id % 5 === 0 ? 'dbm' : 'cache'; // ~20% miss theater — miss reads DB once, then populates
      },
    });
    sim.addNode({ id: 'cache', anchor: o.add(new Vector3(3, 0.95, -2.2)), next: () => (this.bay.occupant && !this.primaryDead ? 'deliver' : 'drop') });
    sim.addNode({ id: 'rep', anchor: o.add(new Vector3(4.6, 0.95, -3.2)), next: () => (this.standby.occupant ? 'deliver' : 'drop') });
    sim.addNode({ id: 'dbm', anchor: this.m.db.anchor, next: () => (this.test?.beat === 'drill' && this.primaryDead ? 'drop' : 'deliver') });
    sim.onTokenResolved = () => {
      const t = this.test;
      if (!t) return;
      t.resolved++;
      if (t.resolved >= t.total) {
        this.test = null;
        if (t.beat === 'load') this.onLoadDone();
        else this.onDrillDone();
      }
    };
  }

  private applyLamps() {
    const good = this.step === 'signoff' || this.step === 'done';
    this.m.gate.setLamp?.(good ? 'ok' : 'off');
    this.m.api.setLamp?.('ok');
    this.m.db.setLamp?.(good || this.beatsPassed.has('load') ? 'ok' : 'bad');
    this.m.term.setLamp?.(good ? 'ok' : 'off');
    this.m.pointer.setLamp?.(this.aimedAt === 'cache' ? 'ok' : 'off');
  }

  // ------------------------------------------------------------ interactables
  private wireInteractables() {
    const m = this.m;
    this.reg({ id: 'fs-gate', node: m.gate.root, prompt: 'Inspect the shoppers', onInteract: () => this.probeGate() });
    this.reg({ id: 'fs-api', node: m.api.root, prompt: 'Inspect catalog-api', onInteract: () => this.probeApi() });
    this.reg({ id: 'fs-db', node: m.db.root, prompt: 'Inspect catalog-db', onInteract: () => this.probeDb() });
    this.reg({ id: 'fs-term', node: m.term.root, prompt: 'Open field terminal', onInteract: () => this.openTerminal() });
    this.reg({
      id: 'fs-aim', node: m.pointer.root, radius: 1.9,
      prompt: () => (this.step === 'fix' || this.step === 'verify' ? 'Grab the read-path pointer' : 'Inspect read-path pointer'),
      onInteract: () => this.onPointer(),
    });

    // carryable modules (pickable once the diagnosis is in)
    for (const c of this.modules.values()) {
      this.reg({
        id: c.id, node: c.root, radius: 1.8,
        prompt: `Pick up ${c.label}`,
        enabled: () => (this.step === 'fix' || this.step === 'verify') && !this.d.carry.held && !this.isSocketed(c.id),
        onInteract: () => { this.d.carry.pickup(c); this.d.toast.show(`${c.label} — heavy. Find it a socket.`, 'info', 2.2); },
      });
    }
  }

  private isSocketed(id: string) {
    return this.bay.occupant?.id === id || this.standby.occupant?.id === id || this.pens.some((p) => p.occupant?.id === id);
  }

  // ---------------------------------------------------------------- pointer
  private onPointer() {
    if (this.step !== 'fix' && this.step !== 'verify') {
      this.probed('aim', 'Read-path pointer: hard-aimed at catalog-db. The app never asks anything else — cache-aside is the APP’s decision.');
      this.d.ui.open({
        id: 'fs-probe-aim', kicker: 'Read path', title: 'app → catalog-db',
        bodyHtml: `<div>${esc('The catalog app’s read path is a physical pointer here, and it aims straight at the database. Whatever gets provisioned, the APP decides what it asks first — caching is not magic interception.')}</div>`,
        actions: [{ label: 'Close' }],
      });
      return;
    }
    let ang = this.m.pointer.getAngle();
    this.d.grab.begin({
      prompt: '◀ ▶ aim the read path · E/Ⓧ lock',
      step: (dt, mx) => {
        ang = Math.min(2.6, Math.max(0.3, ang + mx * 1.7 * dt));
        this.m.pointer.setAngle(ang);
      },
      release: () => this.lockAim(ang),
    });
  }

  private lockAim(ang: number) {
    const targets: { id: 'db' | 'cache'; at: number; label: string }[] = [
      { id: 'db', at: this.angDb, label: 'catalog-db' },
      { id: 'cache', at: this.angCache, label: 'the cache bay' },
    ];
    let best: (typeof targets)[number] | null = null;
    for (const t of targets) if (Math.abs(ang - t.at) < 0.3 && (!best || Math.abs(ang - t.at) < Math.abs(ang - best.at))) best = t;
    if (!best) {
      this.m.pointer.setAngle(this.aimedAt === 'db' ? this.angDb : this.angCache);
      this.d.toast.show('Not lined up with anything — read path unchanged.', 'bad', 2.4);
      return;
    }
    this.m.pointer.setAngle(best.at);
    if (best.id !== this.aimedAt) {
      this.aimedAt = best.id;
      this.d.journal.add(`Read path re-aimed: app → ${best.label}.`);
      this.onLayoutChange();
    }
    this.d.toast.show(`Read path locked → ${best.label}.`, 'ok', 2.2);
  }

  // ---------------------------------------------------------------- sockets
  private socketInteract(so: Socket) {
    const held = this.d.carry.held;
    if (held) {
      if (!this.modules.has(held.id)) return;
      const v = so.canPlug(held.kind);
      if (v.ok) {
        const c = this.d.carry.release()!;
        so.put(c);
        this.d.toast.show(`${c.label} seated — ${so.spec.label} online.`, 'ok', 2.4);
        this.d.journal.add(`Socketed: ${c.label} → ${so.spec.label}.`);
      } else {
        this.d.toast.show(v.reason, 'bad', 3.4);
        if (v.alarm) {
          this.d.alarm.raise(v.alarm, 5);
          this.d.journal.add(`SECURITY ALARM: tried to socket the ${held.label} — public port exposure blocked.`);
        }
      }
      return;
    }
    if (so.occupant) {
      const c = so.takeOut()!;
      this.d.carry.take(c);
      this.d.toast.show(`${c.label} removed from the ${so.spec.label}.`, 'info', 2);
      return;
    }
    this.d.ui.open({
      id: `${so.spec.id}-info`, kicker: 'Socket', title: so.spec.label,
      bodyHtml: `<div>${esc(this.socketBlurb(so))}</div>`,
      actions: [{ label: 'Close' }],
    });
  }

  private socketBlurb(so: Socket) {
    if (so === this.bay) return 'The cache bay: memory modules only. Whatever sits here answers the hot set at RAM speed — IF the read path actually asks it.';
    if (so === this.standby) return 'The standby bay: a Redis replica keeps a live copy of the primary’s memory. When the primary dies, this one is promoted automatically.';
    return 'The replica pen: rack Postgres read replicas here to spread read load across more disk-bound engines.';
  }

  // ---------------------------------------------------------------- probes
  private probeGate() {
    this.probed('gate', 'Traffic: 90% of reads target ~40 sale SKUs — the same tiny hot set, over and over.');
    this.d.ui.open({
      id: 'fs-probe-gate', kicker: 'Traffic profile', title: 'Who asks for what',
      bodyHtml: `<pre>reads/s ............. 8,400 and climbing\ntop 40 SKUs ......... 90% of all reads\nwrites .............. 1.2% (unaffected)\nsale starts ......... 20:00 (immovable)</pre><div>${esc('Thousands of shoppers asking the same forty questions.')}</div>`,
      actions: [{ label: 'Close' }],
    });
  }

  private probeApi() {
    this.probed('api', 'catalog-api: app tier healthy (CPU 31%) — threads just sit waiting on the database.');
    this.d.ui.open({
      id: 'fs-probe-api', kicker: 'catalog-api · app tier', title: 'The rack is fine',
      bodyHtml: `<pre>app CPU ............. 31%\np99 request time .... 220 ms\n  └ of which DB call  214 ms\nthread pool ......... waiting on catalog-db</pre>`,
      actions: [{ label: 'Close' }],
    });
  }

  private probeDb() {
    this.probed('db', 'catalog-db: CPU 97% — slow-query log is the SAME SELECT on the 40 sale items, thousands of times a minute.');
    this.d.ui.open({
      id: 'fs-probe-db', kicker: 'catalog-db · RDS PostgreSQL', title: 'The pantry is on fire',
      bodyHtml: `<pre>primary CPU ......... 97%\nslow-query log ...... SELECT … WHERE id IN (sale items)\n                      × 4,100/min — identical, repeated\nbuffer cache ........ thrashing\nverdict ............. answering the same question\n                      from disk, forever</pre>`,
      actions: [{ label: 'Close' }],
    });
  }

  // --------------------------------------------------------- field terminal
  private openTerminal() {
    const s = this.state();
    const beatsLine = BEATS.map((b) => `${this.beatsPassed.has(b.id) ? '✓' : '·'} ${b.label}`).join('\n');
    const layout =
      `read path ......... app → ${this.aimedAt === 'cache' ? 'cache bay' : 'catalog-db'}\n` +
      `cache bay ......... ${this.bay.occupant?.label ?? 'EMPTY'}\n` +
      `standby bay ....... ${this.standby.occupant?.label ?? '—'}\n` +
      `replica pen ....... ${s.replicas ? `${s.replicas} racked` : 'empty'}\n` +
      `last p99 .......... ${this.lastP99}`;
    const actions = [];
    if (this.step === 'investigate') {
      actions.push({ label: 'Run flash-sale load test — see the damage', closes: true, onSelect: () => this.runLoad() });
      if (this.probes.has('db')) actions.push({ label: 'Diagnose root cause…', closes: false, onSelect: () => this.openDiag() });
    } else if (this.step === 'fix') {
      actions.push({ label: 'Run flash-sale load test', closes: true, onSelect: () => this.runLoad() });
    } else if (this.step === 'verify') {
      const next = BEATS.find((b) => !this.beatsPassed.has(b.id));
      if (next) actions.push({ label: `Run ${next.label}`, closes: true, onSelect: () => (next.id === 'load' ? this.runLoad() : this.runDrill()) });
    } else if (this.step === 'signoff') {
      actions.push({ label: 'Close ticket — sign off (quiz)', closes: false, onSelect: () => this.startSignoff(() => this.applyLamps()) });
    } else if (this.step === 'done') {
      actions.push({ label: 'Ticket summary', closes: false, onSelect: () => this.openSummary() });
    }
    actions.push({ label: 'Close' });
    this.d.ui.open({
      id: 'fs-terminal', kicker: 'Field terminal · INC-7031', title: 'Read-path health',
      bodyHtml: `<pre>step: ${this.step.toUpperCase()}\n${esc(layout)}\n\n${esc(beatsLine)}</pre>`,
      actions,
    });
  }

  private openDiag() {
    this.openDiagnosis({
      title: 'Why is p99 at 220 ms?',
      correct: {
        label: 'A tiny hot set is read over and over, straight from the DB every time — serve repeats from an in-memory cache (cache-aside)',
        journal: 'Diagnosis confirmed: repeated hot-set reads belong in memory, not on the primary’s disks.',
        confirmBody: 'The slow-query log said it plainly: the same forty items, four thousand times a minute, answered from disk every single time. Put memory in front — and remember cache-aside is the APP’s job: socket a module AND aim the read path at it.',
        actionLabel: 'To the pallet →',
      },
      wrongs: [
        { label: 'The app tier is under-provisioned — add more catalog-api racks', rebuttal: 'App CPU is 31% and its threads are WAITING on the database. More waiters don’t make the kitchen faster.' },
        { label: 'The storage engine is too slow — migrate the catalog to DynamoDB', rebuttal: 'A re-architecture with a data-model change the DBA already vetoed — and the sale starts at 20:00. Wrong tool for tonight.' },
        { label: 'The network between app and DB is saturated', rebuttal: 'The link sits at 7% utilization. The 214 ms lives inside the database, not on the wire.' },
      ],
    });
  }

  // ------------------------------------------------------------- test beats
  private runLoad() {
    this.m.term.setLamp?.('off');
    this.test = { beat: 'load', total: 10, resolved: 0 };
    for (let i = 0; i < 10; i++) this.schedule(i * 0.25, () => this.d.sim.spawn('gate', 'read'));
    this.d.journal.add('Flash-sale load test: replaying tonight’s hot-set traffic…');
  }

  private onLoadDone() {
    const s = this.state();
    const verdict = this.loadVerdict(s);
    this.lastP99 = verdict.p99;
    const table = `<pre>p99 read latency .... ${verdict.p99}   (SLA ${SLA} ms)\ndb primary CPU ...... ${verdict.cpu}\n(${esc(verdict.note)})</pre>`;
    if (this.step === 'investigate' || this.step === 'fix') {
      this.d.journal.add(`Baseline load test: p99 ${verdict.p99} against a ${SLA} ms SLA.`);
      this.d.ui.open({ id: 'fs-load-info', kicker: 'Load test', title: `p99 ${verdict.p99} — SLA is ${SLA} ms`, bodyHtml: table, actions: [{ label: 'Ouch. Close' }] });
      return;
    }
    if (this.step !== 'verify') return;
    if (verdict.pass) {
      this.beatsPassed.add('load');
      this.applyLamps();
      this.refreshObjective();
      this.d.journal.add(`Load test PASSED: p99 ${verdict.p99} — repeats served from memory; miss → DB once → populate.`);
      if (s.replicas > 0) this.d.toast.show('The Postgres replicas are idle overhead now (+$310/mo) — consider wheeling them back.', 'info', 3.5);
      this.d.ui.open({
        id: 'fs-load-pass', kicker: 'Load test', title: `✔ p99 ${verdict.p99} — SLA holds`,
        bodyHtml: table + `<div>${esc('Cache-aside at work: first read of each SKU missed and hit the DB once; every repeat came from memory. Set a TTL so prices don’t go stale. One test left: nodes fail — drill it.')}</div>`,
        actions: [{ label: 'Next: the failover drill →' }],
      });
    } else {
      this.beatFailed('load test', verdict.note);
      this.d.ui.open({ id: 'fs-load-fail', kicker: 'Load test', title: `✘ p99 ${verdict.p99} — SLA is ${SLA} ms`, bodyHtml: table + `<div>${esc(verdict.note)}</div>`, actions: [{ label: 'Back to work →' }] });
    }
  }

  private loadVerdict(s: { cacheKind: string | null; standby: boolean; replicas: number }) {
    if (this.aimedAt === 'cache') {
      if (!s.cacheKind) {
        return { pass: false, p99: 'timeouts', cpu: '97%', note: 'The read path points at an EMPTY bay — every read burned its timeout, then fell back to the drowning primary. Socket a memory module.' };
      }
      const mem = s.cacheKind === 'cache-mem';
      return { pass: true, p99: mem ? '6 ms' : '7 ms', cpu: mem ? '21%' : '22%', note: 'hot set served from memory (cache-aside)' };
    }
    if (s.cacheKind) {
      return { pass: false, p99: '220 ms', cpu: '97%', note: 'A cache is seated — and completely IDLE. Cache-aside is application-side: the app asks what the READ PATH points at. Grab the pointer and aim it at the cache bay.' };
    }
    if (s.replicas > 0) {
      return { pass: false, p99: '88 ms', cpu: '54%', note: 'Better throughput, same physics: every read still hits a disk-bound engine, so p99 stays ~88 ms — and replication lag serves stale prices mid-sale. Priciest option on the pallet, too. The hot set belongs in MEMORY.' };
    }
    return { pass: false, p99: '220 ms', cpu: '97%', note: 'every read goes to the database' };
  }

  private runDrill() {
    this.m.term.setLamp?.('off');
    this.primaryDead = true;
    this.bay.markBad();
    this.d.journal.add('Failover drill: killing the cache node mid-sale…');
    this.d.toast.show('Drill: the cache primary just went dark.', 'bad', 2.5);
    this.test = { beat: 'drill', total: 6, resolved: 0 };
    for (let i = 0; i < 6; i++) this.schedule(0.4 + i * 0.3, () => this.d.sim.spawn('gate', 'read'));
  }

  private onDrillDone() {
    if (this.step !== 'verify') return;
    const s = this.state();
    if (s.cacheKind === 'cache-redis' && s.standby) {
      this.primaryDead = false;
      this.bay.spec.ring.setState('ok');
      this.d.journal.add('Failover drill PASSED: standby promoted automatically (~14 s); ElastiCache is already replacing the dead node.');
      this.allBeatsPassed(
        '✔ Node lost, nobody noticed',
        'The primary died and the standby was promoted automatically — p99 blipped to 9 ms and settled. ElastiCache replaces the failed node on its own. That replication + automatic failover (plus persistence, sorted sets, pub/sub) is exactly what Redis adds over Memcached. Close the ticket at the field terminal.',
        'Load test and failover drill both passed — replicated Redis cache-aside in front of the DB.',
      );
      this.applyLamps();
    } else {
      this.d.alarm.raise('DATABASE OVERLOAD — CACHE LOST', 5);
      const note = s.cacheKind === 'cache-mem'
        ? 'The Memcached node died and took the ENTIRE hot set with it — no replication, no persistence, no failover. Every read became a miss and the thundering herd hit the primary at 97% CPU. If the cache must survive node loss, you need Redis with a standby.'
        : 'Your Redis primary died with NO standby behind it — nothing to promote, so the herd hit the primary. Carry the standby replica to its bay and drill again.';
      this.d.journal.add('SITE ALARM: database overload — the herd hit the primary when the cache died.');
      this.beatFailed('failover drill', note);
    }
  }
}
