import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { initPhysics } from './core/physicsInit';
import { COURSE } from '@content';

const canvas = document.getElementById('app') as HTMLCanvasElement;
const engine = new Engine(canvas, true, { stencil: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.055, 0.063, 0.086, 1);

// Dev orbit camera for the Phase 0 boot scene (the third-person rig arrives in Phase 1).
const camera = new ArcRotateCamera('cam', -Math.PI / 2.2, Math.PI / 3.2, 16, new Vector3(0, 1, 0), scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 4;
camera.upperRadiusLimit = 40;

const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
hemi.intensity = 0.55;
hemi.groundColor = new Color3(0.18, 0.16, 0.14);
const sun = new DirectionalLight('sun', new Vector3(-0.45, -1, -0.35), scene);
sun.intensity = 1.15;

async function boot() {
  await initPhysics(scene);

  // The yard floor.
  const ground = MeshBuilder.CreateGround('ground', { width: 40, height: 40 }, scene);
  const gmat = new StandardMaterial('gmat', scene);
  gmat.diffuseColor = new Color3(0.16, 0.18, 0.22);
  gmat.specularColor = Color3.Black();
  ground.material = gmat;
  new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene);

  // Physics smoke test: a crate dropped from 6 m must fall and settle at rest (~y = 0.5).
  const crate = MeshBuilder.CreateBox('crate', { size: 1 }, scene);
  crate.position = new Vector3(0.3, 6, 0);
  const cmat = new StandardMaterial('cmat', scene);
  cmat.diffuseColor = new Color3(0.85, 0.58, 0.24);
  crate.material = cmat;
  new PhysicsAggregate(crate, PhysicsShapeType.BOX, { mass: 1, restitution: 0.2 }, scene);

  // Dev hook — the game's equivalent of v1's window.__world.
  // simStep drives the physics world synchronously with fixed 1/60s quanta so preview
  // verification works even in a hidden (rAF/timer-throttled) tab.
  (window as unknown as Record<string, unknown>).__game = {
    engine,
    scene,
    contentTopics: COURSE.topics.length,
    cratePos: () => ({ x: crate.position.x, y: crate.position.y, z: crate.position.z }),
    fps: () => engine.getFps(),
    simStep: (seconds: number) => {
      const pe = scene.getPhysicsEngine();
      if (!pe) return;
      const n = Math.max(1, Math.round(seconds * 60));
      for (let i = 0; i < n; i++) (pe as unknown as { _step: (dt: number) => void })._step(1 / 60);
      scene.render();
    },
  };

  engine.runRenderLoop(() => scene.render());
}

boot().catch((e) => {
  console.error('boot failed', e);
});

addEventListener('resize', () => engine.resize());
