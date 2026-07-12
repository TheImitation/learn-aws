import type { MissionSpec } from '../spec';

/** Resilient-domain batch 2 — five specs, incl. the four-station matching
 *  puzzle (pick-messaging). */

export const EVENTBRIDGE_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-7440', reporter: 'platform', sev: 'SEV-3', title: 'Everything, Everywhere',
    bodyHtml:
      `<div>Every S3 object-created event goes to one Lambda that is 400 lines of if/else: invoices to the finance workflow, images to the thumbnailer, exports to the warehouse loader. Each new event type means editing the monolith. Oh — and the hourly cleanup job runs on an EC2 box whose only job is cron.</div>` +
      `<pre>routing .......... one Lambda, 400 lines of if/else\nnew route ........ edit + redeploy the monolith\nschedule ......... a whole EC2 for one cron line\nwanted ........... route by CONTENT, add targets freely</pre>`,
    hint: 'Probe the router monolith and the cron box, diagnose, then socket the event bus. The routing test AND the schedule test must pass.',
  },
  objectiveFix: 'Socket the event router in the bus bay',
  objectiveDone: 'INC-7440 closed — rules route, cron is serverless.',
  summary: 'Symptom: a 400-line if/else Lambda routing every event, and an EC2 box that exists to run cron. Fix: Amazon EventBridge — rules match event CONTENT (key prefix, metadata, attributes) and route to multiple targets; producers and consumers are decoupled, so new targets are new rules, not code changes. The hourly job becomes an EventBridge scheduled rule (cron/rate) targeting Lambda — no servers. SNS broadcasts a topic to ALL subscribers; EventBridge ROUTES by content from many sources — different shapes.',
  level: [
    { id: 'router', kind: 'serverRack', at: [3.5, 1.5], yaw: Math.PI / 2 },
    { id: 'cronbox', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2 },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'router', machine: 'router', prompt: 'Inspect the router monolith',
      kicker: 'router Lambda', title: '400 lines of if/else',
      pre: 'if key.startsWith("invoices/") …\nelse if key.startsWith("images/") …\nelse if metadata.type == "export" …\nnew route ........ edit, review, redeploy, pray',
      journal: 'Router: one Lambda hand-routing by content — every new consumer means surgery on the monolith.',
    },
    {
      id: 'cronbox', machine: 'cronbox', prompt: 'Inspect the cron box',
      kicker: 'EC2 t3.small', title: 'A server for one line of crontab',
      pre: 'purpose .......... 0 * * * * cleanup.sh\nuptime ........... 100% for 5 min/day of work\npatching ......... yours, forever',
      journal: 'Cron box: a patched, billed, monitored server whose entire job is “every hour”.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-eb', kind: 'eb', label: 'EventBridge bus + rules', spot: [-2.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-sns', kind: 'sns', label: 'SNS topic (broadcast)', spot: [-1.7, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-more', kind: 'moreif', label: 'More if/else (v2, now with switch)', spot: [-2.3, -5.5], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-bus', label: 'event bus bay', at: [0.5, -1.2],
      blurb: 'The routing fabric: rules match event content and attributes, targets receive only what their rule matches, and schedules are rules too. Producers publish; the bus decides.',
      allow: { eb: true, sns: true },
      refuse: {
        moreif: { reason: 'A tidier monolith is still a monolith — the router stays the bottleneck every team must edit.' },
      },
      fallback: { reason: 'The bus bay takes an event router.' },
    },
  ],
  beats: [
    {
      id: 'route', label: 'routing test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-bus': 'eb' } }, pass: true,
          title: '✔ Routed by content — nobody edited anything',
          lines: 'invoices/* ....... → finance workflow\nimages/* ......... → thumbnailer\ntype=export ...... → warehouse loader\nnew target ....... a new RULE, zero code changes',
          note: 'Rules match key prefixes, metadata, attributes — routing is configuration on the bus, and adding a consumer never touches the producer or the other routes.',
        },
        {
          when: { socket: { 'so-bus': 'sns' } }, pass: false,
          title: '✘ Everyone got everything',
          lines: 'topic ............ broadcast to ALL subscribers\nthumbnailer ...... received invoices (why)\nfiltering ........ pushed into every consumer',
          note: 'SNS broadcasts a topic to every subscriber — the right shape for “tell everyone”, the wrong one for “route by content”. EventBridge rules choose targets per event.',
        },
        {
          pass: false,
          title: '✘ The monolith routes on',
          lines: 'bus bay .......... empty',
          note: 'Socket the router.',
        },
      ],
    },
    {
      id: 'sched', label: 'schedule test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-bus': 'eb' } }, pass: true,
          title: '✔ Hourly rule fired; the EC2 box is off',
          lines: 'schedule ......... rate(1 hour) rule → Lambda\nservers .......... none\ncron box ......... decommissioned',
          note: 'Scheduled rules are cron without the box: the bus fires the target on time, and there is nothing left to patch.',
        },
        {
          pass: false,
          title: '✘ Still patching a server to own a crontab',
          lines: 'schedule ......... crontab on EC2',
          note: 'The event bus schedules too — one rule replaces the box.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Rules route, cron is serverless',
    body: 'EventBridge rules route by content to exactly the right targets, new consumers are new rules, and the hourly job is a scheduled rule with no server under it. Broadcast belongs to SNS; ROUTING belongs to the bus. Close the ticket at the field terminal.',
    journal: 'Routing + schedule tests passed — EventBridge rules and scheduled rule.',
  },
  diagnosis: {
    unlockedBy: 'router',
    title: 'What replaces content-routing if/else AND the cron box?',
    correct: {
      label: 'EventBridge: content-based rules routing to multiple targets, plus a scheduled rule for the hourly job',
      journal: 'Diagnosis confirmed: EventBridge rules for content routing; scheduled rules for cron.',
      confirmBody: 'Routing decisions belong on the bus, not in a Lambda every team has to edit. And the hourly job needs a schedule, not a server.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Split the monolith into three smaller routers', rebuttal: 'Three monoliths now. The routing logic is still CODE someone edits per change instead of rules on a bus.' },
      { label: 'SNS topic with one subscription per consumer', rebuttal: 'SNS pushes EVERY message to EVERY subscriber — the filtering you need would move into each consumer.' },
      { label: 'Have consumers poll S3 listings for their prefixes', rebuttal: 'Three pollers rediscovering the same bucket forever — latency, cost, and duplicated logic instead of one routed event.' },
    ],
  },
  faultLamps: ['router'],
};

