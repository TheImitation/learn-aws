import type { MissionSpec } from '../spec';

/** Secure-domain batch 2 — the remaining seven topics. */

export const NET_BOUNDARIES_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-2691', reporter: 'security', sev: 'SEV-2', title: 'The Naked Web Tier',
    bodyHtml:
      `<div>An external scan found every app server answering directly from the internet: public subnet, public IPs, security group open to the world. The load balancer was supposed to be the only door. Make it so.</div>` +
      `<pre>app servers ...... PUBLIC subnet · public IPs\nSG source ........ 0.0.0.0/0\nscanner .......... sees every instance\nintended door .... the ALB, and only the ALB</pre>`,
    hint: 'Probe the edge and the app tier, diagnose, then swing the subnet dial AND scope the SG at the rule bay. Exposure scan and serve test must pass.',
  },
  objectiveFix: 'Swing the app tier to the private subnet · scope the SG to the ALB',
  objectiveDone: 'INC-2691 closed — one hardened door, nothing else exposed.',
  summary: 'Symptom: app servers directly internet-reachable — public subnet, public IPs, SG open to the world. Fix: move the tier to a PRIVATE subnet (no inbound route from the internet) and scope the instance SG to source = the ALB’s security group, port 443 — the tightest rule there is. Only the hardened, audited ALB stays public. (Admin access? Session Manager — no inbound ports.)',
  level: [
    { id: 'igw', kind: 'internetGate', at: [-7, 1.5], yaw: Math.PI / 2 },
    { id: 'alb', kind: 'routerArm', at: [-2.5, 1.5] },
    { id: 'app', kind: 'serverRack', at: [3.5, 1.5], yaw: Math.PI / 2 },
    { id: 'dial', kind: 'aimPointer', at: [0.5, -2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'app', machine: 'app', prompt: 'Inspect app tier',
      kicker: 'app servers', title: 'Answering the whole internet',
      pre: 'subnet ........... PUBLIC (route to IGW)\npublic IPs ....... yes, all of them\nSG inbound ....... 443 from 0.0.0.0/0\nscan findings .... every instance enumerated',
      journal: 'App tier: public subnet + public IPs + SG open to the world — every server is its own front door.',
    },
    {
      id: 'alb', machine: 'alb', prompt: 'Inspect the load balancer',
      kicker: 'ALB', title: 'The door nobody has to use',
      pre: 'placement ........ public subnet (correct)\nhardening ........ TLS · logging · WAF-ready\nproblem .......... traffic can just… go around it',
      journal: 'ALB: the one entrance built to be exposed — but nothing forces traffic through it.',
    },
  ],
  pallet: {
    at: [4.5, -5],
    modules: [
      { id: 'mod-sgalb', kind: 'sg-alb', label: 'SG: 443 from the ALB security group', spot: [3.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-sgany', kind: 'sg-any', label: 'SG: 443 from 0.0.0.0/0', spot: [5.1, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-sgall', kind: 'sg-all', label: 'SG: ALL ports from anywhere', spot: [4.5, -5.5], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.34 } },
    ],
  },
  sockets: [
    {
      id: 'so-sgr', label: 'instance SG bay', at: [4.5, -1.8],
      blurb: 'The app instances’ security group. Tightest rule wins: source = the ALB’s security group means “only traffic that came through the ALB”, membership tracked automatically.',
      allow: { 'sg-alb': true, 'sg-any': true },
      refuse: {
        'sg-all': { reason: 'BLOCKED: every port from everywhere — the scan finding, weaponised.', alarm: 'SECURITY — ALL-PORTS-OPEN RULE ATTEMPT' },
      },
      fallback: { reason: 'The bay takes a security-group module.' },
    },
  ],
  dials: [
    {
      id: 'subnet', machine: 'dial', initial: 'public',
      grabPrompt: '◀ ▶ swing the app-tier subnet · E/Ⓧ lock',
      positions: [
        { id: 'public', label: 'app tier: PUBLIC subnet', angle: 2.0 },
        { id: 'private', label: 'app tier: PRIVATE subnet', angle: 1.0 },
      ],
    },
  ],
  beats: [
    {
      id: 'scan', label: 'exposure scan', trigger: 'terminal', infoInInvestigate: true,
      rules: [
        {
          when: { dial: { subnet: 'private' }, socket: { 'so-sgr': 'sg-alb' } }, pass: true,
          title: '✔ Scanner finds one door: the ALB',
          lines: 'app subnet ....... PRIVATE — no inbound route\npublic IPs ....... none\nSG source ........ the ALB security group only\nscanner .......... sees the ALB, full stop',
          note: 'No inbound route from the internet, no public IPs, and an SG that only trusts traffic from the ALB’s own security group. The attack surface is one hardened, audited entrance.',
        },
        {
          when: { dial: { subnet: 'public' } }, pass: false,
          title: '✘ Every server still enumerated',
          lines: 'app subnet ....... PUBLIC (route to IGW)\nscanner .......... all instances visible',
          note: 'While the tier sits in a public subnet with public IPs, the internet can knock on every box. Private subnets have NO inbound route — swing the dial.',
        },
        {
          when: { socket: { 'so-sgr': 'sg-any' } }, pass: false,
          title: '✘ Hidden — but trusting the whole world',
          lines: 'app subnet ....... private ✓\nSG source ........ 0.0.0.0/0 ✗\naudit ............ “tightest rule” failed',
          note: 'The subnet hides the tier, but the rule still trusts EVERYONE — one misplaced route or peering later, that’s a hole. Scope the source to the ALB’s security group: only its members ever match.',
        },
        {
          pass: false,
          title: '✘ Exposure unresolved',
          lines: 'subnet ........... check the dial\nSG bay ........... check the module',
          note: 'Private subnet + SG scoped to the ALB — both, together.',
        },
      ],
    },
    {
      id: 'serve', label: 'serve test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-sgr': 'any' } }, pass: true,
          title: '✔ Users flow: IGW → ALB → app tier',
          lines: 'path ............. internet → ALB (public)\n                   → app tier (private)\nother paths ...... none exist',
          note: 'The only way in is through the one door built for it. Layered: subnet routing keeps the internet out, the SG only admits the ALB.',
        },
        {
          pass: false,
          title: '✘ The ALB knocks — nobody answers',
          lines: 'SG bay ........... EMPTY\nusers ............ 502',
          note: 'Locking the tier down doesn’t mean locking the ALB out — seat an SG module that admits it.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ One door, guarded twice',
    body: 'App tier in a private subnet (no inbound route), SG scoped to the ALB’s security group on 443, and the only public thing is the load balancer built for the job. Close the ticket at the field terminal.',
    journal: 'Exposure scan + serve test passed — private subnet + ALB-scoped SG.',
  },
  diagnosis: {
    unlockedBy: 'app',
    title: 'How should ONLY the ALB reach the app servers?',
    correct: {
      label: 'Private subnet for the tier + an instance SG allowing 443 with SOURCE = the ALB’s security group',
      journal: 'Diagnosis confirmed: private subnet removes the internet route; SG-to-SG scoping makes the ALB the only admitted caller.',
      confirmBody: 'Two layers, each doing its own job: the private subnet has no inbound route from the internet, and the SG names the ALB’s security group as the ONLY trusted source — membership tracked for you. Swing the dial, scope the rule.',
      actionLabel: 'To the fix →',
    },
    wrongs: [
      { label: 'Keep public IPs but enable the host firewall', rebuttal: 'Per-host firewalls on internet-facing boxes is whack-a-mole with root access. Remove the route, don’t referee it.' },
      { label: 'Restrict the SG to the ALB’s current IP addresses', rebuttal: 'ALB IPs CHANGE. Reference the ALB’s security group instead — membership follows automatically.' },
      { label: 'Move the ALB into the private subnet too', rebuttal: 'Then nobody reaches anything. The ALB is the one component DESIGNED to be public.' },
    ],
  },
  faultLamps: ['app'],
};

