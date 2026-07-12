import type { MissionSpec } from '../spec';

/** High-Performing batch 1 — five specs. */

export const CDN_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-2301', reporter: 'media-team', sev: 'SEV-3', title: 'The Slow Video Site',
    bodyHtml:
      `<div>All media sits in one S3 Region. Sydney and São Paulo buffer forever, the origin pays full price for every byte, and seven years of audit logs sit in Standard storage “because nobody configured anything else”.</div>` +
      `<pre>assets ........... S3, one Region\nfar users ........ 4–9 s first paint\norigin load ...... every request, worldwide\naudit logs ....... 7-year retention · never read · Standard</pre>`,
    hint: 'Probe the bucket and the users, diagnose, then socket the edge and swing the log-class dial. Global-load test AND archive bill must pass.',
  },
  objectiveFix: 'Socket the edge cache · dial the audit logs to Deep Archive',
  objectiveDone: 'INC-2301 closed — cached at the edge, archived in the deep.',
  summary: 'Symptom: one-Region S3 serving the planet raw, and never-read logs parked in Standard for seven years. Fix: CloudFront in front of the bucket — edge locations cache near users, cutting latency and origin load (first hit per edge is a cache miss that fills from origin; tune TTLs). Cold logs transition by lifecycle rule to Glacier Deep Archive: hours-long retrieval is fine for data you hope never to read. S3 stays the durable origin; the CDN does the running around.',
  level: [
    { id: 'users', kind: 'crowdGate', at: [-8, 0], yaw: Math.PI / 2 },
    { id: 'bucket', kind: 'shelfUnit', at: [4.5, 1.5], yaw: -Math.PI / 2, args: ['#e8a657'] },
    { id: 'dial', kind: 'aimPointer', at: [-2, -2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'bucket', machine: 'bucket', prompt: 'Inspect the media bucket',
      kicker: 'S3 origin', title: 'Serving the planet, solo',
      pre: 'requests ......... 100% hit the origin\nSydney p95 ....... 8.4 s\nlogs ............. 7 y retention, Standard, never read',
      journal: 'Bucket: every request worldwide lands on the one origin — and seven years of never-read logs pay Standard rates.',
    },
    {
      id: 'users', machine: 'users', prompt: 'Inspect the audience',
      kicker: 'global users', title: 'Oceans away from the origin',
      pre: 'US ............... fine\nEU/AP/SA ......... buffering\ncause ............ distance, not capacity',
      journal: 'Audience: global; the latency is geography. Copies must live NEAR users.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-cf', kind: 'cf', label: 'CloudFront distribution', spot: [-2.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-multi', kind: 'multibucket', label: 'Copy the bucket to 12 Regions', spot: [-1.7, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-big', kind: 'bigbucket', label: '“A bigger bucket” (it’s a bucket)', spot: [-2.3, -5.5], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-edge', label: 'edge bay', at: [0.5, -1.2],
      blurb: 'The delivery layer in front of the origin: hundreds of edge locations caching close to users, absorbing the read load.',
      allow: { cf: true, multibucket: true },
      refuse: {
        bigbucket: { reason: 'S3 doesn’t have a “bigger” — it already scales. The problem is DISTANCE, not capacity.' },
      },
      fallback: { reason: 'The edge bay takes a delivery layer.' },
    },
  ],
  dials: [
    {
      id: 'logclass', machine: 'dial', initial: 'standard',
      grabPrompt: '◀ ▶ swing the log storage class · E/Ⓧ lock',
      positions: [
        { id: 'standard', label: 'audit logs: Standard forever', angle: 2.0 },
        { id: 'deep', label: 'audit logs: lifecycle → Deep Archive', angle: 1.0 },
      ],
    },
  ],
  beats: [
    {
      id: 'load', label: 'global-load test', trigger: 'terminal', infoInInvestigate: true,
      rules: [
        {
          when: { socket: { 'so-edge': 'cf' } }, pass: true,
          title: '✔ Sydney p95: 240 ms — served from the edge',
          lines: 'cache hits ....... 94% at edge locations\norigin load ...... −94%\nfirst request .... cache miss → fills from origin\nTTLs ............. tuned per path',
          note: 'CloudFront caches at the edge nearest each user; the origin only sees misses. The very first hit per edge is always a miss — that’s the fill, not a fault.',
        },
        {
          when: { socket: { 'so-edge': 'multibucket' } }, pass: false,
          title: '✘ Twelve buckets, one sync nightmare',
          lines: 'storage cost ..... ×12\nconsistency ...... eventually, hopefully\nrouting .......... you built DNS logic too',
          note: 'Replicating whole buckets buys 12 storage bills and a sync problem — a CDN caches ON DEMAND at hundreds of edges for a fraction of it.',
        },
        {
          pass: false,
          title: '✘ Still buffering in Sydney',
          lines: 'edge bay ......... empty',
          note: 'Socket the delivery layer.',
        },
      ],
    },
    {
      id: 'archive', label: 'archive bill review', trigger: 'terminal',
      rules: [
        {
          when: { dial: { logclass: 'deep' } }, pass: true,
          title: '✔ Log storage: −95%',
          lines: 'lifecycle ........ Standard → Deep Archive @30 d\nretrieval ........ hours — fine for never-read\n7-y bill ......... a rounding error now',
          note: 'Deep Archive is for data you keep and hope never to read — hours-long retrieval in exchange for ~$1/TB. Lifecycle rules do the moving.',
        },
        {
          pass: false,
          title: '✘ Seven years at premium rates',
          lines: 'logs ............. Standard, forever\nreads ............ none, ever',
          note: 'Cold data in the hottest class — swing the dial to the lifecycle rule.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Edge-cached, deep-archived',
    body: 'CloudFront serves the world from the nearest edge while the origin rests; the never-read logs age into Deep Archive by rule. Close the ticket at the field terminal.',
    journal: 'Global-load + archive bill passed — CloudFront + lifecycle to Deep Archive.',
  },
  diagnosis: {
    unlockedBy: 'bucket',
    title: 'Why is the site slow abroad — and the bill high at rest?',
    correct: {
      label: 'No edge layer (every request crosses the world to one origin) and no lifecycle on cold logs — CloudFront in front, Deep Archive behind',
      journal: 'Diagnosis confirmed: CDN for distance; lifecycle for cold data.',
      confirmBody: 'Latency is geography: cache near users. And storage class is access pattern: never-read logs belong in the deep.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Bigger instances in front of S3', rebuttal: 'There are no instances — S3 scales itself. The 8 seconds is the OCEAN, not the origin.' },
      { label: 'Move the bucket to a central Region', rebuttal: 'Now everyone is medium-far. Caching at edges makes everyone CLOSE.' },
      { label: 'Compress the videos harder', rebuttal: 'Smaller payloads over the same 300 ms round trips — still seconds to first frame abroad.' },
    ],
  },
  faultLamps: ['bucket'],
};

export const PANTRY_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-4102', reporter: 'commerce', sev: 'SEV-2', title: 'Two Workloads, One Database',
    bodyHtml:
      `<div>Everything lives in one overworked PostgreSQL: the ORDERS system (transactions across orders, inventory, payments — plus ad-hoc reporting) and the SESSION store (millions of key lookups a second, needs constant speed). Each workload is starving the other. Give each its right home.</div>` +
      `<pre>orders ........... ACID across 3 tables · reporting\nsessions ......... key lookups · huge scale · ms speed\ntoday ............ both in one Postgres, both suffering</pre>`,
    hint: 'Probe both workloads, diagnose, then socket the right engine at each station. Both workload tests must pass.',
  },
  objectiveFix: 'Match each workload station to its engine',
  objectiveDone: 'INC-4102 closed — relations to RDS, key-values to DynamoDB.',
  summary: 'Symptom: a transactional orders system and a massive key-value session store fighting over one Postgres. Fix: match store to ACCESS PATTERN — RDS/Aurora for the orders (ACID transactions, joins, ad-hoc SQL; read replicas absorb the reporting), DynamoDB for sessions (key/item lookups at huge scale with predictable single-digit-ms latency; reads eventually consistent by default, strong reads opt-in; design a high-cardinality partition key or a hot celebrity item throttles its partition).',
  level: [
    { id: 'orders', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2 },
    { id: 'sessions', kind: 'serverRack', at: [4.5, 1.5], yaw: -Math.PI / 2 },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'orders', machine: 'orders', prompt: 'Inspect the orders workload',
      kicker: 'orders', title: 'Transactions and joins',
      pre: 'writes ........... ACID across orders/inventory/payments\nreads ............ ad-hoc SQL reports, growing\nshape ............ RELATIONAL, through and through',
      journal: 'Orders: multi-table transactions and ad-hoc reporting — the relational shape.',
    },
    {
      id: 'sessions', machine: 'sessions', prompt: 'Inspect the session workload',
      kicker: 'sessions', title: 'A million tiny lookups',
      pre: 'access ........... get/put by session id\nvolume ........... millions/s at peak\nneed ............. constant single-digit ms\njoins ............ none, ever',
      journal: 'Sessions: pure key/item access at massive scale needing constant latency — the key-value shape.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-rds', kind: 'rds', label: 'RDS/Aurora (+ read replicas)', spot: [-2.9, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0', cyl: true, w: 0.6, h: 0.62 } },
      { id: 'mod-ddb', kind: 'ddb', label: 'DynamoDB table', spot: [-1.7, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-one', kind: 'onedb', label: '“One database is simpler” plaque', spot: [-2.3, -5.5], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'st-orders', label: 'orders station', at: [-2, 0.5],
      blurb: 'The transactional workload: ACID across tables, joins, ad-hoc SQL reporting.',
      allow: { rds: true, ddb: true },
      refuse: { onedb: { reason: 'That plaque is how both workloads ended up starving each other. Match the engine to the shape.' } },
      fallback: { reason: 'The station takes a database engine.' },
    },
    {
      id: 'st-sessions', label: 'sessions station', at: [2, 0.5],
      blurb: 'The key-value workload: get/put by key, massive scale, constant speed.',
      allow: { rds: true, ddb: true },
      refuse: { onedb: { reason: 'That plaque is how both workloads ended up starving each other. Match the engine to the shape.' } },
      fallback: { reason: 'The station takes a database engine.' },
    },
  ],
  beats: [
    {
      id: 'orders', label: 'orders test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'st-orders': 'rds' } }, pass: true,
          title: '✔ Transactions commit, reports fly on replicas',
          lines: 'ACID ............. across all three tables\nreporting ........ ad-hoc SQL → read replicas\nprimary .......... writes only, calm',
          note: 'Relational data with joins and transactions is RDS/Aurora territory — and the growing report load rides read replicas, not the primary.',
        },
        {
          when: { socket: { 'st-orders': 'ddb' } }, pass: false,
          title: '✘ Where did the joins go?',
          lines: 'transaction ...... limited, single-table shapes\nad-hoc report .... full scan, slow, expensive\nfit .............. wrong shape',
          note: 'DynamoDB is brilliant at keys, not at multi-table ACID and ad-hoc SQL. The orders workload is relational — give it a relational engine.',
        },
        { pass: false, title: '✘ Orders still starving', lines: 'station .......... empty', note: 'Socket an engine at the orders station.' },
      ],
    },
    {
      id: 'sessions', label: 'sessions test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'st-sessions': 'ddb' } }, pass: true,
          title: '✔ 4 ms at any scale, forever',
          lines: 'lookups .......... single-digit ms, flat\nscale ............ effectively unlimited\nkey design ....... HIGH-cardinality partition key\nconsistency ...... eventual by default, strong opt-in',
          note: 'Key/item access at huge scale is DynamoDB’s home turf — just keep the partition key high-cardinality, or one celebrity item makes a hot partition and throttles.',
        },
        {
          when: { socket: { 'st-sessions': 'rds' } }, pass: false,
          title: '✘ Postgres gasping at peak again',
          lines: 'connections ...... exhausted\nlatency .......... 4 ms → 900 ms under load\nshape ............ keys pretending to be rows',
          note: 'A relational engine can store sessions — until scale arrives. Constant-speed key lookups at millions/s want DynamoDB.',
        },
        { pass: false, title: '✘ Sessions homeless', lines: 'station .......... empty', note: 'Socket an engine at the sessions station.' },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Each workload in its right pantry',
    body: 'Orders on RDS/Aurora with replicas for the reports; sessions on DynamoDB with a healthy partition key. Store follows access pattern. Close the ticket at the field terminal.',
    journal: 'Both workload tests passed — RDS for relations, DynamoDB for key-value.',
  },
  diagnosis: {
    unlockedBy: 'sessions',
    title: 'What separates the two workloads?',
    correct: {
      label: 'Their ACCESS PATTERNS: relational/ACID/ad-hoc (RDS or Aurora) vs key-value at scale with constant latency (DynamoDB)',
      journal: 'Diagnosis confirmed: match the store to the access pattern.',
      confirmBody: 'One workload is joins and transactions; the other is a hash map with global ambitions. Two stations, two engines.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'A much bigger Postgres instance', rebuttal: 'Vertical scale delays the fight; it doesn’t end it. The session workload grows without ceiling — the orders workload needs the engine to itself.' },
      { label: 'Shard Postgres by customer', rebuttal: 'Sharding a relational store to imitate a key-value store: all of DynamoDB’s work, none of its guarantees.' },
      { label: 'Cache everything in front of the one DB', rebuttal: 'A cache absorbs repeated READS — it can’t give sessions write scale or give orders back their headroom.' },
    ],
  },
  faultLamps: ['sessions'],
};

export const BLOCKFILE_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-5580', reporter: 'platform', sev: 'SEV-3', title: 'The Shared Uploads Folder',
    bodyHtml:
      `<div>Two storage requests, one confused ticket: the self-managed PostgreSQL box needs a fast, low-latency disk for its data directory — and the auto-scaling web fleet across three AZs needs to read AND write the same uploads directory at once. Someone tried to attach one EBS volume to nine instances. It went as expected.</div>` +
      `<pre>db box ........... needs high-IOPS local disk\nweb fleet ........ 9 instances · 3 AZs · one shared dir\nattempted ........ one EBS on nine hosts (no)</pre>`,
    hint: 'Probe both workloads, diagnose, then socket each bay. Both storage tests must pass.',
  },
  objectiveFix: 'Socket the DB disk bay and the shared-files bay correctly',
  objectiveDone: 'INC-5580 closed — a disk for the DB, a filesystem for the fleet.',
  summary: 'Symptom: one instance needing a fast private disk, and a multi-AZ fleet needing one shared read-write directory. Fix: EBS (gp3/io2) for the database — block storage attached to ONE instance in ONE AZ, low-latency and IOPS-provisionable; EFS for the uploads — a shared, elastic, multi-AZ NFS filesystem that every instance mounts simultaneously (POSIX semantics, grows automatically). Block = a private disk; file = a shared drive; matching them backwards fails in both directions.',
  level: [
    { id: 'db', kind: 'dbTower', at: [-4.5, 1.5] },
    { id: 'fleet', kind: 'serverRack', at: [4.5, 1.5], yaw: -Math.PI / 2 },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'db', machine: 'db', prompt: 'Inspect the database box',
      kicker: 'self-managed Postgres', title: 'One box, hungry for IOPS',
      pre: 'attachment ....... ONE instance, one AZ\nneeds ............ low latency · provisioned IOPS\nshape ............ a private block DISK',
      journal: 'DB box: one instance wanting a fast private disk — block storage, provisioned IOPS.',
    },
    {
      id: 'fleet', machine: 'fleet', prompt: 'Inspect the web fleet',
      kicker: 'web fleet ×9', title: 'Nine writers, one folder',
      pre: 'instances ........ 9, auto-scaling, 3 AZs\nneed ............. same dir, read AND write, all at once\nshape ............ a shared FILESYSTEM',
      journal: 'Fleet: many instances across AZs mounting one read-write directory — file storage, shared.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-ebs', kind: 'ebs', label: 'EBS volume (gp3/io2)', spot: [-2.9, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-efs', kind: 'efs', label: 'EFS filesystem (NFS, multi-AZ)', spot: [-1.7, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-inst', kind: 'ephemeral', label: 'Instance-store scratch disk', spot: [-2.3, -5.5], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.34 } },
    ],
  },
  sockets: [
    {
      id: 'so-disk', label: 'DB disk bay', at: [-2, -1.2],
      blurb: 'The database’s data directory: a low-latency block device owned by one instance, IOPS to order.',
      allow: { ebs: true, efs: true },
      refuse: {
        ephemeral: { reason: 'Instance store EVAPORATES when the instance stops — a database on ephemeral disk is a countdown, not a design.' },
      },
      fallback: { reason: 'The disk bay takes a storage volume.' },
    },
    {
      id: 'so-share', label: 'shared-files bay', at: [2, -1.2],
      blurb: 'The uploads directory: mounted read-write by every instance in every AZ, growing as it fills.',
      allow: { efs: true, ebs: true },
      refuse: {
        ephemeral: { reason: 'Nine private scratch disks is the opposite of one shared directory.' },
      },
      fallback: { reason: 'The shared bay takes a filesystem.' },
    },
  ],
  beats: [
    {
      id: 'iops', label: 'DB latency test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-disk': 'ebs' } }, pass: true,
          title: '✔ Sub-ms commits at provisioned IOPS',
          lines: 'volume ........... gp3/io2, one AZ, one instance\nIOPS ............. provisioned to the workload\nlatency .......... block-device fast',
          note: 'A private block volume is exactly the database’s shape: one owner, low latency, IOPS you dial in.',
        },
        {
          when: { socket: { 'so-disk': 'efs' } }, pass: false,
          title: '✘ Postgres over NFS: technically alive',
          lines: 'latency .......... network-filesystem overhead\nIOPS ............. not the provisioned-block kind\nfit .............. wrong shape',
          note: 'A shared filesystem pays network and protocol overhead on every operation — the DB wants a private BLOCK device (EBS).',
        },
        { pass: false, title: '✘ The DB has no disk', lines: 'disk bay ......... empty', note: 'Socket a volume.' },
      ],
    },
    {
      id: 'share', label: 'multi-AZ write test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-share': 'efs' } }, pass: true,
          title: '✔ Nine instances, three AZs, one directory',
          lines: 'mounts ........... all 9 instances, NFS\nAZs .............. all three, same data\nscaling .......... elastic — grows as it fills',
          note: 'EFS is the shared drive: every instance (and every future instance) mounts the same POSIX filesystem, across AZs, no capacity planning.',
        },
        {
          when: { socket: { 'so-share': 'ebs' } }, pass: false,
          title: '✘ One volume, one AZ, one owner — eight left out',
          lines: 'EBS attachment ... a single instance, its AZ only\nother 8 .......... no uploads directory\nthe experiment ... already failed once',
          note: 'EBS lives in ONE AZ attached to ONE instance — it cannot be the fleet’s shared folder. That’s EFS’s whole job.',
        },
        { pass: false, title: '✘ Uploads have no home', lines: 'shared bay ....... empty', note: 'Socket a filesystem.' },
      ],
    },
  ],
  verifyDone: {
    title: '✔ A disk for the one, a filesystem for the many',
    body: 'EBS gives the database its fast private block device; EFS gives the fleet one elastic multi-AZ directory. Block for single-instance disks, file for shared access. Close the ticket at the field terminal.',
    journal: 'Latency + multi-AZ write tests passed — EBS for the DB, EFS for the fleet.',
  },
  diagnosis: {
    unlockedBy: 'fleet',
    title: 'One fast private disk AND one shared multi-AZ folder — what fits?',
    correct: {
      label: 'EBS (block, one instance, one AZ, provisioned IOPS) for the DB; EFS (shared multi-AZ NFS) for the uploads',
      journal: 'Diagnosis confirmed: block for the single-owner disk, file for the shared directory.',
      confirmBody: 'The shapes are opposites: a disk owned by one, a folder shared by all. Two bays, two answers.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Attach the EBS volume to all nine instances', rebuttal: 'A standard EBS volume attaches to ONE instance in its AZ — the ticket already contains this experiment’s results.' },
      { label: 'Sync the uploads dir between instances with rsync', rebuttal: 'Nine-way rsync is a conflict generator with a cron habit. Shared means ONE filesystem, not nine converging ones.' },
      { label: 'Put the database files on S3', rebuttal: 'S3 is object storage — no block semantics, no POSIX, no database data directory.' },
    ],
  },
  faultLamps: ['fleet'],
};

