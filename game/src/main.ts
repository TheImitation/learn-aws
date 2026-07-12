import {
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Scene,
  Vector3,
} from '@babylonjs/core';
import { initPhysics } from './core/physicsInit';
import { InputMap, type DebugInput } from './input/inputMap';
import { buildEngineer } from './player/engineerMesh';
import { EngineerAnimator } from './player/animator';
import { PlayerController } from './player/controller';
import { ThirdPersonRig } from './camera/thirdPersonRig';
import { buildTestYard } from './world/testYard';
import { DebugHud } from './ui/debugHud';
import { InteractionSystem, promptText } from './interact/interactionSystem';
import { CarrySystem } from './interact/carry';
import { GrabControl } from './interact/grab';
import { AlarmSystem } from './fx/alarm';
import { UiShell, esc } from './ui/uiShell';
import { Journal } from './ui/journal';
import { Toaster } from './ui/toast';
import { openOptionsPanel } from './ui/optionsPanel';
import { wireAudioUnlock } from './core/sfx';
import { OPTIONS } from './core/options';
import { FlowSim } from './sim/flowSim';
import { jobBoardKiosk } from './world/kit';
import { ObjectiveBanner } from './ui/objective';
import { MISSIONS } from './missions/registry';
import { MissionManager } from './missions/manager';
import { JobBoard } from './ui/jobBoard';
import { QuizTerminal } from './ui/quizTerminal';
import { readiness, recommended, isLocked, unlockedLevel } from './content/meta';
import { COURSE } from '@content';

