import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { COURSE } from './content.js';
import { World } from './world.js';
import { Journey } from './journey.js';

const $ = (id) => document.getElementById(id);

// ---------- three.js setup ----------
const app = $('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
Object.assign(labelRenderer.domElement.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'none' });
app.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e1016);
scene.fog = new THREE.Fog(0x0e1016, 34, 95); // night haze so the distant exterior skyline fades; interiors stay crisp
// Image-based lighting so PBR materials (incl. loaded glTF models) light realistically.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(-0.5, 13, 16.5);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-0.8, 0.3, 0);
controls.enableDamping = true;
controls.update();
window.__camera = camera; window.__controls = controls; // dev hooks for preview verification

// Cinematic camera ease — used to "arrive" into a topic and to smooth view toggles.
let camTween = null;
function flyCamera(to, dur = 1.4) {
  camTween = { from: camera.position.clone(), to: new THREE.Vector3(to[0], to[1], to[2]), t: 0, dur };
}

scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x35301f, 0.6));   // sky / warm-ground ambient
const sun = new THREE.DirectionalLight(0xfff1dc, 1.2); sun.position.set(6, 14, 8);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 50;
sun.shadow.camera.left = -15; sun.shadow.camera.right = 15; sun.shadow.camera.top = 15; sun.shadow.camera.bottom = -15;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun);
const fill = new THREE.DirectionalLight(0x9fb4d0, 0.28); fill.position.set(-6, 6, -4); scene.add(fill);

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

