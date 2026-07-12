import type { MissionSpec } from '../spec';

/** Cost-Optimized batch — the final seven specs. */

export const LAMBDA_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-1150', reporter: 'finops', sev: 'SEV-3', title: 'The Idle Bill',
    bodyHtml:
      `<div>The thumbnail service runs ~40 ms per upload, in unpredictable bursts, on a fleet of always-on instances that idle 92% of the day — billing every second of it. The one worry about going serverless: the marketing spike at 09:00 must hold p99 under 200 ms, cold starts included.</div>` +
      `<pre>work ............. ~40 ms/event · bursty\nfleet idle ....... 92% of the day, billed\np99 mandate ...... < 200 ms at the 09:00 spike\nfear ............. cold starts</pre>`,
    hint: 'Probe the fleet and the traffic, diagnose, then socket the compute and set the concurrency dial. Cost test AND spike-latency test must pass.',
  },
  objectiveFix: 'Socket serverless compute · dial provisioned concurrency for the spike',
  objectiveDone: 'INC-1150 closed — pay per execution, warm for the spike.',
  summary: 'Symptom: an always-on fleet billing 92% idle time for 40 ms bursts of work. Fix: AWS Lambda — pay for requests and duration only, idle costs nothing, scale-out is automatic (15-minute max per invocation). The p99 mandate: PROVISIONED CONCURRENCY keeps instances warm, raised on a schedule just before the 09:00 spike, so cold starts never touch the tail. (Related knobs: reserved concurrency guarantees a critical function capacity; RDS Proxy pools connections when Lambda meets a relational DB.)',
  level: [
    { id: 'fleet', kind: 'serverRack', at: [3.5, 1.5], yaw: Math.PI / 2 },
    { id: 'traffic', kind: 'crowdGate', at: [-8, 0], yaw: Math.PI / 2 },
    { id: 'dial', kind: 'aimPointer', at: [-2, -2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'fleet', machine: 'fleet', prompt: 'Inspect the thumbnail fleet',
      kicker: 'thumbnail fleet', title: 'Paid to wait',
      pre: 'work per event ... ~40 ms\nutilisation ...... 8%\nbilling .......... 24/7, working or not',
      journal: 'Fleet: 40 ms of work per event, billed around the clock — the shape screams per-execution pricing.',
    },
    {
      id: 'traffic', machine: 'traffic', prompt: 'Inspect the traffic',
      kicker: 'traffic', title: 'Bursts, gaps, and one big wave',
      pre: 'pattern .......... bursty · long idle gaps\n09:00 ............ marketing spike, daily\np99 mandate ...... < 200 ms, spike included',
      journal: 'Traffic: unpredictable bursts with a PREDICTABLE 09:00 spike — the tail latency there is the contract.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-lambda', kind: 'lambda', label: 'Lambda (per-event compute)', spot: [-2.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-idle', kind: 'idleec2', label: 'Keep the always-on fleet', spot: [-1.7, -4.6], visual: { hex: '#8a7a22', glowHex: '#e8d657' } },
    ],
  },
  sockets: [
    {
      id: 'so-compute', label: 'compute bay', at: [0.5, -1.2],
      blurb: 'What runs the 40 ms of work: per-event compute that scales out on its own and costs nothing between events — or servers that bill while they wait.',
      allow: { lambda: true, idleec2: true },
      fallback: { reason: 'The compute bay takes a compute model.' },
    },
  ],
  dials: [
    {
      id: 'warm', machine: 'dial', initial: 'none',
      grabPrompt: '◀ ▶ swing the concurrency plan · E/Ⓧ lock',
      positions: [
        { id: 'none', label: 'cold starts: take our chances', angle: 2.0 },
        { id: 'provisioned', label: 'provisioned concurrency + schedule', angle: 1.0 },
      ],
    },
  ],
  beats: [
    {
      id: 'cost', label: 'cost test', trigger: 'terminal', infoInInvestigate: true,
      rules: [
        {
          when: { socket: { 'so-compute': 'lambda' } }, pass: true,
          title: '✔ Idle now costs exactly nothing',
          lines: 'billing .......... requests × duration\nidle gaps ........ $0.00\nscale-out ........ automatic with the burst\nlimit ............ 15 min/invocation (we use 40 ms)',
          note: 'Per-execution pricing fits per-event work: the 92% idle time simply stops existing on the invoice.',
        },
        {
          when: { socket: { 'so-compute': 'idleec2' } }, pass: false,
          title: '✘ Still paying servers to wait',
          lines: 'utilisation ...... 8%\nbilling .......... 100%\nthe gap .......... the bill',
          note: 'An always-on server bills whether or not it works. Event-shaped workloads want event-shaped pricing.',
        },
        { pass: false, title: '✘ No compute socketed', lines: 'compute bay ...... empty', note: 'Socket a compute model.' },
      ],
    },
    {
      id: 'spike', label: 'spike-latency test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-compute': 'lambda' }, dial: { warm: 'provisioned' } }, pass: true,
          title: '✔ p99 148 ms through the 09:00 wave',
          lines: 'provisioned ...... warm instances, pre-scaled\nschedule ......... raised at 08:55, lowered at 10:00\ncold starts ...... zero in the tail',
          note: 'Provisioned concurrency keeps initialised instances waiting, and scheduled scaling raises it just before the wave — the tail never meets a cold start, and you pay for warmth only when it matters.',
        },
        {
          when: { socket: { 'so-compute': 'lambda' } }, pass: false,
          title: '✘ p99 740 ms — the tail is all cold starts',
          lines: 'burst arrival .... new instances initialised\ninit time ........ in the CALLER’s latency\np99 .............. blown at 09:01',
          note: 'Scale-out is automatic but initialisation isn’t free — at spike onset the tail IS the cold starts. Swing the dial: provisioned concurrency, raised on schedule.',
        },
        { pass: false, title: '✘ Nothing to warm', lines: 'compute .......... not serverless yet', note: 'Lambda first.' },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Event-priced, pre-warmed',
    body: 'Lambda bills the 40 ms and nothing else; provisioned concurrency on a schedule holds the 09:00 tail under the mandate. (Guard a critical function with reserved concurrency; pool DB connections with RDS Proxy.) Close the ticket at the field terminal.',
    journal: 'Cost + spike tests passed — Lambda with scheduled provisioned concurrency.',
  },
  diagnosis: {
    unlockedBy: 'fleet',
    title: 'Event-shaped work on always-on servers — what’s the fix?',
    correct: {
      label: 'Lambda (pay per request + duration, nothing when idle) with provisioned concurrency scheduled ahead of the daily spike',
      journal: 'Diagnosis confirmed: serverless per-event pricing; provisioned concurrency for the p99 mandate.',
      confirmBody: 'The bill is idle time; the fear is cold starts. Serverless deletes the first, and the concurrency dial handles the second.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Right-size the fleet to smaller instances', rebuttal: 'Cheaper waiting is still waiting — 92% idle bills at any size.' },
      { label: 'Turn the fleet off at night', rebuttal: 'The bursts are unpredictable — the off-hours are exactly when a burst embarrasses you. Scale-to-zero must be automatic.' },
      { label: 'One big instance with a queue', rebuttal: 'Now bursts queue behind one machine AND it idles between them. Wrong shape twice.' },
    ],
  },
  faultLamps: ['fleet'],
};

