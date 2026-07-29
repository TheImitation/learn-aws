import type { MissionSpec } from '../spec';

/** Developer badge (DVA-C02) — batch 1: Development with AWS Services ×4 +
 *  Security ×2. Same grammar as the SAA specs: physical fixes, works-but
 *  traps with distinct lessons, alarms for the insecure, badges everywhere. */

export const IDEMPOTENT_SPEC: MissionSpec = {
  ticket: {
    incident: 'DEV-101', reporter: 'payments', sev: 'SEV-1', title: 'The Double Charge',
    bodyHtml:
      `<div>Customers are being charged twice for one order. The charge Lambda reads from the order queue — and every few hundred messages, the same order shows up on two invoices. Finance is on the phone.</div>` +
      `<pre>orders queue ....... at-least-once delivery\ncharge handler ..... no duplicate guard\nledger ............. 2× rows for order #88412</pre>`,
    hint: 'Probe the queue and the ledger, diagnose, then seat a guard in the handler bay and survive the replay storm.',
  },
  objectiveFix: 'Seat a duplicate guard in the handler bay',
  objectiveDone: 'DEV-101 closed — the second delivery bounces off the idempotency key.',
  summary: 'Symptom: duplicate charges from a queue-fed Lambda. Cause: at-least-once delivery plus a handler with side effects and no guard. Fix: an idempotency key — a conditional write (attribute_not_exists) records each order id atomically; re-deliveries see the key and return without charging. Disabling retries "fixes" duplicates by dropping real orders instead; retrying harder multiplies the damage. Queues will always deliver twice eventually — write handlers that don\'t care.',
  level: [
    { id: 'queue', kind: 'shelfUnit', at: [-8, 0], yaw: Math.PI / 2, args: ['#e7157b'], service: 'sqs' },
    { id: 'worker', kind: 'serverRack', at: [1.5, 0], yaw: -Math.PI / 2, service: 'lambda' },
    { id: 'ledger', kind: 'dbTower', at: [5.5, 1.5], service: 'dynamodb' },
    { id: 'lever', kind: 'chaosLever', at: [1.5, -4.5] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'payments floor', accent: '#e8a03c' },
    { kind: 'zone', at: [5.5, 1.5], w: 3, d: 3, hex: '#2a1a2e', text: 'ledger' },
    { kind: 'hazard', at: [1.5, -5.6], w: 3, d: 0.8 },
    { kind: 'light', at: [8.5, -5], yaw: -Math.PI / 2 },
  ],
  faultLamps: ['worker', 'ledger'],
  probes: [
    {
      id: 'queue', machine: 'queue', prompt: 'Inspect the order queue',
      kicker: 'SQS', title: 'At-least-once, in writing',
      pre: 'delivery ......... AT-LEAST-ONCE\nredrive .......... 3 receives\nduplicate rate ... ~0.4% under load',
      journal: 'Queue: at-least-once delivery is the contract — duplicates are normal operation, not a bug.',
    },
    {
      id: 'ledger', machine: 'ledger', prompt: 'Inspect the ledger',
      kicker: 'DynamoDB', title: 'Two rows, one order',
      pre: 'order #88412 ..... charged 2×, 41s apart\nwriter ........... charge-handler\nguard ............ none — blind PutItem',
      journal: 'Ledger: the same order id was written twice by two deliveries. Nothing checks for an existing key.',
    },
  ],
  diagnosis: {
    unlockedBy: 'ledger',
    title: 'Why do some customers get charged twice?',
    correct: {
      label: 'The handler has side effects but no idempotency guard — re-deliveries repeat the charge',
      journal: 'Diagnosis: at-least-once delivery × non-idempotent handler = duplicates. Guard the write.',
      confirmBody: 'The queue is doing exactly what queues do. The handler must make the second run harmless: record the order id with a conditional write, and skip the charge when the key already exists.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'SQS is broken — it should deliver exactly once', rebuttal: 'Standard queues promise at-least-once BY DESIGN. Even FIFO dedupe has a 5-minute window; client retries still get through. The handler owns correctness.' },
      { label: 'The Lambda needs more memory', rebuttal: 'It finishes fine — twice. Speed changes nothing about repeated side effects.' },
      { label: 'The visibility timeout is too short', rebuttal: 'Tuning it reduces one duplicate source but cannot eliminate redrives or client retries. It narrows the window; it doesn\'t close it.' },
    ],
  },
  pallet: {
    at: [5.5, -5],
    modules: [
      { id: 'mod-guard', kind: 'guard', label: 'Idempotency key — conditional write', spot: [4.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-noretry', kind: 'noretry', label: 'Disable retries kit', spot: [6.1, -4.6], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
      { id: 'mod-moreretry', kind: 'moreretry', label: 'Retry harder (×10)', spot: [4.9, -5.4], visual: { hex: '#7a3a3a', glowHex: '#e85f5f', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-guard', label: 'handler guard bay', at: [1.5, 2.2],
      blurb: 'The first line of the charge handler: whatever seats here runs before any side effect.',
      allow: { guard: true, noretry: true },
      refuse: {
        moreretry: { reason: 'More retries means MORE duplicate deliveries hitting a handler that already can\'t handle one.' },
      },
      fallback: { reason: 'The guard bay takes handler logic.' },
    },
  ],
  levers: [{ id: 'lever-replay', machine: 'lever', prompt: 'PULL — replay storm (drill)', beat: 'replay' }],
  sim: [
    { id: 'queue', machine: 'queue', route: [{ to: 'worker' }] },
    { id: 'worker', machine: 'worker', route: [{ to: 'ledger' }] },
    { id: 'ledger', machine: 'ledger', route: [{ to: 'deliver' }] },
  ],
  beats: [
    {
      id: 'burst', label: 'order burst', trigger: 'terminal',
      spawn: { node: 'queue', kind: 'order', n: 6, spacing: 0.35 },
      rules: [
        { when: { socket: { 'so-guard': 'guard' } }, pass: true,
          title: '✔ 6 orders, 6 charges', lines: 'orders ........ 6\ncharges ....... 6\nduplicates .... 0\nguard hits .... 2 (re-deliveries bounced)', note: 'The conditional write absorbed the re-deliveries — the charge ran once per order id.' },
        { when: { socket: { 'so-guard': 'noretry' } }, pass: false,
          title: '✘ 6 orders, 5 charges', lines: 'orders ........ 6\ncharges ....... 5\nLOST .......... 1 (transient error, no retry)', note: 'Disabling retries trades duplicates for LOST ORDERS. A transient failure now silently drops revenue. Retries are a feature — make the handler safe to retry.' },
        { pass: false, title: '✘ duplicate charges again',
          lines: 'orders ........ 6\ncharges ....... 7\nduplicates .... 1', note: 'The bay is empty — nothing stops a second delivery from charging again. Seat the guard.' },
      ],
    },
    {
      id: 'replay', label: 'replay storm', trigger: 'lever',
      spawn: { node: 'queue', kind: 'order', n: 10, spacing: 0.22 },
      rules: [
        { when: { socket: { 'so-guard': 'guard' } }, pass: true,
          title: '✔ replay storm shrugged off', lines: 'deliveries .... 10 (4 duplicates injected)\ncharges ....... 6\nguard hits .... 4', note: 'Every duplicate hit the key and bounced. Idempotency turns replay storms into noise.' },
        { when: { socket: { 'so-guard': 'noretry' } }, pass: false,
          title: '✘ storm dropped real orders', lines: 'deliveries .... 10\ncharged ....... 4 of 6 real\nLOST .......... 2', note: 'Under pressure, no-retries sheds legitimate work. The fix was never fewer deliveries — it was a handler that tolerates extra ones.' },
        { pass: false, title: '✘ finance is calling again',
          lines: 'deliveries .... 10\ncharges ....... 10', alarm: 'DUPLICATE CHARGES', note: 'Every replayed message charged again. Guard the handler.' },
      ],
    },
  ],
  verifyDone: {
    title: 'Idempotent under fire',
    body: 'Burst and replay storm both passed: one charge per order id, duplicates bounced off the conditional write.',
    journal: 'Verified: idempotency key holds under burst and replay. Duplicates are harmless now.',
  },
};

export const DDB_KEY_SPEC: MissionSpec = {
  ticket: {
    incident: 'DEV-102', reporter: 'orders-api', sev: 'SEV-2', title: 'The 9 AM Meltdown',
    bodyHtml:
      `<div>Every weekday at 09:00 the orders table throttles for twenty minutes, then recovers on its own. Capacity is provisioned sky-high and the bill proves it — yet the throttles keep coming.</div>` +
      `<pre>table ............. orders, PK = order_date\n09:00 writes ...... ALL share today's key\nthrottles ......... one partition, red-lined\nprovisioned WCU ... 10× actual need (idle)</pre>`,
    hint: 'Probe the table and the traffic, diagnose, then swing the key-design dial and pass both the write storm and the report query.',
  },
  objectiveFix: 'Dial the partition key to a high-cardinality design',
  objectiveDone: 'DEV-102 closed — writes spread across partitions; the 9 AM wall is gone.',
  summary: 'Symptom: morning write throttles despite huge provisioned capacity. Cause: PK = order_date — every 9 AM write shares one key, so one partition absorbs the entire load while the rest idle. Fix: a high-cardinality composite key (userId#date) spreads writes across partitions; reports use a keyed Query (or a GSI), never a Scan. Over-provisioning can\'t save a hot key: per-partition limits cap a single key no matter what you pay.',
  level: [
    { id: 'gate', kind: 'crowdGate', at: [-8, 0], yaw: Math.PI / 2 },
    { id: 'table', kind: 'dbTower', at: [3, 0.5], service: 'dynamodb' },
    { id: 'dial', kind: 'aimPointer', at: [0, -1.8] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'orders hall', accent: '#e8a03c' },
    { kind: 'zone', at: [3, 0.5], w: 3.2, d: 3.2, hex: '#2a1a2e', text: 'partition space' },
    { kind: 'racks', at: [7.5, 4], n: 3 },
    { kind: 'light', at: [-8.5, -5], yaw: Math.PI / 2 },
  ],
  faultLamps: ['table'],
  probes: [
    {
      id: 'table', machine: 'table', prompt: 'Inspect the orders table',
      kicker: 'DynamoDB', title: 'One key to melt them all',
      pre: "PK ............... order_date ('2026-07-29')\n09:00 writes ..... 100% on ONE key\npartition #7 ..... THROTTLED\npartitions 1-6 ... idle",
      journal: 'Table: PK is the calendar date. Every morning write lands on one partition; the other six idle.',
    },
    {
      id: 'gate', machine: 'gate', prompt: 'Inspect the traffic',
      kicker: 'order flow', title: 'Everyone at once',
      pre: 'shape ............ spike at 09:00 (shift start)\nwriters .......... 4,000 users\nreads ............ per-user order history',
      journal: 'Traffic: thousands of DIFFERENT users write at 9 — the data has natural cardinality the key ignores.',
    },
  ],
  diagnosis: {
    unlockedBy: 'table',
    title: 'Why does a 10×-provisioned table throttle?',
    correct: {
      label: 'The partition key is the date — every write shares one key and one partition\'s limit',
      journal: 'Diagnosis: hot partition. Capacity is per-partition; one key can\'t use the table\'s total.',
      confirmBody: 'Provisioned capacity spreads across partitions, but a single key lives on ONE of them. Redesign the key so the natural cardinality (users) does the spreading.',
      actionLabel: 'To the dial →',
    },
    wrongs: [
      { label: 'Not enough WCU — provision more', rebuttal: 'It\'s already 10× over-provisioned and idle. A hot key caps at the per-partition limit no matter how much you buy.' },
      { label: 'DynamoDB can\'t handle spikes', rebuttal: 'It handles millions of writes per second — spread across keys. The spike isn\'t the problem; the key concentrating it is.' },
      { label: 'Switch reads to strongly consistent', rebuttal: 'Read consistency has nothing to do with write throttling on one partition.' },
    ],
  },
  dials: [
    {
      id: 'keydial', machine: 'dial', initial: 'date',
      grabPrompt: '◀ ▶ swing the key design · E/Ⓧ lock',
      positions: [
        { id: 'date', label: 'PK = order_date (status quo)', angle: -0.7 },
        { id: 'composite', label: 'PK = userId#date (high cardinality)', angle: 0 },
        { id: 'single', label: 'PK = "orders" (one global bucket)', angle: 0.7 },
      ],
    },
  ],
  beats: [
    {
      id: 'storm', label: '9 AM write storm', trigger: 'terminal',
      rules: [
        { when: { dial: { keydial: 'composite' } }, pass: true,
          title: '✔ storm absorbed', lines: 'writes ........ 4,000 in 60s\nhot key ....... none (4,000 keys)\nthrottles ..... 0', note: 'High-cardinality keys let every partition carry its share. Same capacity, zero throttles.' },
        { when: { dial: { keydial: 'single' } }, pass: false,
          title: '✘ worse — one bucket for everything', lines: 'writes ........ 4,000 → key "orders"\nthrottles ..... 3,911', note: 'One constant key is the hot-partition anti-pattern in its purest form. Cardinality must come from the data.' },
        { pass: false, title: '✘ partition #7 red-lined again',
          lines: 'writes ........ 4,000 → key 2026-07-29\nthrottles ..... 2,208', note: 'The date key funnels the whole morning into one partition. Swing the dial.' },
      ],
    },
    {
      id: 'report', label: 'order-history query', trigger: 'terminal',
      rules: [
        { when: { dial: { keydial: 'composite' } }, pass: true,
          title: '✔ Query, 12ms, 40 RCU', lines: "op ............ Query PK=alice#2026-07\nitems ......... 38\nlatency ....... 12ms", note: 'With the user in the key, history reads are a cheap keyed Query — no Scan, no filter.' },
        { pass: false, title: '✘ Scan of shame',
          lines: 'op ............ Scan (no usable key)\nread .......... entire table for 38 items\nlatency ....... 5.8s', note: 'A key that doesn\'t match your access pattern forces Scans. Design keys from the queries backwards.' },
      ],
    },
  ],
  verifyDone: {
    title: 'Keys that spread the load',
    body: 'The write storm spread across 4,000 keys with zero throttles, and order history became a 12ms Query.',
    journal: 'Verified: composite key kills the hot partition and the Scan.',
  },
};

export const API_PROXY_SPEC: MissionSpec = {
  ticket: {
    incident: 'DEV-103', reporter: 'mobile-team', sev: 'SEV-2', title: 'The Mysterious 502',
    bodyHtml:
      `<div>The new endpoint runs perfectly in the Lambda console — and returns 502 to every real client. The mobile app also reports CORS errors on the staging domain. "The gateway is broken," says the commit message. It is not.</div>` +
      `<pre>GET /orders ...... 502 Bad Gateway\nlambda logs ...... SUCCESS, returns {items: [...]}\nbrowser .......... blocked by CORS</pre>`,
    hint: 'Probe the gateway and the handler, diagnose, then seat the response shaper — the contract is yours to honor.',
  },
  objectiveFix: 'Seat the proxy response shaper in the handler bay',
  objectiveDone: 'DEV-103 closed — statusCode, headers, stringified body: contract honored.',
  summary: 'Symptom: 502s from an endpoint whose Lambda "works". Cause: proxy integration forwards the function\'s return value AS the HTTP response — returning a bare object violates the {statusCode, headers, body:string} contract, so API Gateway emits 502. CORS is the same lesson: in proxy mode, YOUR headers are the response headers, so Access-Control-Allow-Origin (and an OPTIONS route) come from code. Bigger timeouts and retries can\'t fix a malformed shape.',
  level: [
    { id: 'clients', kind: 'crowdGate', at: [-8, 0], yaw: Math.PI / 2 },
    { id: 'gw', kind: 'routerArm', at: [-3, 0], service: 'apigw' },
    { id: 'handler', kind: 'serverRack', at: [3, 0], yaw: -Math.PI / 2, service: 'lambda' },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'api front door', accent: '#e8a03c' },
    { kind: 'tray', at: [-3, 0], to: [3, 0], h: 3.0 },
    { kind: 'zone', at: [-8, 0], w: 3.5, d: 6, hex: '#16233a', text: 'clients' },
    { kind: 'light', at: [8.5, -5], yaw: -Math.PI / 2 },
  ],
  faultLamps: ['gw'],
  probes: [
    {
      id: 'gw', machine: 'gw', prompt: 'Inspect the gateway',
      kicker: 'API Gateway', title: 'Proxy mode: your shape, verbatim',
      pre: 'integration ...... LAMBDA_PROXY\nexpects .......... {statusCode, headers, body:string}\ngot .............. {items: [...]} → 502',
      journal: 'Gateway: proxy integration forwards the return value verbatim. Malformed shape = 502, no matter what the code did.',
    },
    {
      id: 'handler', machine: 'handler', prompt: 'Inspect the handler',
      kicker: 'Lambda', title: 'Success (for whom?)',
      pre: "return items;      // an array\n// no statusCode, no headers,\n// body never stringified",
      journal: 'Handler: returns raw data. Nobody builds the HTTP envelope — in proxy mode, that\'s the handler\'s job.',
    },
  ],
  diagnosis: {
    unlockedBy: 'gw',
    title: 'Why does a succeeding Lambda produce 502s?',
    correct: {
      label: 'Proxy integration requires {statusCode, headers, body:string} — the handler returns a bare object',
      journal: 'Diagnosis: response-contract violation. The 502 is the gateway refusing to invent an HTTP response.',
      confirmBody: 'In proxy mode your return value IS the HTTP response. Shape it: statusCode, CORS headers, and a JSON.stringified body.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'The Lambda timeout is too low', rebuttal: 'The logs show clean sub-second successes. Timeouts produce 504-pattern errors, not a 502 on every fast call.' },
      { label: 'API Gateway needs more capacity', rebuttal: 'The gateway scales itself. It is rejecting the response SHAPE, not the volume.' },
      { label: 'The stage was never deployed', rebuttal: 'An undeployed stage 404s — these requests reach the function (the logs prove it) and die on the way back.' },
    ],
  },
  pallet: {
    at: [5.5, -5],
    modules: [
      { id: 'mod-shaper', kind: 'shaper', label: 'Response shaper — statusCode/headers/body + CORS', spot: [4.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-timeout', kind: 'timeout', label: 'Bigger timeout (29s)', spot: [6.1, -4.6], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
      { id: 'mod-retry', kind: 'retryall', label: 'Client auto-retry ×5', spot: [4.9, -5.4], visual: { hex: '#7a3a3a', glowHex: '#e85f5f', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-shape', label: 'handler response bay', at: [3, 2.2],
      blurb: 'The last line of the handler: whatever seats here builds the HTTP envelope the gateway forwards.',
      allow: { shaper: true, timeout: true },
      refuse: {
        retryall: { reason: 'Retrying a malformed response five times yields five 502s and a hotter pager.' },
      },
      fallback: { reason: 'The response bay takes handler output logic.' },
    },
  ],
  beats: [
    {
      id: 'contract', label: 'contract test', trigger: 'terminal',
      rules: [
        { when: { socket: { 'so-shape': 'shaper' } }, pass: true,
          title: '✔ 200 OK, body intact', lines: 'GET /orders ....... 200\nbody .............. JSON string, parsed fine\np95 ............... 96ms', note: 'The gateway forwarded exactly what the handler shaped. The 502 was never the gateway\'s fault.' },
        { when: { socket: { 'so-shape': 'timeout' } }, pass: false,
          title: '✘ still 502 (in 29 seconds or less)', lines: 'GET /orders ....... 502\nshape ............. still {items: [...]}', note: 'The response returns FAST and WRONG. Time limits don\'t reshape payloads — the contract does.' },
        { pass: false, title: '✘ 502 Bad Gateway',
          lines: 'GET /orders ....... 502\nreason ............ malformed proxy response', note: 'Nothing builds the envelope. Seat the shaper.' },
      ],
    },
    {
      id: 'cors', label: 'browser preflight', trigger: 'terminal',
      rules: [
        { when: { socket: { 'so-shape': 'shaper' } }, pass: true,
          title: '✔ preflight cleared', lines: 'OPTIONS /orders ... 204 + Allow-Origin\nGET from app ...... 200, headers present', note: 'CORS headers ride in the proxy response — the browser finally has permission in writing.' },
        { pass: false, title: '✘ blocked by CORS',
          lines: "browser ........... 'No Access-Control-Allow-Origin'", note: 'In proxy mode those headers only exist if your code sends them.' },
      ],
    },
  ],
  verifyDone: {
    title: 'The contract, honored',
    body: 'Contract test 200s with a parsed body; the browser preflight clears with CORS headers straight from the handler.',
    journal: 'Verified: proxy response shaped correctly; CORS handled in code.',
  },
};

export const STEPFN_RETRY_SPEC: MissionSpec = {
  ticket: {
    incident: 'DEV-104', reporter: 'checkout', sev: 'SEV-2', title: 'The Stuck Saga',
    bodyHtml:
      `<div>The order workflow — charge → reserve stock → email — wedges a dozen times a day. One rate-limited email API call and the whole execution dies with the money taken and no confirmation sent. Support un-sticks them by hand.</div>` +
      `<pre>state machine ..... charge → reserve → email\nemail step ........ throttled ~1/50 calls\non failure ........ execution FAILED, no cleanup</pre>`,
    hint: 'Probe the machine and the email step, diagnose, then dial in real error handling and survive the flaky-API drill.',
  },
  objectiveFix: 'Dial the error-handling posture to Retry + Catch',
  objectiveDone: 'DEV-104 closed — transient errors retry with backoff; permanent ones compensate.',
  summary: 'Symptom: sagas wedge on one flaky step. Cause: no Retry/Catch — a single throttle fails the execution mid-money-movement. Fix: per-state Retry (backoff on transient errors) plus Catch into a compensation branch (refund + alert) for the permanent ones. The trap: wrapping steps in try/catch that swallows errors keeps executions "green" while corrupting business state — the machine must SEE failures to handle them.',
  level: [
    { id: 'saga', kind: 'shelfUnit', at: [-4.5, 1.5], yaw: Math.PI / 2, args: ['#e7157b'], service: 'stepfunctions' },
    { id: 'email', kind: 'serverRack', at: [4.5, 1.5], yaw: -Math.PI / 2, service: 'none' },
    { id: 'dial', kind: 'aimPointer', at: [0, -1.8] },
    { id: 'lever', kind: 'chaosLever', at: [4.5, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'order saga line', accent: '#e8a03c' },
    { kind: 'tray', at: [-4.5, 1.5], to: [4.5, 1.5], h: 3.1 },
    { kind: 'zone', at: [4.5, 1.5], w: 3, d: 3, hex: '#332114', text: 'flaky email api' },
    { kind: 'hazard', at: [4.5, -5.3], w: 3, d: 0.8 },
  ],
  faultLamps: ['saga'],
  probes: [
    {
      id: 'saga', machine: 'saga', prompt: 'Inspect the state machine',
      kicker: 'Step Functions', title: 'No second chances',
      pre: 'states ........... Charge → Reserve → Email\nRetry ............ none\nCatch ............ none\nfailed runs ...... 14 today, money taken',
      journal: 'State machine: zero Retry/Catch. Any hiccup after the charge strands the customer\'s money.',
    },
    {
      id: 'email', machine: 'email', prompt: 'Inspect the email step',
      kicker: 'third-party API', title: 'Throttles happen',
      pre: 'error type ....... 429 TooManyRequests\nfrequency ........ ~2% of calls\nrecovery ......... succeeds seconds later',
      journal: 'Email API: classic transient failure — it recovers on its own seconds later. Perfect retry material.',
    },
  ],
  diagnosis: {
    unlockedBy: 'saga',
    title: 'Why does one throttled email strand a paid order?',
    correct: {
      label: 'The machine has no Retry for transient errors and no Catch to compensate for permanent ones',
      journal: 'Diagnosis: missing error handling — the saga can only succeed or wedge.',
      confirmBody: 'Give the flaky state a Retry with exponential backoff, and Catch what remains into a compensation branch: refund, alert, done. Failures become workflow, not tickets.',
      actionLabel: 'To the dial →',
    },
    wrongs: [
      { label: 'The email provider is unacceptable — replace it', rebuttal: 'Every provider throttles sometimes. A saga that dies on any 429 will die with the next provider too.' },
      { label: 'Run the whole saga inside one big Lambda', rebuttal: 'Now a crash loses ALL progress and the retry story gets worse — you\'d re-charge on every retry. Orchestration exists to checkpoint between steps.' },
      { label: 'Increase the execution timeout', rebuttal: 'The execution isn\'t slow — it\'s FAILED. Timeouts don\'t retry anything.' },
    ],
  },
  dials: [
    {
      id: 'errdial', machine: 'dial', initial: 'none',
      grabPrompt: '◀ ▶ swing the posture · E/Ⓧ lock',
      positions: [
        { id: 'none', label: 'No error handling (status quo)', angle: -0.7 },
        { id: 'retrycatch', label: 'Retry w/ backoff + Catch → compensate', angle: 0 },
        { id: 'swallow', label: 'try/catch everything, always return OK', angle: 0.7 },
      ],
    },
  ],
  levers: [{ id: 'lever-flaky', machine: 'lever', prompt: 'PULL — flaky-API drill', beat: 'drill' }],
  beats: [
    {
      id: 'drill', label: 'flaky-API drill', trigger: 'lever',
      rules: [
        { when: { dial: { errdial: 'retrycatch' } }, pass: true,
          title: '✔ 100 sagas, 100 outcomes', lines: 'runs .......... 100 (8 throttled)\nretried ....... 7 succeeded on attempt 2-3\ncompensated ... 1 (refund + alert)\nwedged ........ 0', note: 'Backoff absorbed the transient; Catch turned the one real failure into a refund instead of a ticket.' },
        { when: { dial: { errdial: 'swallow' } }, pass: false,
          title: '✘ 100 green runs, 8 lies', lines: 'runs .......... 100, all "SUCCEEDED"\nemails sent ... 92\ncustomers charged with no confirmation ... 8', alarm: 'SILENT DATA CORRUPTION', note: 'Swallowed errors don\'t disappear — they become corrupted business state that nobody is looking for. The machine must SEE failure to handle it.' },
        { pass: false, title: '✘ 8 wedged sagas',
          lines: 'runs .......... 100\nFAILED ........ 8, mid-money', note: 'No Retry, no Catch — every throttle is a stranded order. Swing the dial.' },
      ],
    },
    {
      id: 'audit', label: 'compensation audit', trigger: 'terminal',
      rules: [
        { when: { dial: { errdial: 'retrycatch' } }, pass: true,
          title: '✔ every failure accounted for', lines: 'failed sagas ....... 1\nrefunds issued ..... 1\nalerts raised ...... 1', note: 'Catch is the saga pattern: permanent failure triggers compensation, not archaeology.' },
        { pass: false, title: '✘ money unaccounted for',
          lines: 'charged, unfulfilled ... present\ncompensation path ..... none', note: 'Without Catch, cleanup is a support human with a spreadsheet.' },
      ],
    },
  ],
  verifyDone: {
    title: 'Failure is now a code path',
    body: 'The drill retried the transient, compensated the permanent, and wedged nothing; the audit found every failure matched by a refund.',
    journal: 'Verified: Retry+Catch — transient absorbed, permanent compensated.',
  },
};

export const JWT_SPEC: MissionSpec = {
  ticket: {
    incident: 'DEV-105', reporter: 'security', sev: 'SEV-1', title: 'The Forever Token',
    bodyHtml:
      `<div>A pentester just accessed another user's orders with a token they typed by hand. The API "checks JWTs" — by decoding them and reading the claims. Nobody checks who SIGNED them, or whether they expired in March.</div>` +
      `<pre>authorizer ........ none — Lambda decodes token itself\nverification ...... jwt.decode() (no signature check!)\npentest token ..... {"sub":"anyone","admin":true}</pre>`,
    hint: 'Probe the door and the token check, diagnose, then seat a real verifier. The client-side kit belongs in the bin.',
  },
  objectiveFix: 'Seat the Cognito JWT authorizer at the API door',
  objectiveDone: 'DEV-105 closed — unsigned tokens bounce at the front door.',
  summary: 'Symptom: hand-forged tokens accepted. Cause: jwt.decode() reads claims without verifying anything — claims are attacker input until the signature, issuer, audience, and expiry are checked against the issuer\'s JWKS. Fix: a Cognito authorizer on the API — verification happens before your code runs. Traps: "validate in the client app" is security theater (the attacker doesn\'t use your app); API keys meter traffic, they don\'t authenticate users.',
  level: [
    { id: 'clients', kind: 'crowdGate', at: [-8, 0], yaw: Math.PI / 2 },
    { id: 'door', kind: 'badgeDoor', at: [0, 1.5], yaw: -Math.PI / 2, args: ['#d15656'], service: 'cognito' },
    { id: 'api', kind: 'serverRack', at: [5, 1.5], yaw: -Math.PI / 2, service: 'lambda' },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'auth checkpoint', accent: '#d15656' },
    { kind: 'zone', at: [0, 1.5], w: 3, d: 4, hex: '#331a1a', text: 'restricted' },
    { kind: 'hazard', at: [0, -0.9], w: 3.2, d: 0.8 },
    { kind: 'light', at: [8.5, -5], yaw: -Math.PI / 2 },
  ],
  faultLamps: ['door'],
  probes: [
    {
      id: 'door', machine: 'door', prompt: 'Inspect the API door',
      kicker: 'front door', title: 'A lock that reads any key',
      pre: 'authorizer ....... NONE\ntoken handling ... decode-and-trust\nsignature check .. never\nexpiry check ..... never',
      journal: 'Door: tokens are decoded, never verified. A JWT without a checked signature is a sticky note.',
    },
    {
      id: 'api', machine: 'api', prompt: 'Inspect the handler',
      kicker: 'Lambda', title: 'Trusting the envelope',
      pre: "const claims = jwt.decode(token);\nif (claims.admin) allowEverything();",
      journal: 'Handler: reads admin straight out of an unverified payload. Claims are attacker input until verified.',
    },
  ],
  diagnosis: {
    unlockedBy: 'door',
    title: 'Why did a hand-typed token work?',
    correct: {
      label: 'Nothing verifies signature/issuer/audience/expiry — decoded claims are attacker-controlled',
      journal: 'Diagnosis: decode ≠ verify. Signature against the issuer\'s JWKS is what makes a claim true.',
      confirmBody: 'Put a Cognito authorizer at the door: it checks the signature against the user pool\'s keys, plus iss, aud, and exp — before a single line of your code runs.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Tokens should be longer/more random', rebuttal: 'A JWT isn\'t a password — its strength is the SIGNATURE. An unverified 4KB token is as forgeable as a short one.' },
      { label: 'Encrypt the token so users can\'t read it', rebuttal: 'Confidentiality isn\'t the issue — authenticity is. An encrypted-but-unverified token is still trusted blindly.' },
      { label: 'Block the pentester\'s IP', rebuttal: 'The finding isn\'t one attacker — it\'s that ANY client can mint credentials. The door must verify, not the blocklist.' },
    ],
  },
  pallet: {
    at: [5.5, -5],
    modules: [
      { id: 'mod-auth', kind: 'authorizer', label: 'Cognito authorizer — JWKS + iss/aud/exp', spot: [4.9, -4.6], visual: { hex: '#7a2e35', glowHex: '#e87a7a' } },
      { id: 'mod-client', kind: 'clientcheck', label: 'Client-side validation kit', spot: [6.1, -4.6], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
      { id: 'mod-apikey', kind: 'apikey', label: 'API key usage plan', spot: [4.9, -5.4], visual: { hex: '#31598c', glowHex: '#7ab3e0', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-door', label: 'door authorizer bay', at: [0, 4],
      blurb: 'Whatever seats here decides who gets past the front door — before any handler runs.',
      allow: { authorizer: true, apikey: true },
      refuse: {
        clientcheck: { reason: 'Validation inside the client app protects nothing — attackers use curl, not your app.', alarm: 'TRUSTING THE CLIENT' },
      },
      fallback: { reason: 'The door bay takes an authorization mechanism.' },
    },
  ],
  beats: [
    {
      id: 'access', label: 'login flow test', trigger: 'terminal',
      rules: [
        { when: { socket: { 'so-door': 'authorizer' } }, pass: true,
          title: '✔ real users in, 12ms overhead', lines: 'valid pool token ..... 200\nexpired token ........ 401\nwrong audience ....... 401', note: 'The authorizer verifies against the pool\'s JWKS and rejects the stale and the misaddressed — free, before your code.' },
        { when: { socket: { 'so-door': 'apikey' } }, pass: false,
          title: '✘ metered, not authenticated', lines: 'any request + key .... 200\nuser identity ........ unknown', note: 'Usage-plan keys throttle CLIENT APPS. They\'re shared and long-lived — they say nothing about the human.' },
        { pass: false, title: '✘ door wide open',
          lines: 'forged token ......... 200 (!!)', note: 'No verifier seated. Anything base64-shaped gets in.' },
      ],
    },
    {
      id: 'forgery', label: 'forgery drill', trigger: 'terminal',
      rules: [
        { when: { socket: { 'so-door': 'authorizer' } }, pass: true,
          title: '✔ forgeries bounce', lines: 'hand-minted admin .... 401 (bad signature)\nalg=none trick ....... 401\nreplayed expired ..... 401', note: 'Signature + iss + aud + exp: the four checks that turn a string into an identity.' },
        { pass: false, title: '✘ pentest still walks in', alarm: 'AUTH BYPASS',
          lines: 'hand-minted admin .... 200', note: 'Unverified claims remain attacker input. Seat the authorizer.' },
      ],
    },
  ],
  verifyDone: {
    title: 'Decode is not verify',
    body: 'Login flow passes with real tokens; every forgery — unsigned, alg=none, expired — bounces at the door.',
    journal: 'Verified: Cognito authorizer checks signature/iss/aud/exp before code runs.',
  },
};

export const SECRETS_CODE_SPEC: MissionSpec = {
  ticket: {
    incident: 'DEV-106', reporter: 'platform', sev: 'SEV-1', title: 'The Leaked Commit',
    bodyHtml:
      `<div>A scraper found the production database password in a public fork — committed eleven months ago, "removed" last week. The rotation plan is a shared doc titled DO NOT LOSE. Every deploy freezes while someone pastes the new password around.</div>` +
      `<pre>leak .............. git history, public fork\ncurrent storage ... source code constant\nrotation .......... manual, all-hands, quarterly-ish</pre>`,
    hint: 'Probe the repo and the app config, diagnose, then seat runtime secret fetching — and survive the rotation drill.',
  },
  objectiveFix: 'Seat the Secrets Manager binding in the config bay',
  objectiveDone: 'DEV-106 closed — secrets live outside artifacts and rotate without deploys.',
  summary: 'Symptom: credentials in git history, public. Cause: secrets baked into code/artifacts — history preserves every "removed" secret forever. Fix: fetch at runtime from Secrets Manager (cached with a TTL), scoped by IAM to the one ARN; managed rotation swaps the value with no redeploys. Traps: plain env vars pass the boot test but freeze the secret into config dumps and deploys (rotation drill fails); .gitignore protects the future, not history.',
  level: [
    { id: 'repo', kind: 'shelfUnit', at: [-5, 1.5], yaw: Math.PI / 2, args: ['#8a7a22'], service: 'none' },
    { id: 'app', kind: 'serverRack', at: [2, 0], yaw: -Math.PI / 2, service: 'lambda' },
    { id: 'vault', kind: 'badgeDoor', at: [6, 1.5], yaw: -Math.PI / 2, args: ['#d15656'], service: 'secrets' },
    { id: 'lever', kind: 'chaosLever', at: [2, -4.5] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  decor: [
    { kind: 'sign', at: [0, 7.5], text: 'credential hygiene', accent: '#d15656' },
    { kind: 'zone', at: [-5, 1.5], w: 3, d: 3, hex: '#33260f', text: 'git history' },
    { kind: 'hazard', at: [2, -5.6], w: 3, d: 0.8 },
    { kind: 'light', at: [-8.5, -5], yaw: Math.PI / 2 },
  ],
  faultLamps: ['app'],
  probes: [
    {
      id: 'repo', machine: 'repo', prompt: 'Inspect the repository',
      kicker: 'git', title: 'History never forgets',
      pre: "commit a41f9c (11 months ago)\n+ const DB_PASS = ******* (redacted)\nlast week: 'removed' — still in history\nforks .......... 14, one public",
      journal: 'Repo: deleting a committed secret changes the FUTURE, not the past. Fourteen forks carry it forever.',
    },
    {
      id: 'app', machine: 'app', prompt: 'Inspect the app config',
      kicker: 'runtime', title: 'Frozen at deploy time',
      pre: 'source ........... constant in code\nrotation ......... requires redeploy of 6 services\nlast rotation .... 11 months ago (never)',
      journal: 'App: the credential ships inside the artifact. Rotating means redeploying everything that embeds it.',
    },
  ],
  diagnosis: {
    unlockedBy: 'repo',
    title: 'What is the durable fix for a leaked credential?',
    correct: {
      label: 'Move the secret out of artifacts entirely: fetch at runtime from Secrets Manager, scoped by IAM, rotated automatically',
      journal: 'Diagnosis: secrets in artifacts leak and freeze. Runtime fetch + rotation is the pattern.',
      confirmBody: 'Rotate the leaked password NOW, then make the leak class impossible: the app asks Secrets Manager at runtime, IAM allows exactly that one secret, and rotation swaps values with zero deploys.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Add the file to .gitignore', rebuttal: '.gitignore stops FUTURE commits. The password is already in history and in fourteen forks.' },
      { label: 'Make the repository private', rebuttal: 'The public fork already exists — and every laptop clone carries full history. Visibility isn\'t revocation.' },
      { label: 'Base64-encode the password in code', rebuttal: 'Encoding is not encryption — atob() is not a security control. The scraper decodes it in the same millisecond.' },
    ],
  },
  pallet: {
    at: [6, -5],
    modules: [
      { id: 'mod-sm', kind: 'smbinding', label: 'Secrets Manager runtime binding + cache', spot: [5.4, -4.6], visual: { hex: '#7a2e35', glowHex: '#e87a7a' } },
      { id: 'mod-env', kind: 'envvar', label: 'Plain env-var injection', spot: [6.6, -4.6], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
      { id: 'mod-b64', kind: 'b64', label: 'Base64 "obfuscation" kit', spot: [5.4, -5.4], visual: { hex: '#7a3a3a', glowHex: '#e85f5f', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-config', label: 'app config bay', at: [2, 2.4],
      blurb: 'Where the app gets its database credential from. The artifact should hold a POINTER, not a password.',
      allow: { smbinding: true, envvar: true },
      refuse: {
        b64: { reason: 'Base64 is a data format, not a lock. This is the same leak wearing sunglasses.', alarm: 'FAKE ENCRYPTION' },
      },
      fallback: { reason: 'The config bay takes a credential source.' },
    },
  ],
  levers: [{ id: 'lever-rotate', machine: 'lever', prompt: 'PULL — emergency rotation drill', beat: 'rotate' }],
  beats: [
    {
      id: 'boot', label: 'app boot test', trigger: 'terminal',
      rules: [
        { when: { socket: { 'so-config': 'smbinding' } }, pass: true,
          title: '✔ boots clean, secret external', lines: 'source ......... secretsmanager:GetSecretValue\ncache .......... 5 min TTL\nin artifact .... only the ARN', note: 'The artifact carries a pointer; the value lives in the vault behind IAM.' },
        { when: { socket: { 'so-config': 'envvar' } }, pass: true,
          title: '✔ boots clean (for now)', lines: 'source ......... env var\nvisible in ..... console, config dumps, CI logs', note: 'It boots — but the value is frozen into config and visible to anyone who can read the function. Run the rotation drill before celebrating.' },
        { pass: false, title: '✘ no credential source',
          lines: 'db connect ..... FAILED (no secret)', note: 'Seat a credential source in the config bay.' },
      ],
    },
    {
      id: 'rotate', label: 'rotation drill', trigger: 'lever',
      rules: [
        { when: { socket: { 'so-config': 'smbinding' } }, pass: true,
          title: '✔ rotated in 40s, zero deploys', lines: 'rotation ....... managed Lambda\nnew value ...... live on next cache expiry\ndeploys ........ 0\ndowntime ....... 0', note: 'This is the payoff: a leak response measured in seconds, not an all-hands paste-a-thon.' },
        { when: { socket: { 'so-config': 'envvar' } }, pass: false,
          title: '✘ rotation = redeploy everything', lines: 'services embedding value ... 6\nredeploys required .......... 6\nmid-rotation auth failures .. yes', note: 'WORKS-BUT: env vars freeze the secret at deploy time. Rotation under pressure becomes a multi-service fire drill — exactly when you can least afford one.' },
        { pass: false, title: '✘ nothing to rotate',
          lines: 'credential source ... none', note: 'Seat a source first.' },
      ],
    },
  ],
  verifyDone: {
    title: 'Pointers, not passwords',
    body: 'Boot test clean with only an ARN in the artifact; the rotation drill swapped the credential in 40 seconds with zero deploys.',
    journal: 'Verified: runtime secret fetch + managed rotation. Leak class closed.',
  },
};
