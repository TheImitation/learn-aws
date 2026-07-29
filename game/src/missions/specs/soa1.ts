import type { MissionSpec } from '../spec';

/** CloudOps Engineer (SysOps) — 8 operations missions: the pager, the fleet,
 *  and the 3 a.m. that automation should own. */

export const SOA_ALARM_SPEC: MissionSpec = {
  ticket: {
    incident: 'OPS-301', reporter: 'the on-call', sev: 'SEV-2', title: 'The Pager That Cried Wolf',
    bodyHtml:
      `<div>200 alarms fired yesterday. 195 meant nothing. Last week a real outage paged three times and was swiped away with the noise — nobody believed it until customers tweeted. The on-call rotation is quietly mutinying.</div>` +
      `<pre>alarms/day ........ ~200\nactionable ........ ~5\nreal incident ..... missed, swiped with the noise</pre>`,
    hint: 'Probe the alarm wall and the missed incident, diagnose, then dial the alerting posture and survive the real-incident drill.',
  },
  objectiveFix: 'Dial alerting to symptom-based + composite alarms',
  objectiveDone: 'OPS-301 closed — the pager only speaks when customers hurt, so people listen.',
  summary: 'Alert fatigue is a signal-to-noise failure: page on SYMPTOMS customers feel (error rate, latency), gate related metrics behind composite alarms so one incident pages once, and demote everything else to dashboards. Silencing everything trades fatigue for blindness; paging on every metric trains humans to swipe. Every page needs a documented action or it isn\'t a page.',
  level: [
    { id: 'alarmwall', kind: 'shelfUnit', at: [-4.5, 1.5], yaw: Math.PI / 2, args: ['#7ab3e0'], service: 'cloudwatch' },
    { id: 'oncall', kind: 'serverRack', at: [4.5, 1.5], yaw: -Math.PI / 2, service: 'none' },
    { id: 'dial', kind: 'aimPointer', at: [0, -1.8] },
    { id: 'lever', kind: 'chaosLever', at: [4, -4.5] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'alert triage', accent: '#7ab3e0' },
    { kind: 'zone', at: [-4.5, 1.5], w: 3.4, d: 3.4, hex: '#1a2433', text: '200 alarms' },
    { kind: 'hazard', at: [4, -5.6], w: 3, d: 0.8 },
  ],
  faultLamps: ['alarmwall'],
  probes: [
    {
      id: 'alarmwall', machine: 'alarmwall', prompt: 'Inspect the alarm wall',
      kicker: 'CloudWatch', title: 'Two hundred voices',
      pre: 'CPU > 70% ......... pages (why?)\ndisk on host 14 ... pages (autoscaled!)\nerror rate ........ pages, lost in the crowd\nactionable ........ 2.5%',
      journal: 'Alarm wall: infrastructure trivia pages like emergencies. The real signals drown in it.',
    },
    {
      id: 'oncall', machine: 'oncall', prompt: 'Inspect the missed incident',
      kicker: 'postmortem', title: 'Swiped with the noise',
      pre: 'real outage ....... paged 3× among 47 others\nresponse .......... swiped (pattern-matched as noise)\ntrust in pager .... gone',
      journal: 'The miss: humans pattern-match. A pager that\'s usually wrong trains the swipe that misses the real one.',
    },
  ],
  diagnosis: {
    unlockedBy: 'alarmwall',
    title: 'How does the pager become trustworthy again?',
    correct: {
      label: 'Page only on customer symptoms, gate related alarms into composites, demote the rest to dashboards',
      journal: 'Diagnosis: alert fatigue. Fewer, truer pages — symptom-based, composite-gated, action-documented.',
      confirmBody: 'Dial the posture: error rate AND latency page (once, together); utilization graphs stay on the wall where they belong.',
      actionLabel: 'To the dial →',
    },
    wrongs: [
      { label: 'Discipline: mandate responding to every alarm', rebuttal: 'Mandating attention to 195 daily non-events is how you lose the on-call team entirely. Fix the signal, not the humans.' },
      { label: 'Add MORE alarms so nothing is missed', rebuttal: 'Coverage isn\'t the problem — credibility is. More noise buries the next real page deeper.' },
      { label: 'Route all alarms to a channel nobody reads', rebuttal: 'That\'s silencing with extra steps. The real incident still needs to page someone who believes it.' },
    ],
  },
  dials: [
    {
      id: 'posture', machine: 'dial', initial: 'everything',
      grabPrompt: '◀ ▶ swing the posture · E/Ⓧ lock',
      positions: [
        { id: 'everything', label: 'Page on everything (status quo)', angle: -0.7 },
        { id: 'symptom', label: 'Symptom-based + composite alarms', angle: 0 },
        { id: 'silence', label: 'Silence the pager (dashboards only)', angle: 0.7 },
      ],
    },
  ],
  levers: [{ id: 'lever-real', machine: 'lever', prompt: 'PULL — real incident (drill)', beat: 'incident' }],
  beats: [
    {
      id: 'incident', label: 'real-incident drill', trigger: 'lever',
      rules: [
        { when: { dial: { posture: 'symptom' } }, pass: true,
          title: '✔ one page, instantly believed', lines: 'composite ......... errors AND latency → ALARM\npages sent ........ 1\nresponse .......... 4 min (they trusted it)', note: 'A quiet pager is a credible pager. One true page beat 47 noisy ones.' },
        { when: { dial: { posture: 'silence' } }, pass: false,
          title: '✘ serene dashboards, burning prod', lines: 'pages ............. 0\noutage duration ... until someone looked', alarm: 'UNSEEN OUTAGE', note: 'Silence trades fatigue for blindness. The fix was precision, not volume zero.' },
        { pass: false, title: '✘ swiped again',
          lines: 'pages that hour ... 47\nreal one .......... #31, swiped', note: 'The noise is still winning. Swing the dial.' },
      ],
    },
    {
      id: 'fatigue', label: 'fatigue audit', trigger: 'terminal',
      rules: [
        { when: { dial: { posture: 'symptom' } }, pass: true,
          title: '✔ 200 → 6, every one actionable', lines: 'daily pages ....... 6\nwith documented action 6/6\ndashboard lines ... the other 194', note: 'Every page has an action; everything else is a graph. The rotation stops mutinying.' },
        { when: { dial: { posture: 'silence' } }, pass: false,
          title: '✘ fatigue solved, observability lost', lines: 'pages ............. 0 forever', note: 'Zero is the wrong number too.' },
        { pass: false, title: '✘ still two hundred',
          lines: 'trust ............. eroding daily', note: 'Swing the dial.' },
      ],
    },
  ],
  verifyDone: {
    title: 'A pager worth wearing',
    body: 'The drill produced one believed page and a four-minute response; the audit shows six daily actionable pages instead of two hundred cries of wolf.',
    journal: 'Verified: symptom-based composite alerting restored pager trust.',
  },
};

