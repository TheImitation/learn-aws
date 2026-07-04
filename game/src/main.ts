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

  let skipObservableTick = false;
  const tick = (dt: number) => {
    input.update(dt);
    const { forward, right } = rig.basis();
    player.update(dt, input.state, forward, right);
    animator.update(dt, player.planarSpeed, player.grounded, player.yawRate);
    rig.update(dt, input.state.look, player.position);
    pe._step(Math.min(dt, 1 / 30));
    hud.update({
      fps: engine.getFps(),
      device: input.state.lastDevice,
      pad: input.padConnected,
      speed: player.planarSpeed,
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
  };

  engine.runRenderLoop(() => scene.render());
}

boot().catch((e) => {
  console.error('boot failed', e);
});

addEventListener('resize', () => engine.resize());