export const CFN_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-5017', reporter: 'platform', sev: 'SEV-3', title: 'The Snowflake Environment',
    bodyHtml:
      `<div>Staging was built by hand in 2024 and has drifted so far from production that test results mean nothing. The runbook for rebuilding it is a wiki page with 41 steps, three of which are wrong. Last month someone “fixed” prod directly in the console and nobody can say what changed.</div>` +
      `<pre>staging .......... hand-built, drifted, untrusted\nrebuild runbook .. 41 wiki steps (3 wrong)\nprod changes ..... console, untracked\nwanted ........... identical envs, reviewed changes</pre>`,
    hint: 'Probe both environments, diagnose, then socket the provisioner and set the apply-mode dial. The rebuild drill (lever) AND the prod-change test must pass.',
  },
  objectiveFix: 'Socket the provisioner · dial the apply mode to CHANGE SET',
  objectiveDone: 'INC-5017 closed — environments from one template, changes previewed.',
  summary: 'Symptom: hand-built snowflake environments, drifted and unreproducible, with untracked console changes to prod. Fix: infrastructure as code — a CloudFormation template deployed as one stack per environment: identical dev/staging/prod from a single versioned, peer-reviewed definition, clean teardown, automatic ROLLBACK to last-known-good when an update fails. Before touching prod, a CHANGE SET previews exactly what will be created, modified, or REPLACED — no more surprise resource replacement at 2 p.m.',
  level: [
    { id: 'staging', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2 },
    { id: 'prod', kind: 'serverRack', at: [3.5, 1.5], yaw: Math.PI / 2 },
    { id: 'dial', kind: 'aimPointer', at: [-2, -2] },
    { id: 'lever', kind: 'chaosLever', at: [3.5, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'staging', machine: 'staging', prompt: 'Inspect staging',
      kicker: 'staging', title: 'A snowflake, melting',
      pre: 'built ............ by hand, 2024\ndrift vs prod .... 23 known differences\ntest signal ...... noise\nrebuild .......... 41 wiki steps, 3 wrong',
      journal: 'Staging: hand-built and drifted — tests against it prove nothing about prod.',
    },
    {
      id: 'prod', machine: 'prod', prompt: 'Inspect production',
      kicker: 'production', title: 'Edited live, unreviewed',
      pre: 'last change ...... console, by hand\nreview ........... none\nrecord ........... none\nrollback plan .... “undo it by hand?”',
      journal: 'Prod: console-edited with no review, no record, no rollback. Infrastructure changes need the same discipline as code.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-cfn', kind: 'cfn', label: 'CloudFormation template + stacks', spot: [-2.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-bash', kind: 'bash', label: 'provision.sh (bash, 900 lines)', spot: [-1.7, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-wiki', kind: 'wiki', label: 'The 41-step wiki page (laminated)', spot: [-2.3, -5.5], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-prov', label: 'provisioner bay', at: [0.5, -1.2],
      blurb: 'Where environments come from: a declared definition, versioned and reviewed, that stamps out identical stacks and knows how to roll back.',
      allow: { cfn: true, bash: true },
      refuse: {
        wiki: { reason: 'A laminated runbook is documentation of the problem, not a provisioner. Humans following steps IS how staging drifted.' },
      },
      fallback: { reason: 'The provisioner bay takes infrastructure-as-code.' },
    },
  ],
  dials: [
    {
      id: 'apply', machine: 'dial', initial: 'yolo',
      grabPrompt: '◀ ▶ swing the apply mode · E/Ⓧ lock',
      positions: [
        { id: 'yolo', label: 'apply: DIRECT (yolo)', angle: 2.0 },
        { id: 'changeset', label: 'apply: CHANGE SET first', angle: 1.0 },
      ],
    },
  ],
  levers: [
    { id: 'lever-rebuild', machine: 'lever', prompt: 'PULL — destroy & rebuild staging (drill)', beat: 'rebuild' },
  ],
  beats: [
    {
      id: 'rebuild', label: 'rebuild drill', trigger: 'lever',
      rules: [
        {
          when: { socket: { 'so-prov': 'cfn' } }, pass: true,
          title: '✔ Staging, identical, in 22 minutes',
          lines: 'teardown ......... clean (stack delete)\nrebuild .......... one template → one stack\ndrift vs prod .... zero — same definition\nfailure mode ..... auto-ROLLBACK to last good',
          note: 'One reviewed template stamps out identical environments — and a failed update rolls back by itself instead of stranding a half-built stack.',
        },
        {
          when: { socket: { 'so-prov': 'bash' } }, pass: false,
          title: '✘ The script died on line 412',
          lines: 'progress ......... half an environment\nstate ............ unknown — script has no memory\nrollback ......... rm -rf and start over\ndrift ............ already, somehow',
          note: 'Scripts imperatively DO; they don’t know what exists, can’t diff desired vs actual, and a mid-run failure leaves wreckage. Declare the end state and let the engine converge — with rollback built in.',
        },
        {
          pass: false,
          title: '✘ 41 steps, day two',
          lines: 'provisioner ...... none',
          note: 'Socket one.',
        },
      ],
    },
    {
      id: 'prodchange', label: 'prod-change test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-prov': 'cfn' }, dial: { apply: 'changeset' } }, pass: true,
          title: '✔ Previewed: 1 modify, 1 add — and one REPLACE, caught',
          lines: 'change set ....... shows exact planned actions\nsurprise ......... the subnet change = REPLACEMENT\ndecision ......... amended before touching prod\napplied .......... reviewed, recorded, reversible',
          note: 'The change set showed the innocent-looking edit would REPLACE a resource — before it did. Preview, review, then execute: infrastructure changes with the same discipline as code.',
        },
        {
          when: { socket: { 'so-prov': 'cfn' }, dial: { apply: 'yolo' } }, pass: false,
          title: '✘ Surprise replacement took prod down at 14:02',
          lines: 'edit ............. “just a subnet setting”\nactual action .... RESOURCE REPLACEMENT\ndowntime ......... 11 minutes, unplanned',
          note: 'Some updates replace resources rather than modify them — a change set would have said so in advance. Swing the dial: preview first, always, for prod.',
        },
        {
          pass: false,
          title: '✘ Console-edited, again',
          lines: 'provisioner ...... missing',
          note: 'Template first; then we can talk about how to apply it.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ One definition, every environment, previewed changes',
    body: 'Dev, staging, and prod from the same versioned template; failed updates roll back on their own; and every prod change is a reviewed change set before it’s an action. Snowflakes melted. Close the ticket at the field terminal.',
    journal: 'Rebuild drill + prod-change test passed — CloudFormation with change sets.',
  },
  diagnosis: {
    unlockedBy: 'staging',
    title: 'What makes environments reproducible AND prod changes safe?',
    correct: {
      label: 'Declare the infrastructure as a CloudFormation template — one stack per environment, change sets to preview prod updates',
      journal: 'Diagnosis confirmed: IaC via CloudFormation; change sets before prod applies.',
      confirmBody: 'Identical environments come from a shared definition, not shared effort. And prod deserves a preview: change sets show every create, modify, and REPLACE before it happens.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Freeze staging so it can’t drift further', rebuttal: 'A frozen wrong environment is still wrong — and prod keeps moving away from it.' },
      { label: 'Write a better, longer wiki runbook', rebuttal: 'Step 42 will also be wrong eventually. Humans executing documents is the drift GENERATOR.' },
      { label: 'Give fewer people console access to prod', rebuttal: 'Fewer unreviewed edits is still unreviewed edits — and reproducibility hasn’t improved at all.' },
    ],
  },
  faultLamps: ['staging'],
};

