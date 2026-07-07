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

/** A database as a stacked-cylinder tower with a status lamp. */
export function dbTower(scene: Scene, at: Vector3): Machine {
  const root = new TransformNode('db', scene);
  root.position.copyFrom(at);
  const m = solid(scene, 'db-m', '#4b3f68');
  for (let i = 0; i < 3; i++) {
    const disc = MeshBuilder.CreateCylinder('db-d', { diameter: 1.0, height: 0.42, tessellation: 18 }, scene);
    disc.parent = root; disc.position.y = 0.25 + i * 0.5; disc.material = m;
    if (i === 0) new PhysicsAggregate(disc, PhysicsShapeType.CYLINDER, { mass: 0 }, scene);
  }
  const setLamp = lamp(scene, root, new Vector3(0, 1.75, 0));
  return { root, anchor: at.add(new Vector3(0, 1.0, 0)), setLamp };
}

/** The chaos-drill lever: pull it to fail an Availability Zone. */
export function chaosLever(scene: Scene, at: Vector3, yaw = 0): Machine & { setPulled: (p: boolean) => void } {
  const root = new TransformNode('chaos', scene);
  root.position.copyFrom(at); root.rotation.y = yaw;
  const base = MeshBuilder.CreateBox('ch-base', { width: 0.6, height: 0.5, depth: 0.45 }, scene);
  base.parent = root; base.position.y = 0.25; base.material = solid(scene, 'ch-b', '#5a2330');
  new PhysicsAggregate(base, PhysicsShapeType.BOX, { mass: 0 }, scene);
  const arm = MeshBuilder.CreateBox('ch-arm', { width: 0.08, height: 0.7, depth: 0.08 }, scene);
  arm.parent = root; arm.position.y = 0.75; arm.rotation.x = -0.55;
  arm.material = solid(scene, 'ch-a', '#c8cdd8');
  const knob = MeshBuilder.CreateSphere('ch-k', { diameter: 0.18, segments: 8 }, scene);
  knob.parent = arm; knob.position.y = 0.35; knob.material = glow(scene, 'ch-k', '#e85f5f');
  const setLamp = lamp(scene, root, new Vector3(0.36, 0.62, 0));
  return {
    root, anchor: at.add(new Vector3(0, 0.8, 0)), setLamp,
    setPulled: (p) => { arm.rotation.x = p ? 0.55 : -0.55; },
  };
}

/** An Availability-Zone floor plate; recolors when the AZ is failed. */
export function azPlate(scene: Scene, at: Vector3, w: number, d: number, label: 'A' | 'B'): { root: TransformNode; setState: (s: 'ok' | 'dead') => void } {
  const root = new TransformNode('az' + label, scene);
  root.position.copyFrom(at);
  const m = new StandardMaterial('az-m' + label, scene);
  const OK = label === 'A' ? '#27405c' : '#2b4c3a';
  m.diffuseColor = Color3.FromHexString(OK);
  m.specularColor = Color3.Black();
  m.alpha = 0.85;
  const plate = MeshBuilder.CreateBox('az-p', { width: w, height: 0.06, depth: d }, scene);
  plate.parent = root; plate.position.y = 0.03; plate.material = m;
  return { root, setState: (s) => m.diffuseColor.copyFrom(Color3.FromHexString(s === 'ok' ? OK : '#5c2727')) };
}

/** Where the users come from: a warm arch spilling request-bots. */
export function crowdGate(scene: Scene, at: Vector3, yaw = 0): Machine {
  const root = new TransformNode('crowd', scene);
  root.position.copyFrom(at); root.rotation.y = yaw;
  const frame = solid(scene, 'cg-f', '#565d6e');
  for (const dx of [-0.7, 0.7]) {
    const col = MeshBuilder.CreateBox('cg-c', { width: 0.16, height: 1.9, depth: 0.16 }, scene);
    col.parent = root; col.position.set(dx, 0.95, 0); col.material = frame;
    new PhysicsAggregate(col, PhysicsShapeType.BOX, { mass: 0 }, scene);
  }
  const lintel = MeshBuilder.CreateBox('cg-l', { width: 1.7, height: 0.16, depth: 0.16 }, scene);
  lintel.parent = root; lintel.position.y = 1.95; lintel.material = glow(scene, 'cg-g', '#e8c257');
  const setLamp = lamp(scene, root, new Vector3(0, 2.14, 0));
  return { root, anchor: at.add(new Vector3(0, 1.1, 0)), setLamp };
}

