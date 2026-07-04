import {
  CharacterSupportedState,
  PhysicsCharacterController,
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
    // State transitions: leave the ground on jump or ledge; land only when falling onto support.
    if (this.airborne) {
      if (supported && vel.y <= 0.1) this.airborne = false;
    } else if (!supported) {
      this.airborne = true;
    }
    this.grounded = !this.airborne;

    if (this.grounded) {
      vel.x = intent.x * targetSpeed;
      vel.z = intent.z * targetSpeed;
      if (input.jump) {
        vel.y = JUMP_SPEED;
        this.airborne = true;
        this.grounded = false;
      } else {
        vel.y = GROUND_STICK;
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

    // Fell off the yard → respawn.
    if (this.cc.getPosition().y < KILL_Y) {
      this.cc.setPosition(this.spawn.add(new Vector3(0, CAPSULE_HEIGHT / 2, 0)));
      this.cc.setVelocity(Vector3.Zero());
    }

    this.syncVisual(dt, vel);
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
      const newYaw = Scalar.LerpAngle(this.root.rotation.y, targetYaw, Math.min(1, 12 * dt));
      this.yawRate = dt > 0 ? Scalar.NormalizeRadians(newYaw - this.lastYaw) / dt : 0;
      this.root.rotation.y = newYaw;
      this.lastYaw = newYaw;
    } else {
      this.yawRate = 0;
    }
  }
}
