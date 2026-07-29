import type { MissionSpec } from '../spec';

/** Cloud Practitioner (CLF-C02) — 8 foundational missions. Simpler sites,
 *  same grammar: probes, diagnosis, tangible fix, works-but traps, drills. */

export const CLF_ELASTIC_SPEC: MissionSpec = {
  ticket: {
    incident: 'CLF-201', reporter: 'the CFO', sev: 'SEV-3', title: 'The Black Friday Estimate',
    bodyHtml:
      `<div>The old plan: buy 40 servers so Black Friday survives, and watch 36 of them idle from December to November. The new hire asked "why do we own a datacenter for one weekend?" and nobody had an answer.</div>` +
      `<pre>peak (1 day/yr) ... 40 servers\nnormal load ....... 4 servers\nutilization ....... 11% annual average</pre>`,
    hint: 'Probe the racks and the traffic, diagnose, then dial the capacity strategy — and survive Black Friday AND the bill review.',
  },
  objectiveFix: 'Dial the capacity strategy to elastic',
  objectiveDone: 'CLF-201 closed — capacity follows demand instead of fearing it.',
  summary: 'The foundational cloud trade: capital expense for peak capacity vs variable expense for actual demand. Elasticity scales out for the spike and back in after; buying for peak parks money in idle metal, and under-buying to save falls over on the one day that pays for the year. Stop guessing capacity — rent it when the customers arrive.',
  level: [
    { id: 'racks', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2, service: 'ec2' },
    { id: 'gate', kind: 'crowdGate', at: [-8, -2], yaw: Math.PI / 2 },
    { id: 'dial', kind: 'aimPointer', at: [0, -1.8] },
    { id: 'lever', kind: 'chaosLever', at: [4, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'capacity planning', accent: '#8da3c4' },
    { kind: 'racks', at: [5, 3], n: 4 },
    { kind: 'zone', at: [5, 3], w: 4, d: 4, hex: '#1a2030', text: 'idle since january' },
    { kind: 'hazard', at: [4, -5.3], w: 3, d: 0.8 },
  ],
  faultLamps: ['racks'],
  probes: [
    {
      id: 'racks', machine: 'racks', prompt: 'Inspect the server racks',
      kicker: 'capacity', title: 'Bought for one weekend',
      pre: 'owned servers ..... 40\nbusy today ........ 4\nannual average .... 11% utilized\ndepreciating ...... always',
      journal: 'Racks: 90% of the fleet exists for one day a year — and bills for all 365.',
    },
    {
      id: 'gate', machine: 'gate', prompt: 'Inspect the traffic',
      kicker: 'demand', title: 'A year of quiet, one day of chaos',
      pre: 'normal ............ 4 servers worth\nBlack Friday ...... 40 servers worth\nshape ............. known spike, unknown height',
      journal: 'Traffic: demand is spiky and partly unpredictable — exactly what fixed capacity handles worst.',
    },
  ],
  diagnosis: {
    unlockedBy: 'racks',
    title: 'What should replace peak-sized ownership?',
    correct: {
      label: 'Elastic capacity: pay for 4 normally, scale to 40 for the spike, release after — variable cost follows demand',
      journal: 'Diagnosis: CapEx for peak → OpEx for actual. Elasticity is the founding cloud trade.',
      confirmBody: 'Provision for today. Auto-scale for the spike. Release when it passes. The bill finally has the same shape as the revenue.',
      actionLabel: 'To the dial →',
    },
    wrongs: [
      { label: 'Buy 60 servers — more headroom', rebuttal: 'Now 56 idle instead of 36. Scaling the guess scales the waste.' },
      { label: 'Own 4 and hope Black Friday is mild', rebuttal: 'The spike pays for the year. Falling over during it is the most expensive savings available.' },
      { label: 'Make the website slower so fewer people shop', rebuttal: 'That is technically a demand-management strategy, and also a resignation letter.' },
    ],
  },
  dials: [
    {
      id: 'cap', machine: 'dial', initial: 'ownpeak',
      grabPrompt: '◀ ▶ swing the strategy · E/Ⓧ lock',
      positions: [
        { id: 'ownpeak', label: 'Own 40 for peak (status quo)', angle: -0.7 },
        { id: 'elastic', label: 'Elastic: baseline 4, auto-scale to demand', angle: 0 },
        { id: 'ownmin', label: 'Own 4, hope for the best', angle: 0.7 },
      ],
    },
  ],
  levers: [{ id: 'lever-bf', machine: 'lever', prompt: 'PULL — Black Friday (drill)', beat: 'friday' }],
  beats: [
    {
      id: 'friday', label: 'Black Friday drill', trigger: 'lever',
      rules: [
        { when: { dial: { cap: 'elastic' } }, pass: true,
          title: '✔ scaled 4 → 42 → 5', lines: 'peak served ....... 100%\ncapacity after .... released\nhuman actions ..... 0', note: 'The fleet grew with the queue and shrank with it. Nobody guessed; nobody paid for ghosts.' },
        { when: { dial: { cap: 'ownmin' } }, pass: false,
          title: '✘ down at 09:14', lines: 'demand ............ 40 servers worth\ncapacity .......... 4\ncarts lost ........ the year\'s margin', alarm: 'SITE DOWN ON PEAK DAY', note: 'Under-provisioning saves money right up until the day that mattered. The spike IS the business.' },
        { pass: false, title: '✔ survived — at full price',
          lines: 'peak served ....... 100%\nidle rest of year . 36 servers', note: 'It works — that was never the question. Check the bill review for what it costs to work this way.' },
      ],
    },
    {
      id: 'bill', label: 'bill review', trigger: 'terminal',
      rules: [
        { when: { dial: { cap: 'elastic' } }, pass: true,
          title: '✔ the bill follows the traffic', lines: 'normal week ....... 4 servers billed\nspike day ......... 42 billed, then gone\nannual ............ −71% vs owning peak', note: 'Variable expense: capacity appears on the bill only when customers appear on the site.' },
        { when: { dial: { cap: 'ownmin' } }, pass: false,
          title: '✘ cheap until the outage invoice', lines: 'hardware .......... low\nlost peak revenue . catastrophic', note: 'The savings evaporate the moment demand exceeds the guess.' },
        { pass: false, title: '✘ 36 idle servers on the books',
          lines: 'utilization ....... 11%\ndepreciation ...... relentless', note: 'Peak ownership: paying every day for one day. Swing the dial.' },
      ],
    },
  ],
  verifyDone: {
    title: 'Capacity as a utility',
    body: 'Black Friday scaled itself out and back; the bill review shows cost tracking demand at −71% versus peak ownership.',
    journal: 'Verified: elasticity — provision for today, scale for the spike.',
  },
};

export const CLF_AZ_SPEC: MissionSpec = {
  ticket: {
    incident: 'CLF-202', reporter: 'ops', sev: 'SEV-2', title: 'The One-Building Empire',
    bodyHtml:
      `<div>Everything — both app servers, the database, the pride of the company — runs in Availability Zone A. Last night AZ-A had "a networking event" for 40 minutes, and so did the entire business.</div>` +
      `<pre>zone A ............ everything\nzone B ............ empty, same Region, milliseconds away\nlast night ........ 40 minutes of nothing</pre>`,
    hint: 'Probe the halls, diagnose, then carry a server into AZ-B and pull the zone-failure drill.',
  },
  objectiveFix: 'Seat a second server in the AZ-B hall',
  objectiveDone: 'CLF-202 closed — the business now spans two isolated buildings.',
  summary: 'Regions are places; Availability Zones are the isolated failure units inside them — separate power, cooling, networking, close enough for fast replication. One AZ holding everything means one bad night takes the business down. Spreading across two AZs turns a zone failure into a non-event. A bigger server in the SAME zone shares the same fate; a second Region is next semester\'s lesson — start with two AZs.',
  level: [
    { id: 'azA', kind: 'azPlate', at: [-4.5, 1.5], args: [7, 7, 'A'] },
    { id: 'azB', kind: 'azPlate', at: [4.5, 1.5], args: [7, 7, 'B'] },
    { id: 'web1', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2 },
    { id: 'lever', kind: 'chaosLever', at: [0, -4.5] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [-4.5, 7], text: 'availability zone a', accent: '#5a8fd1' },
    { kind: 'sign', at: [4.5, 7], text: 'availability zone b', accent: '#5a8fd1' },
    { kind: 'hazard', at: [0, -5.6], w: 3, d: 0.8 },
  ],
  faultLamps: ['web1'],
  probes: [
    {
      id: 'web1', machine: 'web1', prompt: 'Inspect the servers',
      kicker: 'placement', title: 'All eggs, one building',
      pre: 'app servers ....... 2, both AZ-A\ndatabase .......... AZ-A\nblast radius ...... one zone = everything',
      journal: 'Servers: redundant COPIES, identical FATE — two servers in one zone fail as one.',
    },
    {
      id: 'azB', machine: 'azB', prompt: 'Inspect zone B',
      kicker: 'the empty hall', title: 'Isolation, unused',
      pre: 'power ............. independent of A\nnetwork ........... independent of A\ndistance .......... ms away\ncontents .......... nothing',
      journal: 'Zone B: an isolated building with its own power and network, milliseconds away — and empty.',
    },
  ],
  diagnosis: {
    unlockedBy: 'web1',
    title: 'What actually protects against last night?',
    correct: {
      label: 'Run in TWO Availability Zones — isolated buildings that don\'t share failures',
      journal: 'Diagnosis: single-AZ concentration. Multi-AZ is the unit of surviving a bad night.',
      confirmBody: 'Carry a server into zone B. When A has its next event, B keeps serving — the outage becomes a graph, not a headline.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Buy a much better server in AZ-A', rebuttal: 'Quality doesn\'t change geography. The finest server in a failing zone fails finely.' },
      { label: 'Go straight to another Region on another continent', rebuttal: 'Multi-Region is real (and complex — data sync, DNS failover). The proportionate first step for zone failures is the zone next door.' },
      { label: 'Ask AWS to promise AZ-A never fails again', rebuttal: 'AZs are ENGINEERED assuming things fail — that\'s why there are several. The design expects you to use two.' },
    ],
  },
  pallet: {
    at: [0, -2.5],
    modules: [
      { id: 'mod-web2', kind: 'web2', label: 'App server #2 (for zone B)', spot: [-0.6, -2.1], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-bigger', kind: 'bigger', label: 'A much bigger server (for zone A)', spot: [0.6, -2.1], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.34 } },
    ],
  },
  sockets: [
    {
      id: 'so-azb', label: 'zone-B server bay', at: [4.5, 1.5],
      blurb: 'A rack slot in the OTHER building — the whole point is the word "other".',
      allow: { web2: true },
      refuse: {
        bigger: { reason: 'Bigger is still in zone A\'s blast radius — this bay exists to hold capacity somewhere ELSE.' },
      },
      fallback: { reason: 'The zone-B bay takes a server.' },
    },
  ],
  levers: [{ id: 'lever-az', machine: 'lever', prompt: 'PULL — fail zone A (drill)', beat: 'zonefail' }],
  beats: [
    {
      id: 'zonefail', label: 'zone-failure drill', trigger: 'lever',
      mutate: ['azDead:azA'],
      rules: [
        { when: { socket: { 'so-azb': 'web2' } }, pass: true,
          title: '✔ zone A dark, site up', lines: 'AZ-A .............. failed (drill)\nAZ-B server ....... serving 100%\ncustomers noticed . nothing', note: 'Independent buildings: A\'s bad night stayed A\'s problem.' },
        { pass: false, title: '✘ 40 minutes of nothing, again', alarm: 'TOTAL OUTAGE',
          lines: 'AZ-A .............. failed (drill)\neverything else ... was in AZ-A', note: 'One zone still holds everything. Seat a server in the B hall.' },
      ],
    },
    {
      id: 'steady', label: 'steady-state check', trigger: 'terminal',
      rules: [
        { when: { socket: { 'so-azb': 'web2' } }, pass: true,
          title: '✔ both zones serving', lines: 'AZ-A .............. healthy\nAZ-B .............. healthy\nlatency between ... ~1ms', note: 'Two zones is the everyday configuration, not a disaster mode — same Region, same speed, separate fates.' },
        { pass: false, title: '✘ zone B still empty',
          lines: 'placement ......... single-AZ', note: 'The empty hall protects nobody.' },
      ],
    },
  ],
  verifyDone: {
    title: 'Two buildings, one business',
    body: 'The zone-A drill left customers unaware, and steady state shows both halls serving a millisecond apart.',
    journal: 'Verified: multi-AZ placement survives a zone failure.',
  },
};

export const CLF_SHARED_SPEC: MissionSpec = {
  ticket: {
    incident: 'CLF-203', reporter: 'compliance', sev: 'SEV-2', title: 'Whose Job Is It?',
    bodyHtml:
      `<div>The audit found a public S3 bucket, an unpatched web server — and a furious email demanding AWS "fix their security". Meanwhile someone filed a ticket asking when WE plan to patch the hypervisors. Nobody here can draw the responsibility line.</div>` +
      `<pre>public bucket ..... "AWS's fault" (it is not)\nguest OS patches .. "AWS handles it" (they do not)\nhypervisor ........ someone opened a ticket to patch it (?!)</pre>`,
    hint: 'Probe the audit and the duty cards, then sort every duty onto the correct rack: AWS side or YOUR side.',
  },
  objectiveFix: 'Sort all four duties onto the correct responsibility racks',
  objectiveDone: 'CLF-203 closed — the line is drawn where it always was.',
  summary: 'The Shared Responsibility Model: AWS secures the cloud ITSELF (facilities, hardware, hypervisor — you literally cannot patch it), while you secure what you put IN it (data, identities, guest OS, bucket policies). Managed services move the line in your favor, but data and access configuration never stop being yours. The public bucket was always your side; the hypervisor was never it.',
  level: [
    { id: 'awsrack', kind: 'shelfUnit', at: [-5, 1.5], yaw: Math.PI / 2, args: ['#e8a03c'], service: 'none' },
    { id: 'yourack', kind: 'shelfUnit', at: [5, 1.5], yaw: -Math.PI / 2, args: ['#57c7e3'], service: 'none' },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [-5, 7], text: 'aws secures OF the cloud', accent: '#e8a03c' },
    { kind: 'sign', at: [5, 7], text: 'you secure IN the cloud', accent: '#57c7e3' },
    { kind: 'zone', at: [0, 1.5], w: 2.5, d: 7, hex: '#1a2030', text: 'the line' },
    { kind: 'light', at: [8.5, -5], yaw: -Math.PI / 2 },
  ],
  probes: [
    {
      id: 'awsrack', machine: 'awsrack', prompt: 'Inspect the AWS-side rack',
      kicker: 'shared responsibility', title: 'Security OF the cloud',
      pre: 'AWS owns .......... buildings, hardware,\n                    hypervisor, managed-service guts\nyou cannot ........ even see these layers',
      journal: 'AWS side: the physical and virtualization layers. You could not patch a hypervisor if you wanted to.',
    },
    {
      id: 'yourack', machine: 'yourack', prompt: 'Inspect the customer-side rack',
      kicker: 'shared responsibility', title: 'Security IN the cloud',
      pre: 'you own ........... data, IAM, guest OS,\n                    bucket policies, app code\nAWS will not ...... configure these for you',
      journal: 'Your side: everything you configure and store. The controls exist; wielding them is the job.',
    },
  ],
  diagnosis: {
    unlockedBy: 'yourack',
    title: 'Where does the responsibility line actually sit?',
    correct: {
      label: 'AWS: the infrastructure itself. You: everything you configure and put in it — data, identities, guest OS, policies',
      journal: 'Diagnosis: OF the cloud = AWS; IN the cloud = you. Now sort the duties.',
      confirmBody: 'Four duty cards are on the pallet. Rack each one where it belongs — the audit re-runs when the sorting is done.',
      actionLabel: 'To the duty cards →',
    },
    wrongs: [
      { label: 'Everything is AWS\'s responsibility — that\'s why we pay them', rebuttal: 'Then any customer could make any bucket public and blame the landlord. Your data and your configs are contractually, explicitly yours.' },
      { label: 'Everything is our responsibility — trust no one', rebuttal: 'You cannot badge into an AWS datacenter or patch its hypervisors. The model exists because parts of the stack are genuinely out of your hands.' },
      { label: 'It depends on the support plan', rebuttal: 'Support plans buy response time, not responsibility transfer. The line is the same on Basic and Enterprise.' },
    ],
  },
  pallet: {
    at: [0, -4.5],
    modules: [
      { id: 'mod-hyp', kind: 'hypervisor', label: 'Duty: patch the hypervisor', spot: [-1.2, -4.1], visual: { hex: '#8a5a2c', glowHex: '#e8a03c', h: 0.3 } },
      { id: 'mod-phys', kind: 'physical', label: 'Duty: datacenter physical security', spot: [0, -4.1], visual: { hex: '#8a5a2c', glowHex: '#e8a03c', h: 0.3 } },
      { id: 'mod-guest', kind: 'guestos', label: 'Duty: patch the EC2 guest OS', spot: [1.2, -4.1], visual: { hex: '#2c5a7a', glowHex: '#57c7e3', h: 0.3 } },
      { id: 'mod-bucket', kind: 'bucketpol', label: 'Duty: S3 bucket policy & data', spot: [0, -5.2], visual: { hex: '#2c5a7a', glowHex: '#57c7e3', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'aws1', label: 'AWS rack · slot 1', at: [-5, 3.6],
      blurb: 'Duties on the far side of the line: layers customers can\'t even see.',
      allow: { hypervisor: true, physical: true },
      refuse: {
        guestos: { reason: 'AWS stops at the hypervisor. What runs INSIDE your instance is yours to patch.' },
        bucketpol: { reason: 'Your bucket, your policy, your data. AWS provides the switch — you set it.' },
      },
      fallback: { reason: 'This rack holds AWS-side duties.' },
    },
    {
      id: 'aws2', label: 'AWS rack · slot 2', at: [-5, -0.6],
      blurb: 'Second AWS-side duty slot.',
      allow: { hypervisor: true, physical: true },
      refuse: {
        guestos: { reason: 'Guest OS = IN the cloud = you.' },
        bucketpol: { reason: 'Data configuration never crosses the line.' },
      },
      fallback: { reason: 'This rack holds AWS-side duties.' },
    },
    {
      id: 'you1', label: 'your rack · slot 1', at: [5, 3.6],
      blurb: 'Duties on your side of the line: what you configure and store.',
      allow: { guestos: true, bucketpol: true },
      refuse: {
        hypervisor: { reason: 'You have never seen this hypervisor and never will. It\'s AWS\'s to patch.' },
        physical: { reason: 'Unless you plan to stand guard in Virginia, physical security is the landlord\'s.' },
      },
      fallback: { reason: 'This rack holds customer-side duties.' },
    },
    {
      id: 'you2', label: 'your rack · slot 2', at: [5, -0.6],
      blurb: 'Second customer-side duty slot.',
      allow: { guestos: true, bucketpol: true },
      refuse: {
        hypervisor: { reason: 'OF the cloud — not yours.' },
        physical: { reason: 'OF the cloud — not yours.' },
      },
      fallback: { reason: 'This rack holds customer-side duties.' },
    },
  ],
  beats: [
    {
      id: 'audit', label: 'responsibility audit', trigger: 'terminal',
      rules: [
        { when: { socket: { aws1: 'any', aws2: 'any', you1: 'any', you2: 'any' } }, pass: true,
          title: '✔ the line is drawn', lines: 'AWS side ......... hypervisor, physical\nyour side ........ guest OS, bucket policy\nmisfiled ......... 0', note: 'The sockets refused every misfile — that friction IS the lesson. OF the cloud vs IN the cloud.' },
        { pass: false, title: '✘ duties still unassigned',
          lines: 'racked ........... incomplete', note: 'Sort all four duty cards; the racks will refuse anything on the wrong side of the line.' },
      ],
    },
    {
      id: 'retest', label: 'the two tickets, re-read', trigger: 'terminal',
      rules: [
        { when: { socket: { aws1: 'any', aws2: 'any', you1: 'any', you2: 'any' } }, pass: true,
          title: '✔ tickets reassigned correctly', lines: 'public bucket ..... OUR ticket (config)\n"patch hypervisor". closed (not ours, ever)\nguest OS CVEs ..... OUR patch pipeline', note: 'The audit findings were always customer-side. The hypervisor ticket gets a kind explanation and a close.' },
        { pass: false, title: '✘ still arguing with the landlord',
          lines: 'sorting ........... incomplete', note: 'Finish racking the duties first.' },
      ],
    },
  ],
  verifyDone: {
    title: 'OF vs IN, permanently',
    body: 'All four duties racked on the correct side, audit clean, and both confused tickets resolved to their rightful owners.',
    journal: 'Verified: shared responsibility sorted — AWS secures the cloud, we secure what\'s in it.',
  },
};

export const CLF_ROOT_SPEC: MissionSpec = {
  ticket: {
    incident: 'CLF-204', reporter: 'new CTO', sev: 'SEV-1', title: 'Everyone Is Root',
    bodyHtml:
      `<div>The company AWS account is three years old. Everyone logs in as root — the password is in the team chat, pinned. There are root access keys in two build scripts. The new CTO went pale and filed this ticket from the parking lot.</div>` +
      `<pre>root password ..... pinned in chat, no MFA\nroot access keys .. 2, in build scripts\nIAM users ......... zero</pre>`,
    hint: 'Probe the account, diagnose, then lock root away: MFA in the locker, an IAM admin for daily work. Root keys go nowhere.',
  },
  objectiveFix: 'Seat MFA on root · seat an IAM admin identity for daily work',
  objectiveDone: 'CLF-204 closed — root sleeps in a safe; day-to-day runs on scoped identities.',
  summary: 'The root user can do anything — including close the account — and bypasses every policy. Day one hygiene: MFA on root, then stop using it; create IAM identities (with least privilege) for humans and roles for machines; and NEVER mint root access keys — an unscopeable, unexpirable skeleton key. Sharing root "for convenience" makes every mistake and every leak account-fatal.',
  level: [
    { id: 'rootbox', kind: 'badgeDoor', at: [-4.5, 1.5], yaw: Math.PI / 2, args: ['#e85f5f'], service: 'iam' },
    { id: 'deskrow', kind: 'serverRack', at: [4.5, 1.5], yaw: -Math.PI / 2, service: 'none' },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'account security', accent: '#d15656' },
    { kind: 'zone', at: [-4.5, 1.5], w: 3.4, d: 3.4, hex: '#331a1a', text: 'root locker' },
    { kind: 'zone', at: [4.5, 1.5], w: 3.4, d: 3.4, hex: '#16233a', text: 'daily work' },
    { kind: 'hazard', at: [-4.5, -0.8], w: 3.4, d: 0.8 },
  ],
  faultLamps: ['rootbox'],
  probes: [
    {
      id: 'rootbox', machine: 'rootbox', prompt: 'Inspect the root account',
      kicker: 'root user', title: 'The skeleton key, shared',
      pre: 'MFA ............... none\npassword .......... pinned in chat\naccess keys ....... 2 (build scripts!)\ncan ............... everything, incl. close account',
      journal: 'Root: no MFA, shared password, API keys in scripts. Any mistake or leak is account-fatal.',
    },
    {
      id: 'deskrow', machine: 'deskrow', prompt: 'Inspect daily work',
      kicker: 'the team', title: 'Everyone is the same superuser',
      pre: 'identities ........ 1 (root), shared by 9 people\naudit trail ....... "root did it" ×9\nleast privilege ... undefined',
      journal: 'Daily work: nine humans, one identity, zero accountability. IAM exists precisely for this.',
    },
  ],
  diagnosis: {
    unlockedBy: 'rootbox',
    title: 'What does day-one account hygiene look like?',
    correct: {
      label: 'MFA on root, then lock it away; scoped IAM identities for daily work; delete root access keys',
      journal: 'Diagnosis: root is for ~5 account tasks a year. Everything else is IAM.',
      confirmBody: 'Seat the MFA token in the root locker and an IAM admin identity at the daily desk. The root keys don\'t get a socket — they get deleted.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'A stronger root password, shared more carefully', rebuttal: 'A shared secret is a leak on a timer, and one factor is one factor. MFA + not using root beats any password policy.' },
      { label: 'Rotate the root access keys monthly', rebuttal: 'Root keys can\'t be scoped down and shouldn\'t exist AT ALL. The rotation schedule for a skeleton key is: delete it.' },
      { label: 'Only the CTO logs in as root now', rebuttal: 'Better, but the CTO\'s daily typo still runs with account-ending power. Even admins use scoped IAM identities day to day.' },
    ],
  },
  pallet: {
    at: [0, -4.5],
    modules: [
      { id: 'mod-mfa', kind: 'mfa', label: 'MFA token for root', spot: [-1.2, -4.1], visual: { hex: '#7a2e35', glowHex: '#e87a7a' } },
      { id: 'mod-iam', kind: 'iamadmin', label: 'IAM admin identity (daily work)', spot: [0, -4.1], visual: { hex: '#2c5a7a', glowHex: '#57c7e3' } },
      { id: 'mod-rootkeys', kind: 'rootkeys', label: 'Fresh root access keys', spot: [1.2, -4.1], visual: { hex: '#7a3a3a', glowHex: '#e85f5f', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-locker', label: 'root locker', at: [-4.5, 3.8],
      blurb: 'Root\'s new home: MFA-protected, used a few times a year, watched.',
      allow: { mfa: true },
      refuse: {
        rootkeys: { reason: 'Root API keys are the skeleton key in a text file. They don\'t get stored — they get deleted.', alarm: 'ROOT KEYS MINTED' },
        iamadmin: { reason: 'IAM identities live at the daily desk. The locker is for locking root DOWN.' },
      },
      fallback: { reason: 'The locker takes root protection.' },
    },
    {
      id: 'so-desk', label: 'daily-work desk', at: [4.5, 3.8],
      blurb: 'What the team actually uses every day.',
      allow: { iamadmin: { requiresSocket: 'so-locker', requiresKind: 'mfa', elseReason: 'Lock root down FIRST — otherwise the shared superuser stays in daily rotation.' } },
      refuse: {
        rootkeys: { reason: 'Build scripts get IAM roles, never root keys.', alarm: 'ROOT KEYS MINTED' },
        mfa: { reason: 'That token guards the locker. The desk needs an identity.' },
      },
      fallback: { reason: 'The desk takes a daily identity.' },
    },
  ],
  beats: [
    {
      id: 'review', label: 'security review', trigger: 'terminal',
      rules: [
        { when: { socket: { 'so-locker': 'mfa', 'so-desk': 'iamadmin' } }, pass: true,
          title: '✔ root asleep, IAM awake', lines: 'root ............. MFA, unused 30 days\nroot keys ........ deleted\ndaily work ....... named IAM identities\naudit trail ...... humans distinguishable', note: 'The account now fails safe: root is a break-glass, not a habit.' },
        { pass: false, title: '✘ still one shared superuser',
          lines: 'hygiene .......... incomplete', note: 'MFA in the locker, IAM at the desk — in that order.' },
      ],
    },
    {
      id: 'phish', label: 'phishing drill', trigger: 'terminal',
      rules: [
        { when: { socket: { 'so-locker': 'mfa', 'so-desk': 'iamadmin' } }, pass: true,
          title: '✔ stolen password, useless', lines: 'phished .......... root password\nMFA challenge .... blocked login\nblast radius ..... none', note: 'One stolen factor no longer ends the company. That\'s the entire point of the second one.' },
        { pass: false, title: '✘ password = account', alarm: 'ACCOUNT TAKEOVER',
          lines: 'phished .......... root password\nMFA .............. none\nresult ........... everything', note: 'Without MFA the pinned password IS the account. Lock it down.' },
      ],
    },
  ],
  verifyDone: {
    title: 'Root, retired',
    body: 'Security review clean — MFA\'d root unused for 30 days, named IAM identities daily — and the phishing drill bounced off the second factor.',
    journal: 'Verified: root locked with MFA; daily work on scoped IAM identities.',
  },
};

export const CLF_SERVICES_SPEC: MissionSpec = {
  ticket: {
    incident: 'CLF-205', reporter: 'founder', sev: 'SEV-3', title: 'Four Boxes, Four Homes',
    bodyHtml:
      `<div>The launch plan says "put it all on one big server, like at university". The workload list disagrees: product images, a web app, an orders database, and a thumbnail job that runs for 200 milliseconds whenever a photo lands.</div>` +
      `<pre>images ............ millions, fetched by name\nweb app ........... steady traffic, needs an OS\norders ............ relational, transactional\nthumbnails ........ 200ms bursts, event-driven</pre>`,
    hint: 'Probe the workload wall, diagnose, then seat each workload card at the right service station. The stations refuse bad matches — read why.',
  },
  objectiveFix: 'Match all four workloads to their services',
  objectiveDone: 'CLF-205 closed — every workload in the home built for it.',
  summary: 'The core service map: S3 for objects fetched by name (durable, serverless, HTTP-native); EC2 for apps that need a whole OS; RDS for relational transactions with management included; Lambda for short event-driven bursts with zero servers. The one-big-server plan works until the first spike, the first disk failure, and the first 3 a.m. — the cloud\'s primitives exist so each job gets the tool shaped like it.',
  level: [
    { id: 's3st', kind: 'shelfUnit', at: [-6.5, 2], yaw: Math.PI / 2, args: ['#e8a657'], service: 's3' },
    { id: 'ec2st', kind: 'serverRack', at: [-2.2, 2], yaw: Math.PI / 2, service: 'ec2' },
    { id: 'rdsst', kind: 'dbTower', at: [2.2, 2], service: 'rds' },
    { id: 'lst', kind: 'shelfUnit', at: [6.5, 2], yaw: -Math.PI / 2, args: ['#ED7100'], service: 'lambda' },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'service stations', accent: '#33b38c' },
    { kind: 'zone', at: [0, -4.5], w: 6, d: 3, hex: '#1a2030', text: 'workload staging' },
    { kind: 'light', at: [8.5, -5], yaw: -Math.PI / 2 },
  ],
  probes: [
    {
      id: 's3st', machine: 's3st', prompt: 'Inspect the object store station',
      kicker: 'Amazon S3', title: 'Things, by name, forever',
      pre: 'stores ............ objects by key, any size\ndurability ........ 11 nines\nservers to run .... zero',
      journal: 'S3: objects by name over HTTP, absurdly durable, no servers. Images live here.',
    },
    {
      id: 'lst', machine: 'lst', prompt: 'Inspect the function station',
      kicker: 'AWS Lambda', title: 'Code without a home to clean',
      pre: 'runs .............. code on events\nbilled ............ per ms of execution\nidle cost ......... zero',
      journal: 'Lambda: event-driven bursts, billed by the millisecond, nothing to patch. Thumbnails live here.',
    },
  ],
  diagnosis: {
    unlockedBy: 's3st',
    title: 'Why not one big server for everything?',
    correct: {
      label: 'Each workload has a service shaped like it: S3 objects, EC2 apps, RDS transactions, Lambda events',
      journal: 'Diagnosis: match workload to primitive. The big server is four wrong tools in one box.',
      confirmBody: 'Carry each workload card to its station. Wrong matches get refused with the reason — that\'s the studying.',
      actionLabel: 'To the workload cards →',
    },
    wrongs: [
      { label: 'One big server is simpler', rebuttal: 'Simple until it\'s full, down, or unpatched — one box means one failure domain for four unrelated jobs.' },
      { label: 'Everything in the database', rebuttal: 'Millions of images as BLOBs in a relational database is a bill and a backup nightmare wearing a schema.' },
      { label: 'Everything as Lambda functions', rebuttal: 'The steady web app would pay per-request forever and fight cold starts; long-lived steady work is EC2\'s (or a container\'s) shape.' },
    ],
  },
  pallet: {
    at: [0, -4.5],
    modules: [
      { id: 'mod-img', kind: 'imgload', label: 'Workload: product images (objects by name)', spot: [-1.8, -4.1], visual: { hex: '#8a6a2c', glowHex: '#e8a657', h: 0.3 } },
      { id: 'mod-app', kind: 'apploadd', label: 'Workload: web app (needs an OS)', spot: [-0.6, -4.1], visual: { hex: '#8a4a1c', glowHex: '#ED7100', h: 0.3 } },
      { id: 'mod-db', kind: 'dbload', label: 'Workload: orders (relational)', spot: [0.6, -4.1], visual: { hex: '#6a2c7a', glowHex: '#C925D1', h: 0.3 } },
      { id: 'mod-thumb', kind: 'thumbload', label: 'Workload: thumbnails (200ms events)', spot: [1.8, -4.1], visual: { hex: '#2c6e4f', glowHex: '#5fd29a', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'st-s3', label: 'S3 station', at: [-6.5, 4.2],
      blurb: 'Object storage: named things over HTTP, durable to eleven nines.',
      allow: { imgload: true },
      refuse: {
        dbload: { reason: 'S3 has no transactions or joins — orders need a database, not a bucket.' },
        apploadd: { reason: 'S3 serves files; it cannot run your app process.' },
        thumbload: { reason: 'S3 stores the thumbnails; MAKING them is compute — next station over.' },
      },
      fallback: { reason: 'The S3 station takes an object workload.' },
    },
    {
      id: 'st-ec2', label: 'EC2 station', at: [-2.2, 4.2],
      blurb: 'Virtual machines: a whole OS you control, running as long as you like.',
      allow: { apploadd: true },
      refuse: {
        imgload: { reason: 'Serving millions of images off an instance disk reinvents S3, badly and expensively.' },
        thumbload: { reason: 'A 24/7 server for 200ms bursts is 99.9% idle bill. Events want Lambda.' },
        dbload: { reason: 'You COULD self-manage a DB here — see the managed-vs-DIY ticket for why RDS first.' },
      },
      fallback: { reason: 'The EC2 station takes a long-lived app.' },
    },
    {
      id: 'st-rds', label: 'RDS station', at: [2.2, 4.2],
      blurb: 'Managed relational databases: transactions, backups, failover included.',
      allow: { dbload: true },
      refuse: {
        imgload: { reason: 'BLOBs by the million belong in object storage; keep the database for relations.' },
        apploadd: { reason: 'RDS runs database engines, not your web process.' },
        thumbload: { reason: 'Image processing in the database is a party trick, not an architecture.' },
      },
      fallback: { reason: 'The RDS station takes relational data.' },
    },
    {
      id: 'st-lambda', label: 'Lambda station', at: [6.5, 4.2],
      blurb: 'Functions: event-driven code, billed by the millisecond, zero servers.',
      allow: { thumbload: true },
      refuse: {
        apploadd: { reason: 'Steady always-on traffic pays the per-request premium forever here — wrong shape.' },
        imgload: { reason: 'Lambda computes; it does not store. The images themselves go to S3.' },
        dbload: { reason: 'A database inside a 15-minute-max stateless function is a data-loss speedrun.' },
      },
      fallback: { reason: 'The Lambda station takes event-driven work.' },
    },
  ],
  beats: [
    {
      id: 'launch', label: 'launch-day test', trigger: 'terminal',
      rules: [
        { when: { socket: { 'st-s3': 'imgload', 'st-ec2': 'apploadd', 'st-rds': 'dbload', 'st-lambda': 'thumbload' } }, pass: true,
          title: '✔ four workloads, four right homes', lines: 'images ........... S3, fast + durable\napp .............. EC2, steady\norders ........... RDS, transactional\nthumbnails ....... Lambda, per-event', note: 'Each primitive doing the one thing it\'s shaped for. This is the whole map most architectures start from.' },
        { pass: false, title: '✘ workloads unhomed',
          lines: 'matched .......... incomplete', note: 'Seat all four cards; the stations will teach you the mismatches.' },
      ],
    },
    {
      id: 'bill2', label: 'first-month bill', trigger: 'terminal',
      rules: [
        { when: { socket: { 'st-s3': 'imgload', 'st-ec2': 'apploadd', 'st-rds': 'dbload', 'st-lambda': 'thumbload' } }, pass: true,
          title: '✔ each job billed in its own shape', lines: 'S3 ............... per GB stored\nEC2 .............. per hour running\nRDS .............. per hour, managed\nLambda ........... per ms, ~$0 idle', note: 'Right-shaped services bill in right-shaped units — the thumbnail job costs nothing between photos.' },
        { pass: false, title: '✘ nothing to bill yet',
          lines: 'workloads ........ unplaced', note: 'Finish the matching first.' },
      ],
    },
  ],
  verifyDone: {
    title: 'The map, learned by hand',
    body: 'Launch-day test green with all four workloads in their right homes, and the bill arrives shaped like the usage.',
    journal: 'Verified: S3/EC2/RDS/Lambda matched to their workloads.',
  },
};

export const CLF_MANAGED_SPEC: MissionSpec = {
  ticket: {
    incident: 'CLF-206', reporter: 'the only DBA', sev: 'SEV-2', title: 'The 3 A.M. Database',
    bodyHtml:
      `<div>The database runs on an EC2 instance lovingly hand-managed by one person, who does patches, backups, and failover "when needed" — and who just booked three weeks of vacation somewhere without phone signal.</div>` +
      `<pre>database .......... MySQL on EC2, hand-run\nbackups ........... "usually"\nfailover .......... the DBA, personally\nvacation .......... imminent</pre>`,
    hint: 'Probe the box and the toil list, diagnose, then dial to managed — and pull the 3 a.m. drill while the DBA is away.',
  },
  objectiveFix: 'Dial the database to managed (RDS)',
  objectiveDone: 'CLF-206 closed — the undifferentiated heavy lifting is AWS\'s pager now.',
  summary: 'Managed vs DIY: RDS runs the same engine but AWS carries patching, backups, and failover — the "undifferentiated heavy lifting" every company does identically. The trade is less low-level control (no OS root) for dramatically less toil and no single human as the availability plan. DIY on EC2 is legitimate when you need OS-level control; it is not legitimate as a way to depend on one person\'s sleep schedule.',
  level: [
    { id: 'petdb', kind: 'dbTower', at: [-4.5, 1.5], service: 'none' },
    { id: 'toil', kind: 'shelfUnit', at: [4.5, 1.5], yaw: -Math.PI / 2, args: ['#8a7a22'], service: 'none' },
    { id: 'dial', kind: 'aimPointer', at: [0, -1.8] },
    { id: 'lever', kind: 'chaosLever', at: [4, -4.5] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'toil accounting', accent: '#33b38c' },
    { kind: 'zone', at: [4.5, 1.5], w: 3.2, d: 3.2, hex: '#33260f', text: 'the toil shelf' },
    { kind: 'hazard', at: [4, -5.6], w: 3, d: 0.8 },
  ],
  faultLamps: ['petdb'],
  probes: [
    {
      id: 'petdb', machine: 'petdb', prompt: 'Inspect the database box',
      kicker: 'MySQL on EC2', title: 'A pet with a pager',
      pre: 'engine ............ MySQL (fine!)\npatching .......... manual, drifting\nbackups ........... cron, unverified\nfailover .......... one human, asleep',
      journal: 'The box: the ENGINE is fine — the OPERATIONS around it are one person deep.',
    },
    {
      id: 'toil', machine: 'toil', prompt: 'Inspect the toil shelf',
      kicker: 'ops ledger', title: 'Identical everywhere on Earth',
      pre: 'patch cycles ...... same as every company\nbackup scripts .... same as every company\nfailover dance .... same as every company\ndifferentiation ... zero',
      journal: 'Toil: nothing here is special to this business. Identical work is exactly what managed services absorb.',
    },
  ],
  diagnosis: {
    unlockedBy: 'petdb',
    title: 'What should carry the database operations?',
    correct: {
      label: 'A managed service (RDS): same engine, but patching/backups/failover are AWS\'s job — toil crosses the responsibility line',
      journal: 'Diagnosis: outsource the undifferentiated heavy lifting; keep the schema and queries.',
      confirmBody: 'Dial to RDS. The DBA keeps the interesting work (schema, performance, data) and loses the 3 a.m. — which now belongs to an automated standby.',
      actionLabel: 'To the dial →',
    },
    wrongs: [
      { label: 'Hire a second DBA for coverage', rebuttal: 'Two humans doing identical undifferentiated work is doubling down on the toil instead of shedding it.' },
      { label: 'Write better runbooks for the vacation', rebuttal: 'Runbooks help — and still require a human awake to run them. Managed failover doesn\'t read documents.' },
      { label: 'The cloud means we must manage it ourselves', rebuttal: 'Backwards: IaaS is the DIY floor, managed services are the point. You CAN run MySQL by hand; the question is why.' },
    ],
  },
  dials: [
    {
      id: 'dbmode', machine: 'dial', initial: 'diy',
      grabPrompt: '◀ ▶ swing the ops model · E/Ⓧ lock',
      positions: [
        { id: 'diy', label: 'Self-managed on EC2 (status quo)', angle: -0.7 },
        { id: 'managed', label: 'RDS managed (Multi-AZ, auto backups)', angle: 0 },
        { id: 'nodb', label: '"Just use spreadsheets in S3"', angle: 0.7 },
      ],
    },
  ],
  levers: [{ id: 'lever-3am', machine: 'lever', prompt: 'PULL — 3 a.m. failure, DBA unreachable', beat: 'night' }],
  beats: [
    {
      id: 'night', label: '3 a.m. drill', trigger: 'lever',
      rules: [
        { when: { dial: { dbmode: 'managed' } }, pass: true,
          title: '✔ failover at 3:02, humans asleep', lines: 'primary ........... failed (drill)\nstandby ........... promoted, 90s\npages sent ........ 0\nDBA\'s vacation .... intact', note: 'Managed failover is a mechanism, not a person. The toil crossed the line and took the pager with it.' },
        { when: { dial: { dbmode: 'nodb' } }, pass: false,
          title: '✘ the spreadsheet has opinions', lines: 'transactions ...... none\nconcurrent edits .. corrupted\norders ............ creatively numbered', note: 'Object storage is wonderful and is not a transactional database. Relational problems want relational tools.' },
        { pass: false, title: '✘ ringing a phone in the wilderness', alarm: 'DATABASE DOWN',
          lines: 'primary ........... failed (drill)\nfailover .......... requires the DBA\nDBA ............... no signal', note: 'The availability plan is on vacation. Swing the dial.' },
      ],
    },
    {
      id: 'toilcheck', label: 'toil review', trigger: 'terminal',
      rules: [
        { when: { dial: { dbmode: 'managed' } }, pass: true,
          title: '✔ toil ledger, emptied', lines: 'patching .......... AWS\nbackups ........... automatic, tested restore\nfailover .......... automatic\nDBA now does ...... schema, tuning, actual value', note: 'The human keeps the differentiated work. The identical work became a line item.' },
        { pass: false, title: '✘ toil still human-shaped',
          lines: 'ops model ......... unchanged', note: 'The ledger empties when the dial moves.' },
      ],
    },
  ],
  verifyDone: {
    title: 'The pager crossed the line',
    body: 'The 3 a.m. drill failed over in 90 seconds with zero pages, and the toil review shows the DBA doing schema work instead of surgery.',
    journal: 'Verified: managed RDS absorbed patching, backups, and failover.',
  },
};

export const CLF_PRICING_SPEC: MissionSpec = {
  ticket: {
    incident: 'CLF-207', reporter: 'finops', sev: 'SEV-3', title: 'One Price Fits Nobody',
    bodyHtml:
      `<div>Everything in the account runs On-Demand: the API that hasn't changed shape in a year, the overnight batch that could restart anytime, and a dev sandbox nobody used since March. Three very different workloads, one very expensive pricing model.</div>` +
      `<pre>steady API ........ 24/7 for 14 months, On-Demand\nbatch ............. interruptible, On-Demand\ndev sandbox ....... idle, On-Demand, forgotten</pre>`,
    hint: 'Probe the workloads, diagnose, then seat the right pricing card at each bay — the bays refuse mismatches with the reason.',
  },
  objectiveFix: 'Match pricing models to all three workloads',
  objectiveDone: 'CLF-207 closed — every workload pays in its own shape.',
  summary: 'Pricing models are workload-shaped: Savings Plans/Reserved for the steady baseline you KNOW (up to ~72% off), Spot for interruptible work (deepest discount, reclaimable), On-Demand for the genuinely unpredictable — and OFF for the forgotten. Committing to a guess wastes money; running batch at the flexibility premium wastes more; the idle sandbox wastes purely.',
  level: [
    { id: 'api', kind: 'serverRack', at: [-6, 1.5], yaw: Math.PI / 2, service: 'ec2' },
    { id: 'batch', kind: 'serverRack', at: [0, 1.5], yaw: 0, service: 'ec2' },
    { id: 'sandbox', kind: 'serverRack', at: [6, 1.5], yaw: -Math.PI / 2, service: 'none' },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'pricing desk', accent: '#67ad5b' },
    { kind: 'zone', at: [-6, 1.5], w: 3, d: 3, hex: '#142e1a', text: 'steady api' },
    { kind: 'zone', at: [0, 1.5], w: 3, d: 3, hex: '#1a2030', text: 'batch' },
    { kind: 'zone', at: [6, 1.5], w: 3, d: 3, hex: '#33260f', text: 'sandbox (idle)' },
  ],
  probes: [
    {
      id: 'api', machine: 'api', prompt: 'Inspect the steady API',
      kicker: 'workload shape', title: 'Fourteen flat months',
      pre: 'baseline .......... flat 24/7, 14 months\nsurprises ......... none\npaying ............ On-Demand premium for certainty it has',
      journal: 'API: a known, steady baseline paying the uncertainty premium. Commitment discounts exist for exactly this.',
    },
    {
      id: 'batch', machine: 'batch', prompt: 'Inspect the batch job',
      kicker: 'workload shape', title: 'Nothing here minds dying',
      pre: 'runs .............. overnight, checkpointed\ninterruption ...... resumes cleanly\ndeadline .......... "by morning"',
      journal: 'Batch: checkpointed and interruptible — the exact shape Spot instances discount most deeply.',
    },
  ],
  diagnosis: {
    unlockedBy: 'api',
    title: 'How should these three pay?',
    correct: {
      label: 'Commit the steady baseline (Savings Plan), Spot the interruptible batch, and turn the idle sandbox OFF',
      journal: 'Diagnosis: pricing follows workload shape — commit the known, Spot the killable, stop the idle.',
      confirmBody: 'Three pricing cards, three bays. The bays refuse mismatches with the reason — that\'s the exam question, physically.',
      actionLabel: 'To the pricing cards →',
    },
    wrongs: [
      { label: 'Reserve everything for 3 years — max discount', rebuttal: 'Committing to the batch\'s worst hour and a dead sandbox is prepaying for ghosts. Commit only the baseline you\'re sure of.' },
      { label: 'Spot everything — max discount, again', rebuttal: 'Spot reclaims capacity on short notice. The steady API would flap in and out of existence at 2-minute warnings.' },
      { label: 'Negotiate a personal discount with AWS sales', rebuttal: 'Enterprise agreements exist — AFTER the models are right. No negotiation beats turning off an idle sandbox.' },
    ],
  },
  pallet: {
    at: [0, -4.5],
    modules: [
      { id: 'mod-sp', kind: 'savings', label: 'Savings Plan commitment (baseline)', spot: [-1.2, -4.1], visual: { hex: '#2c5a2c', glowHex: '#67ad5b', h: 0.3 } },
      { id: 'mod-spot', kind: 'spotcard', label: 'Spot capacity (interruptible)', spot: [0, -4.1], visual: { hex: '#2c5a7a', glowHex: '#57c7e3', h: 0.3 } },
      { id: 'mod-off', kind: 'offswitch', label: 'The OFF switch (idle things)', spot: [1.2, -4.1], visual: { hex: '#4a4a52', glowHex: '#9aa3b2', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'bay-api', label: 'steady-API bay', at: [-6, 3.8],
      blurb: 'Fourteen months of flat, known baseline.',
      allow: { savings: true },
      refuse: {
        spotcard: { reason: 'Spot can vanish on a 2-minute warning — the steady API needs capacity that stays.' },
        offswitch: { reason: 'This one earns money. The OFF switch is for the thing that doesn\'t.' },
      },
      fallback: { reason: 'The API bay takes a pricing model.' },
    },
    {
      id: 'bay-batch', label: 'batch bay', at: [0, 3.8],
      blurb: 'Checkpointed, interruptible, deadline "by morning".',
      allow: { spotcard: true },
      refuse: {
        savings: { reason: 'Committing to sporadic burst hours means paying for the quiet ones too. Commitments fit BASELINES.' },
        offswitch: { reason: 'It does real work — just at whatever price is cheapest tonight.' },
      },
      fallback: { reason: 'The batch bay takes a pricing model.' },
    },
    {
      id: 'bay-sand', label: 'sandbox bay', at: [6, 3.8],
      blurb: 'Idle since March. Fondly remembered by no one.',
      allow: { offswitch: true },
      refuse: {
        savings: { reason: 'A three-year commitment on an idle sandbox is a donation with paperwork.' },
        spotcard: { reason: 'Cheap idle is still idle. The cheapest instance is the one not running.' },
      },
      fallback: { reason: 'The sandbox bay takes a pricing decision.' },
    },
  ],
  beats: [
    {
      id: 'bill3', label: 'bill projection', trigger: 'terminal',
      rules: [
        { when: { socket: { 'bay-api': 'savings', 'bay-batch': 'spotcard', 'bay-sand': 'offswitch' } }, pass: true,
          title: '✔ −58% without touching code', lines: 'API .............. Savings Plan, −40%\nbatch ............ Spot, −70%\nsandbox .......... $0 (off)\ntotal ............ −58%', note: 'Purchasing is a code-free lever: same workloads, right models.' },
        { pass: false, title: '✘ still one price for everything',
          lines: 'assignments ...... incomplete', note: 'Seat all three pricing cards.' },
      ],
    },
    {
      id: 'reclaim', label: 'Spot-reclaim drill', trigger: 'terminal',
      rules: [
        { when: { socket: { 'bay-api': 'savings', 'bay-batch': 'spotcard', 'bay-sand': 'offswitch' } }, pass: true,
          title: '✔ reclaimed, resumed, unbothered', lines: 'spot reclaim ..... 2-min warning honored\nbatch ............ checkpointed, resumed\nAPI .............. unaffected (committed capacity)', note: 'Spot\'s catch, demonstrated: the interruptible tier shrugged, and nothing critical lived there.' },
        { pass: false, title: '✘ nothing on Spot to drill',
          lines: 'batch ............ still On-Demand', note: 'Finish the pricing assignments first.' },
      ],
    },
  ],
  verifyDone: {
    title: 'Paying in the right shape',
    body: 'The projection lands at −58% with zero code changes, and the reclaim drill proved the interruptible tier holds only interruptible work.',
    journal: 'Verified: Savings Plan on the base, Spot on the batch, OFF on the idle.',
  },
};

export const CLF_SUPPORT_SPEC: MissionSpec = {
  ticket: {
    incident: 'CLF-208', reporter: 'director', sev: 'SEV-2', title: 'Shouting Into the Docs',
    bodyHtml:
      `<div>Production fell over at midnight and the team discovered the account is on Basic support: no humans, no phone, a documentation search box at 12:04 a.m. The director wants "whatever plan means a human answers when prod is down" — but not the one with the private jet.</div>` +
      `<pre>current plan ...... Basic (docs + billing)\nlast night ........ prod down, nobody to call\nbudget ............ real, not infinite</pre>`,
    hint: 'Probe the plans and last night\'s timeline, diagnose, then dial the plan — it must pass BOTH the prod-down drill and the budget review.',
  },
  objectiveFix: 'Dial the support plan to fit the need and the budget',
  objectiveDone: 'CLF-208 closed — a human answers in under an hour, and finance signed it.',
  summary: 'Support plans ladder: Basic (docs, billing, core Trusted Advisor), Developer (business-hours guidance), Business (24/7 phone/chat, <1h response for production-down, full Trusted Advisor), Enterprise (adds a named TAM and concierge — priced for organizations that need one). For "prod is down, answer the phone" the answer is Business; Enterprise passes the drill and fails the budget when nothing justifies a TAM.',
  level: [
    { id: 'planwall', kind: 'shelfUnit', at: [-4.5, 1.5], yaw: Math.PI / 2, args: ['#67ad5b'], service: 'none' },
    { id: 'warroom', kind: 'serverRack', at: [4.5, 1.5], yaw: -Math.PI / 2, service: 'none' },
    { id: 'dial', kind: 'aimPointer', at: [0, -1.8] },
    { id: 'lever', kind: 'chaosLever', at: [4, -4.5] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'support desk', accent: '#67ad5b' },
    { kind: 'zone', at: [4.5, 1.5], w: 3.2, d: 3.2, hex: '#33141b', text: 'last night' },
    { kind: 'hazard', at: [4, -5.6], w: 3, d: 0.8 },
  ],
  probes: [
    {
      id: 'planwall', machine: 'planwall', prompt: 'Inspect the plan ladder',
      kicker: 'support plans', title: 'Four rungs',
      pre: 'Basic ............. docs, billing, core checks\nDeveloper ......... guidance, business hours\nBusiness .......... 24/7 humans, <1h prod-down\nEnterprise ........ + named TAM, concierge',
      journal: 'The ladder: each rung buys response time and access to humans. Business is the first 24/7 rung.',
    },
    {
      id: 'warroom', machine: 'warroom', prompt: 'Inspect last night',
      kicker: 'timeline', title: '12:04 a.m., search box',
      pre: '00:00 prod down\n00:04 discovered plan = Basic\n00:05-02:40 documentation, forums, prayer\nneed .............. a human, within the hour, any hour',
      journal: 'Last night: the need is 24/7 human response with a production-down SLA. That is a specific rung.',
    },
  ],
  diagnosis: {
    unlockedBy: 'planwall',
    title: 'Which plan fits "prod down, answer the phone" on a real budget?',
    correct: {
      label: 'Business: 24/7 phone/chat, <1 hour response on production-down cases, full Trusted Advisor — TAM not required',
      journal: 'Diagnosis: the requirement names Business. Enterprise adds a TAM this org doesn\'t need yet.',
      confirmBody: 'Dial to Business. The drill should reach a human inside the hour — and the budget review should survive the invoice.',
      actionLabel: 'To the dial →',
    },
    wrongs: [
      { label: 'Basic is fine — the docs are good', rebuttal: 'Last night already ran this experiment. The docs did not pick up the phone.' },
      { label: 'Developer — it mentions support!', rebuttal: 'Business-hours guidance for development questions. Production-down-at-midnight is precisely what it does not cover.' },
      { label: 'Enterprise — buy the top, be safe', rebuttal: 'It passes every drill and fails the budget: you\'d pay for a named TAM and concierge reviews nothing here uses. Fit the rung to the need.' },
    ],
  },
  dials: [
    {
      id: 'plan', machine: 'dial', initial: 'basic',
      grabPrompt: '◀ ▶ swing the plan · E/Ⓧ lock',
      positions: [
        { id: 'basic', label: 'Basic (status quo)', angle: -0.75 },
        { id: 'developer', label: 'Developer', angle: -0.25 },
        { id: 'business', label: 'Business', angle: 0.25 },
        { id: 'enterprise', label: 'Enterprise', angle: 0.75 },
      ],
    },
  ],
  levers: [{ id: 'lever-down', machine: 'lever', prompt: 'PULL — midnight prod-down (drill)', beat: 'proddown' }],
  beats: [
    {
      id: 'proddown', label: 'prod-down drill', trigger: 'lever',
      rules: [
        { when: { dial: { plan: 'business' } }, pass: true,
          title: '✔ human on the line in 41 minutes', lines: 'case sev ......... production system down\nresponse ......... 41 min (SLA <1h)\nchannel .......... phone, 24/7', note: 'Business is the rung where midnight has a phone number.' },
        { when: { dial: { plan: 'enterprise' } }, pass: true,
          title: '✔ TAM answers personally (of course)', lines: 'response ......... 12 min\nTAM .............. knows your stack', note: 'Enterprise passes everything — hold that thought until the budget review.' },
        { when: { dial: { plan: 'developer' } }, pass: false,
          title: '✘ "we\'ll respond next business day"', lines: 'midnight ......... unsupported tier\nSLA .............. business hours only', note: 'Developer buys guidance, not incident response. The name misleads; the SLA doesn\'t.' },
        { pass: false, title: '✘ the search box, again',
          lines: 'humans available .. 0', note: 'Basic has no incident channel. Swing the dial.' },
      ],
    },
    {
      id: 'budget', label: 'budget review', trigger: 'terminal',
      rules: [
        { when: { dial: { plan: 'business' } }, pass: true,
          title: '✔ signed without a meeting', lines: 'covers ........... 24/7 + <1h prod-down\ncosts ............ % of AWS spend, mid tier\nunused extras .... none', note: 'The rung that matches the requirement — no more, no less. Finance loves a requirement-shaped invoice.' },
        { when: { dial: { plan: 'enterprise' } }, pass: false,
          title: '✘ paying for a concierge nobody visits', lines: 'TAM ............... unused here\nprice ............. top tier\nfinance ........... has questions', note: 'WORKS-BUT: over-buying support is the pricing-models lesson wearing a headset. Fit the need.' },
        { pass: false, title: '✘ budget approves; requirement doesn\'t',
          lines: 'plan .............. below the need', note: 'Cheap plans that fail the drill cost an outage each.' },
      ],
    },
  ],
  verifyDone: {
    title: 'The right rung',
    body: 'The midnight drill reached a human in 41 minutes and the budget review signed a requirement-shaped invoice: Business.',
    journal: 'Verified: Business support — 24/7 humans, <1h prod-down, no unused concierge.',
  },
};
