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
import { buildAtmosphere } from './core/atmosphere';
import { InputMap, type DebugInput } from './input/inputMap';
import { buildEngineer } from './player/engineerMesh';
import { EngineerAnimator } from './player/animator';
import { loadWorkerCharacter } from './player/glbCharacter';
import { PlayerController } from './player/controller';
import { ThirdPersonRig } from './camera/thirdPersonRig';
import { buildNocCampus } from './world/nocCampus';
import { DOMAINS } from './content/meta';
import { DebugHud } from './ui/debugHud';
import { InteractionSystem, promptText } from './interact/interactionSystem';
import { CarrySystem } from './interact/carry';
import { GrabControl } from './interact/grab';
import { AlarmSystem } from './fx/alarm';
import { UiShell, esc } from './ui/uiShell';
import { Journal } from './ui/journal';
import { Toaster } from './ui/toast';
import { openOptionsPanel } from './ui/optionsPanel';
import { ambience, wireAudioUnlock } from './core/sfx';
import { OPTIONS } from './core/options';
import { FlowSim } from './sim/flowSim';
import { jobBoardKiosk } from './world/kit';
import { zoneSign } from './world/decor';
import { ObjectiveBanner } from './ui/objective';
import { MISSIONS } from './missions/registry';
import { MissionManager } from './missions/manager';
import { JobBoard } from './ui/jobBoard';
import { QuizTerminal } from './ui/quizTerminal';
import { DEV_DOMAINS, readiness, recommended, isLocked, unlockedLevel } from './content/meta';
import { COURSE } from '@content';
import { DEV_COURSE } from './content/devCourse';

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

  const yard = buildNocCampus(scene, () => {
    const r = readiness(COURSE.topics);
    const rec = recommended(COURSE.topics);
    return {
      overall: r.overall,
      attempted: r.attempted,
      total: r.total,
      domains: DOMAINS.map((d) => ({
        label: d.label,
        accent: d.accent,
        pct: r.per.find((p) => p.d.key === d.key)?.pct ?? 0,
      })),
      recommendedTitle: rec?.title ?? null,
    };
  });
  const input = new InputMap(engine, canvas);
  // rigged Quaternius Worker (CC0) with procedural box-engineer fallback
  const glbChar = await loadWorkerCharacter(scene);
  let charRoot;
  let charUpdate: (dt: number, speed: number, grounded: boolean, yawRate: number) => void;
  if (glbChar) {
    charRoot = glbChar.root;
    charUpdate = (dt, s, g, y) => glbChar.update(dt, s, g, y);
  } else {
    const parts = buildEngineer(scene);
    const animator = new EngineerAnimator(parts);
    charRoot = parts.root;
    charUpdate = (dt, s, g, y) => animator.update(dt, s, g, y);
  }
  const player = new PlayerController(scene, yard.spawn, charRoot);
  const rig = new ThirdPersonRig(scene, yard.spawn);
  buildAtmosphere(scene, sun, hemi, rig.camera);
  const hud = new DebugHud();
  const ui = new UiShell();
  const journal = new Journal();
  const interaction = new InteractionSystem();
  const carry = new CarrySystem(charRoot);
  const grab = new GrabControl();
  const alarm = new AlarmSystem();
  const toaster = new Toaster();

  // --- Phase 2 demo interactables (replaced by real machines in Phase 3) ---
  const campusGuideSpec = {
    id: 'campus-guide',
    kicker: 'NOC campus',
    title: 'Campus guide',
    bodyHtml:
      `<pre>job board ........ take a ticket — <b>start here</b>\n` +
      `dashboard wall ... exam readiness · domain progress\n` +
      `training course .. movement practice (east side)\n` +
      `loading dock ..... pushable crates · pure props\n` +
      `east gate ........ the shuttle leaves on dispatch</pre>` +
      `<div>${esc('Loop: ticket → shuttle to the broken site → probe machines → diagnose → physical fix → traffic test → quiz sign-off. Mastered topics raise the readiness score on the wall.')}</div>`,
    actions: [
      { label: 'Note it in the journal', onSelect: () => journal.add('Campus guide: job board starts missions; the wall tracks exam readiness.') },
      { label: 'Close' },
    ],
  };
  interaction.add({
    id: 'status-board',
    node: yard.statusBoard,
    prompt: 'Campus guide',
    onInteract: () => ui.open(campusGuideSpec),
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

  const allTopics = [...COURSE.topics, ...DEV_COURSE.topics];
  const manager = new MissionManager(
    { scene, sim, ui, journal, interaction, objective, carry, grab, alarm, toast: toaster },
    allTopics,
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
  const kiosk = jobBoardKiosk(scene, new Vector3(0.3, 0, 8.5), Math.PI);
  kiosk.setLamp?.('ok');
  interaction.add({
    id: 'job-board',
    node: kiosk.root,
    prompt: 'Open job board (Architect)',
    onInteract: () => board.open(),
  });

  // --- Developer badge track (DVA-C02): its own kiosk + board ---
  const devBoard = new JobBoard(ui, journal, quizTerminal, DEV_COURSE.topics,
    Object.fromEntries(DEV_COURSE.topics.map((t) => [t.id, missionHook(t.id)])),
    DEV_DOMAINS, 'NOC · developer board');
  const devKiosk = jobBoardKiosk(scene, new Vector3(4.2, 0, 8.5), Math.PI);
  devKiosk.setLamp?.('ok');
  zoneSign(scene, new Vector3(4.2, 0, 10.1), 0, 'developer badge · dva', '#e8a03c');
  zoneSign(scene, new Vector3(-1.4, 0, 10.1), 0, 'architect badge · saa', '#5fd29a');
  interaction.add({
    id: 'dev-board',
    node: devKiosk.root,
    prompt: 'Open developer board (DVA)',
    onInteract: () => devBoard.open(),
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

  // First boot only: a 20-second orientation so the campus explains itself.
  if (!localStorage.getItem('learnaws.hub-welcome')) {
    localStorage.setItem('learnaws.hub-welcome', '1');
    ui.open({
      id: 'welcome',
      kicker: 'Night shift orientation',
      title: 'Welcome to the NOC',
      bodyHtml:
        `<pre> ▸ JOB BOARD ....... glowing kiosk ahead — take a ticket,\n` +
        `                   a shuttle drops you at the broken site\n` +
        ` ▸ DASHBOARD WALL . live exam readiness + domain progress\n` +
        ` ▸ TRAINING COURSE  movement practice, east side\n` +
        ` ▸ everything else  dock · bullpen · coffee — set dressing</pre>` +
        `<div>${esc('Fix sites, pass the sign-off quiz, watch readiness climb. 48 tickets cover all four SAA exam domains.')}</div>`,
      actions: [{ label: 'Got it — to the job board' }],
    });
  }

  let skipObservableTick = false;
  let humScan = 0;
  let humDist = Infinity;
  const tick = (dt: number) => {
    input.update(dt);
    const st = input.state;
    // a panel that stole the mouse capture just closed — take it back
    if (!ui.isOpen && ui.consumeRelock()) input.relockPointer();
    if (ui.isOpen) {
      // Panel mode: player frozen, world keeps simulating, UI consumes navigation.
      ui.handleNav(st);
      charUpdate(dt, 0, true, 0);
      ui.setPrompt(null);
    } else if (grab.active) {
      // Hands on a mechanism: move axis steers it, interact releases.
      grab.tick(dt, st);
      charUpdate(dt, 0, true, 0);
      rig.update(dt, st.look, player.position);
      ui.setPrompt(grab.active ? { text: grab.prompt, device: st.lastDevice } : null);
    } else {
      const { forward, right } = rig.basis();
      player.update(dt, st, forward, right);
      charUpdate(dt, player.planarSpeed, player.grounded, player.yawRate);
      rig.update(dt, st.look, player.position);
      interaction.update(player.position, player.facingYaw);
      if (st.interact) {
        // focused interactable wins; on empty ground, put the carried module down
        if (interaction.tryInteract()) glbChar?.playInteract?.();
        else if (carry.held) { carry.drop(player.position, player.facingYaw); glbChar?.playInteract?.(); }
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
    // ambience: room tone + hum swell near racks/dbs + stride footsteps
    humScan -= dt;
    if (humScan <= 0) {
      humScan = 0.3;
      let best = Infinity;
      for (const m of scene.meshes) {
        if (m.name !== 'rack-b' && m.name !== 'db-d' && m.name !== 'nc-vend') continue;
        const p = m.getAbsolutePosition();
        const dx = p.x - player.position.x; const dz = p.z - player.position.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < best) best = d2;
      }
      humDist = Number.isFinite(best) ? Math.sqrt(best) : Infinity;
    }
    ambience.update(dt, { grounded: player.grounded, speed: ui.isOpen ? 0 : player.planarSpeed, humDist });
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
      teleport: (x: number, y: number, z: number) => player.teleport(new Vector3(x, y, z)),
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
