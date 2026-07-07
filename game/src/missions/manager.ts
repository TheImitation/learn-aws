import { Scene, Vector3 } from '@babylonjs/core';
import type { Topic } from '@content';
import { FlowSim } from '../sim/flowSim';
import { InteractionSystem } from '../interact/interactionSystem';
import { CarrySystem } from '../interact/carry';
import { GrabControl } from '../interact/grab';
import { AlarmSystem } from '../fx/alarm';
import { Journal } from '../ui/journal';
import { ObjectiveBanner } from '../ui/objective';
import { Toaster } from '../ui/toast';
import { UiShell } from '../ui/uiShell';
import { buildMissionPad } from '../world/missionPad';

/** Everything a mission gets to work with. `origin` is the site anchor — all
 *  placement must be origin-relative so missions are portable. */
export interface MissionDeps {
  scene: Scene;
  sim: FlowSim;
  ui: UiShell;
  journal: Journal;
  interaction: InteractionSystem;
  objective: ObjectiveBanner;
  carry: CarrySystem;
  grab: GrabControl;
  alarm: AlarmSystem;
  toast: Toaster;
  origin: Vector3;
  onReturn: () => void; // "Return to NOC"
}

export interface ActiveMission {
  step: string; // 'briefing' | 'investigate' | ... | 'done'
  update(dt: number): void;
  dispose(): void;
  openBriefing(): void;
  e2e?(): Record<string, unknown>; // dev/e2e state snapshot
}

export type MissionFactory = (deps: MissionDeps, topic: Topic) => ActiveMission;

const SITE_ORIGIN = new Vector3(80, 0, 0);
const SITE_SPAWN = new Vector3(80, 0.2, -9);

/** Owns the one active mission: builds it on the mission pad, teleports the player
 *  out and back, and tears everything down (machines, interactables, sim graph)
 *  before the next ticket starts. */
export class MissionManager {
  readonly origin = SITE_ORIGIN;
  private current: { id: string; mission: ActiveMission } | null = null;
  private factories = new Map<string, MissionFactory>();

  constructor(
    private deps: Omit<MissionDeps, 'origin' | 'onReturn'>,
    private topics: Topic[],
    private teleport: (feet: Vector3) => void,
    private hubSpawn: Vector3,
  ) {
    buildMissionPad(deps.scene, SITE_ORIGIN);
  }

  register(id: string, factory: MissionFactory) { this.factories.set(id, factory); }
  has(id: string) { return this.factories.has(id); }
  get currentId() { return this.current?.id ?? null; }
  get step() { return this.current?.mission.step ?? null; }
  get mission(): ActiveMission | null { return this.current?.mission ?? null; }

  /** Start (or resume) a mission: fresh tickets rebuild the site; the current
   *  ticket just teleports you back to it. */
  start(id: string) {
    if (this.current?.id === id) {
      this.teleport(SITE_SPAWN.clone());
      if (this.current.mission.step === 'briefing') this.current.mission.openBriefing();
      return;
    }
    this.disposeCurrent();
    const factory = this.factories.get(id);
    const topic = this.topics.find((t) => t.id === id);
    if (!factory || !topic) return;
    const mission = factory({ ...this.deps, origin: SITE_ORIGIN.clone(), onReturn: () => this.returnToHub() }, topic);
    this.current = { id, mission };
    this.teleport(SITE_SPAWN.clone());
    mission.openBriefing();
  }

  returnToHub() {
    this.teleport(this.hubSpawn.clone());
    this.deps.objective.set('NOC', 'Take a ticket at the job board');
  }

  update(dt: number) { this.current?.mission.update(dt); }

  private disposeCurrent() {
    if (!this.current) return;
    this.current.mission.dispose();
    this.deps.sim.clear();
    this.current = null;
  }
}
