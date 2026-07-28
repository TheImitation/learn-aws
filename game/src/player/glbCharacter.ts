import {
  AnimationGroup,
  Color3,
  PBRMaterial,
  Scene,
  SceneLoader,
  StandardMaterial,
  TransformNode,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

/** The rigged engineer: Quaternius "Worker" (Ultimate Modular Men Pack, CC0,
 *  via poly.pizza) — hard hat + hi-viz vest, 24 animations. Loaded from
 *  /assets/engineer.glb; on any failure the caller falls back to the
 *  procedural box engineer, so the game never depends on the asset. */

export interface CharacterRig {
  root: TransformNode; //  feet origin, front = +Z (PlayerController contract)
  update(dt: number, speed: number, grounded: boolean, yawRate: number): void;
}

const HEIGHT = 1.3; //      metres — matched to the capsule (h≈1.2 + hover)
const WALK_TOP = 3.1; //    m/s where walk hands over to run (walk speed = 3)
const RUN_SPAN = 1.9; //    m/s of blend room up to sprint speed

export async function loadWorkerCharacter(scene: Scene): Promise<CharacterRig | null> {
  try {
    const result = await SceneLoader.ImportMeshAsync('', '/assets/', 'engineer.glb', scene);
    const glbRoot = result.meshes[0];
    const root = new TransformNode('engineer', scene);

    // Flatten glTF PBR to the game's flat-shaded standard look.
    for (const m of result.meshes) {
      m.isPickable = false;
      const mat = m.material;
      if (mat instanceof PBRMaterial) {
        const std = new StandardMaterial('eng-' + mat.name, scene);
        std.diffuseColor = mat.albedoColor?.clone() ?? Color3.White();
        std.specularColor = new Color3(0.04, 0.04, 0.04);
        m.material = std;
      }
    }

    // Scale to game height with feet at the root origin.
    const { min, max } = glbRoot.getHierarchyBoundingVectors(true);
    const h = Math.max(0.01, max.y - min.y);
    const k = HEIGHT / h;
    glbRoot.scaling.scaleInPlace(k);
    glbRoot.position.y = -min.y * k;
    glbRoot.parent = root;

    // Locomotion set: everything else stays parked (Interact/Wave for later).
    for (const g of result.animationGroups) g.stop();
    const find = (n: string): AnimationGroup | null =>
      result.animationGroups.find((g) => g.name.endsWith('|' + n)) ?? null;
    const idle = find('Idle') ?? find('Idle_Neutral');
    const walk = find('Walk');
    const run = find('Run');
    if (!idle || !walk || !run) throw new Error('locomotion animations missing');
    for (const g of [idle, walk, run]) {
      g.start(true, 1, g.from, g.to, false);
      g.setWeightForAllAnimatables(0);
    }
    idle.setWeightForAllAnimatables(1);

    let wIdle = 1;
    let wWalk = 0;
    let wRun = 0;
    return {
      root,
      update(dt, speed, grounded) {
        let tIdle = 0;
        let tWalk = 0;
        let tRun = 0;
        if (speed < 0.25) tIdle = 1;
        else {
          tRun = Math.min(1, Math.max(0, (speed - WALK_TOP) / RUN_SPAN));
          tWalk = 1 - tRun;
        }
        if (!grounded) { // brief airtime: soft mid-stride, no flailing
          tIdle = 0; tWalk = 0.9; tRun = 0.1;
        }
        const s = Math.min(1, dt * 9);
        wIdle += (tIdle - wIdle) * s;
        wWalk += (tWalk - wWalk) * s;
        wRun += (tRun - wRun) * s;
        idle.setWeightForAllAnimatables(wIdle);
        walk.setWeightForAllAnimatables(wWalk);
        run.setWeightForAllAnimatables(wRun);
        // foot-sync-ish: pace the cycles with actual ground speed
        walk.speedRatio = grounded ? Math.max(0.5, speed / 3) : 0.55;
        run.speedRatio = Math.max(0.7, speed / 5.2);
      },
    };
  } catch (e) {
    console.warn('engineer.glb unavailable — using the procedural engineer', e);
    return null;
  }
}
