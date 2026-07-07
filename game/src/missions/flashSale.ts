import { Color3, MeshBuilder, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core';
import type { Topic } from '@content';
import { cacheNode, crowdGate, dbTower, routeBoard, serverRack, statusConsole, type Machine } from '../world/kit';
import { esc } from '../ui/uiShell';
import { MissionBase, type TicketInfo } from './base';
import type { MissionDeps } from './manager';
import type { MissionStep } from './patchNight';

type Prov = 'none' | 'replicas' | 'memcached' | 'redis';
type Beat = 'load' | 'drill';

const SLA = 50; // p99 ms
// Flash-sale outcome per provisioning choice: p99 latency, primary CPU, added monthly cost.
const METRICS: Record<Prov, { p99: number; cpu: number; cost: number; note: string }> = {
  none: { p99: 220, cpu: 97, cost: 0, note: 'every read goes to the database' },
  replicas: { p99: 88, cpu: 54, cost: 310, note: 'reads spread across replicas — each one still disk-bound' },
  memcached: { p99: 6, cpu: 21, cost: 38, note: 'hot set served from memory (cache-aside)' },
  redis: { p99: 7, cpu: 22, cost: 76, note: 'hot set from memory · replica standing by' },
};
const BEATS: { id: Beat; label: string }[] = [
  { id: 'load', label: 'flash-sale load test' },
  { id: 'drill', label: 'failover drill (kill the cache node)' },
];

/** Flagship 6 (High-Performing): SEV-2 "Flash-Sale Meltdown" — 90% of reads hit ~40 hot
 *  SKUs straight on the DB; p99 blows the 50 ms SLA. Fix: ElastiCache in front (cache-aside).
 *  Traps: read replicas spread load but stay disk-bound (SLA still missed, priciest option);
 *  Memcached passes the load test and then loses everything in the failover drill —
 *  replication + automatic failover is Redis territory. */
export class FlashSaleMission extends MissionBase {
  private provision: Prov = 'none';
  private beatsPassed = new Set<Beat>();
  private primaryDead = false;
  private test: { beat: Beat; total: number; resolved: number } | null = null;
  private prov: Machine[] = [];
  private m!: {
    gate: ReturnType<typeof crowdGate>;
    api: ReturnType<typeof serverRack>;
    db: ReturnType<typeof dbTower>;
    bay: TransformNode;
    board: ReturnType<typeof routeBoard>;
    term: ReturnType<typeof statusConsole>;
  };

  constructor(deps: MissionDeps, topic: Topic) {
    super(deps, topic);
    this.buildLevel();
    this.wireSim();
    this.wireInteractables();
    this.applyLamps();
  }

  protected onUpdate(dt: number) { for (const p of this.prov) p.update?.(dt); }
  protected onDispose() {
    this.clearProvision();
    this.d.sim.onTokenResolved = undefined;
  }

  protected ticket(): TicketInfo {
    return {
      incident: 'INC-7031', reporter: 'storefront', sev: 'SEV-2', title: 'Flash-Sale Meltdown',
      bodyHtml:
        `<div>${esc('Tonight’s flash sale starts at 20:00 and the catalog is already on its knees: a handful of sale items drives almost every read, each one straight into the RDS primary. Marketing will not move the sale; the DBA will not approve a data-model change.')}</div>` +
        `<pre>p99 read latency .... 220 ms   (SLA: ${SLA} ms)\ndb primary CPU ...... 97%\ntraffic ............. 90% of reads → ~40 SKUs\nconstraint .......... same data model, tight budget</pre>`,
      hint: 'Probe the machines, diagnose at the field terminal, provision at the board. The load test AND the failover drill must both pass.',
    };
  }

  protected objectiveFor(step: MissionStep): [string, string] {
    const next = BEATS.find((b) => !this.beatsPassed.has(b.id));
    switch (step) {
      case 'investigate': return ['Investigate', `Probe the site (${this.probes.size}/4) · diagnose at the field terminal`];
      case 'fix': return ['Fix', 'Provision the fix at the board'];
      case 'verify': return ['Verify', next ? `Run the ${next.label} at the field terminal` : 'All tests passed'];
      case 'signoff': return ['Sign-off', 'Close the ticket at the field terminal (quiz)'];
      case 'done': return ['Resolved', 'INC-7031 closed — hot reads served from memory.'];
      default: return ['Ticket', 'Read the SEV-2 briefing'];
    }
  }

  protected summaryText(): string {
    return 'Symptom: a small hot set of repeated reads hammered the RDS primary (p99 220 ms vs 50 ms SLA). Fix: ElastiCache for Redis in front of the DB, cache-aside — miss reads the DB once and populates, repeats come from memory. p99 6–7 ms, primary CPU 97→22%, and the replicated cache survived the node-kill drill via automatic failover (Memcached would have lost the whole hot set).';
  }

  // ------------------------------------------------------------------ level
  private buildLevel() {
    const s = this.d.scene;
    const o = this.d.origin;
    this.m = {
      gate: this.own(crowdGate(s, o.add(new Vector3(-8, 0, 0)), Math.PI / 2)),
      api: this.own(serverRack(s, o.add(new Vector3(-3, 0, 0)), Math.PI / 2)),
      db: this.own(dbTower(s, o.add(new Vector3(3, 0, 1.8)))),
      bay: this.buildBay(o.add(new Vector3(3, 0, -2.2))),
      board: this.own(routeBoard(s, o.add(new Vector3(-3, 0, -6.5)), 0)),
      term: this.own(statusConsole(s, o.add(new Vector3(-7, 0, -6.5)), Math.PI)),
    };
  }

  /** The empty expansion bay: a marked plinth with power + network stubbed in. */
  private buildBay(at: Vector3): TransformNode {
    const s = this.d.scene;
    const root = new TransformNode('bay', s);
    root.position.copyFrom(at);
    const padM = new StandardMaterial('bay-pm', s);
    padM.diffuseColor = Color3.FromHexString('#262b38');
    padM.specularColor = new Color3(0.05, 0.05, 0.05);
    const edgeM = new StandardMaterial('bay-em', s);
    edgeM.emissiveColor = Color3.FromHexString('#3f77c2');
    edgeM.diffuseColor = Color3.Black();
    const pad = MeshBuilder.CreateBox('bay-p', { width: 1.6, height: 0.1, depth: 1.6 }, s);
    pad.parent = root; pad.position.y = 0.05; pad.material = padM;
    const edge = MeshBuilder.CreateBox('bay-e', { width: 1.72, height: 0.04, depth: 1.72 }, s);
    edge.parent = root; edge.position.y = 0.02; edge.material = edgeM;
    this.ownNode(root);
    return root;
  }

  private wireSim() {
    const { sim } = this.d;
    const o = this.d.origin;
    const cacheUp = () => (this.provision === 'memcached' || this.provision === 'redis') && !this.primaryDead;
    sim.addNode({ id: 'gate', anchor: this.m.gate.anchor, next: () => 'api' });
    sim.addNode({
      id: 'api', anchor: this.m.api.anchor,
      next: (t) => {
        if (this.provision === 'redis' && this.primaryDead) return 'rep'; // automatic failover
        if (!cacheUp()) return 'dbm';
        return t.id % 5 === 0 ? 'dbm' : 'cache'; // ~20% miss theater: miss → DB once, then cached
      },
    });
    sim.addNode({ id: 'cache', anchor: o.add(new Vector3(3, 0.95, -2.2)), next: () => 'deliver' });
    sim.addNode({ id: 'rep', anchor: o.add(new Vector3(4.4, 0.95, -3.1)), next: () => 'deliver' });
    // the herd: with the (unreplicated) cache dead mid-drill, reads time out at the saturated primary
    sim.addNode({
      id: 'dbm', anchor: this.m.db.anchor,
      next: () => (this.test?.beat === 'drill' && this.primaryDead && this.provision === 'memcached' ? 'drop' : 'deliver'),
    });
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

  // ------------------------------------------------------------ provisioning
  private clearProvision() {
    for (const p of this.prov) p.root.dispose();
    this.prov = [];
  }

  private applyProvision() {
    this.clearProvision();
    this.primaryDead = false;
    const s = this.d.scene;
    const o = this.d.origin;
    if (this.provision === 'replicas') {
      for (const dz of [-1.4, 1.4]) {
        const r = dbTower(s, o.add(new Vector3(4.8, 0, 1.8 + dz)));
        r.setLamp?.('ok');
        this.prov.push(r);
      }
    } else if (this.provision === 'memcached') {
      const c = cacheNode(s, o.add(new Vector3(3, 0, -2.2)));
      c.setLamp?.('ok');
      this.prov.push(c);
    } else if (this.provision === 'redis') {
      const p = cacheNode(s, o.add(new Vector3(3, 0, -2.2)));
      const r = cacheNode(s, o.add(new Vector3(4.4, 0, -3.1)), 0, true);
      p.setLamp?.('ok'); r.setLamp?.('ok');
      this.prov.push(p, r);
    }
    this.applyLamps();
  }

  private applyLamps() {
    const good = this.step === 'signoff' || this.step === 'done';
    this.m.gate.setLamp?.(good ? 'ok' : 'off');
    this.m.api.setLamp?.('ok');
    this.m.db.setLamp?.(good || this.beatsPassed.has('load') ? 'ok' : 'bad');
    this.m.term.setLamp?.(good ? 'ok' : 'off');
    this.m.board.setLamp?.(good ? 'ok' : this.provision === 'none' ? 'bad' : 'ok');
    this.m.board.setSlot(0, this.provision === 'memcached' || this.provision === 'redis'); // cache in front
    this.m.board.setSlot(1, this.provision === 'redis'); //                                   replicated / failover
    this.m.board.setSlot(2, this.provision === 'replicas'); //                                DB read replicas
  }

  // ------------------------------------------------------------ interactables
  private wireInteractables() {
    const m = this.m;
    this.reg({ id: 'fs-gate', node: m.gate.root, prompt: 'Inspect the shoppers', onInteract: () => this.probeGate() });
    this.reg({ id: 'fs-api', node: m.api.root, prompt: 'Inspect catalog-api', onInteract: () => this.probeApi() });
    this.reg({ id: 'fs-db', node: m.db.root, prompt: 'Inspect catalog-db', onInteract: () => this.probeDb() });
    this.reg({ id: 'fs-bay', node: m.bay, prompt: 'Inspect expansion bay', onInteract: () => this.probeBay() });
    this.reg({ id: 'fs-board', node: m.board.root, prompt: 'Provisioning board', onInteract: () => this.openBoard() });
    this.reg({ id: 'fs-term', node: m.term.root, prompt: 'Open field terminal', onInteract: () => this.openTerminal() });
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

  private probeBay() {
    this.probed('bay', 'Expansion bay: power + network stubbed in next to the DB — room for one module.');
    this.d.ui.open({
      id: 'fs-probe-bay', kicker: 'Expansion bay', title: 'Empty slot, live feeds',
      bodyHtml: `<div>${esc('A prepared pad beside the database: power, network, service discovery — waiting for whatever module you provision at the board.')}</div>`,
      actions: [{ label: 'Close' }],
    });
  }

  // ------------------------------------------------------------------ board
  private openBoard() {
    if (this.step !== 'fix' && this.step !== 'verify') {
      this.probed('board', 'Provisioning board: nothing provisioned — every read rides straight to the primary.');
      this.d.ui.open({
        id: 'fs-board-probe', kicker: 'Provisioning', title: 'Nothing provisioned',
        bodyHtml: `<div>${esc('The read path is app → database, full stop. Diagnose at the field terminal first.')}</div>`,
        actions: [{ label: 'Close' }],
      });
      return;
    }
    const pick = (p: Prov, label: string, journal: string) => ({
      label,
      onSelect: () => {
        this.provision = p;
        this.beatsPassed.clear();
        if (this.step === 'fix') this.step = 'verify';
        this.d.journal.add(journal);
        this.applyProvision();
        this.refreshObjective();
      },
    });
    this.d.ui.open({
      id: 'fs-board', kicker: 'Provisioning', title: 'Choose the fix',
      bodyHtml: `<div>${esc('One module in the bay (or scale the DB itself). The load test must hold the 50 ms SLA — and the failover drill kills a node while the sale runs.')}</div>`,
      actions: [
        pick('replicas', 'Provision 2× RDS read replicas (scale the database out for reads)',
          'Provisioned: 2× read replicas — read traffic spread across three disk-bound instances.'),
        pick('memcached', 'Install ElastiCache — Memcached (simplest, cheapest cache)',
          'Provisioned: Memcached — cache-aside: miss reads the DB once and populates; repeats hit memory. No replication.'),
        pick('redis', 'Install ElastiCache — Redis, replicated with automatic failover',
          'Provisioned: Redis (replicated) — cache-aside + a standby replica; failover is automatic.'),
        pick('none', 'Leave as-is (ride out the sale)', 'Provisioned: nothing. Brave.'),
        { label: 'Cancel' },
      ],
    });
  }

  // --------------------------------------------------------- field terminal
  private openTerminal() {
    const c = METRICS[this.provision];
    const beatsLine = BEATS.map((b) => `${this.beatsPassed.has(b.id) ? '✓' : '·'} ${b.label}`).join('\n');
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
      bodyHtml: `<pre>step: ${this.step.toUpperCase()}\np99 read latency .... ${c.p99} ms   (SLA ${SLA} ms)\ndb primary CPU ...... ${c.cpu}%\nadded cost .......... +$${c.cost}/mo\n(${esc(c.note)})\n\n${esc(beatsLine)}</pre>`,
      actions,
    });
  }

  private openDiag() {
    this.openDiagnosis({
      title: 'Why is p99 at 220 ms?',
      correct: {
        label: 'A tiny hot set is read over and over, straight from the DB every time — serve repeats from an in-memory cache (cache-aside)',
        journal: 'Diagnosis confirmed: repeated hot-set reads belong in memory, not on the primary’s disks.',
        confirmBody: 'The slow-query log said it plainly: the same forty items, four thousand times a minute, answered from disk every single time. Put memory in front — a cache miss reads the DB once and populates; every repeat is served in microseconds. Provision at the board.',
        actionLabel: 'To the board →',
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
    const c = METRICS[this.provision];
    const table = `<pre>p99 read latency .... ${c.p99} ms   (SLA ${SLA} ms)\ndb primary CPU ...... ${c.cpu}%\nadded cost .......... +$${c.cost}/mo\n(${esc(c.note)})</pre>`;
    if (this.step === 'investigate' || this.step === 'fix') {
      this.d.journal.add(`Baseline load test: p99 ${c.p99} ms against a ${SLA} ms SLA — the DB answers every read from disk.`);
      this.d.ui.open({ id: 'fs-load-info', kicker: 'Load test', title: `p99 ${c.p99} ms — SLA is ${SLA} ms`, bodyHtml: table, actions: [{ label: 'Ouch. Close' }] });
      return;
    }
    if (this.step !== 'verify') return;
    if (c.p99 <= SLA) {
      this.beatsPassed.add('load');
      this.applyLamps();
      this.refreshObjective();
      this.d.journal.add(`Load test PASSED: p99 ${c.p99} ms — repeats served from memory; miss → DB once → populate.`);
      this.d.ui.open({
        id: 'fs-load-pass', kicker: 'Load test', title: `✔ p99 ${c.p99} ms — SLA holds`,
        bodyHtml: table + `<div>${esc('Cache-aside at work: the first read of each SKU missed and hit the DB once; every repeat came from memory. Set a TTL so prices don’t go stale. One test left: nodes fail — drill it.')}</div>`,
        actions: [{ label: 'Next: the failover drill →' }],
      });
    } else {
      const note = this.provision === 'replicas'
        ? 'Better throughput, same physics: every read still hits a disk-bound engine, so p99 stays ~88 ms — and replication lag serves stale prices mid-sale. It’s also the priciest option on the board. The hot set belongs in MEMORY.'
        : 'Every read still lands on the primary’s disks. Nothing changed.';
      this.beatFailed('load test', note);
      this.d.ui.open({ id: 'fs-load-fail', kicker: 'Load test', title: `✘ p99 ${c.p99} ms — SLA is ${SLA} ms`, bodyHtml: table + `<div>${esc(note)}</div>`, actions: [{ label: 'Back to the board →' }] });
    }
  }

  private runDrill() {
    this.m.term.setLamp?.('off');
    this.primaryDead = true;
    this.prov[0]?.setLamp?.('bad');
    this.d.journal.add('Failover drill: killing the cache node mid-sale…');
    this.test = { beat: 'drill', total: 6, resolved: 0 };
    for (let i = 0; i < 6; i++) this.schedule(0.4 + i * 0.3, () => this.d.sim.spawn('gate', 'read'));
  }

  private onDrillDone() {
    if (this.step !== 'verify') return;
    if (this.provision === 'redis') {
      this.primaryDead = false;
      this.prov[0]?.setLamp?.('ok');
      this.d.journal.add('Failover drill PASSED: replica promoted automatically (~14 s); ElastiCache is already replacing the dead node.');
      this.allBeatsPassed(
        '✔ Node lost, nobody noticed',
        'The primary died and the replica was promoted automatically — p99 blipped to 9 ms and settled. ElastiCache replaces the failed node on its own. That replication + automatic failover (plus persistence, sorted sets, pub/sub) is exactly what Redis adds over Memcached. Close the ticket at the field terminal.',
        'Load test and failover drill both passed — replicated Redis cache-aside in front of the DB.',
      );
      this.applyLamps();
    } else {
      this.beatFailed('failover drill',
        'The Memcached node died and took the ENTIRE hot set with it — no replication, no persistence, no failover. Every read became a miss and the thundering herd hit the primary at 97% CPU again. If the cache must survive node loss, you need Redis with a replica and automatic failover.');
    }
  }
}
