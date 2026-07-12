import { Vector3 } from '@babylonjs/core';
import type { Topic } from '@content';
import {
  aimPointer, azPlate, chaosLever, crowdGate, dbTower, internetGate, moduleBox, natAirlock,
  routerArm, serverRack, shelfUnit, socketRing, statusConsole, strobeBeacon, supplyPallet, type Machine,
} from '../world/kit';
import type { Carryable } from '../interact/carry';
import { Socket } from '../interact/sockets';
import { esc } from '../ui/uiShell';
import { MissionBase, type DiagnosisSpec, type TicketInfo } from './base';
import type { MissionDeps } from './manager';
import type { MissionStep } from './patchNight';

/* ------------------------------------------------------------------ schema */

export type V2 = [number, number]; // origin-relative x,z

export type MachineKind =
  | 'crowdGate' | 'serverRack' | 'dbTower' | 'statusConsole' | 'natAirlock'
  | 'internetGate' | 'shelfUnit' | 'azPlate' | 'aimPointer' | 'chaosLever' | 'routerArm';

export interface MachineDef {
  id: string;
  kind: MachineKind;
  at: V2;
  yaw?: number;
  args?: (string | number | boolean)[]; // kind-specific extras (shelf accent, azPlate size…)
}

export interface ProbeDef {
  id: string; //        probe key (objective counts these)
  machine: string;
  prompt: string;
  kicker: string;
  title: string;
  pre?: string; //      monospace block
  body?: string;
  journal: string;
}

export interface ModuleDef {
  id: string;
  kind: string;
  label: string;
  spot: V2;
  visual: { hex: string; glowHex: string; cyl?: boolean; w?: number; h?: number; d?: number };
}

export interface SocketDef {
  id: string;
  label: string;
  at: V2;
  blurb: string; //     inspect text — the teaching line for what belongs here
  /** kind → ok, or ok-with-dependency (e.g. standby needs its primary seated first). */
  allow: Record<string, true | { requiresSocket: string; requiresKind: string; elseReason: string }>;
  /** kind → reasoned refusal; alarm marks it insecure (klaxon). */
  refuse?: Record<string, { reason: string; alarm?: string }>;
  fallback: { reason: string; alarm?: string };
}

export interface DialDef {
  id: string;
  machine: string; //   an 'aimPointer' machine
  positions: { id: string; label: string; toward?: V2; angle?: number }[];
  initial: string;
  grabPrompt?: string;
}

export interface LeverDef {
  id: string;
  machine: string; //   a 'chaosLever' machine
  prompt: string;
  beat: string; //      the beat this lever triggers (during verify)
}

/** All-fields-must-match predicate over the physical layout. */
export interface Pred {
  socket?: Record<string, string | null | 'any'>; // socketId → occupant kind | empty | occupied
  dial?: Record<string, string>; //                  dialId → position id
  dead?: string; //                                  this socket was killed by a mutation
  azDead?: string; //                                this machine (zone/region) was failed by a mutation
}

export interface BeatRule {
  when?: Pred; //       first matching rule wins; omit = always matches
  pass: boolean;
  title: string; //     result panel headline ("✔ p99 7 ms — SLA holds")
  lines: string; //     monospace result table
  note: string; //      the lesson
  alarm?: string;
}

export interface BeatDef {
  id: string;
  label: string;
  trigger: 'terminal' | 'lever';
  infoInInvestigate?: boolean; // runnable pre-fix as a "see the damage" info panel
  spawn?: { node: string; kind: string; n: number; spacing: number }; // token theater
  mutate?: string[]; //  ops before evaluation: 'killSocket:<id>' | 'azDead:<machineId>'
  rules: BeatRule[];
}

export interface SimNodeDef {
  id: string;
  machine?: string; //  anchor from machine…
  at?: V2; //           …or explicit point (y 0.95)
  route: { when?: Pred; to: string }[]; // first match; to = node id | 'deliver' | 'drop'
}

export interface MissionSpec {
  ticket: TicketInfo;
  objectiveFix: string;
  objectiveDone: string;
  summary: string;
  level: MachineDef[]; // must include a 'statusConsole' with id 'term'
  probes: ProbeDef[];
  pallet?: { at: V2; yaw?: number; modules: ModuleDef[] };
  sockets?: SocketDef[];
  dials?: DialDef[];
  levers?: LeverDef[];
  sim?: SimNodeDef[];
  beats: BeatDef[];
  verifyDone: { title: string; body: string; journal: string };
  diagnosis: DiagnosisSpec & { unlockedBy: string };
  faultLamps?: string[]; // machine ids: red until the first beat passes
}

