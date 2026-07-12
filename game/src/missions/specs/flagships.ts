import type { MissionSpec } from '../spec';

/** The original flagships, reborn tangible: Patch Night, Checkout Down, and
 *  The Leaked Key — rewritten as declarative specs so their fixes are carried,
 *  socketed, and drilled like everything else. (Orders Vanishing stays bespoke:
 *  its Havok parcels are the most physical fix in the game already.) */

export const PATCH_NIGHT_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-0001', reporter: 'platform', sev: 'SEV-2', title: 'Patch Night',
    bodyHtml:
      `<div>The maintenance window opened an hour ago and the private app servers still can’t fetch their security patches — every download times out. They sit in a private subnet (as they should), but tonight they need a way OUT to the repos without ever being reachable from the internet themselves.</div>` +
      `<pre>fleet ............ private subnet · no public IPs\npatch fetch ...... TIMEOUT, all mirrors\nmandate .......... outbound yes · inbound NEVER\nwindow closes .... 04:00</pre>`,
    hint: 'Probe the fleet and the route table, diagnose, then carry the right hardware to the right subnet — and card the route. Patch-fetch test AND exposure audit must pass.',
  },
  objectiveFix: 'Socket the NAT in the PUBLIC bay · card the default route to it',
  objectiveDone: 'INC-0001 closed — patches in, internet locked out.',
  summary: 'Symptom: a private subnet with no default route — outbound packets have nowhere to go. Fix: a NAT gateway that MUST live in the public subnet (it reaches the internet through the IGW route only that subnet has) plus a 0.0.0.0/0 → NAT entry on the private route table. Outbound-initiated traffic flows; no new inbound connection is ever accepted. Routing straight to the IGW does nothing for private instances — without public IPs the IGW won’t carry them; that translation is the NAT’s whole job. (Per-AZ NATs for HA egress; Gateway endpoints when the only destinations are S3/DynamoDB.)',
  level: [
    { id: 'fleet', kind: 'serverRack', at: [4.5, 1.5], yaw: -Math.PI / 2 },
    { id: 'igw', kind: 'internetGate', at: [-7, 2.5], yaw: Math.PI / 2 },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'fleet', machine: 'fleet', prompt: 'Inspect the app fleet',
      kicker: 'private fleet', title: 'Dialling out into a wall',
      pre: 'subnet ........... private · no public IPs ✓\noutbound ......... SYN … SYN … timeout\nroute table ...... local only — NO default route\nSG outbound ...... open (not the problem)',
      journal: 'Fleet: private (correctly) — but its route table has no default route at all. Packets for the internet have no next hop.',
    },
    {
      id: 'igw', machine: 'igw', prompt: 'Inspect the internet gateway',
      kicker: 'IGW', title: 'A door for public addresses',
      pre: 'attached ......... yes, works fine\ncarries .......... traffic for PUBLIC IPs\nprivate fleet .... has none — the IGW\n                   cannot translate for them',
      journal: 'IGW: alive and well — but it only carries traffic for instances WITH public IPs. The private fleet needs a translator in front of it.',
    },
  ],
  pallet: {
    at: [-2, -5],
    modules: [
      { id: 'mod-nat', kind: 'natgw', label: 'NAT gateway module', spot: [-2.9, -4.6], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-cardnat', kind: 'card-nat', label: 'route card: 0.0.0.0/0 → NAT', spot: [-1.7, -4.6], visual: { hex: '#31598c', glowHex: '#7ab3e0', h: 0.34 } },
      { id: 'mod-cardigw', kind: 'card-igw', label: 'route card: 0.0.0.0/0 → IGW', spot: [-2.9, -5.5], visual: { hex: '#6e5a3e', glowHex: '#c9a35c', h: 0.34 } },
      { id: 'mod-pubip', kind: 'public-ips', label: '“Just give them public IPs” kit', spot: [-1.7, -5.5], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.3 } },
    ],
  },
  sockets: [
    {
      id: 'so-pub', label: 'PUBLIC-subnet bay', at: [-3.5, 2.5],
      blurb: 'The public subnet: it has the route to the IGW. Hardware that must reach the internet on the fleet’s behalf lives here — the fleet itself does not.',
      allow: { natgw: true },
      refuse: {
        'card-nat': { reason: 'That’s a route card — it goes on the route table, not in a subnet bay.' },
        'card-igw': { reason: 'That’s a route card — it goes on the route table, not in a subnet bay.' },
        'public-ips': { reason: 'BLOCKED: assigning the private fleet public addresses makes every server internet-reachable — the mandate says inbound NEVER.', alarm: 'SECURITY — PRIVATE FLEET EXPOSURE ATTEMPT' },
      },
      fallback: { reason: 'The public bay takes egress hardware.' },
    },
    {
      id: 'so-priv', label: 'PRIVATE-subnet bay', at: [2, -1],
      blurb: 'The private subnet: no route from the internet, no public addresses. The fleet lives here — and nothing that needs to REACH the internet directly can.',
      allow: {},
      refuse: {
        natgw: { reason: 'A NAT gateway in the PRIVATE subnet is as stranded as the instances — it needs the public subnet’s IGW route to do its job. That placement is the classic trap.' },
        'card-nat': { reason: 'That’s a route card — it goes on the route table.' },
        'card-igw': { reason: 'That’s a route card — it goes on the route table.' },
        'public-ips': { reason: 'BLOCKED: assigning the private fleet public addresses makes every server internet-reachable.', alarm: 'SECURITY — PRIVATE FLEET EXPOSURE ATTEMPT' },
      },
      fallback: { reason: 'Nothing on the pallet belongs in the private bay — that’s rather the point.' },
    },
    {
      id: 'so-route', label: 'route-table slot (0.0.0.0/0)', at: [-2, -1],
      blurb: 'The private route table’s default-route slot: where packets go when no local route matches. Empty means they go nowhere.',
      allow: { 'card-nat': true, 'card-igw': true },
      refuse: {
        natgw: { reason: 'That’s a whole NAT gateway — the slot takes a route CARD pointing at it.' },
        'public-ips': { reason: 'BLOCKED: that kit exposes the fleet, and it isn’t a route either.', alarm: 'SECURITY — PRIVATE FLEET EXPOSURE ATTEMPT' },
      },
      fallback: { reason: 'The slot takes a route card.' },
    },
  ],
  sim: [
    { id: 'src', machine: 'fleet', route: [{ when: { socket: { 'so-route': 'card-nat', 'so-pub': 'natgw' } }, to: 'natN' }, { to: 'void' }] },
    { id: 'natN', at: [-3.5, 2.5], route: [{ to: 'igwN' }] },
    { id: 'igwN', machine: 'igw', route: [{ to: 'deliver' }] },
    { id: 'void', at: [1, 3.5], route: [{ to: 'drop' }] },
  ],
  beats: [
    {
      id: 'fetch', label: 'patch-fetch test', trigger: 'terminal', infoInInvestigate: true,
      spawn: { node: 'src', kind: 'fetch', n: 5, spacing: 0.3 },
      rules: [
        {
          when: { socket: { 'so-pub': 'natgw', 'so-route': 'card-nat' } }, pass: true,
          title: '✔ Patches flowing — fleet still invisible',
          lines: 'path ............. fleet → NAT (public) → IGW → repos\ntranslation ...... NAT’s address does the talking\ninbound .......... nothing can dial in\nwindow ........... plenty left',
          note: 'The NAT initiates outbound on the fleet’s behalf from the public subnet and relays the answers back. Outbound-initiated only — a new inbound connection has nothing to land on.',
        },
        {
          when: { socket: { 'so-route': 'card-igw' } }, pass: false,
          title: '✘ Route set — packets dropped at the door',
          lines: 'route ............ 0.0.0.0/0 → IGW ✓ (it’s a route)\nfleet IPs ........ private — the IGW won’t carry them\nresult ........... silent drops, same timeouts',
          note: 'The IGW forwards traffic for PUBLIC addresses; it does no translation. Private instances pointing straight at it go nowhere — that translation gap is exactly what the NAT gateway exists to fill.',
        },
        {
          when: { socket: { 'so-route': 'card-nat', 'so-pub': null } }, pass: false,
          title: '✘ The route points at a NAT that isn’t there',
          lines: 'route ............ 0.0.0.0/0 → nat-… (missing)\nblackhole ........ every packet',
          note: 'The card names a NAT gateway — socket the actual hardware in the PUBLIC bay.',
        },
        {
          pass: false,
          title: '✘ Still no way out',
          lines: 'default route .... missing or wrong\negress hw ........ check the public bay',
          note: 'NAT in the public bay, 0.0.0.0/0 → NAT on the table. Both.',
        },
      ],
    },
    {
      id: 'exposure', label: 'exposure audit', trigger: 'terminal',
      rules: [
        {
          when: { socket: { 'so-pub': 'natgw', 'so-route': 'card-nat' } }, pass: true,
          title: '✔ Outbound-only, by construction',
          lines: 'fleet public IPs . none\ninbound routes ... none exist to the subnet\nNAT .............. initiates, relays, never accepts\nscan result ...... the fleet does not exist',
          note: 'The audit confirms the shape: the fleet can reach out through the NAT, and there is simply no path by which the internet can reach in. (Only fetching from S3/DynamoDB? Gateway endpoints do it free, no NAT.)',
        },
        {
          pass: false,
          title: '✘ Exposure audit needs the NAT path first',
          lines: 'audit ............ runs against the working design',
          note: 'Pass the patch-fetch test with the NAT path, then audit it.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Private servers, public updates',
    body: 'The NAT gateway sits in the public subnet doing the talking; the private table’s default route hands it every outbound packet; and inbound has no door at all. Close the ticket at the field terminal.',
    journal: 'Patch-fetch + exposure audit passed — NAT in public subnet, 0.0.0.0/0 → NAT.',
  },
  diagnosis: {
    unlockedBy: 'fleet',
    title: 'Outbound to the repos, inbound never — what’s missing?',
    correct: {
      label: 'A default route (0.0.0.0/0) on the private table pointing at a NAT GATEWAY — which itself must live in the PUBLIC subnet',
      journal: 'Diagnosis confirmed: missing default route → NAT gateway (public subnet, outbound-only).',
      confirmBody: 'Two pieces, both physical: the NAT hardware in the subnet that can actually reach the IGW, and the route card that sends the fleet’s traffic to it. The pallet has a tempting shortcut or two.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Open the security group’s outbound rules', rebuttal: 'SG outbound is already open (it is by default). The packets aren’t being FILTERED — they have no ROUTE.' },
      { label: 'Give the instances public IPs and route via the IGW', rebuttal: 'That makes every app server internet-reachable — the mandate says inbound NEVER. The kit’s on the pallet; the bays have opinions.' },
      { label: 'The patch mirrors are down', rebuttal: 'The same fetch from the public subnet works instantly. The mirrors are fine; the private subnet has no way out.' },
    ],
  },
  faultLamps: ['fleet'],
};

export const CHECKOUT_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-0002', reporter: 'storefront', sev: 'SEV-1', title: 'Checkout Down',
    bodyHtml:
      `<div>Checkout died at 02:10 when the single web server’s AZ had a bad night — one instance, one zone, total outage. It’s back now, but the postmortem demands two things at once: survive an instance OR zone failure, and carry the Black-Friday load that’s three weeks out.</div>` +
      `<pre>outage ........... 02:10 · single instance · single AZ\nmandate 1 ........ survive instance/AZ loss\nmandate 2 ........ Black-Friday load\nproposal heard ... “just buy a bigger server”</pre>`,
    hint: 'Probe the server and the wreck report, diagnose, then build the fleet: balancer bay, AZ-B bay. Load test AND the AZ-failure drill (lever) must pass.',
  },
  objectiveFix: 'Socket the ALB in the balancer bay · a second server in the AZ-B bay',
  objectiveDone: 'INC-0002 closed — no single box, no single zone.',
  summary: 'Symptom: one web server in one AZ — a single point of failure that also can’t carry peak load. Fix: an internet-facing ALB in front (the only public-facing piece; instances go private) with servers in AT LEAST TWO AZs behind it — losing an instance or a whole zone degrades instead of destroys, and load spreads. The seductive trap: a bigger single server genuinely passes the load test and then dies with its zone — capacity is not availability. (Full pattern: an Auto Scaling group across AZs + Multi-AZ database.)',
  level: [
    { id: 'azA', kind: 'azPlate', at: [-4.5, 1.5], args: [7, 7, 'A'] },
    { id: 'azB', kind: 'azPlate', at: [4.5, 1.5], args: [7, 7, 'B'] },
    { id: 'web1', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2 },
    { id: 'gate', kind: 'crowdGate', at: [-8, -3], yaw: Math.PI / 2 },
    { id: 'lever', kind: 'chaosLever', at: [0, -4.5] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'web1', machine: 'web1', prompt: 'Inspect the web server',
      kicker: 'web-1 · AZ-A', title: 'The whole shop, on one box',
      pre: 'instances ........ 1\nzones ............ 1 (AZ-A)\npeak CPU ......... 91% on a NORMAL day\nif it dies ....... checkout dies (again)',
      journal: 'web-1: alone in one AZ, near its ceiling on quiet days — a single point of failure with a capacity problem.',
    },
    {
      id: 'gate', machine: 'gate', prompt: 'Inspect the wreck report',
      kicker: 'postmortem', title: 'One zone’s bad night',
      pre: '02:10 ............ AZ-A network event\nblast radius ..... everything (everything was in it)\nlesson ........... survival needs a SECOND zone\nBlack Friday ..... ~6× normal load, 3 weeks out',
      journal: 'Postmortem: the outage was one AZ having a bad night while 100% of the service lived in it. Survival means capacity in another zone.',
    },
  ],
  pallet: {
    at: [-2, -5.2],
    modules: [
      { id: 'mod-alb', kind: 'alb', label: 'Application Load Balancer', spot: [-3.2, -4.8], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-web2', kind: 'server', label: 'Second web server', spot: [-2.0, -4.8], visual: { hex: '#31598c', glowHex: '#7ab3e0' } },
      { id: 'mod-big', kind: 'bigserver', label: 'One BIG server (replaces web-1)', spot: [-0.8, -4.8], visual: { hex: '#8a7a22', glowHex: '#e8d657', w: 0.62, h: 0.6 } },
      { id: 'mod-cdn', kind: 'cdn', label: 'A CDN (cache all the things)', spot: [-2.6, -5.8], visual: { hex: '#3b2f4d', glowHex: '#b48ce0' } },
    ],
  },
  sockets: [
    {
      id: 'so-lb', label: 'balancer bay', at: [-1.5, -1.5],
      blurb: 'The one internet-facing piece: it health-checks the fleet, spreads the load, and routes around dead instances and dead zones. The servers behind it go private.',
      allow: { alb: true },
      refuse: {
        server: { reason: 'That’s a server — the bay wants the traffic DISTRIBUTOR that stands in front of servers.' },
        bigserver: { reason: 'That’s a (large) server — the bay wants the traffic distributor.' },
        cdn: { reason: 'A CDN caches READS at the edge. Checkout is WRITES — carts, payments, orders — and a cache can’t balance or health-check your origin fleet.' },
      },
      fallback: { reason: 'The balancer bay takes a load balancer.' },
    },
    {
      id: 'so-b', label: 'AZ-B server bay', at: [4.5, 1.5],
      blurb: 'Capacity in the OTHER zone: the difference between an AZ event being an outage and being a Tuesday.',
      allow: { server: true, bigserver: true },
      refuse: {
        alb: { reason: 'The balancer fronts the fleet — this bay is for the capacity behind it.' },
        cdn: { reason: 'A CDN lives at the edge, not in your AZ-B rack space — and checkout still writes.' },
      },
      fallback: { reason: 'The AZ-B bay takes a web server.' },
    },
    {
      id: 'so-up', label: 'web-1 upgrade bay', at: [-4.5, -1.5],
      blurb: 'The vertical option: swap web-1 for something enormous. The load test will like it. Think about what the drill will say.',
      allow: { bigserver: true },
      refuse: {
        alb: { reason: 'That’s the balancer — it has its own bay.' },
        server: { reason: 'A same-size second server here changes nothing — spread it to ANOTHER zone.' },
        cdn: { reason: 'Checkout is writes; the CDN caches reads.' },
      },
      fallback: { reason: 'The upgrade bay takes the big server.' },
    },
  ],
  levers: [
    { id: 'lever-az', machine: 'lever', prompt: 'PULL — fail AZ-A (drill)', beat: 'azfail' },
  ],
  sim: [
    { id: 'gate', machine: 'gate', route: [{ when: { socket: { 'so-lb': 'alb' } }, to: 'lbN' }, { to: 'w1' }] },
    { id: 'lbN', at: [-1.5, -1.5], route: [{ when: { azDead: 'azA', socket: { 'so-b': 'any' } }, to: 'w2' }, { when: { azDead: 'azA' } , to: 'w1' }, { to: 'w2fallback' }] },
    { id: 'w2fallback', at: [-1.5, -0.5], route: [{ when: { socket: { 'so-b': 'any' } }, to: 'w2' }, { to: 'w1' }] },
    { id: 'w1', machine: 'web1', route: [{ when: { azDead: 'azA' }, to: 'drop' }, { to: 'deliver' }] },
    { id: 'w2', at: [4.5, 1.5], route: [{ to: 'deliver' }] },
  ],
  beats: [
    {
      id: 'load', label: 'Black-Friday load test', trigger: 'terminal', infoInInvestigate: true,
      spawn: { node: 'gate', kind: 'shopper', n: 8, spacing: 0.22 },
      rules: [
        {
          when: { socket: { 'so-lb': 'alb', 'so-b': 'server' } }, pass: true,
          title: '✔ Load spread across two zones',
          lines: 'ALB .............. health-checked round robin\nweb-1 (AZ-A) ..... 47% CPU\nweb-2 (AZ-B) ..... 46% CPU\nheadroom ......... add instances, not ceilings',
          note: 'The balancer spreads Black Friday across the fleet — and growing further is “add another instance” (an Auto Scaling group makes that automatic).',
        },
        {
          when: { socket: { 'so-up': 'bigserver' } }, pass: true,
          title: '✔ Survived on sheer size',
          lines: 'one BIG server ... 71% CPU at peak\nload test ........ passed, honestly\nzones ............ still exactly one\ndrill ............ pending…',
          note: 'Vertical scale genuinely carries the load — that’s what makes it seductive. The AZ drill asks the other question.',
        },
        {
          pass: false,
          title: '✘ web-1 folded at 09:02',
          lines: 'one medium box ... vs Black Friday\nqueue depth ...... infinite-ish',
          note: 'One server can’t carry the peak. Build the fleet — or try the big one and see.',
        },
      ],
    },
    {
      id: 'azfail', label: 'AZ-failure drill', trigger: 'lever',
      mutate: ['azDead:azA'],
      spawn: { node: 'gate', kind: 'shopper', n: 6, spacing: 0.3 },
      rules: [
        {
          when: { socket: { 'so-lb': 'alb', 'so-b': 'server' } }, pass: true,
          title: '✔ AZ-A died; checkout took payments anyway',
          lines: 'AZ-A ............. FAILED (drill)\nALB health check . web-1 out of rotation in seconds\nweb-2 (AZ-B) ..... carried it — degraded, alive\nlost carts ....... zero',
          note: 'The balancer noticed AZ-A die before the customers did and routed everything to the surviving zone. Degraded beats dead — that’s the whole architecture. (The database gets the same treatment: Multi-AZ with a synchronous standby.)',
        },
        {
          when: { socket: { 'so-up': 'bigserver' } }, pass: false,
          title: '✘ The big server was in AZ-A',
          lines: 'AZ-A ............. FAILED (drill)\nthe big server ... failed with it\ncheckout ......... down · again · bigger',
          note: 'Capacity is not availability: one box of any size shares its zone’s fate. Survival needs a fleet across zones behind a balancer.',
          alarm: 'OUTAGE — CHECKOUT DOWN WITH ITS ZONE',
        },
        {
          pass: false,
          title: '✘ 02:10 all over again',
          lines: 'AZ-A ............. FAILED (drill)\neverything ....... was in it',
          note: 'Balancer in front, capacity in a second zone. The pallet has both.',
          alarm: 'OUTAGE — CHECKOUT DOWN WITH ITS ZONE',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ No single box, no single zone',
    body: 'An internet-facing ALB fronts servers in two AZs: instances go private behind it, load spreads, and a zone failure is a degradation, not an outage. Next stop on this road: an Auto Scaling group and a Multi-AZ database. Close the ticket at the field terminal.',
    journal: 'Load + AZ drills passed — ALB across two AZs.',
  },
  diagnosis: {
    unlockedBy: 'web1',
    title: 'Survive instance/AZ loss AND carry Black Friday — how?',
    correct: {
      label: 'An ALB in front with web servers in at least TWO AZs behind it — the balancer spreads load and routes around failures',
      journal: 'Diagnosis confirmed: ALB + multi-AZ fleet; capacity and availability from the same shape.',
      confirmBody: 'One box in one zone fails both mandates at once. A fleet behind a balancer answers both: load spreads across it, and losing a zone just shrinks it. The pallet includes the tempting alternative — the drills grade everything.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Buy one much bigger server', rebuttal: 'It’ll pass the load test — genuinely. Then the AZ drill will find it standing in exactly one zone. It’s on the pallet; see for yourself.' },
      { label: 'Put a CDN in front of everything', rebuttal: 'CDNs cache READS at the edge. Checkout is carts and payments — WRITES — and a cache neither balances nor health-checks your origin.' },
      { label: 'A faster reboot runbook for web-1', rebuttal: 'Shrinking the outage is not surviving it — and the AZ event took the zone, not just the box.' },
    ],
  },
  faultLamps: ['web1'],
};

export const IAM_SPEC: MissionSpec = {
  ticket: {
    incident: 'INC-0004', reporter: 'security', sev: 'SEV-1', title: 'The Leaked Key',
    bodyHtml:
      `<div>The CI server’s long-lived access key is sitting in a public gist — found by a scraper, confirmed used from three unknown IPs. The key is revoked as of five minutes ago. Now fix the PATTERN: the pipeline needs credentials that can’t leak like this again, scoped to exactly the job it does (deploy to the assets store — payroll is none of its business).</div>` +
      `<pre>leak ............. long-lived key · public gist\nused from ........ 3 unknown IPs (revoked now)\nCI needs ......... write to ASSETS · nothing else\npayroll .......... must stay untouchable</pre>`,
    hint: 'Probe the CI rack and the doors, diagnose, then socket the right credential. The pipeline access test AND the red-team drill (lever) must pass.',
  },
  objectiveFix: 'Socket the right credential in the CI bay',
  objectiveDone: 'INC-0004 closed — nothing long-lived left to leak.',
  summary: 'Symptom: a long-lived access key in a public gist — and rotating to a fresh key with the same policy just reloads the same gun. Fix: an IAM ROLE for the CI instance — temporary, automatically-rotated credentials via STS, so there is no long-lived secret to leak, scoped to LEAST PRIVILEGE (assets write, nothing else), so even a stolen credential can’t touch payroll. AdministratorAccess on a pipeline is a blast radius, root keys in a pipeline are a resignation letter, and an explicit Deny (SCP/boundary) always beats an Allow.',
  level: [
    { id: 'ci', kind: 'serverRack', at: [-4.5, 1.5], yaw: Math.PI / 2 },
    { id: 'assets', kind: 'badgeDoor', at: [4.5, 3], yaw: -Math.PI / 2, args: ['#5fd29a'] },
    { id: 'payroll', kind: 'badgeDoor', at: [4.5, -0.5], yaw: -Math.PI / 2, args: ['#e85f5f'] },
    { id: 'lever', kind: 'chaosLever', at: [0, -4.5] },
    { id: 'term', kind: 'statusConsole', at: [-7, -6.5], yaw: Math.PI },
  ],
  probes: [
    {
      id: 'ci', machine: 'ci', prompt: 'Inspect the CI server',
      kicker: 'CI pipeline', title: 'A password that never changes',
      pre: 'credential ....... access key, minted 2024\nrotation ......... never\nscope ............ broad “to be safe”\ncopies ........... env vars · logs · one gist',
      journal: 'CI: a long-lived, never-rotated key with broad permissions — every copy of it anywhere is the whole incident again.',
    },
    {
      id: 'assets', machine: 'assets', prompt: 'Inspect the assets door',
      kicker: 'assets store', title: 'The one door CI needs',
      pre: 'CI’s actual job .. write deploy artifacts HERE\nrequired actions . put/get on one bucket path\neverything else .. decoration on the policy',
      journal: 'Assets door: the entire legitimate scope of the pipeline — one store, write access. Least privilege has a shape, and this is it.',
    },
    {
      id: 'payroll', machine: 'payroll', prompt: 'Inspect the payroll door',
      kicker: 'payroll', title: 'None of CI’s business',
      pre: 'CI need .......... zero\nold key’s access . yes (!) — “broad, to be safe”\nattacker’s tried . twice, from a Tor exit',
      journal: 'Payroll door: the old key could open it and the attacker knew. Whatever CI gets next must be DENIED here by scope, not by hope.',
    },
  ],
  pallet: {
    at: [-2, -5.2],
    modules: [
      { id: 'mod-role', kind: 'role', label: 'IAM role (temp creds · least privilege)', spot: [-3.2, -4.8], visual: { hex: '#2c6e4f', glowHex: '#5fd29a' } },
      { id: 'mod-samekey', kind: 'samekey', label: 'Fresh access key (same policy)', spot: [-2.0, -4.8], visual: { hex: '#31598c', glowHex: '#7ab3e0', h: 0.34 } },
      { id: 'mod-admin', kind: 'adminkey', label: 'Key with AdministratorAccess', spot: [-0.8, -4.8], visual: { hex: '#8a7a22', glowHex: '#e8d657', h: 0.34 } },
      { id: 'mod-root', kind: 'rootkey', label: 'The ROOT account’s keys', spot: [-2.6, -5.8], visual: { hex: '#5a2330', glowHex: '#e85f5f', h: 0.34 } },
    ],
  },
  sockets: [
    {
      id: 'so-cred', label: 'CI credential bay', at: [0, -1.5],
      blurb: 'What the pipeline authenticates AS. The right answer has no long-lived secret to steal and opens exactly one door.',
      allow: { role: true, samekey: true },
      refuse: {
        adminkey: { reason: 'BLOCKED: AdministratorAccess on a build box means the next leak owns the ACCOUNT. Pipelines get least privilege, not everything “to be safe”.', alarm: 'SECURITY — ADMIN CREDENTIAL IN PIPELINE' },
        rootkey: { reason: 'BLOCKED: the root user signs in to fix billing wearing MFA — it does not deploy your JavaScript. Root keys should not EXIST, let alone sit in CI.', alarm: 'SECURITY — ROOT CREDENTIALS IN PIPELINE' },
      },
      fallback: { reason: 'The credential bay takes an identity for the pipeline.' },
    },
  ],
  levers: [
    { id: 'lever-red', machine: 'lever', prompt: 'PULL — leak today’s credentials (red-team drill)', beat: 'redteam' },
  ],
  sim: [
    { id: 'ciN', machine: 'ci', route: [{ when: { socket: { 'so-cred': 'any' } }, to: 'assetsN' }, { to: 'drop' }] },
    { id: 'assetsN', machine: 'assets', route: [{ to: 'deliver' }] },
  ],
  beats: [
    {
      id: 'access', label: 'pipeline access test', trigger: 'terminal',
      spawn: { node: 'ciN', kind: 'deploy', n: 4, spacing: 0.3 },
      rules: [
        {
          when: { socket: { 'so-cred': 'role' } }, pass: true,
          title: '✔ Deployed with credentials that expire at lunch',
          lines: 'identity ......... instance role via STS\ncreds ............ temporary · auto-rotated\nscope ............ assets write — payroll: DENIED\nsecrets in env ... none exist',
          note: 'The role hands the instance short-lived credentials automatically — nothing long-lived to leak, and the policy opens exactly the one door the job needs.',
        },
        {
          when: { socket: { 'so-cred': 'samekey' } }, pass: true,
          title: '✔ Deploys fine — the drill has questions',
          lines: 'identity ......... fresh access key\npolicy ........... same as the one that leaked\nlong-lived ....... yes, that’s the thing about keys',
          note: 'A new key works exactly as well as the old one did — in every sense. Pull the red-team lever before celebrating.',
        },
        {
          pass: false,
          title: '✘ The pipeline can’t authenticate',
          lines: 'credential bay ... empty\ndeploys .......... 403',
          note: 'Socket a credential — the point is safe access, not no access.',
        },
      ],
    },
    {
      id: 'redteam', label: 'red-team drill', trigger: 'lever',
      rules: [
        {
          when: { socket: { 'so-cred': 'role' } }, pass: true,
          title: '✔ The gist was worthless before lunch',
          lines: 'leaked ........... this hour’s temp credentials\nlifetime left .... 41 minutes, then dust\npayroll attempt .. DENIED (least privilege)\nlong-lived loot .. none exists to steal',
          note: 'Temporary credentials expire on their own and the role’s scope never opened payroll anyway. The incident class is closed, not just the incident.',
        },
        {
          when: { socket: { 'so-cred': 'samekey' } }, pass: false,
          title: '✘ Leaked again. Works again. Forever',
          lines: 'leaked ........... the NEW key (same gist, sequel)\nexpiry ........... never — it’s a long-lived key\nattacker ......... deploying “assets” of their own',
          note: 'Rotating to a fresh key with the same policy reloads the same gun: the problem is LONG-LIVED credentials, not this key or that one. Roles issue credentials that die on their own.',
          alarm: 'SECURITY — CREDENTIAL LEAK ACTIVE',
        },
        {
          pass: false,
          title: '✘ Nothing to leak — nothing works either',
          lines: 'credential bay ... empty',
          note: 'Socket the role, then leak away.',
        },
      ],
    },
  ],
  verifyDone: {
    title: '✔ Nothing long-lived left to steal',
    body: 'The CI instance assumes a role: temporary STS credentials that rotate themselves, scoped to the assets store and nothing else — the next leak expires before the attacker finishes reading the gist, and payroll was never on the menu. Close the ticket at the field terminal.',
    journal: 'Access + red-team drills passed — instance role, least privilege.',
  },
  diagnosis: {
    unlockedBy: 'ci',
    title: 'What ends the leaked-key incident CLASS, not just this leak?',
    correct: {
      label: 'An IAM ROLE on the CI instance — temporary, auto-rotated STS credentials, scoped to least privilege (assets only)',
      journal: 'Diagnosis confirmed: replace long-lived keys with a role; scope to least privilege.',
      confirmBody: 'Keys leak because they exist. Roles hand out short-lived credentials that expire on their own, and least privilege means even a live leak opens one door, not the building. The pallet has three other offers — two of them set off alarms for a reason.',
      actionLabel: 'To the pallet →',
    },
    wrongs: [
      { label: 'Mint a fresh key with the same policy', rebuttal: 'It’s on the pallet and it will pass the access test — then the red-team drill will leak it too, because long-lived is the disease.' },
      { label: 'Give CI AdministratorAccess so it never breaks', rebuttal: '“Never breaks” includes the attacker’s workflow. Admin on a pipeline turns the next gist into account takeover.' },
      { label: 'Delete the gist and move on', rebuttal: 'Three unknown IPs already used it — the internet has no undo. The credential must die AND the pattern with it.' },
    ],
  },
  faultLamps: ['ci'],
};
