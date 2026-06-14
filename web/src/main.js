import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { COURSE } from './content.js';
import { World } from './world.js';
import { Journey } from './journey.js';

const $ = (id) => document.getElementById(id);

// ---------- three.js setup ----------
const app = $('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
app.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
Object.assign(labelRenderer.domElement.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'none' });
app.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e1016);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(-0.5, 13, 16.5);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-0.8, 0.3, 0);
controls.enableDamping = true;
controls.update();

scene.add(new THREE.AmbientLight(0xffffff, 0.85));
const sun = new THREE.DirectionalLight(0xffffff, 1.05); sun.position.set(4, 12, 6); scene.add(sun);
const fill = new THREE.DirectionalLight(0x9fb4d0, 0.35); fill.position.set(-6, 6, -4); scene.add(fill);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); labelRenderer.setSize(innerWidth, innerHeight);
});

// ---------- progress (localStorage) ----------
const PKEY = 'learnaws.progress';
let progress = (() => { try { return JSON.parse(localStorage.getItem(PKEY) || '{}'); } catch { return {}; } })();
const masteryOf = (id) => (progress[id] && progress[id].mastery) || 'Not started';
const bestOf = (id) => (progress[id] && progress[id].best) || 0;
function record(id, m, b) {
  const cur = progress[id] || {};
  progress[id] = { mastery: m, best: Math.max(b, cur.best || 0) };
  localStorage.setItem(PKEY, JSON.stringify(progress));
}

// ---------- state ----------
let world = null, journey = null, topic = null, mode = 'story', showAnalogy = false;
let inspectorReal = false, selectedId = null;
let quiz = null, qi = 0, correctCount = 0, answered = false, picked = new Set(), lastTapped = null;

function showScreen(name) {
  for (const s of document.querySelectorAll('.screen')) s.classList.remove('active');
  $('screen-' + name).classList.add('active');
}

// ---------- course map ----------
function openCourseMap() {
  const list = $('topic-list'); list.innerHTML = '';
  for (const t of COURSE.topics) {
    const card = document.createElement('div'); card.className = 'topic-card';
    const m = masteryOf(t.id), b = bestOf(t.id);
    card.innerHTML = `<h2>${t.title}</h2>
      <div class="meta">${t.examDomain} &nbsp;•&nbsp; Mastery: ${m}${b ? ' &nbsp;•&nbsp; Best: ' + b + '%' : ''}</div>
      <p>${t.summary}</p>`;
    const btn = document.createElement('button'); btn.className = 'primary';
    btn.textContent = m === 'Not started' ? 'Start' : (m === 'Mastered' ? 'Review' : 'Continue');
    btn.onclick = () => openTopic(t);
    card.appendChild(btn); list.appendChild(card);
  }
  showScreen('map');
}

// ---------- topic ----------
function openTopic(t) {
  if (world) world.dispose();
  topic = t; mode = 'story'; showAnalogy = false; selectedId = null;
  $('inspector').classList.add('hidden');
  $('p-analogy').classList.add('hidden');
  world = new World(scene, t);
  world.setMode('story');
  journey = new Journey(world, controls, onStage);
  camera.position.set(-0.5, 13, 16.5);
  journey.begin();
  $('p-scrub').max = String(journey.count - 1);
  showScreen('topic');
}

function onStage(stage, i, count) {
  $('t-title').textContent = topic.title;
  $('t-stage').textContent = `Stage ${i + 1}/${count}: ${stage.title}`;
  $('p-narr').textContent = (mode === 'story' && stage.storyNarration) ? stage.storyNarration : stage.narration;
  updateAnalogy(stage);
  $('p-key').textContent = 'KEY POINT — ' + stage.concept;
  $('p-scrub').value = String(i);
  $('b-view').textContent = mode === 'story' ? 'View: Story' : 'View: Architecture';
  $('b-prev').disabled = i === 0;
  $('b-next').disabled = i === count - 1;
  $('b-assess').classList.toggle('hidden', i !== count - 1);
}
function updateAnalogy(stage) {
  const el = $('p-analogy');
  if (!showAnalogy) { el.classList.add('hidden'); return; }
  const other = mode === 'story' ? stage.narration : stage.storyNarration;
  if (!other) { el.classList.add('hidden'); return; }
  el.textContent = (mode === 'story' ? 'In AWS:  ' : 'In the kitchen:  ') + other;
  el.classList.remove('hidden');
}

function setView(m) {
  mode = m;
  if (m === 'arch') camera.position.set(0, 16, 21); else camera.position.set(-0.5, 13, 16.5);
  journey.setMode(m);
  $('inspector').classList.add('hidden');
}

// ---------- inspector ----------
function selectBlock(id) {
  const spec = topic.blocks.find((b) => b.id === id); if (!spec) return;
  selectedId = id; inspectorReal = false;
  $('insp-tangible').classList.add('on'); $('insp-real').classList.remove('on');
  renderInspector();
  $('inspector').classList.remove('hidden');
}
function renderInspector() {
  const spec = topic.blocks.find((b) => b.id === selectedId); if (!spec) return;
  $('insp-name').textContent = mode === 'story' && spec.story.prop ? spec.story.name : spec.name;
  $('insp-body').textContent = inspectorReal ? spec.real : spec.plain;
}