/* ------------------------------------------------------------------ engine */

type SpecMachine = Machine & Partial<{
  setState: (s: 'ok' | 'dead') => void;
  setAngle: (rad: number) => void;
  getAngle: () => number;
  setPulled: (p: boolean) => void;
}>;

/** Declarative mission: interprets a MissionSpec on top of MissionBase, wiring
 *  the tangible-verb palette (pallet modules, sockets, dials, levers), the
 *  predicate-routed token sim, and rule-based verification beats. */
export class SpecMission extends MissionBase {
  private spec: MissionSpec;
  private machines = new Map<string, SpecMachine>();
  private modules = new Map<string, Carryable>();
  private sockets = new Map<string, Socket>();
  private dialPos = new Map<string, string>(); //  dial id → position id
  private dialAngles = new Map<string, { id: string; label: string; angle: number }[]>();
  private deadSockets = new Set<string>();
  private deadAz = new Set<string>();
  private beatsPassed = new Set<string>();
  private test: { beat: BeatDef; total: number; resolved: number } | null = null;
  private lastResult = '—';

  constructor(deps: MissionDeps, topic: Topic, spec: MissionSpec) {
    super(deps, topic);
    this.spec = spec;
    this.buildLevel();
    this.buildPallet();
    this.buildSockets();
    this.buildDials();
    this.wireProbes();
    this.wireLevers();
    this.wireTerminal();
    this.wireSim();
    this.applyLamps();
  }

  protected onUpdate(dt: number) { for (const s of this.sockets.values()) s.update(dt); }

  protected onDispose() {
    const held = this.d.carry.held;
    if (held && this.modules.has(held.id)) this.d.carry.release();
    this.d.sim.onTokenResolved = undefined;
  }

  e2e() {
    const sockets: Record<string, string | null> = {};
    for (const [id, s] of this.sockets) sockets[id] = s.occupant?.kind ?? null;
    const mods: Record<string, { x: number; z: number }> = {};
    for (const [id, c] of this.modules) {
      const p = c.root.getAbsolutePosition();
      mods[id] = { x: +p.x.toFixed(2), z: +p.z.toFixed(2) };
    }
    return {
      ...super.e2e(), sockets, mods,
      dials: Object.fromEntries(this.dialPos),
      dead: [...this.deadSockets],
      beats: [...this.beatsPassed],
    };
  }

  protected ticket(): TicketInfo { return this.spec.ticket; }

  protected objectiveFor(step: MissionStep): [string, string] {
    const next = this.spec.beats.find((b) => !this.beatsPassed.has(b.id));
    switch (step) {
      case 'investigate': return ['Investigate', `Probe the site (${Math.min(this.probes.size, this.spec.probes.length)}/${this.spec.probes.length}) · diagnose at the field terminal`];
      case 'fix': return ['Fix', this.spec.objectiveFix];
      case 'verify': return ['Verify', next ? (next.trigger === 'lever' ? `Run the ${next.label} — pull the lever` : `Run the ${next.label} at the field terminal`) : 'All tests passed'];
      case 'signoff': return ['Sign-off', 'Close the ticket at the field terminal (quiz)'];
      case 'done': return ['Resolved', this.spec.objectiveDone];
      default: return ['Ticket', `Read the ${this.spec.ticket.sev} briefing`];
    }
  }

  protected summaryText(): string { return this.spec.summary; }

  /* ---------------------------------------------------------------- build */

  private v(at: V2): Vector3 { return this.d.origin.add(new Vector3(at[0], 0, at[1])); }