export const ECS_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-6015', reporter: 'delivery', sev: 'SEV-3', title: 'Works on My Machine',
    bodyHtml:
      `<div>Every release dies in test with dependency drift — “works on my machine” is the team motto. The fix-in-progress is containers on ECS, but the team is dreading running a fleet of container HOSTS: provisioning, patching, right-sizing, scaling. They would like the containers without the janitorial work.</div>` +
      `<pre>defects .......... dependency drift, env mismatch\nplan ............. containers on ECS\ndread ............ managing container hosts\nwanted ........... run containers, not servers</pre>`,
    hint: 'Probe the pipeline and the ops desk, diagnose, then socket the runtime. Deploy test AND ops audit must pass.',
  },
  objectiveFix: 'Socket the container runtime',
  objectiveDone: 'INC-6015 closed — same image everywhere, no hosts anywhere.',
  summary: 'Symptom: dependency drift breaking every environment, plus dread of managing container hosts. Fix: container images (the app + exact dependencies + runtime in one portable unit — identical on laptop, test, and prod; the ECS task definition declares image, CPU/memory, ports) running on the FARGATE launch type: serverless containers with no instances to provision, patch, or right-size. Containers share the host kernel, start in seconds, and pack densely — the VM-per-app alternative wastes all three.',
  level: [
    { id: 'pipeline', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2 },
    { id: 'ops', kind: 'serverRack', at: [4.5, 1.5], yaw: -Math.PI / 2 },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'pipeline', machine: 'pipeline', prompt: 'Inspect the pipeline',
      kicker: 'CI/CD', title: 'Different everywhere it runs',
      pre: 'laptop ........... python 3.11 · libfoo 2.3\ntest ............. python 3.9 · libfoo 2.1\nprod ............. “similar”\nverdict .......... the ENVIRONMENT is the bug',
      journal: 'Pipeline: every environment differs — the app needs to carry its world with it (a container image).',
    },
    {
      id: 'ops', machine: 'ops', prompt: 'Inspect the ops desk',
      kicker: 'ops', title: 'Nobody wants to own the hosts',
      pre: 'fear list ........ provision · patch · right-size · scale\nfor what ......... boxes whose only job is holding containers',
      journal: 'Ops: the value is in the containers; the hosts are pure toil. Serverless launch type exists for exactly this.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-fargate', kind: 'fargate', label: 'ECS on Fargate (serverless)', spot: [-2.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-ec2', kind: 'ec2fleet', label: 'ECS on EC2 (you run the hosts)', spot: [-1.7, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-vm', kind: 'vmper', label: 'One VM per app (the old way)', spot: [-2.3, -5.5], visual: { hex: '#8a7a22', glowHex: '#e8d657' } },
    ],
  },
  sockets: [
    {
      id: 'so-rt', label: 'runtime bay', at: [0.5, -1.2],
      blurb: 'Where the task definitions run: image, CPU/memory, ports declared once — the launch type decides who owns the machines underneath.',
      allow: { fargate: true, ec2fleet: true },
      refuse: {
        vmper: { reason: 'A full VM per app boots in minutes, packs one-to-a-host, and reintroduces every environment drift containers exist to kill.' },
      },
      fallback: { reason: 'The runtime bay takes a container launch type.' },
    },
  ],
  beats: [
    {
      id: 'deploy', label: 'deploy test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-rt': 'any' } }, pass: true,
          title: '✔ The same image passed everywhere',
          lines: 'image ............ app + exact deps + runtime\nlaptop = test .... bit-identical\ntask definition .. image · cpu/mem · ports\nstartup .......... seconds, densely packed',
          note: 'The image carries its whole world, so “works on my machine” means works everywhere. The task definition declares what runs and with how much.',
        },
        {
          pass: false,
          title: '✘ Broke in test. Again',
          lines: 'runtime .......... none socketed\ndrift ............ thriving',
          note: 'Socket a container runtime.',
        },
      ],
    },
    {
      id: 'opsaudit', label: 'ops audit', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-rt': 'fargate' } }, pass: true,
          title: '✔ Zero hosts to provision, patch, or right-size',
          lines: 'instances ........ none — Fargate runs the tasks\npatching ......... not yours\nscaling .......... per task, with load\nbill ............. per task-size × runtime',
          note: 'Fargate is the serverless launch type: you bring task definitions, AWS brings (and patches, and scales) the compute underneath.',
        },
        {
          when: { socket: { 'so-rt': 'ec2fleet' } }, pass: false,
          title: '✘ Congratulations on your new fleet of pets',
          lines: 'hosts ............ provisioned by you\npatching ......... yours, monthly\nright-sizing ..... yours, quarterly\nthe dread ........ realised',
          note: 'The EC2 launch type has its uses (GPUs, daemonsets, cost tuning at scale) — but the ticket said NO host janitorial work. That’s Fargate.',
        },
        { pass: false, title: '✘ Nothing to audit', lines: 'runtime .......... missing', note: 'Socket a launch type first.' },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Same image everywhere, no hosts anywhere',
    body: 'Container images end the drift; Fargate ends the host toil — task definitions in, running containers out, nothing to patch in between. Close the ticket at the field terminal.',
    journal: 'Deploy + ops audit passed — containers on Fargate.',
  },
  diagnosis: {
    unlockedBy: 'pipeline',
    title: 'What kills the drift AND the host toil?',
    correct: {
      label: 'Container images for consistency, run on ECS with the FARGATE launch type — serverless containers, no hosts to manage',
      journal: 'Diagnosis confirmed: images for portability; Fargate for zero host management.',
      confirmBody: 'The image freezes the environment; Fargate deletes the servers. The pallet has both launch types — the ops audit has a preference.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Standardise everyone’s laptops and test boxes', rebuttal: 'Environment-pinning by policy drifts the day someone updates anything. The image pins it by CONSTRUCTION.' },
      { label: 'Golden AMIs for every application', rebuttal: 'Minutes-slow to boot, one app per VM, and the AMI pipeline is its own part-time job. Containers start in seconds and share the kernel.' },
      { label: 'A stern runbook about dependency versions', rebuttal: 'Runbooks don’t compile. Ship the environment WITH the app.' },
    ],
  },
  faultLamps: ['pipeline'],
};