/** A physical conveyor belt (axis +X, no yaw): parcels ride it as real Havok bodies.
 *  Returns the spawn point, the belt AABB for the drive force, and the end X. */
export function conveyor(scene: Scene, start: Vector3, length: number): Machine & {
  spawnPoint: Vector3;
  belt: { minX: number; maxX: number; z: number; halfZ: number; topY: number };
} {
  const root = new TransformNode('conveyor', scene);
  root.position.copyFrom(start);
  const frame = solid(scene, 'cv-f', '#565d6e');
  const beltM = solid(scene, 'cv-b', '#2b3040');
  const railM = solid(scene, 'cv-r', '#3d4456');

  const topY = 0.55;
  const belt = MeshBuilder.CreateBox('cv-belt', { width: length, height: 0.12, depth: 1.15 }, scene);
  belt.parent = root; belt.position.set(length / 2, topY - 0.06, 0); belt.material = beltM;
  new PhysicsAggregate(belt, PhysicsShapeType.BOX, { mass: 0, friction: 0.05 }, scene);
  for (const dz of [-0.66, 0.66]) {
    const rail = MeshBuilder.CreateBox('cv-rail', { width: length, height: 0.3, depth: 0.08 }, scene);
    rail.parent = root; rail.position.set(length / 2, topY + 0.12, dz); rail.material = railM;
    new PhysicsAggregate(rail, PhysicsShapeType.BOX, { mass: 0 }, scene);
  }
  // end stop: parcels queue against it
  const stop = MeshBuilder.CreateBox('cv-stop', { width: 0.08, height: 0.34, depth: 1.15 }, scene);
  stop.parent = root; stop.position.set(length + 0.06, topY + 0.14, 0); stop.material = railM;
  new PhysicsAggregate(stop, PhysicsShapeType.BOX, { mass: 0 }, scene);
  for (let x = 0.4; x < length; x += 2.6) {
    const leg = MeshBuilder.CreateBox('cv-leg', { width: 0.14, height: topY - 0.12, depth: 0.9 }, scene);
    leg.parent = root; leg.position.set(x, (topY - 0.12) / 2, 0); leg.material = frame;
  }
  return {
    root,
    anchor: start.add(new Vector3(length / 2, 1.0, 0)),
    spawnPoint: start.add(new Vector3(0.35, topY + 0.65, 0)),
    belt: { minX: start.x - 0.3, maxX: start.x + length + 0.3, z: start.z, halfZ: 0.75, topY: start.y + topY },
  };
}

/** A badge-controlled door: frame + sliding panel + lamp. The mission slides the
 *  panel (openness 0..1) when a credential is accepted; denied tokens bounce. */
