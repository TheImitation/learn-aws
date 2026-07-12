import { TransformNode, Vector3 } from '@babylonjs/core';
import { sfx } from '../core/sfx';

/** A physical module the engineer can pick up, carry overhead, and put down.
 *  `killBody`/`makeBody` toggle the Havok body: carried and socketed items are
 *  kinematic (parented / snapped); dropped items get their dynamic body back. */
export interface Carryable {
  id: string;
  kind: string; //      socket compatibility class ('cache-mem', 'replica', ...)
  label: string; //     "Memcached node" — used in prompts and toasts
  root: TransformNode;
  halfHeight: number; // lift applied when snapped into a socket / dropped
  killBody: () => void;
  makeBody: () => void;
}

/** One-slot carry: the module rides an anchor above the engineer's head (Pikmin
 *  style) with a slight bob so it reads as held, not glued. */
export class CarrySystem {
  held: Carryable | null = null;
  private anchor: TransformNode;
  private t = 0;

  constructor(playerRoot: TransformNode) {
    this.anchor = new TransformNode('carry-anchor', playerRoot.getScene());
    this.anchor.parent = playerRoot;
    this.anchor.position.set(0, 1.72, 0.12);
  }

  pickup(c: Carryable) {
    if (this.held) return;
    sfx.pickup();
    c.killBody();
    c.root.parent = this.anchor;
    c.root.position.set(0, 0, 0);
    c.root.rotationQuaternion = null;
    c.root.rotation.set(0, 0, 0);
    this.held = c;
  }

  /** Put the held module down just in front of the player; it falls and settles. */
  drop(playerFeet: Vector3, facingYaw: number) {
    const c = this.held;
    if (!c) return;
    sfx.drop();
    this.held = null;
    c.root.parent = null;
    c.root.position.set(
      playerFeet.x + Math.sin(facingYaw) * 0.85,
      playerFeet.y + c.halfHeight + 0.45,
      playerFeet.z + Math.cos(facingYaw) * 0.85,
    );
    c.makeBody();
  }

  /** Hand the held module over (socket accepted it): caller owns placement. */
  release(): Carryable | null {
    const c = this.held;
    this.held = null;
    if (c) c.root.parent = null;
    return c;
  }

  /** Take an already-placed module straight into the hands (socket take-out). */
  take(c: Carryable) {
    if (this.held) return;
    sfx.unplug();
    c.killBody();
    c.root.parent = this.anchor;
    c.root.position.set(0, 0, 0);
    this.held = c;
  }

  update(dt: number) {
    this.t += dt;
    this.anchor.position.y = 1.72 + Math.sin(this.t * 3.2) * 0.035;
  }
}