// ---------- assessment ----------
function startAssessment() {
  quiz = topic.quiz; qi = 0; correctCount = 0;
  showScreen('assess'); renderQuestion();
}
function renderQuestion() {
  answered = false; picked = new Set(); lastTapped = null;
  const q = quiz[qi];
  $('a-progress').textContent = `Question ${qi + 1} of ${quiz.length}`;
  $('a-prompt').textContent = q.prompt;
  $('a-explain').classList.add('hidden');
  $('a-next').classList.add('hidden');
  $('a-submit').classList.remove('hidden');
  $('a-submit').disabled = q.kind === 'tapfix';
  const opts = $('a-options'); opts.innerHTML = '';
  if (q.kind === 'tapfix') {
    const note = document.createElement('div'); note.className = 'sub';
    note.id = 'tap-note'; note.textContent = 'Tap the component in the scene. You tapped: (nothing yet)';
    opts.appendChild(note);
  } else {
    q.options.forEach((text, idx) => {
      const b = document.createElement('button'); b.className = 'opt'; b.textContent = text;
      b.onclick = () => {
        if (answered) return;
        if (q.kind === 'single') { picked = new Set([idx]); }
        else { picked.has(idx) ? picked.delete(idx) : picked.add(idx); }
        [...opts.children].forEach((c, ci) => c.classList.toggle('sel', picked.has(ci)));
      };
      opts.appendChild(b);
    });
  }
}
function submitAnswer() {
  const q = quiz[qi]; if (answered) return; let ok;
  if (q.kind === 'tapfix') { ok = lastTapped === q.tapTarget; }
  else {
    const want = new Set(q.correct);
    ok = picked.size === want.size && [...picked].every((p) => want.has(p));
    [...$('a-options').children].forEach((c, ci) => {
      if (q.correct.includes(ci)) c.classList.add('correct');
      else if (picked.has(ci)) c.classList.add('wrong');
    });
  }
  if (ok) correctCount++;
  answered = true;
  const ex = $('a-explain'); ex.textContent = (ok ? 'Correct. ' : 'Not quite. ') + q.explain; ex.classList.remove('hidden');
  $('a-submit').classList.add('hidden');
  $('a-next').textContent = qi === quiz.length - 1 ? 'See results' : 'Next ›';
  $('a-next').classList.remove('hidden');
}
function nextQuestion() { if (qi < quiz.length - 1) { qi++; renderQuestion(); } else showResults(); }
function showResults() {
  const pct = Math.round((correctCount / quiz.length) * 100);
  const passed = pct >= 80;
  record(topic.id, passed ? 'Mastered' : 'Assessed', pct);
  $('r-score').textContent = `${pct}%  (${correctCount}/${quiz.length})`;
  $('r-msg').textContent = passed ? 'Passed — you can run this kitchen through a bad night.' : 'Keep going — you need 80% to master this topic.';
  $('r-mastery').textContent = 'Mastery: ' + masteryOf(topic.id);
  showScreen('results');
}

// ---------- input: click a block ----------
const ray = new THREE.Raycaster();
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
  if (moved > 6 || !world) return;
  ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
  const hits = ray.intersectObjects(world.raycastTargets(), true);
  if (!hits.length) return;
  let o = hits[0].object; while (o && o.userData.blockId === undefined) o = o.parent;
  if (!o) return; const id = o.userData.blockId;
  const active = document.querySelector('.screen.active').id;
  if (active === 'screen-topic') selectBlock(id);
  else if (active === 'screen-assess' && quiz[qi].kind === 'tapfix') {
    lastTapped = id; $('a-submit').disabled = false;
    const nm = topic.blocks.find((b) => b.id === id);
    $('tap-note').textContent = 'Tap the component in the scene. You tapped: ' + (nm ? nm.name : id);
  }
});

// ---------- wire buttons ----------
$('b-prev').onclick = () => journey.prev();
$('b-next').onclick = () => journey.next();
$('b-replay').onclick = () => journey.replay();
$('b-view').onclick = () => setView(mode === 'story' ? 'arch' : 'story');
$('b-analogy').onclick = () => { showAnalogy = !showAnalogy; updateAnalogy(journey.stage); };
$('b-assess').onclick = startAssessment;
$('b-map').onclick = openCourseMap;
$('p-scrub').oninput = (e) => journey.goto(parseInt(e.target.value, 10));
$('insp-tangible').onclick = () => { inspectorReal = false; $('insp-tangible').classList.add('on'); $('insp-real').classList.remove('on'); renderInspector(); };
$('insp-real').onclick = () => { inspectorReal = true; $('insp-real').classList.add('on'); $('insp-tangible').classList.remove('on'); renderInspector(); };
$('insp-close').onclick = () => $('inspector').classList.add('hidden');
$('a-submit').onclick = submitAnswer;
$('a-next').onclick = nextQuestion;
$('r-back').onclick = openCourseMap;
$('r-retry').onclick = startAssessment;

// ---------- render loop ----------
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now(); const dt = Math.min((now - last) / 1000, 0.05); last = now;
  controls.update();
  if (journey) journey.update(dt);
  if (world) world.update(dt);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
});

openCourseMap();
console.log('[learn-aws] app ready');
