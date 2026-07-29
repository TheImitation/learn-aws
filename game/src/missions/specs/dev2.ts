import type { MissionSpec } from '../spec';

/** Developer badge (DVA-C02) — batch 2: Security ×1, Deployment ×3,
 *  Troubleshooting & Optimization ×2. */

export const STS_SPEC: MissionSpec = {
  ticket: {
    incident: 'DEV-107', reporter: 'sec-ops', sev: 'SEV-1', title: 'The God-Mode Pipeline',
    bodyHtml:
      `<div>The CI pipeline deploys with a long-lived ADMIN access key pasted into repo settings three years ago. Whoever holds that string owns the account, forever. Sec-ops found it referenced in four other repos "for convenience".</div>` +
      `<pre>ci credential ..... IAM user key, AdministratorAccess\nage ............... 3 years, never rotated\ncopies ............ 4 repos + unknown laptops</pre>`,
    hint: 'Probe the pipeline and the key, diagnose, then seat OIDC role assumption — the admin keys go in the bin, loudly.',
  },
  objectiveFix: 'Seat OIDC role assumption in the CI credential bay',
  objectiveDone: 'DEV-107 closed — the pipeline borrows scoped credentials for minutes, owns nothing.',
  summary: 'Symptom: CI holds an eternal admin key. Risk: any leak = full account takeover with no expiry. Fix: OIDC federation — the CI provider presents a signed identity token, STS returns temporary credentials for a role scoped to exactly the deploy actions; nothing static exists to steal. Traps: long-lived keys of ANY permission level keep the leak-forever property (alarm); a read-only role is safely scoped but cannot deploy (works-but fails the deploy beat).',
  level: [
    { id: 'pipeline', kind: 'serverRack', at: [-4.5, 1], yaw: Math.PI / 2, service: 'codepipeline' },
    { id: 'keybox', kind: 'shelfUnit', at: [-8, -2], yaw: Math.PI / 2, args: ['#7a3a3a'], service: 'none' },
    { id: 'sts', kind: 'badgeDoor', at: [4.5, 1], yaw: -Math.PI / 2, args: ['#d15656'], service: 'sts' },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'deploy credentials', accent: '#d15656' },
    { kind: 'zone', at: [-8, -2], w: 3, d: 3, hex: '#331a1a', text: 'key graveyard' },
    { kind: 'hazard', at: [4.5, -1.2], w: 3, d: 0.8 },
    { kind: 'light', at: [8.5, -5], yaw: -Math.PI / 2 },
  ],
  faultLamps: ['pipeline'],
  probes: [
    {
      id: 'keybox', machine: 'keybox', prompt: 'Inspect the stored key',
      kicker: 'IAM access key', title: 'Three years of god mode',
      pre: 'key .............. AKIA................\npolicy ........... AdministratorAccess\nexpiry ........... NEVER\nlast rotation .... never',
      journal: 'Key: admin scope, no expiry, copied into four repos. A leak anywhere is the whole account, forever.',
    },
    {
      id: 'pipeline', machine: 'pipeline', prompt: 'Inspect the pipeline',
      kicker: 'CI/CD', title: 'What it actually needs',
      pre: 'deploy touches ... one CFN stack, one bucket,\n                   one Lambda alias\nneeds admin? ..... no — needs exactly that list',
      journal: 'Pipeline: the deploy touches a short, knowable list of resources. Admin was convenience, not necessity.',
    },
  ],
  diagnosis: {
    unlockedBy: 'keybox',
    title: 'What replaces the eternal admin key?',
    correct: {
      label: 'OIDC federation: CI assumes a deploy-scoped role via STS — temporary credentials, nothing stored',
      journal: 'Diagnosis: static credentials are the vulnerability class. Assume a scoped role at run time.',
      confirmBody: 'The CI provider signs an identity token; STS trades it for minutes-long credentials on a role that can deploy this stack and nothing else. There is no secret to paste, leak, or forget.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Rotate the admin key monthly', rebuttal: 'A shorter leak window on an ADMIN key is still an account takeover — and the copies in four repos rotate never.' },
      { label: 'Move the key to an env var', rebuttal: 'Same eternal admin string, different hiding place. Storage location doesn\'t change the credential\'s blast radius or lifetime.' },
      { label: 'MFA on the CI user', rebuttal: 'Pipelines can\'t tap a phone. CI authentication is exactly what OIDC federation is for.' },
    ],
  },
  pallet: {
    at: [6, -5],
    modules: [
      { id: 'mod-oidc', kind: 'oidc', label: 'OIDC → STS assume deploy-scoped IAM role', spot: [5.4, -4.6], visual: { hex: '#7a2e35', glowHex: '#e87a7a' } },
      { id: 'mod-admin', kind: 'adminkey', label: 'Fresh AdministratorAccess key', spot: [6.6, -4.6], visual: { hex: '#7a3a3a', glowHex: '#e85f5f', h: 0.3 } },
      { id: 'mod-ro', kind: 'rokey', label: 'ReadOnlyAccess role', spot: [5.4, -5.4], visual: { hex: '#31598c', glowHex: '#7ab3e0', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-cred', label: 'CI credential bay', at: [0, 3],
      blurb: 'How the pipeline authenticates to AWS. Should hold a mechanism, not a secret.',
      allow: { oidc: true, rokey: true },
      refuse: {
        adminkey: { reason: 'A new eternal admin key is the same incident with a fresh serial number.', alarm: 'STATIC ADMIN CREDENTIAL' },
      },
      fallback: { reason: 'The credential bay takes an auth mechanism.' },
    },
  ],
  beats: [
    {
      id: 'deploy', label: 'deploy test', trigger: 'terminal',
      rules: [
        { when: { socket: { 'so-cred': 'oidc' } }, pass: true,
          title: '✔ deployed with borrowed keys', lines: 'AssumeRoleWithWebIdentity ... ok\ncreds lifetime .............. 15 min\nscope ....................... deploy stack only\nstored secrets .............. 0', note: 'The pipeline held real credentials for fifteen minutes and owns nothing at rest.' },
        { when: { socket: { 'so-cred': 'rokey' } }, pass: false,
          title: '✘ AccessDenied: cloudformation:UpdateStack', lines: 'read APIs ....... ok\ndeploy .......... DENIED', note: 'Least privilege means ENOUGH privilege: a deploy role that can\'t deploy just moves the failure. Scope to the actual actions.' },
        { pass: false, title: '✘ no credentials',
          lines: 'aws sts get-caller-identity ... no credentials', note: 'Seat an auth mechanism in the bay.' },
      ],
    },
    {
      id: 'leak', label: 'leak drill', trigger: 'terminal',
      rules: [
        { when: { socket: { 'so-cred': 'oidc' } }, pass: true,
          title: '✔ leaked credentials already dead', lines: 'simulated leak ....... session token\nvalid for ............ 9 more minutes\nscope ................ one stack\nrevocation ........... automatic (expiry)', note: 'Temporary credentials turn a leak from an incident into a countdown.' },
        { pass: false, title: '✘ leak = account takeover', alarm: 'CREDENTIAL LEAK',
          lines: 'leaked ............ eternal key\nvalid ............. forever\nscope ............. everything', note: 'Static keys make every leak permanent. Expiry is the safety property.' },
      ],
    },
  ],
  verifyDone: {
    title: 'Nothing to steal',
    body: 'Deploys run on fifteen-minute scoped credentials; the leak drill found only a token that dies on its own.',
    journal: 'Verified: OIDC + STS — scoped, short-lived, nothing stored.',
  },
};

export const SAM_SPEC: MissionSpec = {
  ticket: {
    incident: 'DEV-108', reporter: 'release', sev: 'SEV-2', title: 'The Snowflake Stack',
    bodyHtml:
      `<div>Staging works. Prod fails. Nobody can say how the two differ, because both were built by hand in the console over two years by five people, two of whom left. A new region is needed by Q4 and everyone is afraid.</div>` +
      `<pre>staging vs prod ... 47 undocumented differences (est.)\nsource of truth ... nobody\nrebuild plan ...... "don't lose the account"</pre>`,
    hint: 'Probe both stacks, diagnose, then dial the deploy method and survive the rebuild-region drill.',
  },
  objectiveFix: 'Dial the deploy method to SAM templates',
  objectiveDone: 'DEV-108 closed — environments are a template apart, not a mystery apart.',
  summary: 'Symptom: environments differ in unknowable ways; rebuilds are terrifying. Cause: console-built infrastructure — no source of truth, no diff, no review. Fix: define the stack in SAM/CloudFormation; environments become parameterized deployments of one reviewed template, drift detection flags manual edits, and a new region is one command. Traps: SSH-and-scripts centralizes the clicking but still mutates state with no reviewable definition; console + a wiki page drifts the day it\'s written.',
  level: [
    { id: 'staging', kind: 'serverRack', at: [-5, 1.5], yaw: Math.PI / 2, service: 'none' },
    { id: 'prod', kind: 'serverRack', at: [5, 1.5], yaw: -Math.PI / 2, service: 'none' },
    { id: 'dial', kind: 'aimPointer', at: [0, -1.8] },
    { id: 'lever', kind: 'chaosLever', at: [0, -4.5] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'release engineering', accent: '#8f7ae6' },
    { kind: 'zone', at: [-5, 1.5], w: 3.4, d: 3.4, hex: '#1a2433', text: 'staging' },
    { kind: 'zone', at: [5, 1.5], w: 3.4, d: 3.4, hex: '#33141b', text: 'prod' },
    { kind: 'hazard', at: [0, -5.6], w: 3, d: 0.8 },
  ],
  faultLamps: ['prod'],
  probes: [
    {
      id: 'prod', machine: 'prod', prompt: 'Inspect prod',
      kicker: 'environment', title: 'Built by hands now gone',
      pre: 'origin ........... console clicks, 2 years\nlast change ...... unknown\nmatches staging .. no (47 diffs found so far)',
      journal: 'Prod: hand-built and drifting. Every difference from staging is a place bugs hide.',
    },
    {
      id: 'staging', machine: 'staging', prompt: 'Inspect staging',
      kicker: 'environment', title: 'A different snowflake',
      pre: 'origin ........... also clicks, different hands\ntimeout here ..... 30s (prod: 3s!)\nenv vars ......... 6 extra',
      journal: 'Staging: not a copy of prod — a sibling raised by different parents. "Works in staging" proves little.',
    },
  ],
  diagnosis: {
    unlockedBy: 'prod',
    title: 'Why can nobody rebuild or even compare these environments?',
    correct: {
      label: 'The infrastructure has no source of truth — it exists only as accumulated console state',
      journal: 'Diagnosis: snowflake environments. The fix is a reviewed template that IS the environment.',
      confirmBody: 'Define the stack once in SAM. Staging and prod become the same template with different parameters; the diff is a code review, and a new region is sam deploy.',
      actionLabel: 'To the dial →',
    },
    wrongs: [
      { label: 'Screenshot every console page into the wiki', rebuttal: 'Documentation of state isn\'t control of state — it drifts the moment someone clicks. Templates are docs that DEPLOY.' },
      { label: 'Give everyone prod access to fix diffs by hand', rebuttal: 'More hands clicking is how the snowflakes formed. You\'d be scaling the root cause.' },
      { label: 'Freeze all changes to prod', rebuttal: 'A frozen mystery is still a mystery — and the Q4 region needs a REBUILD, which a freeze makes no easier.' },
    ],
  },
  dials: [
    {
      id: 'deploydial', machine: 'dial', initial: 'console',
      grabPrompt: '◀ ▶ swing the method · E/Ⓧ lock',
      positions: [
        { id: 'console', label: 'Console clicks (status quo)', angle: -0.7 },
        { id: 'sam', label: 'SAM template + sam deploy', angle: 0 },
        { id: 'ssh', label: 'SSH + shell scripts', angle: 0.7 },
      ],
    },
  ],
  levers: [{ id: 'lever-region', machine: 'lever', prompt: 'PULL — rebuild-region drill', beat: 'rebuild' }],
  beats: [
    {
      id: 'diffcheck', label: 'environment diff', trigger: 'terminal',
      rules: [
        { when: { dial: { deploydial: 'sam' } }, pass: true,
          title: '✔ diff = two parameters', lines: 'staging vs prod ....... same template\ndifferences ........... MemorySize, Stage\ndrift detection ....... clean', note: 'Environments as parameterized deployments: the differences are the ones you WROTE DOWN.' },
        { when: { dial: { deploydial: 'ssh' } }, pass: false,
          title: '✘ scripts drift too', lines: 'script version on staging ... v14\nscript version on prod ...... v9 (edited live)\nreviewable definition ....... none', note: 'Scripts that mutate state by SSH are console clicks with extra steps — still no source of truth, still no diff.' },
        { pass: false, title: '✘ 47 diffs and counting',
          lines: 'source of truth ....... none', note: 'Nothing to compare against. Swing the dial.' },
      ],
    },
    {
      id: 'rebuild', label: 'rebuild-region drill', trigger: 'lever',
      rules: [
        { when: { dial: { deploydial: 'sam' } }, pass: true,
          title: '✔ eu-central-1 in 11 minutes', lines: 'sam deploy --region eu-central-1\nstack .......... CREATE_COMPLETE\nmanual steps ... 0', note: 'The Q4 region is a command, not a quarter-long archaeology project.' },
        { when: { dial: { deploydial: 'ssh' } }, pass: false,
          title: '✘ scripts assume the old world', lines: 'hardcoded IDs ....... 23 (subnets, AMIs, ARNs)\nregion rebuild ...... failed at step 4 of 61', note: 'Imperative scripts encode the PATH, not the DESTINATION. Declarative templates rebuild anywhere.' },
        { pass: false, title: '✘ nobody dares',
          lines: 'rebuild attempted ... aborted, too risky', note: 'Console-only infrastructure cannot be rebuilt, only feared.' },
      ],
    },
  ],
  verifyDone: {
    title: 'The environment is a file now',
    body: 'The diff shrank to two named parameters and the region drill rebuilt everything in eleven minutes from the template.',
    journal: 'Verified: SAM template = source of truth; environments reproducible.',
  },
};

export const CANARY_SPEC: MissionSpec = {
  ticket: {
    incident: 'DEV-109', reporter: 'storefront', sev: 'SEV-1', title: 'The Friday Big Bang',
    bodyHtml:
      `<div>Friday 17:02: new checkout Lambda deployed to 100% of traffic. 17:04: error rate 38%. 17:31: someone finds the old zip on a laptop. The postmortem asks a simple question: why did EVERY user get the new code at once?</div>` +
      `<pre>deploy ............ $LATEST, all-at-once\nblast radius ...... 100% of checkout\nrollback .......... 29 minutes of laptop spelunking</pre>`,
    hint: 'Probe the alias setup and the alarms, diagnose, then dial the strategy and pull the bad-deploy drill.',
  },
  objectiveFix: 'Dial the deploy strategy to canary + alarm rollback',
  objectiveDone: 'DEV-109 closed — bad code meets 10% of users for 5 minutes, then rolls itself back.',
  summary: 'Symptom: a bad deploy took 100% of checkout down with a half-hour rollback. Cause: shipping $LATEST all-at-once — no immutable versions, no gradual exposure, no automated rollback. Fix: publish immutable versions behind an alias, shift 10% (canary) while CloudWatch alarms watch error rate, auto-promote or auto-rollback by pointer flip. Traps: a timer-only canary promotes bad code just as confidently ("10 minutes passed" proves nothing); blue-green-by-hand still hinges on a human noticing.',
  level: [
    { id: 'alias', kind: 'routerArm', at: [-2, 0.5], service: 'lambda' },
    { id: 'v1rack', kind: 'serverRack', at: [2.5, 2.5], yaw: -Math.PI / 2, service: 'none' },
    { id: 'v2rack', kind: 'serverRack', at: [2.5, -1.5], yaw: -Math.PI / 2, service: 'none' },
    { id: 'dial', kind: 'aimPointer', at: [-2, -3.5] },
    { id: 'lever', kind: 'chaosLever', at: [3, -5] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'release traffic control', accent: '#8f7ae6' },
    { kind: 'zone', at: [2.5, 2.5], w: 3, d: 2.6, hex: '#16233a', text: 'version 41 (stable)' },
    { kind: 'zone', at: [2.5, -1.5], w: 3, d: 2.6, hex: '#33141b', text: 'version 42 (new)' },
    { kind: 'hazard', at: [3, -6.1], w: 3, d: 0.8 },
  ],
  faultLamps: ['alias'],
  probes: [
    {
      id: 'alias', machine: 'alias', prompt: 'Inspect the alias',
      kicker: 'Lambda alias', title: 'One pointer, no plan',
      pre: 'live alias ....... → $LATEST (mutable!)\npublished versions .. none\ntraffic shifting .... none',
      journal: 'Alias: pointing at mutable $LATEST — deploys overwrite the running code with nothing to roll back TO.',
    },
    {
      id: 'v2rack', machine: 'v2rack', prompt: 'Inspect the new version',
      kicker: 'deploy artifact', title: 'It could have told us',
      pre: 'error rate (first 100 calls) ... 38%\nvisible after .................. ~40s\nalarms wired to deploy ......... none',
      journal: 'New version: the failure was measurable in 40 seconds. Nothing was watching, so 100% of users measured it instead.',
    },
  ],
  diagnosis: {
    unlockedBy: 'alias',
    title: 'Why did one bad deploy become a full outage?',
    correct: {
      label: 'All-at-once to a mutable target: no versions, no gradual exposure, no alarm-gated rollback',
      journal: 'Diagnosis: deploy risk unmanaged. Versions + alias + canary + alarms = blast radius 10%, rollback in seconds.',
      confirmBody: 'Publish immutable versions. Point the alias at v41, canary v42 at 10%, and let error-rate alarms promote or roll back automatically. Friday deploys become boring.',
      actionLabel: 'To the dial →',
    },
    wrongs: [
      { label: 'Ban Friday deploys', rebuttal: 'The weekday version of this deploy fails identically. Fear-based scheduling treats the calendar, not the blast radius.' },
      { label: 'Test more before shipping', rebuttal: 'Always — and some failures only appear under production traffic. The last line of defense is limiting who meets them first.' },
      { label: 'Keep the old zip somewhere safer', rebuttal: 'A faster laptop hunt is still a laptop hunt. Published versions make rollback a pointer flip, not a file search.' },
    ],
  },
  dials: [
    {
      id: 'strat', machine: 'dial', initial: 'allatonce',
      grabPrompt: '◀ ▶ swing the strategy · E/Ⓧ lock',
      positions: [
        { id: 'allatonce', label: 'All-at-once to $LATEST (status quo)', angle: -0.7 },
        { id: 'canary', label: 'Canary 10% + alarm auto-rollback', angle: 0 },
        { id: 'timeronly', label: 'Canary 10% + promote on timer (no alarms)', angle: 0.7 },
      ],
    },
  ],
  levers: [{ id: 'lever-bad', machine: 'lever', prompt: 'PULL — ship a bad version (drill)', beat: 'baddeploy' }],
  beats: [
    {
      id: 'baddeploy', label: 'bad-deploy drill', trigger: 'lever',
      rules: [
        { when: { dial: { strat: 'canary' } }, pass: true,
          title: '✔ rolled back before the pager fired', lines: 'exposure ........ 10% for 4m37s\nalarm ........... ERROR_RATE > 2% → triggered\nrollback ........ automatic, 11s\nusers affected .. ~0.7%', note: 'The alarm did the noticing and the alias did the rollback. Nobody\'s Friday was harmed.' },
        { when: { dial: { strat: 'timeronly' } }, pass: false,
          title: '✘ timer promoted the bug', lines: 'canary .......... 10% for 10 minutes\nerror rate ...... 38% (nobody watching)\npromotion ....... on schedule → 100%', note: 'WORKS-BUT: gradual exposure without alarms just delays the outage. Time passing is not a health check.' },
        { pass: false, title: '✘ 100% again', alarm: 'CHECKOUT DOWN',
          lines: 'exposure ........ 100% instantly\nrollback ........ manual', note: 'All-at-once to a mutable target. Swing the dial.' },
      ],
    },
    {
      id: 'rollbackcheck', label: 'rollback timing', trigger: 'terminal',
      rules: [
        { when: { dial: { strat: 'canary' } }, pass: true,
          title: '✔ rollback is a pointer flip', lines: 'versions ........ immutable v41, v42\nalias flip ...... 11 seconds\nlaptops searched  0', note: 'Immutable versions are what make rollback trustworthy — v41 is bit-for-bit what ran yesterday.' },
        { pass: false, title: '✘ rollback requires archaeology',
          lines: 'previous artifact ... location unknown\nETA ................. 29 minutes', note: 'Without published versions there is nothing to flip back to.' },
      ],
    },
  ],
  verifyDone: {
    title: 'Boring Fridays',
    body: 'The bad version met 10% of traffic, tripped the alarm, and rolled back in 11 seconds; rollback timing confirmed the pointer flip.',
    journal: 'Verified: canary + alarms + immutable versions. Blast radius contained.',
  },
};

export const PIPELINE_SPEC: MissionSpec = {
  ticket: {
    incident: 'DEV-110', reporter: 'eng-manager', sev: 'SEV-2', title: 'The Untested Hotfix',
    bodyHtml:
      `<div>Last night's "one-line hotfix" went straight from a laptop to prod, skipped the tests ("no time"), and took payments down for an hour — the test suite would have caught it in 90 seconds. This was the third time this quarter.</div>` +
      `<pre>path to prod ...... laptop → prod (pipeline bypassed)\ntests run ......... 0\ntime saved ........ 4 minutes\ndowntime caused ... 61 minutes</pre>`,
    hint: 'Probe the pipeline and the bypass, diagnose, then build the gated pipeline: test stage, then approval. Pull the bad-commit drill.',
  },
  objectiveFix: 'Seat the test gate and the approval gate in the pipeline',
  objectiveDone: 'DEV-110 closed — the paved road is now the only road, and it\'s faster than the ditch.',
  summary: 'Symptom: hotfixes bypass the pipeline and break prod. Cause: the pipeline is optional and slow-feeling, so urgency routes around it. Fix: CodePipeline with a blocking build+test stage (CodeBuild) and a manual approval before prod — and revoke the side door so the paved road is the only road. Traps: a "skip tests" toggle for emergencies recreates the bypass with a button (alarm); tests-after-deploy verify the crater, not the code.',
  level: [
    { id: 'pipe', kind: 'serverRack', at: [-6, 1.5], yaw: Math.PI / 2, service: 'codepipeline' },
    { id: 'build', kind: 'serverRack', at: [-1, 1.5], yaw: -Math.PI / 2, service: 'codebuild' },
    { id: 'prod', kind: 'dbTower', at: [5.5, 1.5], service: 'none' },
    { id: 'lever', kind: 'chaosLever', at: [0, -4.5] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'the paved road', accent: '#8f7ae6' },
    { kind: 'tray', at: [-6, 1.5], to: [5.5, 1.5], h: 3.1 },
    { kind: 'zone', at: [5.5, 1.5], w: 3, d: 3, hex: '#33141b', text: 'production' },
    { kind: 'hazard', at: [0, -5.6], w: 3, d: 0.8 },
  ],
  faultLamps: ['pipe'],
  probes: [
    {
      id: 'pipe', machine: 'pipe', prompt: 'Inspect the pipeline',
      kicker: 'CodePipeline', title: 'Optional, therefore skipped',
      pre: 'stages ........... source → deploy\ntest stage ....... none\napproval ......... none\nbypass ........... laptop deploy keys work fine',
      journal: 'Pipeline: no gates worth the name, and a side door that works. Urgency will always pick the side door.',
    },
    {
      id: 'build', machine: 'build', prompt: 'Inspect the build project',
      kicker: 'CodeBuild', title: '90 seconds nobody spent',
      pre: 'test suite ....... 340 tests, 90s\nlast night ....... would have FAILED\nrun before prod .. no',
      journal: 'Build: the failing test existed and takes 90 seconds. It just wasn\'t in anyone\'s way.',
    },
  ],
  diagnosis: {
    unlockedBy: 'pipe',
    title: 'How do you stop the next untested hotfix?',
    correct: {
      label: 'Make the pipeline the only path: blocking test stage, approval before prod, side door revoked',
      journal: 'Diagnosis: optional gates gate nothing. Block promotion on tests; approve into prod; close the bypass.',
      confirmBody: 'A 90-second test stage that CANNOT be skipped beats an hour of downtime every time. Seat the gates, then revoke the laptop deploy keys.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Write a policy forbidding bypasses', rebuttal: 'Last night\'s engineer knew the policy. At 2 a.m., enforcement beats intention — the door must actually be closed.' },
      { label: 'Run the tests after deploying', rebuttal: 'Post-deploy tests confirm the outage you already shipped. Gates belong BEFORE promotion.' },
      { label: 'Only seniors may deploy', rebuttal: 'Seniors wrote this hotfix. Human ceremony doesn\'t scale; automated gates don\'t get tired.' },
    ],
  },
  pallet: {
    at: [6, -5],
    modules: [
      { id: 'mod-test', kind: 'testgate', label: 'CodeBuild test stage — blocks on failure', spot: [5.4, -4.6], visual: { hex: '#4a3f68', glowHex: '#8f7ae6' } },
      { id: 'mod-approve', kind: 'approvegate', label: 'Manual approval before prod', spot: [6.6, -4.6], visual: { hex: '#4a3f68', glowHex: '#b8a3f0' } },
      { id: 'mod-skip', kind: 'skiptoggle', label: '"Skip tests" emergency toggle', spot: [5.4, -5.4], visual: { hex: '#7a3a3a', glowHex: '#e85f5f', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-test', label: 'test gate slot', at: [-1, 4],
      blurb: 'Between source and staging: whatever seats here decides if the artifact moves forward.',
      allow: { testgate: true },
      refuse: {
        skiptoggle: { reason: 'An emergency skip button is the old bypass wearing a hi-viz vest. It WILL be pressed.', alarm: 'GATE BYPASS INSTALLED' },
        approvegate: { reason: 'Humans approve releases, machines verify code. The test gate goes first.' },
      },
      fallback: { reason: 'The test slot takes an automated gate.' },
    },
    {
      id: 'so-approve', label: 'prod approval slot', at: [3, 4],
      blurb: 'The staging→prod boundary: the last stop before customers.',
      allow: { approvegate: { requiresSocket: 'so-test', requiresKind: 'testgate', elseReason: 'Approving untested artifacts is signing blank cheques — seat the test gate first.' } },
      refuse: {
        skiptoggle: { reason: 'Same button, same problem.', alarm: 'GATE BYPASS INSTALLED' },
        testgate: { reason: 'Tests already ran by this point — this slot wants the human sign-off.' },
      },
      fallback: { reason: 'The approval slot takes a release gate.' },
    },
  ],
  levers: [{ id: 'lever-badcommit', machine: 'lever', prompt: 'PULL — bad commit incoming (drill)', beat: 'badcommit' }],
  beats: [
    {
      id: 'badcommit', label: 'bad-commit drill', trigger: 'lever',
      rules: [
        { when: { socket: { 'so-test': 'testgate', 'so-approve': 'approvegate' } }, pass: true,
          title: '✔ stopped at the gate, 94 seconds in', lines: 'commit .......... last night\'s hotfix\ntest stage ...... FAILED (3 tests)\nprod impact ..... none\nfix forward ..... 12 min, through the pipeline', note: 'The pipeline spent 94 seconds to save an hour. That is the entire business case.' },
        { when: { socket: { 'so-test': 'testgate' } }, pass: false,
          title: '✘ caught the bug, shipped the next one', lines: 'tested artifact ....... promoted straight to prod\nrelease coordination .. none', note: 'Tests without a prod approval still surprise the humans who own the release. Seat the approval gate.' },
        { pass: false, title: '✘ prod down again', alarm: 'UNTESTED DEPLOY',
          lines: 'path ............ straight to prod\ntests ........... skipped', note: 'No gates, no protection. Build the pipeline.' },
      ],
    },
    {
      id: 'leadtime', label: 'lead-time check', trigger: 'terminal',
      rules: [
        { when: { socket: { 'so-test': 'testgate', 'so-approve': 'approvegate' } }, pass: true,
          title: '✔ paved road faster than the ditch', lines: 'commit → prod ........ 9 min (tests + approve)\nold "fast" path ...... 4 min + 61 min downtime', note: 'Gates feel slow until you amortize the outages. The paved road wins on real math.' },
        { pass: false, title: '✘ still racing the ditch',
          lines: 'gates ........... incomplete', note: 'Finish the pipeline: test gate, then approval.' },
      ],
    },
  ],
  verifyDone: {
    title: 'The only road is paved',
    body: 'The bad commit died in the test stage in 94 seconds with zero prod impact, and commit-to-prod lead time is nine gated minutes.',
    journal: 'Verified: blocking tests + prod approval. Bypass culture ended by architecture.',
  },
};

export const XRAY_SPEC: MissionSpec = {
  ticket: {
    incident: 'DEV-111', reporter: 'api-oncall', sev: 'SEV-2', title: 'The Sometimes-Slow API',
    bodyHtml:
      `<div>One request in twenty takes six seconds; the rest take eighty milliseconds. Every dashboard shows healthy AVERAGES. The request crosses the gateway, two Lambdas, and a table — and nobody can say which hop eats the time.</div>` +
      `<pre>p50 ............... 80ms\np95 ............... 6.1s (!!)\ndashboards ........ all green (averages)\nhops .............. gw → auth λ → orders λ → DDB</pre>`,
    hint: 'Seat tracing first — you cannot fix what you cannot see. Then follow the trace to the guilty hop and dial the fix.',
  },
  objectiveFix: 'Seat X-Ray tracing, then dial the DDB access pattern',
  objectiveDone: 'DEV-111 closed — the trace pointed at a Scan; a Query killed the tail.',
  summary: 'Symptom: brutal p95 hiding under healthy averages. Method: X-Ray tracing — segments per hop per request — shows exactly where ONE slow request spends its time; here, 5.8s inside a DynamoDB Scan that returns three items. Fix: a keyed Query. Lessons: averages hide tails; traces assign blame across service boundaries; and Scans are how tiny result sets read entire tables. More memory speeds up ALL hops slightly and fixes nothing.',
  level: [
    { id: 'gw', kind: 'routerArm', at: [-6, 0.5], service: 'apigw' },
    { id: 'orders', kind: 'serverRack', at: [-1, 0.5], yaw: -Math.PI / 2, service: 'lambda' },
    { id: 'table', kind: 'dbTower', at: [4, 0.5], service: 'dynamodb' },
    { id: 'dial', kind: 'aimPointer', at: [4, -3] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'latency forensics', accent: '#33b38c' },
    { kind: 'tray', at: [-6, 0.5], to: [4, 0.5], h: 3.0 },
    { kind: 'zone', at: [4, 0.5], w: 3, d: 3, hex: '#2a1a2e', text: 'orders table' },
    { kind: 'light', at: [8.5, -5], yaw: -Math.PI / 2 },
  ],
  faultLamps: ['orders'],
  probes: [
    {
      id: 'gw', machine: 'gw', prompt: 'Inspect the dashboards',
      kicker: 'CloudWatch', title: 'Averages, hiding a tail',
      pre: 'avg latency ...... 190ms — green\np95 .............. 6.1s — nobody graphed it\nblame ............ unassignable across hops',
      journal: 'Dashboards: averages smear one 6s request across nineteen fast ones. The tail needs traces, not means.',
    },
    {
      id: 'orders', machine: 'orders', prompt: 'Inspect the orders Lambda',
      kicker: 'Lambda', title: 'Four suspects, no witness',
      pre: 'code paths ....... auth call, DDB read, render\nlogs ............. per-service, uncorrelated\nrequest id join .. manual, hopeless',
      journal: 'Handler: logs exist per service but nothing ties one request\'s journey together. That is what tracing is.',
    },
  ],
  diagnosis: {
    unlockedBy: 'gw',
    title: 'How do you find which hop eats the p95?',
    correct: {
      label: 'Distributed tracing: X-Ray segments time each hop of ONE request — instrument first, then follow the trace',
      journal: 'Diagnosis: observability gap. Traces assign latency to hops; averages never will.',
      confirmBody: 'Seat the X-Ray tracing module. The very next slow request will draw you a map of its six seconds — then fix what the map shows.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Double the Lambda memory everywhere', rebuttal: 'A blind speedup: everything gets marginally faster, the 5.8s Scan stays a Scan, and the bill doubles. Diagnose, then spend.' },
      { label: 'Add more logging statements', rebuttal: 'More uncorrelated logs deepen the haystack. Traces are logs with a spine — one request, all hops, timed.' },
      { label: 'Raise the gateway timeout past 6s', rebuttal: 'That makes slow requests SUCCEED slowly forever. The ticket is the latency, not the timeout.' },
    ],
  },
  pallet: {
    at: [6.5, -5.5],
    modules: [
      { id: 'mod-xray', kind: 'xraymod', label: 'X-Ray tracing — segments on every hop', spot: [5.9, -5.1], visual: { hex: '#5a4a2e', glowHex: '#e8c07a' } },
      { id: 'mod-mem', kind: 'memup', label: 'Double all memory', spot: [7.1, -5.1], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-trace', label: 'instrumentation bay', at: [-1, 3.2],
      blurb: 'Cross-cutting instrumentation for every hop: trace headers in, segments out.',
      allow: { xraymod: true },
      refuse: {
        memup: { reason: 'Spending before seeing: a blind 2× on every function is a bill, not a diagnosis.' },
      },
      fallback: { reason: 'The instrumentation bay takes observability tooling.' },
    },
  ],
  dials: [
    {
      id: 'access', machine: 'dial', initial: 'scan',
      grabPrompt: '◀ ▶ swing the access pattern · E/Ⓧ lock',
      positions: [
        { id: 'scan', label: 'Scan + filter (status quo)', angle: -0.6 },
        { id: 'query', label: 'Query on partition key', angle: 0.3 },
      ],
    },
  ],
  beats: [
    {
      id: 'trace', label: 'trace capture', trigger: 'terminal',
      rules: [
        { when: { socket: { 'so-trace': 'xraymod' } }, pass: true,
          title: '✔ the map of six seconds', lines: 'gw ............. 4ms\nauth λ ......... 61ms\norders λ ....... 5,890ms\n  └ DDB Scan ... 5,844ms ← THERE\nrender ......... 12ms', note: 'One trace ended the mystery: 96% of the slow request lives inside a table Scan. Now fix WHAT THE TRACE SHOWS.' },
        { pass: false, title: '✘ still guessing',
          lines: 'suspects ....... 4 hops\nevidence ....... none', note: 'No instrumentation, no map. Seat the tracing module.' },
      ],
    },
    {
      id: 'tail', label: 'p95 re-test', trigger: 'terminal',
      rules: [
        { when: { socket: { 'so-trace': 'xraymod' }, dial: { access: 'query' } }, pass: true,
          title: '✔ p95: 6.1s → 96ms', lines: 'op ............. Query PK=user#...\nread ........... 3 items, 3 items billed\np95 ............ 96ms\ntrace .......... flat and boring', note: 'The Scan read the whole table to return three rows. The Query reads three rows. The tail was never a capacity problem.' },
        { when: { dial: { access: 'query' } }, pass: false,
          title: '✘ fixed blind — prove it', lines: 'p95 ............ improved?\nevidence ....... none (no traces)', note: 'The dial moved, but without instrumentation you can\'t verify the fix or catch the next tail. Seat tracing.' },
        { pass: false, title: '✘ p95 still 6.1s',
          lines: 'op ............. Scan, full table\nfor ............ 3 items', note: 'The trace already told you which hop. Swing the access dial.' },
      ],
    },
  ],
  verifyDone: {
    title: 'Guilt, assigned by trace',
    body: 'The trace pinned 5.8 of 6 seconds on a table Scan; the keyed Query dropped p95 to 96ms with the trace to prove it.',
    journal: 'Verified: X-Ray found the hop, Query fixed it, p95 96ms.',
  },
};

export const TUNING_SPEC: MissionSpec = {
  ticket: {
    incident: 'DEV-112', reporter: 'finops', sev: 'SEV-3', title: 'The Thrifty Timeout',
    bodyHtml:
      `<div>The image-resize Lambda was set to 128MB "to save money". It runs 28 seconds per image, times out on the big ones, retries the whole 28 seconds, and the cold starts on the checkout path are two full seconds. The savings are costing a fortune.</div>` +
      `<pre>memory ............ 128MB (CPU to match)\nduration .......... 28s avg, timeouts retry all of it\ncold starts ....... 2.1s on a checkout endpoint\nbill .............. UP 40% this quarter</pre>`,
    hint: 'Probe the function and the bill, diagnose, then dial memory right — and seat provisioned concurrency where latency matters.',
  },
  objectiveFix: 'Dial memory to the sweet spot · seat provisioned concurrency',
  objectiveDone: 'DEV-112 closed — right-sized: faster, cheaper, and warm where it counts.',
  summary: 'Symptom: a "cheap" 128MB function that is slow, timing out, and expensive. Cause: Lambda CPU scales WITH memory — starving memory starves CPU, stretching duration (billed in GB-seconds) and feeding timeout-retries that redo whole runs. Fix: right-size (1024MB here: ~8× faster, net cheaper) and add provisioned concurrency on the latency-sensitive alias for cold starts. Trap: 10GB monster mode is fast but the curve flattened long ago — GB-seconds climb again (works-but fails the bill beat).',
  level: [
    { id: 'fn', kind: 'serverRack', at: [-2, 0.5], yaw: -Math.PI / 2, service: 'lambda' },
    { id: 'bill', kind: 'shelfUnit', at: [5, 1.5], yaw: -Math.PI / 2, args: ['#67ad5b'], service: 'none' },
    { id: 'dial', kind: 'aimPointer', at: [-2, -3] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'right-sizing lab', accent: '#33b38c' },
    { kind: 'zone', at: [-2, 0.5], w: 3, d: 3, hex: '#14202e', text: 'resize fleet' },
    { kind: 'zone', at: [5, 1.5], w: 3, d: 3, hex: '#142e1a', text: 'finops desk' },
    { kind: 'light', at: [-8.5, -5], yaw: Math.PI / 2 },
  ],
  faultLamps: ['fn'],
  probes: [
    {
      id: 'fn', machine: 'fn', prompt: 'Inspect the function',
      kicker: 'Lambda', title: 'Starved of CPU on purpose',
      pre: 'memory ........... 128MB → fractional vCPU\nduration ......... 28s (CPU-bound resize)\ntimeouts ......... 4% → full retries\ncold start ....... 2.1s on checkout alias',
      journal: 'Function: memory IS the CPU dial on Lambda. 128MB means a sliver of a core grinding a CPU-bound job.',
    },
    {
      id: 'bill', machine: 'bill', prompt: 'Inspect the bill',
      kicker: 'FinOps', title: 'The economics of slow',
      pre: 'billed ........... GB-seconds × requests\n128MB × 28s ...... 3.58 GB-s per image\n1024MB × 3.4s .... 3.48 GB-s per image (and 8× faster)\nretries .......... billed twice, obviously',
      journal: 'Bill: GB-seconds. If more memory shrinks duration faster than the multiplier grows, the bigger function is CHEAPER.',
    },
  ],
  diagnosis: {
    unlockedBy: 'bill',
    title: 'Why is the 128MB "savings" so expensive?',
    correct: {
      label: 'CPU scales with memory: starving it stretches billed duration and feeds timeout-retries — right-size for the sweet spot',
      journal: 'Diagnosis: undersized memory = undersized CPU = long duration = high GB-seconds + retries.',
      confirmBody: 'Dial to where duration × memory bottoms out (1024MB here), and give the checkout alias provisioned concurrency so init cost is paid before the request, not during it.',
      actionLabel: 'To the dial →',
    },
    wrongs: [
      { label: 'Extend the timeout to 15 minutes', rebuttal: 'Now the slow run always completes — slowly, expensively, and still cold on checkout. Timeouts bound the damage; they don\'t create speed.' },
      { label: 'Lambda is wrong for this — move to EC2', rebuttal: 'A right-sized Lambda does this job in 3 seconds for fractions of a cent. Re-platforming to escape a mis-set dial is a very expensive way to not read the pricing page.' },
      { label: 'More retries so timeouts eventually succeed', rebuttal: 'Each retry re-bills the whole slow run. You\'d be purchasing the problem in bulk.' },
    ],
  },
  dials: [
    {
      id: 'mem', machine: 'dial', initial: 'm128',
      grabPrompt: '◀ ▶ swing the memory · E/Ⓧ lock',
      positions: [
        { id: 'm128', label: '128MB (status quo)', angle: -0.7 },
        { id: 'm1024', label: '1024MB (sweet spot)', angle: 0 },
        { id: 'm10240', label: '10,240MB (monster mode)', angle: 0.7 },
      ],
    },
  ],
  pallet: {
    at: [6.5, -5.5],
    modules: [
      { id: 'mod-pc', kind: 'provconc', label: 'Provisioned concurrency — checkout alias', spot: [5.9, -5.1], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-retry', kind: 'retrymore', label: 'Retry budget ×5', spot: [7.1, -5.1], visual: { hex: '#7a3a3a', glowHex: '#e85f5f', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-warm', label: 'checkout alias bay', at: [-2, 3.2],
      blurb: 'Latency-sensitive alias configuration: what seats here shapes the first request, not just the thousandth.',
      allow: { provconc: true },
      refuse: {
        retrymore: { reason: 'Retrying a cold start still starts cold. Warmth is provisioned, not retried.' },
      },
      fallback: { reason: 'The alias bay takes concurrency configuration.' },
    },
  ],
  beats: [
    {
      id: 'latency', label: 'latency run', trigger: 'terminal',
      rules: [
        { when: { dial: { mem: 'm1024' }, socket: { 'so-warm': 'provconc' } }, pass: true,
          title: '✔ 3.4s warm, no cold starts', lines: 'duration ........ 28s → 3.4s\ntimeouts ........ 0\ncheckout p99 .... 210ms (warm envs)', note: 'CPU followed memory; the checkout path pays its init cost before the customer arrives.' },
        { when: { dial: { mem: 'm10240' }, socket: { 'so-warm': 'provconc' } }, pass: true,
          title: '✔ fast — suspiciously fast', lines: 'duration ........ 2.9s\ncurve ........... flattened after 1GB', note: 'It passes — but the resize stopped scaling past ~1GB. Check the bill beat before you call this the sweet spot.' },
        { pass: false, title: '✘ still grinding',
          lines: 'duration ........ 28s\ncold starts ..... present', note: 'Starved CPU and cold checkout. Dial the memory and seat provisioned concurrency.' },
      ],
    },
    {
      id: 'bill', label: 'bill review', trigger: 'terminal',
      rules: [
        { when: { dial: { mem: 'm1024' } }, pass: true,
          title: '✔ faster AND cheaper', lines: '128MB×28s ....... 3.58 GB-s + retries\n1024MB×3.4s ..... 3.48 GB-s, no retries\nquarter est ..... −38%', note: 'The sweet spot: duration fell 8× while memory rose 8× — and the retry tax vanished.' },
        { when: { dial: { mem: 'm10240' } }, pass: false,
          title: '✘ monster mode, monster bill', lines: '10GB×2.9s ....... 29.0 GB-s per image\nvs sweet spot ... 8× the cost for 0.5s', note: 'WORKS-BUT: past the flattening point you buy memory the CPU-bound job can\'t use. Tune to the curve, not the max.' },
        { pass: false, title: '✘ the thrifty setting strikes again',
          lines: 'GB-s + retry tax ... maximum', note: 'Undersized is the expensive setting. Swing the dial.' },
      ],
    },
  ],
  verifyDone: {
    title: 'Right-sized',
    body: 'Latency run: 3.4s warm with a 210ms checkout p99; bill review: 38% cheaper than the "thrifty" setting that started this ticket.',
    journal: 'Verified: 1024MB sweet spot + provisioned concurrency — faster and cheaper.',
  },
};