export const PICKMSG_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-6006', reporter: 'architecture', sev: 'SEV-3', title: 'Four Teams, Four Shapes',
    bodyHtml:
      `<div>Four teams filed four messaging requests and someone answered all of them with “use Kafka?”. The requests: hand work to ONE worker pool with retries; push one event to MANY subscribers; route events by CONTENT to different targets; and keep an ordered, REPLAYABLE stream several readers can re-read. Four shapes — match the right service to each station.</div>` +
      `<pre>station 1 ........ one worker pool · retries · DLQ\nstation 2 ........ push to many, independently\nstation 3 ........ route by content/attributes\nstation 4 ........ ordered · replayable · multi-reader</pre>`,
    hint: 'Probe the stations’ manifests, diagnose, then socket the right service at each of the four stations. The delivery audit AND the replay drill (lever) must pass.',
  },
  objectiveFix: 'Match all four services to their stations',
  objectiveDone: 'INC-6006 closed — four shapes, four right answers.',
  summary: 'The messaging decision, four ways: SQS = a queue ONE worker pool pulls from at its own pace (retries, DLQ, decouple + buffer); SNS = push pub/sub fanning one event to many independent subscribers; EventBridge = rule/content-based routing from many sources to chosen targets; Kinesis = an ordered, replayable, high-volume stream that multiple readers consume independently (and can re-read from hours ago). Pick by SHAPE — pull-queue, broadcast, router, stream — not by fashion.',
  level: [
    { id: 'depot', kind: 'crowdGate', at: [-8, 2.5], yaw: Math.PI / 2 },
    { id: 'board', kind: 'serverRack', at: [-4.5, 2.5], yaw: Math.PI / 2 },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
    { id: 'lever', kind: 'chaosLever', at: [5.5, -4.2] },
  ],
  probes: [
    {
      id: 'depot', machine: 'depot', prompt: 'Inspect the request depot',
      kicker: 'four requests', title: 'Four shapes of message',
      pre: '1 · tasks → ONE pool, pulled, retried, DLQ\n2 · one event → MANY subscribers, pushed\n3 · events → targets BY CONTENT\n4 · ordered stream, REPLAYABLE, many readers',
      journal: 'The four shapes: pull-queue for one pool · push-broadcast to many · content router · ordered replayable stream.',
    },
    {
      id: 'board', machine: 'board', prompt: 'Inspect the “use Kafka?” memo',
      kicker: 'architecture memo', title: 'One hammer, four screws',
      pre: 'proposal ......... the same tool for all four\nreality .......... queue ≠ topic ≠ bus ≠ stream\nfix .............. match the SHAPE',
      journal: 'The memo answers every shape with one tool — but a queue, a topic, a bus, and a stream are four different contracts.',
    },
  ],
  pallet: {
    at: [-2, -5.2],
    modules: [
      { id: 'mod-sqs', kind: 'svc-sqs', label: 'Amazon SQS (pull queue + DLQ)', spot: [-3.2, -4.8], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-sns', kind: 'svc-sns', label: 'Amazon SNS (push fan-out)', spot: [-2.0, -4.8], visual: { hex: '#8a3030', glowHex: '#ff8080' } },
      { id: 'mod-eb', kind: 'svc-eb', label: 'Amazon EventBridge (content rules)', spot: [-0.8, -4.8], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-kin', kind: 'svc-kin', label: 'Amazon Kinesis (ordered stream)', spot: [-2.6, -5.8], visual: { hex: '#3b2f4d', glowHex: '#b48ce0' } },
    ],
  },
  sockets: [
    {
      id: 'st-queue', label: 'station 1 · worker pool', at: [-3, 0.5],
      blurb: 'Tasks for ONE pool of workers pulling at their own pace — with retries, visibility timeouts, and a dead-letter queue for the poison.',
      allow: { 'svc-sqs': true, 'svc-sns': true, 'svc-eb': true, 'svc-kin': true },
      fallback: { reason: 'The station takes one of the four services.' },
    },
    {
      id: 'st-fan', label: 'station 2 · broadcast', at: [-1, 0.5],
      blurb: 'One event, pushed immediately to MANY independent subscribers — each acting on its own copy.',
      allow: { 'svc-sqs': true, 'svc-sns': true, 'svc-eb': true, 'svc-kin': true },
      fallback: { reason: 'The station takes one of the four services.' },
    },
    {
      id: 'st-route', label: 'station 3 · content router', at: [1, 0.5],
      blurb: 'Events from many sources, routed to DIFFERENT targets by rules over their content and attributes.',
      allow: { 'svc-sqs': true, 'svc-sns': true, 'svc-eb': true, 'svc-kin': true },
      fallback: { reason: 'The station takes one of the four services.' },
    },
    {
      id: 'st-stream', label: 'station 4 · replay stream', at: [3, 0.5],
      blurb: 'An ordered, high-volume stream that several readers consume independently — and can REWIND and re-read.',
      allow: { 'svc-sqs': true, 'svc-sns': true, 'svc-eb': true, 'svc-kin': true },
      fallback: { reason: 'The station takes one of the four services.' },
    },
  ],
  levers: [
    { id: 'lever-replay', machine: 'lever', prompt: 'PULL — analytics replays yesterday (drill)', beat: 'replay' },
  ],
  beats: [
    {
      id: 'audit', label: 'delivery audit', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'st-queue': 'svc-sqs', 'st-fan': 'svc-sns', 'st-route': 'svc-eb', 'st-stream': 'svc-kin' } }, pass: true,
          title: '✔ Four shapes, four right answers',
          lines: 'worker pool ...... SQS — pulled, retried, DLQ’d\nbroadcast ........ SNS — pushed to every subscriber\ncontent router ... EventBridge — rules pick targets\nreplay stream .... Kinesis — ordered, rewindable',
          note: 'Queue, topic, bus, stream: four contracts. Match the shape and every team gets exactly the semantics they asked for.',
        },
        {
          when: { socket: { 'st-queue': 'svc-sns' } }, pass: false,
          title: '✘ Station 1: a topic can’t feed a worker pool',
          lines: 'need ............. pull at own pace · retries · DLQ\nSNS .............. pushes immediately, holds nothing',
          note: 'The worker pool needs a QUEUE that holds tasks until a worker pulls — that’s SQS. SNS pushes and forgets.',
        },
        {
          when: { socket: { 'st-fan': 'svc-sqs' } }, pass: false,
          title: '✘ Station 2: a queue delivers to ONE, not many',
          lines: 'need ............. every subscriber gets a copy\nSQS .............. each message consumed once',
          note: 'Broadcast means everyone receives it — the topic’s contract (SNS). A queue would make your subscribers fight over messages.',
        },
        {
          when: { socket: { 'st-route': 'svc-sns' } }, pass: false,
          title: '✘ Station 3: broadcast is not routing',
          lines: 'need ............. different targets by CONTENT\nSNS .............. everyone gets everything',
          note: 'Routing chooses targets per event — EventBridge rules over content and attributes. SNS would spam every target with every event.',
        },
        {
          when: { socket: { 'st-stream': 'svc-sqs' } }, pass: false,
          title: '✘ Station 4: consumed means GONE',
          lines: 'need ............. ordered · replayable · many readers\nSQS .............. read once, deleted, unordered-ish',
          note: 'A queue deletes what’s consumed and doesn’t promise order — replaying yesterday is impossible. The stream (Kinesis) keeps ordered records for every reader to re-read.',
        },
        {
          pass: false,
          title: '✘ The stations disagree with their manifests',
          lines: 'check ............ each station vs its shape',
          note: 'Pull-queue · broadcast · router · stream — SQS · SNS · EventBridge · Kinesis.',
        },
      ],
    },
    {
      id: 'replay', label: 'replay drill', trigger: 'lever',
      rules: [
        {
          when: { socket: { 'st-stream': 'svc-kin' } }, pass: true,
          title: '✔ Rewound 24 h; three readers, zero interference',
          lines: 'new consumer ..... analytics v2\nstart position ... yesterday 00:00\nexisting readers . unaffected — independent iterators\norder ............ preserved per shard',
          note: 'The stream is a durable, ordered log: readers keep their own positions, and “re-process yesterday” is just a new iterator — not an apology email.',
        },
        {
          pass: false,
          title: '✘ Yesterday no longer exists',
          lines: 'requested ........ replay of 24 h ago\nstation 4 ........ consumed-and-deleted semantics',
          note: 'Replay needs a STREAM that retains ordered records — Kinesis at station 4.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ The right shape at every station',
    body: 'SQS queues the work, SNS broadcasts the event, EventBridge routes by content, Kinesis keeps the ordered, replayable record. Four contracts, correctly matched — and no, not everything is Kafka. Close the ticket at the field terminal.',
    journal: 'Delivery audit + replay drill passed — SQS/SNS/EventBridge/Kinesis matched.',
  },
  diagnosis: {
    unlockedBy: 'depot',
    title: 'Four messaging needs — what actually distinguishes them?',
    correct: {
      label: 'The SHAPE: pull-queue (SQS) · push-broadcast (SNS) · content router (EventBridge) · ordered replayable stream (Kinesis)',
      journal: 'Diagnosis confirmed: match messaging services by delivery shape, not fashion.',
      confirmBody: 'Who consumes, how it’s delivered, whether it’s held, and whether it can be re-read — those four questions pick the service. Match each station.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Standardise on one messaging system for all four', rebuttal: 'The four contracts genuinely differ — one tool means three teams re-implementing semantics on top of the wrong primitive.' },
      { label: 'They’re all “async” — any of them works anywhere', rebuttal: 'A queue deletes on read; a topic holds nothing; a bus routes; a stream replays. Swap any two and something breaks.' },
      { label: 'Pick whichever is cheapest per message', rebuttal: 'Price per message is noise next to the cost of wrong semantics — lost broadcasts, unreplayable history, starved workers.' },
    ],
  },
  faultLamps: ['board'],
};

