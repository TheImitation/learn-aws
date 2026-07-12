import { Color3, Mesh, MeshBuilder, PhysicsAggregate, PhysicsShapeType, StandardMaterial, Vector3 } from '@babylonjs/core';
import type { Topic } from '@content';
import { recordProgress } from '../core/progress';
import { conveyor, crowdGate, dlqBin, serverRack, statusConsole, type Machine } from '../world/kit';
import { QuizTerminal } from '../ui/quizTerminal';
import { esc } from '../ui/uiShell';
import type { MissionDeps } from './manager';
import type { MissionStep } from './base';


type Provision = 'none' | 'queue' | 'bigworker' | 'retry' | 'cache';
type Beat = 'burst' | 'flash' | 'poison';

const WORKER_CYCLE = 1.2; //     seconds per order
const BIGWORKER_CYCLE = 0.4;
const BELT_SPEED = 1.6;
const TEST_TIMEOUT = 35; //      physical beats: head-of-line blocking shows up as a stall
const BEATS: { id: Beat; label: string; n: number; spacing: number }[] = [
  { id: 'burst', label: 'burst (6 orders)', n: 6, spacing: 0.45 },
  { id: 'flash', label: 'flash sale (18 orders)', n: 18, spacing: 0.18 },
  { id: 'poison', label: 'poison-order burst', n: 6, spacing: 0.45 },
];

interface Parcel {
  mesh: Mesh;
  body: { getLinearVelocity(): Vector3; setLinearVelocity(v: Vector3): void };
  poison: boolean;
  receiveCount: number;
  quarantined: boolean;
}

/** Flagship 3 (Resilient): SEV-2 "Orders Are Vanishing" — a synchronous call to a slow
 *  worker loses orders under burst. The queue is a REAL conveyor: parcels are Havok
 *  bodies that pile up when bursts outpace the worker, and a poison parcel wedges the
 *  head of the line until a dead-letter bin (redrive maxReceiveCount 3) is attached. */
export class OrdersVanishingMission {
  step: MissionStep = 'briefing';
  probes = new Set<string>();
  provision: Provision = 'none';
  dlqAttached = false;

  private d: MissionDeps;
  private topic: Topic;
  private quiz: QuizTerminal;
  private t = 0; // mission sim-time
  private interactableIds: string[] = [];
  private updaters: ((dt: number) => void)[] = [];
  private m!: { gate: Machine; worker: Machine; term: Machine };
  private conveyorM: ReturnType<typeof conveyor> | null = null;
  private bin: Machine | null = null;
  private parcels: Parcel[] = [];
  private parcelMat!: StandardMaterial;
  private poisonMat!: StandardMaterial;
  private pendingSpawns: { delay: number; poison: boolean }[] = [];
  private workerTimer = 0;
  private workerBusyUntil = 0; // sync-mode capacity model
  private beatsPassed = new Set<Beat>();
  private test: { beat: Beat; mode: 'sync' | 'physical'; total: number; needed: number; delivered: number; quarantined: number; started: number; running: boolean } | null = null;
  private poisonFailedOnce = false;
  private peakDepth = 0;

  constructor(deps: MissionDeps, topic: Topic) {
    this.d = deps;
    this.topic = topic;
    this.quiz = new QuizTerminal(deps.ui);
    this.buildLevel();
    this.wireSim();
    this.wireInteractables();
    this.applyLamps();
  }

  dispose() {
    for (const id of this.interactableIds) this.d.interaction.remove(id);
    for (const m of Object.values(this.m)) m.root.dispose();
    this.conveyorM?.root.dispose();
    this.bin?.root.dispose();
    for (const p of this.parcels) p.mesh.dispose();
    this.parcels = [];
  }

