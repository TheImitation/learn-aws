import type { MissionSpec } from '../spec';

/** Pilot batch for the declarative schema — three domains, three verb mixes:
 *  Multi-AZ (pallet+two sockets+chaos lever), VPC endpoints (pallet+socket+cost
 *  beats+insecure alarm), Route 53 (policy dial+socket+lever). */

export const MULTIAZ_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-3311', reporter: 'dba-oncall', sev: 'SEV-1', title: 'The 3 A.M. Outage',
    bodyHtml:
      `<div>Last night AZ-A browned out for 40 minutes and took the orders database with it — a total write outage, orders lost. The postmortem action is unambiguous: survive an AZ failure with automatic failover and zero data loss. Separately, the 09:00 BI report storm pins the primary every single morning.</div>` +
      `<pre>outage ........... 40 min (AZ-A brownout)\nwrites ........... DOWN for the duration\nRPO demanded ..... zero — no data loss\nreport storm ..... 09:00 daily · primary CPU 91%</pre>`,
    hint: 'Probe the site, diagnose at the field terminal, then hit the pallet: something for survival, something for the reads. The AZ drill (lever) AND the report-storm test must pass.',
  },
  objectiveFix: 'Socket the right module in each bay (AZ-B bay · read pen)',
  objectiveDone: 'INC-3311 closed — failover automatic, reports offloaded.',
  summary: 'Symptom: single-AZ primary — one AZ brownout meant a total write outage, and report storms pinned the primary. Fix: RDS Multi-AZ (synchronous standby, automatic failover, zero data loss) for availability, plus an async read replica for the report load. HA ≠ read scaling: the standby serves nothing until failover, and replicas never auto-promote for writes.',
  level: [
    { id: 'azA', kind: 'azPlate', at: [-4.5, 1.5], args: [7, 7, 'A'] },
    { id: 'azB', kind: 'azPlate', at: [4.5, 1.5], args: [7, 7, 'B'] },
    { id: 'gate', kind: 'crowdGate', at: [-8, -3], yaw: Math.PI / 2 },
    { id: 'db', kind: 'dbTower', at: [-4.5, 1.5] },
    { id: 'lever', kind: 'chaosLever', at: [0, -4.5] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'gate', machine: 'gate', prompt: 'Inspect the traffic',
      kicker: 'Traffic profile', title: 'Writes and report storms',
      pre: 'order writes ...... steady, business-critical\nBI reports ........ 09:00 storm, read-only\nboth aimed at ..... the ONE primary',
      journal: 'Traffic: critical order writes + a daily 09:00 read storm, all on the single primary.',
    },
    {
      id: 'db', machine: 'db', prompt: 'Inspect orders-db',
      kicker: 'orders-db · RDS', title: 'One AZ, no net',
      pre: 'deployment ........ SINGLE-AZ\nstandby ........... none\nlast night ........ AZ-A down → db down\nreport storm CPU .. 91%',
      body: 'Everything lives in AZ-A. When the zone blinked, there was nothing anywhere else to take over.',
      journal: 'orders-db: single-AZ, no standby — the AZ brownout WAS the outage. CPU 91% under report storms.',
    },
    {
      id: 'lever', machine: 'lever', prompt: 'Inspect the chaos lever',
      kicker: 'Chaos drill', title: 'Fail AZ-A on demand',
      body: 'The postmortem demands proof: pull this during verification to brown out AZ-A and watch what survives.',
      journal: 'Chaos lever armed: the sign-off requires surviving a staged AZ-A failure.',
    },
  ],
  pallet: {
    at: [5.5, -5],
    modules: [
      { id: 'mod-standby', kind: 'standby', label: 'Multi-AZ synchronous standby', spot: [4.9, -4.6], visual: { hex: '#3f5668', glowHex: '#6fb1d8', cyl: true, w: 0.6, h: 0.62 } },
      { id: 'mod-rep1', kind: 'replica', label: 'Read replica (async)', spot: [6.1, -4.6], visual: { hex: '#4b3f68', glowHex: '#8f7ae6', cyl: true, w: 0.6, h: 0.62 } },
      { id: 'mod-rep2', kind: 'replica', label: 'Read replica (async)', spot: [4.9, -5.4], visual: { hex: '#4b3f68', glowHex: '#8f7ae6', cyl: true, w: 0.6, h: 0.62 } },
      { id: 'mod-runbook', kind: 'runbook', label: 'Manual failover runbook', spot: [6.1, -5.4], visual: { hex: '#6e5a3e', glowHex: '#c9a35c', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-standby', label: 'standby bay (AZ-B)', at: [4.5, 1.5],
      blurb: 'The standby bay in the OTHER zone: a synchronous copy that promotes automatically when AZ-A dies. Invisible to reads until that moment.',
      allow: { standby: true },
      refuse: {
        replica: { reason: 'An ASYNC read replica is not a standby: replication lag risks data loss on failover, and promotion is a manual, minutes-long affair. This bay needs a SYNCHRONOUS standby.' },
        runbook: { reason: 'A runbook is not high availability — someone still wakes up at 3 a.m., and the RTO is measured in coffee.' },
      },
      fallback: { reason: 'That doesn’t belong in the standby bay.' },
    },
    {
      id: 'so-pen', label: 'read pen (reports)', at: [-1.5, 5],
      blurb: 'The read pen: rack an async replica here and point the BI reports at it — the primary keeps its cycles for writes.',
      allow: { replica: true },
      refuse: {
        standby: { reason: 'A Multi-AZ standby is INVISIBLE until failover — it serves no reads at all. Scaling reads is the replica’s job.' },
        runbook: { reason: 'The BI team cannot query a PDF.' },
      },
      fallback: { reason: 'That doesn’t belong in the read pen.' },
    },
  ],
  levers: [
    { id: 'lever-drill', machine: 'lever', prompt: 'PULL — fail AZ-A (drill)', beat: 'drill' },
  ],
  sim: [
    { id: 'gate', machine: 'gate', route: [{ to: 'dbp' }] },
    { id: 'gateR', machine: 'gate', route: [{ when: { socket: { 'so-pen': 'replica' } }, to: 'pen' }, { to: 'dbp' }] },
    {
      id: 'dbp', machine: 'db',
      route: [
        { when: { azDead: 'azA', socket: { 'so-standby': 'standby' } }, to: 'sb' },
        { when: { azDead: 'azA' }, to: 'drop' },
        { to: 'deliver' },
      ],
    },
    { id: 'sb', at: [4.5, 1.5], route: [{ to: 'deliver' }] },
    { id: 'pen', at: [-1.5, 5], route: [{ to: 'deliver' }] },
  ],
  beats: [
    {
      id: 'drill', label: 'AZ-failure drill', trigger: 'lever',
      mutate: ['azDead:azA'],
      spawn: { node: 'gate', kind: 'write', n: 6, spacing: 0.3 },
      rules: [
        {
          when: { socket: { 'so-standby': 'standby' } }, pass: true,
          title: '✔ Failover in 47 s — writes kept flowing',
          lines: 'AZ-A ............. FAILED (drill)\nfailover ......... automatic · 47 s\ndata loss ........ none (synchronous)\nwrites ........... flowing',
          note: 'The synchronous standby in AZ-B was promoted automatically — same data to the last commit. That is exactly what Multi-AZ buys.',
        },
        {
          pass: false,
          title: '✘ WRITE OUTAGE — again',
          lines: 'AZ-A ............. FAILED (drill)\nfailover ......... NO TARGET\nwrites ........... DOWN\nreads ............ stale at best',
          note: 'Nothing stood by to take over. Async replicas can’t save you here — lag risks data loss and promotion is manual. Socket a SYNCHRONOUS standby in the AZ-B bay.',
          alarm: 'WRITE OUTAGE — NO FAILOVER TARGET',
        },
      ],
    },
    {
      id: 'reports', label: 'report-storm test', trigger: 'terminal',
      spawn: { node: 'gateR', kind: 'read', n: 8, spacing: 0.25 },
      rules: [
        {
          when: { socket: { 'so-pen': 'replica' } }, pass: true,
          title: '✔ Reports offloaded — primary at 34%',
          lines: 'BI reads ......... → read replica (async)\nprimary CPU ...... 34%\nwrite latency .... nominal',
          note: 'The async replica carries the report storm; the primary keeps its cycles for writes. Standby for survival, replicas for read scale — different tools.',
        },
        {
          pass: false,
          title: '✘ Primary at 91% — reports drown the writes',
          lines: 'BI reads ......... → PRIMARY\nprimary CPU ...... 91%\nwrite latency .... spiking',
          note: 'The standby can’t help — it serves nothing until failover. Rack a READ REPLICA in the pen and aim the reports there.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Survives the zone, serves the storm',
    body: 'Multi-AZ standby for automatic failover, read replica for the report storm. HA and read scaling are different problems with different tools — used together here. Close the ticket at the field terminal.',
    journal: 'AZ drill + report storm passed — Multi-AZ standby + read replica.',
  },
  diagnosis: {
    unlockedBy: 'db',
    title: 'Why did one AZ take the whole database down?',
    correct: {
      label: 'The primary is single-AZ with no synchronous standby — deploy Multi-AZ for automatic failover, and use replicas only for the read load',
      journal: 'Diagnosis confirmed: single-AZ primary. Multi-AZ standby for HA; replicas for reads.',
      confirmBody: 'The zone failure was always going to be the database failure — nothing stood ready anywhere else. Carry a synchronous standby to the AZ-B bay, and give the report storm its own replica in the read pen.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Backups were too infrequent — increase snapshot frequency', rebuttal: 'Backups protect DURABILITY, not availability. Restoring a snapshot is an hours-long RTO — the ticket demands automatic failover.' },
      { label: 'Not enough read replicas — add two more', rebuttal: 'Replicas scale READS. They replicate asynchronously and don’t auto-promote — the outage was about WRITES surviving a zone failure.' },
      { label: 'The instance class is too small', rebuttal: 'CPU was idle at 3 a.m. — the zone was gone. Capacity does not survive a zone failure; a standby elsewhere does.' },
    ],
  },
  faultLamps: ['db'],
};

export const VPC_ENDPOINTS_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-5150', reporter: 'finops', sev: 'SEV-3', title: 'The NAT Toll',
    bodyHtml:
      `<div>The analytics fleet in the private subnet pulls 75 TB a month from S3 — and every byte rides through the NAT gateway’s per-GB meter, out to the public AWS edge and back in. FinOps wants the toll gone; security wants the traffic off the public path entirely.</div>` +
      `<pre>NAT processing ... $3,375/mo  ▲\nS3 transfer ...... 75 TB/mo (analytics)\nbudget ........... $150/mo\nsecurity note .... S3 fetches cross the public edge</pre>`,
    hint: 'Probe the toll road, diagnose at the field terminal, then pick the right hatch from the pallet. The bill AND the private-path audit must both pass.',
  },
  objectiveFix: 'Socket a private path to S3 (pallet → private path bay)',
  objectiveDone: 'INC-5150 closed — private hatch open, toll booth idle.',
  summary: 'Symptom: 75 TB/mo to S3 through the NAT gateway — $3,400 of per-GB processing for traffic that never needed to leave AWS. Fix: a Gateway VPC endpoint (free for S3/DynamoDB) routed from the private subnet. Interface endpoints (PrivateLink) suit other services but bill hourly + per-GB; the endpoint policy scopes access; traffic never touches the public edge.',
  level: [
    { id: 'analytics', kind: 'serverRack', at: [-5, 2], yaw: Math.PI / 2 },
    { id: 'nat', kind: 'natAirlock', at: [-1, 2], yaw: Math.PI / 2 },
    { id: 'igw', kind: 'internetGate', at: [2.5, 2], yaw: Math.PI / 2 },
    { id: 's3', kind: 'shelfUnit', at: [6.5, 2], yaw: -Math.PI / 2, args: ['#e8a657'] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'analytics', machine: 'analytics', prompt: 'Inspect analytics fleet',
      kicker: 'analytics · private subnet', title: 'Hungry, and far from the pantry',
      pre: 'S3 reads ......... 75 TB/mo\nroute to S3 ...... 0.0.0.0/0 → NAT\ninternet needs ... none besides S3',
      journal: 'Analytics: 75 TB/mo from S3, all routed through the NAT — and S3 is its only “internet” destination.',
    },
    {
      id: 'nat', machine: 'nat', prompt: 'Inspect NAT gateway',
      kicker: 'NAT gateway', title: 'The toll booth',
      pre: 'processing ....... $0.045/GB · both ways\nthis month ....... $3,375 and climbing\ncapacity ......... fine — cost is per-GB, not size',
      body: 'Every S3 byte pays the toll out AND back. The booth doesn’t care that the pantry is next door.',
      journal: 'NAT: $0.045/GB processing — $3,375/mo. The charge is per-GB processed, not capacity.',
    },
    {
      id: 'igw', machine: 'igw', prompt: 'Inspect internet edge',
      kicker: 'Internet gateway', title: 'The long way round',
      body: 'S3 traffic exits to the public AWS edge and re-enters — a public hop for data that starts and ends inside AWS. The auditors have opinions.',
      journal: 'Edge: S3 traffic crosses the public edge both ways — exposure the auditors flagged.',
    },
    {
      id: 's3', machine: 's3', prompt: 'Inspect the S3 pantry',
      kicker: 'S3 · same region', title: 'Twelve milliseconds away',
      body: 'The bucket lives in this very region — the highway detour is pure route-table habit.',
      journal: 'S3: same-region bucket. The detour is routing, not distance.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-gw', kind: 'gw-endpoint', label: 'Gateway VPC endpoint (S3)', spot: [-2.6, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-if', kind: 'if-endpoint', label: 'Interface endpoint (PrivateLink)', spot: [-1.4, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-pub', kind: 'public', label: '“Just make the bucket public” kit', spot: [-2, -5.4], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.34 } },
    ],
  },
  sockets: [
    {
      id: 'so-path', label: 'private path bay', at: [2.5, -1.5],
      blurb: 'A private hatch from the VPC straight to AWS services — traffic that never meets the public edge. Gateway endpoints (S3/DynamoDB) ride the route table for free; Interface endpoints put a billable ENI in your subnet.',
      allow: { 'gw-endpoint': true, 'if-endpoint': true },
      refuse: {
        public: { reason: 'BLOCKED: a public bucket is not a network design — it’s a breach with a billing page.', alarm: 'SECURITY — PUBLIC BUCKET ATTEMPT' },
      },
      fallback: { reason: 'That doesn’t belong in the path bay.' },
    },
  ],
  sim: [
    { id: 'src', machine: 'analytics', route: [{ when: { socket: { 'so-path': 'any' } }, to: 'ep' }, { to: 'natN' }] },
    { id: 'natN', machine: 'nat', route: [{ to: 'igwN' }] },
    { id: 'igwN', machine: 'igw', route: [{ to: 's3N' }] },
    { id: 'ep', at: [2.5, -1.5], route: [{ to: 's3N' }] },
    { id: 's3N', machine: 's3', route: [{ to: 'deliver' }] },
  ],
  beats: [
    {
      id: 'bill', label: 'bill review', trigger: 'terminal', infoInInvestigate: true,
      spawn: { node: 'src', kind: 'fetch', n: 6, spacing: 0.3 },
      rules: [
        {
          when: { socket: { 'so-path': 'gw-endpoint' } }, pass: true,
          title: '✔ $28/mo — the toll road is empty',
          lines: 'NAT processing ... $28 (residual)\ngateway endpoint . $0 — free for S3\nTOTAL ............ $28   (budget $150)',
          note: 'Gateway endpoints for S3 and DynamoDB cost nothing: the route table sends S3 traffic through the hatch and the NAT meter stops.',
        },
        {
          when: { socket: { 'so-path': 'if-endpoint' } }, pass: false,
          title: '✘ $772/mo — private, but pricey',
          lines: 'interface ENIs ... $22/mo hourly\nper-GB ........... $750 @ $0.01/GB\nTOTAL ............ $772   (budget $150)',
          note: 'PrivateLink works — but it bills hourly per ENI plus per-GB. For S3 and DynamoDB the GATEWAY endpoint does the same job for FREE. Save Interface endpoints for services that need them (Secrets Manager, SQS…).',
        },
        {
          pass: false,
          title: '✘ $3,408/mo — the NAT toll',
          lines: 'NAT processing ... $3,375 @ $0.045/GB × 75 TB\nNAT hourly ....... $33\nTOTAL ............ $3,408   (budget $150)',
          note: 'Every S3 byte pays the toll both ways — for data that never needed to leave AWS at all.',
        },
      ],
    },
    {
      id: 'audit', label: 'private-path audit', trigger: 'terminal',
      spawn: { node: 'src', kind: 'fetch', n: 4, spacing: 0.35 },
      rules: [
        {
          when: { socket: { 'so-path': 'any' } }, pass: true,
          title: '✔ Traffic never leaves the AWS network',
          lines: 'path ............. VPC → endpoint → S3\npublic exposure .. none\nendpoint policy .. scoped to one bucket',
          note: 'The endpoint policy pins access to exactly one bucket — private, cheaper, and scoped. Security signs off.',
        },
        {
          pass: false,
          title: '✘ S3 traffic crosses the public edge',
          lines: 'path ............. VPC → NAT → public edge → S3\npublic exposure .. every fetch, both ways',
          note: 'The auditors flagged the public hop. Keep AWS-service traffic inside AWS with a VPC endpoint.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Private hatch open — toll booth idle',
    body: 'S3 traffic now flows through the free Gateway endpoint: $3,380/mo cheaper, never touches the public edge, and the endpoint policy scopes it to the one bucket. Close the ticket at the field terminal.',
    journal: 'Bill + private-path audit passed — Gateway VPC endpoint.',
  },
  diagnosis: {
    unlockedBy: 'nat',
    title: 'Why does reaching S3 cost $3,400 a month?',
    correct: {
      label: 'S3 traffic takes the public toll road through NAT — open a private GATEWAY endpoint (free for S3/DynamoDB) so the VPC reaches S3 directly',
      journal: 'Diagnosis confirmed: NAT per-GB toll on S3 traffic — a Gateway VPC endpoint removes the road entirely.',
      confirmBody: 'The pantry is in the same region; the toll road is a route-table habit. Carry the right hatch to the private path bay — and mind the pallet: not every private option is a free one.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Compress the data before transfer', rebuttal: 'That shrinks the toll but keeps the toll road — the per-GB meter still runs on every byte, and the public hop remains.' },
      { label: 'Provision a bigger NAT gateway', rebuttal: 'NAT charges are per-GB PROCESSED, not capacity. A bigger toll booth charges the same toll.' },
      { label: 'Move the instances to a public subnet', rebuttal: 'Exposing the fleet to the internet to dodge a toll is a security regression — and public-subnet egress still bills.' },
    ],
  },
  faultLamps: ['nat'],
};

export const DNS_ROUTING_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-6404', reporter: 'sre-global', sev: 'SEV-2', title: 'One Region for Everyone',
    bodyHtml:
      `<div>Three identical stacks — us-east-1, eu-central-1, ap-south-1 — and one DNS record that sends every human on Earth to us-east-1. EU and AP users crawl. And when us-east-1 blipped last Tuesday, the “global” product went globally dark.</div>` +
      `<pre>p95 latency ...... US 40 ms · EU 190 ms · AP 260 ms\nstacks ........... 3 regions · 2 idle\nlast Tuesday ..... us-east-1 blip = GLOBAL outage\nDNS .............. one record → us-east-1</pre>`,
    hint: 'Probe the traffic, diagnose, then swing the policy dial — and give DNS a way to KNOW a region is dead. The latency test AND the region-failure drill must pass.',
  },
  objectiveFix: 'Swing the policy dial · socket the health-check probe',
  objectiveDone: 'INC-6404 closed — nearest healthy region for everyone.',
  summary: 'Symptom: one DNS record pinned the world to us-east-1 — oceans of latency and a single point of global failure. Fix: latency-based routing (nearest region per user) plus health checks so a failing region drops out of DNS answers. Weighted is for canary splits, geolocation for residency pinning, failover for active/standby — pick the policy per problem, and none of them route around death without health checks.',
  level: [
    { id: 'world', kind: 'crowdGate', at: [-8, 0], yaw: Math.PI / 2 },
    { id: 'policy', kind: 'aimPointer', at: [-4, 0] },
    { id: 'use1', kind: 'serverRack', at: [2, -4.5], yaw: Math.PI / 2 },
    { id: 'euc1', kind: 'serverRack', at: [3.5, 0], yaw: Math.PI / 2 },
    { id: 'aps1', kind: 'serverRack', at: [2, 4.5], yaw: Math.PI / 2 },
    { id: 'lever', kind: 'chaosLever', at: [-1, -4.5] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'world', machine: 'world', prompt: 'Inspect the users',
      kicker: 'Global traffic', title: 'Everyone through one door',
      pre: 'US users ......... 40 ms\nEU users ......... 190 ms (transatlantic)\nAP users ......... 260 ms (round the world)\nanswered by ...... us-east-1, always',
      journal: 'Users on three continents, all answered with us-east-1 — the latency IS the geography.',
    },
    {
      id: 'use1', machine: 'use1', prompt: 'Inspect us-east-1 stack',
      kicker: 'us-east-1', title: 'Carrying the world',
      pre: 'load ............. 100% of global traffic\nlast Tuesday ..... 8-min blip = global outage\nhealth check ..... none configured',
      journal: 'us-east-1 carries everything; its 8-minute blip was a global outage. No health checks exist.',
    },
    {
      id: 'euc1', machine: 'euc1', prompt: 'Inspect eu-central-1 stack',
      kicker: 'eu-central-1', title: 'Idle by DNS decree',
      body: 'A full, healthy stack — serving nobody, because no DNS answer ever mentions it. ap-south-1 says hello too.',
      journal: 'eu-central-1 and ap-south-1: identical, healthy, idle — DNS never sends anyone.',
    },
    {
      id: 'dial', machine: 'policy', prompt: '', kicker: '', title: '',
      journal: 'Routing policy dial inspected: currently a single record pinned to us-east-1.',
    },
  ],
  pallet: {
    at: [-4.5, -5],
    modules: [
      { id: 'mod-hc', kind: 'probe', label: 'Route 53 health-check probe', spot: [-5.1, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-ttl', kind: 'ttl', label: 'TTL 86400 cache card', spot: [-3.9, -4.6], visual: { hex: '#6e5a3e', glowHex: '#c9a35c', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-hc', label: 'health-check bay', at: [-1, 1.8],
      blurb: 'Health checks are DNS’s eyes: a probe per region, and unhealthy endpoints drop out of the answers. No probe, no routing around failure — for ANY policy.',
      allow: { probe: true },
      refuse: {
        ttl: { reason: 'A day-long TTL glues every resolver to the answer it already has — including the dead one. Keep TTLs SHORT so failover can actually fail over.' },
      },
      fallback: { reason: 'That doesn’t belong in the health-check bay.' },
    },
  ],
  dials: [
    {
      id: 'dial', machine: 'policy', initial: 'single',
      grabPrompt: '◀ ▶ swing the routing policy · E/Ⓧ lock',
      positions: [
        { id: 'single', label: 'single record → us-east-1', angle: 2.3 },
        { id: 'weighted', label: 'weighted 33/33/33', angle: 1.7 },
        { id: 'latency', label: 'latency-based', angle: 1.1 },
        { id: 'geo', label: 'geolocation (EU pin)', angle: 0.5 },
      ],
    },
  ],
  levers: [
    { id: 'lever-drill', machine: 'lever', prompt: 'PULL — fail us-east-1 (drill)', beat: 'drill' },
  ],
  sim: [
    {
      id: 'world', machine: 'world',
      route: [
        { when: { dial: { dial: 'latency' }, azDead: 'use1', socket: { 'so-hc': 'probe' } }, to: 'eu' },
        { when: { dial: { dial: 'latency' }, azDead: 'use1' }, to: 'us' },
        { when: { dial: { dial: 'latency' } }, to: 'eu' },
        { when: { dial: { dial: 'geo' } }, to: 'eu' },
        { to: 'us' },
      ],
    },
    { id: 'us', machine: 'use1', route: [{ when: { azDead: 'use1' }, to: 'drop' }, { to: 'deliver' }] },
    { id: 'eu', machine: 'euc1', route: [{ to: 'deliver' }] },
  ],
  beats: [
    {
      id: 'latency', label: 'global latency test', trigger: 'terminal', infoInInvestigate: true,
      spawn: { node: 'world', kind: 'user', n: 9, spacing: 0.22 },
      rules: [
        {
          when: { dial: { dial: 'latency' } }, pass: true,
          title: '✔ p95 62 ms worldwide',
          lines: 'US ............... 38 ms (us-east-1)\nEU ............... 54 ms (eu-central-1)\nAP ............... 71 ms (ap-south-1)\npolicy ........... latency-based',
          note: 'Each resolver now gets the region with the lowest measured latency — the idle stacks finally earn their keep.',
        },
        {
          when: { dial: { dial: 'weighted' } }, pass: false,
          title: '✘ p95 still 210 ms for a third of the EU',
          lines: 'policy ........... weighted 33/33/33\nEU → us-east ..... 1 in 3 still crosses the ocean\nAP → eu-central .. random',
          note: 'Weighted splits traffic BLINDLY — perfect for canary releases, useless for proximity. Latency-based routing answers by measured round-trip time.',
        },
        {
          when: { dial: { dial: 'geo' } }, pass: false,
          title: '✘ AP users still cross the world',
          lines: 'policy ........... geolocation (EU pin)\nEU ............... 54 ms ✓\nAP ............... 260 ms ✗',
          note: 'Geolocation pins users by WHERE THEY LIVE — the tool for data-residency rules, not for performance. The EU is happy; everyone else still queues for us-east-1.',
        },
        {
          pass: false,
          title: '✘ p95 260 ms — one door for the world',
          lines: 'policy ........... single record → us-east-1\nEU ............... 190 ms\nAP ............... 260 ms',
          note: 'One answer for every resolver on Earth. Swing the policy dial.',
        },
      ],
    },
    {
      id: 'drill', label: 'region-failure drill', trigger: 'lever',
      mutate: ['azDead:use1'],
      spawn: { node: 'world', kind: 'user', n: 6, spacing: 0.3 },
      rules: [
        {
          when: { dial: { dial: 'latency' }, socket: { 'so-hc': 'probe' } }, pass: true,
          title: '✔ us-east-1 dropped from answers in 90 s',
          lines: 'health check ..... FAILING (us-east-1)\nDNS answers ...... eu-central-1 · ap-south-1\nusers ............ rerouted — none stranded',
          note: 'The health check turned the dead region OFF at the DNS layer, and latency routing sent everyone to the nearest survivor. Policies only route around failure when health checks feed them.',
        },
        {
          pass: false,
          title: '✘ DNS kept answering with a dead region',
          lines: 'health check ..... NONE\nDNS answers ...... still include us-east-1\nUS users ......... connection timeouts',
          note: 'Route 53 had no idea the region died — it kept handing out the corpse. Socket the health-check probe in its bay, then drill again.',
          alarm: 'GLOBAL OUTAGE — DEAD REGION IN DNS ANSWERS',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Nearest healthy region, every time',
    body: 'Latency-based routing sends each user to the fastest region; health checks pull dead regions out of the answers. Weighted is for canaries, geolocation for residency — a policy per problem. Close the ticket at the field terminal.',
    journal: 'Latency test + region drill passed — latency policy + health checks.',
  },
  diagnosis: {
    unlockedBy: 'world',
    title: 'Why are EU and AP users slow — and why did one region kill everyone?',
    correct: {
      label: 'One DNS record pins the world to us-east-1 — switch to LATENCY-BASED routing with HEALTH CHECKS so each user hits the nearest healthy region',
      journal: 'Diagnosis confirmed: single-record DNS. Latency policy + health checks.',
      confirmBody: 'The 190 ms is the ocean, not the servers. Swing the dial to latency-based — and remember DNS can only route around a failure it can SEE: socket the health-check probe.',
      actionLabel: 'To the dial →',
    },
    wrongs: [
      { label: 'Add more instances in us-east-1', rebuttal: 'Capacity won’t shorten a transatlantic round trip — the 190 ms is the ocean, not the queue.' },
      { label: 'Lower the record’s TTL to 60 seconds', rebuttal: 'A short TTL helps answers CHANGE quickly — but the answer is still “us-east-1” for everyone. Prerequisite, not fix.' },
      { label: 'Switch everyone to geolocation routing', rebuttal: 'Geolocation pins users by residency rules — the compliance tool. It neither chases the lowest latency nor routes around failure by itself.' },
    ],
  },
  faultLamps: ['use1'],
};
