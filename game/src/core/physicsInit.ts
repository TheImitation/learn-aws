import HavokPhysics from '@babylonjs/havok';
import { HavokPlugin, Scene, Vector3 } from '@babylonjs/core';

/** Boot the Havok WASM engine and attach it to the scene (gravity in m/s²). */
export async function initPhysics(scene: Scene): Promise<HavokPlugin> {
  const hk = await HavokPhysics();
  const plugin = new HavokPlugin(true, hk);
  scene.enablePhysics(new Vector3(0, -9.81, 0), plugin);
  return plugin;
}
