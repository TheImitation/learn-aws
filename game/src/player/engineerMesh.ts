import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode } from '@babylonjs/core';

export interface EngineerParts {
  root: TransformNode; //  feet origin, front = +Z
  body: TransformNode; //  torso group (bob/lean)
  armL: TransformNode; //  shoulder pivots (swing)
  armR: TransformNode;
  legL: TransformNode; //  hip pivots (swing)
  legR: TransformNode;
}

const mat = (scene: Scene, name: string, hex: string) => {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.FromHexString(hex);
  m.specularColor = new Color3(0.06, 0.06, 0.06);
  return m;
};

/** A little hard-hat engineer built from primitives (procedural stand-in for the glb;
 *  same low-poly art style as v1's props). ~1.16 m tall, feet at origin, faces +Z. */
export function buildEngineer(scene: Scene): EngineerParts {
  const root = new TransformNode('engineer', scene);
  const body = new TransformNode('eng-body', scene);
  body.parent = root;

  const skin = mat(scene, 'eng-skin', '#e0b08c');
  const vest = mat(scene, 'eng-vest', '#e8801f');
  const stripe = mat(scene, 'eng-stripe', '#f5f2a3');
  const navy = mat(scene, 'eng-navy', '#2e3a56');
  const hatY = mat(scene, 'eng-hat', '#f2c531');
  const bagB = mat(scene, 'eng-bag', '#7a5a3a');

  const add = (m: Mesh, parent: TransformNode, material: StandardMaterial) => {
    m.parent = parent;
    m.material = material;
    return m;
  };

  // torso + hi-viz stripe
  const torso = add(MeshBuilder.CreateBox('t', { width: 0.34, height: 0.44, depth: 0.2 }, scene), body, vest);
  torso.position.y = 0.64;
  const band = add(MeshBuilder.CreateBox('tb', { width: 0.345, height: 0.07, depth: 0.205 }, scene), body, stripe);
  band.position.y = 0.68;
  // head + hard hat
  const head = add(MeshBuilder.CreateSphere('h', { diameter: 0.24, segments: 12 }, scene), body, skin);
  head.position.y = 0.98;
  const hat = add(MeshBuilder.CreateCylinder('hat', { diameter: 0.26, height: 0.12, tessellation: 14 }, scene), body, hatY);
  hat.position.y = 1.1;
  const brim = add(MeshBuilder.CreateCylinder('brim', { diameter: 0.36, height: 0.025, tessellation: 14 }, scene), body, hatY);
  brim.position.y = 1.05;
  // headlamp on the hat + goggles band — this engineer works nights
  const lampGlow = new StandardMaterial('eng-lamp', scene);
  lampGlow.emissiveColor = Color3.FromHexString('#f2e3b3');
  lampGlow.diffuseColor = Color3.Black();
  const lampBody = add(MeshBuilder.CreateBox('hl', { width: 0.08, height: 0.05, depth: 0.04 }, scene), body, navy);
  lampBody.position.set(0, 1.11, 0.13);
  const lampLens = add(MeshBuilder.CreateBox('hl-l', { width: 0.06, height: 0.035, depth: 0.012 }, scene), body, lampGlow as StandardMaterial);
  lampLens.position.set(0, 1.11, 0.152);
  const goggles = add(MeshBuilder.CreateBox('gg', { width: 0.235, height: 0.045, depth: 0.05 }, scene), body, navy);
  goggles.position.set(0, 1.0, 0.09);
  // tool bag + straps + a stub antenna (the pager never sleeps)
  const bag = add(MeshBuilder.CreateBox('bag', { width: 0.24, height: 0.26, depth: 0.1 }, scene), body, bagB);
  bag.position.set(0, 0.66, -0.16);
  for (const sx of [-0.09, 0.09]) {
    const strap = add(MeshBuilder.CreateBox('strap', { width: 0.05, height: 0.4, depth: 0.22 }, scene), body, bagB);
    strap.position.set(sx, 0.72, -0.045);
  }
  const antenna = add(MeshBuilder.CreateCylinder('ant', { diameter: 0.018, height: 0.34, tessellation: 6 }, scene), body, navy);
  antenna.position.set(-0.09, 0.92, -0.2);
  const antTipM = new StandardMaterial('eng-ant', scene);
  antTipM.emissiveColor = Color3.FromHexString('#5fd29a');
  antTipM.diffuseColor = Color3.Black();
  const antTip = add(MeshBuilder.CreateSphere('ant-t', { diameter: 0.035, segments: 6 }, scene), body, antTipM as StandardMaterial);
  antTip.position.set(-0.09, 1.1, -0.2);
  let tBlink = 0;
  scene.onBeforeRenderObservable.add(() => {
    tBlink += scene.getEngine().getDeltaTime() / 1000;
    const on = (tBlink % 2.2) < 0.12;
    antTipM.emissiveColor.copyFrom(Color3.FromHexString(on ? '#8affc4' : '#1d4030'));
  });

  // limbs on pivots
  const pivot = (name: string, x: number, y: number) => {
    const p = new TransformNode(name, scene);
    p.parent = body;
    p.position.set(x, y, 0);
    return p;
  };
  const armL = pivot('armL', -0.22, 0.84);
  const armR = pivot('armR', 0.22, 0.84);
  const legL = pivot('legL', -0.09, 0.42);
  const legR = pivot('legR', 0.09, 0.42);
  const limb = (parent: TransformNode, w: number, material: StandardMaterial) => {
    const l = add(MeshBuilder.CreateBox('limb', { width: w, height: 0.42, depth: w }, scene), parent as TransformNode, material);
    l.position.y = -0.19;
    return l;
  };
  limb(armL, 0.09, vest);
  limb(armR, 0.09, vest);
  limb(legL, 0.12, navy);
  limb(legR, 0.12, navy);
  // gloves + boots
  const glove = (p: TransformNode) => {
    const gm = add(MeshBuilder.CreateBox('glove', { width: 0.1, height: 0.09, depth: 0.1 }, scene), p, navy);
    gm.position.y = -0.42;
  };
  const boot = (p: TransformNode) => {
    const bm = add(MeshBuilder.CreateBox('boot', { width: 0.13, height: 0.09, depth: 0.2 }, scene), p, bagB);
    bm.position.set(0, -0.44, 0.03);
  };
  glove(armL); glove(armR); boot(legL); boot(legR);

  return { root, body, armL, armR, legL, legR };
}