export const BACKUP_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-8850', reporter: 'audit', sev: 'SEV-2', title: 'Backup Bingo',
    bodyHtml:
      `<div>The audit found four services backed up four different ways: EBS by a cron script, RDS by “the automatic thing, probably”, DynamoDB by an intern’s Lambda, EFS by nothing at all. No shared policy, no compliance view — and nothing stopping ransomware (or an angry admin) from deleting every backup we have.</div>` +
      `<pre>EBS .............. cron script (author left)\nRDS .............. defaults, unverified\nDynamoDB ......... intern Lambda\nEFS .............. nothing\ndeletion-proof ... not even slightly</pre>`,
    hint: 'Probe the estate and the vault, diagnose, then socket the backup policy and set the vault dial. The audit sweep AND the ransomware drill (lever) must pass.',
  },
  objectiveFix: 'Socket the central backup policy · dial the vault to LOCK',
  objectiveDone: 'INC-8850 closed — one policy, immutable points, cross-Region copies.',
  summary: 'Symptom: ad-hoc per-service backups — inconsistent, unverifiable, and deletable by anyone with credentials. Fix: AWS Backup — one policy-based backup PLAN with tag-based resource selection covering EBS, RDS, DynamoDB, and EFS together, central compliance reporting, retention rules, and cross-Region (ideally cross-account) copies so a Region outage or a compromised account can’t take the backups with it. Vault Lock in COMPLIANCE mode makes recovery points immutable — ransomware and admins alike can’t delete them.',
  level: [
    { id: 'estate', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2 },
    { id: 'vault', kind: 'shelfUnit', at: [4.5, 1.5], yaw: -Math.PI / 2, args: ['#8f7ae6', true] },
    { id: 'dial', kind: 'aimPointer', at: [-2, -2] },
    { id: 'lever', kind: 'chaosLever', at: [4, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'estate', machine: 'estate', prompt: 'Inspect the backup estate',
      kicker: 'four services', title: 'Four services, four folklores',
      pre: 'EBS .............. cron (author departed)\nRDS .............. “defaults?”\nDynamoDB ......... intern Lambda, undocumented\nEFS .............. —\npolicy ........... none shared · no reporting',
      journal: 'Estate: every service backed up by a different folklore, none verifiable, one not at all. Needs ONE policy across all of them.',
    },
    {
      id: 'vault', machine: 'vault', prompt: 'Inspect the backup vault',
      kicker: 'vault', title: 'Deletable by design',
      pre: 'recovery points .. deletable by any admin\nransomware ....... would purge these FIRST\ncross-Region ..... no copies\ncross-account .... no copies',
      journal: 'Vault: everything in it can be deleted by whoever gets credentials — and it all lives in one Region, one account.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-awsb', kind: 'awsbackup', label: 'AWS Backup plan (tag-based)', spot: [-2.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-cron', kind: 'cronsnap', label: 'More cron snapshots (v2)', spot: [-1.7, -4.6], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
      { id: 'mod-raid', kind: 'raid', label: '“RAID is a backup” card', spot: [-2.3, -5.5], visual: { hex: '#5a2330', glowHex: '#e85f5f', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-plan', label: 'backup policy bay', at: [0.5, -1.2],
      blurb: 'One scheduled, policy-based plan for the whole estate: tag-based selection sweeps in EBS, RDS, DynamoDB, and EFS alike, with retention rules, cross-Region copies, and a compliance dashboard.',
      allow: { awsbackup: true, cronsnap: true },
      refuse: {
        raid: { reason: 'RAID survives a DISK. It replicates your ransomware, your deletes, and your mistakes in real time. It is not, and has never been, a backup.' },
      },
      fallback: { reason: 'The policy bay takes a backup service.' },
    },
  ],
  dials: [
    {
      id: 'vaultmode', machine: 'dial', initial: 'standard',
      grabPrompt: '◀ ▶ swing the vault mode · E/Ⓧ lock',
      positions: [
        { id: 'standard', label: 'vault: STANDARD (deletable)', angle: 2.0 },
        { id: 'locked', label: 'vault: LOCK — compliance mode', angle: 1.0 },
      ],
    },
  ],
  levers: [
    { id: 'lever-ransom', machine: 'lever', prompt: 'PULL — simulate the ransomware (drill)', beat: 'ransom' },
  ],
  beats: [
    {
      id: 'sweep', label: 'audit sweep', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-plan': 'awsbackup' } }, pass: true,
          title: '✔ One plan, four services, one dashboard',
          lines: 'selection ........ by tag: backup=true\ncovers ........... EBS · RDS · DynamoDB · EFS\nschedule ......... one policy, verified runs\ncopies ........... cross-Region (and cross-account)\nreporting ........ compliance view, per resource',
          note: 'Policy-based and tag-selected: new resources with the tag are swept in automatically, and the auditor reads ONE dashboard instead of four folklores.',
        },
        {
          when: { socket: { 'so-plan': 'cronsnap' } }, pass: false,
          title: '✘ Cron v2: now failing consistently across all four',
          lines: 'coverage ......... whatever the script knows about\nnew resources .... silently unprotected\nreporting ........ grep the cron log\nEFS .............. still nothing',
          note: 'Scripted snapshots are the ad-hoc problem with more YAML. The audit wants a POLICY: central, tag-based, reported — that’s AWS Backup.',
        },
        {
          pass: false,
          title: '✘ Four folklores, unchanged',
          lines: 'policy bay ....... empty',
          note: 'Socket the plan.',
        },
      ],
    },
    {
      id: 'ransom', label: 'ransomware drill', trigger: 'lever',
      rules: [
        {
          when: { socket: { 'so-plan': 'awsbackup' }, dial: { vaultmode: 'locked' } }, pass: true,
          title: '✔ Purge attempt bounced off the vault',
          lines: 'attacker ......... admin creds, delete-all issued\nvault lock ....... COMPLIANCE mode — immutable\nrecovery points .. all intact, full retention\ncross-Region ..... second copy anyway',
          note: 'Vault Lock in compliance mode means NOBODY deletes recovery points early — not ransomware, not an admin, not you. The cross-Region copy stands even if the whole account falls.',
        },
        {
          when: { socket: { 'so-plan': 'awsbackup' }, dial: { vaultmode: 'standard' } }, pass: false,
          title: '✘ The backups were the first casualty',
          lines: 'attacker ......... admin creds\nvault ............ standard — deletable\nrecovery points .. PURGED before the encryption began',
          note: 'Competent ransomware deletes the backups first. Swing the vault to LOCK — immutability is the point.',
          alarm: 'DATA LOSS — RECOVERY POINTS PURGED',
        },
        {
          pass: false,
          title: '✘ Nothing worth purging',
          lines: 'backups .......... folklore',
          note: 'A plan first, then the lock.',
          alarm: 'DATA LOSS — RECOVERY POINTS PURGED',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ One policy, locked vault, second Region',
    body: 'AWS Backup sweeps the tagged estate on one schedule, reports compliance centrally, copies recovery points cross-Region — and Vault Lock makes them immutable against ransomware and admins alike. Close the ticket at the field terminal.',
    journal: 'Audit sweep + ransomware drill passed — AWS Backup plan, vault locked.',
  },
  diagnosis: {
    unlockedBy: 'estate',
    title: 'What unifies four backup folklores AND survives ransomware?',
    correct: {
      label: 'AWS Backup: one tag-based plan across EBS/RDS/DynamoDB/EFS, cross-Region copies, and Vault Lock (compliance) for immutability',
      journal: 'Diagnosis confirmed: central policy-based backups + immutable, replicated recovery points.',
      confirmBody: 'One plan, selected by tags, reported centrally — and a vault that refuses deletion no matter whose credentials ask. Mind the vault dial.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Fix and document each of the four scripts', rebuttal: 'Four better folklores is still four folklores — no shared policy, no compliance view, and EFS is still waiting.' },
      { label: 'Restrict who can delete backups via IAM', rebuttal: 'Ransomware arrives WITH credentials. Immutability (Vault Lock) doesn’t care whose keys are asking.' },
      { label: 'RAID and Multi-AZ already replicate everything', rebuttal: 'Replication faithfully copies your deletions and your ransomware in real time. Backups are POINTS IN TIME.' },
    ],
  },
  faultLamps: ['estate'],
};

export const MIGRATE_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-9414', reporter: 'data-platform', sev: 'SEV-3', title: '500 Terabytes, Two Weeks',
    bodyHtml:
      `<div>The archive migration is signed: 500 TB must be in Amazon S3 within two weeks — over a site link that’s 100 Mbps on a good day and saturated by the business on every day. Meanwhile the NFS share keeps changing daily until cutover, and those deltas must keep syncing to EFS for another month.</div>` +
      `<pre>bulk ............. 500 TB → S3 · 14-day deadline\nlink ............. 100 Mbps, already busy\nmath ............. 500 TB @ 100 Mbps ≈ 463 days\nongoing .......... NFS deltas → EFS, nightly, 1 month</pre>`,
    hint: 'Probe the archive and the link, diagnose, then fill BOTH bays — the bulk move and the ongoing sync are different problems. Both tests must pass.',
  },
  objectiveFix: 'Socket the bulk-move bay AND the ongoing-sync bay',
  objectiveDone: 'INC-9414 closed — trucks for the bulk, DataSync for the deltas.',
  summary: 'Symptom: 500 TB against a 463-day wire and a two-week deadline, plus a month of nightly NFS deltas. Fix: match transfer to volume and frequency — AWS Snowball devices move the 500 TB OFFLINE (ship, load, AWS ingests: days, not years), while AWS DataSync handles the ONLINE incremental NFS→EFS sync nightly with verification and bandwidth throttling. Big and one-off goes by truck; ongoing and incremental goes by wire.',
  level: [
    { id: 'archive', kind: 'shelfUnit', at: [-4.5, 1.5], yaw: Math.PI / 2, args: ['#e8a657'] },
    { id: 'link', kind: 'internetGate', at: [1, 1.5], yaw: Math.PI / 2 },
    { id: 'cloud', kind: 'shelfUnit', at: [6, 1.5], yaw: -Math.PI / 2, args: ['#57c7e3'] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'archive', machine: 'archive', prompt: 'Inspect the archive',
      kicker: 'on-prem archive', title: 'Half a petabyte with a deadline',
      pre: 'size ............. 500 TB\ndeadline ......... 14 days\nchange rate ...... bulk static · NFS share churns daily',
      journal: 'Archive: 500 TB of mostly-static bulk plus a daily-churning NFS share — two different transfer problems.',
    },
    {
      id: 'link', machine: 'link', prompt: 'Inspect the site link',
      kicker: 'site link', title: 'The 463-day wire',
      pre: 'bandwidth ........ 100 Mbps, shared\n500 TB ........... ≈ 463 days at full theft\ndeadline ......... 14 days\nverdict .......... the wire loses',
      journal: 'Link: 100 Mbps against 500 TB is a 463-day proposition — the bulk cannot go by wire.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-snow', kind: 'snowball', label: 'AWS Snowball devices (offline)', spot: [-2.9, -4.6], visual: { hex: '#3b2f4d', glowHex: '#b48ce0', w: 0.62, h: 0.55 } },
      { id: 'mod-dsync', kind: 'datasync', label: 'AWS DataSync agent (online)', spot: [-1.7, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-ftp', kind: 'ftp', label: 'FTP to a public bucket', spot: [-2.3, -5.5], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-bulk', label: 'bulk-move bay', at: [0.5, -1.2],
      blurb: 'The 500 TB, one-off: at this volume the question is trucks versus years. Ship storage, load locally at LAN speed, AWS ingests on arrival.',
      allow: { snowball: true, datasync: true },
      refuse: {
        ftp: { reason: 'BLOCKED: half a petabyte of archive through FTP to a PUBLIC bucket — speed aside, that’s a breach itinerary.', alarm: 'SECURITY — PUBLIC TRANSFER OF PRIVATE DATA' },
      },
      fallback: { reason: 'The bulk bay takes a transfer method.' },
    },
    {
      id: 'so-sync', label: 'ongoing-sync bay', at: [2.5, -1.2],
      blurb: 'The nightly deltas, for a month: incremental, verified, bandwidth-throttled network sync from NFS to EFS.',
      allow: { datasync: true, snowball: true },
      refuse: {
        ftp: { reason: 'BLOCKED: nightly plaintext FTP of business data to a public bucket.', alarm: 'SECURITY — PUBLIC TRANSFER OF PRIVATE DATA' },
      },
      fallback: { reason: 'The sync bay takes a transfer method.' },
    },
  ],
  beats: [
    {
      id: 'bulk', label: 'bulk-move test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-bulk': 'snowball' } }, pass: true,
          title: '✔ 500 TB delivered in 9 days — by truck',
          lines: 'devices .......... loaded at LAN speed on site\ntransit .......... shipped, tracked, encrypted\ningest ........... AWS side, on arrival\ntotal ............ 9 days vs 463 on the wire',
          note: 'Above a certain volume, physics votes for freight: Snowball moves the bulk offline while your 100 Mbps link keeps doing its day job.',
        },
        {
          when: { socket: { 'so-bulk': 'datasync' } }, pass: false,
          title: '✘ Optimised, verified — and 400 days late',
          lines: 'DataSync ......... fast AND correct on the wire\nthe wire ......... is still 100 Mbps\n500 TB ........... months, not weeks',
          note: 'DataSync is the right ONLINE tool — but no software makes a 100 Mbps link carry 500 TB in two weeks. The one-off bulk goes offline; save DataSync for the deltas.',
        },
        {
          pass: false,
          title: '✘ The archive isn’t moving',
          lines: 'bulk bay ......... empty',
          note: 'Socket a bulk method.',
        },
      ],
    },
    {
      id: 'sync', label: 'cutover-sync test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-sync': 'datasync' } }, pass: true,
          title: '✔ Nightly deltas: verified, throttled, boring',
          lines: 'source → dest .... NFS → EFS\nmode ............. incremental (changed files only)\nintegrity ........ verified per transfer\nbandwidth ........ throttled to spare the day job',
          note: 'Ongoing and incremental is exactly DataSync’s shape: schedule it nightly, cap its bandwidth, and let it verify every byte until cutover.',
        },
        {
          when: { socket: { 'so-sync': 'snowball' } }, pass: false,
          title: '✘ A truck per night is not a sync strategy',
          lines: 'deltas ........... ~40 GB/night\nsnowball cycle ... ship-load-return: ~a week each\nfit .............. none',
          note: 'Snowball is for BULK, one-off moves. Nightly incremental deltas ride the wire comfortably — that’s DataSync.',
        },
        {
          pass: false,
          title: '✘ The NFS share drifts unsynced',
          lines: 'sync bay ......... empty',
          note: 'Socket the sync method.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Freight for the bulk, wire for the deltas',
    body: 'Snowball trucks the 500 TB in nine days; DataSync ships the nightly NFS deltas to EFS, verified and throttled, until cutover. Volume and frequency pick the tool. Close the ticket at the field terminal.',
    journal: 'Bulk + sync tests passed — Snowball for 500 TB, DataSync for the deltas.',
  },
  diagnosis: {
    unlockedBy: 'link',
    title: '500 TB in 14 days on a 100 Mbps link — how?',
    correct: {
      label: 'Ship it: Snowball devices for the offline bulk, with DataSync handling the ongoing NFS→EFS deltas over the wire',
      journal: 'Diagnosis confirmed: offline bulk (Snowball) + online incremental sync (DataSync).',
      confirmBody: 'The wire loses to the truck at this volume — and the truck loses to the wire for nightly deltas. Two problems, two bays.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Compress everything and send it over the link', rebuttal: 'Even at a heroic 3:1, that’s 150+ days on a link the business is already using. The deadline is 14.' },
      { label: 'Upgrade the site link for the migration', rebuttal: 'A 10× circuit takes months to provision and still carries 500 TB slower than a truck — for a one-off move.' },
      { label: 'S3 Transfer Acceleration on the uploads', rebuttal: 'Acceleration optimises the path BEYOND your link. The bottleneck is the 100 Mbps first hop; no edge endpoint fixes that.' },
    ],
  },
  faultLamps: ['link'],
};