export const EDGE_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-3050', reporter: 'secops', sev: 'SEV-1', title: 'Two Attacks, One Door',
    bodyHtml:
      `<div>The public endpoint is being hit two ways at once: a volumetric L3/4 flood is saturating the pipe, and inside the legitimate-looking traffic, requests carry SQL-injection payloads and scraper bots. Two different layers, two different defences — neither is optional tonight.</div>` +
      `<pre>flood ............ L3/4 volumetric · 40 Gbps\npayloads ......... SQLi · XSS · bot scraping (L7)\ncurrent defence .. hope\nSLA .............. stay up, stay uncorrupted</pre>`,
    hint: 'Probe the edge, diagnose, then arm BOTH bays: request filtering and flood absorption are different layers. Injection test AND flood drill (lever) must pass.',
  },
  objectiveFix: 'Arm the L7 filter bay AND the flood-shield bay',
  objectiveDone: 'INC-3050 closed — filtered at 7, absorbed at 3/4.',
  summary: 'Symptom: a simultaneous L3/4 volumetric flood and L7 injection/bot traffic. Fix: layered edge defence — AWS WAF attached at the edge (CloudFront/ALB/API Gateway) inspects HTTP: blocks SQLi/XSS patterns, rate-limits, filters bots; AWS Shield (Advanced) absorbs the volumetric flood at layers 3/4 with 24/7 response (Standard is already on for free). NACLs match ports/IPs — they cannot read a request body; capacity can outlast one flood but not the next.',
  level: [
    { id: 'gate', kind: 'crowdGate', at: [-8, 0], yaw: Math.PI / 2 },
    { id: 'edge', kind: 'internetGate', at: [-3, 0], yaw: Math.PI / 2 },
    { id: 'app', kind: 'serverRack', at: [4.5, 0], yaw: Math.PI / 2 },
    { id: 'lever', kind: 'chaosLever', at: [3, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'edge', machine: 'edge', prompt: 'Inspect the edge',
      kicker: 'public endpoint', title: 'Two attacks, interleaved',
      pre: 'L3/4 ............. SYN + UDP flood, 40 Gbps\nL7 ............... SQLi payloads in valid HTTP\nbots ............. scraping the catalogue\ndefence .......... none at either layer',
      journal: 'Edge: a volumetric flood (L3/4) AND injection payloads inside well-formed HTTP (L7) — two layers, two problems.',
    },
    {
      id: 'app', machine: 'app', prompt: 'Inspect the app',
      kicker: 'origin', title: 'Absorbing what the edge should stop',
      pre: 'conn table ....... exhausted (flood)\nWAF logs ......... none — no WAF\nDB errors ........ quote-escape anomalies (SQLi)',
      journal: 'Origin: drowning in flood connections while injection attempts reach the database layer.',
    },
  ],
  pallet: {
    at: [-4, -5],
    modules: [
      { id: 'mod-waf', kind: 'waf', label: 'AWS WAF web ACL', spot: [-4.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-shield', kind: 'shield', label: 'AWS Shield Advanced', spot: [-3.7, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-nacl', kind: 'naclcard', label: 'NACL rule card', spot: [-4.9, -5.5], visual: { hex: '#5a2330', glowHex: '#e85f5f', h: 0.34 } },
      { id: 'mod-big', kind: 'capacity', label: 'A wall of bigger servers', spot: [-3.7, -5.5], visual: { hex: '#8a7a22', glowHex: '#e8d657' } },
    ],
  },
  sockets: [
    {
      id: 'so-l7', label: 'L7 filter bay', at: [-0.5, -2],
      blurb: 'Request inspection at layer 7: attached to CloudFront, an ALB, or API Gateway. Reads the HTTP itself — patterns, headers, rates, bots.',
      allow: { waf: true },
      refuse: {
        naclcard: { reason: 'NACLs match ports and IP ranges — they cannot READ the request body where the SQLi lives. Layer 7 needs a layer-7 tool.' },
        shield: { reason: 'Shield works at layers 3/4 — it absorbs floods, it doesn’t parse HTTP. The filter bay wants WAF.' },
        capacity: { reason: 'More servers execute the injection FASTER. Filtering is not a capacity problem.' },
      },
      fallback: { reason: 'The filter bay takes a layer-7 web ACL.' },
    },
    {
      id: 'so-l34', label: 'flood-shield bay', at: [1.5, -2],
      blurb: 'Volumetric absorption at layers 3/4, backed by the AWS edge and (Advanced) a 24/7 response team + cost protection. Standard is always on, free.',
      allow: { shield: true, capacity: true },
      refuse: {
        waf: { reason: 'WAF reads HTTP — a SYN flood has no HTTP to read. Layers 3/4 belong to Shield.' },
        naclcard: { reason: 'A NACL drops packets AFTER they’ve travelled your pipe — a 40 Gbps flood saturates it anyway. Absorb at the EDGE.' },
      },
      fallback: { reason: 'The shield bay takes flood protection.' },
    },
  ],
  levers: [
    { id: 'lever-flood', machine: 'lever', prompt: 'PULL — launch the flood drill', beat: 'flood' },
  ],
  sim: [
    { id: 'gate', machine: 'gate', route: [{ to: 'edgeN' }] },
    { id: 'edgeN', machine: 'edge', route: [{ to: 'appN' }] },
    { id: 'appN', machine: 'app', route: [{ to: 'deliver' }] },
  ],
  beats: [
    {
      id: 'inject', label: 'injection test', trigger: 'terminal',
      spawn: { node: 'gate', kind: 'request', n: 6, spacing: 0.25 },
      rules: [
        {
          when: { socket: { 'so-l7': 'waf' } }, pass: true,
          title: '✔ SQLi blocked, bots rate-limited, users pass',
          lines: 'SQLi patterns .... blocked (managed rules)\nscraper bots ..... rate-limited by IP\nlegit users ...... unaffected\nattached at ...... the edge (CloudFront/ALB)',
          note: 'WAF reads the request itself — patterns, headers, rates — and drops the poison before the origin ever parses it.',
        },
        {
          pass: false,
          title: '✘ Injection payloads reached the database',
          lines: 'L7 filter ........ MISSING\nSQLi ............. parsed by the app\nbots ............. scraping freely',
          note: 'Well-formed HTTP sails past network-layer defences — only a layer-7 filter can read the body. Arm the filter bay with WAF.',
          alarm: 'SECURITY — INJECTION TRAFFIC AT ORIGIN',
        },
      ],
    },
    {
      id: 'flood', label: 'flood drill', trigger: 'lever',
      spawn: { node: 'gate', kind: 'flood', n: 8, spacing: 0.15 },
      rules: [
        {
          when: { socket: { 'so-l34': 'shield' } }, pass: true,
          title: '✔ 40 Gbps absorbed at the edge',
          lines: 'flood ............ scrubbed at layers 3/4\norigin ........... never saw it\nresponse team .... engaged (Advanced)\ncost ............. protected',
          note: 'Shield absorbs volumetric attacks at the AWS edge before they reach your pipe. Standard is free and always on; Advanced adds the response team and cost protection.',
        },
        {
          when: { socket: { 'so-l34': 'capacity' } }, pass: false,
          title: '✘ You outspent one flood. The next is bigger',
          lines: 'this flood ....... absorbed by brute capacity\nbill ............. spectacular\nnext flood ....... 400 Gbps says hi',
          note: 'Capacity turns a DDoS into a bidding war you fund alone. Shield absorbs at the edge — before the traffic ever meters against you.',
        },
        {
          pass: false,
          title: '✘ Pipe saturated — site dark',
          lines: 'flood ............ 40 Gbps into a 10 Gbps pipe\nusers ............ timeouts',
          note: 'Nothing at layers 3/4 is absorbing. Arm the shield bay.',
          alarm: 'OUTAGE — VOLUMETRIC FLOOD SATURATION',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Filtered at 7, absorbed at 3/4',
    body: 'WAF reads and filters the requests; Shield absorbs the flood at the edge. Different layers, different tools, one calm origin. Close the ticket at the field terminal.',
    journal: 'Injection + flood drills passed — WAF (L7) + Shield (L3/4), layered.',
  },
  diagnosis: {
    unlockedBy: 'edge',
    title: 'Two simultaneous attacks — what stops each one?',
    correct: {
      label: 'Layer them: AWS WAF at the edge for the L7 payloads/bots + AWS Shield for the L3/4 volumetric flood',
      journal: 'Diagnosis confirmed: WAF for request content (L7), Shield for volume (L3/4) — layered edge defence.',
      confirmBody: 'One attack lives inside the HTTP; the other IS the traffic volume. No single tool reads both layers — arm both bays.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Tighten the NACLs at the subnet edge', rebuttal: 'NACLs match ports and IPs — they can’t read a request body, and the flood saturates your pipe before a subnet rule matters.' },
      { label: 'Scale the fleet until it absorbs everything', rebuttal: 'You’d be renting servers to execute injections faster and funding a bidding war against a botnet.' },
      { label: 'Block the attacking IP ranges by hand', rebuttal: 'Botnets rotate addresses faster than you can type. Managed rules and edge absorption exist for exactly this.' },
    ],
  },
  faultLamps: ['edge'],
};

export const CONNECT_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-7745', reporter: 'netops', sev: 'SEV-3', title: 'The Mesh That Grew',
    bodyHtml:
      `<div>Three VPCs: A is peered to B, B is peered to C — and A cannot reach C, because peering is NOT transitive. Meanwhile the platform team just announced seventeen more VPCs landing next quarter. Fix today’s reachability without building tomorrow’s 190-link mesh.</div>` +
      `<pre>peering .......... A↔B ✓ · B↔C ✓ · A→C ✗\nlesson ........... peering is non-transitive\nincoming ......... +17 VPCs next quarter\nfull mesh @20 .... ~190 links</pre>`,
    hint: 'Probe the VPCs, diagnose, then socket the connectivity core. The reach test AND the scale drill (lever) must pass.',
  },
  objectiveFix: 'Socket the connectivity core in the hub bay',
  objectiveDone: 'INC-7745 closed — hub-and-spoke, room for twenty.',
  summary: 'Symptom: A↔B and B↔C peering, but A can’t reach C — VPC peering is strictly 1:1 and NON-TRANSITIVE, and a full mesh of 20 VPCs is ~190 links. Fix: AWS Transit Gateway as a hub-and-spoke router — every VPC (and on-premises) attaches once, routing is central, traffic stays private on the AWS network. One more cable fixes today; the hub fixes the quarter. (And overlapping CIDRs can’t be connected either way — plan address space, or expose single services via PrivateLink.)',
  level: [
    { id: 'vpcA', kind: 'serverRack', at: [-6, 3], yaw: Math.PI / 2 },
    { id: 'vpcB', kind: 'serverRack', at: [0, 4.5], yaw: Math.PI / 2 },
    { id: 'vpcC', kind: 'serverRack', at: [6, 3], yaw: -Math.PI / 2 },
    { id: 'lever', kind: 'chaosLever', at: [3, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'vpcA', machine: 'vpcA', prompt: 'Inspect VPC A',
      kicker: 'VPC A', title: 'Two hops that don’t add up',
      pre: 'peered to ........ B ✓\nroute to C ....... none — B won’t forward\nreason ........... peering is NON-transitive',
      journal: 'VPC A: peered to B, but traffic for C dies there — a peer never forwards to ITS peers.',
    },
    {
      id: 'vpcB', machine: 'vpcB', prompt: 'Inspect VPC B',
      kicker: 'VPC B', title: 'The middle that won’t route',
      pre: 'peered to ........ A ✓ · C ✓\nforwarding A→C ... NOT a thing peering does\ngrowth plan ...... +17 VPCs attach WHERE?',
      journal: 'VPC B: peered to both — and constitutionally incapable of forwarding between them. Peering links two VPCs, full stop.',
    },
  ],
  pallet: {
    at: [-3, -5],
    modules: [
      { id: 'mod-tgw', kind: 'tgw', label: 'Transit Gateway (hub router)', spot: [-3.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-cable', kind: 'peer-cable', label: 'One more peering cable (A↔C)', spot: [-2.7, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0', h: 0.34 } },
      { id: 'mod-overlap', kind: 'overlap', label: 'Peering cable for twin 10.0.0.0/16s', spot: [-3.3, -5.5], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.34 } },
    ],
  },
  sockets: [
    {
      id: 'so-hub', label: 'connectivity hub bay', at: [0, 0],
      blurb: 'The routing core between VPCs (and on-premises). A hub means each network attaches ONCE and routing is central — spokes never need to know each other.',
      allow: { tgw: true, 'peer-cable': true },
      refuse: {
        overlap: { reason: 'Those two VPCs share the CIDR 10.0.0.0/16 — overlapping ranges cannot be peered at all. Re-IP one side, or expose the one service via PrivateLink.' },
      },
      fallback: { reason: 'The hub bay takes a connectivity core.' },
    },
  ],
  levers: [
    { id: 'lever-scale', machine: 'lever', prompt: 'PULL — land the 17 new VPCs (drill)', beat: 'scale' },
  ],
  beats: [
    {
      id: 'reach', label: 'reach test (A→C)', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-hub': 'tgw' } }, pass: true,
          title: '✔ A reaches C through the hub',
          lines: 'A → TGW → C ...... routed centrally\nattachments ...... one per VPC\ntraffic .......... private, on the AWS network',
          note: 'Every VPC attaches once; the hub routes. Nobody peers with anybody — they all just know the hub.',
        },
        {
          when: { socket: { 'so-hub': 'peer-cable' } }, pass: true,
          title: '✔ A reaches C — on the third cable',
          lines: 'A ↔ C ............ direct peering (new)\nlinks now ........ 3 for 3 VPCs\ntransitive? ...... still no',
          note: 'A direct peer fixes A→C, because a direct link is the only thing peering gives you. Works today. Now watch the scale drill.',
        },
        {
          pass: false,
          title: '✘ A → C: no route',
          lines: 'A → B ............ delivered\nB → C ............ B won’t forward\nA → C ............ unreachable',
          note: 'Peering is non-transitive — A needs its OWN path to C: another peer, or a hub.',
        },
      ],
    },
    {
      id: 'scale', label: 'scale drill (+17 VPCs)', trigger: 'lever',
      rules: [
        {
          when: { socket: { 'so-hub': 'tgw' } }, pass: true,
          title: '✔ Twenty spokes, one hub, done by lunch',
          lines: 'new VPCs ......... 17 attachments, one each\nrouting .......... central (route tables on the hub)\nlinks total ...... 20 — not 190\non-premises ...... attaches like any spoke',
          note: 'Hub-and-spoke scales linearly: each new VPC is ONE attachment, and the hub’s route tables decide who talks to whom.',
        },
        {
          when: { socket: { 'so-hub': 'peer-cable' } }, pass: false,
          title: '✘ 190 links and a resignation letter',
          lines: 'full mesh @20 .... n(n−1)/2 = 190 peerings\neach new VPC ..... 19 more cables\nroute tables ..... 190 places to typo',
          note: 'Pairwise peering is lovely for two VPCs and unmanageable for twenty. This is the Transit Gateway’s whole reason to exist.',
        },
        {
          pass: false,
          title: '✘ Nothing to attach to',
          lines: 'hub bay .......... EMPTY',
          note: 'Socket a connectivity core first.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Hub-and-spoke, room to grow',
    body: 'Transit Gateway routes all twenty VPCs (and on-premises) from one hub — one attachment each, central route control, private transit. Peering still has its place: exactly two VPCs, nothing more. Close the ticket at the field terminal.',
    journal: 'Reach + scale drills passed — Transit Gateway hub.',
  },
  diagnosis: {
    unlockedBy: 'vpcB',
    title: 'Why can’t A reach C — and what survives 20 VPCs?',
    correct: {
      label: 'Peering is NON-TRANSITIVE (B never forwards) — use a Transit Gateway hub so every VPC attaches once',
      journal: 'Diagnosis confirmed: non-transitive peering; Transit Gateway hub-and-spoke for scale.',
      confirmBody: 'A peer link joins exactly two VPCs — B will never forward A’s packets to C. Another cable patches today; the hub survives the quarter. The bay takes either — the drills will have opinions.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'B’s route tables are just missing the A→C entry', rebuttal: 'You can write that route — the peering connection will still refuse to forward. Non-transitivity is in the fabric, not the table.' },
      { label: 'Open the security groups between A and C', rebuttal: 'SGs filter traffic that ARRIVES. There is no path for anything to arrive on.' },
      { label: 'Assign public IPs and route over the internet', rebuttal: 'Private workloads on the public internet to dodge a routing design — the auditors would like a word.' },
    ],
  },
  faultLamps: ['vpcA'],
};

export const HYBRID_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-5561', reporter: 'platform', sev: 'SEV-3', title: 'The Datacentre Link',
    bodyHtml:
      `<div>The on-premises datacentre replicates heavy, steady traffic to AWS all day — over the public internet, with jittery latency and occasional stalls. The business wants a private, consistent, high-bandwidth link… that also survives a digger cutting the fibre.</div>` +
      `<pre>traffic .......... steady, heavy (replication)\ntoday ............ public internet · jitter\nrequired ......... private · consistent · fast\nalso required .... survives a fibre cut</pre>`,
    hint: 'Probe both ends, diagnose, then fill the PRIMARY and BACKUP link bays. Consistency test AND the fibre-cut drill (lever) must pass.',
  },
  objectiveFix: 'Socket the primary link · socket the backup link',
  objectiveDone: 'INC-5561 closed — dedicated fibre, tunnel on standby.',
  summary: 'Symptom: heavy steady datacentre↔AWS traffic riding the public internet — variable latency, no privacy guarantees. Fix: AWS Direct Connect as the primary (dedicated private link, consistent latency and bandwidth; add IPsec over it when encryption is required) with a Site-to-Site VPN as backup — encrypted, quick and cheap to stand up, and perfectly acceptable when the fibre gets cut. VPN alone is the right answer for “today and cheap”, not for “steady, heavy, consistent”.',
  level: [
    { id: 'dc', kind: 'serverRack', at: [-6.5, 1.5], yaw: Math.PI / 2 },
    { id: 'vpc', kind: 'serverRack', at: [6, 1.5], yaw: -Math.PI / 2 },
    { id: 'lever', kind: 'chaosLever', at: [3, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'dc', machine: 'dc', prompt: 'Inspect the datacentre end',
      kicker: 'on-premises', title: 'Replication with seasickness',
      pre: 'traffic .......... 4 TB/day, steady\npath ............. public internet\nlatency .......... 20–190 ms, weather-dependent\nstalls ........... daily',
      journal: 'Datacentre: steady heavy replication riding the public internet — latency wobbles with everyone else’s traffic.',
    },
    {
      id: 'vpc', machine: 'vpc', prompt: 'Inspect the AWS end',
      kicker: 'VPC', title: 'Waiting on the weather',
      pre: 'replication lag .. spiky (upstream jitter)\nprivate link ..... none\nVGW/DX ready ..... yes',
      journal: 'AWS end: gateways ready for a private link — currently at the mercy of internet weather.',
    },
  ],
  pallet: {
    at: [-3, -5],
    modules: [
      { id: 'mod-dx', kind: 'dx', label: 'Direct Connect (dedicated fibre)', spot: [-3.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-vpn', kind: 'vpn', label: 'Site-to-Site VPN (IPsec tunnel)', spot: [-2.7, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-inet', kind: 'inet', label: '“The internet is fine” route', spot: [-3.3, -5.5], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-primary', label: 'primary link bay', at: [-0.5, 0],
      blurb: 'The main datacentre↔AWS path: this is where “steady, heavy, consistent” must live. Dedicated links don’t share the road; tunnels do.',
      allow: { dx: true, vpn: true },
      refuse: {
        inet: { reason: 'BLOCKED: raw internet routing for replication traffic — no privacy, no consistency, no dignity.', alarm: 'SECURITY — PRIVATE TRAFFIC ON PUBLIC ROUTE' },
      },
      fallback: { reason: 'The primary bay takes a link module.' },
    },
    {
      id: 'so-backup', label: 'backup link bay', at: [1.5, 0],
      blurb: 'The break-glass path for when the fibre meets a digger: quick to establish, encrypted, allowed to be slower.',
      allow: { vpn: true },
      refuse: {
        dx: { reason: 'A second dedicated circuit is months of provisioning and double the cost — the classic backup is a VPN tunnel: up in hours, fine in a crisis.' },
        inet: { reason: 'BLOCKED: an unencrypted internet route is not a backup, it’s an incident.', alarm: 'SECURITY — PRIVATE TRAFFIC ON PUBLIC ROUTE' },
      },
      fallback: { reason: 'The backup bay takes a link module.' },
    },
  ],
  levers: [
    { id: 'lever-cut', machine: 'lever', prompt: 'PULL — cut the fibre (drill)', beat: 'cut' },
  ],
  beats: [
    {
      id: 'steady', label: 'consistency test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-primary': 'dx' } }, pass: true,
          title: '✔ 4 ms flat, all day',
          lines: 'path ............. dedicated fibre (Direct Connect)\nlatency .......... 4 ms, flat\nbandwidth ........ provisioned, private\nencryption ....... IPsec over DX where required',
          note: 'A dedicated link doesn’t share the road: consistent latency and bandwidth, private by construction. (DX itself isn’t encrypted — run IPsec over it for sensitive data.)',
        },
        {
          when: { socket: { 'so-primary': 'vpn' } }, pass: false,
          title: '✘ Encrypted, cheap — and seasick',
          lines: 'path ............. IPsec over the public internet\nlatency .......... 20–190 ms, variable\nsetup ............ hours ✓ · cost ✓\nconsistency ...... the internet decides',
          note: 'The VPN is the right tool for “today and cheap” — but it RIDES the public internet, so steady heavy replication inherits the jitter. The primary needs dedicated fibre.',
        },
        {
          pass: false,
          title: '✘ No primary link',
          lines: 'primary bay ...... EMPTY',
          note: 'Socket a primary link first.',
        },
      ],
    },
    {
      id: 'cut', label: 'fibre-cut drill', trigger: 'lever',
      rules: [
        {
          when: { socket: { 'so-primary': 'dx', 'so-backup': 'vpn' } }, pass: true,
          title: '✔ Digger 0 — Tunnel 1',
          lines: 'fibre ............ CUT (drill)\nfailover ......... VPN tunnel took the routes\nmode ............. degraded but ALIVE\nrepair window .... replication never stopped',
          note: 'Dedicated primary, encrypted tunnel on standby — the classic hybrid pattern. Slower for a day beats dark for a week.',
        },
        {
          when: { socket: { 'so-primary': 'dx', 'so-backup': null } }, pass: false,
          title: '✘ One fibre, one digger, zero links',
          lines: 'fibre ............ CUT (drill)\nbackup ........... none\nreplication ...... STOPPED',
          note: 'Dedicated fibre has no second path of its own. Stand a VPN tunnel in the backup bay — hours to build, priceless today.',
          alarm: 'OUTAGE — DATACENTRE LINK DOWN',
        },
        {
          pass: false,
          title: '✘ Nothing survived the cut',
          lines: 'links ............ misconfigured',
          note: 'DX primary + VPN backup is the pattern.',
          alarm: 'OUTAGE — DATACENTRE LINK DOWN',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Dedicated by default, tunnelled in a pinch',
    body: 'Direct Connect carries the steady heavy traffic with flat latency; the Site-to-Site VPN waits as the encrypted fallback. Quick-and-cheap versus steady-and-fast — used together, not confused. Close the ticket at the field terminal.',
    journal: 'Consistency + fibre-cut drills passed — DX primary, VPN backup.',
  },
  diagnosis: {
    unlockedBy: 'dc',
    title: 'What carries steady, heavy, private traffic — and survives a cut?',
    correct: {
      label: 'Direct Connect as the dedicated primary + a Site-to-Site VPN standing by as the encrypted backup',
      journal: 'Diagnosis confirmed: DX for consistency, VPN for the break-glass path.',
      confirmBody: 'Consistency needs a road you don’t share — that’s dedicated fibre. And every single road needs a detour: the tunnel is slower and rides the internet, which is exactly fine for a backup.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'A bigger internet pipe at the datacentre', rebuttal: 'Your last mile isn’t the jitter — the shared internet in the middle is. Capacity can’t buy consistency on a road you don’t control.' },
      { label: 'Two VPN tunnels for redundancy', rebuttal: 'Redundant, yes — but both still ride the public internet, so the steady-heavy traffic keeps its seasickness.' },
      { label: 'Compress the replication stream', rebuttal: 'Less data, same variable road. The requirement is consistency and privacy, not just volume.' },
    ],
  },
  faultLamps: ['dc'],
};

export const COGNITO_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-6220', reporter: 'appsec', sev: 'SEV-2', title: 'Rolling Their Own',
    bodyHtml:
      `<div>The mobile team built their own sign-in: a passwords table, no MFA, no Google login, and a TODO that says “hash these properly someday”. Users also need to upload photos STRAIGHT to S3 — and someone proposed shipping an AWS key inside the app to do it.</div>` +
      `<pre>auth ............. homemade passwords table\nMFA / social ..... none / none\nS3 uploads ....... “embed an access key??”\nusers ≠ .......... IAM principals</pre>`,
    hint: 'Probe the app and the uploader, diagnose, then fill BOTH bays — sign-in and AWS access are different problems. Both tests must pass.',
  },
  objectiveFix: 'Socket the sign-in bay AND the AWS-access bay',
  objectiveDone: 'INC-6220 closed — managed identity, temporary credentials.',
  summary: 'Symptom: a homemade passwords table (no MFA, no social login) and a plan to embed AWS keys in a mobile app for S3 uploads. Fix: a Cognito USER POOL for end-user sign-up/sign-in (MFA, Google federation, hosted UI; the API verifies the issued JWT) plus a Cognito IDENTITY POOL to exchange that verified identity for TEMPORARY, scoped AWS credentials for the direct S3 upload. IAM stays for AWS principals — never mint IAM users for app customers.',
  level: [
    { id: 'app', kind: 'serverRack', at: [-4, 1.5], yaw: Math.PI / 2 },
    { id: 'uploader', kind: 'shelfUnit', at: [5.5, 1.5], yaw: -Math.PI / 2, args: ['#e8a657'] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'app', machine: 'app', prompt: 'Inspect the sign-in flow',
      kicker: 'mobile backend', title: 'users.sql and a prayer',
      pre: 'auth ............. SELECT * FROM users WHERE…\nMFA .............. none\nGoogle login ..... “on the roadmap”\npassword resets .. hand-rolled, buggy',
      journal: 'Sign-in: a homemade passwords table — no MFA, no federation, all liability. End users are not IAM principals.',
    },
    {
      id: 'uploader', machine: 'uploader', prompt: 'Inspect the S3 uploader',
      kicker: 'photo uploads', title: 'A key in every pocket',
      pre: 'plan ............. embed an AWS access key\nblast radius ..... every app install\nrotation ......... impossible once shipped',
      journal: 'Uploader: the proposal is a long-lived AWS key inside the app binary — one decompile from disaster. Users need TEMPORARY credentials.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-up', kind: 'userpool', label: 'Cognito user pool (sign-in)', spot: [-2.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-ip', kind: 'idpool', label: 'Cognito identity pool (AWS creds)', spot: [-1.7, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-iam', kind: 'iamusers', label: 'IAM users for every customer', spot: [-2.9, -5.5], visual: { hex: '#3b2f4d', glowHex: '#b48ce0' } },
      { id: 'mod-key', kind: 'appkey', label: 'Access key baked into the app', spot: [-1.7, -5.5], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-signin', label: 'sign-in bay', at: [0.5, -1.2],
      blurb: 'Who your USERS are: sign-up, sign-in, MFA, social federation, hosted UI — and a JWT your API can verify (e.g. an API Gateway Cognito authorizer).',
      allow: { userpool: true },
      refuse: {
        idpool: { reason: 'The identity pool EXCHANGES a verified identity for AWS credentials — it doesn’t sign anyone in. Authentication is the USER pool’s job.' },
        iamusers: { reason: 'IAM governs AWS principals — engineers, roles, services. Minting IAM users for customers is a compliance fire drill.' },
        appkey: { reason: 'BLOCKED: a long-lived AWS key in a shipped binary — one decompile and it belongs to everyone.', alarm: 'SECURITY — CREDENTIAL IN CLIENT BINARY' },
      },
      fallback: { reason: 'The sign-in bay takes a user-identity service.' },
    },
    {
      id: 'so-access', label: 'AWS-access bay', at: [2.5, -1.2],
      blurb: 'How a signed-in user touches AWS directly (the S3 upload): a verified identity goes in, TEMPORARY scoped credentials come out.',
      allow: { idpool: true },
      refuse: {
        userpool: { reason: 'User pools AUTHENTICATE — they issue tokens, not AWS credentials. The exchange into temporary AWS creds is the IDENTITY pool’s job.' },
        iamusers: { reason: 'A permanent IAM user per customer, with long-lived keys on their phones? The auditors just fainted.' },
        appkey: { reason: 'BLOCKED: a long-lived AWS key in a shipped binary — one decompile and it belongs to everyone.', alarm: 'SECURITY — CREDENTIAL IN CLIENT BINARY' },
      },
      fallback: { reason: 'The access bay takes a credential broker.' },
    },
  ],
  beats: [
    {
      id: 'signin', label: 'sign-in test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-signin': 'userpool' } }, pass: true,
          title: '✔ MFA, Google login, verified JWTs',
          lines: 'sign-up/sign-in .. managed (hosted UI)\nMFA .............. on\nGoogle ........... federated\nAPI trust ........ JWT verified (authorizer)',
          note: 'The user pool owns the whole lifecycle — passwords, MFA, federation, resets — and issues JWTs your API verifies instead of trusting a session guess.',
        },
        {
          pass: false,
          title: '✘ Still SELECT * FROM users',
          lines: 'sign-in bay ...... not a user pool\nMFA/social ....... still missing',
          note: 'Managed user identity is the fix — socket the user pool.',
        },
      ],
    },
    {
      id: 'upload', label: 'direct-upload test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-signin': 'userpool', 'so-access': 'idpool' } }, pass: true,
          title: '✔ Temporary creds, straight to S3',
          lines: 'flow ............. sign-in → JWT → identity pool\ncredentials ...... TEMPORARY, scoped to the user’s prefix\nlifetime ......... minutes, auto-expiring\nkeys in binary ... zero',
          note: 'The identity pool federates the verified sign-in into short-lived AWS credentials scoped by role — the phone uploads directly to S3 and never holds a permanent key.',
        },
        {
          when: { socket: { 'so-access': null } }, pass: false,
          title: '✘ Signed in, but no path to S3',
          lines: 'JWT .............. valid\nAWS creds ........ none to issue',
          note: 'The token proves who they are; the ACCESS bay turns that into temporary AWS credentials. Socket the identity pool.',
        },
        {
          pass: false,
          title: '✘ Upload flow broken',
          lines: 'bays ............. check both',
          note: 'User pool authenticates; identity pool issues the temporary credentials. Both bays.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Managed identity, minutes-long credentials',
    body: 'User pool for who they are (MFA, Google, JWTs your API verifies) — identity pool for what they may briefly touch (temporary, scoped AWS credentials for the S3 upload). IAM stays for engineers and workloads. Close the ticket at the field terminal.',
    journal: 'Sign-in + upload tests passed — user pool + identity pool.',
  },
  diagnosis: {
    unlockedBy: 'app',
    title: 'What replaces the passwords table AND the key-in-the-app plan?',
    correct: {
      label: 'A Cognito USER pool for sign-in (MFA/social/JWTs) + an IDENTITY pool to mint temporary AWS credentials for the uploads',
      journal: 'Diagnosis confirmed: user pool = authentication; identity pool = temporary AWS credentials. IAM is for AWS principals.',
      confirmBody: 'Two different questions: “who is this user?” (user pool) and “what AWS may they briefly touch?” (identity pool). Neither answer involves a passwords table or a key in a binary.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Harden the passwords table (bcrypt, lockouts)', rebuttal: 'Better hashing, same liability: MFA, federation, resets, breach response — all still yours to build and defend forever.' },
      { label: 'Create an IAM user per customer', rebuttal: 'IAM is for AWS principals — engineers, roles, services. Customer-scale IAM users with long-lived keys is an anti-pattern with a blast radius.' },
      { label: 'Proxy every upload through the backend', rebuttal: 'It works — and doubles your bandwidth bill and latency for no security you don’t already get from temporary scoped credentials.' },
    ],
  },
  faultLamps: ['app'],
};