// ---------- exam history (localStorage) ----------
const HKEY = 'learnaws.examhistory';
let examHistory = (() => { try { return JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch { return []; } })();
function recordExam(entry) {
  examHistory.push(entry);
  if (examHistory.length > 50) examHistory = examHistory.slice(-50);
  localStorage.setItem(HKEY, JSON.stringify(examHistory));
}

// ---------- state ----------
let world = null, journey = null, topic = null, mode = 'story', showAnalogy = false;
let inspectorReal = false, selectedId = null;
let quiz = null, qi = 0, correctCount = 0, answered = false, picked = new Set(), lastTapped = null;
let examMode = false, examItems = [], examDomain = null; // mock exam / domain practice: pooled questions
let examTimerId = null, examEndsAt = 0, examStartedAt = 0, examTimed = false, examTimedOut = false; // timed full-exam simulation

function showScreen(name) {
  for (const s of document.querySelectorAll('.screen')) s.classList.remove('active');
  $('screen-' + name).classList.add('active');
}

// ---------- course map ----------
// Per-topic card presentation: kitchen glyph, category accent, difficulty level (1=Foundational,
// 2=Core, 3=Advanced — also used to order topics within a domain).
const CARD = {
  'ha-web-app': { icon: '🍳', accent: '#f2b25a', level: 1 },
  'store-serve-content': { icon: '🥫', accent: '#d9842e', level: 1 },
  'secure-access-iam': { icon: '🔑', accent: '#d15656', level: 1 },
  'network-boundaries-vpc': { icon: '🚪', accent: '#3585c6', level: 1 },
  'decouple-with-queue-sqs': { icon: '🧾', accent: '#33b38c', level: 2 },
  'go-serverless-lambda': { icon: '⚡', accent: '#f0a92e', level: 2 },
  'pick-the-pantry': { icon: '🗄️', accent: '#7d66d1', level: 2 },
  'cache-hot-items': { icon: '🍽️', accent: '#3aa9b5', level: 2 },
  'optimise-cost': { icon: '💰', accent: '#67ad5b', level: 1 },
  'monitor-cloudwatch': { icon: '📊', accent: '#b06ed1', level: 2 },
  'block-vs-file-storage': { icon: '🧊', accent: '#d9842e', level: 2 },
  'fan-out-sns': { icon: '📣', accent: '#d98a8a', level: 2 },
  'dns-routing-route53': { icon: '🧭', accent: '#5a8fd1', level: 2 },
  'disaster-recovery': { icon: '🛟', accent: '#cf6b6b', level: 3 },
  'containers-ecs': { icon: '📦', accent: '#4f9ed1', level: 2 },
  'encrypt-with-kms': { icon: '🔐', accent: '#d15656', level: 2 },
  'protect-the-edge': { icon: '🛡️', accent: '#cf6b4a', level: 3 },
  'api-front-door': { icon: '🪟', accent: '#4f86c6', level: 2 },
  'orchestrate-step-functions': { icon: '🔀', accent: '#9a86e6', level: 3 },
  'auto-scaling': { icon: '📈', accent: '#e89a3a', level: 2 },
  'analyse-the-data': { icon: '🔎', accent: '#4aa6a0', level: 3 },
  'manage-secrets': { icon: '🗝️', accent: '#d15656', level: 2 },
  'watch-the-bill': { icon: '💵', accent: '#67ad5b', level: 1 },
  'aurora-database': { icon: '🛢️', accent: '#7d66d1', level: 3 },
  'connect-networks': { icon: '🔗', accent: '#3585c6', level: 2 },
  'keep-it-stateless': { icon: '🔁', accent: '#5a8fd1', level: 2 },
  'route-events-eventbridge': { icon: '🚦', accent: '#9a86e6', level: 3 },
  'stream-data-kinesis': { icon: '🌊', accent: '#33b38c', level: 3 },
  'right-storage-class': { icon: '🏷️', accent: '#d9842e', level: 2 },
  'choose-compute': { icon: '⚙️', accent: '#f0a92e', level: 1 },
  'hybrid-connectivity': { icon: '🔌', accent: '#3585c6', level: 3 },
  'detect-threats': { icon: '📹', accent: '#d15656', level: 3 },
  'global-accelerator': { icon: '🚀', accent: '#33b38c', level: 3 },
  'user-signin-cognito': { icon: '🪪', accent: '#d15656', level: 2 },
  'iac-cloudformation': { icon: '📜', accent: '#5a8fd1', level: 3 },
  'audit-cloudtrail': { icon: '📒', accent: '#cf6b4a', level: 2 },
  'sg-vs-nacl': { icon: '🧱', accent: '#d15656', level: 3 },
  'multiaz-vs-replicas': { icon: '⚖️', accent: '#5a8fd1', level: 3 },
  'pick-messaging': { icon: '📬', accent: '#5a8fd1', level: 2 },
  'scale-up-vs-out': { icon: '↔️', accent: '#67ad5b', level: 2 },
  'private-egress-nat': { icon: '🛣️', accent: '#3585c6', level: 2 },
  's3-protection': { icon: '🗂️', accent: '#d9842e', level: 2 },
  'govern-accounts': { icon: '🏛️', accent: '#67ad5b', level: 3 },
  'vpc-endpoints': { icon: '🔒', accent: '#67ad5b', level: 3 },
  'centralize-backups': { icon: '💽', accent: '#5a8fd1', level: 2 },
  'migrate-data': { icon: '🚚', accent: '#5a8fd1', level: 2 },
  'stay-compliant': { icon: '📋', accent: '#d15656', level: 3 },
  'ssm-session': { icon: '🖥️', accent: '#d15656', level: 2 },
};
const LEVEL_NAME = { 1: 'Foundational', 2: 'Core', 3: 'Advanced' };
// The four SAA-C03 exam domains, in order, with a short label, blurb and accent.
const DOMAINS = [
  { key: 'Design Secure Architectures', label: 'Secure architectures', blurb: 'Identity, network boundaries, encryption and edge defense.', accent: '#d15656' },
  { key: 'Design Resilient Architectures', label: 'Resilient architectures', blurb: 'Decouple, span AZs and regions, recover, and observe.', accent: '#5a8fd1' },
  { key: 'Design High-Performing Architectures', label: 'High-performing architectures', blurb: 'The right data store, caching, delivery and scale.', accent: '#33b38c' },
  { key: 'Design Cost-Optimized Architectures', label: 'Cost-optimized architectures', blurb: 'Pay for what you use; right-size and commit.', accent: '#67ad5b' },
];
const meta = (id) => CARD[id] || { icon: '•', accent: '#9ea3a0', level: 2 };

// Learning order: by domain (DOMAINS order), then difficulty level, then course order.
function orderedTopics() {
  const di = (t) => { const i = DOMAINS.findIndex((d) => d.key === t.examDomain); return i < 0 ? 99 : i; };
  return COURSE.topics.map((t, i) => ({ t, i }))
    .sort((a, b) => di(a.t) - di(b.t) || meta(a.t.id).level - meta(b.t.id).level || a.i - b.i)
    .map((x) => x.t);
}
const nextTopic = () => orderedTopics().find((t) => masteryOf(t.id) !== 'Mastered') || null;

function makeTopicCard(t) {
  const m = masteryOf(t.id), b = bestOf(t.id), th = meta(t.id);
  const badge = m === 'Mastered' ? `<span class="badge mastered">✓ Mastered${b ? ' · ' + b + '%' : ''}</span>`
    : m === 'Assessed' ? `<span class="badge assessed">Assessed${b ? ' · ' + b + '%' : ''}</span>`
      : `<span class="badge new">Not started</span>`;
  const card = document.createElement('div'); card.className = 'topic-card';
  card.style.setProperty('--card-accent', th.accent);
  card.tabIndex = 0; card.setAttribute('role', 'button');
  card.innerHTML = `
    <div class="card-glyph">${th.icon}</div>
    <div class="card-body">
      <div class="card-row"><h2>${t.title}</h2>${badge}</div>
      <div class="meta"><span class="chip lvl${th.level}">${LEVEL_NAME[th.level]}</span></div>
      <p>${t.summary}</p>
    </div>
    <div class="card-cta">›</div>`;
  card.onclick = () => openTopic(t);
  card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTopic(t); } };
  return card;
}