  private buildLevel() {
    const s = this.d.scene;
    for (const def of this.spec.level) {
      const at = this.v(def.at);
      const yaw = def.yaw ?? 0;
      const a = def.args ?? [];
      let m: SpecMachine;
      switch (def.kind) {
        case 'crowdGate': m = crowdGate(s, at, yaw); break;
        case 'serverRack': m = serverRack(s, at, yaw); break;
        case 'dbTower': m = dbTower(s, at); break;
        case 'statusConsole': m = statusConsole(s, at, yaw); break;
        case 'natAirlock': m = natAirlock(s, at, yaw); break;
        case 'internetGate': m = internetGate(s, at, yaw); break;
        case 'shelfUnit': m = shelfUnit(s, at, yaw, String(a[0] ?? '#57c7e3'), Boolean(a[1])); break;
        case 'aimPointer': m = aimPointer(s, at); break;
        case 'chaosLever': m = chaosLever(s, at, yaw); break;
        case 'routerArm': m = routerArm(s, at); break;
        case 'azPlate': {
          const p = azPlate(s, at, Number(a[0] ?? 6), Number(a[1] ?? 6), String(a[2] ?? 'A') as 'A' | 'B');
          m = { root: p.root, anchor: at.add(new Vector3(0, 0.6, 0)), setState: p.setState };
          break;
        }
      }
      this.own(m);
      this.machines.set(def.id, m);
    }
    // alarm strobes on opposite corners, bound for the site's lifetime
    for (const [bx, bz] of [[-8.5, 6.5], [8.5, -6.5]] as const) {
      const b = strobeBeacon(s, this.v([bx, bz]));
      this.ownNode(b.root);
      this.d.alarm.bindBeacon(b.setLevel);
    }
  }

  private buildPallet() {
    const p = this.spec.pallet;
    if (!p) return;
    const s = this.d.scene;
    this.own(supplyPallet(s, this.v(p.at), p.yaw ?? 0));
    for (const def of p.modules) {
      const at = this.v(def.spot);
      const mod = moduleBox(s, new Vector3(at.x, 0.24, at.z), def.visual);
      this.own(mod);
      const c: Carryable = {
        id: def.id, kind: def.kind, label: def.label,
        root: mod.root, halfHeight: mod.halfHeight, killBody: mod.killBody, makeBody: mod.makeBody,
      };
      this.modules.set(def.id, c);
      this.reg({
        id: def.id, node: c.root, radius: 1.8,
        prompt: `Pick up ${def.label}`,
        enabled: () => (this.step === 'fix' || this.step === 'verify') && !this.d.carry.held && !this.socketOf(def.id),
        onInteract: () => { this.d.carry.pickup(c); this.d.toast.show(`${def.label} — find it a socket.`, 'info', 2.2); },
      });
    }
  }

  private buildSockets() {
    for (const def of this.spec.sockets ?? []) {
      const s = this.d.scene;
      const at = this.v(def.at);
      const ring = socketRing(s, at);
      this.ownNode(ring.root);
      const socket = new Socket({
        id: def.id, label: def.label, at, ring,
        accepts: (kind) => this.evalAccept(def, kind),
        onChange: () => this.onLayoutChange(),
      });
      this.sockets.set(def.id, socket);
      this.reg({
        id: def.id, node: ring.root, radius: 1.9,
        prompt: () => {
          const held = this.d.carry.held;
          if (held && this.modules.has(held.id)) return `Plug ${held.label} into the ${def.label}`;
          if (socket.occupant) return `Take out ${socket.occupant.label}`;
          return `Inspect ${def.label}`;
        },
        onInteract: () => this.socketInteract(socket, def),
      });
    }
  }

  private evalAccept(def: SocketDef, kind: string): ReturnType<Socket['spec']['accepts']> {
    const allow = def.allow[kind];
    if (allow === true) return { ok: true };
    if (allow) {
      const dep = this.sockets.get(allow.requiresSocket);
      if (dep?.occupant?.kind === allow.requiresKind) return { ok: true };
      return { ok: false, reason: allow.elseReason };
    }
    const refuse = def.refuse?.[kind];
    if (refuse) return { ok: false, ...refuse };
    return { ok: false, ...def.fallback };
  }

  private socketInteract(socket: Socket, def: SocketDef) {
    const held = this.d.carry.held;
    if (held) {
      if (!this.modules.has(held.id)) return;
      const v = socket.canPlug(held.kind);
      if (v.ok) {
        const c = this.d.carry.release()!;
        socket.put(c);
        this.d.toast.show(`${c.label} seated — ${def.label} online.`, 'ok', 2.4);
        this.d.journal.add(`Socketed: ${c.label} → ${def.label}.`);
      } else {
        this.d.toast.show(v.reason, 'bad', 3.4);
        if (v.alarm) {
          this.d.alarm.raise(v.alarm, 5);
          this.d.journal.add(`SECURITY ALARM: refused to socket the ${held.label} — ${v.alarm.toLowerCase()}.`);
        }
      }
      return;
    }
    if (socket.occupant) {
      const c = socket.takeOut()!;
      this.d.carry.take(c);
      this.d.toast.show(`${c.label} removed from the ${def.label}.`, 'info', 2);
      return;
    }
    this.d.ui.open({
      id: `${def.id}-info`, kicker: 'Socket', title: def.label,
      bodyHtml: `<div>${esc(def.blurb)}</div>`,
      actions: [{ label: 'Close' }],
    });
  }