  // ---------------------------------------------------------------- level
  private buildLevel() {
    const s = this.d.scene;
    const o = this.d.origin;
    const gate = crowdGate(s, o.add(new Vector3(-9, 0, 0)), Math.PI / 2);
    const worker = serverRack(s, o.add(new Vector3(6, 0, 0)), -Math.PI / 2);
    const term = statusConsole(s, o.add(new Vector3(-4, 0, -6.5)), Math.PI);
    if (worker.update) this.updaters.push(worker.update);
    this.m = { gate, worker, term };
    const glow = (name: string, hex: string) => {
      const mat = new StandardMaterial(name, s);
      mat.emissiveColor = Color3.FromHexString(hex);
      mat.diffuseColor = Color3.Black();
      mat.specularColor = Color3.Black();
      return mat;
    };
    this.parcelMat = glow('parcel-m', '#57c7e3');
    this.poisonMat = glow('poison-m', '#e85f5f');
  }

  private wireSim() {
    const { sim } = this.d;
    sim.addNode({ id: 'gate', anchor: this.m.gate.anchor, next: () => 'worker' });
    sim.addNode({
      id: 'worker', anchor: this.m.worker.anchor,
      next: () => {
        const cycle = this.provision === 'bigworker' ? BIGWORKER_CYCLE : WORKER_CYCLE;
        if (this.t < this.workerBusyUntil) return 'drop'; // busy: the synchronous call times out
        this.workerBusyUntil = this.t + cycle;
        return 'deliver';
      },
    });
  }

  private applyLamps() {
    const good = this.step === 'signoff' || this.step === 'done';
    this.m.gate.setLamp?.(good ? 'ok' : 'bad');
    this.m.worker.setLamp?.(good ? 'ok' : this.provision === 'none' ? 'bad' : 'ok');
    this.m.term.setLamp?.(good ? 'ok' : 'off');
    this.bin?.setLamp?.('ok');
  }

  // ---------------------------------------------------------- interactables
  private wireInteractables() {
    const add = (spec: Parameters<MissionDeps['interaction']['add']>[0]) => { this.interactableIds.push(spec.id); this.d.interaction.add(spec); };
    add({ id: 'ov-gate', node: this.m.gate.root, prompt: 'Inspect order intake', onInteract: () => this.probeGate() });
    add({ id: 'ov-worker', node: this.m.worker.root, prompt: 'Inspect fulfillment worker', onInteract: () => this.probeWorker() });
    add({ id: 'ov-term', node: this.m.term.root, prompt: 'Open field terminal', onInteract: () => this.openTerminal() });
  }

  // -------------------------------------------------------------- briefing
  openBriefing() {
    this.d.objective.set('Ticket', 'Read the SEV-2 briefing');
    this.d.ui.open({
      id: 'ov-briefing',
      kicker: 'SEV-2 · INC-4419 · reported by storefront-oncall',
      title: 'Orders Are Vanishing',
      bodyHtml:
        `<div>${esc('Every marketing burst, orders disappear. Customers get a spinner, then an error — and the order is just GONE. Support is drowning.')}</div>` +
        `<pre>POST /orders → fulfillment-svc\n  waiting… 3000ms\n  504 GATEWAY TIMEOUT  (order lost)</pre>` +
        `<div>${esc('Inspect the intake and the worker, then diagnose at the field terminal. Whatever you build will be tested with real bursts.')}</div>`,
      actions: [{ label: 'Accept ticket', onSelect: () => { this.step = 'investigate'; this.updateObjective(); } }],
    });
  }

  private updateObjective() {
    const o = this.d.objective;
    const next = BEATS.find((b) => !this.beatsPassed.has(b.id));
    switch (this.step) {
      case 'investigate': o.set('Investigate', `Inspect the machines (${this.probes.size}/2) · diagnose at the field terminal`); break;
      case 'fix': o.set('Fix', 'Provision a fix at the field terminal'); break;
      case 'verify': o.set('Verify', next ? `Run the ${next.label} test at the field terminal` : 'All tests passed'); break;
      case 'signoff': o.set('Sign-off', 'Close the ticket at the field terminal (quiz)'); break;
      case 'done': o.set('Resolved', 'INC-4419 closed — orders buffer, drain, and poison goes to the DLQ.'); break;
      default: break;
    }
  }