function openCourseMap() {
  examMode = false; examDomain = null; stopExamTimer(); examTimed = false;
  const total = COURSE.topics.length;
  const mastered = COURSE.topics.filter((t) => masteryOf(t.id) === 'Mastered').length;
  const started = COURSE.topics.filter((t) => masteryOf(t.id) !== 'Not started').length;

  // Overview: overall progress + a Continue/Start CTA + a Mock exam across all topics.
  const ov = $('map-overview');
  const fullHist = examHistory.filter((h) => h.scopeKey === 'full');
  const examStat = fullHist.length
    ? `<div class="ov-stat">Mock exam — last <b class="inline">${fullHist[fullHist.length - 1].pct}%</b> · best <b class="inline">${Math.max(...fullHist.map((h) => h.pct))}%</b></div>`
    : '';
  ov.innerHTML = `<div class="ov-stat"><b>${mastered}</b> / ${total} mastered</div>
    <div class="ov-bar"><i style="width:${Math.round((mastered / total) * 100)}%"></i></div>${examStat}`;
  const nxt = nextTopic();
  if (nxt) {
    const btn = document.createElement('button'); btn.className = 'primary';
    btn.textContent = (started === 0 ? 'Start: ' : 'Continue: ') + nxt.title;
    btn.onclick = () => openTopic(nxt);
    ov.appendChild(btn);
  } else {
    const done = document.createElement('div'); done.className = 'ov-stat'; done.textContent = '🎉 All topics mastered';
    ov.appendChild(done);
  }
  const exam = document.createElement('button'); exam.textContent = `🎓 Mock exam (${EXAM_LEN} Q)`;
  exam.onclick = () => startMockExam();
  ov.appendChild(exam);
  const find = document.createElement('button'); find.textContent = '🔎 Find a topic';
  find.title = 'Press / to search from anywhere';
  find.onclick = openFind;
  ov.appendChild(find);

  // One section per exam domain, with its own progress, holding a grid of topic cards.
  const list = $('topic-list'); list.innerHTML = '';
  const ordered = orderedTopics();
  for (const d of DOMAINS) {
    const topics = ordered.filter((t) => t.examDomain === d.key);
    if (!topics.length) continue;
    const dm = topics.filter((t) => masteryOf(t.id) === 'Mastered').length;
    const sec = document.createElement('section'); sec.className = 'domain-section';
    sec.style.setProperty('--domain-accent', d.accent);
    sec.innerHTML = `
      <div class="domain-head"><span class="dot"></span><h2>${d.label}</h2><span class="dom-prog">${dm} / ${topics.length}</span></div>
      <p class="domain-blurb">${d.blurb}</p>
      <div class="domain-bar"><i style="width:${Math.round((dm / topics.length) * 100)}%"></i></div>`;
    const pb = document.createElement('button'); pb.className = 'dom-practice'; pb.textContent = 'Practice'; pb.title = 'Practice questions from this domain';
    pb.onclick = () => startMockExam(d.key);
    sec.querySelector('.domain-head').appendChild(pb);
    const grid = document.createElement('div'); grid.className = 'domain-grid';
    for (const t of topics) grid.appendChild(makeTopicCard(t));
    sec.appendChild(grid);
    list.appendChild(sec);
  }
  showScreen('map');
}