export const SOA_RUNBOOK_SPEC: MissionSpec = {
  ticket: {
    incident: 'OPS-302', reporter: 'night shift', sev: 'SEV-3', title: 'Every Tuesday, Forever',
    bodyHtml:
      `<div>Every Tuesday around 3 a.m. the log partition fills on the ingest boxes and a human SSHes in, runs the same four commands from the wiki, and goes back to bed angry. This has happened 41 consecutive Tuesdays.</div>` +
      `<pre>incident .......... disk full (log partition)\nfix ............... same 4 commands, 41 weeks running\ncurrent tooling ... a wiki page and a sleepy human</pre>`,
    hint: 'Probe the pattern and the wiki, diagnose, then seat the automation runbook — and let the 3 a.m. drill run without you.',
  },
  objectiveFix: 'Seat the SSM Automation runbook in the remediation bay',
  objectiveDone: 'OPS-302 closed — Tuesday\'s incident now resolves itself before anyone wakes.',
  summary: 'A deterministic fix with a clear trigger is automation, not staffing: encode the wiki page as an SSM Automation runbook and let the CloudWatch alarm invoke it — IAM-authorized, fleet-capable, fully logged, identical at 3 a.m. and 3 p.m. The wiki page still requires a human awake; SSH-hero culture single-threads production on whoever holds the key. Automate the repeatable; save humans for the novel.',
  level: [
    { id: 'ingest', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2, service: 'ec2' },
    { id: 'wiki', kind: 'shelfUnit', at: [4.5, 1.5], yaw: -Math.PI / 2, args: ['#8a7a22'], service: 'none' },
    { id: 'lever', kind: 'chaosLever', at: [0, -4.5] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'remediation bench', accent: '#7ab3e0' },
    { kind: 'zone', at: [4.5, 1.5], w: 3.2, d: 3.2, hex: '#33260f', text: 'the wiki page' },
    { kind: 'hazard', at: [0, -5.6], w: 3, d: 0.8 },
  ],
  faultLamps: ['ingest'],
  probes: [
    {
      id: 'ingest', machine: 'ingest', prompt: 'Inspect the ingest fleet',
      kicker: 'the pattern', title: '41 Tuesdays',
      pre: 'trigger ........... disk > 90% (log partition)\nfix ............... rotate, compress, prune, restart\nvariance .......... zero, 41 consecutive runs',
      journal: 'The pattern: identical trigger, identical four-step fix, forty-one times. This is a runbook wearing a human.',
    },
    {
      id: 'wiki', machine: 'wiki', prompt: 'Inspect the wiki page',
      kicker: 'documentation', title: 'Instructions for the sleepy',
      pre: 'steps ............. 4 commands, copy-paste\nexecutor .......... whoever\'s on call, at 3 a.m.\ntypo risk ......... nonzero, on production',
      journal: 'The wiki: a perfectly good runbook that cannot execute itself — so a groggy human does, with root.',
    },
  ],
  diagnosis: {
    unlockedBy: 'ingest',
    title: 'What should run the four commands?',
    correct: {
      label: 'An SSM Automation runbook triggered by the alarm — logged, IAM-scoped, identical every run, human asleep',
      journal: 'Diagnosis: deterministic fix + clear trigger = automation. The wiki becomes code.',
      confirmBody: 'Seat the runbook. The alarm invokes it, the log records it, and Tuesday becomes a graph annotation instead of a grudge.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Fix the root cause so disks never fill', rebuttal: 'Absolutely pursue it — AND the remediation should be automated meanwhile. Root-causing for months while humans wake weekly is a false either/or.' },
      { label: 'Bigger disks', rebuttal: 'Now it\'s every third Tuesday. Postponing a pattern isn\'t breaking it.' },
      { label: 'Add it to the on-call handbook more prominently', rebuttal: 'The handbook already works — that\'s the problem. Executing documentation is what machines are for.' },
    ],
  },
  pallet: {
    at: [0, -2.5],
    modules: [
      { id: 'mod-runbook', kind: 'runbook', label: 'SSM Automation runbook (alarm-triggered)', spot: [-1.2, -2.1], visual: { hex: '#2c5a7a', glowHex: '#7ab3e0' } },
      { id: 'mod-wikimod', kind: 'wikipage', label: 'The wiki page (laminated)', spot: [0, -2.1], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
      { id: 'mod-hero', kind: 'sshhero', label: 'Designated SSH hero rota', spot: [1.2, -2.1], visual: { hex: '#7a3a3a', glowHex: '#e85f5f', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-rem', label: 'remediation bay', at: [-4.5, 3.8],
      blurb: 'What responds when the disk alarm fires. Should not require consciousness.',
      allow: { runbook: true, wikipage: true },
      refuse: {
        sshhero: { reason: 'A rota of tired humans running root commands is the current incident, formalized.' },
      },
      fallback: { reason: 'The remediation bay takes a response mechanism.' },
    },
  ],
  levers: [{ id: 'lever-tues', machine: 'lever', prompt: 'PULL — it\'s Tuesday, 3 a.m. (drill)', beat: 'tuesday' }],
  beats: [
    {
      id: 'tuesday', label: '3 a.m. drill', trigger: 'lever',
      rules: [
        { when: { socket: { 'so-rem': 'runbook' } }, pass: true,
          title: '✔ resolved at 3:01, logged at 3:02', lines: 'alarm ............. disk > 90%\nrunbook ........... rotate/compress/prune/restart\nduration .......... 74s\nhumans woken ...... 0', note: 'The alarm invoked the fix, the log recorded every step, and the rotation slept through Tuesday for the first time in 41 weeks.' },
        { when: { socket: { 'so-rem': 'wikipage' } }, pass: false,
          title: '✘ the page cannot type', lines: 'alarm ............. fired\nwiki .............. beautifully formatted\nexecuted by ....... a human, at 3:22, groggy', note: 'WORKS-BUT: documentation still needs an awake executor. The steps were right — the medium can\'t run them.' },
        { pass: false, title: '✘ Tuesday #42',
          lines: 'response .......... manual, resentful', note: 'Seat something in the remediation bay.' },
      ],
    },
    {
      id: 'audit2', label: 'execution audit', trigger: 'terminal',
      rules: [
        { when: { socket: { 'so-rem': 'runbook' } }, pass: true,
          title: '✔ every run identical, every run logged', lines: 'executions ........ IAM-authorized\nsteps ............. identical, versioned\naudit trail ....... complete\nssh keys used ..... 0', note: 'Automation is consistency plus evidence: no typos, no tribal knowledge, no port 22.' },
        { pass: false, title: '✘ audit trail: "trust me"',
          lines: 'evidence .......... memories', note: 'Manual fixes leave no trail worth auditing.' },
      ],
    },
  ],
  verifyDone: {
    title: 'Tuesday, automated',
    body: 'The 3 a.m. drill self-resolved in 74 seconds with zero humans woken, and the audit shows identical logged runs with no SSH in sight.',
    journal: 'Verified: alarm-triggered SSM runbook owns the recurring fix.',
  },
};

export const SOA_RESTORE_SPEC: MissionSpec = {
  ticket: {
    incident: 'OPS-303', reporter: 'CTO', sev: 'SEV-1', title: 'Schrödinger\'s Backups',
    bodyHtml:
      `<div>The backup dashboard is a wall of green checkmarks going back years. Nobody has ever restored one. The CTO read a horror story over the weekend and asked one question at standup: "What's our ACTUAL recovery time?" Silence.</div>` +
      `<pre>backups ........... nightly, all green\nrestores performed  0, ever\nRPO/RTO ........... vibes</pre>`,
    hint: 'Probe the green wall and the requirements, diagnose, then dial the backup posture and PULL the restore drill — the numbers only exist once measured.',
  },
  objectiveFix: 'Dial to drilled backups · run the restore drill',
  objectiveDone: 'OPS-303 closed — RPO 24h, RTO 38 minutes, measured, not vibes.',
  summary: 'A backup you have never restored is a hope. RPO (data you can lose) is set by backup frequency; RTO (downtime you can afford) is only known by DRILLING the restore — which is where the surprises live (missing IAM, undocumented configs, multi-hour copies). Green checkmarks verify that a job ran, not that recovery works. Drill until the numbers are boring.',
  level: [
    { id: 'greenwall', kind: 'shelfUnit', at: [-4.5, 1.5], yaw: Math.PI / 2, args: ['#67ad5b'], service: 'backup' },
    { id: 'proddb', kind: 'dbTower', at: [4.5, 1.5], service: 'rds' },
    { id: 'dial', kind: 'aimPointer', at: [0, -1.8] },
    { id: 'lever', kind: 'chaosLever', at: [4, -4.5] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'recovery range', accent: '#5a8fd1' },
    { kind: 'zone', at: [-4.5, 1.5], w: 3.4, d: 3.4, hex: '#142e1a', text: 'green checkmarks' },
    { kind: 'hazard', at: [4, -5.6], w: 3, d: 0.8 },
  ],
  faultLamps: ['greenwall'],
  probes: [
    {
      id: 'greenwall', machine: 'greenwall', prompt: 'Inspect the backup wall',
      kicker: 'AWS Backup', title: 'Green, allegedly',
      pre: 'jobs ............. nightly, SUCCESS ×1,205\nrestores tested .. 0\nwhat green means . "a job ran", nothing more',
      journal: 'The wall: 1,205 successful backup JOBS and zero evidence any of them can become a working database.',
    },
    {
      id: 'proddb', machine: 'proddb', prompt: 'Inspect the requirements',
      kicker: 'the business', title: 'What recovery must mean',
      pre: 'tolerable data loss ... 1 day (RPO 24h)\ntolerable downtime .... ~1 hour (RTO)\ncurrent guarantee ..... neither, unmeasured',
      journal: 'Requirements: a day of data, an hour of downtime. Neither number has ever been tested against reality.',
    },
  ],
  diagnosis: {
    unlockedBy: 'greenwall',
    title: 'What turns checkmarks into a recovery plan?',
    correct: {
      label: 'Restore DRILLS: timed recovery into a clean environment, verified by the app serving restored data',
      journal: 'Diagnosis: backups unproven. RTO is measured by restoring, nowhere else.',
      confirmBody: 'Dial to drilled backups and pull the restore lever. The drill ends when the application runs against the restored copy — and the clock tells you your real RTO.',
      actionLabel: 'To the dial →',
    },
    wrongs: [
      { label: 'More frequent backups', rebuttal: 'That improves RPO — for backups that may not restore. Frequency without restorability is more hopes per day.' },
      { label: 'Trust the green — AWS is reliable', rebuttal: 'The green is honest about what it measures: job completion. Your IAM gaps, missing configs, and copy times are outside its jurisdiction.' },
      { label: 'Write an RTO in the disaster doc', rebuttal: 'A number nobody measured is a wish with a font. The drill produces the number.' },
    ],
  },
  dials: [
    {
      id: 'posture', machine: 'dial', initial: 'hope',
      grabPrompt: '◀ ▶ swing the posture · E/Ⓧ lock',
      positions: [
        { id: 'hope', label: 'Nightly + never restored (status quo)', angle: -0.7 },
        { id: 'drilled', label: 'Nightly + quarterly restore drills', angle: 0 },
        { id: 'none', label: 'No backups ("replication is enough")', angle: 0.7 },
      ],
    },
  ],
  levers: [{ id: 'lever-restore', machine: 'lever', prompt: 'PULL — restore drill, clock running', beat: 'restore' }],
  beats: [
    {
      id: 'restore', label: 'restore drill', trigger: 'lever',
      rules: [
        { when: { dial: { posture: 'drilled' } }, pass: true,
          title: '✔ RTO: 38 minutes, measured', lines: 'restore .......... 22 min\nconfig + IAM ..... 9 min (documented now!)\napp serving ...... verified at minute 38\nsurprises found .. 2, fixed in daylight', note: 'The first drill found the surprises while they were cheap. RTO is now a number, not a feeling.' },
        { when: { dial: { posture: 'none' } }, pass: false,
          title: '✘ replication faithfully replicated the mistake', lines: 'DROP TABLE ........ replicated in 40ms\nreplicas .......... all equally wrong', alarm: 'DATA LOSS', note: 'Replication copies the present — including the bad present. Backups exist to reach the PAST.' },
        { pass: false, title: '✘ restore attempted: 6+ hours of archaeology', lines: 'missing IAM ....... discovered live\nundocumented config discovered live\nclock ............. still running', note: 'The first restore should never ALSO be the real emergency. Dial to drilled.' },
      ],
    },
    {
      id: 'numbers', label: 'RPO/RTO review', trigger: 'terminal',
      rules: [
        { when: { dial: { posture: 'drilled' } }, pass: true,
          title: '✔ numbers on the wall', lines: 'RPO .............. 24h (nightly)\nRTO .............. 38 min (drilled)\nnext drill ....... calendar, quarterly', note: 'Requirements met with evidence. The horror story is now someone else\'s.' },
        { pass: false, title: '✘ still vibes',
          lines: 'RPO/RTO .......... unmeasured', note: 'Run the drill; the numbers come from the clock.' },
      ],
    },
  ],
  verifyDone: {
    title: 'Restorability, proven',
    body: 'The drill produced a working application from backup in 38 measured minutes and surfaced two fixable surprises; RPO/RTO are now posted numbers.',
    journal: 'Verified: quarterly restore drills — RPO 24h, RTO 38min, measured.',
  },
};

export const SOA_HEALTH_SPEC: MissionSpec = {
  ticket: {
    incident: 'OPS-304', reporter: 'traffic team', sev: 'SEV-2', title: 'Healthy, Says the Hypervisor',
    bodyHtml:
      `<div>Half the fleet returns 500s, yet the Auto Scaling group insists everything is healthy and replaces nothing. Meanwhile the LAST config change caused instances to be executed 30 seconds after boot, forever, in a loop that burned a day.</div>` +
      `<pre>app ............... 500s on half the fleet\nASG says .......... all healthy (EC2 checks)\nlast week ......... boot → judged → killed → loop</pre>`,
    hint: 'Probe the checks and the loop, diagnose, then dial the health-check config — and pull the kill-the-app drill.',
  },
  objectiveFix: 'Dial to ELB health checks with a sane grace period',
  objectiveDone: 'OPS-304 closed — the ASG believes the app, not the hypervisor, and lets boots finish.',
  summary: 'EC2 status checks ask "is the VM up?" — the hypervisor\'s view. ELB health checks ask the APPLICATION. An ASG on EC2 checks keeps app-dead instances forever; switching to ELB checks makes 500s a replaceable offense. The twin trap: a grace period shorter than boot time judges instances mid-startup and replace-loops the fleet. Check the app; give it time to wake up.',
  level: [
    { id: 'fleet', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2, service: 'asg' },
    { id: 'alb', kind: 'routerArm', at: [4.5, 0.5], service: 'alb' },
    { id: 'dial', kind: 'aimPointer', at: [0, -1.8] },
    { id: 'lever', kind: 'chaosLever', at: [4, -4.5] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'health check bay', accent: '#5a8fd1' },
    { kind: 'tray', at: [-4.5, 1.5], to: [4.5, 0.5], h: 3.0 },
    { kind: 'hazard', at: [4, -5.6], w: 3, d: 0.8 },
  ],
  faultLamps: ['fleet'],
  probes: [
    {
      id: 'fleet', machine: 'fleet', prompt: 'Inspect the fleet health',
      kicker: 'ASG', title: 'The hypervisor\'s opinion',
      pre: 'health check type . EC2 (VM reachable?)\napp status ........ 500s on 4 of 8\nASG verdict ....... all healthy, replace nothing',
      journal: 'Fleet: the ASG asks the hypervisor, which is honest — the VMs ARE up. Nobody asks the application.',
    },
    {
      id: 'alb', machine: 'alb', prompt: 'Inspect last week\'s loop',
      kicker: 'postmortem', title: 'Judged mid-boot',
      pre: 'boot + warmup ..... ~90s\ngrace period ...... 30s\nresult ............ every instance killed at 30s,\n                    replacement judged the same way',
      journal: 'The loop: instances need 90s to boot; the check judged at 30s. Impatience executed the whole fleet on repeat.',
    },
  ],
  diagnosis: {
    unlockedBy: 'fleet',
    title: 'What should the ASG believe, and when?',
    correct: {
      label: 'ELB health checks (ask the app) with a grace period longer than boot + warmup',
      journal: 'Diagnosis: wrong question (EC2 vs app) and wrong patience (grace < boot).',
      confirmBody: 'Dial to ELB checks with 120s grace: app-dead instances get replaced, booting instances get the time they need. Both halves matter.',
      actionLabel: 'To the dial →',
    },
    wrongs: [
      { label: 'Reboot the 500ing instances by hand', rebuttal: 'Tonight, sure. The ASG exists to do this automatically — it just needs to be asking the right question.' },
      { label: 'Make /health always return 200', rebuttal: 'A health check that cannot fail protects nothing. You\'d be laundering the hypervisor\'s optimism through your own endpoint.' },
      { label: 'Remove health checks — they caused last week\'s loop', rebuttal: 'The GRACE PERIOD caused the loop. Removing checks entirely keeps every future zombie in rotation forever.' },
    ],
  },
  dials: [
    {
      id: 'hc', machine: 'dial', initial: 'ec2',
      grabPrompt: '◀ ▶ swing the config · E/Ⓧ lock',
      positions: [
        { id: 'ec2', label: 'EC2 checks (status quo)', angle: -0.7 },
        { id: 'elbgrace', label: 'ELB checks + 120s grace', angle: 0 },
        { id: 'elbfast', label: 'ELB checks + 30s grace', angle: 0.7 },
      ],
    },
  ],
  levers: [{ id: 'lever-kill', machine: 'lever', prompt: 'PULL — kill the app on two instances (drill)', beat: 'killapp' }],
  beats: [
    {
      id: 'killapp', label: 'dead-app drill', trigger: 'lever',
      rules: [
        { when: { dial: { hc: 'elbgrace' } }, pass: true,
          title: '✔ zombies out in 90 seconds', lines: 'app killed on ..... 2 instances (drill)\nELB checks ........ failed → marked unhealthy\nASG ............... drained + replaced both\nreplacements ...... passed checks after grace', note: 'The ASG finally asks the question that matters and waits long enough for the answer.' },
        { when: { dial: { hc: 'elbfast' } }, pass: false,
          title: '✘ replacements executed mid-boot', lines: 'zombies replaced .. yes\nreplacements ...... killed at 30s (boot = 90s)\nfleet ............. shrinking, looping', note: 'WORKS-BUT: right question, wrong patience. Grace must cover boot + warmup or the cure loops the fleet.' },
        { pass: false, title: '✘ hypervisor still says fine', alarm: 'ZOMBIE FLEET',
          lines: 'VMs up ............ 8/8\napps serving ...... 6/8\nASG action ........ none', note: 'EC2 checks can\'t see the 500s. Swing the dial.' },
      ],
    },
    {
      id: 'steady2', label: 'steady-state check', trigger: 'terminal',
      rules: [
        { when: { dial: { hc: 'elbgrace' } }, pass: true,
          title: '✔ self-healing, not self-harming', lines: 'checks ............ app-level, /health\ngrace ............. 120s (boot 90s)\nflapping .......... none, 7 days', note: 'The two settings work as a pair: truthful checks, sufficient patience.' },
        { pass: false, title: '✘ config still wrong',
          lines: 'trust ............. misplaced', note: 'ELB checks + real grace. Both.' },
      ],
    },
  ],
  verifyDone: {
    title: 'Believing the application',
    body: 'The dead-app drill drained and replaced both zombies in 90 seconds, and steady state shows a week with zero flapping under app-level checks and a 120s grace.',
    journal: 'Verified: ELB health checks + boot-covering grace period.',
  },
};

export const SOA_TEMPLATE_SPEC: MissionSpec = {
  ticket: {
    incident: 'OPS-305', reporter: 'everyone', sev: 'SEV-2', title: 'The Server Named Gary',
    bodyHtml:
      `<div>There is a server named Gary. Gary was configured by hand in 2023 by someone who left. Gary has 14 undocumented tweaks, survives on uptime streaks, and everyone is afraid to reboot Gary. Yesterday the ASG scaled and produced three instances that are... not Gary.</div>` +
      `<pre>gary .............. hand-tuned, undocumented, feared\nnew instances ..... different from gary (14 ways?)\nreboot policy ..... never (superstition)</pre>`,
    hint: 'Probe Gary and the newborns, diagnose, then seat the launch template — and pull the replace-Gary drill.',
  },
  objectiveFix: 'Seat the launch template in the fleet bay',
  objectiveDone: 'OPS-305 closed — Gary is now version 7 of a template, and nobody is afraid.',
  summary: 'Pet servers are outages on a timer: their configuration lives in one departed person\'s memory and no two instances match. Launch templates make the server definition versioned and reviewable; instance refresh rolls changes gradually; and any instance — including Gary — can die and be reborn identical. Cloning Gary\'s disk once preserves his mysteries; documenting him preserves them in prose. The template ENDS the mystery.',
  level: [
    { id: 'gary', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2, service: 'ec2' },
    { id: 'newborns', kind: 'serverRack', at: [4.5, 1.5], yaw: -Math.PI / 2, service: 'asg' },
    { id: 'lever', kind: 'chaosLever', at: [0, -4.5] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'fleet definition', accent: '#8f7ae6' },
    { kind: 'zone', at: [-4.5, 1.5], w: 3.2, d: 3.2, hex: '#33260f', text: 'gary (do not reboot)' },
    { kind: 'zone', at: [4.5, 1.5], w: 3.2, d: 3.2, hex: '#16233a', text: 'the newborns' },
    { kind: 'hazard', at: [0, -5.6], w: 3, d: 0.8 },
  ],
  faultLamps: ['gary'],
  probes: [
    {
      id: 'gary', machine: 'gary', prompt: 'Inspect Gary',
      kicker: 'pet server', title: 'A biography, not a build',
      pre: 'configured by ..... someone who left\ndocumented ........ partially, wrongly\nuptime ............ 400 days (feared, not proud)\nreproducible ...... no',
      journal: 'Gary: configuration as oral history. If Gary dies, Gary\'s knowledge dies with him.',
    },
    {
      id: 'newborns', machine: 'newborns', prompt: 'Inspect the new instances',
      kicker: 'ASG scale-out', title: 'Not Gary',
      pre: 'source ............ base AMI + hope\nmissing ........... 14 of Gary\'s tweaks (est.)\nbehavior .......... subtly, maddeningly different',
      journal: 'Newborns: the ASG can only stamp what\'s DEFINED. Gary\'s undefined magic doesn\'t scale.',
    },
  ],
  diagnosis: {
    unlockedBy: 'gary',
    title: 'How does Gary stop being a single point of mystery?',
    correct: {
      label: 'Capture the config as a versioned launch template (+ baked AMI) — every instance stamped identical, changes rolled by instance refresh',
      journal: 'Diagnosis: pet server. The definition must live in a template, not a survivor.',
      confirmBody: 'Seat the launch template. Gary\'s tweaks become reviewable lines; Gary himself becomes replaceable — which is a compliment in operations.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Interview people and document Gary in the wiki', rebuttal: 'Prose drifts the day it\'s written and cannot boot an instance. Document Gary INTO the template, where the definition executes.' },
      { label: 'Never reboot Gary; protect him from the ASG', rebuttal: 'You\'d be promoting the single point of failure to protected status. Uptime streaks are fear wearing a metric.' },
      { label: 'Snapshot Gary\'s disk and clone it forever', rebuttal: 'WORKS-BUT: you\'ve preserved the mystery in amber. Patches, changes, and reviews still have nowhere to live — see the config-roll beat.' },
    ],
  },
  pallet: {
    at: [0, -2.5],
    modules: [
      { id: 'mod-lt', kind: 'ltemplate', label: 'Launch template v7 (+ baked AMI)', spot: [-1.2, -2.1], visual: { hex: '#4a3f68', glowHex: '#8f7ae6' } },
      { id: 'mod-clone', kind: 'cloneami', label: 'One-time clone of Gary\'s disk', spot: [0, -2.1], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
      { id: 'mod-shrine', kind: 'shrine', label: '"Do not touch Gary" plaque', spot: [1.2, -2.1], visual: { hex: '#7a3a3a', glowHex: '#e85f5f', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-fleet', label: 'fleet definition bay', at: [4.5, 3.8],
      blurb: 'What the ASG stamps instances from. Should be versioned, reviewable, complete.',
      allow: { ltemplate: true, cloneami: true },
      refuse: {
        shrine: { reason: 'Enshrining the pet is how this started. The fleet needs a definition, not a deity.' },
      },
      fallback: { reason: 'The fleet bay takes an instance definition.' },
    },
  ],
  levers: [{ id: 'lever-gary', machine: 'lever', prompt: 'PULL — retire Gary (drill)', beat: 'retire' }],
  beats: [
    {
      id: 'retire', label: 'retire-Gary drill', trigger: 'lever',
      rules: [
        { when: { socket: { 'so-fleet': 'ltemplate' } }, pass: true,
          title: '✔ Gary rebooted into v7, identical', lines: 'gary terminated ... (moment of silence)\nreplacement ....... template v7, 96s\ndiff vs fleet ..... zero\nfear level ........ zero', note: 'Cattle, not pets: the server is now an INSTANCE of a definition. Gary lives on as version history.' },
        { when: { socket: { 'so-fleet': 'cloneami' } }, pass: true,
          title: '✔ clone boots — mysteries included', lines: 'replacement ....... gary-clone, boots fine\nconfig ............ still undocumented, now ×9', note: 'The clone works today. Hold judgment until the config-roll beat asks you to CHANGE something.' },
        { pass: false, title: '✘ Gary is dead, long live nothing', alarm: 'IRREPLACEABLE LOSS',
          lines: 'gary .............. terminated (drill)\nreplacement ....... missing 14 tweaks\nservice ........... degraded, mysteriously', note: 'The fleet has no complete definition. Seat one before retiring anyone.' },
      ],
    },
    {
      id: 'configroll', label: 'config-roll test', trigger: 'terminal',
      rules: [
        { when: { socket: { 'so-fleet': 'ltemplate' } }, pass: true,
          title: '✔ change shipped as v8, rolled in batches', lines: 'change ............ new log agent\nmethod ............ template v8 + instance refresh\nreview ............ a diff, approved\nrollback .......... point back to v7', note: 'Configuration changes are deploys now: reviewed, gradual, reversible.' },
        { when: { socket: { 'so-fleet': 'cloneami' } }, pass: false,
          title: '✘ change the clone... how?', lines: 'change needed ..... new log agent\nmethod ............ SSH into 9 clones? re-clone?\nreview ............ nothing to diff', note: 'WORKS-BUT: frozen mysteries can\'t evolve. Without a versioned definition, every change reopens the archaeology.' },
        { pass: false, title: '✘ no definition to change',
          lines: 'fleet bay ......... empty or enshrined', note: 'Seat the template.' },
      ],
    },
  ],
  verifyDone: {
    title: 'Rest well, Gary',
    body: 'Gary retired and returned as template v7 with a zero diff, and the config roll shipped v8 in reviewed batches with a pointer-flip rollback.',
    journal: 'Verified: launch template + instance refresh — pets became cattle.',
  },
};

export const SOA_PATCH_SPEC: MissionSpec = {
  ticket: {
    incident: 'OPS-306', reporter: 'security', sev: 'SEV-1', title: 'The CVE and the For-Loop',
    bodyHtml:
      `<div>A critical CVE dropped this morning. The patch plan is a bash for-loop over an SSH hosts file last updated in spring — it reaches 143 of the 178 instances anyone knows about, and proves nothing about any of them. Security wants evidence by Friday.</div>` +
      `<pre>cve ............... critical, actively exploited\nfleet ............. 178 known, others suspected\nplan .............. ssh for-loop, hosts file (stale)\nevidence .......... vibes</pre>`,
    hint: 'Probe the fleet and the for-loop, diagnose, then seat Patch Manager — and pull the CVE drill for the compliance report.',
  },
  objectiveFix: 'Seat SSM Patch Manager in the patching bay',
  objectiveDone: 'OPS-306 closed — patched in maintenance windows, with a report instead of a shrug.',
  summary: 'Fleet patching needs three things SSH loops can\'t give: complete coverage (the managed-instance inventory finds boxes the hosts file forgot), controlled rollout (baselines + maintenance windows with concurrency limits, so the fleet doesn\'t all reboot at once), and EVIDENCE (per-instance compliance reporting — the answer to the auditor\'s only question). Not patching at all is an alarm, not a policy.',
  level: [
    { id: 'fleet2', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2, service: 'ec2' },
    { id: 'loopbox', kind: 'shelfUnit', at: [4.5, 1.5], yaw: -Math.PI / 2, args: ['#8a7a22'], service: 'none' },
    { id: 'lever', kind: 'chaosLever', at: [0, -4.5] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'patch bay', accent: '#d15656' },
    { kind: 'zone', at: [4.5, 1.5], w: 3.2, d: 3.2, hex: '#33260f', text: 'the for-loop' },
    { kind: 'hazard', at: [0, -5.6], w: 3, d: 0.8 },
  ],
  faultLamps: ['fleet2'],
  probes: [
    {
      id: 'fleet2', machine: 'fleet2', prompt: 'Inspect the fleet',
      kicker: 'inventory', title: '178 known, ??? actual',
      pre: 'hosts file ........ 143 entries, spring vintage\nSSM inventory ..... 191 managed instances (!)\nunpatched gap ..... the 48 nobody would have touched',
      journal: 'Fleet: the agent-based inventory found 48 instances the hosts file never knew. Coverage starts with knowing the fleet.',
    },
    {
      id: 'loopbox', machine: 'loopbox', prompt: 'Inspect the for-loop',
      kicker: 'the old way', title: 'Hope over SSH',
      pre: 'reaches ........... hosts file only\nconcurrency ....... all at once (reboot storm)\nevidence .......... terminal scrollback',
      journal: 'The loop: partial reach, unthrottled reboots, and evidence that dies with the terminal window.',
    },
  ],
  diagnosis: {
    unlockedBy: 'fleet2',
    title: 'What patches 191 instances with proof?',
    correct: {
      label: 'SSM Patch Manager: baseline defines what, maintenance windows define when/how many, compliance reports prove it',
      journal: 'Diagnosis: patching is a fleet workflow — coverage, control, evidence. Patch Manager is that workflow.',
      confirmBody: 'Seat Patch Manager. The baseline approves critical patches, windows roll them in throttled batches tonight, and Friday\'s evidence generates itself.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Update the hosts file and run the loop', rebuttal: 'A fresher partial list is still partial, still un-throttled, still evidence-free. The mechanism is the problem.' },
      { label: 'Accept the risk — patching breaks things', rebuttal: 'An actively exploited critical is the risk. Maintenance windows with concurrency limits exist precisely so patching DOESN\'T break things.' },
      { label: 'Rebuild every instance from a patched AMI right now', rebuttal: 'Great strategy on template-managed fleets — over days. For Friday-with-evidence on THIS fleet, Patch Manager is the tool in hand.' },
    ],
  },
  pallet: {
    at: [0, -2.5],
    modules: [
      { id: 'mod-pm', kind: 'patchmgr', label: 'Patch Manager: baseline + windows + compliance', spot: [-1.2, -2.1], visual: { hex: '#7a2e35', glowHex: '#e87a7a' } },
      { id: 'mod-loop', kind: 'sshloop', label: 'The for-loop (freshened hosts file)', spot: [0, -2.1], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
      { id: 'mod-never', kind: 'nopatch', label: '"If it works, don\'t patch it" doctrine', spot: [1.2, -2.1], visual: { hex: '#7a3a3a', glowHex: '#e85f5f', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-patch', label: 'patching bay', at: [-4.5, 3.8],
      blurb: 'The fleet\'s patch mechanism: coverage, rollout control, and evidence.',
      allow: { patchmgr: true, sshloop: true },
      refuse: {
        nopatch: { reason: 'An actively exploited critical CVE is not a philosophy debate.', alarm: 'UNPATCHED CRITICAL' },
      },
      fallback: { reason: 'The patching bay takes a patch mechanism.' },
    },
  ],
  levers: [{ id: 'lever-cve', machine: 'lever', prompt: 'PULL — patch the CVE tonight (drill)', beat: 'cve' }],
  beats: [
    {
      id: 'cve', label: 'CVE patch drill', trigger: 'lever',
      rules: [
        { when: { socket: { 'so-patch': 'patchmgr' } }, pass: true,
          title: '✔ 191/191, throttled, reported', lines: 'window ............ 01:00-04:00, 10% concurrency\npatched ........... 191/191 (incl. the lost 48)\nservice impact .... none\nreport ............ per-instance, exportable', note: 'Coverage from inventory, safety from throttling, and Friday\'s evidence as a byproduct.' },
        { when: { socket: { 'so-patch': 'sshloop' } }, pass: false,
          title: '✘ 143 patched, 48 exposed, 0 proven', lines: 'reached ........... hosts file only\nreboot storm ...... yes (no throttle)\nevidence .......... a scrollback screenshot', note: 'WORKS-BUT: the loop patches the fleet it knows gently as a hammer. The 48 unknowns stay exploitable, and security still has no report.' },
        { pass: false, title: '✘ CVE still resident', alarm: 'ACTIVE EXPLOIT WINDOW',
          lines: 'patched ........... 0', note: 'Seat a mechanism in the patching bay.' },
      ],
    },
    {
      id: 'evidence', label: 'compliance report', trigger: 'terminal',
      rules: [
        { when: { socket: { 'so-patch': 'patchmgr' } }, pass: true,
          title: '✔ the auditor\'s question, answered', lines: 'compliant ......... 191/191\nnon-compliant ..... 0 (auto re-listed if drift)\nformat ............ report, not anecdote', note: '"Are we patched?" now has a per-instance answer that regenerates itself.' },
        { pass: false, title: '✘ evidence: "pretty sure"',
          lines: 'report ............ none exists', note: 'Compliance reporting comes with the mechanism, not the memory.' },
      ],
    },
  ],
  verifyDone: {
    title: 'Patched, provably',
    body: 'The drill patched all 191 instances — including 48 the hosts file forgot — inside a throttled window, and the compliance report answers Friday\'s question per instance.',
    journal: 'Verified: Patch Manager — baseline, windows, evidence.',
  },
};

export const SOA_VPC_SPEC: MissionSpec = {
  ticket: {
    incident: 'OPS-307', reporter: 'app team', sev: 'SEV-2', title: 'The Instance That Can\'t Phone Out',
    bodyHtml:
      `<div>A new private-subnet instance cannot reach the package repos, and the app team has been "trying things" for four hours: bigger instance, three reboots, a support thread with themselves. Nobody has looked at the network path — which is always one of four things.</div>` +
      `<pre>symptom ........... outbound internet: timeout\ntried ............. resize ×1, reboot ×3, vibes ×4h\nroute table ....... nobody looked\nSG / NACL ......... nobody looked</pre>`,
    hint: 'Work the checklist with the probes: route table, then security layers. Diagnose, then seat the missing piece and prove it with the flow logs.',
  },
  objectiveFix: 'Seat the default route (0.0.0.0/0 → NAT) in the route board',
  objectiveDone: 'OPS-307 closed — the checklist found it in minutes: no default route.',
  summary: 'Private-subnet connectivity is a four-item checklist, in order: route table (is there a 0.0.0.0/0 to a NAT/IGW?), security group (stateful, instance-level allow), NACL (stateless, subnet-level — remember return ephemeral ports), and DNS. Here the route table simply had no default route: no amount of rebooting or resizing touches the network path. Reachability Analyzer walks the config; Flow Logs show what actually happened.',
  level: [
    { id: 'inst', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2, service: 'ec2' },
    { id: 'rtboard', kind: 'shelfUnit', at: [0.5, 1.5], yaw: 0, args: ['#c98ae8'], service: 'vpc' },
    { id: 'natm', kind: 'natAirlock', at: [5.5, 1.5], yaw: -Math.PI / 2 },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'network forensics', accent: '#c98ae8' },
    { kind: 'zone', at: [-4.5, 1.5], w: 3.2, d: 3.2, hex: '#1a2030', text: 'private subnet' },
    { kind: 'tray', at: [0.5, 1.5], to: [5.5, 1.5], h: 3.0 },
    { kind: 'light', at: [8.5, -5], yaw: -Math.PI / 2 },
  ],
  faultLamps: ['inst', 'rtboard'],
  probes: [
    {
      id: 'rtboard', machine: 'rtboard', prompt: 'Check the route table',
      kicker: 'checklist 1/4', title: 'A map with no exit',
      pre: 'local route ....... 10.0.0.0/16 ✓\ndefault route ..... MISSING\nNAT gateway ....... exists, unreferenced',
      journal: 'Route table: no 0.0.0.0/0 entry. Packets for the internet have literally nowhere to go — found in checklist step one.',
    },
    {
      id: 'inst', machine: 'inst', prompt: 'Check SG and NACL',
      kicker: 'checklist 2-3/4', title: 'The security layers, cleared',
      pre: 'SG outbound ....... allow all ✓ (stateful)\nNACL .............. default allow both ways ✓\nconclusion ........ not the security layers',
      journal: 'SG/NACL: both permissive. The checklist clears them in two minutes — no guessing required.',
    },
  ],
  diagnosis: {
    unlockedBy: 'rtboard',
    title: 'Four hours of trying things — what was it?',
    correct: {
      label: 'The subnet\'s route table has no default route — add 0.0.0.0/0 → NAT gateway',
      journal: 'Diagnosis: missing default route. The checklist beats vibes: route → SG → NACL → DNS.',
      confirmBody: 'Seat the route card. Resizing and rebooting never touch the network path; the checklist finds this in step one, every time.',
      actionLabel: 'To the route card →',
    },
    wrongs: [
      { label: 'The instance is too small for networking', rebuttal: 'Four hours included this guess. Instance size affects bandwidth ceilings, not whether a route EXISTS.' },
      { label: 'Reboot it a fourth time', rebuttal: 'The route table is not on the instance. Nothing on the instance is wrong.' },
      { label: 'Open the NACL wider', rebuttal: 'The NACL already allows everything — probes said so. Loosening security layers that aren\'t the problem is how audits get exciting.' },
    ],
  },
  pallet: {
    at: [0, -4.5],
    modules: [
      { id: 'mod-route', kind: 'routecard', label: 'Route: 0.0.0.0/0 → NAT gateway', spot: [-1.2, -4.1], visual: { hex: '#5a3a7a', glowHex: '#c98ae8', h: 0.3 } },
      { id: 'mod-igwroute', kind: 'igwroute', label: 'Route: 0.0.0.0/0 → Internet Gateway (direct)', spot: [0, -4.1], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
      { id: 'mod-bignic', kind: 'bignic', label: 'Bigger instance ("more network")', spot: [1.2, -4.1], visual: { hex: '#7a3a3a', glowHex: '#e85f5f', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-route', label: 'route-table slot', at: [0.5, 3.8],
      blurb: 'The subnet\'s exit map. Private subnets reach out through a NAT.',
      allow: { routecard: true, igwroute: true },
      refuse: {
        bignic: { reason: 'Size buys bandwidth on paths that EXIST. There is no path.' },
      },
      fallback: { reason: 'The route slot takes a route entry.' },
    },
  ],
  beats: [
    {
      id: 'connect', label: 'connectivity test', trigger: 'terminal',
      rules: [
        { when: { socket: { 'so-route': 'routecard' } }, pass: true,
          title: '✔ outbound in 40ms, still private', lines: 'dnf update ........ succeeds via NAT\ninbound from net .. still impossible ✓\nflow logs ......... ACCEPT, egress path', note: 'The NAT route gives private instances a door OUT without opening one IN.' },
        { when: { socket: { 'so-route': 'igwroute' } }, pass: false,
          title: '✘ connected — and exposed', lines: 'outbound .......... works\ninbound ........... ALSO works (public IP + IGW)\nsubnet ............ no longer private', alarm: 'PRIVATE SUBNET EXPOSED', note: 'An IGW route makes the subnet PUBLIC. Private things reach out through NAT — the one-way airlock.' },
        { pass: false, title: '✘ timeout, four hours and counting',
          lines: 'default route ..... still missing', note: 'Seat the route card.' },
      ],
    },
    {
      id: 'proof', label: 'flow-log verification', trigger: 'terminal',
      rules: [
        { when: { socket: { 'so-route': 'routecard' } }, pass: true,
          title: '✔ evidence in the logs', lines: 'reachability ...... path verified (analyzer)\nflow logs ......... ACCEPTs on egress\nchecklist time .... 6 minutes vs 4 hours', note: 'The tools that see the path — analyzer for config, flow logs for reality — end the guessing era.' },
        { pass: false, title: '✘ logs full of nothing',
          lines: 'flow logs ......... no egress attempts succeed', note: 'Fix the route first; then the logs have something to prove.' },
      ],
    },
  ],
  verifyDone: {
    title: 'Checklist over vibes',
    body: 'The route card restored outbound in 40ms while keeping the subnet private, and the flow logs plus Reachability Analyzer wrote the proof.',
    journal: 'Verified: missing default route → NAT; checklist found in minutes what vibes missed for hours.',
  },
};

export const SOA_RIGHTSIZE_SPEC: MissionSpec = {
  ticket: {
    incident: 'OPS-308', reporter: 'finops', sev: 'SEV-3', title: 'Sized by Vibes in 2023',
    bodyHtml:
      `<div>The fleet was sized during a 2023 all-nighter by someone who "went big to be safe". Ninety days of metrics say 4% average CPU, flat memory, burst credits untouched. Meanwhile the dev environments run 24/7 for a team that works 9 to 5.</div>` +
      `<pre>prod fleet ........ 4% CPU avg, 90 days\ndev/test .......... 24/7 for 45h/week of use\nsizing method ..... vibes, 2023</pre>`,
    hint: 'Probe the metrics and the calendar, diagnose, then dial the sizing policy — it must pass the bill AND the peak-load drill.',
  },
  objectiveFix: 'Dial to metrics-driven right-sizing + off-hours schedules',
  objectiveDone: 'OPS-308 closed — the fleet fits the measurements, and dev sleeps when the devs do.',
  summary: 'Right-sizing is measurement, not machismo: 90 days of single-digit CPU with untouched burst credits justifies stepping down (against PEAK usage, not averages, one size at a time with monitoring); dev/test scheduled off outside working hours cuts ~70% of its instance-hours with zero impact. The trap is overcorrecting to minimum sizes that fail the next peak — the metrics show the peaks too; respect them.',
  level: [
    { id: 'prodfleet', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2, service: 'ec2' },
    { id: 'devfleet', kind: 'serverRack', at: [4.5, 1.5], yaw: -Math.PI / 2, service: 'ec2' },
    { id: 'dial', kind: 'aimPointer', at: [0, -1.8] },
    { id: 'lever', kind: 'chaosLever', at: [4, -4.5] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'utilization review', accent: '#67ad5b' },
    { kind: 'zone', at: [-4.5, 1.5], w: 3.2, d: 3.2, hex: '#142e1a', text: 'prod · 4% cpu' },
    { kind: 'zone', at: [4.5, 1.5], w: 3.2, d: 3.2, hex: '#33260f', text: 'dev · 24/7' },
    { kind: 'hazard', at: [4, -5.6], w: 3, d: 0.8 },
  ],
  probes: [
    {
      id: 'prodfleet', machine: 'prodfleet', prompt: 'Inspect prod metrics',
      kicker: 'CloudWatch, 90 days', title: 'Heat, purchased hourly',
      pre: 'CPU avg ........... 4% · p99 22%\nmemory ............ 31% flat\nburst credits ..... never touched\nheadroom used ..... a rounding error',
      journal: 'Prod: even the PEAKS fit in a fleet half this size. The metrics have been writing the ticket for 90 days.',
    },
    {
      id: 'devfleet', machine: 'devfleet', prompt: 'Inspect the dev calendar',
      kicker: 'usage pattern', title: '168 hours billed, 45 used',
      pre: 'usage ............. weekdays 9-5 (45h)\nbilled ............ 24/7 (168h)\nweekend activity .. one cron nobody remembers',
      journal: 'Dev: nights and weekends are pure spend. A schedule is the easiest money in the account.',
    },
  ],
  diagnosis: {
    unlockedBy: 'prodfleet',
    title: 'What does the 90-day data justify?',
    correct: {
      label: 'Right-size prod against measured PEAKS (stepwise, monitored) and schedule dev/test off outside working hours',
      journal: 'Diagnosis: over-provisioned prod + always-on dev. Measure, step down, schedule off.',
      confirmBody: 'Dial to metrics-driven: prod steps down against p99 with monitoring and a rollback, dev gets a 9-to-5 schedule. The peak drill keeps everyone honest.',
      actionLabel: 'To the dial →',
    },
    wrongs: [
      { label: 'Keep the headroom — safety first', rebuttal: '96% idle isn\'t safety, it\'s superstition with a budget line. The p99 data defines real safety margins.' },
      { label: 'Shrink everything to the smallest size', rebuttal: 'Overcorrection: averages fit, PEAKS don\'t. Right-sizing respects the p99, not the wish.' },
      { label: 'Ask devs to remember to stop instances', rebuttal: 'Memory-based policies have a half-life of one sprint. Schedules don\'t forget.' },
    ],
  },
  dials: [
    {
      id: 'sizing', machine: 'dial', initial: 'vibes',
      grabPrompt: '◀ ▶ swing the policy · E/Ⓧ lock',
      positions: [
        { id: 'vibes', label: '2023 vibes sizing (status quo)', angle: -0.7 },
        { id: 'metrics', label: 'Metrics-driven + dev schedules', angle: 0 },
        { id: 'minimum', label: 'Everything to minimum sizes', angle: 0.7 },
      ],
    },
  ],
  levers: [{ id: 'lever-peak', machine: 'lever', prompt: 'PULL — quarter-end peak (drill)', beat: 'peak' }],
  beats: [
    {
      id: 'bill4', label: 'bill review', trigger: 'terminal',
      rules: [
        { when: { dial: { sizing: 'metrics' } }, pass: true,
          title: '✔ −44% and nobody noticed', lines: 'prod .............. stepped to fit p99, −31%\ndev ............... scheduled 9-5, −70% hours\ncombined .......... −44% compute spend', note: 'The measurements were the plan all along. Cost fell; capability didn\'t.' },
        { when: { dial: { sizing: 'minimum' } }, pass: true,
          title: '✔ −61% — hold the applause', lines: 'everything ........ minimum sizes\nbill .............. beautiful\np99 headroom ...... gone', note: 'Cheaper than cheap — until the peak drill. Run it before framing this bill.' },
        { pass: false, title: '✘ still paying for 2023\'s fears',
          lines: 'idle capacity ..... 96%', note: 'The data has been ready for 90 days. Swing the dial.' },
      ],
    },
    {
      id: 'peak', label: 'peak-load drill', trigger: 'lever',
      rules: [
        { when: { dial: { sizing: 'metrics' } }, pass: true,
          title: '✔ quarter-end absorbed', lines: 'load .............. 3× normal (like every quarter)\nfleet ............. sized for measured p99 ✓\nlatency ........... flat', note: 'Right-sized means sized for the REAL peaks — which were in the data, and respected.' },
        { when: { dial: { sizing: 'minimum' } }, pass: false,
          title: '✘ the savings called in sick', lines: 'load .............. 3× normal\nfleet ............. at minimum, saturated\nlatency ........... a staircase', alarm: 'PEAK SATURATION', note: 'WORKS-BUT: minimum sizes pass every quiet day and fail the loud one. The p99 was the floor, not a suggestion.' },
        { pass: false, title: '✔ absorbed — with 96% to spare',
          lines: 'headroom used ..... 3% → 9%', note: 'Surviving the peak was never in doubt at these sizes. The bill review is where this posture fails.' },
      ],
    },
  ],
  verifyDone: {
    title: 'Sized by data',
    body: 'The bill fell 44% on measurements alone, and the quarter-end drill rode the properly-sized p99 headroom with flat latency.',
    journal: 'Verified: metrics-driven right-sizing + dev schedules — cheaper AND peak-proof.',
  },
};
