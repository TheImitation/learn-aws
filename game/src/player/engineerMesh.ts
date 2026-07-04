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
  // tool bag
  const bag = add(MeshBuilder.CreateBox('bag', { width: 0.24, height: 0.26, depth: 0.1 }, scene), body, bagB);
  bag.position.set(0, 0.66, -0.16);

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

  return { root, body, armL, armR, legL, legR };
}