export const APIGW_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-7702', reporter: 'api-team', sev: 'SEV-2', title: 'The Abusive Partner',
    bodyHtml:
      `<div>One partner hammers the public REST API in bursts that flatten everyone else, unauthenticated requests reach all the way to the backend before being rejected, and a read-heavy reference endpoint recomputes the same answer thousands of times an hour. The backend is doing jobs a front door should do.</div>` +
      `<pre>partner bursts ... flatten the API for everyone\nauth ............. checked at the BACKEND (too late)\nGET /reference ... same answer, recomputed all day\nneeded ........... limits · auth · caching, at the door</pre>`,
    hint: 'Probe the API and the backend, diagnose, then socket the front door and switch the cache dial. Burst test AND cache test must pass.',
  },
  objectiveFix: 'Socket the API front door · dial stage caching ON',
  objectiveDone: 'INC-7702 closed — throttled, authorised, and cached at the door.',
  summary: 'Symptom: a public API with no front door — one partner’s bursts flatten it, bad tokens reach the backend, and hot reference reads recompute endlessly. Fix: API Gateway — usage plans with API keys give PER-CLIENT rate limits (plus stage/account throttles as the backstop), a Cognito JWT (or Lambda) authorizer rejects callers at the edge before the backend sees them, and stage caching with a sane TTL serves the slow-changing reference data from the gateway itself.',
  level: [
    { id: 'api', kind: 'internetGate', at: [-4.5, 1.5], yaw: Math.PI / 2 },
    { id: 'backend', kind: 'serverRack', at: [4.5, 1.5], yaw: -Math.PI / 2 },
    { id: 'dial', kind: 'aimPointer', at: [-2, -2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'api', machine: 'api', prompt: 'Inspect the public API',
      kicker: 'public API', title: 'A door with no doorman',
      pre: 'partner X ........ 40× everyone else, in bursts\nthrottling ....... none\nauth check ....... backend, after the work\ncaching .......... none',
      journal: 'API: no per-client limits, auth enforced too late, and zero caching — the door does nothing a door should.',
    },
    {
      id: 'backend', machine: 'backend', prompt: 'Inspect the backend',
      kicker: 'backend', title: 'Doing the door’s job',
      pre: 'load ............. burst-driven sawtooth\nrejected calls ... after full processing\nGET /reference ... identical, thousands/hour',
      journal: 'Backend: burning compute rejecting callers and recomputing an answer that changes twice a day.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-apigw', kind: 'apigw', label: 'API Gateway (plans·auth·cache)', spot: [-2.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-alb', kind: 'rawalb', label: 'A plain ALB', spot: [-1.7, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-email', kind: 'email', label: 'A stern email to the partner', spot: [-2.3, -5.5], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-door', label: 'front-door bay', at: [0.5, -1.2],
      blurb: 'The managed API entry point: per-client usage plans, authorizers that reject at the edge, request validation, throttles, and a response cache.',
      allow: { apigw: true, rawalb: true },
      refuse: {
        email: { reason: 'The partner’s retry loop does not read email. Limits must be ENFORCED, not requested.' },
      },
      fallback: { reason: 'The front-door bay takes an API layer.' },
    },
  ],
  dials: [
    {
      id: 'cache', machine: 'dial', initial: 'off',
      grabPrompt: '◀ ▶ swing stage caching · E/Ⓧ lock',
      positions: [
        { id: 'off', label: 'stage cache: OFF', angle: 2.0 },
        { id: 'on', label: 'stage cache: ON (TTL tuned)', angle: 1.0 },
      ],
    },
  ],
  beats: [
    {
      id: 'burst', label: 'burst test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-door': 'apigw' } }, pass: true,
          title: '✔ Partner throttled at 429; everyone else unbothered',
          lines: 'usage plan ....... partner key → 100 rps cap\nover the cap ..... 429, at the door\nother clients .... full service\nbad tokens ....... rejected by the authorizer, edge-side',
          note: 'Usage plans + API keys give each client its own budget; the JWT authorizer bounces bad callers before the backend spends a cycle.',
        },
        {
          when: { socket: { 'so-door': 'rawalb' } }, pass: false,
          title: '✘ Balanced the burst evenly onto everyone',
          lines: 'ALB .............. spreads load; can’t meter clients\nper-key limits ... not a thing here\nauth ............. still the backend’s problem',
          note: 'An ALB balances; it doesn’t govern. Per-client quotas, keys, authorizers, and caching are API GATEWAY capabilities.',
        },
        { pass: false, title: '✘ Flattened again at 09:00', lines: 'front door ....... missing', note: 'Socket one.' },
      ],
    },
    {
      id: 'cache', label: 'cache test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-door': 'apigw' }, dial: { cache: 'on' } }, pass: true,
          title: '✔ /reference served from the stage cache',
          lines: 'hit rate ......... 98% at the gateway\nbackend calls .... thousands/hr → dozens\nTTL .............. matched to the data’s change rate',
          note: 'Slow-changing reference data is the textbook cache case: the gateway answers repeats itself, and the backend computes only when the TTL expires.',
        },
        {
          when: { socket: { 'so-door': 'apigw' } }, pass: false,
          title: '✘ Still recomputing the same answer',
          lines: 'stage cache ...... OFF\nbackend .......... doing arithmetic it did an hour ago',
          note: 'Swing the cache dial — with a TTL matched to how often the data actually changes.',
        },
        { pass: false, title: '✘ Nothing to cache with', lines: 'front door ....... missing', note: 'Gateway first.' },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Metered, authorised, and cached at the door',
    body: 'API Gateway holds the line: per-client usage plans throttle the abuser, the authorizer rejects bad tokens at the edge, and the stage cache serves the reference reads. The backend finally just runs the business. Close the ticket at the field terminal.',
    journal: 'Burst + cache tests passed — API Gateway with usage plans and stage caching.',
  },
  diagnosis: {
    unlockedBy: 'api',
    title: 'What gives per-client limits, edge auth, AND response caching?',
    correct: {
      label: 'API Gateway: usage plans + API keys for per-client throttles, a Cognito/Lambda authorizer at the edge, stage caching for the hot GETs',
      journal: 'Diagnosis confirmed: API Gateway as the managed front door — limits, auth, cache.',
      confirmBody: 'Doors meter, check credentials, and remember frequent answers — none of which belongs in the backend. Mind the cache dial after socketing.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Scale the backend to absorb the bursts', rebuttal: 'Funding the abuser’s hobby. The fix is a LIMIT, not a bigger victim.' },
      { label: 'Block the partner’s IPs at the firewall', rebuttal: 'They’re a PARTNER — the goal is fair use (per-key quotas), not exile. And their IPs rotate anyway.' },
      { label: 'Cache inside the backend service', rebuttal: 'Closer than nothing — but the requests still traverse the door and burn backend capacity. Cache AT the gateway.' },
    ],
  },
  faultLamps: ['api'],
};