  private socketOf(moduleId: string): string | null {
    for (const [id, s] of this.sockets) if (s.occupant?.id === moduleId) return id;
    return null;
  }

  private buildDials() {
    for (const def of this.spec.dials ?? []) {
      const m = this.machines.get(def.machine);
      if (!m?.setAngle) continue;
      const md = this.spec.level.find((l) => l.id === def.machine)!;
      const positions = def.positions.map((p) => ({
        id: p.id, label: p.label,
        angle: p.angle ?? Math.atan2((p.toward![0]) - md.at[0], (p.toward![1]) - md.at[1]),
      }));
      this.dialAngles.set(def.id, positions);
      this.dialPos.set(def.id, def.initial);
      m.setAngle(positions.find((p) => p.id === def.initial)!.angle);
      this.reg({
        id: def.id, node: m.root, radius: 1.9,
        prompt: () => (this.step === 'fix' || this.step === 'verify' ? 'Grab the dial' : 'Inspect the dial'),
        onInteract: () => this.onDial(def, m),
      });
    }
  }

  private onDial(def: DialDef, m: SpecMachine) {
    const positions = this.dialAngles.get(def.id)!;
    if (this.step !== 'fix' && this.step !== 'verify') {
      const cur = positions.find((p) => p.id === this.dialPos.get(def.id))!;
      this.probed(def.id, `Dial "${def.id}": set to ${cur.label}.`);
      this.d.ui.open({
        id: `${def.id}-probe`, kicker: 'Mechanism', title: `Dial: ${cur.label}`,
        bodyHtml: `<div>${esc(`Positions: ${positions.map((p) => p.label).join(' · ')}. Currently locked to ${cur.label}. Diagnose first; then grab and swing it.`)}</div>`,
        actions: [{ label: 'Close' }],
      });
      return;
    }
    let ang = m.getAngle!();
    const min = Math.min(...positions.map((p) => p.angle)) - 0.35;
    const max = Math.max(...positions.map((p) => p.angle)) + 0.35;
    this.d.grab.begin({
      prompt: def.grabPrompt ?? '◀ ▶ swing the dial · E/Ⓧ lock',
      step: (dt, mx) => { ang = Math.min(max, Math.max(min, ang + mx * 1.7 * dt)); m.setAngle!(ang); },
      release: () => {
        let best: (typeof positions)[number] | null = null;
        for (const p of positions) if (Math.abs(ang - p.angle) < 0.3 && (!best || Math.abs(ang - p.angle) < Math.abs(ang - best.angle))) best = p;
        if (!best) {
          m.setAngle!(positions.find((p) => p.id === this.dialPos.get(def.id))!.angle);
          this.d.toast.show('Not lined up with a position — dial unchanged.', 'bad', 2.4);
          return;
        }
        m.setAngle!(best.angle);
        if (best.id !== this.dialPos.get(def.id)) {
          this.dialPos.set(def.id, best.id);
          this.d.journal.add(`Dial locked: ${best.label}.`);
          this.onLayoutChange();
        }
        this.d.toast.show(`Locked → ${best.label}.`, 'ok', 2.2);
      },
    });
  }

  private openProbe(p: ProbeDef) {
    this.probed(p.id, p.journal);
    this.d.ui.open({
      id: `probe-${p.id}`, kicker: p.kicker, title: p.title,
      bodyHtml: (p.pre ? `<pre>${esc(p.pre)}</pre>` : '') + (p.body ? `<div>${esc(p.body)}</div>` : ''),
      actions: [{ label: 'Close' }],
    });
  }

  private wireProbes() {
    for (const p of this.spec.probes) {
      const m = this.machines.get(p.machine);
      if (!m) continue;
      // dial and lever machines fold their probe into their own interactable
      if ((this.spec.dials ?? []).some((d) => d.machine === p.machine)) continue;
      if ((this.spec.levers ?? []).some((l) => l.machine === p.machine)) continue;
      this.reg({ id: `probe-${p.id}`, node: m.root, prompt: p.prompt, onInteract: () => this.openProbe(p) });
    }
  }