export function badgeDoor(scene: Scene, at: Vector3, yaw: number, accentHex: string): Machine & {
  setOpenness: (k: number) => void;
} {
  const root = new TransformNode('badgeDoor', scene);
  root.position.copyFrom(at); root.rotation.y = yaw;
  const frame = solid(scene, 'bd-f', '#565d6e');
  for (const dx of [-0.75, 0.75]) {
    const col = MeshBuilder.CreateBox('bd-c', { width: 0.2, height: 2.0, depth: 0.24 }, scene);
    col.parent = root; col.position.set(dx, 1.0, 0); col.material = frame;
    new PhysicsAggregate(col, PhysicsShapeType.BOX, { mass: 0 }, scene);
  }
  const lintel = MeshBuilder.CreateBox('bd-l', { width: 1.7, height: 0.2, depth: 0.24 }, scene);
  lintel.parent = root; lintel.position.y = 2.1; lintel.material = frame;
  const accent = MeshBuilder.CreateBox('bd-a', { width: 1.7, height: 0.06, depth: 0.26 }, scene);
  accent.parent = root; accent.position.y = 2.24; accent.material = glow(scene, 'bd-g', accentHex);
  const panel = MeshBuilder.CreateBox('bd-p', { width: 1.3, height: 1.9, depth: 0.08 }, scene);
  panel.parent = root; panel.position.y = 0.95; panel.material = solid(scene, 'bd-pm', '#2b3040');
  const setLamp = lamp(scene, root, new Vector3(0.9, 1.55, 0));
  return {
    root,
    anchor: at.add(new Vector3(0, 1.1, 0)),
    setLamp,
    setOpenness: (k) => { panel.position.y = 0.95 + k * 1.75; }, // slides up into the lintel
  };
}

/** The dead-letter bin: an open-top container poison parcels get tossed into. */
export function dlqBin(scene: Scene, at: Vector3): Machine {
  const root = new TransformNode('dlq', scene);
  root.position.copyFrom(at);
  const m = solid(scene, 'dlq-m', '#6e3b3b');
  const mkWall = (w: number, d: number, x: number, z: number) => {
    const wall = MeshBuilder.CreateBox('dlq-w', { width: w, height: 0.8, depth: d }, scene);
    wall.parent = root; wall.position.set(x, 0.4, z); wall.material = m;
    new PhysicsAggregate(wall, PhysicsShapeType.BOX, { mass: 0 }, scene);
  };
  const floor = MeshBuilder.CreateBox('dlq-f', { width: 1.3, height: 0.08, depth: 1.3 }, scene);
  floor.parent = root; floor.position.y = 0.04; floor.material = m;
  new PhysicsAggregate(floor, PhysicsShapeType.BOX, { mass: 0 }, scene);
  mkWall(1.3, 0.08, 0, -0.65); mkWall(1.3, 0.08, 0, 0.65);
  mkWall(0.08, 1.3, -0.65, 0); mkWall(0.08, 1.3, 0.65, 0);
  const setLamp = lamp(scene, root, new Vector3(0, 1.05, 0.65));
  return { root, anchor: at.add(new Vector3(0, 0.8, 0)), setLamp };
}

/** The NOC job-board kiosk: a wide bright board where tickets are taken. */
export function jobBoardKiosk(scene: Scene, at: Vector3, yaw = 0): Machine {
  const root = new TransformNode('jobBoard', scene);
  root.position.copyFrom(at); root.rotation.y = yaw;
  const legs = solid(scene, 'jb-legs', '#565d6e');
  for (const dx of [-0.8, 0.8]) {
    const leg = MeshBuilder.CreateBox('jb-leg', { width: 0.14, height: 1.35, depth: 0.14 }, scene);
    leg.parent = root; leg.position.set(dx, 0.675, 0); leg.material = legs;
    new PhysicsAggregate(leg, PhysicsShapeType.BOX, { mass: 0 }, scene);
  }
  const panel = MeshBuilder.CreateBox('jb-panel', { width: 2.1, height: 1.15, depth: 0.08 }, scene);
  panel.parent = root; panel.position.y = 1.75; panel.material = glow(scene, 'jb-g', '#1d4030');
  const header = MeshBuilder.CreateBox('jb-head', { width: 2.1, height: 0.16, depth: 0.09 }, scene);
  header.parent = root; header.position.y = 2.42; header.material = glow(scene, 'jb-h', '#5fd29a');
  const setLamp = lamp(scene, root, new Vector3(1.15, 2.42, 0));
  return { root, anchor: at.add(new Vector3(0, 1.5, 0)), setLamp };
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