// ---------- find / search ----------
// One searchable record per topic: a flat "haystack" of every word a learner
// might type (titles, summaries, AWS service names, plain + real descriptions,
// stage concepts) plus the service terms we can surface as "why it matched".
let findIndex = null;
function buildFindIndex() {
  findIndex = orderedTopics().map((t) => {
    const parts = [t.title, t.summary, t.examDomain, LEVEL_NAME[meta(t.id).level]];
    const blocks = [];
    for (const b of (t.blocks || [])) {
      const bits = [b.name, b.plain, b.real, b.code, b.story && b.story.name].filter(Boolean);
      parts.push(...bits);
      if (b.name) blocks.push({ name: b.name, text: bits.join(' ').toLowerCase() });
    }
    for (const s of (t.stages || [])) parts.push(s.concept, s.title);
    return { t, hay: parts.filter(Boolean).join(' · ').toLowerCase(), blocks };
  });
}
// Which services/components in this lesson did the search actually touch — shown as chips.
function findHits(entry, words) {
  const seen = new Set(), hits = [];
  for (const b of entry.blocks) {
    const low = b.name.toLowerCase();
    if (words.some((w) => b.text.includes(w)) && !seen.has(low)) { seen.add(low); hits.push(b.name); }
  }
  return hits.slice(0, 4);
}
function renderFind(query) {
  if (!findIndex) buildFindIndex();
  const raw = (query || '').trim();
  const words = raw ? raw.toLowerCase().split(/\s+/) : [];
  const matches = findIndex.filter((e) => words.every((w) => e.hay.includes(w)));
  $('find-count').textContent = raw
    ? `${matches.length} ${matches.length === 1 ? 'match' : 'matches'} for “${raw}”`
    : `${findIndex.length} topics across ${DOMAINS.length} domains — start typing to filter`;
  const list = $('find-list'); list.innerHTML = '';
  if (!matches.length) {
    const empty = document.createElement('p'); empty.className = 'find-empty';
    empty.textContent = 'No topics match. Try a service name (e.g. “Lambda”) or a concept (e.g. “stateless”).';
    list.appendChild(empty); return;
  }
  const grid = document.createElement('div'); grid.className = 'domain-grid';
  for (const e of matches) {
    const card = makeTopicCard(e.t);
    const hits = words.length ? findHits(e, words) : [];
    if (hits.length) {
      const hit = document.createElement('div'); hit.className = 'find-hit';
      hit.innerHTML = hits.map((h) => `<span>${esc(h)}</span>`).join('');
      card.querySelector('.card-body').appendChild(hit);
    }
    grid.appendChild(card);
  }
  list.appendChild(grid);
}
function openFind() {
  examMode = false; examDomain = null; stopExamTimer(); examTimed = false;
  $('find-input').value = '';
  renderFind('');
  showScreen('find');
  setTimeout(() => $('find-input').focus(), 30);
}

// ---------- topic ----------
function openTopic(t) {
  if (world) world.dispose();
  topic = t; mode = 'story'; showAnalogy = false; selectedId = null;
  $('inspector').classList.add('hidden');
  $('p-analogy').classList.add('hidden');
  world = new World(scene, t);
  window.__world = world; // dev hook for preview verification
  world.setMode('story');
  journey = new Journey(world, controls, onStage);
  const van = vantage('story', t);
  camera.position.set(van[0] + 1.5, van[1] + 4, van[2] + 5.5); // hold wide behind the intro...
  journey.begin();
  $('p-scrub').max = String(journey.count - 1);
  showScreen('topic');
  showIntro(t);                                                 // ...the fly-in plays when they Begin
}