const canvas = document.getElementById('app') as HTMLCanvasElement;
const engine = new Engine(canvas, true, { stencil: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.055, 0.063, 0.086, 1);

const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
hemi.intensity = 0.55;
hemi.groundColor = new Color3(0.18, 0.16, 0.14);
const sun = new DirectionalLight('sun', new Vector3(-0.45, -1, -0.35), scene);
sun.intensity = 1.15;

async function boot() {
  await initPhysics(scene);
  // We own the physics clock: stepping happens in tick() so gameplay and scripted
  // verification (simStep) share one deterministic code path. Babylon's automatic
  // per-render stepping is disabled via physicsEnabled.
  scene.physicsEnabled = false;
  const pe = scene.getPhysicsEngine() as unknown as { _step: (dt: number) => void };

  const yard = buildTestYard(scene);
  const input = new InputMap(engine, canvas);
  const parts = buildEngineer(scene);
  const player = new PlayerController(scene, yard.spawn, parts.root);
  const animator = new EngineerAnimator(parts);
  const rig = new ThirdPersonRig(scene, yard.spawn);
  const hud = new DebugHud();
  const ui = new UiShell();
  const journal = new Journal();
  const interaction = new InteractionSystem();
  const carry = new CarrySystem(parts.root);
  const grab = new GrabControl();
  const alarm = new AlarmSystem();
  const toaster = new Toaster();

  // --- Phase 2 demo interactables (replaced by real machines in Phase 3) ---
  interaction.add({
    id: 'status-board',
    node: yard.statusBoard,
    prompt: 'Read status board',
    onInteract: () => ui.open({
      id: 'status-board',
      kicker: 'Terminal',
      title: 'Yard status',
      bodyHtml:
        `<pre>site: TEST-YARD-01        state: <b>NOMINAL</b>\n` +
        `player systems ..... ok\ncamera rig ......... ok\nhavok world ........ ok</pre>` +
        `<div>${esc('Every machine in a mission opens a panel like this one — logs, configs, gauges.')}</div>`,
      actions: [
        { label: 'Log to journal', onSelect: () => journal.add('Yard status: all systems nominal.') },
        { label: 'Close' },
      ],
    }),
  });
  interaction.add({
    id: 'toolbox',
    node: yard.toolbox,
    prompt: 'Open toolbox',
    onInteract: () => ui.open({
      id: 'toolbox',
      kicker: 'Field kit',
      title: 'Engineer’s toolbox',
      bodyHtml: `<div>Multimeter, cable tester, spare route cards. ${esc('You never know what a ticket needs.')}</div>`,
      actions: [
        { label: 'Take a note', onSelect: () => journal.add('Toolbox checked — kit complete.') },
        { label: 'Close' },
      ],
    }),
  });

  // --- Phase 5/6: the NOC hub + the mission site (manager-owned) ---
  const sim = new FlowSim(scene);
  const objective = new ObjectiveBanner();
  objective.set('NOC', 'Take a ticket at the job board');

  const manager = new MissionManager(
    { scene, sim, ui, journal, interaction, objective, carry, grab, alarm, toast: toaster },
    COURSE.topics,
    (feet) => player.teleport(feet),
    yard.spawn.clone(),
  );
  for (const [id, factory] of Object.entries(MISSIONS)) manager.register(id, factory);

  const missionHook = (id: string) => ({
    topicId: id,
    inProgress: () => manager.currentId === id && manager.step !== 'briefing' && manager.step !== 'done',
    done: () => manager.currentId === id && manager.step === 'done',
    start: () => manager.start(id),
    statusLine: () => manager.step ?? '',
  });
  const quizTerminal = new QuizTerminal(ui);
  const board = new JobBoard(ui, journal, quizTerminal, COURSE.topics,
    Object.fromEntries(Object.keys(MISSIONS).map((id) => [id, missionHook(id)])));
  const kiosk = jobBoardKiosk(scene, new Vector3(3, 0, 8.5), Math.PI);
  kiosk.setLamp?.('ok');
  interaction.add({
    id: 'job-board',
    node: kiosk.root,
    prompt: 'Open job board',
    onInteract: () => board.open(),
  });

  const pauseSpec = () => ({
    id: 'pause',
    kicker: 'Paused',
    title: `On-Call — profile ${OPTIONS.profile}`,
    bodyHtml: '<div>WASD/stick move · Shift/L3 sprint · Space/Ⓐ jump · E/Ⓧ interact · Tab/Ⓨ journal</div>',
    actions: [
      { label: 'Resume' },
      { label: 'Options…', closes: false, onSelect: () => openOptionsPanel(ui, (t) => toaster.show(t, 'info', 4)) },
      { label: 'Reset position', onSelect: () => player.teleport(yard.spawn) },
    ],
  });
  wireAudioUnlock();

  let skipObservableTick = false;
  const tick = (dt: number) => {
    input.update(dt);
    const st = input.state;
    if (ui.isOpen) {
      // Panel mode: player frozen, world keeps simulating, UI consumes navigation.
      ui.handleNav(st);
      animator.update(dt, 0, true, 0);
      ui.setPrompt(null);
    } else if (grab.active) {
      // Hands on a mechanism: move axis steers it, interact releases.
      grab.tick(dt, st);
      animator.update(dt, 0, true, 0);
      rig.update(dt, st.look, player.position);
      ui.setPrompt(grab.active ? { text: grab.prompt, device: st.lastDevice } : null);
    } else {
      const { forward, right } = rig.basis();
      player.update(dt, st, forward, right);
      animator.update(dt, player.planarSpeed, player.grounded, player.yawRate);
      rig.update(dt, st.look, player.position);
      interaction.update(player.position, player.facingYaw);
      if (st.interact) {
        // focused interactable wins; on empty ground, put the carried module down
        if (!interaction.tryInteract() && carry.held) carry.drop(player.position, player.facingYaw);
      } else if (st.journal) ui.open(journal.panelSpec());
      else if (st.pause) ui.open(pauseSpec());
      const f = interaction.focused;
      ui.setPrompt(
        f ? { text: promptText(f), device: st.lastDevice }
          : carry.held ? { text: `Put down ${carry.held.label}`, device: st.lastDevice }
          : null,
      );
    }
    carry.update(dt);
    alarm.update(dt);
    toaster.update(dt);
    sim.update(dt);
    manager.update(dt);
    pe._step(Math.min(dt, 1 / 30));
    hud.update({
      fps: engine.getFps(),
      device: st.lastDevice,
      pad: input.padConnected,
      speed: ui.isOpen ? 0 : player.planarSpeed,
      grounded: player.grounded,
    });
  };

  scene.onBeforeRenderObservable.add(() => {
    if (skipObservableTick) return;
    const dt = Math.min((engine.getDeltaTime() || 16.7) / 1000, 0.05);
    tick(dt);
  });

  // Dev hooks. simStep drives whole game frames with fixed 1/60 quanta, synchronously,
  // so preview verification works in rAF/timer-throttled hidden tabs.
  (window as unknown as Record<string, unknown>).__game = {
    engine,
    scene,
    contentTopics: COURSE.topics.length,
    fps: () => engine.getFps(),
    simStep: (seconds: number) => {
      const n = Math.max(1, Math.round(seconds * 60));
      for (let i = 0; i < n; i++) tick(1 / 60);
      skipObservableTick = true;
      scene.render();
      skipObservableTick = false;
    },
    setDebugInput: (d: DebugInput | null) => input.setDebugInput(d),
    player: {
      pos: () => { const p = player.position; return { x: +p.x.toFixed(3), y: +p.y.toFixed(3), z: +p.z.toFixed(3) }; },
      grounded: () => player.grounded,
      speed: () => +player.planarSpeed.toFixed(2),
    },
    cam: () => ({ alpha: +rig.camera.alpha.toFixed(3), beta: +rig.camera.beta.toFixed(3), radius: +rig.camera.radius.toFixed(2) }),
    cratePos: (i: number) => { const c = yard.crates[i]; return c ? { x: +c.position.x.toFixed(2), y: +c.position.y.toFixed(2), z: +c.position.z.toFixed(2) } : null; },
    cc: player.cc, // dev-only: introspection while tuning
    ui: {
      isOpen: () => ui.isOpen,
      id: () => ui.currentId,
      title: () => ui.currentTitle,
      focusedLabel: () => ui.focusedLabel,
    },
    interactFocus: () => interaction.focused?.id ?? null,
    journalCount: () => journal.notes.length,
    carry: () => carry.held?.id ?? null,
    toasts: () => toaster.current,
    alarmActive: () => alarm.isActive,
    grabActive: () => grab.active,
    sim: {
      report: () => sim.trafficReport,
      active: () => sim.activeTokens,
    },
    mission: {
      id: () => manager.currentId,
      step: () => manager.step,
      objective: () => objective.text,
      origin: { x: manager.origin.x, y: manager.origin.y, z: manager.origin.z },
      start: (id: string) => manager.start(id),
      debug: () => manager.mission?.e2e?.() ?? null,
    },
    board: {
      readiness: () => readiness(COURSE.topics),
      recommended: () => recommended(COURSE.topics)?.id ?? null,
      unlockedLevel: (domainKey: string) => unlockedLevel(COURSE.topics, domainKey),
      isLocked: (id: string) => { const t = COURSE.topics.find((x) => x.id === id); return t ? isLocked(COURSE.topics, t) : null; },
    },
    topicQuiz: (id: string) => COURSE.topics.find((t) => t.id === id)?.quiz ?? null,
  };

  engine.runRenderLoop(() => scene.render());
}

boot().catch((e) => {
  console.error('boot failed', e);
});

addEventListener('resize', () => engine.resize());