  private probed(id: string, note: string) {
    if (!this.probes.has(id)) {
      this.probes.add(id);
      this.d.journal.add(note);
      if (this.step === 'investigate') this.updateObjective();
    }
  }

  // ---------------------------------------------------------------- probes
  private probeGate() {
    this.probed('gate', 'Intake: calls fulfillment SYNCHRONOUSLY and waits. Timeouts = lost orders.');
    this.d.ui.open({
      id: 'ov-probe-gate', kicker: 'Order intake', title: 'orders-api',
      bodyHtml: `<pre>POST /orders ........ 4,110/min (burst)\ncall style ......... synchronous, 3s timeout\ntimeouts (burst) ... 61%  → order LOST\nretries ............ none</pre><div>${esc('The intake holds the customer’s request open while it waits on the worker. When the worker is busy, the order dies with the timeout.')}</div>`,
      actions: [{ label: 'Close' }],
    });
  }

  private probeWorker() {
    this.probed('worker', 'Worker: healthy, ~1.2s per order, no buffer in front — busy = callers time out.');
    this.d.ui.open({
      id: 'ov-probe-worker', kicker: 'Fulfillment worker', title: 'fulfillment-svc',
      bodyHtml: `<pre>state .............. healthy ✓\nprocessing time .... ~1.2 s/order (I/O bound)\nqueue/buffer ....... none\nconcurrent callers . rejected while busy</pre><div>${esc('Nothing is wrong with the worker — it just can’t absorb bursts, and nothing holds the overflow.')}</div>`,
      actions: [{ label: 'Close' }],
    });
  }

  // -------------------------------------------------------- field terminal
  private openTerminal() {
    const beatsLine = BEATS.map((b) => `${this.beatsPassed.has(b.id) ? '✓' : '·'} ${b.label}`).join('\n');
    const reportLine = this.test
      ? `${this.test.beat}: ${this.test.delivered}/${this.test.needed} fulfilled${this.test.quarantined ? ` · ${this.test.quarantined} → DLQ` : ''}${this.test.running ? ' · running…' : ''}`
      : 'no test run yet';
    const depth = this.parcels.filter((p) => !p.quarantined).length;
    const actions = [];
    if (this.step === 'investigate') {
      actions.push({ label: 'Run burst test — watch orders vanish', closes: true, onSelect: () => this.runBeat(BEATS[0]) });
      if (this.probes.has('worker')) actions.push({ label: 'Diagnose root cause…', closes: false, onSelect: () => this.openDiagnosis() });
    } else if (this.step === 'fix') {
      actions.push({ label: 'Provision a fix…', closes: false, onSelect: () => this.openProvisioning() });
    } else if (this.step === 'verify') {
      const next = BEATS.find((b) => !this.beatsPassed.has(b.id));
      if (next) actions.push({ label: `Run ${next.label} test`, closes: true, onSelect: () => this.runBeat(next) });
      if (this.poisonFailedOnce && this.provision === 'queue' && !this.dlqAttached) {
        actions.push({ label: 'Attach dead-letter bin (redrive: maxReceiveCount 3)', closes: false, onSelect: () => this.attachDlq() });
      }
      actions.push({ label: 'Re-provision…', closes: false, onSelect: () => this.openProvisioning() });
    } else if (this.step === 'signoff') {
      actions.push({ label: 'Close ticket — sign off (quiz)', closes: false, onSelect: () => this.startSignoff() });
    } else if (this.step === 'done') {
      actions.push({ label: 'Ticket summary', closes: false, onSelect: () => this.openSummary() });
    }
    actions.push({ label: 'Close' });
    this.d.ui.open({
      id: 'ov-terminal',
      kicker: 'Field terminal · INC-4419',
      title: 'Order pipeline',
      bodyHtml: `<pre>step: ${this.step.toUpperCase()} · provision: ${this.provision}${this.dlqAttached ? ' + DLQ' : ''}\nqueue depth: ${depth}  (peak ${this.peakDepth})\n${esc(reportLine)}\n\n${esc(beatsLine)}</pre>`,
      actions,
    });
  }