export const PURCHASE_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-2280', reporter: 'finops', sev: 'SEV-3', title: 'The Blend',
    bodyHtml:
      `<div>Three workloads, one purchasing strategy: everything On-Demand. The steady 24/7 baseline of ~30 instances has run at full price for two years; the unpredictable customer burst is fine; and the nightly ML training job — which checkpoints to S3 and can resume anywhere — has never once used Spot. Blend the purchase options to the workload shapes.</div>` +
      `<pre>baseline ......... ~30 instances · 24/7 · 3-y horizon\nburst ............ unpredictable, spiky\nML training ...... nightly · 6 h · checkpoints to S3\ntoday ............ 100% On-Demand, 0% thought</pre>`,
    hint: 'Probe the workloads, diagnose, then match a purchase option to each station. Purchase audit AND the interruption drill (lever) must pass.',
  },
  objectiveFix: 'Match purchase options: baseline · burst · batch stations',
  objectiveDone: 'INC-2280 closed — committed, flexible, and interruptible in the right places.',
  summary: 'Symptom: every workload at On-Demand prices regardless of shape. Fix: blend — a 3-year Compute Savings Plan for the steady ~30-instance baseline (RI-level discounts that flex across instance families/Regions), On-Demand for the unpredictable burst (flexibility is what it’s FOR), and Spot for the checkpointed nightly training (cheapest by far; handle the ~2-minute interruption notice and resume from the last S3 checkpoint). And sweep the genuine waste: unattached EBS volumes, stale snapshots, unassociated Elastic IPs.',
  level: [
    { id: 'board', kind: 'serverRack', at: [-4.5, 2.5], yaw: Math.PI / 2 },
    { id: 'lever', kind: 'chaosLever', at: [5, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'board', machine: 'board', prompt: 'Inspect the capacity board',
      kicker: 'three shapes', title: 'Steady, spiky, stoppable',
      pre: 'baseline ......... flat 30, day and night, years\nburst ............ unknowable, customer-driven\ntraining ......... nightly, checkpointed, resumable\npricing today .... one size fits none',
      journal: 'Three shapes: a steady committed baseline, an unpredictable burst, and interruptible checkpointed batch — three different prices exist for exactly this.',
    },
  ],
  pallet: {
    at: [-2, -5.2],
    modules: [
      { id: 'mod-sp', kind: 'savings', label: '3-y Compute Savings Plan', spot: [-3.2, -4.8], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-od', kind: 'ondemand', label: 'On-Demand', spot: [-2.0, -4.8], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-spot', kind: 'spot', label: 'Spot Instances', spot: [-0.8, -4.8], visual: { hex: '#8a3030', glowHex: '#ff8080' } },
    ],
  },
  sockets: [
    {
      id: 'st-base', label: 'baseline station', at: [-3, 0.5],
      blurb: 'The steady 24/7 floor: known for years ahead — commitment earns the discount here.',
      allow: { savings: true, ondemand: true, spot: true },
      fallback: { reason: 'The station takes a purchase option.' },
    },
    {
      id: 'st-burst', label: 'burst station', at: [0, 0.5],
      blurb: 'The unpredictable customer spike: pay for FLEXIBILITY, exactly when you use it.',
      allow: { savings: true, ondemand: true, spot: true },
      fallback: { reason: 'The station takes a purchase option.' },
    },
    {
      id: 'st-batch', label: 'batch station', at: [3, 0.5],
      blurb: 'The nightly checkpointed training: fault-tolerant work that can be interrupted and resumed — the cheapest tier exists for this.',
      allow: { savings: true, ondemand: true, spot: true },
      fallback: { reason: 'The station takes a purchase option.' },
    },
  ],
  levers: [
    { id: 'lever-int', machine: 'lever', prompt: 'PULL — send the 2-minute Spot notice (drill)', beat: 'interrupt' },
  ],
  beats: [
    {
      id: 'audit', label: 'purchase audit', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'st-base': 'savings', 'st-burst': 'ondemand', 'st-batch': 'spot' } }, pass: true,
          title: '✔ Blended: −61% on the same compute',
          lines: 'baseline ......... Savings Plan (−~60%, flexes families)\nburst ............ On-Demand — flexibility, as designed\ntraining ......... Spot (−~80%, interruptible)\nwaste sweep ...... unattached EBS · stale snaps · idle EIPs',
          note: 'Commit to what’s certain, stay flexible on what isn’t, and let interruptible work ride the cheap tier. The Savings Plan gives RI-level discounts without pinning you to one instance family.',
        },
        {
          when: { socket: { 'st-base': 'spot' } }, pass: false,
          title: '✘ The baseline just got interrupted at 14:02',
          lines: 'baseline on Spot . reclaimed with 2-min notice\nsteady service ... has opinions about that',
          note: 'Spot is CHEAP because it’s interruptible — steady always-on service can’t live on capacity that leaves. The baseline wants a commitment discount instead.',
        },
        {
          when: { socket: { 'st-base': 'ondemand' } }, pass: false,
          title: '✘ Two more years at full price',
          lines: 'baseline ......... known, steady, YEARS ahead\nprice paid ....... maximum flexibility premium\nflexibility used . none',
          note: 'On-Demand’s premium buys flexibility the baseline never uses. A 3-year Savings Plan cuts ~60% for committing to what you already know.',
        },
        {
          when: { socket: { 'st-batch': 'ondemand' } }, pass: false,
          title: '✘ The training job overpays nightly',
          lines: 'training ......... checkpointed, resumable\ninterruption ..... survivable by design\ndiscount taken ... none',
          note: 'Fault-tolerant, resumable work is EXACTLY what Spot is for — ~80% off for tolerating what this job already tolerates.',
        },
        {
          pass: false,
          title: '✘ The blend is off',
          lines: 'shapes ........... steady / spiky / stoppable\noptions .......... committed / flexible / interruptible',
          note: 'Match them: Savings Plan · On-Demand · Spot.',
        },
      ],
    },
    {
      id: 'interrupt', label: 'interruption drill', trigger: 'lever',
      rules: [
        {
          when: { socket: { 'st-batch': 'spot' } }, pass: true,
          title: '✔ Notice received, checkpoint saved, resumed elsewhere',
          lines: 'notice ........... 2 minutes (as contracted)\ncheckpoint ....... flushed to S3\nresume ........... new Spot capacity, minutes later\nloss ............. ~one checkpoint interval',
          note: 'The interruption is part of the deal — the job checkpoints, yields, and resumes. That grace IS the 80% discount.',
        },
        {
          pass: false,
          title: '✘ Nothing on Spot to interrupt',
          lines: 'batch station .... not Spot',
          note: 'The drill grades the batch station — Spot belongs there.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Right price for every shape',
    body: 'Savings Plan on the certain baseline, On-Demand where flexibility earns its premium, Spot where interruptions are survivable — and the idle-resource sweep on top. Close the ticket at the field terminal.',
    journal: 'Purchase audit + interruption drill passed — blended purchasing.',
  },
  diagnosis: {
    unlockedBy: 'board',
    title: 'Three workload shapes — what does each pay?',
    correct: {
      label: 'Blend: Savings Plan for the steady baseline · On-Demand for the unpredictable burst · Spot for the checkpointed batch',
      journal: 'Diagnosis confirmed: purchase options matched to workload certainty and interruption tolerance.',
      confirmBody: 'Certainty earns discounts, unpredictability pays for flexibility, and interruption-tolerance is a currency. Three stations, three answers.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Reserve everything for 3 years', rebuttal: 'Committing to the unpredictable burst means paying for capacity you can’t forecast — commitments are for the FLOOR, not the spikes.' },
      { label: 'Put everything on Spot', rebuttal: 'The baseline serves customers 24/7 — it can’t vanish on 2 minutes’ notice. Spot is for work that shrugs at interruption.' },
      { label: 'Negotiate a bigger enterprise discount', rebuttal: 'A discount on the wrong shapes is still the wrong shapes — the blend beats any flat percentage.' },
    ],
  },
  faultLamps: ['board'],
};

