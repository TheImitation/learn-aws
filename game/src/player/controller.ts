import {
  CharacterSupportedState,
  PhysicsCharacterController,
  PhysicsRaycastResult,
  Scalar,
  Scene,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import type { InputState } from '../input/inputMap';

const CAPSULE_HEIGHT = 1.2;
const CAPSULE_RADIUS = 0.3;
const WALK_SPEED = 3.0;
const SPRINT_SPEED = 5.5;
const JUMP_SPEED = 5.2;
const GROUND_STICK = -0.6; // small downward bias while grounded, helps slopes/steps
const AIR_CONTROL = 3.0; //  how fast airborne horizontal velocity converges to intent (1/s)
const GRAVITY = new Vector3(0, -9.81, 0);
const DOWN = new Vector3(0, -1, 0);
const KILL_Y = -15;

/** Capsule character on Havok's PhysicsCharacterController, driving a visual root (feet origin). */
export class PlayerController {
  readonly cc: PhysicsCharacterController;
  grounded = false;
  planarSpeed = 0;
  yawRate = 0;

  private airborne = false; // explicit jump/fall state: support alone lies on the first ascent ticks
  private root: TransformNode;
  private scene!: Scene;
  private spawn: Vector3;
  private lastYaw = 0;
  private wakeTimer = 0;
  private wakeImpulse = new Vector3();
  private wakeAt = new Vector3();
  private prevFeet = new Vector3();
  private blockedTime = 0;
  private stepping = 0; //        remaining stair-pop window (reported as grounded)
  private unsupportedTime = 0; // coyote-grace clock: airborne only past 0.12 s
  private stepRay = new PhysicsRaycastResult();

  constructor(scene: Scene, spawn: Vector3, visualRoot: TransformNode) {
    this.spawn = spawn.clone();
    this.root = visualRoot;
    this.scene = scene;
    this.cc = new PhysicsCharacterController(
      spawn.add(new Vector3(0, CAPSULE_HEIGHT / 2, 0)),
      { capsuleHeight: CAPSULE_HEIGHT, capsuleRadius: CAPSULE_RADIUS },
      scene,
    );
    // Tuned via live introspection (defaults in parentheses):
    this.cc.characterMass = 65; //        (0) — with 0 the solver imparts no push to dynamic bodies
    this.cc.keepDistance = 0.02; //       (0.05) — hover gap above ground
    this.cc.keepContactTolerance = 0.05; // (0.1)
    this.cc.maxStepHeight = 0.3; //       (0!) — stairs are impossible at the default
    this.syncVisual(1 / 60);
  }

  get position(): Vector3 {
    return this.cc.getPosition().add(new Vector3(0, -CAPSULE_HEIGHT / 2, 0));
  }

  /** World yaw the character is visually facing (front = +Z). */
  get facingYaw(): number {
    return this.root.rotation.y;
  }

  /** Instantly move the character (feet position). */
  teleport(feet: Vector3) {
    this.cc.setPosition(feet.add(new Vector3(0, CAPSULE_HEIGHT / 2, 0)));
    this.cc.setVelocity(Vector3.Zero());
    this.airborne = false;
    this.blockedTime = 0;
    this.stepping = 0;
    this.unsupportedTime = 0;
    this.prevFeet.copyFrom(feet);
    this.syncVisual(1 / 60);
  }

  update(dt: number, input: InputState, camForward: Vector3, camRight: Vector3) {
    // Camera-relative movement intent → world-space horizontal direction.
    const intent = camRight.scale(input.move.x).add(camForward.scale(input.move.y));
    const intentLen = Math.min(1, intent.length());
    if (intentLen > 1e-4) intent.normalize();
    const targetSpeed = intentLen * (input.sprint ? SPRINT_SPEED : WALK_SPEED);

    const support = this.cc.checkSupport(dt, DOWN);
    const supported = support.supportedState === CharacterSupportedState.SUPPORTED;

    const vel = this.cc.getVelocity().clone();
    // Stepping window (stair-assist pop): counts as GROUNDED — the walk animation
    // keeps playing and planar control stays direct; only the vertical is ballistic.
    if (this.stepping > 0) {
      if (supported && vel.y <= 0.1) this.stepping = 0; // landed on the tread
      else this.stepping -= dt;
    }
    // State transitions: leave the ground on jump, or after ~0.12 s of unsupported
    // FALLING (coyote grace). Rising without support while grounded can only be a
    // stair pop — jumps flip airborne explicitly — so ascent never ticks the clock.
    if (supported) this.unsupportedTime = 0;
    else if (this.airborne || vel.y <= 0.1) this.unsupportedTime += dt;
    if (this.airborne) {
      if (supported && vel.y <= 0.1) this.airborne = false;
    } else if (this.unsupportedTime > 0.12 && this.stepping <= 0) {
      this.airborne = true;
    }
    this.grounded = !this.airborne;

    if (this.grounded && !input.jump && (this.stepping > 0 || (!supported && vel.y > 0.1))) {
      // mid-pop (assist or momentum): full planar drive up the step, ballistic vertical
      vel.x = intent.x * targetSpeed;
      vel.z = intent.z * targetSpeed;
      vel.y += GRAVITY.y * dt;
    } else if (this.grounded) {
      vel.x = intent.x * targetSpeed;
      vel.z = intent.z * targetSpeed;
      if (input.jump) {
        vel.y = JUMP_SPEED;
        this.airborne = true;
        this.grounded = false;
        this.stepping = 0;
      } else {
        vel.y = GROUND_STICK;
        this.stairAssist(dt, intent, targetSpeed, vel);
      }
    } else {
      // limited air control; gravity handled manually (official CC pattern)
      const t = Math.min(1, AIR_CONTROL * dt);
      vel.x = Scalar.Lerp(vel.x, intent.x * targetSpeed, t);
      vel.z = Scalar.Lerp(vel.z, intent.z * targetSpeed, t);
      vel.y += GRAVITY.y * dt;
    }
    this.cc.setVelocity(vel);
    this.cc.integrate(dt, support, GRAVITY);

    this.planarSpeed = Math.hypot(vel.x, vel.z);
    this.wakeNearbyBodies(dt);
    this.prevFeet.copyFrom(this.position);

    // Fell off the yard → respawn.
    if (this.cc.getPosition().y < KILL_Y) {
      this.cc.setPosition(this.spawn.add(new Vector3(0, CAPSULE_HEIGHT / 2, 0)));
      this.cc.setVelocity(Vector3.Zero());
    }

    this.syncVisual(dt, vel);
  }

  /** Havok's CC only mounts steps with momentum: at walking-stick speeds the solver
   *  pins the capsule against a riser and kills the velocity (verified live — z froze
   *  at the first step below ~0.8 input). Detect "pushing but not moving", confirm the
   *  obstacle is knee-high with clear space above (two forward raycasts), and pop the
   *  capsule over it — the same momentum mechanism that already works at full speed. */
  private stairAssist(dt: number, intent: Vector3, targetSpeed: number, vel: Vector3) {
    if (targetSpeed < 0.5) { this.blockedTime = 0; return; }
    const feet = this.position;
    const moved = Math.hypot(feet.x - this.prevFeet.x, feet.z - this.prevFeet.z) / Math.max(dt, 1e-4);
    if (moved < Math.min(0.35, targetSpeed * 0.3)) this.blockedTime += dt;
    else this.blockedTime = 0;
    if (this.blockedTime < 0.08) return;
    const pe = this.scene.getPhysicsEngine() as unknown as {
      raycastToRef?: (f: Vector3, t: Vector3, r: PhysicsRaycastResult) => void;
    } | null;
    if (!pe?.raycastToRef) return;
    const reach = CAPSULE_RADIUS + 0.35;
    // shin ray: is something actually blocking us?
    const lowFrom = feet.add(new Vector3(0, 0.12, 0));
    pe.raycastToRef(lowFrom, lowFrom.add(intent.scale(reach)), this.stepRay);
    if (!this.stepRay.hasHit) return;
    // headroom ray just above maxStepHeight: is the obstacle low enough to mount?
    const highFrom = feet.add(new Vector3(0, this.cc.maxStepHeight + 0.15, 0));
    pe.raycastToRef(highFrom, highFrom.add(intent.scale(reach)), this.stepRay);
    if (this.stepRay.hasHit) return; // a wall, not a step
    vel.y = 2.4; // clears ~0.29 m; forward velocity carries the capsule onto the tread
    this.stepping = 0.45; // stays "grounded" for the pop's arc (early-exit on landing)
    this.blockedTime = 0;
  }

  /** Sleeping dynamic bodies ignore character contacts entirely (verified live) — nudge
   *  anything close to the capsule awake so walking into it actually pushes it. */
  private wakeNearbyBodies(dt: number) {
    this.wakeTimer -= dt;
    if (this.wakeTimer > 0 || this.planarSpeed < 0.3) return;
    this.wakeTimer = 0.2;
    const p = this.cc.getPosition();
    for (const mesh of this.scene.meshes) {
      const body = (mesh as unknown as { physicsBody?: { getMassProperties(): { mass?: number }; applyImpulse(i: Vector3, a: Vector3): void } }).physicsBody;
      if (!body) continue;
      const mass = body.getMassProperties().mass ?? 0;
      if (mass <= 0) continue;
      const d2 = mesh.position.subtract(p).lengthSquared();
      if (d2 > 2.25) continue; // 1.5 m reach
      this.wakeImpulse.set(0, 0.02, 0);
      this.wakeAt.copyFrom(mesh.position);
      body.applyImpulse(this.wakeImpulse, this.wakeAt);
    }
  }

  private syncVisual(dt: number, vel?: Vector3) {
    const p = this.cc.getPosition();
    this.root.position.set(p.x, p.y - CAPSULE_HEIGHT / 2 - 0.04, p.z); // -0.04: keepDistance hover
    if (vel && this.planarSpeed > 0.4) {
      const targetYaw = Math.atan2(vel.x, vel.z); // front = +Z, matching v1's convention
      // Shortest signed arc, in RADIANS. (Scalar.LerpAngle wraps at 360/180 —
      // it is degree-based, and fed radians it spins the long way round.)
      const delta = Scalar.NormalizeRadians(targetYaw - this.root.rotation.y);
      const newYaw = Scalar.NormalizeRadians(this.root.rotation.y + delta * Math.min(1, 12 * dt));
      this.yawRate = dt > 0 ? Scalar.NormalizeRadians(newYaw - this.lastYaw) / dt : 0;
      this.root.rotation.y = newYaw;
      this.lastYaw = newYaw;
    } else {
      this.yawRate = 0;
    }
  }
}