  private wireLevers() {
    for (const def of this.spec.levers ?? []) {
      const m = this.machines.get(def.machine);
      if (!m?.setPulled) continue;
      const probe = this.spec.probes.find((p) => p.machine === def.machine);
      const armed = () => this.step === 'verify'
        && this.spec.beats.find((b) => !this.beatsPassed.has(b.id))?.id === def.beat
        && !this.test;
      this.reg({
        id: def.id, node: m.root, radius: 2.0,
        prompt: () => (armed() ? def.prompt : probe?.prompt ?? def.prompt),
        onInteract: () => {
          if (!armed()) {
            if (probe) this.openProbe(probe);
            else this.d.toast.show('The lever is for the verification drill — later.', 'info', 2.2);
            return;
          }
          m.setPulled!(true);
          const beat = this.spec.beats.find((b) => b.id === def.beat)!;
          this.d.toast.show(`${beat.label} — lever pulled.`, 'bad', 2.2);
          this.runBeat(beat, () => m.setPulled!(false));
        },
      });
    }
  }

  private wireTerminal() {
    const term = this.machines.get('term');
    if (!term) return;
    this.reg({ id: 'term', node: term.root, prompt: 'Open field terminal', onInteract: () => this.openTerminal() });
  }

  private wireSim() {
    const { sim } = this.d;
    for (const def of this.spec.sim ?? []) {
      const anchor = def.machine
        ? this.machines.get(def.machine)!.anchor
        : this.v(def.at!).add(new Vector3(0, 0.95, 0));
      sim.addNode({
        id: def.id, anchor,
        next: () => {
          for (const r of def.route) if (this.matches(r.when)) return r.to;
          return 'drop';
        },
      });
    }
    sim.onTokenResolved = () => {
      const t = this.test;
      if (!t) return;
      t.resolved++;
      if (t.resolved >= t.total) {
        const beat = t.beat;
        this.test = null;
        this.evalBeat(beat);
      }
    };
  }

  /* ------------------------------------------------------------ mechanics */

  private matches(p?: Pred): boolean {
    if (!p) return true;
    for (const [id, want] of Object.entries(p.socket ?? {})) {
      const got = this.sockets.get(id)?.occupant?.kind ?? null;
      if (want === 'any' ? got === null : got !== want) return false;
    }
    for (const [id, want] of Object.entries(p.dial ?? {})) {
      if (this.dialPos.get(id) !== want) return false;
    }
    if (p.dead && !this.deadSockets.has(p.dead)) return false;
    if (p.azDead && !this.deadAz.has(p.azDead)) return false;
    return true;
  }

  private onLayoutChange() {
    for (const id of this.deadAz) this.machines.get(id)?.setState?.('ok');
    this.deadAz.clear();
    for (const id of this.deadSockets) {
      const s = this.sockets.get(id);
      if (s?.occupant) s.spec.ring.setState('ok');
    }
    this.deadSockets.clear();
    if (this.beatsPassed.size) this.d.toast.show('Layout changed — test results reset.', 'info', 2);
    this.beatsPassed.clear();
    if (this.step === 'fix') this.step = 'verify';
    this.applyLamps();
    this.refreshObjective();
  }

  private applyLamps() {
    const good = this.step === 'signoff' || this.step === 'done';
    for (const [id, m] of this.machines) {
      if (!m.setLamp) continue;
      if ((this.spec.faultLamps ?? []).includes(id)) m.setLamp(good || this.beatsPassed.size > 0 ? 'ok' : 'bad');
      else m.setLamp(good ? 'ok' : id === 'term' ? 'off' : 'ok');
    }
  }

  private applyMutations(beat: BeatDef) {
    for (const op of beat.mutate ?? []) {
      const [verb, target] = op.split(':');
      if (verb === 'killSocket') {
        this.deadSockets.add(target);
        this.sockets.get(target)?.markBad();
      } else if (verb === 'azDead') {
        this.deadAz.add(target);
        const m = this.machines.get(target);
        m?.setState?.('dead');
        m?.setLamp?.('bad');
      }
    }
  }

  private runBeat(beat: BeatDef, after?: () => void) {
    this.machines.get('term')?.setLamp?.('off');
    this.applyMutations(beat);
    this.d.journal.add(`Running: ${beat.label}…`);
    if (beat.spawn) {
      this.test = { beat, total: beat.spawn.n, resolved: 0 };
      for (let i = 0; i < beat.spawn.n; i++) {
        this.schedule(0.3 + i * beat.spawn.spacing, () => this.d.sim.spawn(beat.spawn!.node, beat.spawn!.kind));
      }
      if (after) this.schedule(0.3 + beat.spawn.n * beat.spawn.spacing + 3, after);
    } else {
      this.schedule(1.2, () => { this.evalBeat(beat); after?.(); });
    }
  }