export const ASG_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-3419', reporter: 'sre', sev: 'SEV-3', title: 'The 9 A.M. Wave',
    bodyHtml:
      `<div>Every weekday at 09:00 the same tidal wave of logins arrives — and every weekday the fleet spends twenty minutes drowning while reactive scaling catches up. Then all night, twelve instances serve nobody. The wave is PREDICTABLE; the capacity isn’t.</div>` +
      `<pre>09:00 weekdays ... same wave, every day\nscale-out lag .... ~20 min of drowning\novernight ........ 12 instances · ~0 users\npolicy today ..... fixed capacity, hand-tuned</pre>`,
    hint: 'Probe the fleet and the graphs, diagnose, then set the scaling-policy dial. Surge test AND quiet-hours bill must pass.',
  },
  objectiveFix: 'Dial the scaling policy to TARGET-TRACKING + SCHEDULED',
  objectiveDone: 'INC-3419 closed — capacity rides the demand curve.',
  summary: 'Symptom: fixed capacity fitting a variable curve — drowning at 09:00, idling all night. Fix: an Auto Scaling group with TARGET TRACKING (hold ~60% CPU; min/desired/max bound it; failed instances are replaced — self-healing) PLUS a SCHEDULED ACTION that raises minimum capacity just before the known 09:00 wave, because reactive policies chase surges they can only see after the pain starts. (I/O-bound queue workers? Target-track a custom backlog-per-instance metric. Scale-in drops? Connection draining + lifecycle hooks.)',
  level: [
    { id: 'fleet', kind: 'serverRack', at: [3.5, 1.5], yaw: Math.PI / 2 },
    { id: 'graphs', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2 },
    { id: 'dial', kind: 'aimPointer', at: [-2, -2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'fleet', machine: 'fleet', prompt: 'Inspect the fleet',
      kicker: 'web fleet', title: 'Fixed size, variable world',
      pre: 'capacity ......... 12, always\n09:05 ............ drowning\n03:00 ............ serving nobody\nhealth checks .... manual restarts (!)',
      journal: 'Fleet: hand-tuned fixed capacity — too small at 09:00, too big at 03:00, and unhealthy instances wait for humans.',
    },
    {
      id: 'graphs', machine: 'graphs', prompt: 'Inspect the demand graphs',
      kicker: 'demand', title: 'The most predictable surprise in tech',
      pre: 'weekday 09:00 .... the same wave, every time\nweekend .......... flat\nvariance ......... low — this curve is a TIMETABLE',
      journal: 'Demand: the 09:00 wave is a timetable, not a surprise — capacity can be there BEFORE it.',
    },
  ],
  dials: [
    {
      id: 'policy', machine: 'dial', initial: 'fixed',
      grabPrompt: '◀ ▶ swing the scaling policy · E/Ⓧ lock',
      positions: [
        { id: 'fixed', label: 'fixed capacity (hand-tuned)', angle: 2.3 },
        { id: 'target', label: 'target tracking @60% CPU', angle: 1.7 },
        { id: 'sched', label: 'target tracking + scheduled 08:55', angle: 1.1 },
      ],
    },
  ],
  beats: [
    {
      id: 'surge', label: 'surge test (09:00)', trigger: 'terminal', infoInInvestigate: true,
      rules: [
        {
          when: { dial: { policy: 'sched' } }, pass: true,
          title: '✔ Capacity was waiting for the wave',
          lines: '08:55 ............ scheduled action raised minimum\n09:00 ............ wave met at 58% CPU\nresidual spikes .. target tracking absorbs\nunhealthy box .... replaced automatically',
          note: 'Scheduled scaling handles the KNOWN wave; target tracking handles everything the schedule didn’t know. Min/desired/max keep it bounded, and health-check replacement makes the fleet self-healing.',
        },
        {
          when: { dial: { policy: 'target' } }, pass: false,
          title: '✘ Twenty minutes of catching up, again',
          lines: '09:00 ............ CPU 60% → 95% in minutes\nreaction ......... alarms → launch → boot → warm\nusers meanwhile .. drowning',
          note: 'Target tracking is REACTIVE — it can only chase a wave it has already felt. A predictable surge deserves a scheduled action that raises minimum capacity BEFORE it lands.',
        },
        {
          pass: false,
          title: '✘ Twelve instances vs the tide',
          lines: 'capacity ......... fixed\nthe wave ......... not',
          note: 'Swing the dial off fixed.',
        },
      ],
    },
    {
      id: 'quiet', label: 'quiet-hours bill', trigger: 'terminal',
      rules: [
        {
          when: { dial: { policy: 'sched' } }, pass: true,
          title: '✔ Three instances hum through the night',
          lines: 'scale-in ......... to minimum after the wave\ndraining ......... connections finish first\novernight bill ... −75%',
          note: 'Scale-in is the other half of elasticity: capacity falls with demand, and connection draining (deregistration delay) means nobody’s request dies with the instance.',
        },
        {
          pass: false,
          title: '✘ Twelve night-shift instances, zero users',
          lines: 'overnight ........ full fleet, idle\nbill ............. full price for silence',
          note: 'Scaling IN is where the money is — the policy dial again.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Capacity rides the curve',
    body: 'Scheduled scaling meets the timetable, target tracking absorbs the noise, min/max keep it sane, and scale-in stops the overnight burn. Close the ticket at the field terminal.',
    journal: 'Surge + quiet-hours passed — target tracking with a scheduled 08:55 action.',
  },
  diagnosis: {
    unlockedBy: 'graphs',
    title: 'A predictable daily wave — what scaling policy fits?',
    correct: {
      label: 'Target tracking for the baseline PLUS a scheduled action raising minimum capacity just before the known 09:00 surge',
      journal: 'Diagnosis confirmed: scheduled scaling for the timetable, target tracking for the noise.',
      confirmBody: 'Reactive policies chase; schedules anticipate. The wave is a timetable — put capacity on it. The dial has three stops.',
      actionLabel: 'To the dial →',
    },
    wrongs: [
      { label: 'Size the fleet for the 09:00 peak permanently', rebuttal: 'That’s the overnight-waste half of the ticket, made policy. Peak-sizing is what auto scaling exists to end.' },
      { label: 'Lower the target to 30% CPU so it scales earlier', rebuttal: 'Now the fleet runs half-empty all day to soften one predictable wave — a schedule targets the wave precisely.' },
      { label: 'Ask marketing to stagger the logins', rebuttal: 'The demand curve is the business. Capacity adapts to it, not the reverse.' },
    ],
  },
  faultLamps: ['fleet'],
};

export const BILLWATCH_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-4890', reporter: 'finance', sev: 'SEV-3', title: 'The Surprise Invoice',
    bodyHtml:
      `<div>Finance found out about last month’s 3× overspend from the INVOICE — twenty days after the money left. And when they asked which team spent it, the answer was one undifferentiated number: the shared account has no tags, no budgets, no forecast alerts.</div>` +
      `<pre>overspend ........ discovered on the invoice\nalerting ......... none — the invoice IS the alert\nchargeback ....... impossible: one big number\ntags ............. none applied</pre>`,
    hint: 'Probe the invoice and the account, diagnose, then socket the alerting and swing the tag dial. Forecast drill (lever) AND chargeback test must pass.',
  },
  objectiveFix: 'Socket forecast alerting · dial cost-allocation tags ON',
  objectiveDone: 'INC-4890 closed — warned mid-month, attributed per team.',
  summary: 'Symptom: overspend discovered on the invoice, unattributable to any team. Fix: AWS Budgets with a FORECASTED-spend alert — it projects month-end from the current burn and warns while there’s still month left to act — plus consistent COST-ALLOCATION TAGS activated in the Billing console so Cost Explorer breaks spend down per team/project for chargeback. (The wider kit: Cost Explorer for historical trends, Compute Optimizer for right-sizing recommendations, and the Cost & Usage Report to S3 for hourly resource-level data.)',
  level: [
    { id: 'invoice', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2 },
    { id: 'account', kind: 'serverRack', at: [4.5, 1.5], yaw: -Math.PI / 2 },
    { id: 'dial', kind: 'aimPointer', at: [-2, -2] },
    { id: 'lever', kind: 'chaosLever', at: [3.5, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'invoice', machine: 'invoice', prompt: 'Inspect the invoice',
      kicker: 'last month', title: 'An alert that arrives in arrears',
      pre: 'overspend ........ 3× · found day 20 of NEXT month\nreaction time .... negative twenty days\nforecasting ...... none configured',
      journal: 'Invoice: the only alarm fires after the money is gone. Forecast alerts exist to fire DURING the month.',
    },
    {
      id: 'account', machine: 'account', prompt: 'Inspect the shared account',
      kicker: 'shared account', title: 'One number, five teams',
      pre: 'teams ............ 5, one account\ntags ............. none\nchargeback ....... “split it evenly?” (riot)',
      journal: 'Account: five teams’ spend fused into one number — attribution needs tags, applied consistently and ACTIVATED for billing.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-budget', kind: 'budgets', label: 'AWS Budgets (forecast alert)', spot: [-2.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-report', kind: 'monthly', label: 'Monthly spend report (email)', spot: [-1.7, -4.6], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-alert', label: 'alerting bay', at: [0.5, -1.2],
      blurb: 'What tells finance BEFORE month-end: a budget that projects the month from today’s burn rate and alerts on the forecast, not the corpse.',
      allow: { budgets: true, monthly: true },
      fallback: { reason: 'The alerting bay takes a spend monitor.' },
    },
  ],
  dials: [
    {
      id: 'tags', machine: 'dial', initial: 'off',
      grabPrompt: '◀ ▶ swing cost-allocation tags · E/Ⓧ lock',
      positions: [
        { id: 'off', label: 'tags: none', angle: 2.0 },
        { id: 'on', label: 'tags: applied + ACTIVATED', angle: 1.0 },
      ],
    },
  ],
  levers: [
    { id: 'lever-spike', machine: 'lever', prompt: 'PULL — replay the spend spike (drill)', beat: 'spike' },
  ],
  beats: [
    {
      id: 'spike', label: 'forecast drill', trigger: 'lever',
      rules: [
        {
          when: { socket: { 'so-alert': 'budgets' } }, pass: true,
          title: '✔ Alerted on day 9: “forecast exceeds budget”',
          lines: 'burn rate ........ jumped day 8\nforecast ......... month-end 3× budget\nalert ............ day 9 — 21 days to act\naction ........... spike found and killed by day 10',
          note: 'A forecasted-spend alert projects month-end from the live burn rate — finance heard about the spike while it was still preventable, not on the invoice.',
        },
        {
          when: { socket: { 'so-alert': 'monthly' } }, pass: false,
          title: '✘ The report agreed with the invoice, later',
          lines: 'report ........... accurate · monthly · post-mortem\nspike ............ fully funded by then',
          note: 'A report after month-end is an autopsy. The FORECAST alert is the smoke detector — Budgets, with the forecasted-spend condition.',
        },
        { pass: false, title: '✘ The invoice remains the alarm', lines: 'alerting bay ..... empty', note: 'Socket the monitor.' },
      ],
    },
    {
      id: 'chargeback', label: 'chargeback test', trigger: 'terminal',
      rules: [
        {
          when: { dial: { tags: 'on' } }, pass: true,
          title: '✔ Five teams, five numbers, zero riots',
          lines: 'tags ............. team/project, consistent\nactivated ........ in the Billing console ✓\nCost Explorer .... grouped by tag → chargeback\nuntagged rump .... 4% and shrinking',
          note: 'Cost-allocation tags, applied consistently AND activated for billing, turn the one big number into per-team lines Cost Explorer can slice.',
        },
        {
          pass: false,
          title: '✘ Still one big number',
          lines: 'attribution ...... impossible without tags',
          note: 'Tag it or you can’t charge for it — swing the dial.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Warned in time, attributed by team',
    body: 'Budgets forecasts the month and alerts while it can still be changed; activated cost-allocation tags give every team its own line. Cost Explorer for trends, Compute Optimizer for right-sizing, CUR-to-S3 when FinOps wants the firehose. Close the ticket at the field terminal.',
    journal: 'Forecast drill + chargeback passed — Budgets forecast alerts + activated tags.',
  },
  diagnosis: {
    unlockedBy: 'invoice',
    title: 'Warned before month-end AND spend per team — what combination?',
    correct: {
      label: 'AWS Budgets with a FORECASTED-spend alert + consistent cost-allocation tags activated in Billing',
      journal: 'Diagnosis confirmed: forecast alerts for time-to-act; activated tags for attribution.',
      confirmBody: 'The invoice is history; the forecast is a warning. And a number you can’t split is a number you can’t govern. Bay and dial.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Check Cost Explorer every Friday', rebuttal: 'A human rota against a burn rate that spikes on Tuesdays. The FORECAST alert watches every day, including the ones people don’t.' },
      { label: 'Alert when actual spend exceeds the budget', rebuttal: 'Actual-spend alerts fire once the money is GONE. Forecasted-spend fires while the month can still be saved.' },
      { label: 'Give each team its own invoice line manually', rebuttal: 'Manual allocation of untagged resources is guesswork with a spreadsheet — tags make the data itself carry the owner.' },
    ],
  },
  faultLamps: ['invoice'],
};

export const COMPUTE_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-5533', reporter: 'platform', sev: 'SEV-3', title: 'Three Workloads, One Habit',
    bodyHtml:
      `<div>Everything gets an EC2 instance here, by habit: the licensed legacy app that genuinely needs kernel control (fine), the 40 ms bursty thumbnail task idling on its own box (not fine), and the containerised API whose team spends Fridays patching container hosts (why). Place each on the compute it’s shaped for.</div>` +
      `<pre>legacy app ....... kernel module · long-running · licensed\nthumbnails ....... 40 ms bursts · long idle gaps\nAPI .............. containerised · team hates host ops\nhabit ............ EC2 for everything</pre>`,
    hint: 'Probe the workload board, diagnose, then match compute to each station. Placement audit AND idle-cost review must pass.',
  },
  objectiveFix: 'Match compute: legacy · thumbnails · API stations',
  objectiveDone: 'INC-5533 closed — shaped compute for shaped work.',
  summary: 'Symptom: EC2-by-default regardless of shape. Fix: pick compute by workload shape and ops appetite — EC2 for the legacy app (full OS/kernel control, long-running; buy it with a Savings Plan), Lambda for the thumbnails (per-request pricing, scales to zero in the idle gaps; a poor fit for 45-minute batches or 64 GB+GPU work), and ECS on Fargate for the containerised API (containers without provisioning, patching, or scaling any hosts).',
  level: [
    { id: 'board', kind: 'serverRack', at: [-4.5, 2.5], yaw: Math.PI / 2 },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'board', machine: 'board', prompt: 'Inspect the workload board',
      kicker: 'three shapes', title: 'Control, bursts, containers',
      pre: 'legacy ........... needs the KERNEL · runs forever\nthumbnails ....... 40 ms · bursty · mostly idle\nAPI .............. containers · zero host appetite',
      journal: 'Three shapes: kernel-control long-runner, per-event burst work, and containers minus host ops — three computes exist for exactly these.',
    },
  ],
  pallet: {
    at: [-2, -5.2],
    modules: [
      { id: 'mod-ec2', kind: 'c-ec2', label: 'EC2 (full control)', spot: [-3.2, -4.8], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-lambda', kind: 'c-lambda', label: 'Lambda (per-event)', spot: [-2.0, -4.8], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-fargate', kind: 'c-fargate', label: 'Fargate (containers, no hosts)', spot: [-0.8, -4.8], visual: { hex: '#3b2f4d', glowHex: '#b48ce0' } },
    ],
  },
  sockets: [
    {
      id: 'st-legacy', label: 'legacy station', at: [-3, 0.5],
      blurb: 'Licensed, long-running, and it loads a kernel module — this workload needs to OWN its operating system.',
      allow: { 'c-ec2': true, 'c-lambda': true, 'c-fargate': true },
      fallback: { reason: 'The station takes a compute model.' },
    },
    {
      id: 'st-thumb', label: 'thumbnail station', at: [0, 0.5],
      blurb: '40 ms per event, unpredictable bursts, long idle gaps — work that should cost nothing while nothing happens.',
      allow: { 'c-ec2': true, 'c-lambda': true, 'c-fargate': true },
      fallback: { reason: 'The station takes a compute model.' },
    },
    {
      id: 'st-api', label: 'API station', at: [3, 0.5],
      blurb: 'Already containerised; the team wants to ship task definitions and never meet a host.',
      allow: { 'c-ec2': true, 'c-lambda': true, 'c-fargate': true },
      fallback: { reason: 'The station takes a compute model.' },
    },
  ],
  beats: [
    {
      id: 'audit', label: 'placement audit', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'st-legacy': 'c-ec2', 'st-thumb': 'c-lambda', 'st-api': 'c-fargate' } }, pass: true,
          title: '✔ Three shapes, three right computes',
          lines: 'legacy ........... EC2 — kernel control, Savings Plan\nthumbnails ....... Lambda — pay per 40 ms\nAPI .............. Fargate — containers, no hosts',
          note: 'Shape and ops appetite pick the compute: control needs EC2, events need Lambda, containers-without-janitors need Fargate.',
        },
        {
          when: { socket: { 'st-legacy': 'c-lambda' } }, pass: false,
          title: '✘ The legacy app hit the 15-minute wall',
          lines: 'runtime .......... continuous (Lambda caps at 15 min)\nkernel module .... no kernel access exists here',
          note: 'Lambda is a poor fit for long-continuous or kernel-touching work — that station needs the full OS control of EC2.',
        },
        {
          when: { socket: { 'st-thumb': 'c-ec2' } }, pass: false,
          title: '✘ A server idling between thumbnails',
          lines: 'work ............. 40 ms bursts\nbilling .......... 24/7 regardless',
          note: 'Event-shaped work on always-on compute pays for the gaps. The thumbnail station wants per-request pricing.',
        },
        {
          when: { socket: { 'st-api': 'c-ec2' } }, pass: false,
          title: '✘ Friday is still host-patching day',
          lines: 'containers ....... on hosts the team must run\nops appetite ..... explicitly zero',
          note: 'Containers on self-managed EC2 keeps all the host toil. Fargate runs the same task definitions with nothing to patch.',
        },
        {
          pass: false,
          title: '✘ Placements don’t match shapes',
          lines: 'control / events / containers ... EC2 / Lambda / Fargate',
          note: 'Match the stations.',
        },
      ],
    },
    {
      id: 'idle', label: 'idle-cost review', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'st-thumb': 'c-lambda', 'st-api': 'c-fargate' } }, pass: true,
          title: '✔ Idle spend: gone where idle exists',
          lines: 'thumbnails idle .. $0 (scale to zero)\nAPI hosts ........ none to idle\nlegacy ........... committed via Savings Plan',
          note: 'The burst workload now costs its 40 milliseconds; the API bills per task; the always-on legacy box carries a commitment discount instead of a flexibility premium.',
        },
        {
          pass: false,
          title: '✘ The idle meters still run',
          lines: 'somewhere ........ a box waits, billing',
          note: 'The audit placements drive this review — match them first.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Shaped compute for shaped work',
    body: 'EC2 where control is the requirement, Lambda where events are, Fargate where containers meet a zero-host appetite. The habit is replaced by a decision. Close the ticket at the field terminal.',
    journal: 'Placement + idle-cost passed — EC2/Lambda/Fargate matched to shape.',
  },
  diagnosis: {
    unlockedBy: 'board',
    title: 'What actually chooses between EC2, Lambda, and Fargate?',
    correct: {
      label: 'Workload SHAPE and ops appetite: OS/kernel control → EC2 · per-event bursts → Lambda · containers minus host ops → Fargate',
      journal: 'Diagnosis confirmed: compute chosen by shape and ops appetite, not habit.',
      confirmBody: 'Control, events, containers — the stations describe themselves. Match them and the idle spend follows.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'EC2 everywhere, but smaller instances', rebuttal: 'Right-sizing the wrong model still bills the idle gaps and still patches the hosts.' },
      { label: 'Lambda everywhere — it’s the most modern', rebuttal: 'The legacy app needs a kernel and runs past 15 minutes; big-memory/GPU work doesn’t fit either. Lambda is a shape, not a religion.' },
      { label: 'Kubernetes on self-managed nodes for everything', rebuttal: 'Maximum host ops for a team that wanted none — and the thumbnails still idle between events.' },
    ],
  },
  faultLamps: ['board'],
};

