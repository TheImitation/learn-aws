import type { MissionSpec } from '../spec';

/** High-Performing batch 2 — five specs. */

export const ATHENA_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-8330', reporter: 'analytics', sev: 'SEV-3', title: 'The Friday Query',
    bodyHtml:
      `<div>Analysts run a handful of ad-hoc SQL queries a week over logs already sitting in S3 — through a warehouse cluster that idles the other 166 hours, over raw JSON that makes every query scan the entire dataset. Friday’s query cost $47 and twenty minutes.</div>` +
      `<pre>queries .......... ~5/week, ad-hoc SQL\ndata ............. JSON/CSV logs in S3\nengine ........... provisioned cluster, mostly idle\nFriday’s query ... $47 · 20 min · full scan</pre>`,
    hint: 'Probe the lake and the cluster, diagnose, then set the engine dial and socket the data format. Ad-hoc test AND scan-cost review must pass.',
  },
  objectiveFix: 'Dial the engine to Athena · socket the columnar format',
  objectiveDone: 'INC-8330 closed — serverless SQL over Parquet.',
  summary: 'Symptom: occasional ad-hoc SQL paying for an always-on warehouse, scanning raw JSON end to end. Fix: Amazon Athena — serverless SQL directly over the S3 data lake, pay per query, no cluster — over data converted to a COLUMNAR format (Parquet/ORC) and partitioned, so each query scans only the columns and partitions it needs. Redshift stays the right answer for the OTHER shape: heavy, repeated, all-day BI joins over terabytes.',
  level: [
    { id: 'lake', kind: 'shelfUnit', at: [-4.5, 1.5], yaw: Math.PI / 2, args: ['#57c7e3'] },
    { id: 'cluster', kind: 'serverRack', at: [4.5, 1.5], yaw: -Math.PI / 2 },
    { id: 'dial', kind: 'aimPointer', at: [-2, -2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'lake', machine: 'lake', prompt: 'Inspect the data lake',
      kicker: 'S3 data lake', title: 'Cheap to keep, pricey to read',
      pre: 'format ........... raw JSON/CSV\npartitions ....... none\nevery query ...... scans EVERYTHING\nlake itself ...... cheap, durable, schema-on-read ✓',
      journal: 'Lake: S3 is the right home — but raw unpartitioned JSON makes every query a full-dataset scan.',
    },
    {
      id: 'cluster', machine: 'cluster', prompt: 'Inspect the warehouse cluster',
      kicker: 'warehouse', title: '166 idle hours a week',
      pre: 'utilisation ...... ~5 queries/week\nbilling .......... 24/7 provisioned\nshape mismatch ... ad-hoc ≠ always-on',
      journal: 'Cluster: provisioned around the clock for five queries a week — the ad-hoc shape wants pay-per-query.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-parquet', kind: 'parquet', label: 'Parquet + partitions (columnar)', spot: [-2.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-json', kind: 'rawjson', label: 'Raw JSON (as is)', spot: [-1.7, -4.6], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.34 } },
    ],
  },
  sockets: [
    {
      id: 'so-fmt', label: 'data-format bay', at: [0.5, -1.2],
      blurb: 'How the lake is laid out: columnar formats let queries read only the columns they name; partitions let them skip whole directories.',
      allow: { parquet: true, rawjson: true },
      fallback: { reason: 'The format bay takes a data layout.' },
    },
  ],
  dials: [
    {
      id: 'engine', machine: 'dial', initial: 'redshift',
      grabPrompt: '◀ ▶ swing the query engine · E/Ⓧ lock',
      positions: [
        { id: 'redshift', label: 'engine: Redshift (provisioned)', angle: 2.0 },
        { id: 'athena', label: 'engine: Athena (serverless)', angle: 1.0 },
      ],
    },
  ],
  beats: [
    {
      id: 'adhoc', label: 'ad-hoc query test', trigger: 'terminal',
      rules: [
        {
          when: { dial: { engine: 'athena' }, socket: { 'so-fmt': 'parquet' } }, pass: true,
          title: '✔ $0.11, nine seconds, no cluster',
          lines: 'engine ........... Athena — serverless, per-query\nscanned .......... 2 columns · 1 partition\ncost ............. $0.11 (was $47)\nidle cost ........ zero',
          note: 'Serverless SQL straight over S3, and the columnar/partitioned layout means the query reads only what it names. Ad-hoc analytics, correctly shaped.',
        },
        {
          when: { dial: { engine: 'athena' } }, pass: false,
          title: '✘ Serverless — and still scanning everything',
          lines: 'engine ........... Athena ✓\nformat ........... raw JSON — full scan per query\ncost ............. still dollars per question',
          note: 'Athena bills by data SCANNED: raw row-based JSON makes every query read it all. Socket the Parquet layout — columns and partitions cut the scan.',
        },
        {
          pass: false,
          title: '✘ The cluster idles on',
          lines: 'engine ........... provisioned warehouse\nqueries/week ..... five\nshape ............ wrong direction',
          note: 'Redshift earns its keep on all-day repeated BI over terabytes — not five ad-hoc queries a week. Swing the engine dial.',
        },
      ],
    },
    {
      id: 'scan', label: 'scan-cost review', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-fmt': 'parquet' } }, pass: true,
          title: '✔ Queries scan 1/400th of the lake',
          lines: 'format ........... Parquet (columnar)\npartitioning ..... by date — skipped wholesale\nbill driver ...... bytes scanned, now tiny',
          note: 'Columnar + partitioned is the lake’s performance model: name two columns of one day and that is literally all that gets read.',
        },
        {
          pass: false,
          title: '✘ Every question reads every byte',
          lines: 'format ........... raw JSON, unpartitioned',
          note: 'Convert to Parquet/ORC and partition — the scan (and the bill) follows the layout.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Serverless questions, columnar answers',
    body: 'Athena queries the lake per-question with zero idle cost, and the Parquet/partitioned layout keeps each scan tiny. When the all-day BI workload arrives, THAT is Redshift’s ticket. Close this one at the field terminal.',
    journal: 'Ad-hoc + scan-cost passed — Athena over Parquet.',
  },
  diagnosis: {
    unlockedBy: 'cluster',
    title: 'Five ad-hoc queries a week — what’s the right engine and layout?',
    correct: {
      label: 'Athena (serverless, pay-per-query, SQL directly on S3) over Parquet/partitioned data — the cluster shape is for all-day BI',
      journal: 'Diagnosis confirmed: Athena for ad-hoc; columnar+partitions to shrink scans; Redshift reserved for heavy repeated BI.',
      confirmBody: 'Occasional questions want per-query pricing; efficient questions want a columnar, partitioned lake. Dial and bay, respectively.',
      actionLabel: 'To the fix →',
    },
    wrongs: [
      { label: 'Pause the Redshift cluster between queries', rebuttal: 'Resume-wait-query-pause five times a week is toil to imitate what Athena simply IS.' },
      { label: 'Load the logs INTO the warehouse', rebuttal: 'An ETL pipeline and 24/7 storage for five queries a week — the lake was already the right home.' },
      { label: 'Gzip the JSON harder', rebuttal: 'Compression shrinks bytes, not the row-based full-scan shape. Columnar formats change WHAT gets read.' },
    ],
  },
  faultLamps: ['cluster'],
};

export const AURORA_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-9210', reporter: 'dba', sev: 'SEV-2', title: 'The Read Avalanche',
    bodyHtml:
      `<div>The Aurora writer is drowning in read traffic — and the one time it restarted, the app was down until a human intervened. The team needs more read throughput AND automatic failover, and someone keeps proposing “just double the writer size” every time.</div>` +
      `<pre>writer CPU ....... 92% — mostly READS\nfailover ......... manual, last time 22 min\nproposal ......... a bigger writer (again)\nneeded ........... read scale + auto-failover</pre>`,
    hint: 'Probe the writer and the app, diagnose, then socket the replica bay. Read test AND the writer-kill drill (lever) must pass.',
  },
  objectiveFix: 'Socket Aurora Replicas in the replica bay',
  objectiveDone: 'INC-9210 closed — reads spread, failover automatic.',
  summary: 'Symptom: a writer saturated by reads and a failover story that involves waking people. Fix: Aurora Replicas — they serve read traffic off the SAME shared storage layer (Aurora keeps six copies across three AZs; compute is separate from storage) and one is AUTOMATICALLY PROMOTED if the writer dies: read scaling and fast failover from the same feature. A bigger writer buys neither. Bursty-by-day, idle-by-night capacity is Aurora Serverless v2’s ticket.',
  level: [
    { id: 'writer', kind: 'dbTower', at: [3.5, 1.5] },
    { id: 'app', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2 },
    { id: 'lever', kind: 'chaosLever', at: [3.5, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'writer', machine: 'writer', prompt: 'Inspect the writer',
      kicker: 'Aurora writer', title: 'Drowning in questions',
      pre: 'CPU .............. 92% — 80% of it READS\nstorage layer .... shared · 6 copies · 3 AZs\nreplicas ......... none attached\nfailover target .. none',
      journal: 'Writer: saturated by read traffic; Aurora’s shared storage is sitting there waiting for replicas to be attached to it.',
    },
    {
      id: 'app', machine: 'app', prompt: 'Inspect the app',
      kicker: 'app tier', title: 'One endpoint for everything',
      pre: 'reads ............ → writer\nwrites ........... → writer\nreader endpoint .. unused (nothing behind it)',
      journal: 'App: sends every read to the writer — the reader endpoint exists, with nobody home behind it.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-rep', kind: 'areplicas', label: 'Aurora Replicas ×2', spot: [-2.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a', cyl: true, w: 0.6, h: 0.62 } },
      { id: 'mod-big', kind: 'bigwriter', label: 'A much bigger writer', spot: [-1.7, -4.6], visual: { hex: '#8a7a22', glowHex: '#e8d657', cyl: true, w: 0.66, h: 0.7 } },
      { id: 'mod-cache', kind: 'copytable', label: 'Nightly copy-table “replica”', spot: [-2.3, -5.5], visual: { hex: '#6e5a3e', glowHex: '#c9a35c', h: 0.34 } },
    ],
  },
  sockets: [
    {
      id: 'so-rep', label: 'replica bay', at: [0.5, -1.2],
      blurb: 'Readers attached to the SAME six-way storage: they serve the read traffic today and one gets promoted automatically the moment the writer dies.',
      allow: { areplicas: true, bigwriter: true },
      refuse: {
        copytable: { reason: 'A nightly copy is 24 hours stale and promotes nothing. Aurora replicas read the same storage the writer writes.' },
      },
      fallback: { reason: 'The replica bay takes reader capacity.' },
    },
  ],
  levers: [
    { id: 'lever-kill', machine: 'lever', prompt: 'PULL — kill the writer (drill)', beat: 'kill' },
  ],
  beats: [
    {
      id: 'reads', label: 'read test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-rep': 'areplicas' } }, pass: true,
          title: '✔ Reads on the replicas; writer at 24%',
          lines: 'reader endpoint .. 2 replicas, same storage\nreplica lag ...... ms-class (shared storage)\nwriter ........... writes only, calm',
          note: 'Replicas read the same distributed storage the writer writes — no copy pipeline, milliseconds of lag, and the writer keeps its CPU for commits.',
        },
        {
          when: { socket: { 'so-rep': 'bigwriter' } }, pass: false,
          title: '✘ Bigger, busier, still alone',
          lines: 'writer ........... larger · still 100% of reads\nceiling .......... nearer than you think\nfailover ......... still nobody to promote',
          note: 'Vertical scale rents headroom and buys no failover target. The read traffic needs READERS.',
        },
        { pass: false, title: '✘ The writer still answers everything', lines: 'replica bay ...... empty', note: 'Socket the replicas.' },
      ],
    },
    {
      id: 'kill', label: 'writer-kill drill', trigger: 'lever',
      rules: [
        {
          when: { socket: { 'so-rep': 'areplicas' } }, pass: true,
          title: '✔ Replica promoted in 31 seconds',
          lines: 'writer ........... killed (drill)\npromotion ........ automatic — replica #1\ndata ............. intact (six copies, three AZs)\nhumans paged ..... zero',
          note: 'The same replicas that scale your reads ARE the failover plan: Aurora promotes one automatically, atop storage that never lived on the dead node anyway.',
        },
        {
          when: { socket: { 'so-rep': 'bigwriter' } }, pass: false,
          title: '✘ A very large outage',
          lines: 'writer ........... killed (drill)\npromotion ........ no candidate exists\nrecovery ......... humans, 22+ minutes',
          note: 'Size doesn’t survive death. Automatic failover needs a REPLICA standing on the shared storage.',
          alarm: 'OUTAGE — NO FAILOVER TARGET',
        },
        { pass: false, title: '✘ Down until someone wakes up', lines: 'replica bay ...... empty', note: 'Replicas first.', alarm: 'OUTAGE — NO FAILOVER TARGET' },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Reads spread, failover automatic',
    body: 'Aurora Replicas carry the read avalanche off the shared six-way storage and stand ready to be promoted the second the writer dies — one feature, both requirements. (Bursty/idle capacity? That’s Aurora Serverless v2.) Close the ticket at the field terminal.',
    journal: 'Read + writer-kill drills passed — Aurora Replicas on shared storage.',
  },
  diagnosis: {
    unlockedBy: 'writer',
    title: 'More read throughput AND automatic failover — one move?',
    correct: {
      label: 'Add Aurora Replicas: they serve reads from the shared storage layer and are promoted automatically if the writer fails',
      journal: 'Diagnosis confirmed: Aurora Replicas = read scale + auto-failover, thanks to compute/storage separation.',
      confirmBody: 'Aurora’s trick is the shared storage: replicas read it without copying, and promotion is fast because the data never lived on the dead writer. The bay takes the honest fix and the recurring proposal.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Double the writer instance size (again)', rebuttal: 'Rented headroom, no failover target, and the reads still all land on one node. It’s on the pallet — the drill will grade it.' },
      { label: 'Cache all reads in the app tier', rebuttal: 'A cache helps HOT repeats; the report and query mix here isn’t cacheable — and the failover requirement remains untouched.' },
      { label: 'Snapshot-restore to a second cluster nightly', rebuttal: 'A 24-hour-stale twin with manual cutover — that’s a DR relic, not read scaling or auto-failover.' },
    ],
  },
  faultLamps: ['writer'],
};

