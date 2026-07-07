import { Color3, MeshBuilder, PhysicsAggregate, PhysicsShapeType, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core';
import type { Topic } from '@content';
import { recordProgress } from '../core/progress';
import { badgeDoor, internetGate, serverRack, statusConsole, type Machine } from '../world/kit';
import { QuizTerminal } from '../ui/quizTerminal';
import { esc } from '../ui/uiShell';
import type { MissionDeps } from './manager';
import type { MissionStep } from './patchNight';

type Cred = 'none' | 'role' | 'key' | 'admin' | 'root';
type Beat = 'access' | 'redteam';

const BEATS: { id: Beat; label: string }[] = [
  { id: 'access', label: 'app access test (4 requests)' },
  { id: 'redteam', label: 'red-team drill (6 attacks)' },
];

/** Flagship 4 (Secure): SEV-2 "The Leaked Key" — a long-lived key baked into an AMI
 *  leaked and was revoked, taking the app down. Restore service with a SCOPED instance
 *  role; over-permissive fixes pass the access test and then fail the red-team drill
 *  (the drill replays the leaked key AND tries the app's new credential on payroll). */
export class LeakedKeyMission {
  step: MissionStep = 'briefing';
  probes = new Set<string>();
  cred: Cred = 'none';

  private d: MissionDeps;
  private topic: Topic;
  private quiz: QuizTerminal;
  private interactableIds: string[] = [];
  private updaters: ((dt: number) => void)[] = [];
  private m!: {
    rack: Machine; gate: Machine; desk: Machine; term: Machine;
    doorA: ReturnType<typeof badgeDoor>; doorP: ReturnType<typeof badgeDoor>;
    rooms: TransformNode;
  };
  private doorAnim = { A: 0, P: 0 }; // seconds of remaining open time
  private beatsPassed = new Set<Beat>();
  private test: { beat: Beat; total: number; resolved: number; violations: number; running: boolean } | null = null;
  private pendingSpawns: { delay: number; at: string; kind: string }[] = [];

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
    for (const m of [this.m.rack, this.m.gate, this.m.desk, this.m.term, this.m.doorA, this.m.doorP]) m.root.dispose();
    this.m.rooms.dispose();
    this.d.sim.onTokenResolved = undefined; // shared sim: release the hook
  }

  // ---------------------------------------------------------------- level
  private buildLevel() {
    const s = this.d.scene;
    const o = this.d.origin;
    const rack = serverRack(s, o.add(new Vector3(-7, 0, 0)), -Math.PI / 2);
    const gate = internetGate(s, o.add(new Vector3(-7, 0, 5)), Math.PI / 2);
    const doorA = badgeDoor(s, o.add(new Vector3(2, 0, -3.5)), -Math.PI / 2, '#5fd29a');
    const doorP = badgeDoor(s, o.add(new Vector3(2, 0, 3.5)), -Math.PI / 2, '#e8c257');
    const desk = statusConsole(s, o.add(new Vector3(-2, 0, -6.5)), Math.PI);
    const term = statusConsole(s, o.add(new Vector3(-6, 0, -6.5)), Math.PI);
    if (rack.update) this.updaters.push(rack.update);
    if (gate.update) this.updaters.push(gate.update);

    // the two rooms behind the doors (three walls each + floor slab)
    const rooms = new TransformNode('lk-rooms', s);
    const wallM = new StandardMaterial('lk-wall', s);
    wallM.diffuseColor = Color3.FromHexString('#3d4456');
    wallM.specularColor = Color3.Black();
    const slabA = new StandardMaterial('lk-slab-a', s); slabA.diffuseColor = Color3.FromHexString('#254234'); slabA.specularColor = Color3.Black();
    const slabP = new StandardMaterial('lk-slab-p', s); slabP.diffuseColor = Color3.FromHexString('#4a3b22'); slabP.specularColor = Color3.Black();
    const room = (cz: number, slab: StandardMaterial) => {
      const mk = (w: number, d: number, x: number, z: number) => {
        const wall = MeshBuilder.CreateBox('lk-w', { width: w, height: 2.0, depth: d }, s);
        wall.parent = rooms; wall.position.set(o.x + x, 1.0, o.z + z); wall.material = wallM;
        new PhysicsAggregate(wall, PhysicsShapeType.BOX, { mass: 0 }, s);
      };
      mk(0.2, 3.0, 4.9, cz); //      back
      mk(2.9, 0.2, 3.5, cz - 1.5); // sides
      mk(2.9, 0.2, 3.5, cz + 1.5);
      const f = MeshBuilder.CreateBox('lk-slabm', { width: 2.8, height: 0.05, depth: 2.9 }, s);
      f.parent = rooms; f.position.set(o.x + 3.5, 0.03, o.z + cz); f.material = slab;
    };
    room(-3.5, slabA);
    room(3.5, slabP);

    this.m = { rack, gate, desk, term, doorA, doorP, rooms };
  }

  private wireSim() {
    const { sim } = this.d;
    const o = this.d.origin;
    sim.addNode({ id: 'app', anchor: this.m.rack.anchor, next: (t) => (t.kind === 'app-assets' ? 'doorAssets' : 'doorPayroll') });
    sim.addNode({ id: 'leak', anchor: this.m.gate.anchor, next: (t) => (t.kind === 'key-assets' ? 'doorAssets' : 'doorPayroll') });
    sim.addNode({
      id: 'doorAssets', anchor: this.m.doorA.anchor,
      next: (t) => this.tryDoor(t.kind, 'assets', 'A') ? 'roomAssets' : 'drop',
    });
    sim.addNode({
      id: 'doorPayroll', anchor: this.m.doorP.anchor,
      next: (t) => this.tryDoor(t.kind, 'payroll', 'P') ? 'roomPayroll' : 'drop',
    });
    sim.addNode({ id: 'roomAssets', anchor: o.add(new Vector3(4, 1.1, -3.5)), next: () => 'deliver' });
    sim.addNode({ id: 'roomPayroll', anchor: o.add(new Vector3(4, 1.1, 3.5)), next: () => 'deliver' });
    sim.onTokenResolved = (t, outcome) => {
      const test = this.test;
      if (!test?.running) return;
      test.resolved++;
      if (test.beat === 'access' && outcome === 'drop') test.violations++;
      if (test.beat === 'redteam' && outcome === 'deliver') test.violations++;
      if (test.resolved >= test.total) {
        test.running = false;
        this.onBeatResult(test.violations === 0, test.beat);
      }
    };
  }

  /** IAM in one function: is this attempt allowed through this door? */
  private allowed(kind: string, resource: 'assets' | 'payroll'): boolean {
    if (kind.startsWith('key-')) return false; // the leaked key is revoked — always denied
    switch (this.cred) {
      case 'none': return false;
      case 'role': return resource === 'assets'; // least privilege
      default: return true; // key-same-policy / admin / root: over-permissive
    }
  }

  private tryDoor(kind: string, resource: 'assets' | 'payroll', door: 'A' | 'P'): boolean {
    const ok = this.allowed(kind, resource);
    const machine = door === 'A' ? this.m.doorA : this.m.doorP;
    if (ok) { this.doorAnim[door] = 1.1; machine.setLamp?.('ok'); }
    else { machine.setLamp?.('bad'); this.doorAnim[door] = Math.min(this.doorAnim[door], 0); }
    return ok;
  }

  private applyLamps() {
    const good = this.step === 'signoff' || this.step === 'done';
    this.m.rack.setLamp?.(good ? 'ok' : this.cred === 'none' ? 'bad' : 'ok');
    this.m.desk.setLamp?.(good ? 'ok' : 'off');
    this.m.term.setLamp?.(good ? 'ok' : 'off');
    this.m.doorA.setLamp?.(good ? 'ok' : 'off');
    this.m.doorP.setLamp?.(good ? 'ok' : 'off');
  }

  // ---------------------------------------------------------- interactables
  private wireInteractables() {
    const add = (spec: Parameters<MissionDeps['interaction']['add']>[0]) => { this.interactableIds.push(spec.id); this.d.interaction.add(spec); };
    add({ id: 'lk-rack', node: this.m.rack.root, prompt: 'Inspect svc-app', onInteract: () => this.probeRack() });
    add({ id: 'lk-desk', node: this.m.desk.root, prompt: 'IAM security desk', onInteract: () => this.openDesk() });
    add({ id: 'lk-door-a', node: this.m.doorA.root, prompt: 'Inspect assets room', onInteract: () => this.probeDoorA() });
    add({ id: 'lk-door-p', node: this.m.doorP.root, prompt: 'Inspect payroll room', onInteract: () => this.probeDoorP() });
    add({ id: 'lk-term', node: this.m.term.root, prompt: 'Open field terminal', onInteract: () => this.openTerminal() });
  }

  // -------------------------------------------------------------- briefing
  openBriefing() {
    this.d.objective.set('Ticket', 'Read the SEV-2 briefing');
    this.d.ui.open({
      id: 'lk-briefing',
      kicker: 'SEV-2 · INC-4501 · reported by security-ops',
      title: 'The Leaked Key',
      bodyHtml:
        `<div>${esc('A long-lived access key for svc-app — baked into its AMI three years ago — just showed up in a public paste. Security revoked it within minutes (correctly). Now the app is down: it can’t read its assets bucket.')}</div>` +
        `<pre>s3:GetObject assets/config.json\n→ AccessDenied  (credentials revoked)\n\naudit: the leaked key allowed s3:* on * —\nit could have opened PAYROLL.</pre>` +
        `<div>${esc('Restore service with a credential that can never cause this again. A red-team drill will replay the leaked key — and test whatever you issue — before the ticket closes.')}</div>`,
      actions: [{ label: 'Accept ticket', onSelect: () => { this.step = 'investigate'; this.updateObjective(); } }],
    });
  }

  private updateObjective() {
    const o = this.d.objective;
    const next = BEATS.find((b) => !this.beatsPassed.has(b.id));
    switch (this.step) {
      case 'investigate': o.set('Investigate', `Inspect the site (${this.probes.size}/4) · diagnose at the field terminal`); break;
      case 'fix': o.set('Fix', 'Issue credentials at the IAM security desk'); break;
      case 'verify': o.set('Verify', next ? `Run the ${next.label} at the field terminal` : 'All tests passed'); break;
      case 'signoff': o.set('Sign-off', 'Close the ticket at the field terminal (quiz)'); break;
      case 'done': o.set('Resolved', 'INC-4501 closed — scoped role issued, leaked key dead, payroll shut.'); break;
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
  private probeRack() {
    this.probed('rack', 'svc-app: down. Its ONLY identity was the leaked (now revoked) 3-year-old access key from the AMI.');
    this.d.ui.open({
      id: 'lk-probe-rack', kicker: 'Application server', title: 'svc-app',
      bodyHtml: `<pre>s3:GetObject assets/config.json\n→ AccessDenied (credentials revoked)\n\ncredential ....... AKIA…L3AK (long-lived)\nsource ........... baked into AMI, age 3y\nrotation ......... never</pre><div>${esc('The app authenticated with a static key burned into its image. Revoking the leak revoked its only identity.')}</div>`,
      actions: [{ label: 'Close' }],
    });
  }

  private probeDoorA() {
    this.probed('doorA', 'Assets room: the app’s legitimate need — read-only GetObject on assets/*.');
    this.d.ui.open({
      id: 'lk-probe-door-a', kicker: 'Assets room', title: 'bucket: assets',
      bodyHtml: `<pre>legitimate consumers . svc-app (read-only)\nrequired action ...... s3:GetObject on assets/*</pre><div>${esc('Everything the app actually needs fits in one narrow permission.')}</div>`,
      actions: [{ label: 'Close' }],
    });
  }

  private probeDoorP() {
    this.probed('doorP', 'Payroll room: finance only. svc-app NEVER accessed it legitimately — but the old key could have.');
    this.d.ui.open({
      id: 'lk-probe-door-p', kicker: 'Payroll room', title: 'bucket: payroll',
      bodyHtml: `<pre>legitimate consumers . finance only\nsvc-app access (3y) .. 0 requests\nold key permitted? ... YES (s3:* on *)</pre><div>${esc('Pure blast radius: a permission nobody used, waiting for a leak.')}</div>`,
      actions: [{ label: 'Close' }],
    });
  }

  // --------------------------------------------------------------- IAM desk
  private openDesk() {
    if (this.step === 'fix' || this.step === 'verify') {
      const pick = (c: Cred, label: string) => ({
        label,
        onSelect: () => {
          this.cred = c;
          this.beatsPassed.clear();
          if (this.step === 'fix') this.step = 'verify';
          this.d.journal.add(`Issued: ${label}.`);
          this.applyLamps();
          this.updateObjective();
        },
      });
      this.d.ui.open({
        id: 'lk-desk-issue', kicker: 'IAM security desk', title: 'Issue credentials for svc-app',
        bodyHtml: `<div>${esc('Whatever you issue faces the red-team drill: the leaked key gets replayed, and your new credential gets pointed at payroll.')}</div>`,
        actions: [
          pick('key', 'New long-lived access key with the existing policy (s3:* on *)'),
          pick('role', 'Instance role — Allow s3:GetObject on assets/* (temporary credentials)'),
          pick('admin', 'Attach AdministratorAccess — unblock now, tidy later'),
          pick('root', 'Bake the root account keys into the AMI'),
          { label: 'Cancel' },
        ],
      });
    } else {
      this.probed('desk', 'IAM desk: the old key’s policy was Allow s3:* on * — the app never needed 1% of that.');
      this.d.ui.open({
        id: 'lk-probe-desk', kicker: 'IAM security desk', title: 'Credential audit — svc-app',
        bodyHtml: `<pre>revoked key policy:\n{ "Effect":"Allow", "Action":"s3:*",\n  "Resource":"*" }\n\nstatus ........ revoked after public leak ✓</pre><div>${esc('Revocation was right. The replacement is the real decision — and the policy above is what NOT to reissue.')}</div>`,
        actions: [{ label: 'Close' }],
      });
    }
  }

  // -------------------------------------------------------- field terminal
  private openTerminal() {
    const beatsLine = BEATS.map((b) => `${this.beatsPassed.has(b.id) ? '✓' : '·'} ${b.label}`).join('\n');
    const t = this.test;
    const reportLine = t ? `${t.beat}: ${t.resolved}/${t.total} resolved · ${t.violations} violation${t.violations === 1 ? '' : 's'}${t.running ? ' · running…' : ''}` : 'no test run yet';
    const actions = [];
    if (this.step === 'investigate') {
      actions.push({ label: 'Run app access test — watch the denials', closes: true, onSelect: () => this.runBeat('access') });
      if (this.probes.has('rack')) actions.push({ label: 'Diagnose root cause…', closes: false, onSelect: () => this.openDiagnosis() });
    } else if (this.step === 'fix') {
      actions.push({ label: 'Run app access test', closes: true, onSelect: () => this.runBeat('access') });
    } else if (this.step === 'verify') {
      const next = BEATS.find((b) => !this.beatsPassed.has(b.id));
      if (next) actions.push({ label: `Run ${next.label}`, closes: true, onSelect: () => this.runBeat(next.id) });
    } else if (this.step === 'signoff') {
      actions.push({ label: 'Close ticket — sign off (quiz)', closes: false, onSelect: () => this.startSignoff() });
    } else if (this.step === 'done') {
      actions.push({ label: 'Ticket summary', closes: false, onSelect: () => this.openSummary() });
    }
    actions.push({ label: 'Close' });
    const credLine = { none: 'NONE (revoked)', role: 'instance role · GetObject assets/* only', key: 'long-lived key · s3:* on *', admin: 'AdministratorAccess', root: 'ROOT KEYS' }[this.cred];
    this.d.ui.open({
      id: 'lk-terminal',
      kicker: 'Field terminal · INC-4501',
      title: 'Identity & access — svc-app',
      bodyHtml: `<pre>step: ${this.step.toUpperCase()}\ncredential: ${esc(credLine)}\n${esc(reportLine)}\n\n${esc(beatsLine)}</pre>`,
      actions,
    });
  }

  private openDiagnosis() {
    const wrong = (rebuttal: string) => ({
      closes: false,
      onSelect: () => {
        this.d.journal.add(`Diagnosis rejected: ${rebuttal}`);
        this.d.ui.open({
          id: 'lk-diag-wrong', kicker: 'Diagnosis', title: '✘ Not supported by the evidence',
          bodyHtml: `<div>${esc(rebuttal)}</div>`,
          actions: [{ label: 'Back to diagnosis', closes: false, onSelect: () => this.openDiagnosis() }],
        });
      },
    });
    this.d.ui.open({
      id: 'lk-diagnosis', kicker: 'Diagnosis · pick the root cause', title: 'What does svc-app actually need?',
      actions: [
        { label: 'Un-revoke the leaked key to restore service', ...wrong('A leaked credential is burned forever — anyone with the paste can replay it. The revocation was correct; the replacement is the decision.') },
        { label: 'The assets bucket policy is broken', ...wrong('The denials are credential failures — the revoked key — not bucket policy. The door works; the badge is dead.') },
        {
          label: 'The revoked key was the app’s only identity — issue a scoped instance role (read assets only)',
          closes: false,
          onSelect: () => {
            this.step = 'fix';
            this.d.journal.add('Diagnosis confirmed: replace the baked-in key with a least-privilege instance role.');
            this.updateObjective();
            this.d.ui.open({
              id: 'lk-diag-right', kicker: 'Diagnosis', title: '✔ Root cause confirmed',
              bodyHtml: `<div>${esc('The app needs an identity, not that identity. Issue credentials at the IAM security desk — and remember what the audit said about payroll.')}</div>`,
              actions: [{ label: 'To the desk →' }],
            });
          },
        },
        { label: 'Restore the payroll permissions so nothing else breaks', ...wrong('The payroll audit shows ZERO legitimate access in three years — that permission was pure blast radius, not a dependency.') },
      ],
    });
  }

  // ------------------------------------------------------------ test beats
  private runBeat(beat: Beat) {
    this.m.term.setLamp?.('off');
    const plan: { at: string; kind: string }[] =
      beat === 'access'
        ? [{ at: 'app', kind: 'app-assets' }, { at: 'app', kind: 'app-assets' }, { at: 'app', kind: 'app-assets' }, { at: 'app', kind: 'app-assets' }]
        : [
          { at: 'leak', kind: 'key-assets' }, { at: 'leak', kind: 'key-payroll' },
          { at: 'leak', kind: 'key-assets' }, { at: 'leak', kind: 'key-payroll' },
          { at: 'app', kind: 'app-payroll' }, { at: 'app', kind: 'app-payroll' },
        ];
    this.test = { beat, total: plan.length, resolved: 0, violations: 0, running: true };
    this.pendingSpawns = plan.map((p, i) => ({ delay: i * 0.5, ...p }));
  }

  // ------------------------------------------------------------- per-frame
  update(dt: number) {
    for (const u of this.updaters) u(dt);
    // timed spawns
    if (this.pendingSpawns.length) {
      for (const q of this.pendingSpawns) q.delay -= dt;
      this.pendingSpawns = this.pendingSpawns.filter((q) => {
        if (q.delay <= 0) { this.d.sim.spawn(q.at, q.kind); return false; }
        return true;
      });
    }
    // door slide animation
    for (const key of ['A', 'P'] as const) {
      this.doorAnim[key] = Math.max(0, this.doorAnim[key] - dt);
      const door = key === 'A' ? this.m.doorA : this.m.doorP;
      door.setOpenness(this.doorAnim[key] > 0 ? Math.min(1, this.doorAnim[key] * 4) : 0);
    }
  }

  private onBeatResult(pass: boolean, beat: Beat) {
    if (this.step === 'investigate') {
      if (!pass) this.d.journal.add('Symptom confirmed: every app request denied — the revoked key was its only identity.');
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
        this.d.journal.add('Red-team drill survived: leaked key dead, payroll shut, app scoped to exactly what it needs.');
        this.d.ui.open({
          id: 'lk-all-pass', kicker: 'Verification', title: '✔ Access restored — attacks denied',
          bodyHtml: `<div>${esc('The app reads assets with short-lived role credentials; the replayed key bounced off both doors; and its own credential can’t open payroll. Least privilege, proven. Close the ticket at the field terminal.')}</div>`,
          actions: [{ label: 'Sign-off →' }],
        });
      } else {
        this.updateObjective();
        this.d.journal.add(`${beat} PASSED.`);
        this.d.ui.open({
          id: 'lk-beat-pass', kicker: 'Verification', title: `✔ ${beat} passed`,
          bodyHtml: `<div>${esc(`Next: ${next.label}.`)}</div>`,
          actions: [{ label: 'Next test →' }],
        });
      }
    } else {
      const note = this.failNote(beat);
      this.step = 'fix';
      this.updateObjective();
      this.d.journal.add(`${beat} FAILED. ${note}`);
      this.d.ui.open({
        id: 'lk-beat-fail', kicker: 'Verification', title: `✘ ${beat} failed`,
        bodyHtml: `<div>${esc(note)}</div>`,
        actions: [{ label: 'Back to the IAM desk →' }],
      });
    }
  }

  private failNote(beat: Beat): string {
    if (beat === 'access') return 'The app still has no working identity — issue credentials at the IAM security desk.';
    switch (this.cred) {
      case 'key': return 'Your new key carries the OLD policy — s3:* on everything. The red team opened payroll with the app’s own credential, and it’s another long-lived secret waiting to leak. Scope it down and use a role.';
      case 'admin': return 'AdministratorAccess turned a bucket-reader into a skeleton key — the red team walked straight into payroll. When (not if) a credential leaks, least privilege is what limits the blast.';
      case 'root': return 'Root credentials bypass every guardrail, can’t be scoped, and can’t be rotated away quietly. Never use root for workloads — lock it behind MFA and issue roles instead.';
      default: return 'The credential is broader than the app’s needs — payroll must stay shut.';
    }
  }

  // --------------------------------------------------------------- signoff
  private startSignoff() {
    this.quiz.start(this.topic, (pct, passed) => {
      const rec = recordProgress(this.topic.id, passed ? 'Mastered' : 'Assessed', pct);
      if (passed) {
        this.step = 'done';
        this.updateObjective();
        this.d.journal.add(`INC-4501 closed. Sign-off ${pct}% — mastery recorded.`);
        this.d.ui.open({
          id: 'lk-resolved', kicker: 'INC-4501 · resolved', title: `🎉 Ticket closed — ${pct}%`,
          bodyHtml: `<div>${esc(`Mastery: ${rec.mastery} · best ${rec.best}%. svc-app runs on short-lived, least-privilege role credentials — nothing left to leak.`)}</div>`,
          actions: [
            { label: '↩ Return to NOC', onSelect: () => this.d.onReturn() },
            { label: 'Stay on site' },
          ],
        });
      } else {
        this.d.ui.open({
          id: 'lk-signoff-fail', kicker: 'Sign-off', title: `${pct}% — not enough to close (need 80%)`,
          bodyHtml: `<div>${esc('Recorded as Assessed. Review your journal and sign off again at the field terminal.')}</div>`,
          actions: [{ label: 'OK' }],
        });
      }
    });
  }

  private openSummary() {
    const concepts = [...new Set(this.topic.stages.map((s) => s.concept).filter(Boolean))];
    this.d.ui.open({
      id: 'lk-summary', kicker: 'INC-4501 · resolved', title: 'The Leaked Key — summary',
      bodyHtml:
        `<div>${esc('Symptom: revoking a leaked long-lived key took the app down — it was the app’s only identity. Fix: an instance role scoped to s3:GetObject on assets/* (temporary, rotated credentials). Proven by a red-team drill: the leaked key replay bounced, and the new credential could not open payroll.')}</div><div style="height:8px"></div>` +
        concepts.map((c) => `<div>· ${esc(String(c))}</div>`).join(''),
      actions: [{ label: 'Close' }],
    });
  }
}
