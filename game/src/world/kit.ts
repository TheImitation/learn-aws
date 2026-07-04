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

/** Diegetic machine factories — the "cloud campus" prop vocabulary. Each returns its
 *  root, a token anchor (where FlowSim tokens dock), and optional lamp/update hooks. */

export interface Machine {
  root: TransformNode;
  anchor: Vector3;
  setLamp?: (state: 'ok' | 'bad' | 'off') => void;
  update?: (dt: number) => void;
}

const solid = (scene: Scene, name: string, hex: string) => {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.FromHexString(hex);
  m.specularColor = new Color3(0.05, 0.05, 0.05);
  return m;
};
const glow = (scene: Scene, name: string, hex: string) => {
  const m = new StandardMaterial(name, scene);
  m.emissiveColor = Color3.FromHexString(hex);
  m.diffuseColor = Color3.Black();
  m.specularColor = Color3.Black();
  return m;
};

const LAMP_COLORS = { ok: '#5fd29a', bad: '#e85f5f', off: '#3a3f4c' };

function lamp(scene: Scene, parent: TransformNode, pos: Vector3): (state: 'ok' | 'bad' | 'off') => void {
  const m = new StandardMaterial('lamp' + Math.random(), scene);
  m.emissiveColor = Color3.FromHexString(LAMP_COLORS.off);
  m.diffuseColor = Color3.Black();
  const s = MeshBuilder.CreateSphere('lamp', { diameter: 0.16, segments: 8 }, scene);
  s.parent = parent; s.position.copyFrom(pos); s.material = m;
  return (state) => m.emissiveColor.copyFrom(Color3.FromHexString(LAMP_COLORS[state]));
}

/** A humming server rack: dark tower, LED strips (two flicker), status lamp on top. */
export function serverRack(scene: Scene, at: Vector3, yaw = 0): Machine {
  const root = new TransformNode('rack', scene);
  root.position.copyFrom(at); root.rotation.y = yaw;
  const body = MeshBuilder.CreateBox('rack-b', { width: 0.9, height: 1.9, depth: 0.7 }, scene);
  body.parent = root; body.position.y = 0.95; body.material = solid(scene, 'rack-m', '#232733');
  new PhysicsAggregate(body, PhysicsShapeType.BOX, { mass: 0 }, scene);
  const ledMats: StandardMaterial[] = [];
  for (let i = 0; i < 4; i++) {
    const led = MeshBuilder.CreateBox('led', { width: 0.62, height: 0.05, depth: 0.02 }, scene);
    led.parent = root; led.position.set(0, 0.5 + i * 0.36, 0.36);
    const lm = glow(scene, 'led-m', i % 2 ? '#57c7e3' : '#2c6e4f');
    led.material = lm; ledMats.push(lm);
  }
  const setLamp = lamp(scene, root, new Vector3(0, 2.02, 0));
  let t = Math.random() * 10;
  return {
    root, anchor: at.add(new Vector3(0, 1.0, 0)), setLamp,
    update: (dt) => { t += dt; ledMats[0].emissiveColor.g = 0.55 + Math.sin(t * 9) * 0.25; ledMats[2].emissiveColor.b = 0.6 + Math.sin(t * 13 + 1) * 0.3; },
  };
}

/** The route-table board: a wide panel of route-card slots; a dark slot = missing route. */
export function routeBoard(scene: Scene, at: Vector3, yaw = 0, slots = 3): Machine & { setSlot: (i: number, on: boolean) => void } {
  const root = new TransformNode('routeBoard', scene);
  root.position.copyFrom(at); root.rotation.y = yaw;
  const post = MeshBuilder.CreateBox('rb-post', { width: 0.14, height: 1.1, depth: 0.14 }, scene);
  post.parent = root; post.position.y = 0.55; post.material = solid(scene, 'rb-pm', '#565d6e');
  new PhysicsAggregate(post, PhysicsShapeType.BOX, { mass: 0 }, scene);
  const panel = MeshBuilder.CreateBox('rb-panel', { width: 1.7, height: 0.95, depth: 0.07 }, scene);
  panel.parent = root; panel.position.y = 1.6; panel.material = solid(scene, 'rb-mm', '#12151d');
  const slotMats: StandardMaterial[] = [];
  for (let i = 0; i < slots; i++) {
    const s = MeshBuilder.CreateBox('rb-slot', { width: 1.4, height: 0.18, depth: 0.02 }, scene);
    s.parent = root; s.position.set(0, 1.88 - i * 0.28, 0.05);
    const sm = glow(scene, 'rb-sm', '#2c6e4f');
    s.material = sm; slotMats.push(sm);
  }
  const setLamp = lamp(scene, root, new Vector3(0.72, 2.16, 0));
  return {
    root, anchor: at.add(new Vector3(0, 1.0, 0)), setLamp,
    setSlot: (i, on) => slotMats[i]?.emissiveColor.copyFrom(Color3.FromHexString(on ? '#2c6e4f' : '#20242e')),
  };
}