  private evalBeat(beat: BeatDef) {
    const rule = beat.rules.find((r) => this.matches(r.when));
    if (!rule) return;
    this.lastResult = rule.title;
    const table = `<pre>${esc(rule.lines)}</pre>`;
    if (this.step === 'investigate' || this.step === 'fix') {
      this.d.journal.add(`${beat.label}: ${rule.title}.`);
      this.d.ui.open({ id: 'beat-info', kicker: beat.label, title: rule.title, bodyHtml: table, actions: [{ label: 'Ouch. Close' }] });
      return;
    }
    if (this.step !== 'verify') return;
    if (rule.alarm) {
      this.d.alarm.raise(rule.alarm, 5);
      this.d.journal.add(`SITE ALARM: ${rule.alarm}.`);
    }
    if (rule.pass) {
      this.beatsPassed.add(beat.id);
      this.applyLamps();
      this.refreshObjective();
      this.d.journal.add(`${beat.label} PASSED: ${rule.note}`);
      const next = this.spec.beats.find((b) => !this.beatsPassed.has(b.id));
      if (!next) {
        this.allBeatsPassed(this.spec.verifyDone.title, this.spec.verifyDone.body, this.spec.verifyDone.journal);
      } else {
        this.d.ui.open({
          id: 'spec-pass', kicker: beat.label, title: rule.title,
          bodyHtml: table + `<div>${esc(rule.note)}</div>`,
          actions: [{ label: `Next: ${next.label} →` }],
        });
      }
    } else {
      this.beatFailed(beat.label, rule.note);
      this.d.ui.open({
        id: 'spec-fail', kicker: beat.label, title: rule.title,
        bodyHtml: table + `<div>${esc(rule.note)}</div>`,
        actions: [{ label: 'Back to work →' }],
      });
    }
  }

  /* -------------------------------------------------------------- terminal */

  private openTerminal() {
    const beatsLine = this.spec.beats.map((b) => `${this.beatsPassed.has(b.id) ? '✓' : '·'} ${b.label}`).join('\n');
    const socketsLine = [...this.sockets.values()]
      .map((s) => `${s.spec.label.padEnd(16)} ${s.occupant?.label ?? '—'}`).join('\n');
    const dialsLine = (this.spec.dials ?? [])
      .map((d) => {
        const cur = this.dialAngles.get(d.id)!.find((p) => p.id === this.dialPos.get(d.id))!;
        return `dial${' '.repeat(12)} ${cur.label}`;
      }).join('\n');
    const actions = [];
    const info = this.spec.beats.find((b) => b.infoInInvestigate);
    if (this.step === 'investigate') {
      if (info) actions.push({ label: `Run ${info.label} — see the damage`, closes: true, onSelect: () => this.runBeat(info) });
      if (this.probes.has(this.spec.diagnosis.unlockedBy)) {
        actions.push({ label: 'Diagnose root cause…', closes: false, onSelect: () => this.openDiagnosis(this.spec.diagnosis) });
      }
    } else if (this.step === 'fix') {
      if (info) actions.push({ label: `Run ${info.label}`, closes: true, onSelect: () => this.runBeat(info) });
    } else if (this.step === 'verify') {
      const next = this.spec.beats.find((b) => !this.beatsPassed.has(b.id));
      if (next && next.trigger === 'terminal' && !this.test) {
        actions.push({ label: `Run ${next.label}`, closes: true, onSelect: () => this.runBeat(next) });
      }
    } else if (this.step === 'signoff') {
      actions.push({ label: 'Close ticket — sign off (quiz)', closes: false, onSelect: () => this.startSignoff(() => this.applyLamps()) });
    } else if (this.step === 'done') {
      actions.push({ label: 'Ticket summary', closes: false, onSelect: () => this.openSummary() });
    }
    actions.push({ label: 'Close' });
    const nextLever = this.step === 'verify' && this.spec.beats.find((b) => !this.beatsPassed.has(b.id))?.trigger === 'lever'
      ? '\n→ next test runs from the LEVER on site' : '';
    this.d.ui.open({
      id: 'field-terminal', kicker: `Field terminal · ${this.spec.ticket.incident}`, title: this.spec.ticket.title,
      bodyHtml: `<pre>step: ${this.step.toUpperCase()}\n${esc([socketsLine, dialsLine].filter(Boolean).join('\n'))}\nlast result ....... ${esc(this.lastResult)}\n\n${esc(beatsLine)}${esc(nextLever)}</pre>`,
      actions,
    });
  }
}
