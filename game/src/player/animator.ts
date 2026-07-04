import { Scalar } from '@babylonjs/core';
import type { EngineerParts } from './engineerMesh';

const SPRINT_SPEED = 5.5; // keep in sync with controller

/** Procedural animation for the little engineer: limb swing, bob, lean, air pose, idle breathing. */
export class EngineerAnimator {
  private t = 0;
  private phase = 0;
  private air = 0; // 0 grounded … 1 airborne (smoothed)

  constructor(private parts: EngineerParts) {}

  update(dt: number, planarSpeed: number, grounded: boolean, yawRate: number) {
    this.t += dt;
    const speedRatio = Math.min(1, planarSpeed / SPRINT_SPEED);
    this.phase += dt * (3.5 + planarSpeed * 2.4);
    this.air = Scalar.Lerp(this.air, grounded ? 0 : 1, Math.min(1, 10 * dt));

    const p = this.parts;
    const swing = Math.sin(this.phase) * speedRatio * 0.75;

    // limbs: opposite-phase swing on the ground, tucked/raised pose in the air
    const airArm = -1.9; const airLeg = 0.5;
    p.armL.rotation.x = Scalar.Lerp(swing, airArm, this.air);
    p.armR.rotation.x = Scalar.Lerp(-swing, airArm, this.air);
    p.legL.rotation.x = Scalar.Lerp(-swing * 0.9, airLeg, this.air);
    p.legR.rotation.x = Scalar.Lerp(swing * 0.9, -airLeg * 0.4, this.air);

    // body: run bob + forward lean + turn roll; gentle breathing at rest
    const bob = Math.abs(Math.sin(this.phase)) * 0.035 * speedRatio;
    const breathe = speedRatio < 0.05 ? Math.sin(this.t * 2.1) * 0.006 : 0;
    p.body.position.y = bob + breathe + this.air * 0.02;
    p.body.rotation.x = 0.10 * speedRatio * (1 - this.air);
    p.body.rotation.z = Scalar.Clamp(-yawRate * 0.045, -0.18, 0.18) * speedRatio;
  }
}
