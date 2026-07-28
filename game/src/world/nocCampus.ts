import {
  Color3,
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  PointLight,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { drawnMat, gridFloorMat, hazardTexture, liveMat } from './textures';

/** The NOC campus — the hub world. Replaces the Phase-1 test yard with an actual
 *  place: ops floor, live dashboard wall, job-board plaza, loading dock, training
 *  course, coffee corner. PHYSICS-CRITICAL geometry (ground, wall colliders,
 *  stairs, ramp, platform, crate/cone bodies) keeps the exact dims and step sizes
 *  the traversal work was tuned against. */

export interface Campus {
  spawn: Vector3;
  crates: Mesh[]; //          dynamic bodies, exposed for verification (indices stable)
  statusBoard: TransformNode; // NOC status totem interactable
  toolbox: TransformNode; //    workbench toolbox interactable
}

export interface NocData {
  overall: number;
  attempted: number;
  total: number;
  domains: { label: string; accent: string; pct: number }[];
  recommendedTitle: string | null;
}

const FG = '#d7e3f5';
const SCREEN_BG = '#0a0e15';

export function buildNocCampus(scene: Scene, data: () => NocData): Campus {
  const solid = (name: string, hex: string) => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = Color3.FromHexString(hex);
    m.specularColor = new Color3(0.05, 0.05, 0.05);
    return m;
  };
  const glow = (name: string, hex: string) => {
    const m = new StandardMaterial(name, scene);
    m.emissiveColor = Color3.FromHexString(hex);
    m.diffuseColor = Color3.Black();
    m.specularColor = Color3.Black();
    return m;
  };

  const steel = solid('nc-steel', '#2c3140');
  const steelLight = solid('nc-steel2', '#454c60');
  const concrete = solid('nc-conc', '#565d6e');
  const darkShell = solid('nc-shell', '#1a1e2a');
  const wood = solid('nc-wood', '#b8863f');
  const paint = solid('nc-paint', '#1a1f2b');
  const plazaPaint = solid('nc-plaza', '#2a3040');
  const soil = solid('nc-soil', '#3a2d20');
  const leaf = solid('nc-leaf', '#2c5b3f');
  const trunk = solid('nc-trunk', '#5a4632');
  const coneM = solid('nc-cone', '#e8801f');
  const warmLamp = glow('nc-warm', '#e8c07a');

  const fix = (m: Mesh) => new PhysicsAggregate(m, PhysicsShapeType.BOX, { mass: 0 }, scene);

  // ============ physics-critical base (dims identical to the test yard) ============
  const ground = MeshBuilder.CreateBox('ground', { width: 60, height: 1, depth: 60 }, scene);
  ground.position.y = -0.5;
  ground.material = gridFloorMat(scene, 'y-floor', 60, 60, {
    base: '#252a37', line: '#3a4258', bold: '#4a5570', scuff: true,
  });
  fix(ground);
  // perimeter colliders stay; the visible fence is separate dressing
  for (const [x, z, w, d] of [[0, 30.3, 61, 0.6], [0, -30.3, 61, 0.6], [30.3, 0, 0.6, 61], [-30.3, 0, 0.6, 61]] as const) {
    const wall = MeshBuilder.CreateBox('wall', { width: w, height: 1.2, depth: d }, scene);
    wall.position.set(x, 0.6, z);
    wall.isVisible = false;
    fix(wall);
  }

  // training ramp + platform (exact dims)
  const ramp = MeshBuilder.CreateBox('ramp', { width: 3.4, height: 0.3, depth: 6.4 }, scene);
  ramp.position.set(10, 0.75, -3.0);
  ramp.rotation.x = -0.26;
  ramp.material = concrete;
  fix(ramp);
  const platform = MeshBuilder.CreateBox('platform', { width: 6, height: 0.4, depth: 6 }, scene);
  platform.position.set(10, 1.55, 3.2);
  platform.material = solid('nc-plat', '#7e3c38');
  fix(platform);

  // stairs + landing (exact dims — the 0.18 risers the stair assist was tuned on)
  for (let i = 0; i < 7; i++) {
    const step = MeshBuilder.CreateBox('step', { width: 3, height: 0.18, depth: 0.42 }, scene);
    step.position.set(-10, 0.09 + i * 0.18, 2 + i * 0.42);
    step.material = concrete;
    fix(step);
  }
  const landing = MeshBuilder.CreateBox('landing', { width: 3, height: 0.24, depth: 2.4 }, scene);
  landing.position.set(-10, 1.2, 6.1);
  landing.material = solid('nc-land', '#7e3c38');
  fix(landing);

  // crates (same count/size/mass; now stacked at the loading dock)
  const crates: Mesh[] = [];
  const crate = (x: number, y: number, z: number, size = 0.8, massKg = 5) => {
    const c = MeshBuilder.CreateBox('crate', { size }, scene);
    c.position.set(x, y, z);
    c.material = wood;
    new PhysicsAggregate(c, PhysicsShapeType.BOX, { mass: massKg, friction: 0.6, restitution: 0.1 }, scene);
    crates.push(c);
    return c;
  };
  crate(19.1, 0.4, -21); crate(20, 0.4, -21); crate(20.9, 0.4, -21);
  crate(19.55, 1.2, -21); crate(20.45, 1.2, -21);
  crate(20, 2.0, -21);
  crate(16.8, 0.4, -18.5, 0.8, 4);
  crate(23.2, 0.4, -19.2, 0.8, 4);

  // slalom cones (same bodies; now marking the training course)
  for (let i = 0; i < 4; i++) {
    const c = MeshBuilder.CreateCylinder('cone', { diameterTop: 0.05, diameterBottom: 0.4, height: 0.6, tessellation: 12 }, scene);
    c.position.set(14 + i * 2, 0.3, -5 + (i % 2) * 1.4);
    c.material = coneM;
    new PhysicsAggregate(c, PhysicsShapeType.CYLINDER, { mass: 0.8, friction: 0.5 }, scene);
  }

  // ============ ground paint: plaza, paths, markings ============
  const strip = (cx: number, cz: number, w: number, d: number, yawRad = 0, m: StandardMaterial = paint) => {
    const s = MeshBuilder.CreateGround('nc-path', { width: w, height: d }, scene);
    s.position.set(cx, 0.035, cz);
    s.rotation.y = yawRad;
    s.material = m;
    s.metadata = { noShadow: true };
  };
  const plaza = MeshBuilder.CreateDisc('nc-plaza', { radius: 3.6, tessellation: 40 }, scene);
  plaza.rotation.x = Math.PI / 2;
  plaza.position.set(0.8, 0.03, 8.5);
  plaza.material = plazaPaint;
  plaza.metadata = { noShadow: true };
  strip(1.5, 6.5, 1.6, 7, 0.55); //    spawn → plaza
  strip(16, 4, 24, 1.6); //            plaza → east gate
  strip(-6, 8.5, 12, 1.6); //          plaza → bullpen
  strip(12, -12, 1.6, 16); //          east path → dock
  // dock hazard edge
  const hazMat = new StandardMaterial('nc-haz', scene);
  const hazTex = hazardTexture(scene, 'nc-haz-tex');
  hazTex.uScale = 5;
  hazMat.diffuseTexture = hazTex;
  hazMat.specularColor = Color3.Black();
  const dockEdge = MeshBuilder.CreateGround('nc-dockedge', { width: 10, height: 1 }, scene);
  dockEdge.position.set(20, 0.04, -16.8);
  dockEdge.material = hazMat;
  dockEdge.metadata = { noShadow: true };

  // ============ the NOC dashboard wall (north, facing the plaza) ============
  const wallRoot = new TransformNode('nc-nocwall', scene);
  const back = MeshBuilder.CreateBox('nc-wall-b', { width: 18, height: 6, depth: 0.5 }, scene);
  back.parent = wallRoot; back.position.set(3, 3, 16.6); back.material = darkShell;
  fix(back);
  for (const dx of [-6.2, 12.2]) {
    const col = MeshBuilder.CreateBox('nc-wall-c', { width: 0.7, height: 6.6, depth: 0.9 }, scene);
    col.parent = wallRoot; col.position.set(3 + dx, 3.3, 16.6); col.material = steel;
  }
  const skirtM = new StandardMaterial('nc-skirt', scene);
  const skirtTex = hazardTexture(scene, 'nc-skirt-tex', '#8a6a2c', '#191c26');
  skirtTex.uScale = 9;
  skirtM.diffuseTexture = skirtTex;
  skirtM.specularColor = Color3.Black();
  const skirt = MeshBuilder.CreateBox('nc-wall-skirt', { width: 18, height: 0.5, depth: 0.54 }, scene);
  skirt.parent = wallRoot; skirt.position.set(3, 0.25, 16.56); skirt.material = skirtM;
  const header = MeshBuilder.CreateBox('nc-wall-h', { width: 18, height: 0.14, depth: 0.56 }, scene);
  header.parent = wallRoot; header.position.set(3, 6.08, 16.56); header.material = glow('nc-wall-hg', '#2c6e4f');
  // NOTE (verified live): a default CreatePlane's visible/readable face is its −z
  // side at rotation 0; rotation.y=π faces it +z. Culling hides the other side.
  const title = MeshBuilder.CreatePlane('nc-wall-title', { width: 10, height: 0.85 }, scene);
  title.parent = wallRoot; title.position.set(3, 6.75, 16.5);
  title.material = drawnMat(scene, 'nc-title', (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.font = '700 64px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#5fd29a';
    ctx.fillText('NETWORK OPERATIONS CENTER', w / 2, h / 2);
  }, 1024, 96);
  (title.material as StandardMaterial).diffuseTexture!.hasAlpha = true;
  (title.material as StandardMaterial).useAlphaFromDiffuseTexture = true;
  title.material.backFaceCulling = false;

  // three live screens
  const panel = (px: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const { mat, redraw } = liveMat(scene, `nc-screen-${px}`, 512, 320, draw);
    const s = MeshBuilder.CreatePlane('nc-screen', { width: 4.9, height: 3.05 }, scene);
    s.parent = wallRoot; s.position.set(px, 3.55, 16.3); s.rotation.x = 0.04;
    s.material = mat;
    const frame = MeshBuilder.CreateBox('nc-screen-f', { width: 5.15, height: 3.3, depth: 0.12 }, scene);
    frame.parent = wallRoot; frame.position.set(px, 3.55, 16.38); frame.material = steel;
    return redraw;
  };
  const grid = (ctx: CanvasRenderingContext2D, w: number, h: number, titleText: string) => {
    ctx.fillStyle = SCREEN_BG; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#182030'; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.fillStyle = '#7d8aa5';
    ctx.font = '700 22px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(titleText, 16, 12);
  };
  const redraws: (() => void)[] = [];
  redraws.push(panel(-2.4, (ctx, w, h) => {
    const d = data();
    grid(ctx, w, h, 'EXAM READINESS');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 110px ui-monospace, Menlo, monospace';
    ctx.fillStyle = d.overall >= 70 ? '#5fd29a' : d.overall >= 35 ? '#e8c07a' : '#e85f5f';
    ctx.fillText(`${d.overall}%`, w / 2, h / 2 + 4);
    // gauge ring
    ctx.strokeStyle = '#223046'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(w / 2, h / 2 + 4, 108, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = ctx.fillStyle as string;
    ctx.beginPath(); ctx.arc(w / 2, h / 2 + 4, 108, -Math.PI / 2, -Math.PI / 2 + (d.overall / 100) * Math.PI * 2); ctx.stroke();
    ctx.font = '700 20px ui-monospace, Menlo, monospace';
    ctx.fillStyle = '#7d8aa5';
    ctx.fillText(`${d.attempted}/${d.total} TOPICS ATTEMPTED`, w / 2, h - 22);
  }));
  redraws.push(panel(3, (ctx, w, h) => {
    const d = data();
    grid(ctx, w, h, 'DOMAIN STATUS');
    d.domains.forEach((dom, i) => {
      const y = 62 + i * 62;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.font = '700 20px ui-monospace, Menlo, monospace';
      ctx.fillStyle = FG;
      ctx.fillText(dom.label.toUpperCase().replace(' ARCHITECTURES', ''), 16, y);
      ctx.fillStyle = '#1a2333';
      ctx.fillRect(16, y + 26, w - 96, 18);
      ctx.fillStyle = dom.accent;
      ctx.fillRect(16, y + 26, (w - 96) * (dom.pct / 100), 18);
      ctx.font = '700 22px ui-monospace, Menlo, monospace';
      ctx.fillText(`${dom.pct}%`, w - 70, y + 22);
    });
  }));
  redraws.push(panel(8.4, (ctx, w, h) => {
    const d = data();
    grid(ctx, w, h, 'DISPATCH');
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = '700 20px ui-monospace, Menlo, monospace';
    ctx.fillStyle = '#7d8aa5';
    ctx.fillText('NEXT RECOMMENDED TICKET', 16, 56);
    ctx.fillStyle = '#e8c07a';
    ctx.font = '700 26px ui-monospace, Menlo, monospace';
    const rec = d.recommendedTitle ?? 'ALL TICKETS RESOLVED';
    ctx.fillText(rec.length > 30 ? rec.slice(0, 29) + '…' : rec, 16, 84);
    ctx.fillStyle = '#44506a';
    ctx.font = '400 18px ui-monospace, Menlo, monospace';
    const t = new Date();
    const lines = [
      `${t.toTimeString().slice(0, 5)} shift: NIGHT  ·  on-call: YOU`,
      'eu-west-1 ......... nominal',
      'us-east-1 ......... nominal',
      'ap-southeast-2 .... nominal',
      'pager ............. armed',
    ];
    lines.forEach((l, i) => ctx.fillText(l, 16, 140 + i * 28));
  }));
  // consoles under the wall
  for (const dx of [-3.4, 0.6, 4.6]) {
    const desk = MeshBuilder.CreateBox('nc-console', { width: 2.6, height: 0.9, depth: 0.8 }, scene);
    desk.position.set(3 + dx, 0.45, 15.4); desk.material = steel;
    fix(desk);
    const face = MeshBuilder.CreateBox('nc-console-f', { width: 2.4, height: 0.5, depth: 0.06 }, scene);
    face.position.set(3 + dx, 0.95, 15.0); face.rotation.x = 0.5;
    face.material = glow('nc-console-g' + dx, '#16402e');
  }

  // ============ job-board plaza: canopy + sign (kiosk itself is added by main) ============
  // (kiosk + canopy sit at x 0.3 — between the wall screens, so neither the
  // readiness gauge nor the domain board is blocked from the spawn approach)
  const canopy = new TransformNode('nc-canopy', scene);
  canopy.position.set(0.3, 0, 8.5);
  for (const [dx, dz] of [[-1.7, -1.3], [1.7, -1.3], [-1.7, 1.3], [1.7, 1.3]] as const) {
    const post = MeshBuilder.CreateBox('nc-canopy-p', { width: 0.16, height: 2.9, depth: 0.16 }, scene);
    post.parent = canopy; post.position.set(dx, 1.45, dz); post.material = steel;
    fix(post);
  }
  const roof = MeshBuilder.CreateBox('nc-canopy-r', { width: 4.2, height: 0.14, depth: 3.4 }, scene);
  roof.parent = canopy; roof.position.set(0, 2.97, 0); roof.rotation.z = 0.045; roof.material = steelLight;
  const jbSign = MeshBuilder.CreatePlane('nc-jb-sign', { width: 2.6, height: 0.78 }, scene);
  jbSign.parent = canopy; jbSign.position.set(0, 3.45, -1.55);
  jbSign.material = drawnMat(scene, 'nc-jb-sign', (ctx, w, h) => {
    ctx.fillStyle = '#101620'; ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 68px ui-monospace, Menlo, monospace';
    ctx.fillStyle = '#e8c07a';
    ctx.fillText('JOB BOARD', w / 2, 46);
    ctx.font = '700 30px ui-monospace, Menlo, monospace';
    ctx.fillStyle = '#8da3c4';
    ctx.fillText('take a ticket · start a mission', w / 2, 112);
  }, 512, 150);
  jbSign.material.backFaceCulling = false;

  // warm plaza light + cool bullpen light (scene light budget: hemi+sun+these = 4)
  const plazaLight = new PointLight('nc-plaza-light', new Vector3(0.8, 3.6, 8.5), scene);
  plazaLight.diffuse = Color3.FromHexString('#e8c07a');
  plazaLight.intensity = 0.55;
  plazaLight.range = 16;
  const penLight = new PointLight('nc-pen-light', new Vector3(-20, 2.9, 8), scene);
  penLight.diffuse = Color3.FromHexString('#9db4d6');
  penLight.intensity = 0.5;
  penLight.range = 14;

  // ============ ops bullpen (west): roofed open office ============
  const pen = new TransformNode('nc-pen', scene);
  pen.position.set(-20, 0, 8);
  const penSlab = MeshBuilder.CreateGround('nc-pen-slab', { width: 12.5, height: 10.5 }, scene);
  penSlab.parent = pen; penSlab.position.y = 0.022; penSlab.material = plazaPaint;
  penSlab.metadata = { noShadow: true };
  for (const [dx, dz] of [[-5.9, -4.9], [5.9, -4.9], [-5.9, 4.9], [5.9, 4.9]] as const) {
    const post = MeshBuilder.CreateBox('nc-pen-p', { width: 0.2, height: 3.2, depth: 0.2 }, scene);
    post.parent = pen; post.position.set(dx, 1.6, dz); post.material = steel;
    fix(post);
  }
  const penRoof = MeshBuilder.CreateBox('nc-pen-roof', { width: 13, height: 0.18, depth: 11 }, scene);
  penRoof.parent = pen; penRoof.position.y = 3.3; penRoof.material = darkShell;
  const monA = drawnMat(scene, 'nc-mon-a', (ctx, w, h) => {
    ctx.fillStyle = SCREEN_BG; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#5fd29a'; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const y = h * 0.62 - Math.sin(x * 0.05) * 18 - (x / w) * 26 - (x % 32 ? 0 : 9);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#44506a'; ctx.font = '400 13px monospace';
    for (let i = 0; i < 3; i++) ctx.fillText('▮▮▮▮▮▮▮ 200 OK', 8, 16 + i * 16);
  }, 256, 160);
  const monB = drawnMat(scene, 'nc-mon-b', (ctx, w, h) => {
    ctx.fillStyle = SCREEN_BG; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#44506a'; ctx.font = '400 13px monospace';
    const rows = ['tail -f prod.log', 'GET /cart 200 12ms', 'GET /sku/88 200 9ms', 'PUT /order 201 40ms', 'λ warm · queue 0', 'alarm: none'];
    rows.forEach((r, i) => { ctx.fillStyle = i ? '#3f7d63' : '#7d8aa5'; ctx.fillText(r, 8, 18 + i * 22); });
  }, 256, 160);
  const desk = (dx: number, dz: number, yawRad: number, alt: boolean) => {
    const d = new TransformNode('nc-desk', scene);
    d.parent = pen; d.position.set(dx, 0, dz); d.rotation.y = yawRad;
    const top = MeshBuilder.CreateBox('nc-desk-top', { width: 1.7, height: 0.07, depth: 0.75 }, scene);
    top.parent = d; top.position.y = 0.76; top.material = steelLight;
    new PhysicsAggregate(top, PhysicsShapeType.BOX, { mass: 0 }, scene);
    for (const lx of [-0.75, 0.75]) {
      const leg = MeshBuilder.CreateBox('nc-desk-leg', { width: 0.06, height: 0.76, depth: 0.62 }, scene);
      leg.parent = d; leg.position.set(lx, 0.38, 0); leg.material = steel;
    }
    const mon = MeshBuilder.CreatePlane('nc-desk-mon', { width: 0.62, height: 0.4 }, scene);
    mon.parent = d; mon.position.set(0, 1.12, 0.12); mon.rotation.x = -0.08;
    mon.material = alt ? monA : monB;
    const monBack = MeshBuilder.CreateBox('nc-desk-monb', { width: 0.66, height: 0.44, depth: 0.05 }, scene);
    monBack.parent = d; monBack.position.set(0, 1.12, 0.155); monBack.material = steel;
    const seat = MeshBuilder.CreateBox('nc-chair', { width: 0.44, height: 0.06, depth: 0.44 }, scene);
    seat.parent = d; seat.position.set(0, 0.47, -0.62); seat.material = solid('nc-chair-m', '#31384a');
    const backR = MeshBuilder.CreateBox('nc-chair-b', { width: 0.44, height: 0.5, depth: 0.06 }, scene);
    backR.parent = d; backR.position.set(0, 0.75, -0.84); backR.material = solid('nc-chair-m2', '#31384a');
    const postC = MeshBuilder.CreateCylinder('nc-chair-p', { diameter: 0.08, height: 0.45 }, scene);
    postC.parent = d; postC.position.set(0, 0.24, -0.62); postC.material = steel;
  };
  desk(-3.4, 1.8, 0, true); desk(-1.0, 1.8, 0, false);
  desk(-3.4, -1.6, Math.PI, false); desk(-1.0, -1.6, Math.PI, true);
  desk(2.6, 1.8, 0, false); desk(2.6, -1.6, Math.PI, true);

  // workbench + the toolbox interactable
  const toolbox = new TransformNode('toolbox', scene);
  toolbox.position.set(-14.2, 0, 3.6);
  toolbox.rotation.y = -0.5;
  const bench = MeshBuilder.CreateBox('nc-bench', { width: 1.5, height: 0.09, depth: 0.65 }, scene);
  bench.parent = toolbox; bench.position.y = 0.82; bench.material = wood;
  new PhysicsAggregate(bench, PhysicsShapeType.BOX, { mass: 0 }, scene);
  for (const lx of [-0.65, 0.65]) {
    const leg = MeshBuilder.CreateBox('nc-bench-leg', { width: 0.08, height: 0.8, depth: 0.55 }, scene);
    leg.parent = toolbox; leg.position.set(lx, 0.4, 0); leg.material = steel;
  }
  const tbox = MeshBuilder.CreateBox('tb-box', { width: 0.55, height: 0.3, depth: 0.32 }, scene);
  tbox.parent = toolbox; tbox.position.y = 1.02; tbox.material = solid('nc-tb', '#cf3a33');
  const tHandle = MeshBuilder.CreateBox('tb-handle', { width: 0.3, height: 0.05, depth: 0.06 }, scene);
  tHandle.parent = toolbox; tHandle.position.y = 1.2; tHandle.material = concrete;

  // ============ NOC status totem (the status-board interactable) ============
  const statusBoard = new TransformNode('statusBoard', scene);
  statusBoard.position.set(7.8, 0, 12.2);
  statusBoard.rotation.y = Math.PI + 0.5;
  const sbPost = MeshBuilder.CreateBox('sb-post', { width: 0.14, height: 1.1, depth: 0.14 }, scene);
  sbPost.parent = statusBoard; sbPost.position.y = 0.55; sbPost.material = steel;
  fix(sbPost);
  const sbScreen = MeshBuilder.CreateBox('sb-screen', { width: 0.95, height: 0.62, depth: 0.06 }, scene);
  sbScreen.parent = statusBoard; sbScreen.position.y = 1.32; sbScreen.rotation.x = -0.18;
  sbScreen.material = glow('sb-g', '#2c6e4f');

  // ============ coffee corner ============
  const coffee = new TransformNode('nc-coffee', scene);
  coffee.position.set(-7, 0, -14);
  const vend = MeshBuilder.CreateBox('nc-vend', { width: 1.0, height: 1.9, depth: 0.8 }, scene);
  vend.parent = coffee; vend.position.set(-1.6, 0.95, 0); vend.rotation.y = Math.PI / 2;
  vend.material = solid('nc-vend-m', '#5a2e2a');
  new PhysicsAggregate(vend, PhysicsShapeType.BOX, { mass: 0 }, scene);
  const vendFace = MeshBuilder.CreatePlane('nc-vend-f', { width: 0.7, height: 1.5 }, scene);
  vendFace.parent = coffee; vendFace.position.set(-1.18, 1.05, 0); vendFace.rotation.y = -Math.PI / 2;
  vendFace.material = drawnMat(scene, 'nc-vend-face', (ctx, w, h) => {
    ctx.fillStyle = '#120f0e'; ctx.fillRect(0, 0, w, h);
    ctx.font = '700 30px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center'; ctx.fillStyle = '#e8c07a';
    ctx.fillText('KAFFEINE', w / 2, 40);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
      ctx.fillStyle = ['#7a4a3a', '#4a6a3a', '#3a4a7a'][(r + c) % 3];
      ctx.fillRect(24 + c * 60, 70 + r * 70, 44, 50);
    }
  }, 192, 384);
  const table = MeshBuilder.CreateCylinder('nc-table', { diameter: 1.2, height: 0.06 }, scene);
  table.parent = coffee; table.position.y = 0.74; table.material = steelLight;
  new PhysicsAggregate(table, PhysicsShapeType.CYLINDER, { mass: 0 }, scene);
  const tPost = MeshBuilder.CreateCylinder('nc-table-p', { diameter: 0.1, height: 0.74 }, scene);
  tPost.parent = coffee; tPost.position.y = 0.37; tPost.material = steel;
  for (const a of [0.4, 2.3, 4.4]) {
    const stool = MeshBuilder.CreateCylinder('nc-stool', { diameter: 0.4, height: 0.5 }, scene);
    stool.parent = coffee; stool.position.set(Math.cos(a) * 1.1, 0.25, Math.sin(a) * 1.1);
    stool.material = solid('nc-stool-m', '#31384a');
  }

  // ============ loading dock (south-east) ============
  const dockSign = MeshBuilder.CreatePlane('nc-dock-sign', { width: 4.2, height: 0.82 }, scene);
  dockSign.position.set(20, 3.2, -27.2);
  dockSign.rotation.y = Math.PI; // read from the north (dock side)
  dockSign.material = drawnMat(scene, 'nc-dock-sign', (ctx, w, h) => {
    ctx.fillStyle = '#141821'; ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 54px ui-monospace, Menlo, monospace';
    ctx.fillStyle = '#e8801f';
    ctx.fillText('RECEIVING · DOCK 1', w / 2, 48);
    ctx.font = '700 30px ui-monospace, Menlo, monospace';
    ctx.fillStyle = '#8a6a3c';
    ctx.fillText('crates are pushable · that is all', w / 2, 116);
  }, 768, 150);
  dockSign.material.backFaceCulling = false;
  const container = (x: number, z: number, yawRad: number, hex: string) => {
    const c = MeshBuilder.CreateBox('nc-container', { width: 2.5, height: 2.5, depth: 5.6 }, scene);
    c.position.set(x, 1.25, z); c.rotation.y = yawRad;
    c.material = solid('nc-cont-' + hex, hex);
    fix(c);
    const rib = MeshBuilder.CreateBox('nc-container-rib', { width: 2.56, height: 0.4, depth: 5.66 }, scene);
    rib.position.set(x, 2.1, z); rib.rotation.y = yawRad;
    rib.material = darkShell;
  };
  container(25.5, -21, 0, '#4a3c66');
  container(25.5, -26.5, 0.06, '#31598c');
  container(18, -26.8, Math.PI / 2 - 0.04, '#7a4a3a');
  // dock canopy over the crate stack
  for (const px of [16.5, 23.5]) {
    const post = MeshBuilder.CreateBox('nc-dock-p', { width: 0.18, height: 3.4, depth: 0.18 }, scene);
    post.position.set(px, 1.7, -23.5); post.material = steel;
    fix(post);
  }
  const dockRoof = MeshBuilder.CreateBox('nc-dock-roof', { width: 8.6, height: 0.14, depth: 6.4 }, scene);
  dockRoof.position.set(20, 3.42, -22); dockRoof.rotation.x = 0.05; dockRoof.material = steelLight;
  const pallet = MeshBuilder.CreateBox('nc-pallet', { width: 1.2, height: 0.14, depth: 1.2 }, scene);
  pallet.position.set(16.5, 0.07, -21.5); pallet.material = wood;

  // ============ training-course sign ============
  const trainSign = MeshBuilder.CreatePlane('nc-train-sign', { width: 3.4, height: 0.78 }, scene);
  trainSign.position.set(10, 2.7, -7.1); trainSign.rotation.y = Math.PI;
  trainSign.material = drawnMat(scene, 'nc-train-sign', (ctx, w, h) => {
    ctx.fillStyle = '#141821'; ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 50px ui-monospace, Menlo, monospace';
    ctx.fillStyle = '#9db4d6';
    ctx.fillText('FIELD TRAINING COURSE', w / 2, 48);
    ctx.font = '700 30px ui-monospace, Menlo, monospace';
    ctx.fillStyle = '#5d6f8f';
    ctx.fillText('movement practice — nothing graded', w / 2, 116);
  }, 768, 150);
  trainSign.material.backFaceCulling = false;
  for (const px of [8.5, 11.5]) {
    const post = MeshBuilder.CreateBox('nc-train-p', { width: 0.1, height: 2.6, depth: 0.1 }, scene);
    post.position.set(px, 1.3, -7.1); post.material = steel;
  }

  // ============ east gate to the field site ============
  const gate = new TransformNode('nc-gate', scene);
  for (const gz of [-2.6, 2.6]) {
    const pylon = MeshBuilder.CreateBox('nc-gate-p', { width: 0.5, height: 3.6, depth: 0.5 }, scene);
    pylon.parent = gate; pylon.position.set(29.4, 1.8, gz); pylon.material = darkShell;
  }
  const beam = MeshBuilder.CreateBox('nc-gate-b', { width: 0.55, height: 0.4, depth: 5.7 }, scene);
  beam.parent = gate; beam.position.set(29.4, 3.8, 0); beam.material = steel;
  const gateSign = MeshBuilder.CreatePlane('nc-gate-sign', { width: 4.6, height: 0.62 }, scene);
  gateSign.parent = gate; gateSign.position.set(29.1, 3.8, 0); gateSign.rotation.y = Math.PI / 2;
  gateSign.material = drawnMat(scene, 'nc-gate-sign', (ctx, w, h) => {
    ctx.fillStyle = '#141821'; ctx.fillRect(0, 0, w, h);
    ctx.font = '700 54px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8c07a';
    ctx.fillText('FIELD SITE → shuttle on dispatch', w / 2, h / 2);
  }, 1024, 128);
  gateSign.material.backFaceCulling = false;

  // ============ perimeter fence + corner floodlights (visual; colliders above) ============
  const railLen = (a: number, b: number) => ({ len: b - a, mid: (a + b) / 2 });
  const mkRail = (horizontal: boolean, fixedCoord: number, a: number, b: number, y: number) => {
    const { len, mid } = railLen(a, b);
    const r = MeshBuilder.CreateBox('nc-fence-r', {
      width: horizontal ? len : 0.07, height: 0.09, depth: horizontal ? 0.07 : len,
    }, scene);
    r.position.set(horizontal ? mid : fixedCoord, y, horizontal ? fixedCoord : mid);
    r.material = steelLight;
    r.metadata = { noShadow: true };
  };
  for (const y of [0.8, 1.55]) {
    mkRail(true, 29.7, -29.7, 29.7, y); //  north (z=+29.7)
    mkRail(true, -29.7, -29.7, 29.7, y); // south
    mkRail(false, -29.7, -29.7, 29.7, y); // west
    mkRail(false, 29.7, 2.6, 29.7, y); //   east above gate
    mkRail(false, 29.7, -29.7, -2.6, y); // east below gate
  }
  for (let p = -27; p <= 27; p += 6) {
    for (const [x, z] of [[p, 29.7], [p, -29.7], [-29.7, p], [29.7, p]] as const) {
      if (x === 29.7 && Math.abs(z) < 3) continue; // gate gap
      const post = MeshBuilder.CreateBox('nc-fence-p', { width: 0.13, height: 2.0, depth: 0.13 }, scene);
      post.position.set(x, 1.0, z);
      post.material = steel;
      post.metadata = { noShadow: true };
    }
  }
  for (const [x, z] of [[-28, -28], [28, -28], [-28, 28], [28, 28]] as const) {
    const pole = MeshBuilder.CreateCylinder('nc-flood-p', { diameter: 0.24, height: 6.8, tessellation: 8 }, scene);
    pole.position.set(x, 3.4, z); pole.material = steel;
    const head = MeshBuilder.CreateBox('nc-flood-h', { width: 0.9, height: 0.4, depth: 0.5 }, scene);
    head.position.set(x * 0.985, 6.9, z * 0.985);
    head.lookAt(new Vector3(0, 1, 0));
    head.material = steel;
    const lens = MeshBuilder.CreatePlane('nc-flood-l', { width: 0.8, height: 0.3 }, scene);
    lens.position.set(x * 0.978, 6.85, z * 0.978);
    lens.lookAt(new Vector3(0, 0.4, 0));
    lens.material = warmLamp;
  }

  // ============ area placards (what is this corner for?) ============
  const placard = (x: number, z: number, yawRad: number, titleText: string, sub: string, accent: string) => {
    const post = MeshBuilder.CreateBox('nc-placard-p', { width: 0.1, height: 1.5, depth: 0.1 }, scene);
    post.position.set(x, 0.75, z); post.material = steel;
    const p = MeshBuilder.CreatePlane('nc-placard', { width: 1.7, height: 0.62 }, scene);
    p.position.set(x, 1.75, z); p.rotation.y = yawRad;
    p.material = drawnMat(scene, 'nc-placard-' + titleText, (ctx, w, h) => {
      ctx.fillStyle = '#141821'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = accent; ctx.fillRect(0, 0, 10, h);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '700 44px ui-monospace, Menlo, monospace';
      ctx.fillStyle = accent;
      ctx.fillText(titleText, 30, 46);
      ctx.font = '700 27px ui-monospace, Menlo, monospace';
      ctx.fillStyle = '#7d8aa5';
      ctx.fillText(sub, 30, 106);
    }, 512, 150);
    p.metadata = { noShadow: true };
  };
  placard(-13.6, 8.5, -Math.PI / 2, 'OPS BULLPEN', 'day shift’s desks — quiet now', '#9db4d6');
  placard(-4.6, -12.4, Math.PI, 'KAFFEINE', 'morale support unit', '#e8c07a');

  // ============ light posts + planters ============
  for (const [x, z] of [[-1, 11], [7, 11], [15, -2], [23, -2], [-15, 10.5], [-6, -8]] as const) {
    const pole = MeshBuilder.CreateCylinder('nc-lamp-p', { diameter: 0.12, height: 3.1, tessellation: 8 }, scene);
    pole.position.set(x, 1.55, z); pole.material = steel;
    const head = MeshBuilder.CreateBox('nc-lamp-h', { width: 0.34, height: 0.16, depth: 0.34 }, scene);
    head.position.set(x, 3.16, z); head.material = warmLamp;
  }
  const planter = (x: number, z: number) => {
    const box = MeshBuilder.CreateBox('nc-planter', { width: 1.5, height: 0.5, depth: 1.5 }, scene);
    box.position.set(x, 0.25, z); box.material = concrete;
    fix(box);
    const dirt = MeshBuilder.CreateBox('nc-planter-s', { width: 1.34, height: 0.08, depth: 1.34 }, scene);
    dirt.position.set(x, 0.51, z); dirt.material = soil;
    const tr = MeshBuilder.CreateCylinder('nc-tree-t', { diameter: 0.14, height: 0.7, tessellation: 8 }, scene);
    tr.position.set(x, 0.85, z); tr.material = trunk;
    const c1 = MeshBuilder.CreateCylinder('nc-tree-c1', { diameterTop: 0.05, diameterBottom: 1.25, height: 1.1, tessellation: 8 }, scene);
    c1.position.set(x, 1.7, z); c1.material = leaf;
    const c2 = MeshBuilder.CreateCylinder('nc-tree-c2', { diameterTop: 0.03, diameterBottom: 0.85, height: 0.85, tessellation: 8 }, scene);
    c2.position.set(x, 2.4, z); c2.material = leaf;
  };
  planter(-16, -10); planter(-6, -17.5); planter(10, -12.5);
  planter(16, 8); planter(-2, 14); planter(-22, -4);

  // ============ live dashboard refresh (render-side, cosmetic cadence) ============
  let frames = 0;
  scene.onBeforeRenderObservable.add(() => {
    frames++;
    if (frames % 360 === 1) for (const r of redraws) r();
  });

  return { spawn: new Vector3(0, 0.2, 6), crates, statusBoard, toolbox };
}