export const KINESIS_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-3341', reporter: 'data-eng', sev: 'SEV-2', title: 'The Clickstream Firehose',
    bodyHtml:
      `<div>The clickstream must feed the real-time dashboard AND the fraud-analytics job — each reading at its own pace, and fraud sometimes needs to re-read the last few hours. Today it’s an SQS queue, and the two consumers steal events from each other. Also: writes are getting throttled and nobody knows why.</div>` +
      `<pre>consumers ........ dashboard + fraud (independent)\nreplay ........... fraud re-reads hours of history\ntoday ............ SQS — consumers STEAL from each other\nwrites ........... ProvisionedThroughputExceeded</pre>`,
    hint: 'Probe the pipe and the producers, diagnose, then socket the stream and set the partition-key dial. Dual-consumer test AND throughput test must pass.',
  },
  objectiveFix: 'Socket the stream · dial the partition key to high-cardinality',
  objectiveDone: 'INC-3341 closed — one stream, many readers, healthy shards.',
  summary: 'Symptom: two independent consumers fighting over a queue, a replay requirement a queue can’t meet, and throttled writes. Fix: Kinesis Data Streams — an ordered, replayable log where MULTIPLE consumers each keep their own position and can rewind within retention (a queue deletes on read; a stream retains). The write throttling is a hot shard: partition keys decide shard placement, so use a HIGH-cardinality key (e.g. per-customer) — which also preserves per-customer ORDER, since one key always lands on one shard.',
  level: [
    { id: 'producers', kind: 'crowdGate', at: [-8, 0], yaw: Math.PI / 2 },
    { id: 'pipe', kind: 'serverRack', at: [3.5, 1.5], yaw: Math.PI / 2 },
    { id: 'dial', kind: 'aimPointer', at: [-2, -2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'pipe', machine: 'pipe', prompt: 'Inspect the event pipe',
      kicker: 'clickstream pipe', title: 'Two readers, one queue, zero sharing',
      pre: 'dashboard ........ consumed 61% of events\nfraud ............ got the other 39%\nreplay request ... impossible — consumed = deleted\nwrites ........... throttled at peak',
      journal: 'Pipe: a queue delivers each event to ONE consumer — the dashboard and fraud are splitting the stream, and history is gone on read.',
    },
    {
      id: 'producers', machine: 'producers', prompt: 'Inspect the producers',
      kicker: 'producers', title: 'Everything keyed to “click”',
      pre: 'partition key .... the literal string "click"\neffect ........... every record → one shard\nthat shard ....... at its write limit\nthe others ....... idle',
      journal: 'Producers: a constant partition key funnels every record to one shard — the hot partition IS the throttling.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-kin', kind: 'kinesis', label: 'Kinesis Data Stream', spot: [-2.9, -4.6], visual: { hex: '#3b2f4d', glowHex: '#b48ce0' } },
      { id: 'mod-sqs', kind: 'sqspipe', label: 'A second SQS queue (one each?)', spot: [-1.7, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
    ],
  },
  sockets: [
    {
      id: 'so-stream', label: 'stream bay', at: [0.5, -1.2],
      blurb: 'The event backbone: ordered records, retained for a window, read independently by as many consumers as need them — each with its own iterator, each able to rewind.',
      allow: { kinesis: true, sqspipe: true },
      fallback: { reason: 'The stream bay takes an event transport.' },
    },
  ],
  dials: [
    {
      id: 'pkey', machine: 'dial', initial: 'constant',
      grabPrompt: '◀ ▶ swing the partition key · E/Ⓧ lock',
      positions: [
        { id: 'constant', label: 'partition key: constant ("click")', angle: 2.0 },
        { id: 'customer', label: 'partition key: per-customer id', angle: 1.0 },
      ],
    },
  ],
  beats: [
    {
      id: 'dual', label: 'dual-consumer test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-stream': 'kinesis' } }, pass: true,
          title: '✔ Both read everything; fraud rewound 3 hours',
          lines: 'dashboard ........ 100% of records, real-time\nfraud ............ 100%, plus a 3-h rewind\niterators ........ independent — no stealing\nretention ........ the replay window',
          note: 'A stream is a retained, ordered log: consumers don’t consume-and-delete, they READ AT POSITIONS. Everyone gets everything, and yesterday still exists.',
        },
        {
          when: { socket: { 'so-stream': 'sqspipe' } }, pass: false,
          title: '✘ Two queues: double-publish, half a solution',
          lines: 'producers ........ now write EVERYTHING twice\nthird consumer ... a third queue + third publish\nreplay ........... still impossible — read = gone',
          note: 'Fan-out by duplicate publishing scales with consumers and still can’t replay. The stream shape — retained, multi-reader — is what both requirements describe.',
        },
        { pass: false, title: '✘ Still fighting over events', lines: 'stream bay ....... empty', note: 'Socket the transport.' },
      ],
    },
    {
      id: 'tput', label: 'throughput test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-stream': 'kinesis' }, dial: { pkey: 'customer' } }, pass: true,
          title: '✔ Writes spread; per-customer order intact',
          lines: 'partition key .... customer id (high cardinality)\nshards ........... evenly loaded, no throttles\nordering ......... per customer — one key, one shard',
          note: 'High-cardinality keys spread records across shards (goodbye throttling), and because one key always maps to one shard, each customer’s events stay in produced order.',
        },
        {
          when: { socket: { 'so-stream': 'kinesis' } }, pass: false,
          title: '✘ One shard glowing red, the rest asleep',
          lines: 'partition key .... "click" for every record\nhot shard ........ at its write ceiling\nthrottles ........ ProvisionedThroughputExceeded',
          note: 'Shard placement follows the key: a constant key is a funnel. Swing the dial to per-customer ids.',
        },
        { pass: false, title: '✘ No stream to throughput', lines: 'stream bay ....... empty', note: 'Stream first.' },
      ],
    },
  ],
  verifyDone: {
    title: '✔ One stream, many readers, healthy shards',
    body: 'Kinesis retains the ordered clickstream for every consumer — the dashboard tails it live, fraud rewinds at will — and per-customer keys keep shards balanced and customer order exact. Close the ticket at the field terminal.',
    journal: 'Dual-consumer + throughput passed — Kinesis with high-cardinality keys.',
  },
  diagnosis: {
    unlockedBy: 'pipe',
    title: 'Two independent readers, replay, and throttled writes — root cause?',
    correct: {
      label: 'A queue where a STREAM belongs (read≠delete, multi-consumer, retention) — Kinesis, with a high-cardinality partition key for the hot shard',
      journal: 'Diagnosis confirmed: stream semantics (Kinesis) + partition-key cardinality for throughput.',
      confirmBody: 'The consumers aren’t misbehaving — the transport’s contract is wrong. And the throttling is the constant key funnelling one shard. Bay, then dial.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Increase the queue’s visibility timeout', rebuttal: 'Visibility tuning changes WHEN a message hides — it can’t make one delivery into two, or resurrect consumed history.' },
      { label: 'Have fraud query the dashboard’s database', rebuttal: 'Now fraud depends on the dashboard’s schema, latency, and uptime — coupling two teams to dodge one transport decision.' },
      { label: 'Add more shards without touching the key', rebuttal: 'The constant key still maps every record to ONE shard — new shards would just watch it burn.' },
    ],
  },
  faultLamps: ['pipe'],
};