/** The NAT gateway as a one-way airlock: two portal frames with an amber core. */
export function natAirlock(scene: Scene, at: Vector3, yaw = 0): Machine {
  const root = new TransformNode('nat', scene);
  root.position.copyFrom(at); root.rotation.y = yaw;
  const frameMat = solid(scene, 'nat-f', '#565d6e');
  for (const dz of [-0.55, 0.55]) {
    for (const dx of [-0.65, 0.65]) {
      const col = MeshBuilder.CreateBox('nat-c', { width: 0.18, height: 1.7, depth: 0.18 }, scene);
      col.parent = root; col.position.set(dx, 0.85, dz); col.material = frameMat;
      new PhysicsAggregate(col, PhysicsShapeType.BOX, { mass: 0 }, scene);
    }
    const lintel = MeshBuilder.CreateBox('nat-l', { width: 1.5, height: 0.18, depth: 0.18 }, scene);
    lintel.parent = root; lintel.position.set(0, 1.78, dz); lintel.material = frameMat;
  }
  const core = MeshBuilder.CreateBox('nat-core', { width: 1.1, height: 0.08, depth: 0.9 }, scene);
  core.parent = root; core.position.y = 0.04; core.material = glow(scene, 'nat-g', '#e8a657');
  const setLamp = lamp(scene, root, new Vector3(0, 1.95, 0));
  return { root, anchor: at.add(new Vector3(0, 1.0, 0)), setLamp };
}

/** "To the internet": a cyan ring gate on a post. */
export function internetGate(scene: Scene, at: Vector3, yaw = 0): Machine {
  const root = new TransformNode('igw', scene);
  root.position.copyFrom(at); root.rotation.y = yaw;
  const post = MeshBuilder.CreateBox('igw-post', { width: 0.16, height: 0.9, depth: 0.16 }, scene);
  post.parent = root; post.position.y = 0.45; post.material = solid(scene, 'igw-pm', '#565d6e');
  new PhysicsAggregate(post, PhysicsShapeType.BOX, { mass: 0 }, scene);
  const ring = MeshBuilder.CreateTorus('igw-ring', { diameter: 1.15, thickness: 0.09, tessellation: 22 }, scene);
  ring.parent = root; ring.position.y = 1.45; ring.rotation.z = Math.PI / 2; ring.material = glow(scene, 'igw-g', '#57c7e3');
  let t = 0;
  return {
    root, anchor: at.add(new Vector3(0, 1.3, 0)),
    update: (dt) => { t += dt; ring.rotation.y = t * 0.8; },
  };
}

/** An ALB as a routing arm: pedestal + slowly sweeping arm (decorative until missions drive it). */
export function routerArm(scene: Scene, at: Vector3): Machine {
  const root = new TransformNode('alb', scene);
  root.position.copyFrom(at);
  const ped = MeshBuilder.CreateCylinder('alb-p', { diameter: 0.5, height: 1.1, tessellation: 14 }, scene);
  ped.parent = root; ped.position.y = 0.55; ped.material = solid(scene, 'alb-pm', '#3a4256');
  new PhysicsAggregate(ped, PhysicsShapeType.CYLINDER, { mass: 0 }, scene);
  const arm = MeshBuilder.CreateBox('alb-a', { width: 1.5, height: 0.1, depth: 0.2 }, scene);
  arm.parent = root; arm.position.y = 1.18; arm.material = glow(scene, 'alb-g', '#8f7ae6');
  let t = 0;
  return {
    root, anchor: at.add(new Vector3(0, 1.2, 0)),
    update: (dt) => { t += dt; arm.rotation.y = Math.sin(t * 0.9) * 0.9; },
  };
}

/** A big status board with a lamp — the traffic-test console. */
export function statusConsole(scene: Scene, at: Vector3, yaw = 0): Machine {
  const root = new TransformNode('statusConsole', scene);
  root.position.copyFrom(at); root.rotation.y = yaw;
  const post = MeshBuilder.CreateBox('sc-post', { width: 0.14, height: 1.0, depth: 0.14 }, scene);
  post.parent = root; post.position.y = 0.5; post.material = solid(scene, 'sc-pm', '#565d6e');
  new PhysicsAggregate(post, PhysicsShapeType.BOX, { mass: 0 }, scene);
  const screen = MeshBuilder.CreateBox('sc-screen', { width: 1.2, height: 0.75, depth: 0.07 }, scene);
  screen.parent = root; screen.position.y = 1.35; screen.rotation.x = -0.15;
  screen.material = glow(scene, 'sc-g', '#173226');
  const setLamp = lamp(scene, root, new Vector3(0.5, 1.85, 0));
  return { root, anchor: at.add(new Vector3(0, 1.2, 0)), setLamp };
}