// Lesson intro: objectives derived from the stage concepts.
function showIntro(t) {
  const th = meta(t.id), dom = DOMAINS.find((d) => d.key === t.examDomain);
  $('intro').style.setProperty('--intro-accent', th.accent);
  $('intro-glyph').textContent = th.icon;
  $('intro-domain').textContent = (dom ? dom.label : t.examDomain) + ' · ' + LEVEL_NAME[th.level];
  $('intro-title').textContent = t.title;
  $('intro-sum').textContent = t.summary;
  const learn = [...new Set(t.stages.map((s) => s.concept).filter(Boolean))];
  $('intro-list').innerHTML = learn.map((c) => `<li>${c}</li>`).join('');
  $('intro').classList.remove('hidden');
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

// Camera vantage per view. A `scene` topic backs the story camera off proportional to its bounds so
// the bigger, decorated set frames fully; legacy topics keep their tuned open/restaurant vantages.
function vantage(m, topic) {
  if (m === 'arch') return [0, 16, 21];
  if (topic.scene && topic.scene.bounds) {
    const b = topic.scene.bounds, d = Math.max(b.d || 13, b.w || 22);
    return [b.x ?? -0.75, 12 + d * 0.35, d * 1.25];
  }
  return topic.scenery === 'open' ? [-1, 9.5, 14] : [-0.5, 13, 16.5];
}
function setView(m) {
  mode = m;
  flyCamera(vantage(m, topic), 0.9);
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
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function renderInspector() {
  const spec = topic.blocks.find((b) => b.id === selectedId); if (!spec) return;
  $('insp-name').textContent = mode === 'story' && spec.story.prop ? spec.story.name : spec.name;
  const body = $('insp-body');
  if (inspectorReal) {
    body.innerHTML = `<div>${esc(spec.real)}</div>` + (spec.code ? `<pre class="code">${esc(spec.code)}</pre>` : '');
  } else {
    body.textContent = spec.plain;
  }
}

// ---------- assessment ----------
function startAssessment() {
  examMode = false; examDomain = null; stopExamTimer(); examTimed = false; $('a-title').textContent = 'Assessment'; $('screen-assess').classList.remove('exam');
  quiz = topic.quiz; qi = 0; correctCount = 0;
  showScreen('assess'); renderQuestion();
}

// ---------- mock exam (questions pooled from every topic) ----------
const EXAM_LEN = 20, PRACTICE_LEN = 10, EXAM_SECS_PER_Q = 120; // ~2 min/question, matching the real SAA-C03 pace
const fmtTime = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function stopExamTimer() { if (examTimerId) { clearInterval(examTimerId); examTimerId = null; } $('a-timer').classList.add('hidden'); }
function startExamTimer(totalSecs) {
  stopExamTimer();
  examTimed = true; examTimedOut = false;
  examStartedAt = Date.now(); examEndsAt = examStartedAt + totalSecs * 1000;
  const el = $('a-timer'); el.classList.remove('hidden');
  const tick = () => {
    const remain = (examEndsAt - Date.now()) / 1000;
    el.textContent = '⏱ ' + fmtTime(remain);
    el.classList.toggle('warn', remain <= 300 && remain > 60);
    el.classList.toggle('danger', remain <= 60);
    if (remain <= 0) { // out of time: unanswered count as wrong, jump to results
      examTimedOut = true; stopExamTimer();
      examItems.forEach((e) => { if (e.ok === undefined) e.ok = false; });
      showExamResults();
    }
  };
  tick(); examTimerId = setInterval(tick, 1000);
}
function examPool(domainKey) {
  const topics = domainKey ? COURSE.topics.filter((t) => t.examDomain === domainKey) : COURSE.topics;
  return topics.flatMap((t) => t.quiz.filter((q) => q.kind !== 'tapfix').map((q) => ({ q, topic: t })));
}
// domainKey omitted = full mock exam across all domains; provided = focused practice on one domain.
function startMockExam(domainKey) {
  const pool = examPool(domainKey);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; } // shuffle
  examItems = pool.slice(0, Math.min(domainKey ? PRACTICE_LEN : EXAM_LEN, pool.length));
  examMode = true; examDomain = domainKey || null;
  quiz = examItems.map((e) => e.q); qi = 0; correctCount = 0;
  const dom = domainKey ? DOMAINS.find((d) => d.key === domainKey) : null;
  $('a-title').textContent = dom ? `Practice: ${dom.label}` : 'Mock exam'; $('screen-assess').classList.add('exam');
  examTimed = false; examTimedOut = false;
  if (domainKey) stopExamTimer(); else startExamTimer(examItems.length * EXAM_SECS_PER_Q); // full exam runs on the clock
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
  if (examMode) examItems[qi].ok = ok;
  answered = true;
  const ex = $('a-explain'); ex.textContent = (ok ? 'Correct. ' : 'Not quite. ') + q.explain; ex.classList.remove('hidden');
  $('a-submit').classList.add('hidden');
  $('a-next').textContent = qi === quiz.length - 1 ? 'See results' : 'Next ›';
  $('a-next').classList.remove('hidden');
}
function nextQuestion() { if (qi < quiz.length - 1) { qi++; renderQuestion(); } else if (examMode) showExamResults(); else showResults(); }
function showResults() {
  const pct = Math.round((correctCount / quiz.length) * 100);
  const passed = pct >= 80;
  record(topic.id, passed ? 'Mastered' : 'Assessed', pct);
  $('r-score').textContent = `${pct}%  (${correctCount}/${quiz.length})`;
  $('r-msg').textContent = passed ? 'Passed — you can run this kitchen through a bad night.' : 'Keep going — you need 80% to master this topic.';
  $('r-mastery').textContent = 'Mastery: ' + masteryOf(topic.id);
  $('r-retry').textContent = 'Retry';
  const learn = [...new Set(topic.stages.map((s) => s.concept).filter(Boolean))];
  $('r-recap').innerHTML = '<h3>Key takeaways</h3><ul>' + learn.map((c) => `<li>${c}</li>`).join('') + '</ul>';
  showScreen('results');
}

function showExamResults() {
  const elapsed = examTimed ? (examTimedOut ? null : (Date.now() - examStartedAt) / 1000) : undefined;
  stopExamTimer();
  const pct = Math.round((correctCount / examItems.length) * 100);
  const ready = pct >= 72; // SAA-C03 pass mark is ~720/1000
  const dom = examDomain ? DOMAINS.find((d) => d.key === examDomain) : null;
  $('r-score').textContent = `${pct}%  (${correctCount}/${examItems.length})`;
  const base = ready ? 'On track — you’re around the SAA-C03 pass mark.' : 'Keep studying — aim for ~72%+ across every domain.';
  $('r-msg').textContent = examTimedOut ? 'Time’s up. ' + base : base;
  const timeNote = examTimed ? (examTimedOut ? ' · ⏱ time expired' : ` · ⏱ finished in ${fmtTime(elapsed)}`) : '';
  $('r-mastery').textContent = (dom ? `Practice: ${dom.label}` : 'Mock exam') + ` · ${examItems.length} questions` + timeNote;
  $('r-retry').textContent = dom ? 'Practice again' : 'New exam';
  const tally = {};
  examItems.forEach((e) => { const k = e.topic.examDomain; (tally[k] = tally[k] || { ok: 0, total: 0 }).total++; if (e.ok) tally[k].ok++; });
  const rows = DOMAINS.filter((d) => tally[d.key]).map((d) => {
    const t = tally[d.key], p = Math.round((t.ok / t.total) * 100);
    return `<div class="dom-row"><span class="dom-name">${d.label}</span><span class="dom-mini"><i style="width:${p}%;background:${d.accent}"></i></span><span class="dom-score">${t.ok}/${t.total}</span></div>`;
  }).join('');
  const revisit = [...new Set(examItems.filter((e) => e.ok === false).map((e) => e.topic.title))].slice(0, 5);
  const tip = revisit.length ? `<div class="exam-tip"><b>Revisit:</b> ${revisit.join(' · ')}</div>` : '';
  // record this attempt, then show a trend of recent attempts of the same scope
  const scopeKey = examDomain || 'full';
  recordExam({ t: Date.now(), scopeKey, scopeLabel: dom ? dom.label : 'Mock exam', pct, correct: correctCount, total: examItems.length, timed: examTimed, expired: examTimedOut });
  const hist = examHistory.filter((h) => h.scopeKey === scopeKey);
  let histHtml = '';
  if (hist.length > 1) {
    const recent = hist.slice(-6);
    const best = Math.max(...hist.map((h) => h.pct));
    const prev = hist[hist.length - 2].pct, d = pct - prev;
    const bars = recent.map((h, i) => `<span class="hist-bar${i === recent.length - 1 ? ' latest' : ''}" title="${h.correct}/${h.total}"><i style="height:${Math.max(h.pct, 3)}%"></i><b>${h.pct}</b></span>`).join('');
    const delta = d === 0 ? '· no change from last time'
      : d > 0 ? `· <span class="up">▲ +${d}%</span> from last time` : `· <span class="down">▼ ${d}%</span> from last time`;
    histHtml = `<h3>Your attempts</h3><div class="hist"><div class="hist-bars">${bars}</div><div class="hist-note">Best <b>${best}%</b> ${delta}</div></div>`;
  }
  $('r-recap').innerHTML = `<h3>By domain</h3><div class="dom-rows">${rows}</div>${tip}${histHtml}`;
  // Offer to drill the weakest domain (only meaningful on a full exam with a clear weak spot).
  const weak = DOMAINS.filter((d) => tally[d.key] && tally[d.key].ok < tally[d.key].total)
    .sort((a, b) => (tally[a.key].ok / tally[a.key].total) - (tally[b.key].ok / tally[b.key].total))[0];
  if (!examDomain && weak) {
    const btn = document.createElement('button'); btn.className = 'practice-weak'; btn.textContent = `Practice ${weak.label} →`;
    btn.onclick = () => startMockExam(weak.key);
    $('r-recap').appendChild(btn);
  }
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
$('intro-begin').onclick = () => { $('intro').classList.add('hidden'); flyCamera(vantage('story', topic), 1.6); };
$('intro-back').onclick = openCourseMap;
$('p-scrub').oninput = (e) => journey.goto(parseInt(e.target.value, 10));
$('insp-tangible').onclick = () => { inspectorReal = false; $('insp-tangible').classList.add('on'); $('insp-real').classList.remove('on'); renderInspector(); };
$('insp-real').onclick = () => { inspectorReal = true; $('insp-real').classList.add('on'); $('insp-tangible').classList.remove('on'); renderInspector(); };
$('insp-close').onclick = () => $('inspector').classList.add('hidden');
$('a-submit').onclick = submitAnswer;
$('a-next').onclick = nextQuestion;
$('r-back').onclick = openCourseMap;
$('r-retry').onclick = () => (examMode ? startMockExam(examDomain) : startAssessment());
$('find-map').onclick = openCourseMap;
$('find-input').oninput = (e) => renderFind(e.target.value);
$('find-input').onkeydown = (e) => { if (e.key === 'Escape') openCourseMap(); };
// press "/" anywhere (except while typing or mid-assessment) to jump to search
addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
  const el = document.activeElement, tag = el && el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el && el.isContentEditable)) return;
  if ($('screen-assess').classList.contains('active')) return;
  e.preventDefault(); openFind();
});

// ---------- render loop ----------
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now(); const dt = Math.min((now - last) / 1000, 0.05); last = now;
  if (camTween) {
    camTween.t = Math.min(camTween.t + dt, camTween.dur);
    const k = 1 - Math.pow(1 - camTween.t / camTween.dur, 3); // easeOutCubic
    camera.position.lerpVectors(camTween.from, camTween.to, k);
    if (camTween.t >= camTween.dur) camTween = null;
  }
  controls.update();
  if (journey) journey.update(dt);
  if (world) world.update(dt);
  renderer.render(scene, camera);
  if (world) world.declutterLabels(camera);
  labelRenderer.render(scene, camera);
});

openCourseMap();
console.log('[learn-aws] app ready');