  private openDiagnosis() {
    const wrong = (rebuttal: string) => ({
      closes: false,
      onSelect: () => {
        this.d.journal.add(`Diagnosis rejected: ${rebuttal}`);
        this.d.ui.open({
          id: 'ov-diag-wrong', kicker: 'Diagnosis', title: '✘ Not supported by the evidence',
          bodyHtml: `<div>${esc(rebuttal)}</div>`,
          actions: [{ label: 'Back to diagnosis', closes: false, onSelect: () => this.openDiagnosis() }],
        });
      },
    });
    this.d.ui.open({
      id: 'ov-diagnosis', kicker: 'Diagnosis · pick the root cause', title: 'Why do orders vanish?',
      actions: [
        { label: 'The fulfillment worker keeps crashing', ...wrong('The worker probe showed it healthy — just busy for ~1.2s per order with nothing buffering the overflow.') },
        { label: 'The network is dropping packets between the services', ...wrong('The intake log shows clean connections that WAIT and then time out — that’s saturation, not packet loss.') },
        {
          label: 'The intake calls the worker synchronously — bursts overwhelm it and timed-out orders are lost forever',
          closes: false,
          onSelect: () => {
            this.step = 'fix';
            this.d.journal.add('Diagnosis confirmed: synchronous coupling to a slow worker; no buffer, so bursts destroy orders.');
            this.updateObjective();
            this.d.ui.open({
              id: 'ov-diag-right', kicker: 'Diagnosis', title: '✔ Root cause confirmed',
              bodyHtml: `<div>${esc('The intake holds the customer hostage to the worker’s pace. Decouple them at the field terminal — your fix faces three bursts, one of them poisonous.')}</div>`,
              actions: [{ label: 'To work →' }],
            });
          },
        },
        { label: 'The order database is out of space', ...wrong('There’s no storage error anywhere in the path — orders die WAITING, not writing.') },
      ],
    });
  }

  // ---------------------------------------------------------- provisioning
  private openProvisioning() {
    const pick = (p: Provision, label: string) => ({
      label,
      onSelect: () => {
        this.setProvision(p);
        this.d.journal.add(`Provisioned: ${label}.`);
        if (this.step === 'fix') this.step = 'verify';
        this.beatsPassed.clear();
        this.applyLamps();
        this.updateObjective();
      },
    });
    this.d.ui.open({
      id: 'ov-provision', kicker: 'Provisioning', title: 'Choose the fix',
      bodyHtml: `<div>${esc('One change. It must survive a burst, a 10× flash sale, and a poison order.')}</div>`,
      actions: [
        pick('retry', 'Configure aggressive retries at the intake'),
        pick('queue', 'Put an SQS queue between intake and worker (conveyor)'),
        pick('bigworker', 'Scale the worker up (4× faster instance)'),
        pick('cache', 'Add a cache in front of the intake'),
        { label: 'Cancel' },
      ],
    });
  }

  private setProvision(p: Provision) {
    // tear down previous provision
    this.conveyorM?.root.dispose(); this.conveyorM = null;
    this.bin?.root.dispose(); this.bin = null;
    this.dlqAttached = false;
    for (const parcel of this.parcels) parcel.mesh.dispose();
    this.parcels = [];
    this.m.worker.root.scaling.setAll(1);
    this.provision = p;
    if (p === 'queue') {
      this.conveyorM = conveyor(this.d.scene, this.d.origin.add(new Vector3(-7.2, 0, 0)), 11.4);
    } else if (p === 'bigworker') {
      this.m.worker.root.scaling.setAll(1.3);
    }
  }

