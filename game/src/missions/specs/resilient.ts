import type { MissionSpec } from '../spec';

/** Resilient-domain batch 1 — five specs. */

export const CLOUDWATCH_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-7014', reporter: 'sre', sev: 'SEV-2', title: 'Flying Blind',
    bodyHtml:
      `<div>Last night the checkout fleet ran at 96% CPU for four hours and nobody knew — customers found out first. There are no dashboards, no alarms, and when someone finally asked “what did the app log at 02:00?”, the answer was a shrug.</div>` +
      `<pre>incident ......... CPU 96% · 4 h · unnoticed\ndashboards ....... none\nalarms ........... none\n02:00 logs ....... “probably on the box somewhere”</pre>`,
    hint: 'Probe the fleet, diagnose, then socket the monitor and set the alarm-action dial. The CPU-spike drill (lever) AND the root-cause query must pass.',
  },
  objectiveFix: 'Socket the monitor · dial the alarm action to SCALE + NOTIFY',
  objectiveDone: 'INC-7014 closed — watched, alarmed, automated.',
  summary: 'Symptom: a four-hour CPU fire nobody saw — no metrics, no alarms, no queryable logs. Fix: CloudWatch — metrics on dashboards, an alarm on CPUUtilization ≥70% for 5 minutes whose ACTION both triggers the Auto Scaling policy and notifies on-call via SNS, and CloudWatch Logs with Logs Insights to query exactly what the app said at 02:00. Business metrics (orders/min) publish as custom metrics via PutMetricData and alarm the same way.',
  level: [
    { id: 'fleet', kind: 'serverRack', at: [3.5, 1.5], yaw: Math.PI / 2 },
    { id: 'oncall', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2 },
    { id: 'dial', kind: 'aimPointer', at: [-2, -2] },
    { id: 'lever', kind: 'chaosLever', at: [3.5, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'fleet', machine: 'fleet', prompt: 'Inspect checkout fleet',
      kicker: 'checkout fleet', title: 'Four hours at 96%',
      pre: 'CPU last night ... 96% for 4 h\nmetrics .......... emitted, watched by NOBODY\nlogs ............. on-instance, unqueryable\nscaling .......... manual, after complaints',
      journal: 'Fleet: metrics exist but nothing watches them; logs die with the instance; scaling waits for a human.',
    },
    {
      id: 'oncall', machine: 'oncall', prompt: 'Inspect on-call desk',
      kicker: 'on-call', title: 'Paged by customers',
      pre: 'alerting ......... customers tweeting\ndesired .......... CPU ≥ 70% for 5 min →\n                   scale out AND page',
      journal: 'On-call: wants one alarm — threshold breach drives the scaling policy AND the page. Detection with an automated response.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-cw', kind: 'cw', label: 'CloudWatch (metrics·alarms·logs)', spot: [-2.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-rota', kind: 'rota', label: 'Grafana screenshot rota', spot: [-1.7, -4.6], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
      { id: 'mod-ssh', kind: 'sshgrep', label: 'ssh + grep runbook', spot: [-2.3, -5.5], visual: { hex: '#6e5a3e', glowHex: '#c9a35c', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-mon', label: 'monitoring bay', at: [0.5, -1.2],
      blurb: 'The site’s eyes: metrics on dashboards, alarms on thresholds, logs collected centrally and queryable. Alarms can ACT — scaling policies, notifications — not just blink.',
      allow: { cw: true },
      refuse: {
        rota: { reason: 'A human glancing at graphs every hour missed a four-hour fire. Alarms must WATCH continuously and ACT.' },
        sshgrep: { reason: 'Logs that live on the instance die with the instance — and grep across a fleet is archaeology, not observability.' },
      },
      fallback: { reason: 'The monitoring bay takes a metrics/alarms/logs service.' },
    },
  ],
  dials: [
    {
      id: 'action', machine: 'dial', initial: 'notify',
      grabPrompt: '◀ ▶ swing the alarm action · E/Ⓧ lock',
      positions: [
        { id: 'notify', label: 'alarm → NOTIFY only', angle: 2.0 },
        { id: 'scale', label: 'alarm → SCALE + NOTIFY', angle: 1.0 },
      ],
    },
  ],
  levers: [
    { id: 'lever-spike', machine: 'lever', prompt: 'PULL — spike the CPU (drill)', beat: 'spike' },
  ],
  beats: [
    {
      id: 'spike', label: 'CPU-spike drill', trigger: 'lever',
      rules: [
        {
          when: { socket: { 'so-mon': 'cw' }, dial: { action: 'scale' } }, pass: true,
          title: '✔ Alarm fired, fleet grew, on-call sipped coffee',
          lines: 'CPUUtilization ... ≥70% for 5 min → ALARM\naction 1 ......... Auto Scaling policy (+2)\naction 2 ......... SNS → on-call page\ncustomer impact .. none',
          note: 'The alarm did both jobs: capacity responded automatically and a human was told. Detection wired to response — that’s the whole point. (Business metrics like orders/min: PutMetricData, then alarm identically.)',
        },
        {
          when: { socket: { 'so-mon': 'cw' }, dial: { action: 'notify' } }, pass: false,
          title: '✘ Paged at 3 a.m. to click a button',
          lines: 'alarm ............ fired ✓\npage ............. delivered ✓\nscaling .......... waiting for a sleepy human\nminutes lost ..... 23',
          note: 'The alarm can trigger the scaling policy ITSELF — swing the action dial. Humans confirm; machines respond.',
        },
        {
          pass: false,
          title: '✘ 96% again, silence again',
          lines: 'monitoring bay ... empty\ndetection ........ customers, eventually',
          note: 'Nothing is watching the metrics. Socket the monitor.',
          alarm: 'OUTAGE — UNWATCHED SATURATION',
        },
      ],
    },
    {
      id: 'query', label: 'root-cause query (02:00)', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-mon': 'cw' } }, pass: true,
          title: '✔ Logs Insights: the 02:00 stack trace, in seconds',
          lines: 'source ........... CloudWatch Logs (centralised)\nquery ............ filter @timestamp ~02:00\nresult ........... connection-pool exhaustion\ninstances ........ long gone; logs remain',
          note: 'Logs shipped off the boxes and queryable across the fleet — the instances that logged them are already recycled, and the evidence survived.',
        },
        {
          pass: false,
          title: '✘ The logs left with the instance',
          lines: '02:00 logs ....... on terminated instances\nanswer ........... unknowable',
          note: 'Centralise the logs — CloudWatch Logs with Logs Insights for the querying.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Watched, alarmed, automated',
    body: 'Dashboards show it, alarms catch it, actions fix it, and Logs Insights explains it afterwards. The fleet is observable and the response is wired in. Close the ticket at the field terminal.',
    journal: 'Spike drill + root-cause query passed — CloudWatch alarms driving actions.',
  },
  diagnosis: {
    unlockedBy: 'fleet',
    title: 'Why did a four-hour fire go unnoticed?',
    correct: {
      label: 'Nothing watches the metrics or holds the logs — CloudWatch alarms (wired to scaling + notification) and centralised Logs',
      journal: 'Diagnosis confirmed: unwatched metrics, instance-bound logs. CloudWatch with alarm ACTIONS.',
      confirmBody: 'The signals were all there — emitted into the void. An alarm with actions turns the same signal into capacity and a page; central logs make 02:00 answerable forever.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'The fleet was simply too small', rebuttal: 'Capacity wasn’t the failure — the four silent hours were. Unwatched systems fail at any size.' },
      { label: 'On-call should check dashboards hourly', rebuttal: 'There were no dashboards — and rota-glancing missed fires before. Machines watch; humans respond.' },
      { label: 'SSH in and tail the logs during incidents', rebuttal: 'The instances that logged 02:00 are terminated. Logs must outlive the boxes that wrote them.' },
    ],
  },
  faultLamps: ['fleet'],
};

export const SNS_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-8123', reporter: 'orders-team', sev: 'SEV-2', title: 'One Event, Three Teams',
    bodyHtml:
      `<div>Every order event must reach billing, analytics, AND notifications — independently. Today the order service calls each one in turn: when notifications hiccups, billing waits behind it; when analytics deploys, events vanish. Three consumers, one fragile chain.</div>` +
      `<pre>consumers ........ billing · analytics · notifications\ntoday ............ synchronous calls, in sequence\nfailure mode ..... one consumer stalls them all\nrequired ......... independent · buffered · retried</pre>`,
    hint: 'Probe the order service and a consumer, diagnose, then socket the broadcast hub AND the buffer stage. Fan-out test and the consumer-crash drill (lever) must pass.',
  },
  objectiveFix: 'Socket the broadcast hub · socket the per-consumer buffers',
  objectiveDone: 'INC-8123 closed — published once, delivered thrice, buffered each.',
  summary: 'Symptom: one order event needed by three independent consumers, delivered by a fragile synchronous chain. Fix: publish once to an SNS topic (push pub/sub) fanning out to ONE SQS QUEUE PER CONSUMER — each team gets durable buffering, its own retry pace, and a per-consumer DLQ for poison events. SNS pushes to all subscribers; SQS holds for one consumer — the fan-out pattern uses both, each for its shape. Direct SNS→Lambda loses events when the consumer fails; the queue in between is the safety net.',
  level: [
    { id: 'orders', kind: 'serverRack', at: [-5, 1.5], yaw: Math.PI / 2 },
    { id: 'billing', kind: 'serverRack', at: [5, 1.5], yaw: -Math.PI / 2 },
    { id: 'lever', kind: 'chaosLever', at: [4, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'orders', machine: 'orders', prompt: 'Inspect the order service',
      kicker: 'producer', title: 'Calling three numbers in a row',
      pre: 'delivery ......... sync call → billing\n                   then analytics, then notifications\ncoupling ......... total — slowest consumer wins\nnew consumer? .... another code change here',
      journal: 'Order service: hand-delivers to each consumer in sequence — coupled to every one of them, and to their bad days.',
    },
    {
      id: 'billing', machine: 'billing', prompt: 'Inspect billing (a consumer)',
      kicker: 'billing', title: 'Hostage to its neighbours',
      pre: 'last outage ...... notifications hiccup → billing starved\ndeploy windows ... events LOST during restarts\nretry policy ..... whatever the producer felt like',
      journal: 'Billing: starves when a sibling stalls, loses events during its own deploys — needs its own buffer and retry pace.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-sns', kind: 'sns', label: 'SNS topic (push fan-out)', spot: [-2.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-sqs1', kind: 'sqsbuf', label: 'SQS queues ×3 (+DLQs)', spot: [-1.7, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-direct', kind: 'direct', label: 'Direct subscriptions (no buffer)', spot: [-2.3, -5.5], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-hub', label: 'broadcast hub', at: [0, 0],
      blurb: 'Publish once here, and every subscriber receives its own copy, pushed. The producer stops knowing who listens.',
      allow: { sns: true, sqsbuf: true },
      refuse: {
        direct: { reason: 'That’s the SUBSCRIPTION style, not the hub. Something has to do the broadcasting first.' },
      },
      fallback: { reason: 'The hub takes a pub/sub topic.' },
    },
    {
      id: 'so-buf', label: 'buffer stage', at: [2.2, 0],
      blurb: 'Between the topic and each consumer: a queue per team. Slow consumer? The queue holds. Crashed consumer? The queue waits. Poison event? The DLQ catches it.',
      allow: { sqsbuf: true, direct: true },
      refuse: {
        sns: { reason: 'That’s a topic — it pushes, it doesn’t hold. The buffer stage wants queues.' },
      },
      fallback: { reason: 'The buffer stage takes queues (or raw subscriptions, if you insist).' },
    },
  ],
  levers: [
    { id: 'lever-crash', machine: 'lever', prompt: 'PULL — crash billing for 10 min (drill)', beat: 'crash' },
  ],
  sim: [
    { id: 'src', machine: 'orders', route: [{ to: 'hubN' }] },
    { id: 'hubN', at: [0, 0], route: [{ to: 'cons' }] },
    { id: 'cons', machine: 'billing', route: [{ to: 'deliver' }] },
  ],
  beats: [
    {
      id: 'fanout', label: 'fan-out test', trigger: 'terminal',
      spawn: { node: 'src', kind: 'event', n: 6, spacing: 0.25 },
      rules: [
        {
          when: { socket: { 'so-hub': 'sns' } }, pass: true,
          title: '✔ Published once, delivered three times',
          lines: 'publish .......... 1 event → the topic\ndelivery ......... billing ✓ analytics ✓ notifications ✓\nproducer knows ... nobody — just the topic\nnew consumer ..... subscribe; zero producer changes',
          note: 'Pub/sub inverts the coupling: the producer publishes and stops caring. Every subscriber gets its own copy, and adding a fourth team is a subscription, not a code change.',
        },
        {
          when: { socket: { 'so-hub': 'sqsbuf' } }, pass: false,
          title: '✘ Billing ate it — analytics starved',
          lines: 'queue delivery ... ONE consumer per message\nbilling .......... got the event\nanalytics ........ nothing\nnotifications .... nothing',
          note: 'A queue holds each message for ONE reader — that’s its whole contract. Broadcasting to independent consumers is the TOPIC’s job; the queues belong downstream, one per team.',
        },
        {
          pass: false,
          title: '✘ Still hand-delivering in sequence',
          lines: 'hub .............. empty\ncoupling ......... unchanged',
          note: 'Socket the broadcast hub.',
        },
      ],
    },
    {
      id: 'crash', label: 'consumer-crash drill', trigger: 'lever',
      rules: [
        {
          when: { socket: { 'so-hub': 'sns', 'so-buf': 'sqsbuf' } }, pass: true,
          title: '✔ Billing napped; its queue didn’t',
          lines: 'billing .......... down 10 min (drill)\nits queue ........ held 412 events, durable\nrecovery ......... drained at its own pace\npoison event ..... 1 → its DLQ, inspectable',
          note: 'SNS-to-SQS fan-out: every consumer gets a durable buffer and a private retry pace, and failures land in a per-consumer DLQ instead of the void.',
        },
        {
          when: { socket: { 'so-hub': 'sns', 'so-buf': 'direct' } }, pass: false,
          title: '✘ Pushed into a crashed consumer — events gone',
          lines: 'billing .......... down 10 min (drill)\ndelivery ......... pushed, failed, retried, EXPIRED\nevents lost ...... 412',
          note: 'A push with nowhere to land eventually gives up. Put a queue between the topic and each consumer — durability is the buffer’s job.',
          alarm: 'DATA LOSS — EVENTS EXPIRED UNDELIVERED',
        },
        {
          pass: false,
          title: '✘ Nothing buffered anything',
          lines: 'buffer stage ..... empty',
          note: 'One queue per consumer — socket the buffers.',
          alarm: 'DATA LOSS — EVENTS EXPIRED UNDELIVERED',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Once published, thrice delivered, each buffered',
    body: 'The topic broadcasts; each consumer’s queue buffers, retries, and dead-letters independently. The producer knows nobody and the teams can’t hurt each other anymore. Close the ticket at the field terminal.',
    journal: 'Fan-out + crash drills passed — SNS topic fanning into per-consumer SQS queues.',
  },
  diagnosis: {
    unlockedBy: 'orders',
    title: 'How does one event reach three independent teams safely?',
    correct: {
      label: 'Publish to an SNS topic that fans out to one SQS queue per consumer (each with a DLQ)',
      journal: 'Diagnosis confirmed: SNS pub/sub fan-out into per-consumer SQS buffers.',
      confirmBody: 'Push where it should push (the topic, to everyone) and hold where it should hold (a queue, per team). The producer publishes once and retires from the delivery business.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Make the three calls asynchronous threads', rebuttal: 'Async spaghetti is still the producer hand-delivering — retries, ordering, and failures all remain its problem.' },
      { label: 'One shared SQS queue all teams read', rebuttal: 'A queue delivers each message to ONE consumer — the teams would steal events from each other.' },
      { label: 'Each team polls the orders database', rebuttal: 'Three crawlers hammering prod tables is coupling with extra steps — and deletes/updates get missed.' },
    ],
  },
  faultLamps: ['orders'],
};

export const DR_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-9001', reporter: 'cto', sev: 'SEV-1', title: 'Lose a Region, Keep the Bank',
    bodyHtml:
      `<div>The board signed the resilience mandate after last month’s regional wobble: if our primary Region dies, we recover in MINUTES with near-zero data loss. The budget got a raise — but not an infinite one. Pick the disaster-recovery posture and prove it.</div>` +
      `<pre>RPO mandate ...... near-zero data loss\nRTO mandate ...... minutes, not hours\nbudget ........... raised · NOT unlimited\nprove it ......... kill a Region in a drill</pre>`,
    hint: 'Probe both Regions, diagnose, then set the DR-strategy dial. The Region-kill drill (lever) AND the budget review must pass.',
  },
  objectiveFix: 'Set the DR-strategy dial to the posture that fits RPO/RTO *and* budget',
  objectiveDone: 'INC-9001 closed — warm standby held the line.',
  summary: 'Symptom: a Region-scale failure would take the bank down for hours. The four DR postures trade money for speed: backup & restore (cheapest, slowest — hours-long RTO), pilot light (data replicated, minimal infra idling — RTO ~1h class), warm standby (a scaled-down but RUNNING copy — minutes-class RTO/RPO), active-active (both live, near-zero RPO/RTO, and by far the priciest). Minutes + near-zero loss + a real-but-finite budget = warm standby; active-active is what you buy when even seconds are unaffordable.',
  level: [
    { id: 'regA', kind: 'serverRack', at: [-5, 1.5], yaw: Math.PI / 2 },
    { id: 'regB', kind: 'serverRack', at: [5, 1.5], yaw: -Math.PI / 2 },
    { id: 'dial', kind: 'aimPointer', at: [0, -1.5] },
    { id: 'lever', kind: 'chaosLever', at: [4, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'regA', machine: 'regA', prompt: 'Inspect the primary Region',
      kicker: 'primary Region', title: 'Everything, in one place',
      pre: 'workload ......... 100% here\ncross-region ..... nightly backup copy only\nif this dies ..... restore-from-backup: ~18 h',
      journal: 'Primary: the whole bank in one Region; the only escape hatch today is an 18-hour restore.',
    },
    {
      id: 'regB', machine: 'regB', prompt: 'Inspect the second Region',
      kicker: 'second Region', title: 'An empty parking lot',
      pre: 'infra ............ none\ndata ............. last night’s backups\ncould be ......... pilot light · warm standby ·\n                   active-active — pick one',
      journal: 'Second Region: empty today. The dial decides what waits here — and what it costs.',
    },
  ],
  dials: [
    {
      id: 'dr', machine: 'dial', initial: 'backup',
      grabPrompt: '◀ ▶ swing the DR posture · E/Ⓧ lock',
      positions: [
        { id: 'backup', label: 'backup & restore', angle: 2.3 },
        { id: 'pilot', label: 'pilot light', angle: 1.7 },
        { id: 'warm', label: 'warm standby', angle: 1.1 },
        { id: 'active', label: 'active-active', angle: 0.5 },
      ],
    },
  ],
  levers: [
    { id: 'lever-kill', machine: 'lever', prompt: 'PULL — kill the primary Region (drill)', beat: 'kill' },
  ],
  beats: [
    {
      id: 'kill', label: 'Region-kill drill', trigger: 'lever',
      mutate: ['azDead:regA'],
      rules: [
        {
          when: { dial: { dr: 'warm' } }, pass: true,
          title: '✔ Failover in 9 minutes, data to the last second',
          lines: 'posture .......... warm standby (running, scaled-down)\ndata ............. continuously replicated → RPO ~0\nfailover ......... scale up + shift traffic → 9 min\nboard ............ satisfied',
          note: 'A live, small copy of everything: replication keeps RPO near zero, and recovery is “scale up and point DNS”, not “rebuild the world”.',
        },
        {
          when: { dial: { dr: 'active' } }, pass: true,
          title: '✔ Nobody even noticed',
          lines: 'posture .......... active-active\nfailover ......... none needed — both live\nRPO/RTO .......... ~zero / ~zero\ninvoice .......... pending review…',
          note: 'Both Regions serve all the time — the gold standard for RPO/RTO. The budget review will have opinions.',
        },
        {
          when: { dial: { dr: 'pilot' } }, pass: false,
          title: '✘ 47 minutes of cold start',
          lines: 'posture .......... pilot light\ndata ............. replicated ✓\ninfra ............ had to be scaled from embers\nRTO .............. 47 min — mandate says MINUTES',
          note: 'Pilot light keeps the data warm and the infrastructure minimal — right answer for “an hour of RTO on a tight budget”, wrong one for a minutes-class mandate.',
        },
        {
          pass: false,
          title: '✘ Eighteen hours of restore',
          lines: 'posture .......... backup & restore\nRPO .............. last night (hours of loss)\nRTO .............. ~18 h of rebuilding\nboard ............ apoplectic',
          note: 'Cheapest and slowest: fine for dev tooling, catastrophic for the bank. Swing the dial.',
          alarm: 'OUTAGE — REGIONAL FAILOVER FAILED THE MANDATE',
        },
      ],
    },
    {
      id: 'budget', label: 'budget review', trigger: 'terminal',
      rules: [
        {
          when: { dial: { dr: 'warm' } }, pass: true,
          title: '✔ Approved — resilience without the duplicate bill',
          lines: 'warm standby ..... ~35% of primary cost\nmeets ............ minutes RTO · near-zero RPO\nverdict .......... signed',
          note: 'The scaled-down copy costs a fraction of a full twin while keeping recovery in minutes — the RPO/RTO/budget triangle, actually balanced.',
        },
        {
          when: { dial: { dr: 'active' } }, pass: false,
          title: '✘ CFO: “why are we paying for two banks?”',
          lines: 'active-active .... ~200% run cost, forever\nmandate .......... minutes — not zero\nverdict .......... rejected',
          note: 'Active-active buys near-ZERO RTO at nearly double the bill. The mandate said minutes — warm standby delivers that for a third of the cost.',
        },
        {
          pass: false,
          title: '✘ The posture failed the drill — no budget to review',
          lines: 'prerequisite ..... pass the Region-kill drill first',
          note: 'Set a posture that survives the drill, then we’ll talk money.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Minutes to recover, pennies (relatively) to keep',
    body: 'Warm standby: continuously replicated data, a running scaled-down stack, failover in minutes — at a fraction of active-active’s bill. RPO is data, RTO is time; the postures are just prices on those two numbers. Close the ticket at the field terminal.',
    journal: 'Region-kill + budget review passed — warm standby.',
  },
  diagnosis: {
    unlockedBy: 'regA',
    title: 'Minutes of RTO, near-zero RPO, finite budget — which posture?',
    correct: {
      label: 'Warm standby: a running, scaled-down replica — minutes-class failover without paying for a full twin',
      journal: 'Diagnosis confirmed: warm standby fits minutes-RTO/near-zero-RPO at sane cost.',
      confirmBody: 'RPO is how much DATA you can lose; RTO is how much TIME. Backup-restore and pilot light are too slow for this mandate; active-active is too expensive for it. The dial has four stops — the drill and the budget will grade them.',
      actionLabel: 'To the dial →',
    },
    wrongs: [
      { label: 'More frequent backups to the second Region', rebuttal: 'Better RPO, unchanged RTO — you still rebuild everything from scratch while the bank is dark.' },
      { label: 'Multi-AZ already covers us', rebuttal: 'Multi-AZ survives a ZONE. The mandate is a REGION — different blast radius, different design.' },
      { label: 'Active-active, obviously — it’s the best', rebuttal: '“Best” at double the run cost forever. The mandate says minutes; buy minutes, not zero.' },
    ],
  },
  faultLamps: ['regA'],
};

export const STEPFN_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-6610', reporter: 'orders-team', sev: 'SEV-3', title: 'The Cron-Job Octopus',
    bodyHtml:
      `<div>The order workflow is six Lambda functions glued together with cron jobs, retry loops copy-pasted into each one, and a “wait for payment” step implemented as a Lambda that polls every minute, forever. When step four fails, steps five and six run anyway. Nobody can say where order #88231 currently IS.</div>` +
      `<pre>workflow ......... 6 Lambdas · cron glue\nretries .......... copy-pasted, divergent\nwait-for-payment . a Lambda, polling, 24/7\nvisibility ....... none — grep and prayer</pre>`,
    hint: 'Probe the chain, diagnose, then socket the orchestrator and set the workflow-type dial. The payment-failure drill (lever) AND the approval-wait test must pass.',
  },
  objectiveFix: 'Socket the orchestrator · dial the workflow type for the approval wait',
  objectiveDone: 'INC-6610 closed — the octopus is a state machine now.',
  summary: 'Symptom: six Lambdas chained by cron with hand-rolled retries, no branching, no visibility, and a polling Lambda burning compute to “wait”. Fix: AWS Step Functions — a state machine where retries, catch, and branching are CONFIGURATION, every execution has durable visual state (order #88231 is a dot on a diagram), and waiting is free: the callback pattern (waitForTaskToken) pauses a STANDARD workflow for up to a year without consuming compute. Express workflows are the high-volume/short-lived variant — the wrong stop for week-long human approvals.',
  level: [
    { id: 'chain', kind: 'serverRack', at: [3.5, 1.5], yaw: Math.PI / 2 },
    { id: 'payments', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2 },
    { id: 'dial', kind: 'aimPointer', at: [-2, -2] },
    { id: 'lever', kind: 'chaosLever', at: [3.5, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'chain', machine: 'chain', prompt: 'Inspect the Lambda chain',
      kicker: 'order workflow', title: 'Six functions, zero coordination',
      pre: 'glue ............. cron + hope\nstep 4 fails ..... 5 and 6 run anyway\nretries .......... six divergent copies\norder #88231 ..... location unknown',
      journal: 'The chain: six Lambdas with no coordinator — failures don’t branch, retries are copy-paste, state is invisible.',
    },
    {
      id: 'payments', machine: 'payments', prompt: 'Inspect the payment wait',
      kicker: 'wait-for-payment', title: 'A Lambda, polling, forever',
      pre: 'implementation ... poll every 60 s, 24/7\ncompute burned ... constant, for WAITING\ntimeout logic .... none — waits forever',
      journal: 'Payment wait: compute burning around the clock to do nothing. Waiting should be free.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-sfn', kind: 'sfn', label: 'Step Functions state machine', spot: [-2.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-cron', kind: 'cron', label: 'More cron (with feeling)', spot: [-1.7, -4.6], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
      { id: 'mod-queue', kind: 'chainq', label: 'SQS chain between steps', spot: [-2.3, -5.5], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
    ],
  },
  sockets: [
    {
      id: 'so-orch', label: 'orchestrator bay', at: [0.5, -1.2],
      blurb: 'The coordinator: sequencing, retry/catch/branch as configuration, and a durable, visible execution history for every single run.',
      allow: { sfn: true, chainq: true },
      refuse: {
        cron: { reason: 'Cron STARTS things — it cannot branch on failure, retry with backoff, or tell you where an order is. Scheduling is not orchestration.' },
      },
      fallback: { reason: 'The orchestrator bay takes a workflow engine.' },
    },
  ],
  dials: [
    {
      id: 'wtype', machine: 'dial', initial: 'express',
      grabPrompt: '◀ ▶ swing the workflow type · E/Ⓧ lock',
      positions: [
        { id: 'express', label: 'type: EXPRESS (high-volume, short)', angle: 2.0 },
        { id: 'standard', label: 'type: STANDARD (durable, callbacks)', angle: 1.0 },
      ],
    },
  ],
  levers: [
    { id: 'lever-fail', machine: 'lever', prompt: 'PULL — fail the payment step (drill)', beat: 'fail' },
  ],
  beats: [
    {
      id: 'fail', label: 'payment-failure drill', trigger: 'lever',
      rules: [
        {
          when: { socket: { 'so-orch': 'sfn' } }, pass: true,
          title: '✔ Retried twice, caught, branched to refund',
          lines: 'step 4 ........... failed (drill)\nretry ............ ×2 with backoff (config)\ncatch ............ → refund branch\nsteps 5–6 ........ correctly NOT run\n#88231 ........... a green dot on the diagram',
          note: 'Retry, catch, and branching are configuration on the state machine — and the execution history shows every order’s exact position, forever.',
        },
        {
          when: { socket: { 'so-orch': 'chainq' } }, pass: false,
          title: '✘ Buffered the failure, then shipped anyway',
          lines: 'queues ........... decoupled the steps ✓\nbranching ........ none — next step just ran\nrefund path ...... doesn’t exist\nvisibility ....... six queues of mystery depth',
          note: 'Queues decouple; they don’t DECIDE. Nothing branched on the failure and nothing shows the workflow as a whole. Coordination is the state machine’s job.',
        },
        {
          pass: false,
          title: '✘ Step 4 failed; 5 and 6 sent the goods',
          lines: 'coordination ..... none\nrefund ........... plus a free order, apparently',
          note: 'Socket an orchestrator.',
        },
      ],
    },
    {
      id: 'wait', label: 'approval-wait test (7 days)', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-orch': 'sfn' }, dial: { wtype: 'standard' } }, pass: true,
          title: '✔ Paused seven days for $0.00 of compute',
          lines: 'pattern .......... callback (waitForTaskToken)\nwaiting cost ..... none — no polling, no compute\nresume ........... approval sends the token\nmax pause ........ up to a year',
          note: 'Standard workflows pause durably: the state machine parks on the token and wakes when the approval arrives. The polling Lambda is retired.',
        },
        {
          when: { socket: { 'so-orch': 'sfn' }, dial: { wtype: 'express' } }, pass: false,
          title: '✘ Express timed out on day 0 of 7',
          lines: 'express limit .... 5 minutes per execution\napproval wait .... 7 DAYS\nfit .............. none',
          note: 'Express is the high-volume, short-lived, cheapest-per-execution variant — brilliant for event pipelines, hopeless for human-speed waits. Swing to STANDARD for callbacks.',
        },
        {
          pass: false,
          title: '✘ Still polling every minute',
          lines: 'orchestrator ..... missing',
          note: 'Socket the state machine first.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Configuration, not copy-paste',
    body: 'Retries, catches, and branches live in the state machine’s definition; every execution is visible and durable; and the payment wait costs nothing until the token comes home. Express remains in the toolbox for the high-volume short stuff. Close the ticket at the field terminal.',
    journal: 'Failure drill + approval wait passed — Step Functions, Standard with callback.',
  },
  diagnosis: {
    unlockedBy: 'chain',
    title: 'What replaces cron glue, copy-paste retries, and a polling waiter?',
    correct: {
      label: 'A Step Functions state machine — retry/catch/branch as configuration, durable visible executions, callback waits that cost nothing',
      journal: 'Diagnosis confirmed: orchestrate with Step Functions; waitForTaskToken for the approval pause.',
      confirmBody: 'Six Lambdas don’t need a seventh to babysit them — they need a coordinator that isn’t code. And mind the workflow-type dial: the approval wait has opinions about Express.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Merge all six Lambdas into one big function', rebuttal: 'One 15-minute-limited mega-function with six failure domains inside it — you’ve traded visibility for a bigger blast radius.' },
      { label: 'Standardise the retry library across the six', rebuttal: 'Better copy-paste is still copy-paste — and there’s still no branching, no visibility, and a polling waiter burning money.' },
      { label: 'Have each Lambda invoke the next directly', rebuttal: 'Now the chain is hard-coded INTO the steps: failures mid-chain strand orders with no history of where.' },
    ],
  },
  faultLamps: ['chain'],
};

export const STATELESS_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-5322', reporter: 'support', sev: 'SEV-2', title: 'The Logout Storm',
    bodyHtml:
      `<div>Every time Auto Scaling replaces an instance, a slice of logged-in users gets thrown out mid-checkout — their sessions lived in that instance’s memory. Support tickets spike on every deploy and every scale-in. The fleet can’t be elastic while it’s carrying everyone’s memories.</div>` +
      `<pre>sessions ......... in instance memory\nscale-in event ... = logout storm\ndeploys .......... = logout storm\nsticky sessions .. proposed “fix” on the table</pre>`,
    hint: 'Probe the fleet and the balancer, diagnose, then socket the session store. The instance-swap drill (lever) AND the scale-out test must pass.',
  },
  objectiveFix: 'Socket the shared session store',
  objectiveDone: 'INC-5322 closed — servers forget, the store remembers.',
  summary: 'Symptom: sessions in instance memory — every replacement, deploy, or scale-in logs users out. Fix: externalise session state to a fast shared store (DynamoDB or ElastiCache for Redis) so ANY instance serves ANY request: the balancer routes freely, Auto Scaling adds and removes instances at will, and an instance death is a non-event. Sticky sessions only hide the problem: load skews across the fleet and a lost instance still takes its users’ sessions with it.',
  level: [
    { id: 'fleet', kind: 'serverRack', at: [3.5, 1.5], yaw: Math.PI / 2 },
    { id: 'alb', kind: 'routerArm', at: [-3.5, 1.5] },
    { id: 'lever', kind: 'chaosLever', at: [3.5, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'fleet', machine: 'fleet', prompt: 'Inspect the web fleet',
      kicker: 'web fleet', title: 'Carrying everyone’s memories',
      pre: 'sessions ......... HashMap, per instance\ninstance dies .... its users’ carts die too\nscaling .......... every event is a purge',
      journal: 'Fleet: session state lives and dies with each instance — elasticity is impossible while servers remember.',
    },
    {
      id: 'alb', machine: 'alb', prompt: 'Inspect the balancer',
      kicker: 'ALB', title: 'Asked to glue users to boxes',
      pre: 'proposal ......... sticky sessions (cookie pinning)\neffect ........... uneven load, hot instances\ninstance dies .... its stuck users STILL log out',
      journal: 'Balancer: stickiness pins users to instances — skewed load, and the pinned users still lose everything when their box dies.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-redis', kind: 'store', label: 'Shared store (Redis/DynamoDB)', spot: [-2.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-sticky', kind: 'sticky', label: 'Sticky sessions (cookie pinning)', spot: [-1.7, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-bigger', kind: 'bigger', label: 'One huge instance (no scaling)', spot: [-2.3, -5.5], visual: { hex: '#8a7a22', glowHex: '#e8d657' } },
    ],
  },
  sockets: [
    {
      id: 'so-sess', label: 'session bay', at: [0.5, -1.2],
      blurb: 'Where sessions live so servers don’t have to remember anything: a fast shared store every instance reads and writes. Stateless servers = free load balancing + fearless scaling.',
      allow: { store: true, sticky: true },
      refuse: {
        bigger: { reason: 'One giant irreplaceable instance is the OPPOSITE of the fix — now ALL the sessions die together, eventually.' },
      },
      fallback: { reason: 'The session bay takes a session strategy.' },
    },
  ],
  levers: [
    { id: 'lever-swap', machine: 'lever', prompt: 'PULL — replace an instance (drill)', beat: 'swap' },
  ],
  beats: [
    {
      id: 'swap', label: 'instance-swap drill', trigger: 'lever',
      rules: [
        {
          when: { socket: { 'so-sess': 'store' } }, pass: true,
          title: '✔ Instance replaced; nobody blinked',
          lines: 'instance ......... terminated + replaced (drill)\nsessions ......... in the shared store — intact\nusers ............ mid-checkout, uninterrupted\nnext request ..... served by whoever’s free',
          note: 'The server that died remembered nothing worth keeping. Sessions live in the store; instances are cattle again.',
        },
        {
          when: { socket: { 'so-sess': 'sticky' } }, pass: false,
          title: '✘ The pinned users went down with the ship',
          lines: 'instance ......... terminated (drill)\nits pinned users . sessions GONE — logged out\nsurvivors ........ unevenly re-pinned\nload ............. lopsided',
          note: 'Stickiness pins users to a mortal box: when it dies they still lose everything, and until then the load skews. It defers the symptom; it can’t fix the cause.',
        },
        {
          pass: false,
          title: '✘ Logout storm, as scheduled',
          lines: 'sessions ......... in the dead instance’s RAM',
          note: 'Externalise the state — socket the store.',
        },
      ],
    },
    {
      id: 'scale', label: 'scale-out test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-sess': 'store' } }, pass: true,
          title: '✔ Five new instances, serving in seconds',
          lines: 'new instances .... useful on request #1\nrouting .......... free — any box, any user\nscale-in ......... equally boring',
          note: 'Stateless servers make elasticity trivial: any instance can serve any request the moment it boots, and removing one is a non-event.',
        },
        {
          when: { socket: { 'so-sess': 'sticky' } }, pass: false,
          title: '✘ New instances idle; old ones sweat',
          lines: 'existing users ... pinned to the OLD boxes\nnew capacity ..... serves only new arrivals\nhot spots ........ persist',
          note: 'Pinned traffic can’t rebalance onto fresh capacity — stickiness and elasticity pull opposite directions.',
        },
        {
          pass: false,
          title: '✘ Nothing to scale onto',
          lines: 'session bay ...... empty',
          note: 'Socket a session strategy first.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Servers forget; the store remembers',
    body: 'Sessions in a fast shared store, instances stateless and disposable: the balancer routes freely, scaling is fearless, deploys are boring. Close the ticket at the field terminal.',
    journal: 'Swap drill + scale-out passed — externalised sessions, stateless fleet.',
  },
  diagnosis: {
    unlockedBy: 'fleet',
    title: 'Why does every scaling event log users out — and what fixes it?',
    correct: {
      label: 'Sessions live in instance memory — externalise them to a shared store (DynamoDB / ElastiCache Redis) and make the servers stateless',
      journal: 'Diagnosis confirmed: in-memory sessions; externalise to a shared store.',
      confirmBody: 'A server that remembers users is a server you can’t replace. Move the memory OUT — the pallet has the honest fix and the tempting one; the drills will grade them.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Slow down Auto Scaling so it replaces fewer instances', rebuttal: 'Fewer logout storms is still logout storms — and now capacity lags demand too.' },
      { label: 'Sticky sessions on the ALB', rebuttal: 'Pins users to a mortal instance: skewed load while it lives, the same logout when it dies. It’s on the pallet — the drill will show you.' },
      { label: 'Write sessions to local disk instead of RAM', rebuttal: 'The disk terminates with the instance. Same grave, slower funeral.' },
    ],
  },
  faultLamps: ['fleet'],
};