export const GA_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-4477', reporter: 'game-team', sev: 'SEV-2', title: 'The Jittery Game',
    bodyHtml:
      `<div>The multiplayer game runs on UDP with servers in three Regions, and players worldwide report jitter, wandering latency, and long reconnects whenever a Region has a bad day. The client hard-codes IPs, so every failover means a client patch. CloudFront was proposed; the packets are not HTTP.</div>` +
      `<pre>protocol ......... UDP (real-time)\nsymptom .......... jitter · inconsistent RTT\nfailover ......... client patch (IPs change)\nproposal ......... “CloudFront?” — it’s not HTTP</pre>`,
    hint: 'Probe the players and a region stack, diagnose, then socket the entry layer. Jitter test AND the region-failover drill (lever) must pass.',
  },
  objectiveFix: 'Socket the global entry layer',
  objectiveDone: 'INC-4477 closed — anycast in, backbone through, failover behind static IPs.',
  summary: 'Symptom: UDP game traffic riding the public internet to hard-coded regional IPs — jitter on the way in, client patches on every failover. Fix: AWS Global Accelerator — two STATIC anycast IPs announced from every AWS edge: players enter at the nearest edge, ride the AWS backbone (not the public internet) to the best healthy Region, and failover happens BEHIND the same IPs, no client changes. GA accelerates TCP/UDP applications; CloudFront caches HTTP(S) content — the game’s packets aren’t cacheable and aren’t HTTP.',
  level: [
    { id: 'players', kind: 'crowdGate', at: [-8, 0], yaw: Math.PI / 2 },
    { id: 'use1', kind: 'serverRack', at: [3.5, -2], yaw: Math.PI / 2 },
    { id: 'euc1', kind: 'serverRack', at: [4.5, 2], yaw: Math.PI / 2 },
    { id: 'lever', kind: 'chaosLever', at: [3.5, -4.4] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'players', machine: 'players', prompt: 'Inspect the players',
      kicker: 'players', title: 'Packets on the scenic route',
      pre: 'path ............. public internet, all the way\nRTT .............. varies with the internet’s mood\nprotocol ......... UDP — caching is meaningless',
      journal: 'Players: UDP packets crossing the whole public internet — jitter is the route, not the servers.',
    },
    {
      id: 'use1', machine: 'use1', prompt: 'Inspect a region stack',
      kicker: 'us-east-1', title: 'Hard-coded and mortal',
      pre: 'client config .... regional IPs, baked in\nregion bad day ... = client patch + reconnect storm\nhealth checks .... none feed routing',
      journal: 'Region stack: clients pin its IPs — failover requires re-shipping the client.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-ga', kind: 'ga', label: 'Global Accelerator (anycast)', spot: [-2.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-cf', kind: 'cfront', label: 'CloudFront distribution', spot: [-1.7, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-dns', kind: 'geodns', label: 'Geo-DNS + regional IP lists', spot: [-2.3, -5.5], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-entry', label: 'global entry bay', at: [0.5, -1.2],
      blurb: 'How the world reaches the game: ideally two static anycast IPs at the nearest edge, the AWS backbone in the middle, and health-based routing to Regions behind it.',
      allow: { ga: true, geodns: true },
      refuse: {
        cfront: { reason: 'CloudFront caches HTTP(S) CONTENT at the edge. The game is UDP state, not cacheable web objects — acceleration for TCP/UDP apps is Global Accelerator’s job.' },
      },
      fallback: { reason: 'The entry bay takes a global entry layer.' },
    },
  ],
  levers: [
    { id: 'lever-fail', machine: 'lever', prompt: 'PULL — fail us-east-1 (drill)', beat: 'failover' },
  ],
  beats: [
    {
      id: 'jitter', label: 'jitter test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-entry': 'ga' } }, pass: true,
          title: '✔ On the backbone by the nearest edge',
          lines: 'entry ............ 2 static anycast IPs, worldwide\nfirst hop ........ nearest AWS edge\nmiddle ........... AWS backbone (not the internet)\nRTT .............. flat — jitter gone',
          note: 'Anycast means every player enters at their closest edge; the backbone carries them the rest of the way. TCP and UDP both welcome.',
        },
        {
          when: { socket: { 'so-entry': 'geodns' } }, pass: false,
          title: '✘ Right Region, same rickety road',
          lines: 'DNS .............. picks a sensible Region ✓\npath ............. still the public internet\njitter ........... intact',
          note: 'Geo-DNS chooses the destination but not the ROUTE — the packets still ride the open internet. The backbone entry is the accelerator’s trick.',
        },
        { pass: false, title: '✘ Scenic route unchanged', lines: 'entry bay ........ empty', note: 'Socket the entry layer.' },
      ],
    },
    {
      id: 'failover', label: 'region-failover drill', trigger: 'lever',
      mutate: ['azDead:use1'],
      rules: [
        {
          when: { socket: { 'so-entry': 'ga' } }, pass: true,
          title: '✔ Same IPs, new Region, 30 seconds',
          lines: 'us-east-1 ........ failed (drill)\nclient IPs ....... UNCHANGED (static anycast)\nrouting .......... shifted behind them, health-based\nreconnects ....... one blip, no patch',
          note: 'The IPs never change — routing changes BEHIND them. Clients keep dialling the same two addresses while the accelerator steers to the healthy Region.',
        },
        {
          when: { socket: { 'so-entry': 'geodns' } }, pass: false,
          title: '✘ The world cached the dead Region',
          lines: 'DNS updated ...... ✓\nresolvers ........ still serving old answers (TTLs)\nplayers .......... timing out on stale IPs',
          note: 'DNS failover waits on every resolver’s cache to expire. Static anycast IPs don’t need the world to notice — the reroute is server-side.',
          alarm: 'OUTAGE — CLIENTS PINNED TO DEAD REGION',
        },
        { pass: false, title: '✘ Down with the Region', lines: 'entry ............ hard-coded IPs', note: 'A global entry layer first.', alarm: 'OUTAGE — CLIENTS PINNED TO DEAD REGION' },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Anycast in, backbone through, failover behind',
    body: 'Two static anycast IPs put every player on the AWS backbone at their nearest edge, and Region failure is a routing change the clients never see. CloudFront remains the answer for cacheable HTTP content — a different question. Close the ticket at the field terminal.',
    journal: 'Jitter + failover drills passed — Global Accelerator.',
  },
  diagnosis: {
    unlockedBy: 'players',
    title: 'Fast, stable UDP worldwide with failover the client never sees?',
    correct: {
      label: 'AWS Global Accelerator — static anycast IPs, nearest-edge entry, AWS backbone transit, health-based Region failover',
      journal: 'Diagnosis confirmed: Global Accelerator for TCP/UDP application acceleration.',
      confirmBody: 'The jitter is the public internet and the reconnects are hard-coded mortality. Fixed entry points, better road, movable destination.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'CloudFront in front of the game servers', rebuttal: 'CloudFront serves cacheable HTTP(S). The game is uncacheable UDP state — wrong tool; it’s refused at the bay for a reason.' },
      { label: 'More Regions, closer to everyone', rebuttal: 'More endpoints on the same jittery internet, more hard-coded IPs to patch. The ROUTE is the problem.' },
      { label: 'Bigger game servers to absorb the jitter', rebuttal: 'Jitter happens BEFORE the packet arrives — no server size smooths the road it travelled.' },
    ],
  },
  faultLamps: ['use1'],
};