  private attachDlq() {
    this.dlqAttached = true;
    this.bin = dlqBin(this.d.scene, this.d.origin.add(new Vector3(5.5, 0, 2.2)));
    this.bin.setLamp?.('ok');
    this.d.journal.add('Dead-letter bin attached: after 3 failed receives, poison orders are set aside instead of blocking the line.');
    this.d.ui.open({
      id: 'ov-dlq', kicker: 'Provisioning', title: 'Redrive policy active',
      bodyHtml: `<pre>maxReceiveCount: 3\non exceed: → dead-letter bin</pre><div>${esc('Run the poison-order burst again.')}</div>`,
      actions: [{ label: 'To the test →' }],
    });
  }

  // ------------------------------------------------------------ test beats
  private runBeat(beat: { id: Beat; label: string; n: number; spacing: number }) {
    this.m.term.setLamp?.('off');
    this.peakDepth = 0;
    if (this.provision === 'queue') {
      // physical: sweep leftovers from any failed run, then spawn real parcels
      for (const p of this.parcels) if (!p.quarantined) p.mesh.dispose();
      this.parcels = this.parcels.filter((p) => p.quarantined); // binned poison stays as a trophy
      this.pendingSpawns = [];
      this.test = { beat: beat.id, mode: 'physical', total: beat.n, needed: beat.n, delivered: 0, quarantined: 0, started: this.t, running: true };
      for (let i = 0; i < beat.n; i++) {
        this.pendingSpawns.push({ delay: i * beat.spacing, poison: beat.id === 'poison' && i === 2 });
      }
    } else {
      // sync: FlowSim tokens against the busy-worker model. 'retry' doubles the pressure.
      const n = this.provision === 'retry' ? beat.n * 2 : beat.n;
      this.workerBusyUntil = 0;
      this.test = { beat: beat.id, mode: 'sync', total: n, needed: beat.n, delivered: 0, quarantined: 0, started: this.t, running: true };
      this.d.sim.trafficTest(['gate'], n, beat.spacing * (this.provision === 'retry' ? 0.5 : 1));
    }
  }

