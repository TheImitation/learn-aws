import {
  Color3,
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';

export interface TestYard {
  spawn: Vector3;
  crates: Mesh[]; // dynamic bodies, exposed for verification
  statusBoard: TransformNode; // demo interactables (Phase 2)
  toolbox: TransformNode;
}

const mat = (scene: Scene, name: string, hex: string) => {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.FromHexString(hex);
  m.specularColor = new Color3(0.05, 0.05, 0.05);
  return m;
};

/** Phase 1 test yard: flat ground, ramps to a platform, stairs, pillars for camera
 *  occlusion, pushable crates, slalom cones. Everything gets a Havok body. */
export function buildTestYard(scene: Scene): TestYard {
  const floor = mat(scene, 'y-floor', '#2a2e3a');
  const concrete = mat(scene, 'y-conc', '#565d6e');
  const accent = mat(scene, 'y-accent', '#cf3a33');
  const wood = mat(scene, 'y-wood', '#b8863f');
  const cone = mat(scene, 'y-cone', '#e8801f');

  const fix = (m: Mesh, material: StandardMaterial) => {
    m.material = material;
    new PhysicsAggregate(m, PhysicsShapeType.BOX, { mass: 0 }, scene);
    return m;
  };

  // ground + low perimeter walls
  const ground = MeshBuilder.CreateBox('ground', { width: 60, height: 1, depth: 60 }, scene);
  ground.position.y = -0.5;
  fix(ground, floor);
  for (const [x, z, w, d] of [[0, 30.3, 61, 0.6], [0, -30.3, 61, 0.6], [30.3, 0, 0.6, 61], [-30.3, 0, 0.6, 61]] as const) {
    const wall = MeshBuilder.CreateBox('wall', { width: w, height: 1.2, depth: d }, scene);
    wall.position.set(x, 0.6, z);
    fix(wall, concrete);
  }

  // pillars (camera occlusion test)
  for (const [x, z] of [[-6, 6], [6, 6], [-6, -6], [6, -6]] as const) {
    const p = MeshBuilder.CreateBox('pillar', { width: 1, height: 4.2, depth: 1 }, scene);
    p.position.set(x, 2.1, z);
    fix(p, concrete);
  }

  // ramp up to a platform (slope walking + jump-off ledge)
  const ramp = MeshBuilder.CreateBox('ramp', { width: 3.4, height: 0.3, depth: 6.4 }, scene);
  ramp.position.set(10, 0.75, -3.0);
  ramp.rotation.x = -0.26; // ~15°
  fix(ramp, concrete);
  const platform = MeshBuilder.CreateBox('platform', { width: 6, height: 0.4, depth: 6 }, scene);
  platform.position.set(10, 1.55, 3.2);
  fix(platform, accent);

  // stairs (step handling)
  for (let i = 0; i < 7; i++) {
    const step = MeshBuilder.CreateBox('step', { width: 3, height: 0.18, depth: 0.42 }, scene);
    step.position.set(-10, 0.09 + i * 0.18, 2 + i * 0.42);
    fix(step, concrete);
  }
  const landing = MeshBuilder.CreateBox('landing', { width: 3, height: 0.24, depth: 2.4 }, scene);
  landing.position.set(-10, 1.2, 6.1);
  fix(landing, accent);

  // pushable crates: a pyramid + loose ones near spawn
  const crates: Mesh[] = [];
  const crate = (x: number, y: number, z: number, size = 0.8, massKg = 5) => {
    const c = MeshBuilder.CreateBox('crate', { size }, scene);
    c.position.set(x, y, z);
    c.material = wood;
    new PhysicsAggregate(c, PhysicsShapeType.BOX, { mass: massKg, friction: 0.6, restitution: 0.1 }, scene);
    crates.push(c);
    return c;
  };
  // pyramid at the north side
  crate(-0.9, 0.4, 9); crate(0, 0.4, 9); crate(0.9, 0.4, 9);
  crate(-0.45, 1.2, 9); crate(0.45, 1.2, 9);
  crate(0, 2.0, 9);
  // loose crates near spawn
  crate(2.2, 0.4, -3, 0.8, 4);
  crate(-2.5, 0.4, -2, 0.8, 4);

  // slalom cones
  for (let i = 0; i < 4; i++) {
    const c = MeshBuilder.CreateCylinder('cone', { diameterTop: 0.05, diameterBottom: 0.4, height: 0.6, tessellation: 12 }, scene);
    c.position.set(-3 + i * 2, 0.3, 3.5 + (i % 2) * 1.4);
    c.material = cone;
    new PhysicsAggregate(c, PhysicsShapeType.CYLINDER, { mass: 0.8, friction: 0.5 }, scene);
  }

  // --- demo interactables: a status-board console and a toolbox ---
  const screenMat = new StandardMaterial('y-screen', scene);
  screenMat.diffuseColor = Color3.FromHexString('#0d1017');
  screenMat.emissiveColor = Color3.FromHexString('#2c6e4f');

  const statusBoard = new TransformNode('statusBoard', scene);
  statusBoard.position.set(2.5, 0, -6.5);
  const post = MeshBuilder.CreateBox('sb-post', { width: 0.12, height: 1.0, depth: 0.12 }, scene);
  post.parent = statusBoard; post.position.y = 0.5; post.material = concrete;
  const screen = MeshBuilder.CreateBox('sb-screen', { width: 0.9, height: 0.6, depth: 0.06 }, scene);
  screen.parent = statusBoard; screen.position.y = 1.25; screen.rotation.x = -0.18; screen.material = screenMat;
  new PhysicsAggregate(post, PhysicsShapeType.BOX, { mass: 0 }, scene);

  const toolbox = new TransformNode('toolbox', scene);
  toolbox.position.set(-2.5, 0, -6);
  const tbox = MeshBuilder.CreateBox('tb-box', { width: 0.55, height: 0.3, depth: 0.32 }, scene);
  tbox.parent = toolbox; tbox.position.y = 0.15; tbox.material = accent;
  const handle = MeshBuilder.CreateBox('tb-handle', { width: 0.3, height: 0.05, depth: 0.06 }, scene);
  handle.parent = toolbox; handle.position.y = 0.33; handle.material = concrete;
  new PhysicsAggregate(tbox, PhysicsShapeType.BOX, { mass: 0 }, scene);

  return { spawn: new Vector3(0, 0.2, 6), crates, statusBoard, toolbox }; // spawn faces the mission corner
}
