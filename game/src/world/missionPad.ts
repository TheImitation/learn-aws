import {
  Color3,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { gridFloorMat } from './textures';

/** The standing mission site: a walled pad away from the hub where each accepted
 *  ticket builds its diorama (machines are per-mission; the pad is permanent). */
export function buildMissionPad(scene: Scene, origin: Vector3) {
  const floor = gridFloorMat(scene, 'mp-floor', 34, 30, {
    base: '#20242f', line: '#343c52', bold: '#455066', scuff: true,
  });
  const wallM = new StandardMaterial('mp-wall', scene);
  wallM.diffuseColor = Color3.FromHexString('#3d4456');
  wallM.specularColor = Color3.Black();

  const ground = MeshBuilder.CreateBox('mp-ground', { width: 34, height: 1, depth: 30 }, scene);
  ground.position.set(origin.x, -0.5, origin.z);
  ground.material = floor;
  new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene);

  for (const [dx, dz, w, d] of [[0, 15.3, 35, 0.6], [0, -15.3, 35, 0.6], [17.3, 0, 0.6, 31], [-17.3, 0, 0.6, 31]] as const) {
    const wall = MeshBuilder.CreateBox('mp-wall', { width: w, height: 1.4, depth: d }, scene);
    wall.position.set(origin.x + dx, 0.7, origin.z + dz);
    wall.material = wallM;
    new PhysicsAggregate(wall, PhysicsShapeType.BOX, { mass: 0 }, scene);
  }
}