export const S3PROTECT_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-5900', reporter: 'compliance', sev: 'SEV-2', title: 'The Corrupted Deploy',
    bodyHtml:
      `<div>A bad deploy overwrote thousands of S3 objects with corrupt data — and there was nothing to roll back to, because versioning was off. Meanwhile the regulator’s letter arrived: backup objects must be UNDELETABLE by anyone, admins included, for seven years.</div>` +
      `<pre>incident ......... mass overwrite, no undo\nversioning ....... OFF\nregulator ........ 7-y immutability, admin-proof\nS3 durability .... 11 nines — but durability ≠ undo</pre>`,
    hint: 'Probe the bucket and the letter, diagnose, then swing the versioning dial and socket the immutability bay. The bad-deploy drill (lever) AND the regulator test must pass.',
  },
  objectiveFix: 'Dial versioning ON · socket Object Lock (compliance)',
  objectiveDone: 'INC-5900 closed — every overwrite undoable, every backup untouchable.',
  summary: 'Symptom: a mass overwrite with no undo, plus a regulatory demand for admin-proof immutability. Fix: S3 VERSIONING — every overwrite/delete keeps the previous version, so recovery is “restore prior versions”, and it must be ON BEFORE the accident; plus S3 OBJECT LOCK in COMPLIANCE mode with a 7-year retention on the backup objects — undeletable by everyone including root, for the whole period. S3’s 11-nines durability protects against hardware, not against you; versioning and lock protect against people.',
  level: [
    { id: 'bucket', kind: 'shelfUnit', at: [4.5, 1.5], yaw: -Math.PI / 2, args: ['#e8a657'] },
    { id: 'letter', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2 },
    { id: 'dial', kind: 'aimPointer', at: [-2, -2] },
    { id: 'lever', kind: 'chaosLever', at: [3.5, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'bucket', machine: 'bucket', prompt: 'Inspect the bucket',
      kicker: 'S3 bucket', title: 'Durable, and defenceless',
      pre: 'durability ....... 11 nines (hardware-proof)\nversioning ....... OFF — overwrite = gone\nlast incident .... 14,000 objects corrupted\nundo ............. did not exist',
      journal: 'Bucket: perfectly durable storage faithfully preserving the corrupt overwrites — versioning off means no previous versions to restore.',
    },
    {
      id: 'letter', machine: 'letter', prompt: 'Read the regulator’s letter',
      kicker: 'compliance', title: 'Undeletable means UNDELETABLE',
      pre: 'requirement ...... backups immune to deletion\nincluding ........ administrators & root\nduration ......... 7 years\n“trust us” ....... explicitly insufficient',
      journal: 'Regulator: immutability that no credential can override, for seven years — that is Object Lock compliance mode, by name if not by letter.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-lock', kind: 'objlock', label: 'Object Lock — COMPLIANCE, 7y', spot: [-2.9, -4.6], visual: { hex: '#5e2a2a', glowHex: '#c96a6a' } },
      { id: 'mod-mfa', kind: 'mfadel', label: 'MFA-delete (speed bump)', spot: [-1.7, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0', h: 0.4 } },
      { id: 'mod-policy', kind: 'trustpolicy', label: '“Please don’t delete” policy doc', spot: [-2.3, -5.5], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-lock', label: 'immutability bay', at: [0.5, -1.2],
      blurb: 'What stands between the backups and every credential in the company: retention the platform itself refuses to break.',
      allow: { objlock: true, mfadel: true },
      refuse: {
        trustpolicy: { reason: 'An IAM policy is edited by the next admin — or the attacker holding the admin’s keys. The regulator said even YOU can’t delete them.' },
      },
      fallback: { reason: 'The immutability bay takes a retention control.' },
    },
  ],
  dials: [
    {
      id: 'versioning', machine: 'dial', initial: 'off',
      grabPrompt: '◀ ▶ swing bucket versioning · E/Ⓧ lock',
      positions: [
        { id: 'off', label: 'versioning: OFF', angle: 2.0 },
        { id: 'on', label: 'versioning: ON', angle: 1.0 },
      ],
    },
  ],
  levers: [
    { id: 'lever-deploy', machine: 'lever', prompt: 'PULL — replay the bad deploy (drill)', beat: 'deploy' },
  ],
  beats: [
    {
      id: 'deploy', label: 'bad-deploy drill', trigger: 'lever',
      rules: [
        {
          when: { dial: { versioning: 'on' } }, pass: true,
          title: '✔ 14,000 objects restored to their previous versions',
          lines: 'overwrites ....... created NEW versions\npriors ........... intact underneath\nrecovery ......... restore previous version, en masse\ndeletes .......... just delete markers — removable',
          note: 'With versioning on, an overwrite is an addition, not a destruction — the old bytes wait underneath. (It only protects incidents AFTER it’s enabled: turn it on before you need it.)',
        },
        {
          pass: false,
          title: '✘ Corrupt, durably, forever',
          lines: 'versioning ....... OFF\noverwrite ........ replaced the only copy\nundo ............. none — again',
          note: 'Eleven nines of durability faithfully preserved the corruption. Versioning is the undo button — swing it ON.',
          alarm: 'DATA LOSS — OVERWRITE WITHOUT VERSIONS',
        },
      ],
    },
    {
      id: 'regulator', label: 'regulator test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-lock': 'objlock' } }, pass: true,
          title: '✔ Delete denied — for root, too',
          lines: 'mode ............. COMPLIANCE · retention 7 y\nadmin delete ..... denied\nroot delete ...... denied\nshorten period ... denied — that’s the point',
          note: 'Compliance-mode Object Lock is the platform refusing everyone, including the account owner, until retention expires. The regulator reads this and stops writing letters.',
        },
        {
          when: { socket: { 'so-lock': 'mfadel' } }, pass: false,
          title: '✘ A speed bump, not a wall',
          lines: 'MFA-delete ....... stops casual deletion ✓\nadmin with MFA ... deletes just fine\nregulator ........ unimpressed',
          note: 'MFA-delete raises the bar; compliance demands the bar be UNREACHABLE. Object Lock in compliance mode is the admin-proof answer.',
        },
        { pass: false, title: '✘ Still deletable by anyone motivated', lines: 'immutability ..... none', note: 'Socket the lock.' },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Undo for accidents, a wall for everyone',
    body: 'Versioning turns overwrites into layers you can peel back; compliance-mode Object Lock makes the backups untouchable for seven years no matter whose credentials ask. (Cross-Region Replication adds the geographic copy when DR calls.) Close the ticket at the field terminal.',
    journal: 'Deploy drill + regulator test passed — versioning + Object Lock compliance.',
  },
  diagnosis: {
    unlockedBy: 'bucket',
    title: 'Undo for overwrites AND admin-proof retention — what combination?',
    correct: {
      label: 'S3 Versioning (previous versions survive overwrites/deletes) + Object Lock in COMPLIANCE mode with 7-year retention',
      journal: 'Diagnosis confirmed: versioning for recovery, Object Lock compliance for immutability.',
      confirmBody: 'Durability protects against hardware; versioning protects against mistakes; the lock protects against credentials. Dial and bay.',
      actionLabel: 'To the fix →',
    },
    wrongs: [
      { label: 'Rely on S3’s 11-nines durability', rebuttal: 'Durability means the bytes you wrote persist — INCLUDING the corrupt ones you wrote over the good ones.' },
      { label: 'Nightly bucket-to-bucket sync as backup', rebuttal: 'The sync would have faithfully copied the corruption by morning. Versioning keeps the priors IN PLACE.' },
      { label: 'Deny s3:DeleteObject in every IAM policy', rebuttal: 'Policies are editable by the admins the regulator is worried about. Compliance mode binds the PLATFORM, not the org chart.' },
    ],
  },
  faultLamps: ['bucket'],
};
