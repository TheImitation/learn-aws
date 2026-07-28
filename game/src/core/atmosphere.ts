import {
  AbstractMesh,
  ArcRotateCamera,
  CascadedShadowGenerator,
  Color3,
  Color4,
  DirectionalLight,
  DynamicTexture,
  GlowLayer,
  HemisphericLight,
  ImageProcessingConfiguration,
  Mesh,
  MeshBuilder,
  DefaultRenderingPipeline,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';

/** Night-shift atmosphere: sky dome, fog, a distant lit skyline, sun shadows on
 *  everything, emissive glow, and the camera post pipeline. Render-side only —
 *  nothing here touches physics or the deterministic tick. */

const HORIZON = '#141a28';

// Meshes that should neither cast shadows nor glow (environment shell).
const isEnvShell = (m: AbstractMesh) =>
  m.name.startsWith('sky') || m.name.startsWith('mega') || m.name.startsWith('cityline') ||
  (m.metadata as { noShadow?: boolean } | undefined)?.noShadow === true;

function skyDome(scene: Scene): Mesh {
  const tex = new DynamicTexture('sky-grad', { width: 4, height: 512 }, scene, false);
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  // The dome is centred on the ground plane, so the horizon sits at the sphere's
  // equator (v = 0.5). Mirror the glow band around it so UV direction can't hide it.
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.0, '#06080f'); //  zenith — deep night
  g.addColorStop(0.3, '#0c1120');
  g.addColorStop(0.42, '#1a2138'); // dusk band
  g.addColorStop(0.465, '#4a3a55'); // violet rim
  g.addColorStop(0.5, '#96603c'); //  sodium city glow at the horizon
  g.addColorStop(0.535, '#4a3a55');
  g.addColorStop(0.58, '#1a2138');
  g.addColorStop(0.7, '#0c1120');
  g.addColorStop(1.0, '#06080f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 512);
  tex.update(false);

  const m = new StandardMaterial('sky-m', scene);
  m.emissiveTexture = tex;
  m.diffuseColor = Color3.Black();
  m.specularColor = Color3.Black();
  m.disableLighting = true;
  m.fogEnabled = false;
  m.backFaceCulling = false;

  const dome = MeshBuilder.CreateSphere('sky', { diameter: 900, segments: 16, sideOrientation: Mesh.BACKSIDE }, scene);
  dome.material = m;
  dome.isPickable = false;
  dome.infiniteDistance = true;
  dome.applyFog = false;
  return dome;
}

/** Shared "lit windows" texture for the distant buildings. */
function windowsTexture(scene: Scene): DynamicTexture {
  const size = 256;
  const tex = new DynamicTexture('city-windows', { width: size, height: size }, scene, false);
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  ctx.fillStyle = '#05060a';
  ctx.fillRect(0, 0, size, size);
  const palette = ['#c8a45a', '#9db4d6', '#7a8aa8', '#d6c49d'];
  for (let x = 8; x < size - 8; x += 14) {
    for (let y = 8; y < size - 8; y += 10) {
      if (Math.random() < 0.24) {
        ctx.fillStyle = palette[(Math.random() * palette.length) | 0];
        ctx.globalAlpha = 0.25 + Math.random() * 0.5;
        ctx.fillRect(x, y, 6, 4);
      }
    }
  }
  ctx.globalAlpha = 1;
  tex.update(false);
  return tex;
}

function cityline(scene: Scene): { root: TransformNode; beacons: StandardMaterial[] } {
  const root = new TransformNode('cityline', scene);
  const windows = windowsTexture(scene);
  const wallMat = new StandardMaterial('cityline-m', scene);
  wallMat.diffuseColor = Color3.FromHexString('#0b0e16');
  wallMat.specularColor = Color3.Black();
  wallMat.emissiveTexture = windows;

  // Deterministic-ish ring of towers (seeded by index so reloads look the same).
  const rand = (i: number, k: number) => {
    const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  for (let i = 0; i < 34; i++) {
    const ang = (i / 34) * Math.PI * 2 + rand(i, 1) * 0.12;
    const dist = 150 + rand(i, 2) * 90;
    const w = 10 + rand(i, 3) * 22;
    const h = 10 + rand(i, 4) * 42;
    const b = MeshBuilder.CreateBox('cityline-b', { width: w, height: h, depth: 8 + rand(i, 5) * 14 }, scene);
    b.position.set(Math.cos(ang) * dist + 40, h / 2 - 0.5, Math.sin(ang) * dist + 40);
    b.rotation.y = ang + Math.PI / 2;
    b.material = wallMat;
    b.isPickable = false;
    b.parent = root;
  }

  // A few radio masts with slow-pulsing aviation beacons.
  const beacons: StandardMaterial[] = [];
  const mastMat = new StandardMaterial('cityline-mast', scene);
  mastMat.diffuseColor = Color3.FromHexString('#141824');
  mastMat.specularColor = Color3.Black();
  for (const [x, z, h] of [[-140, -90, 58], [190, 60, 70], [-60, 200, 50]] as const) {
    const mast = MeshBuilder.CreateCylinder('cityline-mast', { diameterTop: 0.6, diameterBottom: 3, height: h, tessellation: 6 }, scene);
    mast.position.set(x + 40, h / 2, z + 40);
    mast.material = mastMat;
    mast.isPickable = false;
    mast.parent = root;
    const lampM = new StandardMaterial('cityline-beacon', scene);
    lampM.emissiveColor = Color3.FromHexString('#e8443a');
    lampM.diffuseColor = Color3.Black();
    const lampMesh = MeshBuilder.CreateSphere('cityline-beacon', { diameter: 2.2, segments: 6 }, scene);
    lampMesh.position.set(x + 40, h + 1, z + 40);
    lampMesh.material = lampM;
    lampMesh.isPickable = false;
    lampMesh.parent = root;
    beacons.push(lampM);
  }
  return { root, beacons };
}

export interface Atmosphere {
  shadows: CascadedShadowGenerator;
  glow: GlowLayer;
  pipeline: DefaultRenderingPipeline;
}

export function buildAtmosphere(
  scene: Scene,
  sun: DirectionalLight,
  hemi: HemisphericLight,
  camera: ArcRotateCamera,
): Atmosphere {
  // --- palette: an on-call night shift under site floodlights ---
  scene.clearColor = Color4.FromHexString(HORIZON + 'ff');
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0042;
  scene.fogColor = Color3.FromHexString(HORIZON);
  sun.diffuse = Color3.FromHexString('#cdd8f5'); // cool moon/floodlight key
  sun.intensity = 1.35;
  hemi.diffuse = Color3.FromHexString('#93a1c9');
  hemi.groundColor = Color3.FromHexString('#3a2b1e'); // warm bounce off the ground
  hemi.intensity = 0.6;

  const dome = skyDome(scene);
  const city = cityline(scene);

  // Ground far beyond every playable slab, so the world doesn't end at a wall.
  const megaMat = new StandardMaterial('mega-m', scene);
  megaMat.diffuseColor = Color3.FromHexString('#181c26');
  megaMat.specularColor = Color3.Black();
  const mega = MeshBuilder.CreateGround('mega-ground', { width: 900, height: 900 }, scene);
  mega.position.set(40, -0.07, 0);
  mega.material = megaMat;
  mega.isPickable = false;
  mega.receiveShadows = true;

  // --- shadows: cascaded sun shadows over the hub↔mission-pad span ---
  const shadows = new CascadedShadowGenerator(2048, sun);
  shadows.lambda = 0.92;
  shadows.stabilizeCascades = true;
  shadows.shadowMaxZ = 90;
  shadows.bias = 0.012;
  shadows.normalBias = 0.02;
  shadows.setDarkness(0.45);
  shadows.filter = CascadedShadowGenerator.FILTER_PCF;
  shadows.filteringQuality = CascadedShadowGenerator.QUALITY_MEDIUM;

  const registerMesh = (m: AbstractMesh) => {
    if (isEnvShell(m)) return;
    shadows.addShadowCaster(m, false);
    m.receiveShadows = true;
  };
  for (const m of scene.meshes) registerMesh(m);
  scene.onNewMeshAddedObservable.add(registerMesh);
  // Disposed meshes drop out of the caster list automatically via Babylon's
  // onDisposeObservable wiring in addShadowCaster? It is NOT automatic — prune here.
  scene.onMeshRemovedObservable.add((m) => shadows.removeShadowCaster(m as AbstractMesh, false));

  // --- glow: every lamp, LED strip, token and screen in the game is emissive ---
  const glow = new GlowLayer('glow', scene, { blurKernelSize: 32 });
  glow.intensity = 0.42;
  glow.addExcludedMesh(dome);

  // --- post: tone map + bloom + FXAA + vignette ---
  const pipeline = new DefaultRenderingPipeline('post', true, scene, [camera]);
  pipeline.samples = 4;
  pipeline.fxaaEnabled = true;
  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.78;
  pipeline.bloomWeight = 0.16;
  pipeline.bloomKernel = 48;
  pipeline.bloomScale = 0.5;
  const ip = pipeline.imageProcessing;
  ip.toneMappingEnabled = true;
  ip.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  ip.exposure = 1.55;
  ip.contrast = 1.1;
  ip.vignetteEnabled = true;
  ip.vignetteWeight = 1.4;
  ip.vignetteColor = new Color4(0, 0, 0.02, 0);

  // Cosmetic animation (beacon pulse) — piggybacks on render, never on the sim tick.
  let t = 0;
  scene.onBeforeRenderObservable.add(() => {
    t += scene.getEngine().getDeltaTime() / 1000;
    const k = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.1));
    for (const b of city.beacons) b.emissiveColor.set(0.91 * k, 0.27 * k * 0.6, 0.23 * k * 0.5);
  });

  return { shadows, glow, pipeline };
}
