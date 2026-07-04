import { AbstractMesh, Color3, TransformNode, Vector3 } from '@babylonjs/core';

export interface Interactable {
  id: string;
  node: TransformNode;
  prompt: string; //          "Read status board"
  radius?: number; //         interaction range (default 2.2)
  onInteract: () => void;
  enabled?: () => boolean;
}

const DEFAULT_RADIUS = 2.2;
const FACING_DOT = 0.25; //   how directly the player must face it
const CLOSE_RANGE = 1.1; //   inside this, facing doesn't matter
const OUTLINE = Color3.FromHexString('#5fd29a');

/** Proximity+facing picker over registered interactables; highlights the focused
 *  one with a mesh outline (no material mutation — materials are shared). */
export class InteractionSystem {
  focused: Interactable | null = null;
  private items: Interactable[] = [];

  add(item: Interactable) { this.items.push(item); }
  remove(id: string) {
    this.items = this.items.filter((i) => i.id !== id);
    if (this.focused?.id === id) this.setFocus(null);
  }

  update(playerPos: Vector3, playerYaw: number) {
    const fwd = { x: Math.sin(playerYaw), z: Math.cos(playerYaw) }; // front = +Z convention
    let best: Interactable | null = null;
    let bestScore = Infinity;
    for (const it of this.items) {
      if (it.enabled && !it.enabled()) continue;
      const p = it.node.getAbsolutePosition();
      const dx = p.x - playerPos.x; const dz = p.z - playerPos.z;
      const dist = Math.hypot(dx, dz);
      const radius = it.radius ?? DEFAULT_RADIUS;
      if (dist > radius || Math.abs(p.y - playerPos.y) > 2.2) continue;
      const facing = dist > 1e-3 ? (dx / dist) * fwd.x + (dz / dist) * fwd.z : 1;
      if (dist > CLOSE_RANGE && facing < FACING_DOT) continue;
      if (dist < bestScore) { bestScore = dist; best = it; }
    }
    if (best !== this.focused) this.setFocus(best);
  }

  tryInteract(): boolean {
    if (!this.focused) return false;
    this.focused.onInteract();
    return true;
  }

  private setFocus(item: Interactable | null) {
    if (this.focused) this.outline(this.focused.node, false);
    this.focused = item;
    if (item) this.outline(item.node, true);
  }

  private outline(node: TransformNode, on: boolean) {
    for (const mesh of node.getChildMeshes(false) as AbstractMesh[]) {
      const m = mesh as AbstractMesh & { renderOutline: boolean; outlineColor: Color3; outlineWidth: number };
      m.renderOutline = on;
      if (on) { m.outlineColor = OUTLINE; m.outlineWidth = 0.02; }
    }
  }
}
