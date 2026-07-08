import type { MissionSpec } from '../spec';

/** Secure-domain batch 1 — five specs, five verb mixes:
 *  sg-vs-nacl: ordered rule-slot sockets (first match wins) + two socket types
 *  encrypt-with-kms: leak-drill lever + key bay with a works-but-uncontrolled trap
 *  manage-secrets: rotation lever + bay (Parameter Store seats, fails rotation)
 *  detect-threats: the alarm IS the pass — three real tools, one right job
 *  ssm-session: inbound-posture dial + access bay (hardened bastion still fails) */

export const SG_VS_NACL_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-2208', reporter: 'security', sev: 'SEV-2', title: 'Block One Bad Actor',
    bodyHtml:
      `<div>A single abusive IP — 198.51.100.7 — is hammering the whole public subnet. Customers must keep flowing; the attacker must be dropped at the subnet edge. Someone already tried to “add a deny to the security group” and discovered there is no such thing.</div>` +
      `<pre>attacker ......... 198.51.100.7 ·全 subnet\ncustomers ........ must keep flowing (443)\nSG deny rule ..... does not exist — allow-only\nsubnet gate ...... NACL rack, rules by NUMBER</pre>`,
    hint: 'Probe the gate and the web rack, diagnose, then build the NACL rack in the right ORDER — and don’t forget the instance door. Attack test AND return-traffic test must pass.',
  },
  objectiveFix: 'Card the NACL rack in order (#100/#200/#300) · seat the SG at the instance door',
  objectiveDone: 'INC-2208 closed — one IP out, everyone else in.',
  summary: 'Symptom: one abusive IP against the whole subnet, and no way to deny it in a security group (SGs are stateful, instance-level, allow-only). Fix: a NACL DENY at rule #100 — rules evaluate in number order, lowest first — with the customer ALLOW behind it at #200, and an ephemeral-port return rule at #300 because NACLs are stateless. The SG still guards the instance door: layered security, each layer doing the job only it can do.',
  level: [
    { id: 'gate', kind: 'crowdGate', at: [-8, 0], yaw: Math.PI / 2 },
    { id: 'web', kind: 'serverRack', at: [4.5, 0], yaw: Math.PI / 2 },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'gate', machine: 'gate', prompt: 'Inspect the traffic',
      kicker: 'Subnet edge', title: 'One bad actor in the crowd',
      pre: 'customers ........ thousands, port 443\nattacker ......... 198.51.100.7, port 443\nsame port ........ can’t block by port\nNACL rack ........ empty — no rules carded',
      journal: 'Traffic: customers and the attacker share port 443 — only the SOURCE IP distinguishes them. The NACL rack is empty.',
    },
    {
      id: 'web', machine: 'web', prompt: 'Inspect web rack',
      kicker: 'web tier', title: 'The instance door',
      pre: 'security group ... allow 443 (not seated yet)\ndeny attempts .... “SG deny rule” — NO SUCH THING\nSG facts ......... stateful · instance-level · allow-only',
      body: 'Security groups track connections (replies come back free) but they cannot say NO to anyone. Denies belong to the subnet gate.',
      journal: 'Web rack: SGs are stateful and allow-only — a deny cannot be expressed here. That job belongs to the NACL.',
    },
  ],
  pallet: {
    at: [-4, -5],
    modules: [
      { id: 'mod-deny', kind: 'card-deny', label: 'NACL card: DENY 198.51.100.7', spot: [-4.9, -4.6], visual: { hex: '#5a2330', glowHex: '#e85f5f', h: 0.34 } },
      { id: 'mod-allow', kind: 'card-allow', label: 'NACL card: ALLOW 443 from anywhere', spot: [-3.7, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a', h: 0.34 } },
      { id: 'mod-eph', kind: 'card-eph', label: 'NACL card: ALLOW ephemeral return', spot: [-4.9, -5.4], visual: { hex: '#31598c', glowHex: '#7ab3e0', h: 0.34 } },
      { id: 'mod-sg', kind: 'sg-mod', label: 'Security group: allow 443 (stateful)', spot: [-3.7, -5.4], visual: { hex: '#3b2f4d', glowHex: '#b48ce0' } },
      { id: 'mod-all', kind: 'card-all', label: 'card: ALLOW ALL from 0.0.0.0/0', spot: [-2.5, -5.0], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.34 } },
    ],
  },
  sockets: [
    {
      id: 'slot100', label: 'rule slot #100 (evaluated FIRST)', at: [0, -3],
      blurb: 'The subnet gate reads its rules in NUMBER order — this slot fires first. Whatever matches here decides the packet before any later rule is even read.',
      allow: { 'card-deny': true, 'card-allow': true, 'card-eph': true },
      refuse: {
        'sg-mod': { reason: 'That’s an instance-level door (a security group) — the rack takes subnet NACL cards.' },
        'card-all': { reason: 'BLOCKED: ALLOW ALL from everywhere opens every port to the planet.', alarm: 'SECURITY — ALL-PORTS-OPEN RULE ATTEMPT' },
      },
      fallback: { reason: 'The rack takes NACL rule cards.' },
    },
    {
      id: 'slot200', label: 'rule slot #200', at: [0, 0],
      blurb: 'Second in evaluation order — packets that didn’t match #100 are judged here.',
      allow: { 'card-deny': true, 'card-allow': true, 'card-eph': true },
      refuse: {
        'sg-mod': { reason: 'That’s an instance-level door (a security group) — the rack takes subnet NACL cards.' },
        'card-all': { reason: 'BLOCKED: ALLOW ALL from everywhere opens every port to the planet.', alarm: 'SECURITY — ALL-PORTS-OPEN RULE ATTEMPT' },
      },
      fallback: { reason: 'The rack takes NACL rule cards.' },
    },
    {
      id: 'slot300', label: 'rule slot #300 (last)', at: [0, 3],
      blurb: 'Last chance before the default DENY. Return traffic needs its ephemeral-port allow somewhere — NACLs are stateless and won’t remember the request.',
      allow: { 'card-deny': true, 'card-allow': true, 'card-eph': true },
      refuse: {
        'sg-mod': { reason: 'That’s an instance-level door (a security group) — the rack takes subnet NACL cards.' },
        'card-all': { reason: 'BLOCKED: ALLOW ALL from everywhere opens every port to the planet.', alarm: 'SECURITY — ALL-PORTS-OPEN RULE ATTEMPT' },
      },
      fallback: { reason: 'The rack takes NACL rule cards.' },
    },
    {
      id: 'so-sg', label: 'instance door (security group)', at: [4.5, -2.6],
      blurb: 'The stateful, instance-level layer: allow-only, and replies to allowed requests come back automatically. It cannot deny anyone — that’s the NACL’s power.',
      allow: { 'sg-mod': true },
      refuse: {
        'card-deny': { reason: 'Security groups cannot express a DENY — they are allow-only. Subnet-wide denies live in the NACL rack.' },
        'card-allow': { reason: 'That’s a subnet NACL card — the instance door takes a security group.' },
        'card-eph': { reason: 'No need: security groups are STATEFUL — replies to allowed requests return automatically.' },
        'card-all': { reason: 'BLOCKED: every port, every source, straight to the instance.', alarm: 'SECURITY — ALL-PORTS-OPEN RULE ATTEMPT' },
      },
      fallback: { reason: 'The instance door takes a security group module.' },
    },
  ],
  sim: [
    { id: 'gate', machine: 'gate', route: [{ to: 'np' }] },
    { id: 'np', at: [0, 0], route: [{ when: { socket: { slot100: 'card-allow' } }, to: 'webX' }, { to: 'webN' }] },
    { id: 'webN', machine: 'web', route: [{ to: 'deliver' }] },
    { id: 'webX', machine: 'web', route: [{ to: 'drop' }] },
  ],
  beats: [
    {
      id: 'attack', label: 'attack-block test', trigger: 'terminal',
      spawn: { node: 'gate', kind: 'packet', n: 6, spacing: 0.25 },
      rules: [
        {
          when: { socket: { slot100: 'card-deny', slot200: 'card-allow', 'so-sg': 'sg-mod' } }, pass: true,
          title: '✔ Attacker dropped at #100 — customers flow at #200',
          lines: 'rule #100 ........ DENY 198.51.100.7  ← fires first\nrule #200 ........ ALLOW 443 (customers)\ninstance door .... SG allow 443 (stateful)\nattacker ......... DROPPED at the subnet gate',
          note: 'NACL rules evaluate in NUMBER order, lowest first. The narrow DENY sits above the broad ALLOW, so the one bad IP dies at the gate and nobody else notices.',
        },
        {
          when: { socket: { slot100: 'card-allow' } }, pass: false,
          title: '✘ BREACH — the attacker matched ALLOW first',
          lines: 'rule #100 ........ ALLOW 443 (matches EVERYONE)\nrules below ...... never reached for 443\nattacker ......... INSIDE',
          note: 'First match wins. With the broad ALLOW at #100, your DENY below it never fires — for 443 traffic the gate stops reading. Put the DENY at the LOWEST number, above the allow.',
          alarm: 'INTRUSION — ABUSIVE IP INSIDE THE SUBNET',
        },
        {
          when: { socket: { 'so-sg': null } }, pass: false,
          title: '✘ Nobody gets in — attacker OR customers',
          lines: 'subnet gate ...... fine\ninstance door .... NO security group seated\ncustomers ........ refused at the rack',
          note: 'Layered means BOTH layers. The NACL passed your customers to an instance with no allow rule at its own door — seat the security group.',
        },
        {
          pass: false,
          title: '✘ The subnet gate isn’t doing its job',
          lines: 'expected ......... DENY first (#100), ALLOW behind it (#200)\nrack ............. not in that order',
          note: 'Deny the bad IP FIRST, allow the customers behind it. Check the card order on the rack.',
        },
      ],
    },
    {
      id: 'return', label: 'return-traffic test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { slot300: 'card-eph' } }, pass: true,
          title: '✔ Responses flow — ephemeral return allowed',
          lines: 'inbound 443 ...... allowed (#200)\nresponse ......... allowed (#300, ephemeral range)\ncustomers ........ pages load',
          note: 'NACLs are STATELESS: the response is a brand-new packet and needs its own rule. (The security group never needed one — stateful means replies ride the tracked connection.)',
        },
        {
          pass: false,
          title: '✘ Requests in, responses DROPPED',
          lines: 'inbound 443 ...... allowed\nresponse ......... BLOCKED — no ephemeral rule\ncustomers ........ white screens',
          note: 'Stateless means the return trip needs its own allow — card the ephemeral range at #300. Security groups are stateful and permit replies automatically; NACLs remember nothing.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ One bad IP out, everyone else in',
    body: 'The subnet gate denies the attacker at #100 and admits customers at #200, the stateless return rides #300, and the stateful SG guards the instance door. Two layers, two different tools. Close the ticket at the field terminal.',
    journal: 'Attack + return tests passed — NACL deny-first ordering + SG at the door.',
  },
  diagnosis: {
    unlockedBy: 'web',
    title: 'How do you block ONE IP from the whole subnet?',
    correct: {
      label: 'A NACL DENY rule at the subnet gate, numbered BELOW the allows — security groups are allow-only and cannot deny',
      journal: 'Diagnosis confirmed: NACL deny (rule order matters, lowest first); SGs cannot express a deny.',
      confirmBody: 'The gate reads rules in number order and stops at the first match — so the DENY must be carded above the broad ALLOW. And since NACLs are stateless, the responses need their own ephemeral rule. Build the rack.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Add a deny rule to the security group', rebuttal: 'Security groups have no deny rules — stateful, instance-level, ALLOW-ONLY. That’s why this ticket exists.' },
      { label: 'Close port 443 on the whole subnet', rebuttal: 'That blocks the customers too. The ticket is ONE abusive IP; everyone else must keep flowing.' },
      { label: 'Rotate the TLS certificate', rebuttal: 'The attacker isn’t exploiting your cert — they’re hammering the port like any client. This is a network-layer problem.' },
    ],
  },
  faultLamps: ['web'],
};