export const SCALEUPOUT_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-6644', reporter: 'platform', sev: 'SEV-2', title: 'The Ceiling',
    bodyHtml:
      `<div>The monolith lives on one very large instance that keeps hitting its CPU ceiling — and when that instance sneezes, the whole product is down. The team keeps buying the next size up; there are two sizes left. Also: sessions live in the instance’s memory, which is why nobody dares run two of them.</div>` +
      `<pre>instance ......... one · very large · CPU-capped\nnext sizes left .. two\navailability ..... one sneeze = outage\nsessions ......... in-memory (the real blocker)</pre>`,
    hint: 'Probe the monolith and the sessions, diagnose, then socket the capacity strategy AND swing the session dial. Load test and the sneeze drill (lever) must pass.',
  },
  objectiveFix: 'Socket the fleet strategy · dial sessions to EXTERNAL',
  objectiveDone: 'INC-6644 closed — no ceiling, no single sneeze.',
  summary: 'Symptom: vertical scaling into a ceiling on a single point of failure, blocked from scaling out by in-memory sessions. Fix: make it STATELESS first (externalise sessions to a shared store) then SCALE OUT behind a load balancer — capacity grows by adding instances with no per-instance ceiling, and losing one degrades instead of destroys. Scale-UP stays the pragmatic answer for hard-to-distribute single-node work (the classic: a single-writer relational database’s write throughput).',
  level: [
    { id: 'mono', kind: 'serverRack', at: [3.5, 1.5], yaw: Math.PI / 2 },
    { id: 'alb', kind: 'routerArm', at: [-3.5, 1.5] },
    { id: 'dial', kind: 'aimPointer', at: [-2, -2] },
    { id: 'lever', kind: 'chaosLever', at: [3.5, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'mono', machine: 'mono', prompt: 'Inspect the monolith',
      kicker: 'the monolith', title: 'Two sizes from the top',
      pre: 'instance ......... near the largest available\nceiling .......... CPU, weekly\nfailure domain ... EVERYTHING\nupgrade path ..... two more cheques, then a wall',
      journal: 'Monolith: vertical scale is a ladder with a top — and the single instance is a single point of failure.',
    },
    {
      id: 'alb', machine: 'alb', prompt: 'Inspect the idle balancer',
      kicker: 'ALB', title: 'A balancer with nobody to balance',
      pre: 'targets .......... 1 (the monolith)\nblocker .......... in-memory sessions pin users\nfleet-ready ...... the moment state moves out',
      journal: 'Balancer: ready to spread load across a fleet — the in-memory sessions are the only thing forbidding instance #2.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-fleet', kind: 'fleet', label: 'Fleet of smaller instances + ASG', spot: [-2.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-huge', kind: 'huge', label: 'The next size up (again)', spot: [-1.7, -4.6], visual: { hex: '#8a7a22', glowHex: '#e8d657' } },
    ],
  },
  sockets: [
    {
      id: 'so-cap', label: 'capacity bay', at: [0.5, -1.2],
      blurb: 'How capacity grows from here: more identical instances behind the balancer (no ceiling, no single failure) — or one more rung on a finite ladder.',
      allow: { fleet: true, huge: true },
      fallback: { reason: 'The capacity bay takes a scaling strategy.' },
    },
  ],
  dials: [
    {
      id: 'sessions', machine: 'dial', initial: 'memory',
      grabPrompt: '◀ ▶ swing session storage · E/Ⓧ lock',
      positions: [
        { id: 'memory', label: 'sessions: in-memory (pinned)', angle: 2.0 },
        { id: 'external', label: 'sessions: shared store', angle: 1.0 },
      ],
    },
  ],
  levers: [
    { id: 'lever-sneeze', machine: 'lever', prompt: 'PULL — kill an instance (drill)', beat: 'sneeze' },
  ],
  beats: [
    {
      id: 'load', label: 'load test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-cap': 'fleet' }, dial: { sessions: 'external' } }, pass: true,
          title: '✔ Load spread; ceiling deleted',
          lines: 'fleet ............ 6 small instances, ASG-managed\nsessions ......... shared store — any box serves anyone\nceiling .......... none: capacity = add instances',
          note: 'Stateless first, then horizontal: the balancer routes freely, the ASG adds capacity without a size wall, and no instance is special.',
        },
        {
          when: { socket: { 'so-cap': 'fleet' }, dial: { sessions: 'memory' } }, pass: false,
          title: '✘ Six instances, users glued to one',
          lines: 'fleet ............ launched ✓\nsessions ......... pinned in each box’s memory\nbalancing ........ stickiness and hot spots',
          note: 'Scale-out with in-memory state is a logout storm with extra steps — externalise the sessions FIRST. Swing the dial.',
        },
        {
          when: { socket: { 'so-cap': 'huge' } }, pass: true,
          title: '✔ Headroom purchased. Two rungs remain',
          lines: 'CPU today ........ fine\nceiling .......... visible from here\nfailure domain ... still everything',
          note: 'The bigger box passes today’s load test — vertical scale genuinely works until the ladder ends. The sneeze drill has a follow-up question.',
        },
        { pass: false, title: '✘ No strategy socketed', lines: 'capacity bay ..... empty', note: 'Socket one.' },
      ],
    },
    {
      id: 'sneeze', label: 'sneeze drill', trigger: 'lever',
      rules: [
        {
          when: { socket: { 'so-cap': 'fleet' }, dial: { sessions: 'external' } }, pass: true,
          title: '✔ One instance died; the service shrugged',
          lines: 'killed ........... 1 of 6 (drill)\nusers ............ rerouted, sessions intact\nASG .............. replacement booting\ndegradation ...... 17% capacity, 0% outage',
          note: 'Losing an instance degrades a fleet and destroys a singleton. This is the availability half of scale-out — the half a bigger box can never buy. (The single-writer database remains the honest scale-UP case.)',
        },
        {
          when: { socket: { 'so-cap': 'huge' } }, pass: false,
          title: '✘ The very large instance took the very whole product',
          lines: 'killed ........... the one instance (drill)\nusers ............ all of them, down\nsize at death .... impressively large',
          note: 'A single point of failure at any size is still single. Availability needs PEERS — scale out (after going stateless).',
          alarm: 'OUTAGE — SINGLE INSTANCE, TOTAL LOSS',
        },
        { pass: false, title: '✘ Down, and not even big', lines: 'strategy ......... incomplete', note: 'Fleet + external sessions.', alarm: 'OUTAGE — SINGLE INSTANCE, TOTAL LOSS' },
      ],
    },
  ],
  verifyDone: {
    title: '✔ No ceiling, no single sneeze',
    body: 'Sessions in a shared store made the fleet possible; the fleet made the ceiling and the single point of failure history. Scale-up keeps its niche — single-node work like a lone database writer — but the web tier scales OUT. Close the ticket at the field terminal.',
    journal: 'Load + sneeze drills passed — stateless scale-out behind the ALB.',
  },
  diagnosis: {
    unlockedBy: 'mono',
    title: 'Past the ceiling AND past the single point of failure?',
    correct: {
      label: 'Externalise the sessions, then scale OUT behind the load balancer — no size ceiling, and one lost instance only degrades',
      journal: 'Diagnosis confirmed: stateless first, then horizontal scale.',
      confirmBody: 'The ladder ends; the fleet doesn’t. But instance #2 is only possible once the sessions leave instance #1’s memory — dial and bay, in that order of importance.',
      actionLabel: 'To the fix →',
    },
    wrongs: [
      { label: 'Buy the biggest instance and revisit next year', rebuttal: 'Two rungs from the wall with the SPOF intact — it’s on the pallet, and the sneeze drill grades it.' },
      { label: 'A warm standby copy of the monolith', rebuttal: 'Failover helps availability but the CPU ceiling remains — and the sessions still die with the primary.' },
      { label: 'Shard users across two independent monoliths', rebuttal: 'Two snowflakes, doubled ops, and users pinned to shards — scale-out without the balancer’s freedom.' },
    ],
  },
  faultLamps: ['mono'],
};