export const CLOUDTRAIL_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-3899', reporter: 'security', sev: 'SEV-2', title: 'Who Deleted the Security Group?',
    bodyHtml:
      `<div>At 03:12 someone deleted a production security group and took the payment service down with it. Nobody knows who, from where, or with which credentials — there is no API audit trail. And if we ever get one, it must survive an attacker trying to shred it.</div>` +
      `<pre>event ............ DeleteSecurityGroup · 03:12\nwho .............. unknown\nsource IP ........ unknown\naudit trail ...... none · must be tamper-proof</pre>`,
    hint: 'Probe the wreck and the log shelf, diagnose, then fill the audit bay and harden the vault. The who-dunnit replay (lever) AND the tamper drill must pass.',
  },
  objectiveFix: 'Socket the audit recorder · harden the log vault',
  objectiveDone: 'INC-3899 closed — every call on the record, records untouchable.',
  summary: 'Symptom: a destructive API call with no trace — no who, no where, no when. Fix: a multi-Region CloudTrail trail recording management events to S3 (who called which API, from which IP, when — across all Regions), hardened against tampering with S3 Object Lock/MFA-delete and CloudTrail log-file validation. CloudWatch graphs metrics, Config tracks resource STATE — only CloudTrail records the ACTOR.',
  level: [
    { id: 'wreck', kind: 'serverRack', at: [3.5, 1.5], yaw: Math.PI / 2 },
    { id: 'vault', kind: 'shelfUnit', at: [-4.5, 2], yaw: Math.PI / 2, args: ['#8f7ae6', true] },
    { id: 'lever', kind: 'chaosLever', at: [3, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'wreck', machine: 'wreck', prompt: 'Inspect the payment service',
      kicker: 'payment service', title: 'Deleted out from under us',
      pre: 'SG ............... deleted 03:12\ncaller ........... unknown\ncredentials ...... unknown\nevidence ......... none exists',
      journal: 'Payment service: its SG was deleted by an API call nobody can attribute — there is no management-event trail.',
    },
    {
      id: 'vault', machine: 'vault', prompt: 'Inspect the log shelf',
      kicker: 'log storage', title: 'Empty — and deletable',
      pre: 'audit logs ....... none captured\nbucket policy .... anyone with s3:* can purge\nintegrity ........ unverifiable',
      journal: 'Log shelf: no trail lands here — and if one did, an attacker with S3 access could quietly shred it.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-trail', kind: 'trail', label: 'CloudTrail (multi-Region trail)', spot: [-2.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-cw', kind: 'cwatch', label: 'CloudWatch dashboards', spot: [-1.7, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-config', kind: 'config', label: 'AWS Config recorder', spot: [-2.9, -5.5], visual: { hex: '#3b2f4d', glowHex: '#b48ce0' } },
      { id: 'mod-lock', kind: 'lock', label: 'Object Lock + log validation', spot: [-1.7, -5.5], visual: { hex: '#5e2a2a', glowHex: '#c96a6a', h: 0.4 } },
    ],
  },
  sockets: [
    {
      id: 'so-audit', label: 'audit bay', at: [0.5, -1.2],
      blurb: 'The recorder of RECORD: who called which API, from which IP, when — across every Region, delivered durably to S3.',
      allow: { trail: true, cwatch: true, config: true },
      refuse: {
        lock: { reason: 'That hardens the VAULT — it protects logs that exist. Something has to record them first.' },
      },
      fallback: { reason: 'The audit bay takes a recording service.' },
    },
    {
      id: 'so-vault', label: 'log vault hardening', at: [-2.5, -1.2],
      blurb: 'Tamper-proofing for the trail itself: Object Lock / MFA-delete on the bucket, plus CloudTrail log-file validation so every gap or edit is provable.',
      allow: { lock: true },
      refuse: {
        trail: { reason: 'The trail RECORDS; it can’t guard its own files. The vault wants the lock module.' },
        cwatch: { reason: 'Dashboards don’t stop deletions. The vault wants the lock module.' },
        config: { reason: 'Config tracks state — it won’t make the bucket immutable. The vault wants the lock module.' },
      },
      fallback: { reason: 'The vault takes the hardening module.' },
    },
  ],
  levers: [
    { id: 'lever-replay', machine: 'lever', prompt: 'PULL — replay the 03:12 deletion (drill)', beat: 'whodunit' },
  ],
  beats: [
    {
      id: 'whodunit', label: 'who-dunnit replay', trigger: 'lever',
      rules: [
        {
          when: { socket: { 'so-audit': 'trail' } }, pass: true,
          title: '✔ Named in ninety seconds',
          lines: 'event ............ DeleteSecurityGroup\nwho .............. assumed-role/ci-deploy/jenkins-04\nsource IP ........ 203.0.113.41\nwhen ............. 03:12:07 UTC · all Regions covered',
          note: 'Management events, recorded by default, in every Region, delivered to S3 — the who/what/when/where of every API call. The 03:12 mystery would have been a one-line query.',
        },
        {
          when: { socket: { 'so-audit': 'cwatch' } }, pass: false,
          title: '✘ Beautiful graphs, no names',
          lines: 'CPU/latency ...... graphed ✓\nAPI callers ...... not a metric\nwho .............. still unknown',
          note: 'CloudWatch is MONITORING — metrics, alarms, logs from your apps. The identity behind an API call is CloudTrail’s domain. Audit ≠ monitoring.',
        },
        {
          when: { socket: { 'so-audit': 'config' } }, pass: false,
          title: '✘ Knows the SG died — not who killed it',
          lines: 'resource state ... “SG deleted at 03:12” ✓\ncaller ........... not recorded\nwho .............. still unknown',
          note: 'Config records what your resources LOOKED like and when that changed — the state. The ACTOR behind the API call is CloudTrail’s record.',
        },
        {
          pass: false,
          title: '✘ Still a ghost story',
          lines: 'audit bay ........ empty\nevidence ......... none',
          note: 'Nothing records API activity. Socket the recorder.',
        },
      ],
    },
    {
      id: 'tamper', label: 'tamper drill', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-audit': 'trail', 'so-vault': 'lock' } }, pass: true,
          title: '✔ Shredder jammed',
          lines: 'delete attempt ... DENIED (Object Lock)\nMFA-delete ....... required, absent\nvalidation ....... digest chain intact\nattacker ......... recorded trying',
          note: 'Object Lock makes the log objects immutable for their retention window, and log-file validation proves nothing was edited or gapped — the attacker’s cleanup attempt is now ALSO in the trail.',
        },
        {
          when: { socket: { 'so-audit': 'trail' } }, pass: false,
          title: '✘ The trail shredded itself on request',
          lines: 'attacker ......... s3:DeleteObject on the logs\nresult ........... evidence gone\nvalidation ....... not enabled',
          note: 'A trail an attacker can delete is a courtesy, not a control. Harden the vault: Object Lock/MFA-delete + log-file validation.',
          alarm: 'SECURITY — AUDIT LOG TAMPERING',
        },
        {
          pass: false,
          title: '✘ Nothing to tamper with (which is worse)',
          lines: 'trail ............ missing',
          note: 'Record first, then armour the records.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Every action on an untouchable record',
    body: 'A multi-Region CloudTrail captures who/what/when/where for every management call; the vault’s Object Lock and digest validation make the record tamper-evident and tamper-proof. Monitoring graphs your metrics — the TRAIL names names. Close the ticket at the field terminal.',
    journal: 'Who-dunnit + tamper drills passed — multi-Region CloudTrail in a locked vault.',
  },
  diagnosis: {
    unlockedBy: 'wreck',
    title: 'What answers WHO/WHERE/WHEN — and survives the attacker?',
    correct: {
      label: 'A multi-Region CloudTrail trail (management events → S3), hardened with Object Lock/MFA-delete + log-file validation',
      journal: 'Diagnosis confirmed: CloudTrail for the actor record; locked, validated storage so the record survives.',
      confirmBody: 'Only CloudTrail records the identity, source IP, and timestamp behind API calls — and the trail itself must be armoured, or the first thing a competent attacker deletes is the evidence.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'CloudWatch alarms on security-group changes', rebuttal: 'Alarms tell you THAT something changed — CloudWatch has no record of WHO called the API. Monitoring and audit are different jobs.' },
      { label: 'Enable AWS Config and read the timeline', rebuttal: 'Config shows the resource’s state history — deleted at 03:12, yes. The caller’s identity lives in CloudTrail.' },
      { label: 'Ask everyone with prod access', rebuttal: 'The person who deletes a prod SG at 3 a.m. is historically not forthcoming in stand-up.' },
    ],
  },
  faultLamps: ['wreck'],
};

export const COMPLIANT_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-4571', reporter: 'compliance', sev: 'SEV-3', title: 'The Bucket That Keeps Coming Back',
    bodyHtml:
      `<div>Every few weeks, somebody flips the analytics bucket public “just to test something” — and it stays public until an auditor notices. The mandate: continuous detection, automatic correction, and a full configuration history the auditors can walk through change by change.</div>` +
      `<pre>drift ............ bucket → public, repeatedly\ndetection ........ auditors, eventually\ncorrection ....... manual, after shouting\nrequired ......... continuous · automatic · historical</pre>`,
    hint: 'Probe the bucket and the audit desk, diagnose, then socket the compliance engine and set its mode dial. The drift drill (lever) AND the history request must pass.',
  },
  objectiveFix: 'Socket the compliance engine · dial it to AUTO-REMEDIATE',
  objectiveDone: 'INC-4571 closed — drift detected, corrected, and documented.',
  summary: 'Symptom: recurring configuration drift (a bucket going public) caught late by humans. Fix: AWS Config — a recorder of resource configuration state with RULES that evaluate continuously and an AUTOMATIC REMEDIATION action that flips the bucket private within minutes, plus the full resource timeline auditors need. CloudTrail tells you who made the change; Config knows the resource is STILL wrong and can fix it. Detection without remediation is a todo list.',
  level: [
    { id: 'bucket', kind: 'shelfUnit', at: [4.5, 1.5], yaw: -Math.PI / 2, args: ['#e8a657'] },
    { id: 'desk', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2 },
    { id: 'dial', kind: 'aimPointer', at: [0.5, -2] },
    { id: 'lever', kind: 'chaosLever', at: [4, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'bucket', machine: 'bucket', prompt: 'Inspect the analytics bucket',
      kicker: 'S3 bucket', title: 'Public again by Thursday',
      pre: 'policy drift ..... public ~every 3 weeks\ncause ............ “just testing something”\ntime-to-detect ... days to weeks (humans)\ntime-to-fix ...... after the shouting',
      journal: 'Bucket: drifts public repeatedly; detection is human and slow, correction slower. Needs continuous evaluation + auto-fix.',
    },
    {
      id: 'desk', machine: 'desk', prompt: 'Inspect the audit desk',
      kicker: 'audit', title: 'They want the whole timeline',
      pre: 'request .......... every setting change, per resource\ncurrent answer ... screenshots and vibes\nneeded ........... configuration items over time',
      journal: 'Auditors want a resource-by-resource configuration history — every change, timestamped. That is a recording, not a report.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-config', kind: 'config', label: 'AWS Config rules + remediation', spot: [-2.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-trail', kind: 'trail', label: 'CloudTrail trail', spot: [-1.7, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-rota', kind: 'rota', label: 'Weekly manual checklist', spot: [-2.3, -5.5], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-comp', label: 'compliance bay', at: [0.5, 0],
      blurb: 'Continuous evaluation of resource STATE against rules — managed or custom — with the option to remediate automatically and a configuration timeline per resource.',
      allow: { config: true, trail: true },
      refuse: {
        rota: { reason: 'Humans on a rota lose to drift that happens on a Tuesday night. Continuous means a MACHINE evaluates every change.' },
      },
      fallback: { reason: 'The compliance bay takes an evaluation service.' },
    },
  ],
  dials: [
    {
      id: 'mode', machine: 'dial', initial: 'detect',
      grabPrompt: '◀ ▶ swing the remediation mode · E/Ⓧ lock',
      positions: [
        { id: 'detect', label: 'mode: DETECT ONLY', angle: 2.0 },
        { id: 'auto', label: 'mode: AUTO-REMEDIATE', angle: 1.0 },
      ],
    },
  ],
  levers: [
    { id: 'lever-drift', machine: 'lever', prompt: 'PULL — flip the bucket public (drill)', beat: 'drift' },
  ],
  beats: [
    {
      id: 'drift', label: 'drift drill', trigger: 'lever',
      rules: [
        {
          when: { socket: { 'so-comp': 'config' }, dial: { mode: 'auto' } }, pass: true,
          title: '✔ Public for 4 minutes, then not',
          lines: 'rule ............. s3-bucket-public-read-prohibited\nevaluation ....... NON_COMPLIANT within minutes\nremediation ...... automatic — policy reverted\nhumans paged ..... zero',
          note: 'The Config rule evaluates the change as it happens, and the remediation action flips the bucket private without waiting for anyone’s Thursday. Drift became a blip.',
        },
        {
          when: { socket: { 'so-comp': 'config' }, dial: { mode: 'detect' } }, pass: false,
          title: '✘ Config saw it… and filed it under Someday',
          lines: 'evaluation ....... NON_COMPLIANT ✓ (minutes)\nremediation ...... none — detect only\nbucket ........... STILL PUBLIC',
          note: 'Detection without remediation is a well-organised todo list. Swing the mode dial to AUTO-REMEDIATE and let the rule fix what it finds.',
        },
        {
          when: { socket: { 'so-comp': 'trail' } }, pass: false,
          title: '✘ Knows who flipped it — not that it’s STILL public',
          lines: 'PutBucketPolicy .. recorded, with caller ✓\ncurrent state .... not CloudTrail’s question\nbucket ........... STILL PUBLIC',
          note: 'CloudTrail records ACTIONS — who called what, when. It doesn’t evaluate whether the resource is compliant NOW. State and rules are Config’s job.',
          alarm: 'DATA EXPOSURE — BUCKET PUBLIC',
        },
        {
          pass: false,
          title: '✘ Public until an auditor gets bored',
          lines: 'compliance bay ... empty\ndetection ........ eventually, by accident',
          note: 'Socket the evaluation engine.',
          alarm: 'DATA EXPOSURE — BUCKET PUBLIC',
        },
      ],
    },
    {
      id: 'history', label: 'history request', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-comp': 'config' } }, pass: true,
          title: '✔ The resource timeline, change by change',
          lines: 'per resource ..... configuration items over time\nevery change ..... what · when · previous value\ncompliance ....... status at any point in history',
          note: 'Config’s recorder answers the auditor’s actual question: what did this resource look like, when, and when did it change. Pair with CloudTrail when they also ask WHO.',
        },
        {
          pass: false,
          title: '✘ Screenshots and vibes',
          lines: 'timeline ......... none recorded',
          note: 'The configuration history comes from the Config recorder — socket it.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Drift detected, corrected, documented',
    body: 'Config rules evaluate every change continuously, auto-remediation reverts the drift in minutes, and the recorder keeps the full timeline the auditors asked for. Config watches STATE; CloudTrail records ACTORS — together they’re the whole story. Close the ticket at the field terminal.',
    journal: 'Drift drill + history request passed — Config rules with auto-remediation.',
  },
  diagnosis: {
    unlockedBy: 'bucket',
    title: 'What keeps the bucket private FOREVER, not just today?',
    correct: {
      label: 'An AWS Config rule evaluating continuously, with an AUTOMATIC remediation action — plus Config’s resource timeline for the auditors',
      journal: 'Diagnosis confirmed: Config rule + auto-remediation; the recorder doubles as the audit timeline.',
      confirmBody: 'The bucket will go public again — someone always “tests something”. The fix is a machine that notices in minutes and reverts it without being asked. Socket the engine, and mind the mode dial.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Email the team a policy reminder', rebuttal: 'The last three reminders are how we got here. Controls beat memos.' },
      { label: 'Alert on the CloudTrail PutBucketPolicy event', rebuttal: 'Now a human gets paged to do the revert by hand at 2 a.m. — and CloudTrail never checks whether the bucket is still public afterwards.' },
      { label: 'Deny s3:PutBucketPolicy to everyone', rebuttal: 'Someone legitimately owns that bucket’s policy. Prevention that blocks the owners just breeds admin backdoors.' },
    ],
  },
  faultLamps: ['bucket'],
};
