import type { InputState } from '../input/inputMap';

export interface GrabSpec {
  prompt: string; //                 shown in the prompt chip while grabbed
  step: (dt: number, moveX: number) => void; // apply rotation input
  release: () => void; //            snap/lock — called when the player lets go
}

/** "Hands on the mechanism" mode: the player stands still and steers a machine
 *  part (aim arm, dial, valve) with the move axis; interact releases and locks.
 *  Missions begin() it from an interactable; main.ts drives it in the tick. */
export class GrabControl {
  private spec: GrabSpec | null = null;

  get active() { return this.spec !== null; }
  get prompt() { return this.spec?.prompt ?? ''; }

  begin(spec: GrabSpec) { this.spec = spec; }

  /** One tick while grabbed. Returns false once released. */
  tick(dt: number, st: InputState): boolean {
    if (!this.spec) return false;
    this.spec.step(dt, st.move.x);
    if (st.interact || st.pause) {
      const s = this.spec;
      this.spec = null;
      s.release();
      return false;
    }
    return true;
  }
}