export const ORG_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-7777', reporter: 'platform', sev: 'SEV-2', title: 'One Account, Many Regrets',
    bodyHtml:
      `<div>Prod, dev, and every experiment share ONE AWS account. Last week a dev load test throttled production; last month someone’s IAM-admin script nearly deleted the audit trail. Leadership wants blast-radius isolation, guardrails no team can lift, one bill — and dozens more teams onboarding next year.</div>` +
      `<pre>accounts ......... one, shared by everything\nlast week ........ dev load test throttled PROD\nlast month ....... admin script vs the audit trail\nincoming ......... dozens of new teams</pre>`,
    hint: 'Probe the account and the incident log, diagnose, then socket the structure and swing the guardrail dial. Blast-radius drill (lever) AND guardrail test must pass.',
  },
  objectiveFix: 'Socket the multi-account structure · dial guardrails to SCP',
  objectiveDone: 'INC-7777 closed — isolated accounts, unliftable guardrails, one bill.',
  summary: 'Symptom: one shared account where every mistake is everyone’s outage, and admin permissions can reach the audit trail. Fix: separate accounts per environment/team under AWS ORGANIZATIONS — blast-radius isolation with consolidated billing (one invoice, pooled discounts) — and SCP guardrails on OUs: Service Control Policies set the MAXIMUM permissions for member accounts; they never grant, only cap — so even a member-account IAM admin cannot delete the CloudTrail trail. Onboarding dozens of accounts with baselines: AWS Control Tower’s governed landing zone.',
  level: [
    { id: 'account', kind: 'serverRack', at: [3.5, 1.5], yaw: Math.PI / 2 },
    { id: 'log', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2 },
    { id: 'dial', kind: 'aimPointer', at: [-2, -2] },
    { id: 'lever', kind: 'chaosLever', at: [3.5, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'account', machine: 'account', prompt: 'Inspect the shared account',
      kicker: 'the account', title: 'Everyone’s eggs, one basket',
      pre: 'tenants .......... prod + dev + experiments\nquotas ........... shared (hence last week)\nblast radius ..... total\nisolation ........ none',
      journal: 'Shared account: every team’s mistakes share prod’s quotas, limits, and fate. Isolation means SEPARATE ACCOUNTS.',
    },
    {
      id: 'log', machine: 'log', prompt: 'Inspect the incident log',
      kicker: 'incidents', title: 'Admin means too much here',
      pre: 'IAM admin ........ can touch ANYTHING in-account\nincl. ............ the audit trail (nearly, last month)\nguardrail ........ none exists above IAM',
      journal: 'Incidents: in-account IAM admin has no ceiling above it — a guardrail must live ABOVE the account (SCP).',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-orgs', kind: 'orgs', label: 'Organizations: accounts + OUs', spot: [-2.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-iam', kind: 'moreiam', label: 'Stricter IAM in the one account', spot: [-1.7, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
    ],
  },
  sockets: [
    {
      id: 'so-org', label: 'structure bay', at: [0.5, -1.2],
      blurb: 'How the estate is organised: isolated accounts grouped into OUs under one Organization — one bill, pooled discounts, and a place to hang guardrails that member admins can’t reach.',
      allow: { orgs: true, moreiam: true },
      fallback: { reason: 'The structure bay takes an account strategy.' },
    },
  ],
  dials: [
    {
      id: 'guard', machine: 'dial', initial: 'none',
      grabPrompt: '◀ ▶ swing the guardrails · E/Ⓧ lock',
      positions: [
        { id: 'none', label: 'guardrails: IAM and vibes', angle: 2.0 },
        { id: 'scp', label: 'guardrails: SCPs on the OUs', angle: 1.0 },
      ],
    },
  ],
  levers: [
    { id: 'lever-blast', machine: 'lever', prompt: 'PULL — rerun the dev load test (drill)', beat: 'blast' },
  ],
  beats: [
    {
      id: 'blast', label: 'blast-radius drill', trigger: 'lever',
      rules: [
        {
          when: { socket: { 'so-org': 'orgs' } }, pass: true,
          title: '✔ Dev melted; prod never noticed',
          lines: 'dev account ...... throttled itself thoroughly\nprod account ..... separate quotas, untouched\nbilling .......... still ONE invoice, pooled discounts\nnew teams ........ new accounts (Control Tower baselines)',
          note: 'Account boundaries are the real isolation: quotas, limits, and mistakes stop at the edge. Consolidated billing keeps finance happy; Control Tower stamps out governed accounts by the dozen.',
        },
        {
          when: { socket: { 'so-org': 'moreiam' } }, pass: false,
          title: '✘ Stricter IAM, same shared quotas',
          lines: 'permissions ...... tighter ✓\nservice quotas ... still SHARED\ndev load test .... still throttled prod',
          note: 'IAM governs who may act — it can’t split the quotas, limits, and blast radius one account shares. Isolation needs ACCOUNT boundaries.',
        },
        { pass: false, title: '✘ Everything shares everything', lines: 'structure ........ one account', note: 'Socket the structure.', alarm: 'OUTAGE — SHARED-ACCOUNT BLAST RADIUS' },
      ],
    },
    {
      id: 'guardrail', label: 'guardrail test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-org': 'orgs' }, dial: { guard: 'scp' } }, pass: true,
          title: '✔ Admin tried to delete the trail: DENIED',
          lines: 'actor ............ member-account IAM ADMIN\naction ........... cloudtrail:DeleteTrail\nSCP on the OU .... denies it — for everyone\nnote ............. SCPs cap; they never grant',
          note: 'The SCP sits ABOVE the account: it defines the maximum any identity inside can do, and no member-account admin can lift it. That’s the ceiling IAM alone can’t build.',
        },
        {
          when: { socket: { 'so-org': 'orgs' } }, pass: false,
          title: '✘ The admin script would still win',
          lines: 'accounts ......... isolated ✓\nguardrails ....... none above IAM\naudit trail ...... one admin away from gone',
          note: 'Isolation without guardrails leaves every account’s admin omnipotent inside it. Swing the dial: SCPs on the OUs.',
        },
        { pass: false, title: '✘ No OU to hang a guardrail on', lines: 'structure ........ missing', note: 'Organizations first.' },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Isolated, capped, and on one invoice',
    body: 'Separate accounts under Organizations contain each team’s blast radius; SCPs on the OUs cap what even admins can do; consolidated billing pools it all onto one discounted bill — and Control Tower onboards the next dozen teams with baselines attached. Close the ticket at the field terminal.',
    journal: 'Blast-radius + guardrail passed — Organizations with SCPs.',
  },
  diagnosis: {
    unlockedBy: 'account',
    title: 'Isolation, unliftable guardrails, one bill — what structure?',
    correct: {
      label: 'Separate accounts per env/team under AWS Organizations, SCP guardrails on the OUs, consolidated billing',
      journal: 'Diagnosis confirmed: multi-account Organizations + SCPs — isolation with a ceiling above IAM.',
      confirmBody: 'Accounts are the blast walls, SCPs are the ceiling, and the Organization keeps it one bill. Bay, then dial.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Stricter IAM boundaries in the shared account', rebuttal: 'IAM can’t split shared quotas or stop an in-account admin — it’s on the pallet, and the drills will grade it.' },
      { label: 'Separate VPCs per team in the one account', rebuttal: 'VPCs fence networks; quotas, billing, IAM, and API limits stay shared. The blast radius barely shrinks.' },
      { label: 'A second account just for the audit trail', rebuttal: 'A good instinct half-applied — without Organizations and SCPs, the other regrets stay shared and ungoverned.' },
    ],
  },
  faultLamps: ['account'],
};