  private spawnParcel(poison: boolean) {
    if (!this.conveyorM) return;
    const s = this.d.scene;
    const mesh = MeshBuilder.CreateBox('parcel', { size: 0.36 }, s);
    mesh.position.copyFrom(this.conveyorM.spawnPoint);
    mesh.position.z += (Math.random() - 0.5) * 0.3;
    mesh.material = poison ? this.poisonMat : this.parcelMat;
    const agg = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 1.2, friction: 0.5, restitution: 0.05 }, s);
    this.parcels.push({ mesh, body: agg.body as unknown as Parcel['body'], poison, receiveCount: 0, quarantined: false });
  }

  // ------------------------------------------------------------- per-frame
  update(dt: number) {
    this.t += dt;
    for (const u of this.updaters) u(dt);

    // timed physical spawns
    if (this.pendingSpawns.length) {
      for (const q of this.pendingSpawns) q.delay -= dt;
      this.pendingSpawns = this.pendingSpawns.filter((q) => {
        if (q.delay <= 0) { this.spawnParcel(q.poison); return false; }
        return true;
      });
    }

    // conveyor drive + runaway recovery
    if (this.conveyorM) {
      const b = this.conveyorM.belt;
      for (const p of this.parcels) {
        if (p.quarantined) continue;
        const pos = p.mesh.position;
        if (pos.y < -2) { // fell off the world: respawn preserving state
          const rc = p.receiveCount; const poison = p.poison;
          p.mesh.dispose();
          this.parcels = this.parcels.filter((x) => x !== p);
          this.spawnParcel(poison);
          this.parcels[this.parcels.length - 1].receiveCount = rc;
          continue;
        }
        if (pos.x > b.minX && pos.x < b.maxX && Math.abs(pos.z - b.z) < b.halfZ && pos.y > b.topY - 0.2 && pos.y < b.topY + 1.2) {
          const v = p.body.getLinearVelocity();
          p.body.setLinearVelocity(new Vector3(v.x + (BELT_SPEED - v.x) * 0.25, v.y, v.z * 0.9));
        }
      }
      const depth = this.parcels.filter((p) => !p.quarantined).length;
      if (depth > this.peakDepth) this.peakDepth = depth;

      // worker pickup at the belt end
      this.workerTimer -= dt;
      if (this.workerTimer <= 0) {
        const pickupX = b.maxX - 1.1;
        let head: Parcel | null = null;
        for (const p of this.parcels) {
          if (p.quarantined) continue;
          if (p.mesh.position.x > pickupX && (!head || p.mesh.position.x > head.mesh.position.x)) head = p;
        }
        if (!head) { this.workerTimer = 0.15; }
        else if (!head.poison) {
          head.mesh.dispose();
          this.parcels = this.parcels.filter((x) => x !== head);
          if (this.test?.running && this.test.mode === 'physical') this.test.delivered++;
          this.workerTimer = WORKER_CYCLE;
        } else {
          head.receiveCount++;
          if (head.receiveCount >= 3 && this.dlqAttached && this.bin) {
            const target = this.bin.root.position;
            const dxz = target.subtract(head.mesh.position);
            head.body.setLinearVelocity(new Vector3(dxz.x * 1.2, 3.4, dxz.z * 1.2));
            head.quarantined = true;
            if (this.test?.running && this.test.mode === 'physical') this.test.quarantined++;
            this.d.journal.add('Poison order exceeded maxReceiveCount — tossed to the dead-letter bin.');
          } else {
            head.body.setLinearVelocity(new Vector3(-1.8, 1.4, 0)); // back to the line: head-of-line blocking
          }
          this.workerTimer = WORKER_CYCLE;
        }
      }
    }

    // test completion
    if (this.test?.running) {
      const t = this.test;
      if (t.mode === 'sync') {
        const r = this.d.sim.trafficReport;
        if (!r.running && r.total > 0 && r.resolved === r.total) {
          t.delivered = r.delivered;
          t.running = false;
          this.onBeatResult(t.delivered >= t.needed, t.beat);
        }
      } else {
        if (t.delivered + t.quarantined >= t.total) {
          t.running = false;
          const pass = t.beat === 'poison' ? t.delivered === t.needed - 1 && t.quarantined === 1 : t.delivered === t.needed;
          this.onBeatResult(pass, t.beat);
        } else if (this.t - t.started > TEST_TIMEOUT) {
          t.running = false;
          this.onBeatResult(false, t.beat);
        }
      }
    }
  }

  private onBeatResult(pass: boolean, beat: Beat) {
    if (this.step === 'investigate') {
      if (!pass) this.d.journal.add('Symptom confirmed: most burst orders timed out and were lost.');
      return;
    }
    if (this.step !== 'verify') return;
    if (pass) {
      this.beatsPassed.add(beat);
      const next = BEATS.find((b) => !this.beatsPassed.has(b.id));
      if (!next) {
        this.step = 'signoff';
        this.applyLamps();
        this.updateObjective();
        this.d.journal.add(`All bursts survived (peak queue depth ${this.peakDepth}). Poison handled by the DLQ.`);
        this.d.ui.open({
          id: 'ov-all-pass', kicker: 'Verification', title: '✔ Burst, flash sale, and poison — all handled',
          bodyHtml: `<div>${esc(`The conveyor buffered every spike (peak depth ${this.peakDepth}), the worker drained at its own pace, and the poison order went to the bin instead of blocking the line. Close the ticket at the field terminal.`)}</div>`,
          actions: [{ label: 'Sign-off →' }],
        });
      } else {
        this.updateObjective();
        this.d.journal.add(`${beat} test PASSED${this.provision === 'queue' ? ` (peak queue depth ${this.peakDepth})` : ''}.`);
        this.d.ui.open({
          id: 'ov-beat-pass', kicker: 'Verification', title: `✔ ${beat} test passed`,
          bodyHtml: `<div>${esc(`Next: ${next.label}.`)}</div>`,
          actions: [{ label: 'Next test →' }],
        });
      }
    } else {
      const note = this.failNote(beat);
      if (beat === 'poison' && this.provision === 'queue' && !this.dlqAttached) {
        this.poisonFailedOnce = true; // stay in verify: the fix is attaching the DLQ at the terminal
        this.updateObjective();
      } else {
        this.step = 'fix';
        this.updateObjective();
      }
      this.d.journal.add(`${beat} test FAILED. ${note}`);
      this.d.ui.open({
        id: 'ov-beat-fail', kicker: 'Verification', title: `✘ ${beat} test failed`,
        bodyHtml: `<div>${esc(note)}</div>`,
        actions: [{ label: 'Back to work →' }],
      });
    }
  }

  private failNote(beat: Beat): string {
    if (this.provision === 'queue' && beat === 'poison') {
      return 'One poison order is wedged at the head of the line — the worker receives it, fails, and retries forever while everything behind it waits. Attach a dead-letter bin with a redrive policy (maxReceiveCount 3) at the field terminal.';
    }
    switch (this.provision) {
      case 'retry': return 'Retries DOUBLED the pressure on the saturated worker — even more orders died. Retrying a saturated dependency makes the stampede worse.';
      case 'bigworker': return beat === 'flash'
        ? 'The 4× worker kept up with a normal burst — the 10× flash sale still outran it. You can’t out-provision every spike; buffer them.'
        : 'Still synchronous: when the worker is busy, callers time out and orders are lost.';
      case 'cache': return 'A cache serves repeated READS. Orders are unique writes — nothing to cache. The worker is still overwhelmed.';
      default: return 'Orders still die waiting on the busy worker.';
    }
  }

  // --------------------------------------------------------------- signoff
  private startSignoff() {
    this.quiz.start(this.topic, (pct, passed) => {
      const rec = recordProgress(this.topic.id, passed ? 'Mastered' : 'Assessed', pct);
      if (passed) {
        this.step = 'done';
        this.updateObjective();
        this.d.journal.add(`INC-4419 closed. Sign-off ${pct}% — mastery recorded.`);
        this.d.ui.open({
          id: 'ov-resolved', kicker: 'INC-4419 · resolved', title: `🎉 Ticket closed — ${pct}%`,
          bodyHtml: `<div>${esc(`Mastery: ${rec.mastery} · best ${rec.best}%. Orders now buffer on the queue, the worker drains at its own pace, and poison goes to the DLQ.`)}</div>`,
          actions: [
            { label: '↩ Return to NOC', onSelect: () => this.d.onReturn() },
            { label: 'Stay on site' },
          ],
        });
      } else {
        this.d.ui.open({
          id: 'ov-signoff-fail', kicker: 'Sign-off', title: `${pct}% — not enough to close (need 80%)`,
          bodyHtml: `<div>${esc('Recorded as Assessed. Review your journal and sign off again at the field terminal.')}</div>`,
          actions: [{ label: 'OK' }],
        });
      }
    });
  }

  private openSummary() {
    const concepts = [...new Set(this.topic.stages.map((s) => s.concept).filter(Boolean))];
    this.d.ui.open({
      id: 'ov-summary', kicker: 'INC-4419 · resolved', title: 'Orders Are Vanishing — summary',
      bodyHtml:
        `<div>${esc('Symptom: synchronous calls to a slow worker lost orders under burst. Fix: an SQS queue buffers the spike (watch the parcels pile), consumers drain at their own pace, and a redrive policy quarantines poison messages after 3 receives.')}</div><div style="height:8px"></div>` +
        concepts.map((c) => `<div>· ${esc(String(c))}</div>`).join(''),
      actions: [{ label: 'Close' }],
    });
  }
}
