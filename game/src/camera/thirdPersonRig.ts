import { ArcRotateCamera, PhysicsRaycastResult, Scalar, Scene, Vector3 } from '@babylonjs/core';

const HEAD_HEIGHT = 1.05;
const DESIRED_RADIUS = 5;
const MIN_RADIUS = 1.0;
const BETA_MIN = 0.4;
const BETA_MAX = 1.5;
const FOLLOW_RATE = 14; //  target smoothing (1/s)
const SHRINK_RATE = 22; // occlusion pull-in speed
const GROW_RATE = 4; //    recovery speed

/** Third-person orbit rig: we drive an ArcRotateCamera's alpha/beta/radius manually
 *  from InputState.look, with a physics raycast pulling the camera in front of walls. */
export class ThirdPersonRig {
  readonly camera: ArcRotateCamera;
  private scene: Scene;
  private focus = new Vector3(0, HEAD_HEIGHT, 0);
  private radius = DESIRED_RADIUS;
  private ray = new PhysicsRaycastResult();

  constructor(scene: Scene, spawn: Vector3) {
    this.scene = scene;
    this.focus = spawn.add(new Vector3(0, HEAD_HEIGHT, 0));
    // alpha −π/2 puts the camera behind a +Z-facing character.
    this.camera = new ArcRotateCamera('cam3p', -Math.PI / 2, 1.12, DESIRED_RADIUS, this.focus.clone(), scene);
    this.camera.inputs.clear(); // all control comes from InputMap
    this.camera.minZ = 0.05;
  }

  /** Horizontal camera basis for camera-relative movement. */
  basis(): { forward: Vector3; right: Vector3 } {
    const forward = this.camera.target.subtract(this.camera.position);
    forward.y = 0;
    if (forward.lengthSquared() < 1e-6) forward.set(0, 0, 1);
    forward.normalize();
    const right = Vector3.Cross(Vector3.Up(), forward).normalize();
    return { forward, right };
  }

  update(dt: number, look: { x: number; y: number }, playerFeet: Vector3) {
    // Follow the player's head with a soft lag.
    const want = playerFeet.add(new Vector3(0, HEAD_HEIGHT, 0));
    Vector3.LerpToRef(this.focus, want, Math.min(1, FOLLOW_RATE * dt), this.focus);

    // Orbit.
    this.camera.alpha -= look.x;
    this.camera.beta = Scalar.Clamp(this.camera.beta - look.y, BETA_MIN, BETA_MAX);

    // Occlusion: cast from just outside the player toward the desired camera spot.
    const a = this.camera.alpha; const b = this.camera.beta;
    const dir = new Vector3(Math.cos(a) * Math.sin(b), Math.cos(b), Math.sin(a) * Math.sin(b));
    let targetRadius = DESIRED_RADIUS;
    const pe = this.scene.getPhysicsEngine() as unknown as {
      raycastToRef?: (f: Vector3, t: Vector3, r: PhysicsRaycastResult) => void;
    } | null;
    if (pe && pe.raycastToRef) {
      const from = this.focus.add(dir.scale(0.45));
      const to = this.focus.add(dir.scale(DESIRED_RADIUS));
      pe.raycastToRef(from, to, this.ray);
      if (this.ray.hasHit) targetRadius = Math.max(MIN_RADIUS, 0.45 + this.ray.hitDistance - 0.25);
    }
    const rate = targetRadius < this.radius ? SHRINK_RATE : GROW_RATE;
    this.radius = Scalar.Lerp(this.radius, targetRadius, Math.min(1, rate * dt));

    this.camera.target.copyFrom(this.focus);
    this.camera.radius = this.radius;
  }
}