export const KMS_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-8807', reporter: 'security', sev: 'SEV-2', title: 'The Leaked Snapshot',
    bodyHtml:
      `<div>An EBS snapshot of the customer volume was shared to the wrong account last month — in plaintext. Whoever holds that copy holds the data. The mandate: storage must be USELESS when it leaks, with key access tightly controlled and every use audited.</div>` +
      `<pre>leak ............. snapshot, plaintext, gone\nmandate .......... leaked bytes = noise\nkey control ...... scoped policy + rotation\naudit ............ every key use logged</pre>`,
    hint: 'Probe the shelf and the app rack, diagnose, then socket the right key in the key bay. The leak drill (lever) AND the key-control audit must pass.',
  },
  objectiveFix: 'Socket a key in the key bay (pallet → key bay)',
  objectiveDone: 'INC-8807 closed — leaked bytes are noise now.',
  summary: 'Symptom: a plaintext snapshot leaked — raw storage readable by whoever copies it. Fix: encrypt at rest with a customer-managed KMS key (CMK): the volume and every snapshot become ciphertext, decryption is gated by the key policy + IAM, every key use lands in CloudTrail, and you control rotation. AWS-managed keys encrypt too, but you can’t scope their policy or schedule their rotation — the mandate said CONTROLLED. TLS already covers transit; KMS covers rest.',
  level: [
    { id: 'app', kind: 'serverRack', at: [-3, 2], yaw: Math.PI / 2 },
    { id: 'snaps', kind: 'shelfUnit', at: [5, 2], yaw: -Math.PI / 2, args: ['#8f7ae6'] },
    { id: 'lever', kind: 'chaosLever', at: [1, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'snaps', machine: 'snaps', prompt: 'Inspect snapshot shelf',
      kicker: 'EBS snapshots', title: 'Readable by anyone who holds them',
      pre: 'encryption ....... NONE — plaintext blocks\nlast leak ........ shared cross-account\nblast radius ..... the entire customer table',
      journal: 'Snapshots: plaintext — a copy IS the data. Encryption at rest is the only thing that makes a leak boring.',
    },
    {
      id: 'app', machine: 'app', prompt: 'Inspect app rack',
      kicker: 'app tier', title: 'Encrypted in transit, naked at rest',
      pre: 'TLS in transit ... ✓\nvolumes .......... unencrypted\nsnapshots ........ inherit the volume: plaintext',
      journal: 'App: TLS covers the wire; the disks and their snapshots are plaintext. At-rest is the gap.',
    },
  ],
  pallet: {
    at: [-2, -5.2],
    modules: [
      { id: 'mod-cmk', kind: 'cmk', label: 'Customer-managed KMS key (CMK)', spot: [-2.9, -4.8], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-awskey', kind: 'awskey', label: 'AWS-managed KMS key', spot: [-1.7, -4.8], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-keyfile', kind: 'keyfile', label: 'keys.txt on the instance', spot: [-2.3, -5.7], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-key', label: 'key bay', at: [1, 0],
      blurb: 'The key bay feeds encryption for the volumes and every snapshot cut from them. KMS keys never leave the service — callers ask KMS to use them, IAM decides, CloudTrail records.',
      allow: { cmk: true, awskey: true },
      refuse: {
        keyfile: { reason: 'BLOCKED: plaintext key material on an instance disk — the next leak ships the key WITH the data.', alarm: 'SECURITY — PLAINTEXT KEY MATERIAL ON DISK' },
      },
      fallback: { reason: 'The key bay takes a KMS key.' },
    },
  ],
  levers: [
    { id: 'lever-leak', machine: 'lever', prompt: 'PULL — leak the snapshot (drill)', beat: 'leak' },
  ],
  beats: [
    {
      id: 'leak', label: 'leak drill', trigger: 'lever',
      rules: [
        {
          when: { socket: { 'so-key': 'any' } }, pass: true,
          title: '✔ The leaked copy is ciphertext',
          lines: 'snapshot ......... encrypted (KMS)\nleaked copy ...... noise without a decrypt grant\ndecrypt calls .... IAM-gated · CloudTrail-logged',
          note: 'Encrypted at rest: whoever holds the snapshot holds static. Decryption happens only through KMS, only for identities the key policy allows — and every call is on the record.',
        },
        {
          pass: false,
          title: '✘ The leak is plaintext — again',
          lines: 'snapshot ......... PLAINTEXT\nleaked copy ...... the entire dataset\nmitigation ....... none possible after the fact',
          note: 'Raw storage must be useless when copied. Socket a KMS key so the volumes — and every snapshot cut from them — are ciphertext.',
          alarm: 'DATA EXPOSURE — PLAINTEXT SNAPSHOT LEAKED',
        },
      ],
    },
    {
      id: 'audit', label: 'key-control audit', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-key': 'cmk' } }, pass: true,
          title: '✔ Policy scoped, rotation scheduled, usage audited',
          lines: 'key policy ....... yours — scoped grants\nrotation ......... yours — scheduled\nkey usage ........ CloudTrail, every call',
          note: 'A customer-managed key gives you the policy, the grants, and the rotation schedule — the “tightly controlled” half of the mandate. (Envelope encryption keeps volume: KMS wraps a data key once; the bulk bytes never leave the box.)',
        },
        {
          when: { socket: { 'so-key': 'awskey' } }, pass: false,
          title: '✘ Encrypts fine — controls nothing',
          lines: 'key policy ....... AWS-managed, not editable\nrotation ......... automatic, not yours to set\ngrants ........... cannot scope',
          note: 'AWS-managed keys make the bytes ciphertext, but YOU can’t scope the key policy, issue grants, or set rotation. The mandate said controlled AND audited — that’s the customer-managed key.',
        },
        {
          pass: false,
          title: '✘ No key, no controls',
          lines: 'key bay .......... EMPTY',
          note: 'Socket a key first — then we can argue about who may use it.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Leaks are boring now',
    body: 'The volumes and snapshots are ciphertext under a customer-managed key: leaked bytes are noise, decryption is policy-gated, every key use is in CloudTrail, rotation is scheduled. TLS in transit + KMS at rest. Close the ticket at the field terminal.',
    journal: 'Leak drill + key audit passed — CMK at rest, policy-gated, audited.',
  },
  diagnosis: {
    unlockedBy: 'snaps',
    title: 'How do you make a leaked snapshot worthless?',
    correct: {
      label: 'Encrypt the volume — and thus its snapshots — with a customer-managed KMS key, gating decryption via key policy + IAM',
      journal: 'Diagnosis confirmed: KMS encryption at rest with a customer-managed key; decrypt gated and audited.',
      confirmBody: 'Plaintext at rest means every copy is the data. Under a CMK, the copy is ciphertext and the KEY is the thing you guard — with a policy you control and an audit line for every use. Pick the right key from the pallet.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Restrict who can create snapshots', rebuttal: 'The copies that already exist stay readable, and one over-permissioned role later you’re back here. Make the BYTES worthless instead.' },
      { label: 'Store the volumes in a private subnet', rebuttal: 'Subnets fence the network — a SHARED SNAPSHOT walks out through the API, not the wire.' },
      { label: 'Rely on TLS everywhere', rebuttal: 'TLS protects data IN TRANSIT. The snapshot leaked AT REST — encryption of the stored bytes is the missing half.' },
    ],
  },
  faultLamps: ['snaps'],
};

export const SECRETS_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-9102', reporter: 'appsec', sev: 'SEV-2', title: 'The Password in the Repo',
    bodyHtml:
      `<div>The production database password is a string literal in config.js — and it has been in git history since 2023. Every clone of the repo is a credential leak. The password hasn’t changed in three years because changing it means redeploying everything that hard-codes it.</div>` +
      `<pre>secret ........... prod DB password\nlocation ......... config.js + git history\nlast rotated ..... 3 years ago\nrotation cost .... a redeploy of everything</pre>`,
    hint: 'Probe the rack and the database, diagnose, then socket a secret store. The leak audit AND the rotation drill (lever) must pass.',
  },
  objectiveFix: 'Socket a secret store in the bay (pallet → secret bay)',
  objectiveDone: 'INC-9102 closed — no secrets in code, rotation on a schedule.',
  summary: 'Symptom: a production password hard-coded and committed — every repo clone is a leak, and rotation is so painful it never happens. Fix: AWS Secrets Manager — the app fetches the secret at runtime via its IAM role (no keys in code), retrieval is policy-gated and CloudTrail-logged, and a managed Lambda rotates the credential automatically. Parameter Store SecureString also stores secrets safely, but built-in automatic rotation is the Secrets Manager difference.',
  level: [
    { id: 'app', kind: 'serverRack', at: [-3, 0], yaw: Math.PI / 2 },
    { id: 'db', kind: 'dbTower', at: [3.5, 1.5] },
    { id: 'lever', kind: 'chaosLever', at: [0.5, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'app', machine: 'app', prompt: 'Inspect app rack',
      kicker: 'app tier', title: 'The secret in plain sight',
      pre: 'config.js ........ db_pass = "Hunter2_prod!"\ngit history ...... since 2023, every clone\nruntime IAM ...... role exists, unused for this',
      journal: 'App: the DB password is a string literal in config.js and lives in git history — every clone is a leak.',
    },
    {
      id: 'db', machine: 'db', prompt: 'Inspect the database',
      kicker: 'prod DB', title: 'Three years, one password',
      pre: 'password age ..... 3 years\nknown holders .... unknowable (git clones)\nrotation ......... never — “too risky”',
      journal: 'DB: same password for three years because rotating means redeploying everything that hard-codes it.',
    },
  ],
  pallet: {
    at: [4.5, -5],
    modules: [
      { id: 'mod-sm', kind: 'sm', label: 'Secrets Manager module', spot: [3.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-ps', kind: 'ps', label: 'Parameter Store SecureString', spot: [5.1, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-env', kind: 'envfile', label: '.env file (chmod 600, promise)', spot: [4.5, -5.5], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-secrets', label: 'secret bay', at: [0.5, -1.2],
      blurb: 'The runtime source of truth: the app’s IAM role fetches credentials from here at startup — nothing in code, every retrieval logged. The right module even rotates the credential for you.',
      allow: { sm: true, ps: true },
      refuse: {
        envfile: { reason: 'BLOCKED: a .env file is the same plaintext secret with better manners — one AMI copy or debug dump and it leaks again.', alarm: 'SECURITY — PLAINTEXT SECRET ON DISK' },
      },
      fallback: { reason: 'The secret bay takes a managed secret store.' },
    },
  ],
  levers: [
    { id: 'lever-rotate', machine: 'lever', prompt: 'PULL — force a rotation (drill)', beat: 'rotate' },
  ],
  beats: [
    {
      id: 'leak', label: 'leak audit', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-secrets': 'any' } }, pass: true,
          title: '✔ No secrets in code — fetched at runtime',
          lines: 'config.js ........ no literals\nfetch path ....... IAM role → secret store\nretrievals ....... policy-gated · CloudTrail-logged\ngit history ...... old password (now dead weight)',
          note: 'The app asks the store at runtime with its IAM role — nothing to commit, nothing to clone, and every retrieval is on the record. (Purge the old value from git anyway; it stops mattering after rotation.)',
        },
        {
          pass: false,
          title: '✘ The repo still holds the keys to prod',
          lines: 'config.js ........ db_pass = "Hunter2_prod!"\nclones ........... every laptop, every fork\naudit trail ...... none — a string can’t log',
          note: 'While the literal exists, every clone is a credential leak. Socket a secret store and make the app FETCH at runtime via its role.',
        },
      ],
    },
    {
      id: 'rotate', label: 'rotation drill', trigger: 'lever',
      rules: [
        {
          when: { socket: { 'so-secrets': 'sm' } }, pass: true,
          title: '✔ Rotated by the managed Lambda — nobody woke up',
          lines: 'rotation ......... automatic (managed Lambda)\nDB + secret ...... updated in lockstep\napp .............. fetched the new value, no redeploy\ngit history ...... now points at a dead password',
          note: 'Secrets Manager rotates the credential ON A SCHEDULE and keeps the database and the secret in sync — the three-year password problem can’t come back.',
        },
        {
          when: { socket: { 'so-secrets': 'ps' } }, pass: false,
          title: '✘ Stored safely — rotated by hope',
          lines: 'storage .......... SecureString ✓ (KMS-encrypted)\nrotation ......... NOT built in\nyour options ..... cron + custom Lambda + luck',
          note: 'Parameter Store keeps the secret safely and fetches fine — but built-in AUTOMATIC ROTATION is what Secrets Manager adds. The ticket’s root cause was “rotation never happens.” Make it automatic.',
        },
        {
          pass: false,
          title: '✘ Nothing to rotate',
          lines: 'secret bay ....... EMPTY',
          note: 'Socket a secret store first.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ No secrets in code, rotation on rails',
    body: 'The app fetches its credential at runtime via IAM, every retrieval is logged, and a managed Lambda rotates the password on schedule — the repo history now points at a dead string. Close the ticket at the field terminal.',
    journal: 'Leak audit + rotation drill passed — Secrets Manager with automatic rotation.',
  },
  diagnosis: {
    unlockedBy: 'app',
    title: 'What’s the real fix for a committed password?',
    correct: {
      label: 'Move it to Secrets Manager, fetch at runtime via the IAM role, and enable automatic rotation',
      journal: 'Diagnosis confirmed: runtime fetch via IAM + automatic rotation — the literal dies and stays dead.',
      confirmBody: 'Deleting the line isn’t enough — git remembers, and the password is three years stale. The fix is structural: fetch at runtime with the role, log every retrieval, and let a managed Lambda rotate it so the leaked value goes stale on its own. Pick the store that rotates.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Delete the line and force-push', rebuttal: 'Git history, forks, and three years of clones still hold it — and the password itself is unchanged. The VALUE must die, not just the line.' },
      { label: 'Encrypt config.js', rebuttal: 'The app must decrypt it to run, so the key ships alongside — you’ve moved the secret one file over.' },
      { label: 'Restrict repo access', rebuttal: 'It already leaked to every past clone, and repo ACLs don’t rotate a three-year-old production password.' },
    ],
  },
  faultLamps: ['app'],
};

export const DETECT_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-1177', reporter: 'secops', sev: 'SEV-2', title: 'The Quiet Miner',
    bodyHtml:
      `<div>Finance flagged the bill: an instance has been mining cryptocurrency for THREE WEEKS. The flow logs saw the mining pool, the DNS logs saw the lookups, CloudTrail saw the stolen-key API calls — and nothing was watching any of it. The mandate: continuous, agentless detection of malicious behaviour, from the logs we already have.</div>` +
      `<pre>compromise ....... 3 weeks undetected\nentry ............ leaked access key (Tor exits)\nevidence ......... flow + DNS + CloudTrail logs\nwatchers ......... NONE</pre>`,
    hint: 'Probe the victim and the log feeds, diagnose, then socket the right watcher. Replaying the compromise (lever) should set off the klaxon — this time, the alarm is the point.',
  },
  objectiveFix: 'Socket the right watcher in the monitoring bay',
  objectiveDone: 'INC-1177 closed — the logs have eyes now.',
  summary: 'Symptom: a crypto-miner ran for three weeks in plain sight of the logs, because nothing was reading them. Fix: Amazon GuardDuty — continuous, agentless threat detection over VPC flow logs, DNS logs, and CloudTrail; the replayed compromise produced a finding in seconds. Know the trio: GuardDuty detects malicious BEHAVIOUR from logs, Inspector scans workloads for CVEs, Macie finds sensitive data (PII) in S3 — right tool, right sense organ.',
  level: [
    { id: 'gate', kind: 'crowdGate', at: [-8, 0], yaw: Math.PI / 2 },
    { id: 'victim', kind: 'serverRack', at: [3.5, 1.5], yaw: Math.PI / 2 },
    { id: 'lever', kind: 'chaosLever', at: [3, -4.2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'victim', machine: 'victim', prompt: 'Inspect the victim instance',
      kicker: 'compromised EC2', title: 'Three weeks at 100%',
      pre: 'CPU .............. 100% for 21 days\nprocess .......... xmrig (miner)\nentry ............ leaked key · Tor exit IPs\nnoticed by ....... the BILL',
      journal: 'Victim: mined for 3 weeks; entry was a leaked key used from Tor exits. Detection came from finance, not security.',
    },
    {
      id: 'gate', machine: 'gate', prompt: 'Inspect the log feeds',
      kicker: 'telemetry', title: 'The evidence nobody read',
      pre: 'VPC flow logs .... connections to a mining pool\nDNS logs ......... pool lookups, hourly\nCloudTrail ....... anomalous API calls\nreaders .......... none',
      journal: 'The logs recorded everything — flow, DNS, CloudTrail. Recording is not watching.',
    },
  ],
  pallet: {
    at: [-4, -5],
    modules: [
      { id: 'mod-gd', kind: 'gd', label: 'GuardDuty detector', spot: [-4.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-insp', kind: 'inspector', label: 'Inspector scanner (CVEs)', spot: [-3.7, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-macie', kind: 'macie', label: 'Macie classifier (PII in S3)', spot: [-4.9, -5.5], visual: { hex: '#3b2f4d', glowHex: '#b48ce0' } },
      { id: 'mod-fw', kind: 'firewall', label: 'A thicker firewall', spot: [-3.7, -5.5], visual: { hex: '#5a2330', glowHex: '#e85f5f' } },
    ],
  },
  sockets: [
    {
      id: 'so-watch', label: 'monitoring bay', at: [0, -1.2],
      blurb: 'Whatever sits here reads the telemetry the site already produces. Pick by JOB: behaviour in logs, vulnerabilities in workloads, or sensitive data in buckets — three different sense organs.',
      allow: { gd: true, inspector: true, macie: true },
      refuse: {
        firewall: { reason: 'Prevention is not detection — the miner came in through a STOLEN KEY, not an open port. You need something that reads the logs, not another wall.' },
      },
      fallback: { reason: 'The monitoring bay takes a detection service.' },
    },
  ],
  levers: [
    { id: 'lever-replay', machine: 'lever', prompt: 'PULL — replay the compromise (drill)', beat: 'replay' },
  ],
  sim: [
    { id: 'gate', machine: 'gate', route: [{ to: 'victimN' }] },
    { id: 'victimN', machine: 'victim', route: [{ to: 'deliver' }] },
  ],
  beats: [
    {
      id: 'replay', label: 'compromise replay', trigger: 'lever',
      spawn: { node: 'gate', kind: 'intrusion', n: 4, spacing: 0.3 },
      rules: [
        {
          when: { socket: { 'so-watch': 'gd' } }, pass: true,
          title: '✔ FINDING RAISED — CryptoCurrency:EC2/BitcoinTool.B',
          lines: 'detection ........ 90 seconds (was: 3 weeks)\nsources .......... flow logs + DNS + CloudTrail\nagents installed . zero\nfinding .......... severity HIGH → response runbook',
          note: 'GuardDuty chews the telemetry continuously and agentlessly — the replayed miner lasted 90 seconds. Hear that klaxon? THIS TIME THE ALARM IS THE POINT.',
          alarm: 'GUARDDUTY FINDING — CRYPTO MINING DETECTED',
        },
        {
          when: { socket: { 'so-watch': 'inspector' } }, pass: false,
          title: '✘ Inspector found 12 CVEs… and no miner',
          lines: 'scan result ...... 12 patchable CVEs\nminer ............ running, unbothered\nreason ........... behaviour ≠ vulnerability',
          note: 'Inspector scans workloads for KNOWN VULNERABILITIES. The miner isn’t a CVE — it’s malicious behaviour written all over your logs. That’s GuardDuty’s job.',
        },
        {
          when: { socket: { 'so-watch': 'macie' } }, pass: false,
          title: '✘ Macie found zero PII. The miner mines on',
          lines: 'S3 scan .......... no sensitive data found\nminer ............ not in a bucket\nreason ........... wrong sense organ',
          note: 'Macie discovers and classifies SENSITIVE DATA in S3. The evidence here is behaviour in flow, DNS, and CloudTrail logs — GuardDuty reads those.',
        },
        {
          pass: false,
          title: '✘ Three more weeks of mining',
          lines: 'watchers ......... none\ndetection ........ the next invoice',
          note: 'The logs already hold the evidence — socket a watcher that actually reads them.',
        },
      ],
    },
    {
      id: 'coverage', label: 'coverage audit', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-watch': 'gd' } }, pass: true,
          title: '✔ Flow + DNS + CloudTrail — watched continuously',
          lines: 'VPC flow logs .... watched\nDNS logs ......... watched\nCloudTrail ....... watched\nnew accounts ..... auto-enrolled',
          note: 'Continuous, agentless, organization-wide. Findings feed alerting and response — detection is now a property of the platform, not a hope.',
        },
        {
          pass: false,
          title: '✘ Coverage gap',
          lines: 'behaviour watch .. missing',
          note: 'The audit wants continuous behavioural detection from the logs — GuardDuty in the monitoring bay.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ The logs have eyes',
    body: 'GuardDuty watches flow, DNS, and CloudTrail continuously — the replayed compromise was a HIGH finding in 90 seconds. Remember the trio: GuardDuty for behaviour, Inspector for CVEs, Macie for PII. Close the ticket at the field terminal.',
    journal: 'Replay + coverage passed — GuardDuty on the logs; alarm-as-designed.',
  },
  diagnosis: {
    unlockedBy: 'victim',
    title: 'Why did a miner run for three weeks unnoticed?',
    correct: {
      label: 'The logs recorded everything but NOTHING WAS WATCHING — add continuous, agentless threat detection over flow/DNS/CloudTrail (GuardDuty)',
      journal: 'Diagnosis confirmed: telemetry without a watcher. GuardDuty reads what the site already records.',
      confirmBody: 'Recording is not watching. The evidence sat in three log streams for 21 days. Socket a watcher that reads them continuously — and expect the drill to be LOUD when it works.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'The firewall rules were too loose', rebuttal: 'Entry was a LEAKED KEY over legitimate API calls — no port rule stops authenticated misuse. This is a detection gap, not a wall gap.' },
      { label: 'The instance was missing patches', rebuttal: 'Maybe — but the miner didn’t exploit a CVE, it logged in. Patching (Inspector’s domain) doesn’t read your flow logs.' },
      { label: 'Nobody reviewed the logs weekly', rebuttal: 'Humans on a rota lose to a machine that never blinks. Weekly reviews would still have given the miner a week.' },
    ],
  },
  faultLamps: ['victim'],
};

export const SSM_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-4433', reporter: 'audit', sev: 'SEV-3', title: 'Kill the Bastion',
    bodyHtml:
      `<div>Shell access to the private fleet goes through a public bastion: port 22 open to the internet, one id_rsa shared by nine engineers, and no record of who did what. The audit finding is blunt: no inbound ports, individual accountability, full session logs.</div>` +
      `<pre>bastion .......... public IP · 22 open to 0.0.0.0/0\nSSH key .......... ONE id_rsa · nine humans\nsession records .. none\nfinding .......... no inbound · IAM-gated · logged</pre>`,
    hint: 'Probe the bastion and the fleet, diagnose, then socket the access module AND swing the inbound dial shut. Access test and audit-trail test must pass.',
  },
  objectiveFix: 'Socket the access module · swing the inbound dial to NONE',
  objectiveDone: 'INC-4433 closed — no inbound, every session on the record.',
  summary: 'Symptom: a public bastion with port 22 open to the world, a shared private key, and zero session records. Fix: AWS Systems Manager Session Manager — the agent dials OUT to the service (via SSM interface endpoints for fully-private subnets), IAM authorises each user per instance, sessions are fully logged, and the inbound rule set drops to NONE. A hardened bastion is still an exposed entry point with key sprawl; removing the door beats reinforcing it.',
  level: [
    { id: 'bastion', kind: 'serverRack', at: [-2.5, 1.5], yaw: Math.PI / 2 },
    { id: 'fleet', kind: 'serverRack', at: [4.5, 1.5], yaw: Math.PI / 2 },
    { id: 'dial', kind: 'aimPointer', at: [0.5, -2] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'bastion', machine: 'bastion', prompt: 'Inspect the bastion',
      kicker: 'bastion host', title: 'A public door with one key',
      pre: 'public IP ........ yes\ninbound .......... 22 from 0.0.0.0/0\nauth ............. shared id_rsa (9 holders)\nwho did what ..... unknowable',
      journal: 'Bastion: port 22 open to the internet, one shared key, no accountability. It exists only to reach the fleet.',
    },
    {
      id: 'fleet', machine: 'fleet', prompt: 'Inspect the private fleet',
      kicker: 'private fleet', title: 'Reachable only through the door',
      pre: 'subnet ........... private, no internet\nadmin path ....... via bastion hop\nSSM agent ........ installed (default AMI)\nsession logs ..... none',
      journal: 'Fleet: private instances, SSM agent already present — the only thing missing is the service wiring (and losing the bastion).',
    },
    {
      id: 'inbound', machine: 'dial', prompt: '', kicker: '', title: '',
      journal: 'Inbound posture dial inspected: 22 open to 0.0.0.0/0.',
    },
  ],
  pallet: {
    at: [-4.5, -5],
    modules: [
      { id: 'mod-ssm', kind: 'ssm', label: 'Session Manager wiring (SSM endpoints)', spot: [-5.1, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-bastion2', kind: 'bastion2', label: 'Hardened bastion (shiny AMI)', spot: [-3.9, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-key', kind: 'sshkey', label: 'id_rsa copy “for the new joiner”', spot: [-4.5, -5.5], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-access', label: 'admin access bay', at: [2, -2],
      blurb: 'How engineers reach a shell on the fleet. The right module needs NO inbound path at all: the agent dials out (SSM interface endpoints keep it private), IAM decides per user per instance, and the session itself is the audit record.',
      allow: { ssm: true, bastion2: true },
      refuse: {
        sshkey: { reason: 'BLOCKED: a tenth copy of the shared private key is the OPPOSITE of the audit finding.', alarm: 'SECURITY — SHARED PRIVATE KEY SPRAWL' },
      },
      fallback: { reason: 'The access bay takes an admin-access module.' },
    },
  ],
  dials: [
    {
      id: 'inbound', machine: 'dial', initial: 'open',
      grabPrompt: '◀ ▶ swing the inbound posture · E/Ⓧ lock',
      positions: [
        { id: 'open', label: 'inbound: 22 open to 0.0.0.0/0', angle: 2.0 },
        { id: 'closed', label: 'inbound: NONE', angle: 1.0 },
      ],
    },
  ],
  beats: [
    {
      id: 'access', label: 'admin access test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-access': 'ssm' }, dial: { inbound: 'closed' } }, pass: true,
          title: '✔ Shell opened — zero inbound ports',
          lines: 'path ............. agent dials OUT via SSM endpoints\ninbound rules .... NONE\nauth ............. IAM, per user per instance\nbastion .......... decommissioned',
          note: 'Session Manager inverts the connection: the agent reaches out, IAM authorises, and there is simply no door on the internet to guard anymore.',
        },
        {
          when: { socket: { 'so-access': 'ssm' }, dial: { inbound: 'open' } }, pass: false,
          title: '✘ It works — and 22 is still open to the world',
          lines: 'session .......... via SSM ✓\nport 22 .......... STILL 0.0.0.0/0\nattack surface ... unchanged',
          note: 'Session Manager made the inbound path unnecessary — so close it. Swing the inbound dial to NONE; the audit finding says zero open doors.',
        },
        {
          when: { socket: { 'so-access': 'bastion2' } }, pass: false,
          title: '✘ A shinier target is still a target',
          lines: 'bastion .......... hardened AMI, fail2ban, love\ninbound 22 ....... still required\nkeys ............. still shared and sprawling',
          note: 'Hardening polishes the door; the finding says REMOVE the door. Session Manager needs no inbound port and no SSH keys at all.',
        },
        {
          pass: false,
          title: '✘ No access path at all',
          lines: 'access bay ....... EMPTY\nengineers ........ locked out (that’s not the goal either)',
          note: 'Socket an access module — the point is safe access, not no access.',
        },
      ],
    },
    {
      id: 'audit', label: 'audit-trail test', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-access': 'ssm' } }, pass: true,
          title: '✔ Every session on the record',
          lines: 'who .............. IAM identity (individual)\nwhat ............. full session log\nwhere ............ per-instance IAM policy\nshared keys ...... zero',
          note: 'IAM answers WHO may connect WHERE; the session log answers WHAT they did. Accountability by design instead of one id_rsa and vibes.',
        },
        {
          when: { socket: { 'so-access': 'bastion2' } }, pass: false,
          title: '✘ auth.log and vibes',
          lines: 'who .............. “someone with the key”\nwhat ............. untracked after login\naccountability ... none',
          note: 'Nine humans, one key — the bastion cannot say who did what. IAM-gated sessions with full logs are the finding’s actual demand.',
        },
        {
          pass: false,
          title: '✘ Nothing to audit',
          lines: 'sessions ......... none possible',
          note: 'Socket the access module first.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ The door is gone, the record is complete',
    body: 'No inbound ports, no bastion, no shared keys: the agent dials out through SSM endpoints, IAM authorises each engineer per instance, and every session is logged end to end. Close the ticket at the field terminal.',
    journal: 'Access + audit tests passed — Session Manager, zero inbound.',
  },
  diagnosis: {
    unlockedBy: 'bastion',
    title: 'What replaces a public bastion with a shared key?',
    correct: {
      label: 'Session Manager: the agent dials OUT (SSM endpoints for private subnets), IAM authorises per user, sessions are fully logged — no inbound at all',
      journal: 'Diagnosis confirmed: remove the inbound door entirely — Session Manager with IAM + session logs.',
      confirmBody: 'The bastion exists only because shells used to need an inbound path. They don’t anymore: the agent connects outward, IAM decides who may join, and the transcript is the audit. Socket the wiring, then swing the inbound dial shut.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Harden the bastion (new AMI, fail2ban, alerts)', rebuttal: 'Still an exposed entry point with shared keys to manage — the finding says NO inbound ports, not nicer ones.' },
      { label: 'Restrict port 22 to the office IP range', rebuttal: 'Better than 0.0.0.0/0, but the port, the bastion, the shared key, and the missing session logs all remain.' },
      { label: 'Issue every engineer their own key pair', rebuttal: 'Individual keys fix one of four problems — the open port, the bastion box, and the absent session recording all survive.' },
    ],
  },
  faultLamps: ['bastion'],
};
