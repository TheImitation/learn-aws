import { Vector3 } from '@babylonjs/core';
import type { Carryable } from './carry';

export type SocketVerdict =
  | { ok: true }
  | { ok: false; reason: string; alarm?: string }; // alarm = insecure, not just ill-fitting

export interface SocketSpec {
  id: string;
  label: string; //   'cache bay'
  at: Vector3; //     world snap point (floor)
  ring: { setState: (s: 'empty' | 'ok' | 'bad') => void };
  accepts: (kind: string) => SocketVerdict;
  onChange: () => void; // occupancy changed — mission re-derives its state
}

/** A snap point that accepts or refuses modules. Refusals flash the ring red and
 *  the module stays in the player's hands; acceptance snaps it onto the pad. */
export class Socket {
  readonly spec: SocketSpec;
  occupant: Carryable | null = null;
  private flash = 0;

  constructor(spec: SocketSpec) {
    this.spec = spec;
    spec.ring.setState('empty');
  }

  /** Verdict for the carried module — flashes the ring on refusal. The caller
   *  releases the module from the carry anchor and then calls put(). */
  canPlug(kind: string): SocketVerdict {
    if (this.occupant) return this.refuse({ ok: false, reason: `The ${this.spec.label} is already occupied.` });
    const v = this.spec.accepts(kind);
    return v.ok ? v : this.refuse(v);
  }

  /** Snap an accepted (already released) module onto the pad. */
  put(c: Carryable) {
    this.occupant = c;
    c.root.position.set(this.spec.at.x, this.spec.at.y + c.halfHeight + 0.05, this.spec.at.z);
    c.root.rotation.set(0, 0, 0);
    this.spec.ring.setState('ok');
    this.spec.onChange();
  }

  /** Pull the occupant back out (caller puts it in the player's hands). */
  takeOut(): Carryable | null {
    const c = this.occupant;
    if (!c) return null;
    this.occupant = null;
    this.spec.ring.setState('empty');
    this.spec.onChange();
    return c;
  }

  /** Mark the occupant failed/dead (drills) — ring goes red until relayout. */
  markBad() { if (this.occupant) this.spec.ring.setState('bad'); }

  update(dt: number) {
    if (this.flash > 0) {
      this.flash -= dt;
      if (this.flash <= 0) this.spec.ring.setState(this.occupant ? 'ok' : 'empty');
    }
  }

  private refuse(v: SocketVerdict): SocketVerdict {
    this.flash = 0.9;
    this.spec.ring.setState('bad');
    return v;
  }
}
