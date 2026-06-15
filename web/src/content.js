// Course content (ported from the Unity SolutionsArchitectContent).
// arch.pos = [x,y,z] technical layout; container blocks also have arch.size = [w,h,d].
// story.pos = [x,z] on the floor; story.prop = procedural prop key (null = represented by scenery).

// C(id, name, cat, arch, story, plain, real, code?) — `code` is an optional real-AWS syntax snippet
// (ARN, CIDR, IAM JSON, SG rule…) shown under the Real inspector tab to bridge the metaphor to exam wording.
const C = (id, name, cat, arch, story, plain, real, code) => ({ id, name, cat, arch, story, plain, real, code });

const kitchen = {
  id: 'ha-web-app',
  title: 'Build a Highly Available Web App',
  examDomain: 'Design Resilient Architectures',
  summary: 'Run a kitchen that survives the dinner rush, a cook walking off, and a whole kitchen flooding.',
  scenery: 'restaurant',
  blocks: [
    // ---- containers (architecture only; story is represented by the restaurant shell) ----
    C('region', 'Region (eu-west-1)', 'networking', { pos: [0, 1.4, 0], size: [14, 3.2, 10], container: true }, { name: 'The restaurant', prop: null, pos: [0, 0], yaw: 0 }, 'A geographic area such as eu-west-1.', 'Region eu-west-1; contains multiple isolated Availability Zones.'),
    C('azA', 'Availability Zone A', 'networking', { pos: [-3.5, 1.2, 0], size: [6.4, 2.6, 9], container: true }, { name: 'Kitchen line A', prop: null, pos: [0, 0], yaw: 0 }, 'An isolated zone with its own power and network.', 'Availability Zone eu-west-1a.'),
    C('azB', 'Availability Zone B', 'networking', { pos: [3.5, 1.2, 0], size: [6.4, 2.6, 9], container: true }, { name: 'Kitchen line B', prop: null, pos: [0, 0], yaw: 0 }, 'A second isolated zone.', 'Availability Zone eu-west-1b.'),
    C('vpc', 'VPC', 'networking', { pos: [0, 1.1, 0.3], size: [12.6, 2.4, 8.2], container: true }, { name: 'The kitchen', prop: null, pos: [0, 0], yaw: 0 }, 'Your private network inside the region.', 'VPC 10.0.0.0/16 — carved into subnets.', 'CIDR 10.0.0.0/16\n→ 10.0.0.0 – 10.0.255.255  (65,536 IPs)'),
    C('pubA', 'Public subnet A', 'networking', { pos: [-3.5, 0.8, -2.4], size: [5.6, 1.6, 3.2], container: true }, { name: 'Front of house A', prop: null, pos: [0, 0], yaw: 0 }, 'A subnet routed to the internet gateway.', 'Public subnet 10.0.0.0/24.', 'subnet 10.0.0.0/24  (256 IPs)\nroute: 0.0.0.0/0 → igw-0a1b2c'),
    C('pubB', 'Public subnet B', 'networking', { pos: [3.5, 0.8, -2.4], size: [5.6, 1.6, 3.2], container: true }, { name: 'Front of house B', prop: null, pos: [0, 0], yaw: 0 }, 'Public subnet in AZ B.', 'Public subnet 10.0.1.0/24.'),
    C('privA', 'Private subnet A', 'networking', { pos: [-3.5, 0.8, 2.0], size: [5.6, 1.6, 3.6], container: true }, { name: 'The line A', prop: null, pos: [0, 0], yaw: 0 }, 'No inbound route from the internet.', 'Private subnet 10.0.2.0/24.'),
    C('privB', 'Private subnet B', 'networking', { pos: [3.5, 0.8, 2.0], size: [5.6, 1.6, 3.6], container: true }, { name: 'The line B', prop: null, pos: [0, 0], yaw: 0 }, 'Private subnet in AZ B.', 'Private subnet 10.0.3.0/24.'),
    C('asg', 'Auto Scaling group', 'compute', { pos: [0, 0.7, 2.0], size: [12.6, 1.5, 3.8], container: true }, { name: 'The brigade', prop: null, pos: [0, 0], yaw: 0 }, 'Scales instances to match demand.', 'Auto Scaling group across both private subnets.'),
    // ---- services ----
    C('user', 'Global user', 'generic', { pos: [0, 3.3, -8.6] }, { name: 'Customer', prop: 'customer', pos: [-9.0, 0.0], yaw: 90 }, 'A person opening your app.', 'Client HTTPS request to your domain.'),
    C('singleServer', 'The one server', 'compute', { pos: [0, 0.7, -1.2] }, { name: 'The one cook', prop: 'cook', pos: [-2.0, 0.0], yaw: -90 }, 'One instance doing everything — a single point of failure.', 'A single public EC2 instance, no redundancy.'),
    C('igw', 'Internet gateway', 'networking', { pos: [0, 1.9, -4.6] }, { name: 'Service door', prop: 'servicedoor', pos: [-4.0, 0.0], yaw: 90 }, 'The one route between your network and the internet.', 'Internet gateway attached to the VPC.'),
    C('alb', 'Application Load Balancer', 'networking', { pos: [0, 1.2, -1.6] }, { name: 'The pass', prop: 'pass', pos: [-2.0, 0.0], yaw: -90 }, 'Routes each request to a healthy target.', 'Internet-facing ALB across both public subnets; health-checks targets.'),
    C('ec2A', 'Web server A', 'compute', { pos: [-3.8, 0.7, 1.7] }, { name: 'Cook A', prop: 'cook', pos: [1.0, -2.2], yaw: -90 }, 'A web server, kept private.', 'EC2 in private subnet A.'),
    C('ec2A2', 'Web server A2', 'compute', { pos: [-2.4, 0.7, 2.7] }, { name: 'Extra cook', prop: 'cook', pos: [2.6, -2.2], yaw: -90 }, 'An instance launched by Auto Scaling.', 'EC2 added during a scale-out event.'),
    C('ec2B', 'Web server B', 'compute', { pos: [3.8, 0.7, 1.7] }, { name: 'Cook B', prop: 'cook', pos: [1.0, 2.2], yaw: -90 }, 'A web server in the second AZ.', 'EC2 in private subnet B.'),
    C('rdsPrimary', 'RDS primary', 'database', { pos: [-3.5, 0.7, 3.5] }, { name: 'Pantry', prop: 'pantry', pos: [4.6, -2.2], yaw: -90 }, 'The database — the source of truth.', 'RDS primary (Multi-AZ) with a synchronous standby.'),
    C('rdsStandby', 'RDS standby', 'database', { pos: [3.5, 0.7, 3.5] }, { name: 'Backup pantry', prop: 'pantry', pos: [4.6, 2.2], yaw: -90 }, 'A synchronous copy ready to take over.', 'RDS standby in eu-west-1b; promoted on failover.'),
    C('cloudfront', 'CloudFront', 'edge', { pos: [2.4, 3.0, -6.9] }, { name: 'Grab-and-go', prop: 'grabandgo', pos: [-6.6, 1.1], yaw: -90 }, 'Caches content near each user.', 'CloudFront distribution; origin = the ALB.'),
    C('route53', 'Route 53', 'edge', { pos: [-2.4, 3.0, -6.9] }, { name: 'Host stand', prop: 'host', pos: [-6.6, -1.1], yaw: -90 }, 'Turns your domain into the right address.', 'Route 53 hosted zone; alias -> CloudFront.'),
  ],
  connections: [
    { id: 'c_user_server', from: 'user', to: 'singleServer', flow: 'request' },
    { id: 'c_user_r53', from: 'user', to: 'route53', flow: 'request' },
    { id: 'c_r53_cf', from: 'route53', to: 'cloudfront', flow: 'request' },
    { id: 'c_cf_alb', from: 'cloudfront', to: 'alb', flow: 'request' },
    { id: 'c_alb_ec2A', from: 'alb', to: 'ec2A', flow: 'request' },
    { id: 'c_alb_ec2A2', from: 'alb', to: 'ec2A2', flow: 'request' },
    { id: 'c_alb_ec2B', from: 'alb', to: 'ec2B', flow: 'request' },
    { id: 'c_ec2A_rds', from: 'ec2A', to: 'rdsPrimary', flow: 'data' },
    { id: 'c_ec2B_rds', from: 'ec2B', to: 'rdsPrimary', flow: 'data' },
    { id: 'c_rds_sync', from: 'rdsPrimary', to: 'rdsStandby', flow: 'replication' },
  ],
  stages: [
    { title: 'One cook, one line', focus: 'singleServer', anim: 'overload', animConn: 'c_user_server',
      narration: 'A single EC2 instance serves every request. A spike or a hardware failure takes the whole app down — there is no redundancy.',
      storyNarration: "It's opening night with one cook doing everything. The dinner rush hits and tickets pile up faster than one pair of hands can clear. Service grinds to a halt.",
      concept: 'One of anything is a single point of failure.', blocks: ['user', 'singleServer'], conns: ['c_user_server'] },
    { title: 'Two kitchens', focus: 'region',
      narration: 'Start with a Region split into Availability Zones — isolated data centres. Building across two lets the app survive losing one.',
      storyNarration: 'Give yourself two kitchens in two parts of the building, each on its own power and water. If a pipe bursts in one, the other keeps cooking.',
      concept: 'Spread across AZs so losing one does not take you down.', blocks: ['region', 'azA', 'azB'], conns: [] },
    { title: 'Front and back of house', focus: 'vpc',
      narration: 'Create a VPC and carve it into subnets: public ones with a route to the internet gateway, private ones without.',
      storyNarration: 'Lay out the restaurant: a front of house the public can enter, and a back of house only staff reach. Deliveries come through one service door.',
      concept: 'Public vs private = whether there is a route in from the internet.', blocks: ['region', 'azA', 'azB', 'vpc', 'pubA', 'pubB', 'privA', 'privB', 'igw'], conns: [] },
    { title: 'Cooks on the line', focus: 'ec2A',
      narration: 'Place the EC2 web servers in private subnets — no inbound route from the internet; traffic must come through a public entry point.',
      storyNarration: 'Put your cooks on the line in the back, out of the dining room. Guests never walk into the kitchen.',
      concept: 'Keep app servers private; expose only the entry point.', blocks: ['region', 'azA', 'azB', 'vpc', 'pubA', 'pubB', 'privA', 'privB', 'igw', 'ec2A', 'ec2B'], conns: [] },
    { title: 'The pass', focus: 'alb', anim: 'pulse', animConn: 'c_alb_ec2A',
      narration: 'Add an Application Load Balancer in the public subnets. It forwards each request to a healthy target and health-checks them.',
      storyNarration: 'Add a pass with an expediter. Every order lands at the pass, and the expediter calls it to whichever cook is free.',
      concept: 'The load balancer spreads load and routes around failures.', blocks: ['region', 'azA', 'azB', 'vpc', 'pubA', 'pubB', 'privA', 'privB', 'igw', 'ec2A', 'ec2B', 'alb'], conns: ['c_alb_ec2A', 'c_alb_ec2B'] },
    { title: 'Call in more cooks', focus: 'asg', anim: 'spike',
      narration: 'Put the instances in an Auto Scaling group: it adds instances when demand rises and removes them when it falls.',
      storyNarration: 'On a rush, the brigade pulls in extra cooks; when it is quiet they clock off. Watch a new cook step onto the line.',
      concept: 'Capacity follows demand, automatically.', blocks: ['region', 'azA', 'azB', 'vpc', 'pubA', 'pubB', 'privA', 'privB', 'igw', 'ec2A', 'ec2B', 'alb', 'asg', 'ec2A2'], conns: ['c_alb_ec2A', 'c_alb_ec2B', 'c_alb_ec2A2'] },
    { title: 'The pantry', focus: 'rdsPrimary', anim: 'pulse', animConn: 'c_ec2A_rds',
      narration: 'Add a Multi-AZ RDS database: a synchronous standby in the second AZ, with automatic failover if the primary fails.',
      storyNarration: 'Cooks need one shared pantry. Keep the main pantry in one kitchen and a stocked backup in the other, restocked in lockstep.',
      concept: 'Multi-AZ database = a hot backup that fails over automatically.', blocks: ['region', 'azA', 'azB', 'vpc', 'pubA', 'pubB', 'privA', 'privB', 'igw', 'ec2A', 'ec2B', 'alb', 'asg', 'ec2A2', 'rdsPrimary', 'rdsStandby'], conns: ['c_alb_ec2A', 'c_alb_ec2B', 'c_alb_ec2A2', 'c_ec2A_rds', 'c_ec2B_rds', 'c_rds_sync'] },
    { title: 'Host stand & grab-and-go', focus: 'route53', anim: 'chain', chain: ['c_user_r53', 'c_r53_cf', 'c_cf_alb', 'c_alb_ec2A', 'c_ec2A_rds'],
      narration: 'Front the app with Route 53 (DNS) and CloudFront (edge cache). A request flows client -> Route 53 -> CloudFront -> ALB -> EC2 -> RDS.',
      storyNarration: 'The host stand points each guest the right way, and a grab-and-go counter serves popular dishes instantly. Follow one order all the way through.',
      concept: 'Point people with DNS; serve them locally with a CDN.', blocks: ['region', 'azA', 'azB', 'vpc', 'pubA', 'pubB', 'privA', 'privB', 'igw', 'ec2A', 'ec2B', 'alb', 'asg', 'ec2A2', 'rdsPrimary', 'rdsStandby', 'cloudfront', 'route53', 'user'], conns: ['c_user_r53', 'c_r53_cf', 'c_cf_alb', 'c_alb_ec2A', 'c_alb_ec2B', 'c_alb_ec2A2', 'c_ec2A_rds', 'c_ec2B_rds', 'c_rds_sync'] },
    { title: 'Lose a kitchen, keep serving', focus: 'azA', anim: 'failover',
      // Bespoke choreography: Kitchen A (cook + main pantry) shakes and fails; the standby pantry
      // activates and keeps syncing; the expediter reroutes every order to the surviving Kitchen B.
      script: [
        { type: 'shake', id: 'ec2A' }, { type: 'shake', id: 'rdsPrimary' },
        { type: 'pop', id: 'rdsStandby' }, { type: 'flow', conns: ['c_rds_sync'], interval: 2.4 },
        { type: 'flow', conns: ['c_user_r53', 'c_r53_cf', 'c_cf_alb'], interval: 2.2, hop: 0.4 },
        { type: 'carry', conn: 'c_alb_ec2B' },
        { type: 'flow', conns: ['c_ec2B_rds'], interval: 2.6 },
      ],
      narration: 'Availability Zone A goes down, taking its instance and the RDS primary. The ALB routes to AZ B and RDS fails over to the standby — the app stays available.',
      storyNarration: 'Kitchen A floods — its cook and the main pantry are gone. But the expediter sends every ticket to Kitchen B and the backup pantry takes over. Service never stops.',
      concept: 'High availability = survive losing a whole AZ, with nobody left waiting.', blocks: ['region', 'azA', 'azB', 'vpc', 'pubA', 'pubB', 'privA', 'privB', 'igw', 'ec2A', 'ec2B', 'alb', 'asg', 'ec2A2', 'rdsPrimary', 'rdsStandby', 'cloudfront', 'route53', 'user'], conns: ['c_user_r53', 'c_r53_cf', 'c_cf_alb', 'c_alb_ec2A', 'c_alb_ec2B', 'c_alb_ec2A2', 'c_ec2A_rds', 'c_ec2B_rds', 'c_rds_sync'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Your VPC is 10.0.0.0/16. Which is a valid, correctly-sized subnet inside it?', options: ['10.0.1.0/24', '192.168.1.0/24', '10.0.0.0/8', '11.0.0.0/24'], correct: [0], explain: 'A subnet must sit inside the VPC range and be smaller. 10.0.1.0/24 is inside 10.0.0.0/16.' },
    { kind: 'single', prompt: 'Why are the EC2 web servers in private subnets?', options: ['So nothing on the internet can reach them directly', 'They are faster', 'They are cheaper', 'They do not need a load balancer'], correct: [0], explain: 'Private subnets have no inbound route from the internet; traffic comes via the public load balancer.' },
    { kind: 'multi', prompt: 'The app must survive one AZ failing. Which TWO are required?', options: ['Instances in two AZs behind the load balancer', 'A Multi-AZ RDS database', 'One larger EC2 instance', 'All data on one instance disk'], correct: [0, 1], explain: 'Redundancy across AZs is needed for both compute and data.' },
    { kind: 'single', prompt: 'What does RDS Multi-AZ primarily give you?', options: ['Automatic failover to a standby', 'More read throughput', 'Lower storage cost', 'A global CDN'], correct: [0], explain: 'Multi-AZ provides availability via a synchronous standby and automatic failover.' },
    { kind: 'tapfix', prompt: 'Users get no response, yet every instance is healthy. The load balancer was placed in the PRIVATE subnets. Tap the component that must move to the public subnets.', tapTarget: 'alb', explain: 'The ALB must sit in public subnets so internet users can reach it.' },
  ],
};

const storage = {
  id: 'store-serve-content', title: 'Store & Serve Content', examDomain: 'Design High-Performing Architectures',
  summary: 'Keep every file safe in the larder, serve it fast from the counter, and stash cold stock cheaply.',
  scenery: 'open',
  blocks: [
    C('user', 'Global user', 'generic', { pos: [-8, 0.7, 0] }, { name: 'Customer', prop: 'customer', pos: [-8, 0], yaw: 90 }, 'A person requesting a file.', 'Client HTTPS request for an object.'),
    C('cf', 'CloudFront', 'edge', { pos: [-3, 0.7, 0] }, { name: 'Grab-and-go', prop: 'grabandgo', pos: [-3, 0], yaw: -90 }, 'Caches objects near each user.', 'CloudFront distribution; origin = the S3 bucket.'),
    C('s3', 'S3 bucket', 'storage', { pos: [1.5, 0.7, 0] }, { name: 'The larder', prop: 'larder', pos: [1.5, 0], yaw: -90 }, 'Virtually unlimited, durable object storage.', 'S3; ~11 nines of durability, copies across AZs.', 'arn:aws:s3:::my-app-assets/img/logo.png'),
    C('glacier', 'S3 Glacier', 'storage', { pos: [5, 0.7, 0] }, { name: 'Cold room', prop: 'coldroom', pos: [5, 0], yaw: -90 }, 'Cheap archival storage for cold data.', 'S3 Glacier; very low cost, retrieval in minutes–hours.'),
  ],
  connections: [
    { id: 'c_user_s3', from: 'user', to: 's3', flow: 'request' },
    { id: 'c_user_cf', from: 'user', to: 'cf', flow: 'request' },
    { id: 'c_cf_s3', from: 'cf', to: 's3', flow: 'data' },
    { id: 'c_s3_glacier', from: 's3', to: 'glacier', flow: 'data' },
  ],
  stages: [
    { title: 'Into the larder (S3)', focus: 's3', anim: 'pulse', animConn: 'c_user_s3', narration: 'Store files in S3 — durable object storage that keeps copies across AZs, with no servers to manage.', storyNarration: 'Move all your stock into a vast larder with endless shelves, with copies on several shelves so nothing is lost.', concept: 'S3 = durable, managed object storage.', blocks: ['user', 's3'], conns: ['c_user_s3'] },
    { title: 'Serve it fast (CloudFront)', focus: 'cf', anim: 'chain', chain: ['c_user_cf', 'c_cf_s3'], narration: 'Put CloudFront in front of S3 to cache objects near users — faster, and far less origin load.', storyNarration: 'Set up grab-and-go counters near the diners, stocked with the popular dishes.', concept: 'A CDN caches near users — lower latency and origin load.', blocks: ['user', 'cf', 's3'], conns: ['c_user_cf', 'c_cf_s3'] },
    { title: 'Cold storage (Glacier)', focus: 'glacier', anim: 'pulse', animConn: 'c_s3_glacier', narration: 'A lifecycle rule moves rarely-accessed data to Glacier — far cheaper, retrieved in minutes to hours.', storyNarration: 'Rarely-touched stock goes to the deep cold room — dirt cheap to keep, just slower to fetch.', concept: 'Lifecycle to a colder class cuts cost for cold data.', blocks: ['user', 'cf', 's3', 'glacier'], conns: ['c_user_cf', 'c_cf_s3', 'c_s3_glacier'] },
    { title: 'Fast, durable, cheap', focus: 's3', anim: 'chain', chain: ['c_user_cf', 'c_cf_s3'], narration: 'A file goes viral: CloudFront absorbs the surge, S3 serves any misses durably, cold data sits cheaply in Glacier.', storyNarration: 'A dish goes viral: the counters handle the crowd, the larder never runs dry, the cold room keeps bills down.', concept: 'S3 + CloudFront scale content globally — durable and cheap.', blocks: ['user', 'cf', 's3', 'glacier'], conns: ['c_user_cf', 'c_cf_s3', 'c_s3_glacier'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'What does Amazon S3 give you?', options: ['Durable, virtually unlimited object storage with no servers', 'A relational database', 'A virtual server you patch', 'A load balancer'], correct: [0], explain: 'S3 is managed object storage with redundant copies across AZs.' },
    { kind: 'single', prompt: 'Why put CloudFront in front of S3?', options: ['Cache content near users — lower latency and origin load', 'To make S3 durable', 'To store relational data', 'To replace IAM'], correct: [0], explain: 'CloudFront is a CDN serving cached copies near users.' },
    { kind: 'single', prompt: 'Rarely-accessed data you must keep cheaply?', options: ['Lifecycle it to S3 Glacier', 'Delete it', 'Keep it on an EC2 disk', 'Cache it forever'], correct: [0], explain: 'Lifecycle rules transition cold objects to cheaper classes.' },
    { kind: 'tapfix', prompt: 'Downloads are slow worldwide and the S3 origin is overloaded. Tap what to add in front of S3.', tapTarget: 'cf', explain: 'CloudFront caches at the edge, cutting latency and offloading the S3 origin.' },
  ],
};

const iam = {
  id: 'secure-access-iam', title: 'Secure Access with IAM', examDomain: 'Design Secure Architectures',
  summary: 'Hand out the right keys: individual identities, least privilege, temporary badges, and a second lock.',
  scenery: 'open',
  blocks: [
    C('staff', 'Person / app', 'generic', { pos: [-7, 0.7, 0] }, { name: 'Staff member', prop: 'customer', pos: [-7, 0], yaw: 90 }, 'Someone (or something) that needs access.', 'An IAM identity: a user, role, or federated principal.'),
    C('iam', 'IAM', 'security', { pos: [-2, 0.7, 0] }, { name: 'Security desk', prop: 'securitydesk', pos: [-2, 0], yaw: -90 }, 'Issues identities and decides who can do what.', 'IAM users, roles and policies.', '{\n  "Effect": "Allow",\n  "Action": "s3:GetObject",\n  "Resource": "arn:aws:s3:::assets/*"\n}'),
    C('stockroom', 'Assets bucket', 'storage', { pos: [2.5, 0.7, -1.6] }, { name: 'Stockroom', prop: 'larder', pos: [2.5, -1.6], yaw: -90 }, 'A resource this identity may use.', 'An S3 bucket the policy permits.', 'arn:aws:s3:::assets-bucket'),
    C('safe', 'Payroll bucket', 'storage', { pos: [2.5, 0.7, 1.6] }, { name: 'Payroll safe', prop: 'coldroom', pos: [2.5, 1.6], yaw: -90 }, 'A resource this identity must NOT use.', 'An S3 bucket the policy does not grant.'),
  ],
  connections: [
    { id: 'c_staff_iam', from: 'staff', to: 'iam', flow: 'request' },
    { id: 'c_staff_stock', from: 'staff', to: 'stockroom', flow: 'request' },
  ],
  stages: [
    { title: 'Lock away the master key', focus: 'iam', anim: 'pulse', animConn: 'c_staff_iam', narration: 'The root user can do anything; using it daily is dangerous. Lock it behind MFA and use individual IAM identities.', storyNarration: 'One master key opens every door. Lock it in the safe and give people their own keys.', concept: 'Never use the account root user for daily work.', blocks: ['staff', 'iam'], conns: ['c_staff_iam'] },
    { title: 'Everyone gets their own key', focus: 'staff', narration: 'Give each person and app its own identity — every action is traceable and independently revocable.', storyNarration: 'Issue each staff member their own keycard; you can cancel one without re-keying the building.', concept: 'Individual identities = traceable, revocable access.', blocks: ['staff', 'iam', 'stockroom'], conns: ['c_staff_iam', 'c_staff_stock'] },
    { title: 'Least privilege', focus: 'safe', anim: 'pulse', animConn: 'c_staff_stock', narration: 'Grant only what each identity needs: the assets role reads the assets bucket but not payroll.', storyNarration: 'The badge opens the stockroom — but NOT the payroll safe. Only the doors the job needs.', concept: 'Least privilege: grant only the permissions needed.', blocks: ['staff', 'iam', 'stockroom', 'safe'], conns: ['c_staff_iam', 'c_staff_stock'] },
    { title: 'Roles, not long-lived keys', focus: 'iam', anim: 'pulse', animConn: 'c_staff_iam', narration: 'Use IAM roles (temporary credentials) for people and services instead of long-lived access keys.', storyNarration: 'Issue a shift badge that expires; even the delivery van gets a temporary badge, never the master key.', concept: 'Prefer roles (temporary creds) over long-lived keys.', blocks: ['staff', 'iam', 'stockroom', 'safe'], conns: ['c_staff_iam', 'c_staff_stock'] },
    { title: 'Add a second lock (MFA)', focus: 'staff', narration: 'Require MFA for privileged users and sensitive actions — a leaked password is not enough on its own.', storyNarration: 'A second lock on the important doors: the keycard AND a code from the phone.', concept: 'MFA stops a stolen password from being enough.', blocks: ['staff', 'iam', 'stockroom', 'safe'], conns: ['c_staff_iam', 'c_staff_stock'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Use the AWS root user for daily work?', options: ['No — lock it with MFA and use IAM identities', "Yes, it's simplest", 'Only on weekdays', 'Only for reads'], correct: [0], explain: 'Root is unrestricted; secure it and use least-privilege identities.' },
    { kind: 'single', prompt: "What is 'least privilege'?", options: ['Grant only the permissions actually needed', 'Give everyone admin', 'Disable logging', 'Share one user'], correct: [0], explain: 'Start closed; grant only required actions and resources.' },
    { kind: 'single', prompt: 'EC2 needs to read an S3 bucket. Best practice?', options: ['Attach an IAM role (temporary credentials)', 'Hard-code an access key', 'Use the root user', 'Make the bucket public'], correct: [0], explain: 'Roles give rotating, short-lived credentials with no stored secrets.' },
    { kind: 'single', prompt: 'Why require MFA?', options: ["A stolen password alone can't get in", 'Faster logins', 'Replaces IAM policies', 'Encrypts data at rest'], correct: [0], explain: 'MFA adds a second factor beyond the password.' },
  ],
};

const vpc = {
  id: 'network-boundaries-vpc', title: 'Network Boundaries', examDomain: 'Design Secure Architectures',
  summary: 'Keep servers off the street: private rooms, a bouncer on the door, and one guarded entrance.',
  scenery: 'open',
  blocks: [
    C('admin', 'Admin', 'generic', { pos: [-8, 0.7, 0] }, { name: 'Admin', prop: 'customer', pos: [-8, 0], yaw: 90 }, 'An operator who manages the server.', 'An administrator connecting from the internet.'),
    C('igw', 'Internet gateway', 'networking', { pos: [-4.5, 0.7, 0] }, { name: 'Front door', prop: 'servicedoor', pos: [-4.5, 0], yaw: 90 }, 'The only route between the VPC and the internet.', 'Internet gateway; only public subnets route to it.'),
    C('bastion', 'Bastion host', 'compute', { pos: [-1.5, 0.7, 0] }, { name: 'Guard post', prop: 'guardpost', pos: [-1.5, 0], yaw: -90 }, 'The one hardened, audited way in.', 'Bastion host in a public subnet (or use SSM).'),
    C('sg', 'Security group', 'security', { pos: [2, 0.7, 0] }, { name: 'Bouncer', prop: 'bouncer', pos: [2, 0], yaw: -90 }, 'Allows only specific traffic to the server.', 'Stateful, instance-level firewall; deny by default.', 'Inbound:  tcp/443 from sg-alb\nOutbound: all (stateful — replies auto)'),
    C('web', 'Web server', 'compute', { pos: [5, 0.7, 0] }, { name: 'Back-of-house server', prop: 'cook', pos: [5, 0], yaw: -90 }, 'The server doing the work, kept private.', 'EC2 in a private subnet.'),
  ],
  connections: [
    { id: 'c_admin_web', from: 'admin', to: 'web', flow: 'request' },
    { id: 'c_admin_bastion', from: 'admin', to: 'bastion', flow: 'request' },
    { id: 'c_bastion_web', from: 'bastion', to: 'web', flow: 'network' },
    { id: 'c_sg_web', from: 'sg', to: 'web', flow: 'network' },
  ],
  stages: [
    { title: "Don't leave the door open", focus: 'web', anim: 'overload', animConn: 'c_admin_web', narration: 'A server with a public IP and SSH open to the world is found and attacked within minutes.', storyNarration: 'A propped-open street door means anyone wanders into the kitchen; bots rattle the handle all night.', concept: "Don't expose servers directly to the whole internet.", blocks: ['admin', 'web'], conns: ['c_admin_web'] },
    { title: 'Move it to a private room', focus: 'web', narration: 'Put servers in private subnets — no route from the internet; traffic comes through a public entry point.', storyNarration: 'Move the kitchen to the back of house; there is simply no door from the street to it.', concept: 'Private subnets have no inbound route from the internet.', blocks: ['admin', 'igw', 'web'], conns: [] },
    { title: 'A bouncer on the door', focus: 'sg', anim: 'pulse', animConn: 'c_sg_web', narration: 'A security group is a stateful firewall: allow only needed ports from known sources; deny the rest.', storyNarration: 'Post a bouncer with a guest list: only the front desk gets in, on the one door that matters.', concept: 'Security groups: stateful, instance-level allow-lists.', blocks: ['admin', 'igw', 'sg', 'web'], conns: ['c_sg_web'] },
    { title: 'One guarded entrance', focus: 'bastion', anim: 'chain', chain: ['c_admin_bastion', 'c_bastion_web'], narration: 'Reach private servers through a single hardened entry — a bastion host, or SSM Session Manager.', storyNarration: 'Staff check in at one guarded post; only from there can they step into the back of house.', concept: 'One hardened, audited entrance beats exposing every server.', blocks: ['admin', 'igw', 'bastion', 'sg', 'web'], conns: ['c_admin_bastion', 'c_bastion_web', 'c_sg_web'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'A web server should accept traffic only from the load balancer. Best tool?', options: ['A security group allowing 443 from the LB group', 'Give it a public IP', 'A NAT gateway', 'An S3 bucket policy'], correct: [0], explain: 'Security groups are stateful, instance-level firewalls.' },
    { kind: 'single', prompt: 'Security groups are…', options: ['Stateful, at the instance level', 'Stateless, at the subnet level', 'A DNS service', 'A storage class'], correct: [0], explain: 'SGs are stateful/instance; NACLs are stateless/subnet.' },
    { kind: 'single', prompt: 'How should admins reach private servers?', options: ['Via a bastion host or SSM', 'Open SSH to 0.0.0.0/0', 'A public IP on every server', 'Disable the security group'], correct: [0], explain: 'A single hardened entry minimises exposure.' },
    { kind: 'tapfix', prompt: 'This server is exposed to the whole internet on SSH. Tap what to route admin access through.', tapTarget: 'bastion', explain: 'A bastion (or SSM) is the single guarded door to private servers.' },
  ],
};

const sqs = {
  id: 'decouple-with-queue-sqs', title: 'Decouple with a Queue', examDomain: 'Design Resilient Architectures',
  summary: 'Stop the waiter waiting on the cook: a ticket rail buffers orders so neither side ever stalls.',
  scenery: 'open',
  blocks: [
    C('waiter', 'Producer', 'compute', { pos: [-6, 0.7, 0] }, { name: 'Waiter', prop: 'customer', pos: [-6, 0], yaw: 90 }, 'Creates work (sends messages).', 'A producer app sending messages.'),
    C('queue', 'SQS queue', 'generic', { pos: [-1, 0.7, 0] }, { name: 'Ticket rail', prop: 'ticketrail', pos: [-1, 0], yaw: 0 }, 'Holds messages until a consumer is ready.', 'An SQS queue; messages wait, processed at-least-once.', 'VisibilityTimeout 30s · Retention 4d\nReceive → handle → DeleteMessage\nFailures → DLQ after 5 receives'),
    C('cookA', 'Consumer', 'compute', { pos: [3, 0.7, -1.6] }, { name: 'Cook', prop: 'cook', pos: [3, -1.6], yaw: -90 }, 'Processes messages.', 'A consumer polling the queue.'),
    C('cookB', 'Consumer (scaled)', 'compute', { pos: [4.4, 0.7, 1.6] }, { name: 'Extra cook', prop: 'cook', pos: [4.4, 1.6], yaw: -90 }, 'An extra consumer to clear a backlog.', 'Added by scaling on queue depth.'),
    C('dlq', 'Dead-letter queue', 'generic', { pos: [3, 0.7, 3.2] }, { name: 'Lost-tickets bin', prop: 'ticketrail', pos: [3, 3.2], yaw: 0 }, 'Holds messages that keep failing.', 'Dead-letter queue after N failed receives.'),
  ],
  connections: [
    { id: 'c_waiter_cook', from: 'waiter', to: 'cookA', flow: 'request' },
    { id: 'c_waiter_queue', from: 'waiter', to: 'queue', flow: 'data' },
    { id: 'c_queue_cookA', from: 'queue', to: 'cookA', flow: 'data' },
    { id: 'c_queue_cookB', from: 'queue', to: 'cookB', flow: 'data' },
    { id: 'c_queue_dlq', from: 'queue', to: 'dlq', flow: 'data' },
  ],
  stages: [
    { title: 'Stuck at the pass', focus: 'cookA', anim: 'overload', animConn: 'c_waiter_cook', narration: 'When a producer calls a consumer directly and waits, a slow consumer stalls it — and work is lost if it is down.', storyNarration: 'The waiter carries each order to a cook and waits; if the cook is slammed, the waiter is stuck and orders pile up.', concept: 'Direct coupling: a slow or failed consumer stalls the producer.', blocks: ['waiter', 'cookA'], conns: ['c_waiter_cook'] },
    { title: 'Hang a ticket rail', focus: 'queue', anim: 'chain', chain: ['c_waiter_queue', 'c_queue_cookA'], narration: 'Put an SQS queue between them: the producer sends and returns; the consumer polls and processes when ready.', storyNarration: 'Hang a ticket rail: the waiter clips the order and goes; cooks pull the next ticket when free.', concept: 'A queue decouples producer from consumer.', blocks: ['waiter', 'queue', 'cookA'], conns: ['c_waiter_queue', 'c_queue_cookA'] },
    { title: 'Absorb the rush', focus: 'cookB', anim: 'spike', narration: 'During a surge the queue buffers the backlog; scale consumers on queue depth to work through it.', storyNarration: 'A rush fills the rail — none are lost. Call in extra cooks who pull tickets until it clears.', concept: 'A queue buffers spikes; scale consumers on depth.', blocks: ['waiter', 'queue', 'cookA', 'cookB'], conns: ['c_waiter_queue', 'c_queue_cookA', 'c_queue_cookB'] },
    { title: 'Set aside the bad tickets', focus: 'dlq', anim: 'pulse', animConn: 'c_queue_dlq', narration: 'A dead-letter queue moves a repeatedly-failing message aside after N attempts so it does not block the queue.', storyNarration: 'A ticket nobody can cook goes in the lost-tickets bin for the manager, and never jams the rail.', concept: 'A dead-letter queue isolates poison messages.', blocks: ['waiter', 'queue', 'cookA', 'cookB', 'dlq'], conns: ['c_waiter_queue', 'c_queue_cookA', 'c_queue_cookB', 'c_queue_dlq'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Why put an SQS queue between producer and consumer?', options: ["So a slow/failed consumer doesn't stall the producer", 'To make the consumer faster', 'To store files', 'To replace IAM'], correct: [0], explain: 'A queue decouples them; messages wait safely until consumed.' },
    { kind: 'single', prompt: 'Traffic spikes beyond consumer capacity. With a queue…', options: ['Messages buffer; scale consumers to drain it', 'Messages are dropped', 'The producer crashes', 'Nothing can be done'], correct: [0], explain: 'The queue absorbs the spike; scale consumers on depth.' },
    { kind: 'single', prompt: 'A message fails repeatedly. Best practice?', options: ['Send it to a dead-letter queue after N tries', 'Retry forever', 'Delete the queue', 'Ignore failures'], correct: [0], explain: 'A DLQ isolates poison messages so they do not block the queue.' },
    { kind: 'tapfix', prompt: 'The waiter is stuck waiting on a busy cook. Tap what to add between them.', tapTarget: 'queue', explain: 'An SQS queue buffers messages: the producer sends and returns.' },
  ],
};

const lambda = {
  id: 'go-serverless-lambda', title: 'Go Serverless', examDomain: 'Design Cost-Optimized Architectures',
  summary: 'Stop paying a cook to stand idle: pop-up cooks who clock in only when an order lands, then vanish.',
  scenery: 'open',
  blocks: [
    C('user', 'Global user', 'generic', { pos: [-7, 0.7, 0] }, { name: 'Customer', prop: 'customer', pos: [-7, 0], yaw: 90 }, 'A person making a request.', 'A client request / event.'),
    C('server', 'Always-on server', 'compute', { pos: [-1.5, 0.7, -1.7] }, { name: 'Always-on cook', prop: 'cook', pos: [-1.5, -1.7], yaw: -90 }, 'A server that runs (and bills) 24/7, even when idle.', 'An EC2 instance you pay for per hour, always on.'),
    C('lambda', 'Lambda', 'compute', { pos: [1.5, 0.7, 0] }, { name: 'On-demand cook', prop: 'cook', pos: [1.5, 0], yaw: -90 }, 'Appears only when there is work; you manage no servers.', 'AWS Lambda; runs your code per event, auto-scaled.', 'handler index.handler · runtime nodejs20.x\nMemorySize 512MB · Timeout 30s\nScales out one instance per concurrent event'),
    C('lambda2', 'Lambda #2', 'compute', { pos: [4, 0.7, 1.6] }, { name: 'Extra cook', prop: 'cook', pos: [4, 1.6], yaw: -90 }, 'Another concurrent execution during a rush.', 'A concurrent Lambda execution.'),
    C('lambda3', 'Lambda #3', 'compute', { pos: [4.3, 0.7, -1.6] }, { name: 'Another cook', prop: 'cook', pos: [4.3, -1.6], yaw: -90 }, 'Another concurrent execution during a rush.', 'A concurrent Lambda execution.'),
  ],
  connections: [
    { id: 'c_user_server', from: 'user', to: 'server', flow: 'request' },
    { id: 'c_user_lambda', from: 'user', to: 'lambda', flow: 'request' },
    { id: 'c_user_lambda2', from: 'user', to: 'lambda2', flow: 'request' },
    { id: 'c_user_lambda3', from: 'user', to: 'lambda3', flow: 'request' },
  ],
  stages: [
    { title: 'Paying a cook to stand idle', focus: 'server', anim: 'pulse', animConn: 'c_user_server', narration: 'A server runs around the clock and bills every hour — even overnight when no requests come in.', storyNarration: 'The cook stands at the range all night. You pay for every hour, even when the dining room is empty.', concept: 'An always-on server bills whether or not it is working.', blocks: ['user', 'server'], conns: ['c_user_server'] },
    { title: 'Cooks on demand (Lambda)', focus: 'lambda', anim: 'spike', narration: 'With Lambda, a function spins up only when an event arrives, runs your code, and goes away. No servers to manage.', storyNarration: 'A ticket lands and a cook appears instantly, cooks the dish, and clocks straight back out. Nobody idles.', concept: 'Lambda runs your code per event — no idle servers.', blocks: ['user', 'lambda'], conns: ['c_user_lambda'] },
    { title: 'Scale to the rush', focus: 'lambda', anim: 'spike', narration: 'A hundred requests arrive at once and Lambda just runs a hundred executions in parallel — no capacity planning.', storyNarration: 'The rush hits and a hundred cooks appear at once, one per ticket. When it passes, they all clock out.', concept: 'Lambda scales out automatically with the load.', blocks: ['user', 'lambda', 'lambda2', 'lambda3'], conns: ['c_user_lambda', 'c_user_lambda2', 'c_user_lambda3'] },
    { title: 'Pay per dish', focus: 'lambda', anim: 'pulse', animConn: 'c_user_lambda', narration: 'You pay per request and the milliseconds it runs — nothing while idle. Great for spiky, event-driven work.', storyNarration: 'You pay only for dishes actually cooked — nothing for an empty kitchen. Perfect when demand comes in bursts.', concept: 'Serverless = pay per execution, nothing when idle.', blocks: ['user', 'lambda', 'lambda2', 'lambda3'], conns: ['c_user_lambda', 'c_user_lambda2', 'c_user_lambda3'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'What does AWS Lambda let you avoid?', options: ['Managing and paying for idle servers', 'Writing any code', 'Using IAM', 'Storing data'], correct: [0], explain: 'Lambda runs code per event with no servers to provision or keep running.' },
    { kind: 'single', prompt: '100 events arrive at once. Lambda…', options: ['Runs many executions concurrently, automatically', 'Queues them on one server', 'Drops the extras', 'Needs manual scaling'], correct: [0], explain: 'Lambda scales out concurrently with demand.' },
    { kind: 'single', prompt: 'Lambda’s cost model is…', options: ['Per request + run duration; nothing when idle', 'A flat hourly fee', 'Per stored GB', 'Per user'], correct: [0], explain: 'You pay only for invocations and their duration.' },
    { kind: 'single', prompt: 'Best fit for Lambda?', options: ['Spiky, event-driven work', 'A steady 24/7 high-CPU service', 'A desktop GUI', 'A relational database engine'], correct: [0], explain: 'Event-driven, bursty workloads suit serverless; steady heavy load may be cheaper on servers.' },
  ],
};

const datastore = {
  id: 'pick-the-pantry', title: 'Pick the Right Database', examDomain: 'Design High-Performing Architectures',
  summary: 'A relational pantry with a ledger, or a giant wall of numbered cubbies — match the store to the job.',
  scenery: 'open',
  blocks: [
    C('app', 'Your app', 'compute', { pos: [-5, 0.7, 0] }, { name: 'The line cook', prop: 'cook', pos: [-5, 0], yaw: 90 }, 'The app that needs to read and write data.', 'Your application tier.'),
    C('rds', 'Amazon RDS', 'database', { pos: [1.5, 0.7, -1.7] }, { name: 'Relational pantry', prop: 'pantry', pos: [1.5, -1.7], yaw: -90 }, 'Labelled shelves + a ledger: relationships, joins, transactions.', 'Amazon RDS; relational (SQL), ACID, scales up + read replicas.'),
    C('dynamo', 'DynamoDB', 'nosql', { pos: [2.2, 0.7, 1.7] }, { name: 'Numbered cubbies', prop: 'cubbies', pos: [2.2, 1.7], yaw: -90 }, 'Grab any item by its number instantly; endless cubbies.', 'DynamoDB; key-value/document NoSQL, single-digit-ms, scales horizontally.', 'Keys: PK (partition) + SK (sort)\nBilling PAY_PER_REQUEST (on-demand)\nGetItem {PK: USER#42} → single-digit ms'),
  ],
  connections: [
    { id: 'c_app_rds', from: 'app', to: 'rds', flow: 'data' },
    { id: 'c_app_dynamo', from: 'app', to: 'dynamo', flow: 'data' },
  ],
  stages: [
    { title: 'The organised pantry (RDS)', focus: 'rds', anim: 'pulse', animConn: 'c_app_rds', narration: 'A relational database stores structured rows you can join and update in transactions — great when data is interrelated.', storyNarration: 'Stock sits on labelled shelves with a ledger: ask complex questions across it, and keep everything consistent.', concept: 'RDS = relational data with joins and transactions.', blocks: ['app', 'rds'], conns: ['c_app_rds'] },
    { title: 'A wall of cubbies (DynamoDB)', focus: 'dynamo', anim: 'pulse', animConn: 'c_app_dynamo', narration: 'DynamoDB stores items you fetch by key in single-digit milliseconds, and scales horizontally to any size.', storyNarration: 'Grab item #4839 from its cubby in an instant. Add endless cubbies — but you fetch by the number, not by cross-referencing.', concept: 'DynamoDB = key-value NoSQL, huge scale, constant speed.', blocks: ['app', 'rds', 'dynamo'], conns: ['c_app_dynamo'] },
    { title: 'The trade-off', focus: 'app', narration: 'RDS gives relationships and transactions but scales mostly vertically; DynamoDB gives limitless scale and speed but key-based access, no joins.', storyNarration: 'The pantry lets you reason across all the stock; the cubby wall is faster and endless but you must know the number.', concept: 'Relationships/transactions vs limitless scale/speed.', blocks: ['app', 'rds', 'dynamo'], conns: ['c_app_rds', 'c_app_dynamo'] },
    { title: 'Pick the right store', focus: 'app', narration: 'Interrelated data, joins, transactions → RDS. Massive scale with simple key lookups and predictable latency → DynamoDB.', storyNarration: 'Recipes that reference each other → the pantry. A million quick grab-by-number pickups → the cubby wall.', concept: 'Match the data store to the access pattern.', blocks: ['app', 'rds', 'dynamo'], conns: ['c_app_rds', 'c_app_dynamo'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Highly interrelated data with joins and transactions?', options: ['Amazon RDS (relational)', 'DynamoDB', 'S3', 'CloudFront'], correct: [0], explain: 'Relational databases handle relationships, joins and ACID transactions.' },
    { kind: 'single', prompt: 'Single-digit-ms key lookups at massive, growing scale?', options: ['DynamoDB', 'A single RDS instance', 'Amazon Glacier', 'An EBS volume'], correct: [0], explain: 'DynamoDB is a horizontally-scaling NoSQL store with consistent low latency.' },
    { kind: 'single', prompt: 'Which is TRUE of DynamoDB?', options: ['NoSQL, scales horizontally, accessed by key', 'Supports arbitrary SQL joins', 'Scales only vertically', 'Is an object store for files'], correct: [0], explain: 'DynamoDB is key-value/document NoSQL; no cross-table joins.' },
    { kind: 'tapfix', prompt: 'You need a known item by its key, instantly, at any scale. Tap the right store.', tapTarget: 'dynamo', explain: 'DynamoDB gives constant single-digit-ms key lookups at any scale.' },
  ],
};

const cache = {
  id: 'cache-hot-items', title: 'Cache the Hot Items', examDomain: 'Design High-Performing Architectures',
  summary: 'Keep the popular dishes prepped at the line so most orders never touch the back pantry.',
  scenery: 'open',
  blocks: [
    C('user', 'Global user', 'generic', { pos: [-7, 0.7, 0] }, { name: 'Customer', prop: 'customer', pos: [-7, 0], yaw: 90 }, 'A person requesting data.', 'A client read request.'),
    C('cache', 'ElastiCache', 'edge', { pos: [-1, 0.7, 0] }, { name: 'Prep station', prop: 'grabandgo', pos: [-1, 0], yaw: -90 }, 'Popular items kept ready in memory; served instantly.', 'ElastiCache (Redis/Memcached); in-memory cache.'),
    C('db', 'Database', 'database', { pos: [3.5, 0.7, 0] }, { name: 'The pantry', prop: 'pantry', pos: [3.5, 0], yaw: -90 }, 'The full store; slower, and strained by repeats.', 'The backing database (e.g. RDS).'),
  ],
  connections: [
    { id: 'c_user_db', from: 'user', to: 'db', flow: 'request' },
    { id: 'c_user_cache', from: 'user', to: 'cache', flow: 'request' },
    { id: 'c_cache_db', from: 'cache', to: 'db', flow: 'data' },
  ],
  stages: [
    { title: 'Every order hits the pantry', focus: 'db', anim: 'overload', animConn: 'c_user_db', narration: 'If every read goes to the database, popular queries repeat constantly and the database gets swamped — and it’s slow.', storyNarration: 'Every single order sends someone to the back pantry. The popular dishes get fetched over and over, and the pantry is mobbed.', concept: 'Repeated reads straight to the DB are slow and overload it.', blocks: ['user', 'db'], conns: ['c_user_db'] },
    { title: 'Keep hot items ready (cache)', focus: 'cache', anim: 'pulse', animConn: 'c_user_cache', narration: 'Put an in-memory cache in front: frequent reads are served from memory in microseconds.', storyNarration: 'Pre-prep the popular dishes at the line. Most orders are handed over instantly, without a trip to the back.', concept: 'A cache serves frequent reads from memory, fast.', blocks: ['user', 'cache', 'db'], conns: ['c_user_cache'] },
    { title: 'On a miss, fetch once', focus: 'cache', anim: 'chain', chain: ['c_user_cache', 'c_cache_db'], narration: 'On a cache miss, fetch from the database once, store it in the cache, then serve it fast next time.', storyNarration: 'If a dish isn’t prepped yet, fetch it from the pantry once, keep a tray ready, and serve it instantly after that.', concept: 'Cache miss → load from DB, then cache it.', blocks: ['user', 'cache', 'db'], conns: ['c_user_cache', 'c_cache_db'] },
    { title: 'Fast reads, relaxed pantry', focus: 'cache', anim: 'pulse', animConn: 'c_user_cache', narration: 'The cache absorbs the bulk of reads; the database only handles misses — lower latency and far less load.', storyNarration: 'The line handles the crowd; the pantry only gets the occasional special. Faster service, calm back-of-house.', concept: 'Caching cuts latency and offloads the database.', blocks: ['user', 'cache', 'db'], conns: ['c_user_cache', 'c_cache_db'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Why put ElastiCache in front of a database?', options: ['Serve frequent reads from memory; cut DB load + latency', 'To store files durably', 'To replace IAM', 'To add transactions'], correct: [0], explain: 'An in-memory cache answers hot reads fast and offloads the database.' },
    { kind: 'single', prompt: 'On a cache miss you should…', options: ['Read from the DB, then store it in the cache', 'Fail the request', 'Delete the cache', 'Never use the DB again'], correct: [0], explain: 'Lazy-loading: fetch on miss, then cache for next time.' },
    { kind: 'single', prompt: 'ElastiCache is…', options: ['An in-memory data store (Redis/Memcached)', 'An object store', 'A CDN', 'A relational database'], correct: [0], explain: 'ElastiCache runs managed Redis or Memcached in memory.' },
    { kind: 'tapfix', prompt: 'The same reads repeat constantly and the database is overloaded. Tap what to add in front of it.', tapTarget: 'cache', explain: 'A cache serves the repeated reads from memory and offloads the DB.' },
  ],
};

const cost = {
  id: 'optimise-cost', title: 'Optimize Cost', examDomain: 'Design Cost-Optimized Architectures',
  summary: 'Staff the kitchen wisely: per-shift hires, cooks booked ahead at a discount, and cheap casual labour.',
  scenery: 'open',
  blocks: [
    C('work', 'The workload', 'generic', { pos: [-6.5, 0.7, 0] }, { name: 'The orders', prop: 'ticketrail', pos: [-6.5, 0], yaw: 0 }, 'The compute demand to cover.', 'Your steady + variable compute load.'),
    C('ondemand', 'On-Demand', 'compute', { pos: [-1.5, 0.7, -1.7] }, { name: 'Per-shift cook', prop: 'cook', pos: [-1.5, -1.7], yaw: -90 }, 'Hired per shift at full rate; total flexibility, no commitment.', 'On-Demand instances; pay per second, no commitment.'),
    C('reserved', 'Reserved / Savings', 'compute', { pos: [1.5, 0.7, 0] }, { name: 'Booked cook', prop: 'cook', pos: [1.5, 0], yaw: -90 }, 'Booked for a year for a big discount; for steady baseline work.', 'Reserved Instances / Savings Plans; commit 1–3y for up to ~72% off.'),
    C('spot', 'Spot', 'compute', { pos: [4, 0.7, 1.7] }, { name: 'Casual cook', prop: 'cook', pos: [4, 1.7], yaw: -90 }, 'Cheap casual labour grabbed when idle — can be sent home any moment.', 'Spot Instances; up to ~90% off, can be reclaimed with ~2 min notice.'),
  ],
  connections: [
    { id: 'c_work_ondemand', from: 'work', to: 'ondemand', flow: 'request' },
    { id: 'c_work_reserved', from: 'work', to: 'reserved', flow: 'request' },
    { id: 'c_work_spot', from: 'work', to: 'spot', flow: 'request' },
  ],
  stages: [
    { title: 'Pay per shift (On-Demand)', focus: 'ondemand', anim: 'pulse', animConn: 'c_work_ondemand', narration: 'On-Demand has no commitment and total flexibility — but it’s the priciest way to cover load you run all the time.', storyNarration: 'Hire a cook per shift at the full rate. Brilliant flexibility, but expensive if they’re in every single night.', concept: 'On-Demand: max flexibility, highest steady-state price.', blocks: ['work', 'ondemand'], conns: ['c_work_ondemand'] },
    { title: 'Commit for a discount (Reserved)', focus: 'reserved', anim: 'pulse', animConn: 'c_work_reserved', narration: 'For the baseline you always need, commit with Reserved Instances or Savings Plans and pay far less per hour.', storyNarration: 'For the cooks you need every night anyway, book them for the year — same work, much smaller bill.', concept: 'Reserved/Savings: commit to baseline for a big discount.', blocks: ['work', 'ondemand', 'reserved'], conns: ['c_work_ondemand', 'c_work_reserved'] },
    { title: 'Cheap casual labour (Spot)', focus: 'spot', anim: 'overload', animConn: 'c_work_spot', narration: 'Spot is up to ~90% cheaper, but AWS can reclaim it with ~2 minutes’ notice — only for interruptible, retryable work.', storyNarration: 'Grab cheap casual cooks when they’re free — but they can be called away mid-shift, so only give them work that can be picked up by someone else.', concept: 'Spot: cheapest, but interruptible — use for fault-tolerant work.', blocks: ['work', 'ondemand', 'reserved', 'spot'], conns: ['c_work_ondemand', 'c_work_reserved', 'c_work_spot'] },
    { title: 'Mix for the best bill', focus: 'work', narration: 'Cover the baseline with Reserved/Savings, variable demand with On-Demand, and spiky fault-tolerant work with Spot.', storyNarration: 'Book your regulars, top up per-shift on busy nights, and lean on casual hands for the overflow you can afford to lose.', concept: 'Blend purchase options to fit the workload shape.', blocks: ['work', 'ondemand', 'reserved', 'spot'], conns: ['c_work_ondemand', 'c_work_reserved', 'c_work_spot'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Cheapest for a steady 24/7 baseline you can commit to?', options: ['Reserved Instances / Savings Plans', 'On-Demand', 'Spot', 'More EBS'], correct: [0], explain: 'Committing 1–3 years gives the biggest discount for steady load.' },
    { kind: 'single', prompt: 'Cheapest compute for interruptible, fault-tolerant work?', options: ['Spot Instances', 'On-Demand', 'Reserved', 'Dedicated Hosts'], correct: [0], explain: 'Spot is deeply discounted but can be reclaimed at short notice.' },
    { kind: 'single', prompt: 'No commitment and full flexibility (e.g. unpredictable dev/test)?', options: ['On-Demand', 'Reserved', 'A 3-year Savings Plan', 'Spot only'], correct: [0], explain: 'On-Demand has no commitment; you pay per use.' },
    { kind: 'single', prompt: 'Key caveat of Spot Instances?', options: ['Can be reclaimed with ~2 minutes’ notice', 'Cost more than On-Demand', 'Cannot run Linux', 'Require a 1-year commitment'], correct: [0], explain: 'Use Spot only for work that tolerates interruption.' },
  ],
};

const monitor = {
  id: 'monitor-cloudwatch', title: 'See What’s Happening', examDomain: 'Design Resilient Architectures',
  summary: 'A manager’s board watching every station, an alarm when things heat up, and a log of what happened.',
  scenery: 'open',
  blocks: [
    C('kitchen', 'Your workload', 'compute', { pos: [-5, 0.7, 0] }, { name: 'The stations', prop: 'cook', pos: [-5, 0], yaw: 90 }, 'The running system being watched.', 'Your EC2 / app emitting metrics.'),
    C('cw', 'CloudWatch', 'edge', { pos: [0.5, 0.7, -1.6] }, { name: 'The board', prop: 'dashboard', pos: [0.5, -1.6], yaw: -90 }, 'Live gauges for every station: load, latency, errors.', 'CloudWatch metrics + dashboards + Logs.'),
    C('alarm', 'CloudWatch Alarm', 'security', { pos: [3.5, 0.7, 1], }, { name: 'The alarm', prop: 'tannoy', pos: [3.5, 1], yaw: -90 }, 'Goes off when a gauge crosses a line.', 'A CloudWatch Alarm on a metric threshold.', 'ALARM when CPUUtilization > 70%\nfor 3 of 3 datapoints (5 min)\n→ notify SNS / trigger scaling policy'),
  ],
  connections: [
    { id: 'c_kitchen_cw', from: 'kitchen', to: 'cw', flow: 'data' },
    { id: 'c_cw_alarm', from: 'cw', to: 'alarm', flow: 'request' },
  ],
  stages: [
    { title: 'Watch every station (metrics)', focus: 'cw', anim: 'pulse', animConn: 'c_kitchen_cw', narration: 'CloudWatch collects metrics from your resources — CPU, latency, errors, queue depth — onto dashboards.', storyNarration: 'A board on the wall shows a live gauge for every station: how hot, how busy, how backed up.', concept: 'CloudWatch gathers metrics you can see on dashboards.', blocks: ['kitchen', 'cw'], conns: ['c_kitchen_cw'] },
    { title: 'Set an alarm', focus: 'alarm', anim: 'pulse', animConn: 'c_cw_alarm', narration: 'A CloudWatch Alarm watches a metric and fires when it crosses a threshold (e.g. CPU > 80% for 5 min).', storyNarration: 'Set a line on a gauge: when the fryer runs too hot or tickets pile too high, the alarm goes off.', concept: 'Alarms fire when a metric crosses a threshold.', blocks: ['kitchen', 'cw', 'alarm'], conns: ['c_kitchen_cw', 'c_cw_alarm'] },
    { title: 'Make it act', focus: 'alarm', anim: 'pulse', animConn: 'c_cw_alarm', narration: 'An alarm can notify you (SNS) or trigger an action — like Auto Scaling to add capacity automatically.', storyNarration: 'The alarm doesn’t just ring — it pages the manager and calls in more cooks before things break.', concept: 'Alarms drive notifications and automated responses.', blocks: ['kitchen', 'cw', 'alarm'], conns: ['c_kitchen_cw', 'c_cw_alarm'] },
    { title: 'Logs tell the story', focus: 'cw', anim: 'pulse', animConn: 'c_kitchen_cw', narration: 'CloudWatch Logs capture what each component did, so you can investigate after the fact.', storyNarration: 'Every station keeps a written log of the night, so the manager can see exactly what went wrong, and when.', concept: 'Logs record events for troubleshooting.', blocks: ['kitchen', 'cw', 'alarm'], conns: ['c_kitchen_cw', 'c_cw_alarm'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'What does Amazon CloudWatch primarily provide?', options: ['Metrics, dashboards, alarms and logs', 'A relational database', 'Object storage', 'A load balancer'], correct: [0], explain: 'CloudWatch is AWS’s monitoring + observability service.' },
    { kind: 'single', prompt: 'You want capacity to grow automatically when CPU stays high. Use…', options: ['A CloudWatch Alarm triggering Auto Scaling', 'A bigger S3 bucket', 'A DynamoDB table', 'A NAT gateway'], correct: [0], explain: 'Alarms on metrics can trigger Auto Scaling actions.' },
    { kind: 'single', prompt: 'Where do you look to investigate what an app did at 2am?', options: ['CloudWatch Logs', 'IAM policies', 'Route 53', 'A security group'], correct: [0], explain: 'CloudWatch Logs retain event/log data for analysis.' },
    { kind: 'tapfix', prompt: 'You have no visibility into load and errors across the system. Tap what to add.', tapTarget: 'cw', explain: 'CloudWatch gives metrics, dashboards and logs across your resources.' },
  ],
};

const blockfile = {
  id: 'block-vs-file-storage', title: 'Disks vs Shared Files', examDomain: 'Design High-Performing Architectures',
  summary: 'A cooler bolted to one station, or a shared walk-in every cook uses at once — EBS vs EFS.',
  scenery: 'open',
  blocks: [
    C('cookA', 'Instance A', 'compute', { pos: [-5, 0.7, -1.6] }, { name: 'Cook A', prop: 'cook', pos: [-5, -1.6], yaw: -90 }, 'One server.', 'An EC2 instance.'),
    C('cookB', 'Instance B', 'compute', { pos: [-5, 0.7, 1.6] }, { name: 'Cook B', prop: 'cook', pos: [-5, 1.6], yaw: -90 }, 'Another server.', 'Another EC2 instance.'),
    C('ebs', 'EBS volume', 'storage', { pos: [-1, 0.7, -1.6] }, { name: 'Bolted-on cooler', prop: 'coldroom', pos: [-1, -1.6], yaw: -90 }, 'A fast disk attached to ONE station, in one AZ.', 'Amazon EBS; block volume, one instance, one AZ.'),
    C('efs', 'EFS', 'storage', { pos: [3, 0.7, 0] }, { name: 'Shared walk-in', prop: 'larder', pos: [3, 0], yaw: -90 }, 'A shared store every station can use at once.', 'Amazon EFS; shared NFS file system, multi-instance, multi-AZ.'),
  ],
  connections: [
    { id: 'c_cookA_ebs', from: 'cookA', to: 'ebs', flow: 'data' },
    { id: 'c_cookA_efs', from: 'cookA', to: 'efs', flow: 'data' },
    { id: 'c_cookB_efs', from: 'cookB', to: 'efs', flow: 'data' },
  ],
  stages: [
    { title: 'A cooler for one station (EBS)', focus: 'ebs', anim: 'pulse', animConn: 'c_cookA_ebs', narration: 'EBS is a block volume attached to a single instance in a single AZ — fast, like a local disk.', storyNarration: 'Bolt a cooler to one station. It’s right there and quick — but it belongs to that station alone.', concept: 'EBS = block storage for ONE instance, in ONE AZ.', blocks: ['cookA', 'ebs'], conns: ['c_cookA_ebs'] },
    { title: 'A shared walk-in (EFS)', focus: 'efs', anim: 'pulse', animConn: 'c_cookA_efs', narration: 'EFS is a shared file system many instances mount at the same time, across AZs.', storyNarration: 'Open a shared walk-in fridge: any cook, at any station, reaches the same shelves at once.', concept: 'EFS = shared file storage many instances use together.', blocks: ['cookA', 'cookB', 'efs'], conns: ['c_cookA_efs', 'c_cookB_efs'] },
    { title: 'Many cooks, one walk-in', focus: 'efs', anim: 'pulse', animConn: 'c_cookB_efs', narration: 'Because EFS is shared and elastic, several servers can read and write the same files concurrently.', storyNarration: 'Add more cooks and they all share the same walk-in — no copying stock between coolers.', concept: 'EFS scales and is shared across many instances.', blocks: ['cookA', 'cookB', 'efs'], conns: ['c_cookA_efs', 'c_cookB_efs'] },
    { title: 'Pick by how it’s used', focus: 'cookA', narration: 'One instance needing a fast local disk → EBS. Many instances sharing the same files → EFS.', storyNarration: 'A private cooler for one station’s speed; a shared walk-in when everyone needs the same stock.', concept: 'EBS for single-instance disks; EFS for shared files.', blocks: ['cookA', 'cookB', 'ebs', 'efs'], conns: ['c_cookA_ebs', 'c_cookA_efs', 'c_cookB_efs'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'A single EC2 instance needs a fast disk for its database files. Use…', options: ['An EBS volume', 'EFS', 'An SNS topic', 'CloudFront'], correct: [0], explain: 'EBS is a block device attached to one instance.' },
    { kind: 'single', prompt: 'Twenty instances must read and write the SAME files concurrently. Use…', options: ['EFS (shared file system)', 'One EBS volume', 'A DynamoDB table', 'Glacier'], correct: [0], explain: 'EFS is a shared, multi-instance NFS file system.' },
    { kind: 'single', prompt: 'Which is TRUE of an EBS volume?', options: ['Attaches to one instance, in one AZ', 'Mounted by many instances at once', 'Is an object store', 'Is a CDN'], correct: [0], explain: 'A standard EBS volume is single-attach within an AZ.' },
    { kind: 'tapfix', prompt: 'A fleet of servers needs to share one set of files. Tap the right storage.', tapTarget: 'efs', explain: 'EFS is shared file storage many instances mount together.' },
  ],
};

const fanout = {
  id: 'fan-out-sns', title: 'Broadcast with SNS', examDomain: 'Design Resilient Architectures',
  summary: 'Shout an event once over the kitchen tannoy; every station that cares reacts on its own.',
  scenery: 'open',
  blocks: [
    C('producer', 'Producer', 'compute', { pos: [-6.5, 0.7, 0] }, { name: 'The line', prop: 'cook', pos: [-6.5, 0], yaw: 90 }, 'Something that happens (an event).', 'A publisher; e.g. “order placed”.'),
    C('sns', 'SNS topic', 'generic', { pos: [-1.5, 0.7, 0] }, { name: 'The tannoy', prop: 'tannoy', pos: [-1.5, 0], yaw: 0 }, 'Announces the event to everyone subscribed.', 'An SNS topic; push-based pub/sub.'),
    C('billing', 'Billing queue', 'generic', { pos: [2.2, 0.7, -2.1] }, { name: 'Billing rail', prop: 'ticketrail', pos: [2.2, -2.1], yaw: 0 }, 'One subscriber that bills the order.', 'An SQS queue subscribed to the topic.'),
    C('analytics', 'Analytics queue', 'generic', { pos: [4, 0.7, -0.3] }, { name: 'Analytics rail', prop: 'ticketrail', pos: [4, -0.3], yaw: 0 }, 'Another subscriber that records stats.', 'Another SQS queue subscriber.'),
    C('notify', 'Lambda', 'compute', { pos: [2.6, 0.7, 2.1] }, { name: 'Notify cook', prop: 'cook', pos: [2.6, 2.1], yaw: -90 }, 'A subscriber that sends a notification.', 'A Lambda subscribed to the topic.'),
  ],
  connections: [
    { id: 'c_prod_sns', from: 'producer', to: 'sns', flow: 'request' },
    { id: 'c_sns_billing', from: 'sns', to: 'billing', flow: 'data' },
    { id: 'c_sns_analytics', from: 'sns', to: 'analytics', flow: 'data' },
    { id: 'c_sns_notify', from: 'sns', to: 'notify', flow: 'data' },
  ],
  stages: [
    { title: 'One event, many care', focus: 'producer', anim: 'pulse', animConn: 'c_prod_sns', narration: 'When one thing happens, several systems need to know — billing, analytics, notifications.', storyNarration: 'An order is placed. The kitchen, the till, and the front desk all need to hear about it.', concept: 'One event often has many interested consumers.', blocks: ['producer', 'sns'], conns: ['c_prod_sns'] },
    { title: 'Shout it once (SNS)', focus: 'sns', anim: 'spike', narration: 'Publish to an SNS topic and it pushes a copy to every subscriber — fan-out, no point-to-point wiring.', storyNarration: 'Call it once over the tannoy. Everyone who’s listening hears it at the same moment.', concept: 'SNS = pub/sub topic that fans out to all subscribers.', blocks: ['producer', 'sns', 'billing', 'analytics', 'notify'], conns: ['c_prod_sns', 'c_sns_billing', 'c_sns_analytics', 'c_sns_notify'] },
    { title: 'Each reacts on its own', focus: 'analytics', anim: 'pulse', animConn: 'c_sns_analytics', narration: 'Each subscriber gets its own copy and processes independently — add or remove subscribers without touching the producer.', storyNarration: 'The till rings it up, the log writes it down, the front desk pings the guest — each does its own job.', concept: 'Subscribers are decoupled and independent.', blocks: ['producer', 'sns', 'billing', 'analytics', 'notify'], conns: ['c_prod_sns', 'c_sns_billing', 'c_sns_analytics', 'c_sns_notify'] },
    { title: 'SNS + SQS together', focus: 'billing', anim: 'pulse', animConn: 'c_sns_billing', narration: 'Subscribe SQS queues to the topic so each consumer also gets buffering and retries — the classic fan-out pattern.', storyNarration: 'Give each listener its own ticket rail off the tannoy, so a busy one can work through the backlog at its pace.', concept: 'SNS fan-out into SQS queues = decoupled + buffered.', blocks: ['producer', 'sns', 'billing', 'analytics', 'notify'], conns: ['c_prod_sns', 'c_sns_billing', 'c_sns_analytics', 'c_sns_notify'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'One event must reach several independent systems at once. Use…', options: ['SNS (pub/sub fan-out)', 'A single SQS queue', 'An EBS volume', 'Route 53'], correct: [0], explain: 'SNS pushes each message to all subscribers.' },
    { kind: 'single', prompt: 'How do SNS and SQS differ?', options: ['SNS pushes to many subscribers; SQS is a queue consumers pull from', 'They are identical', 'SNS stores files; SQS routes DNS', 'SQS is push; SNS is pull'], correct: [0], explain: 'SNS = push pub/sub; SQS = pull queue.' },
    { kind: 'single', prompt: 'Why subscribe SQS queues to an SNS topic?', options: ['Fan-out plus per-consumer buffering and retries', 'To make SNS durable', 'To replace IAM', 'To cache reads'], correct: [0], explain: 'The SNS→SQS pattern gives independent, buffered consumers.' },
    { kind: 'tapfix', prompt: 'A producer must notify three independent services about each event. Tap what to publish through.', tapTarget: 'sns', explain: 'An SNS topic fans the event out to all subscribers.' },
  ],
};

const dns = {
  id: 'dns-routing-route53', title: 'Route Users with DNS', examDomain: 'Design High-Performing Architectures',
  summary: 'The host stand sends each guest the smart way: nearest kitchen, around a closed one, or split the crowd.',
  scenery: 'open',
  blocks: [
    C('user', 'Global user', 'generic', { pos: [-7, 0.7, 0] }, { name: 'Customer', prop: 'customer', pos: [-7, 0], yaw: 90 }, 'A person looking up your domain.', 'A client DNS resolution.'),
    C('r53', 'Route 53', 'networking', { pos: [-2, 0.7, 0] }, { name: 'Host stand', prop: 'host', pos: [-2, 0], yaw: -90 }, 'Turns your name into the best address by policy.', 'Route 53; DNS with routing policies + health checks.', 'app.example.com  A  ALIAS → ALB\nPolicies: simple · latency · weighted · failover\nHealth check fails → fail over to DR'),
    C('kA', 'Region: London', 'compute', { pos: [2.5, 0.7, -1.7] }, { name: 'London kitchen', prop: 'cook', pos: [2.5, -1.7], yaw: -90 }, 'One regional endpoint.', 'An endpoint in eu-west-2.'),
    C('kB', 'Region: New York', 'compute', { pos: [2.5, 0.7, 1.7] }, { name: 'New York kitchen', prop: 'cook', pos: [2.5, 1.7], yaw: -90 }, 'Another regional endpoint.', 'An endpoint in us-east-1.'),
  ],
  connections: [
    { id: 'c_user_r53', from: 'user', to: 'r53', flow: 'request' },
    { id: 'c_r53_kA', from: 'r53', to: 'kA', flow: 'request' },
    { id: 'c_r53_kB', from: 'r53', to: 'kB', flow: 'request' },
  ],
  stages: [
    { title: 'One name, many doors', focus: 'r53', anim: 'pulse', animConn: 'c_user_r53', narration: 'Route 53 resolves your domain to an endpoint — and can choose among several by policy.', storyNarration: 'Every guest asks the host stand where to go; the host can point them to any of several kitchens.', concept: 'Route 53 maps a name to the right endpoint, by policy.', blocks: ['user', 'r53'], conns: ['c_user_r53'] },
    { title: 'Send them to the nearest', focus: 'kA', anim: 'chain', chain: ['c_user_r53', 'c_r53_kA'], narration: 'Latency-based routing sends each user to the region that answers fastest for them.', storyNarration: 'Seat each guest at the nearest kitchen, so their food travels the shortest distance.', concept: 'Latency routing → lowest-latency region per user.', blocks: ['user', 'r53', 'kA', 'kB'], conns: ['c_user_r53', 'c_r53_kA'] },
    { title: 'Skip a closed kitchen', focus: 'kB', anim: 'chain', chain: ['c_user_r53', 'c_r53_kB'], narration: 'Health checks + failover routing steer users away from an unhealthy endpoint to a healthy one.', storyNarration: 'If a kitchen’s gone dark, the host simply stops seating there and sends everyone to the open one.', concept: 'Failover routing + health checks route around outages.', blocks: ['user', 'r53', 'kA', 'kB'], conns: ['c_user_r53', 'c_r53_kB'] },
    { title: 'Split or target the crowd', focus: 'r53', narration: 'Weighted routing splits traffic (e.g. canary 5%); geolocation routing sends users to a region by where they are.', storyNarration: 'Send one in twenty to the new kitchen to try it; or always seat European guests in London.', concept: 'Weighted (canary) and geolocation policies.', blocks: ['user', 'r53', 'kA', 'kB'], conns: ['c_user_r53', 'c_r53_kA', 'c_r53_kB'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Send each user to the lowest-latency region. Which routing policy?', options: ['Latency-based routing', 'Failover routing', 'Simple routing', 'Weighted 50/50'], correct: [0], explain: 'Latency routing picks the fastest region per user.' },
    { kind: 'single', prompt: 'Automatically route away from an unhealthy region. Use…', options: ['Failover routing with health checks', 'A bigger instance', 'An EBS volume', 'A NAT gateway'], correct: [0], explain: 'Route 53 health checks drive failover routing.' },
    { kind: 'single', prompt: 'Send 5% of traffic to a new version to test it. Use…', options: ['Weighted routing', 'Geolocation routing', 'Latency routing', 'A security group'], correct: [0], explain: 'Weighted records split traffic by assigned weights (canary).' },
    { kind: 'single', prompt: 'What is Route 53?', options: ['A DNS service with routing policies + health checks', 'A block storage service', 'A message queue', 'A container runtime'], correct: [0], explain: 'Route 53 is AWS’s scalable DNS with smart routing.' },
  ],
};

const dr = {
  id: 'disaster-recovery', title: 'Survive a Whole Region', examDomain: 'Design Resilient Architectures',
  summary: 'Back up the recipes off-site and keep a standby kitchen in another city, ready if the lights go out.',
  scenery: 'open',
  blocks: [
    C('primary', 'Primary region', 'compute', { pos: [-5, 0.7, 0] }, { name: 'Main kitchen', prop: 'cook', pos: [-5, 0], yaw: 90 }, 'Where you serve from today.', 'Your primary AWS region.'),
    C('backup', 'Cross-region backup', 'storage', { pos: [-0.5, 0.7, -1.7] }, { name: 'Off-site store', prop: 'larder', pos: [-0.5, -1.7], yaw: -90 }, 'Copies of your data kept in another region.', 'S3 cross-region replication / backups.'),
    C('drk', 'DR region', 'compute', { pos: [3.5, 0.7, 1.3] }, { name: 'Standby kitchen', prop: 'cook', pos: [3.5, 1.3], yaw: -90 }, 'A second site ready to take over.', 'A standby region (pilot light / warm standby).'),
  ],
  connections: [
    { id: 'c_primary_backup', from: 'primary', to: 'backup', flow: 'replication' },
    { id: 'c_backup_drk', from: 'backup', to: 'drk', flow: 'replication' },
    { id: 'c_primary_drk', from: 'primary', to: 'drk', flow: 'replication' },
  ],
  stages: [
    { title: 'A whole city can go dark', focus: 'primary', anim: 'overload', animConn: 'c_primary_backup', narration: 'Rare, but an entire region can fail. If everything lives there, you’re down completely.', storyNarration: 'A blackout hits the whole city. If you only have the one kitchen, service stops dead.', concept: 'Plan for region-wide failure, not just one server.', blocks: ['primary', 'backup'], conns: ['c_primary_backup'] },
    { title: 'Back up off-site', focus: 'backup', anim: 'pulse', animConn: 'c_primary_backup', narration: 'Replicate data to another region so a copy survives even if the primary region is lost.', storyNarration: 'Keep copies of every recipe and the night’s stock in a store across the country.', concept: 'Cross-region backups protect your data.', blocks: ['primary', 'backup'], conns: ['c_primary_backup'] },
    { title: 'Stand up a second kitchen', focus: 'drk', anim: 'chain', chain: ['c_primary_backup', 'c_backup_drk'], narration: 'Keep a standby in another region. Cost vs recovery time: backup-restore → pilot light → warm standby → active-active.', storyNarration: 'Run a smaller standby kitchen in the other city — from “keep the recipes” up to “keep it half-staffed and ready”.', concept: 'DR strategies trade cost against RTO/RPO.', blocks: ['primary', 'backup', 'drk'], conns: ['c_primary_backup', 'c_backup_drk'] },
    { title: 'Fail over the region', focus: 'drk', anim: 'chain', chain: ['c_primary_drk'], narration: 'On a regional outage, promote the DR region and redirect traffic to it (e.g. via Route 53 failover).', storyNarration: 'When the main city goes dark, flip the sign: send every guest to the standby kitchen.', concept: 'Regional failover keeps you serving.', blocks: ['primary', 'backup', 'drk'], conns: ['c_primary_drk'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Protect against an entire AWS region failing. You should…', options: ['Replicate data and have a plan in a second region', 'Use a bigger instance', 'Add a second AZ only', 'Use a NAT gateway'], correct: [0], explain: 'AZ redundancy isn’t enough for a region-wide outage; use multi-region.' },
    { kind: 'single', prompt: 'RPO and RTO describe…', options: ['How much data you can lose, and how fast you recover', 'CPU and memory', 'Storage class tiers', 'DNS record types'], correct: [0], explain: 'RPO = data-loss tolerance; RTO = recovery time. They drive DR choice.' },
    { kind: 'single', prompt: 'Cheapest DR, but slowest to recover?', options: ['Backup and restore', 'Active-active multi-region', 'Warm standby', 'Pilot light'], correct: [0], explain: 'Backup/restore costs least but takes longest to bring up.' },
    { kind: 'single', prompt: 'During a region failover, how do you redirect users?', options: ['Route 53 failover routing', 'An EBS snapshot', 'A security group rule', 'An SQS queue'], correct: [0], explain: 'DNS failover sends traffic to the healthy region.' },
  ],
};

const containers = {
  id: 'containers-ecs', title: 'Package It in Containers', examDomain: 'Design High-Performing Architectures',
  summary: 'Pre-pack the recipe and all its kit into identical boxes you can stamp out and run anywhere.',
  scenery: 'open',
  blocks: [
    C('image', 'Container image', 'edge', { pos: [-6.5, 0.7, 0] }, { name: 'The meal kit', prop: 'crate', pos: [-6.5, 0], yaw: 0 }, 'App + everything it needs, packed to run identically anywhere.', 'A container image (e.g. in Amazon ECR).'),
    C('task1', 'Task #1', 'compute', { pos: [-1.5, 0.7, -1.7] }, { name: 'Running kit', prop: 'crate', pos: [-1.5, -1.7], yaw: 0 }, 'One running copy of the image.', 'An ECS task / container.'),
    C('task2', 'Task #2', 'compute', { pos: [-1.5, 0.7, 1.7] }, { name: 'Another kit', prop: 'crate', pos: [-1.5, 1.7], yaw: 0 }, 'Another identical running copy.', 'Another ECS task.'),
    C('task3', 'Task (scaled)', 'compute', { pos: [2.5, 0.7, 0] }, { name: 'Extra kit', prop: 'crate', pos: [2.5, 0], yaw: 0 }, 'One more copy added under load.', 'A task added by service scaling.'),
  ],
  connections: [
    { id: 'c_image_task1', from: 'image', to: 'task1', flow: 'data' },
    { id: 'c_image_task2', from: 'image', to: 'task2', flow: 'data' },
    { id: 'c_image_task3', from: 'image', to: 'task3', flow: 'data' },
  ],
  stages: [
    { title: 'Pack the recipe + kit', focus: 'image', anim: 'pulse', animConn: 'c_image_task1', narration: 'A container image bundles your app with its dependencies, so it runs the same on any machine.', storyNarration: 'Pre-pack the recipe and every tool and ingredient into one sealed kit — open it anywhere and it’s identical.', concept: 'A container image = a portable, consistent unit.', blocks: ['image', 'task1'], conns: ['c_image_task1'] },
    { title: 'Run many identical copies', focus: 'task2', anim: 'pulse', animConn: 'c_image_task2', narration: 'ECS runs many identical container tasks from one image — each isolated, all the same.', storyNarration: 'Stamp out as many identical kits as you need; each cooks exactly the same dish.', concept: 'Run N identical containers from one image.', blocks: ['image', 'task1', 'task2'], conns: ['c_image_task1', 'c_image_task2'] },
    { title: 'No kitchen to manage (Fargate)', focus: 'task3', anim: 'spike', narration: 'With Fargate you run containers serverlessly — no EC2 hosts or clusters to manage or patch.', storyNarration: 'Don’t rent or staff a building — just drop the kits and they run. The venue is somebody else’s problem.', concept: 'Fargate = serverless containers, no hosts to manage.', blocks: ['image', 'task1', 'task2', 'task3'], conns: ['c_image_task1', 'c_image_task2', 'c_image_task3'] },
    { title: 'Scale the copies', focus: 'task3', anim: 'pulse', animConn: 'c_image_task3', narration: 'Scale the number of tasks up and down with demand — fast, because each copy is identical and quick to start.', storyNarration: 'Busy night? Stamp out more kits. Quiet? Pack them away. Each one spins up in seconds.', concept: 'Scale container tasks horizontally with load.', blocks: ['image', 'task1', 'task2', 'task3'], conns: ['c_image_task1', 'c_image_task2', 'c_image_task3'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Why package an app as a container image?', options: ['It runs identically anywhere, with its dependencies', 'It becomes a relational database', 'It stops needing IAM', 'It caches reads'], correct: [0], explain: 'Images bundle the app + dependencies for consistent, portable runs.' },
    { kind: 'single', prompt: 'What does AWS Fargate let you avoid?', options: ['Managing the EC2 hosts/clusters for your containers', 'Writing a Dockerfile', 'Using IAM roles', 'Logging'], correct: [0], explain: 'Fargate runs containers serverlessly — no host management.' },
    { kind: 'single', prompt: 'In ECS, a running copy of your container is a…', options: ['Task', 'Bucket', 'Hosted zone', 'Volume'], correct: [0], explain: 'ECS runs tasks (one or more containers) from an image.' },
    { kind: 'single', prompt: 'Demand spikes. With containers you…', options: ['Run more identical tasks, each starting quickly', 'Reboot the database', 'Resize an EBS volume', 'Change DNS TTL'], correct: [0], explain: 'Containers scale out horizontally and start fast.' },
  ],
};

const kms = {
  id: 'encrypt-with-kms', title: 'Lock It with KMS', examDomain: 'Design Secure Architectures',
  summary: 'Lock every store, and keep the master keys in a vault that decides who may unlock what.',
  scenery: 'open',
  blocks: [
    C('app', 'App / user', 'compute', { pos: [-6, 0.7, 0] }, { name: 'The cook', prop: 'cook', pos: [-6, 0], yaw: 90 }, 'Reads and writes the data.', 'Your application requesting data.'),
    C('data', 'Encrypted data', 'storage', { pos: [0.5, 0.7, -1.6] }, { name: 'Locked larder', prop: 'larder', pos: [0.5, -1.6], yaw: -90 }, 'Stored locked; a stolen disk is useless without the key.', 'Encrypted S3 / EBS / RDS at rest.'),
    C('kms', 'AWS KMS', 'security', { pos: [0.5, 0.7, 1.6] }, { name: 'Key vault', prop: 'safe', pos: [0.5, 1.6], yaw: -90 }, 'Holds the master keys; only allowed identities may unlock.', 'AWS KMS; managed keys, access via IAM, audited in CloudTrail.', 'arn:aws:kms:eu-west-1:111122223333:key/1234abcd\nalias/app-data'),
  ],
  connections: [
    { id: 'c_app_data', from: 'app', to: 'data', flow: 'data' },
    { id: 'c_app_kms', from: 'app', to: 'kms', flow: 'request' },
    { id: 'c_kms_data', from: 'kms', to: 'data', flow: 'network' },
  ],
  stages: [
    { title: 'Lock everything (at rest)', focus: 'data', anim: 'pulse', animConn: 'c_app_data', narration: 'Encrypt data at rest — S3, EBS, RDS — so a stolen disk or snapshot is unreadable.', storyNarration: 'Lock the larder. Even if someone walks off with the shelves, they can’t read what’s inside.', concept: 'Encrypt at rest so raw storage is useless if leaked.', blocks: ['app', 'data'], conns: ['c_app_data'] },
    { title: 'KMS holds the master keys', focus: 'kms', anim: 'pulse', animConn: 'c_app_kms', narration: 'KMS creates and stores the encryption keys; the keys never leave it in plaintext.', storyNarration: 'The master keys live in a vault, not in a drawer by the door. Nobody pockets them.', concept: 'KMS is a managed, central key store.', blocks: ['app', 'data', 'kms'], conns: ['c_app_kms'] },
    { title: 'Unlock only if allowed', focus: 'kms', anim: 'chain', chain: ['c_app_kms', 'c_kms_data'], narration: 'To read, the app asks KMS to decrypt — and KMS only obliges identities that IAM permits, logging every use.', storyNarration: 'Want into the larder? Ask the vault. It hands a key only to staff on the list, and writes down every time.', concept: 'Key use is gated by IAM and audited.', blocks: ['app', 'data', 'kms'], conns: ['c_app_kms', 'c_kms_data'] },
    { title: 'In transit, too (TLS)', focus: 'app', anim: 'pulse', animConn: 'c_app_data', narration: 'Encrypt in transit with TLS as well, so data is protected on the wire, not just at rest.', storyNarration: 'Don’t just lock the larder — carry the stock in a locked case too, so nothing’s exposed on the way.', concept: 'Encrypt in transit (TLS) as well as at rest.', blocks: ['app', 'data', 'kms'], conns: ['c_app_kms', 'c_kms_data'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Why encrypt data at rest?', options: ['A stolen disk/snapshot is unreadable without the key', 'It makes queries faster', 'It removes the need for IAM', 'It compresses the data'], correct: [0], explain: 'At-rest encryption protects data if the underlying storage leaks.' },
    { kind: 'single', prompt: 'What does AWS KMS provide?', options: ['Managed encryption keys with IAM-controlled, audited access', 'Object storage', 'A message queue', 'A CDN'], correct: [0], explain: 'KMS centrally manages keys; access is governed by IAM and logged.' },
    { kind: 'single', prompt: 'Who can decrypt data protected by a KMS key?', options: ['Only identities the key policy / IAM allows', 'Anyone in the account', 'Only the root user', 'Anyone on the internet'], correct: [0], explain: 'KMS decryption is gated by key policy and IAM permissions.' },
    { kind: 'single', prompt: 'Protect data on the network between client and server. Use…', options: ['TLS (encryption in transit)', 'A bigger instance', 'A NAT gateway', 'An SQS queue'], correct: [0], explain: 'TLS encrypts data in transit; KMS-backed encryption covers at rest.' },
  ],
};

const edge = {
  id: 'protect-the-edge', title: 'Guard the Front Door', examDomain: 'Design Secure Architectures',
  summary: 'A barrier that soaks up a stampede, and a doorman who turns away troublemakers before they reach the kitchen.',
  scenery: 'open',
  blocks: [
    C('traffic', 'Incoming traffic', 'generic', { pos: [-7.5, 0.7, 0] }, { name: 'The crowd', prop: 'customer', pos: [-7.5, 0], yaw: 90 }, 'A mix of real users and bad actors.', 'Inbound requests, some malicious.'),
    C('shield', 'AWS Shield', 'security', { pos: [-3.5, 0.7, 0] }, { name: 'The barrier', prop: 'guardpost', pos: [-3.5, 0], yaw: 90 }, 'Soaks up volumetric floods (DDoS) at the edge.', 'AWS Shield; DDoS protection.'),
    C('waf', 'AWS WAF', 'security', { pos: [0, 0.7, 0] }, { name: 'The doorman', prop: 'bouncer', pos: [0, 0], yaw: 90 }, 'Inspects each request and blocks bad ones.', 'AWS WAF; L7 rules — SQLi/XSS/bots/rate limits.'),
    C('app', 'Your app', 'compute', { pos: [4, 0.7, 0] }, { name: 'Back-of-house', prop: 'cook', pos: [4, 0], yaw: -90 }, 'The protected application.', 'Your app behind CloudFront/ALB.'),
  ],
  connections: [
    { id: 'c_traffic_shield', from: 'traffic', to: 'shield', flow: 'request' },
    { id: 'c_shield_waf', from: 'shield', to: 'waf', flow: 'request' },
    { id: 'c_waf_app', from: 'waf', to: 'app', flow: 'request' },
  ],
  stages: [
    { title: 'Floods and bad actors', focus: 'app', anim: 'overload', animConn: 'c_traffic_shield', narration: 'A public endpoint faces volumetric floods (DDoS) and malicious requests (SQL injection, XSS, bad bots).', storyNarration: 'A stampede hits the door — and mixed in the crowd are pickpockets and gate-crashers.', concept: 'The edge faces DDoS + application-layer attacks.', blocks: ['traffic', 'app'], conns: ['c_traffic_shield'] },
    { title: 'Soak up the stampede (Shield)', focus: 'shield', anim: 'pulse', animConn: 'c_traffic_shield', narration: 'AWS Shield absorbs DDoS floods at the edge, keeping the volumetric attack off your app.', storyNarration: 'A sturdy barrier out front takes the crush of the crowd, so the door isn’t flattened.', concept: 'Shield = DDoS protection at the edge.', blocks: ['traffic', 'shield', 'app'], conns: ['c_traffic_shield'] },
    { title: 'Screen each request (WAF)', focus: 'waf', anim: 'pulse', animConn: 'c_shield_waf', narration: 'AWS WAF inspects requests against rules — block SQL injection, XSS, known bad bots, or rate-limit abusers.', storyNarration: 'A doorman checks everyone against a list, turning away the pickpockets and the obvious troublemakers.', concept: 'WAF = application-layer (L7) request filtering.', blocks: ['traffic', 'shield', 'waf', 'app'], conns: ['c_shield_waf'] },
    { title: 'Only clean traffic gets in', focus: 'app', anim: 'chain', chain: ['c_traffic_shield', 'c_shield_waf', 'c_waf_app'], narration: 'Layered at the edge (often on CloudFront/ALB), Shield + WAF let real users through and drop the rest before your app.', storyNarration: 'The barrier and the doorman work together: genuine guests stroll in; everyone else is stopped at the door.', concept: 'Layered edge defense protects the app.', blocks: ['traffic', 'shield', 'waf', 'app'], conns: ['c_traffic_shield', 'c_shield_waf', 'c_waf_app'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Protect against a large DDoS flood. Use…', options: ['AWS Shield', 'AWS WAF rules only', 'An EBS volume', 'A DynamoDB table'], correct: [0], explain: 'Shield is AWS’s managed DDoS protection.' },
    { kind: 'single', prompt: 'Block SQL injection and XSS in HTTP requests. Use…', options: ['AWS WAF', 'AWS Shield', 'A NAT gateway', 'Route 53'], correct: [0], explain: 'WAF filters application-layer (L7) request content.' },
    { kind: 'single', prompt: 'AWS WAF operates mainly at…', options: ['Layer 7 (HTTP requests)', 'Layer 3 (IP only)', 'The physical layer', 'The database engine'], correct: [0], explain: 'WAF inspects L7 request attributes and content.' },
    { kind: 'tapfix', prompt: 'Bots are hammering your site with SQL-injection attempts. Tap what to put in front of the app.', tapTarget: 'waf', explain: 'WAF rules block injection attempts and bad bots at L7.' },
  ],
};

const apigw = {
  id: 'api-front-door', title: 'A Front Door for APIs', examDomain: 'Design High-Performing Architectures',
  summary: 'One managed window that takes every order, checks it, limits the pace, and passes it to the kitchen.',
  scenery: 'open',
  blocks: [
    C('client', 'API client', 'generic', { pos: [-7, 0.7, 0] }, { name: 'Customer', prop: 'customer', pos: [-7, 0], yaw: 90 }, 'An app calling your API.', 'A client calling your HTTP API.'),
    C('api', 'API Gateway', 'networking', { pos: [-1.5, 0.7, 0] }, { name: 'The order window', prop: 'pass', pos: [-1.5, 0], yaw: -90 }, 'Takes, checks, throttles and routes every request.', 'Amazon API Gateway; managed API front door.', 'GET /orders → Lambda integration\nThrottle 10k rps · burst 5k\nStages: prod · dev (usage plans + keys)'),
    C('lambda', 'Lambda', 'compute', { pos: [3, 0.7, -1.6] }, { name: 'On-demand cook', prop: 'cook', pos: [3, -1.6], yaw: -90 }, 'One backend the gateway can route to.', 'A Lambda backend.'),
    C('svc', 'Service', 'compute', { pos: [3.3, 0.7, 1.6] }, { name: 'Line cook', prop: 'cook', pos: [3.3, 1.6], yaw: -90 }, 'Another backend.', 'An HTTP/container backend.'),
  ],
  connections: [
    { id: 'c_client_api', from: 'client', to: 'api', flow: 'request' },
    { id: 'c_api_lambda', from: 'api', to: 'lambda', flow: 'request' },
    { id: 'c_api_svc', from: 'api', to: 'svc', flow: 'request' },
  ],
  stages: [
    { title: 'One front door for your APIs', focus: 'api', anim: 'pulse', animConn: 'c_client_api', narration: 'API Gateway is a single managed entry point for your APIs — clients only ever talk to it.', storyNarration: 'Every order goes through one window. Diners never wander into the kitchen to shout an order.', concept: 'API Gateway = one managed API entry point.', blocks: ['client', 'api'], conns: ['c_client_api'] },
    { title: 'Check and throttle', focus: 'api', anim: 'pulse', animConn: 'c_client_api', narration: 'It authenticates callers, validates requests, and throttles / rate-limits to protect your backends.', storyNarration: 'The window checks each order is valid and paid, and limits how fast orders fly in so the kitchen isn’t swamped.', concept: 'Auth, validation and throttling at the gateway.', blocks: ['client', 'api'], conns: ['c_client_api'] },
    { title: 'Route to the right backend', focus: 'lambda', anim: 'chain', chain: ['c_client_api', 'c_api_lambda'], narration: 'It routes each path to the right backend — Lambda, containers, or any HTTP service.', storyNarration: 'The window sends each ticket to the right station — grill, salad, or the on-call cook.', concept: 'Routes requests to Lambda / services.', blocks: ['client', 'api', 'lambda', 'svc'], conns: ['c_client_api', 'c_api_lambda', 'c_api_svc'] },
    { title: 'Managed scale + caching', focus: 'api', anim: 'pulse', animConn: 'c_client_api', narration: 'It scales automatically and can cache responses — no servers to run for the API layer.', storyNarration: 'The window handles any size of queue and keeps popular answers ready — and you never staff the window itself.', concept: 'Serverless, scaling API layer with caching.', blocks: ['client', 'api', 'lambda', 'svc'], conns: ['c_client_api', 'c_api_lambda', 'c_api_svc'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'What is Amazon API Gateway?', options: ['A managed front door for your APIs', 'A relational database', 'A block storage volume', 'A DNS service'], correct: [0], explain: 'API Gateway is a managed entry point that fronts your APIs.' },
    { kind: 'single', prompt: 'Stop a client from overwhelming your backend with calls. Use…', options: ['API Gateway throttling / rate limits', 'A bigger EBS volume', 'Glacier', 'A NACL only'], correct: [0], explain: 'API Gateway can throttle and rate-limit requests.' },
    { kind: 'single', prompt: 'A common serverless API pairing is…', options: ['API Gateway + Lambda', 'API Gateway + EBS', 'Route 53 + SQS', 'KMS + EFS'], correct: [0], explain: 'API Gateway commonly routes to Lambda for serverless APIs.' },
    { kind: 'single', prompt: 'Who manages/scales the API Gateway layer?', options: ['AWS — it’s managed and auto-scaling', 'You patch its servers', 'Nobody; it’s fixed size', 'The client'], correct: [0], explain: 'API Gateway is fully managed and scales for you.' },
  ],
};

const orchestrate = {
  id: 'orchestrate-step-functions', title: 'Coordinate the Steps', examDomain: 'Design Resilient Architectures',
  summary: 'A head chef with a recipe card who calls each step in order, waits, and handles a step that fails.',
  scenery: 'open',
  blocks: [
    C('sf', 'Step Functions', 'compute', { pos: [-5, 0.7, 0] }, { name: 'Head chef', prop: 'host', pos: [-5, 0], yaw: 90 }, 'Coordinates the whole multi-step job.', 'AWS Step Functions; a managed state machine.', '"States": {\n  "Prep": { "Type":"Task", "Next":"Cook" },\n  "Cook": { "Type":"Task", "End":true } }'),
    C('s1', 'Step 1: Prep', 'compute', { pos: [0, 0.7, -1.7] }, { name: 'Prep cook', prop: 'cook', pos: [0, -1.7], yaw: -90 }, 'The first step.', 'A task (e.g. a Lambda).'),
    C('s2', 'Step 2: Cook', 'compute', { pos: [1.8, 0.7, 0] }, { name: 'Line cook', prop: 'cook', pos: [1.8, 0], yaw: -90 }, 'The second step, after the first.', 'The next task in the workflow.'),
    C('s3', 'Step 3: Plate', 'compute', { pos: [3.6, 0.7, 1.7] }, { name: 'Plating cook', prop: 'cook', pos: [3.6, 1.7], yaw: -90 }, 'The final step.', 'The final task.'),
  ],
  connections: [
    { id: 'c_sf_s1', from: 'sf', to: 's1', flow: 'request' },
    { id: 'c_sf_s2', from: 'sf', to: 's2', flow: 'request' },
    { id: 'c_sf_s3', from: 'sf', to: 's3', flow: 'request' },
  ],
  stages: [
    { title: 'A recipe with many steps', focus: 'sf', anim: 'pulse', animConn: 'c_sf_s1', narration: 'Real work is often multi-step: do A, then B, then C — with ordering and error handling between them.', storyNarration: 'A dish isn’t one move: prep, then cook, then plate — each must happen in order, and someone must keep track.', concept: 'Multi-step work needs coordination.', blocks: ['sf', 's1'], conns: ['c_sf_s1'] },
    { title: 'Call each step in order', focus: 's2', anim: 'chain', chain: ['c_sf_s1', 'c_sf_s2', 'c_sf_s3'], narration: 'Step Functions runs a state machine: it invokes each step, waits for it, then moves to the next.', storyNarration: 'The head chef calls “prep!”, waits, then “cook!”, waits, then “plate!” — never out of order.', concept: 'A state machine sequences the steps.', blocks: ['sf', 's1', 's2', 's3'], conns: ['c_sf_s1', 'c_sf_s2', 'c_sf_s3'] },
    { title: 'Handle a step that fails', focus: 's2', anim: 'overload', animConn: 'c_sf_s2', narration: 'Built-in retries, catch and branching mean a failed step is retried or handled — not a silent dead end.', storyNarration: 'A step goes wrong? The head chef calls for a re-do or takes the back-up plan — the dish doesn’t just stall.', concept: 'Built-in retry / catch / branching.', blocks: ['sf', 's1', 's2', 's3'], conns: ['c_sf_s1', 'c_sf_s2', 'c_sf_s3'] },
    { title: 'See the whole flow', focus: 'sf', anim: 'pulse', animConn: 'c_sf_s1', narration: 'Step Functions tracks state for long-running workflows and shows the flow visually — easy to follow and audit.', storyNarration: 'The recipe card shows exactly where every dish is, so nothing is forgotten on a busy night.', concept: 'Durable, visible orchestration of workflows.', blocks: ['sf', 's1', 's2', 's3'], conns: ['c_sf_s1', 'c_sf_s2', 'c_sf_s3'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'What does AWS Step Functions do?', options: ['Orchestrates multi-step workflows as a state machine', 'Stores objects', 'Serves DNS', 'Caches reads'], correct: [0], explain: 'Step Functions coordinates steps with ordering and error handling.' },
    { kind: 'single', prompt: 'A step in the workflow fails. Step Functions can…', options: ['Retry, catch the error, or branch', 'Only crash the whole app', 'Nothing — you handle it manually', 'Delete the data'], correct: [0], explain: 'Retries, catchers and choice states are built in.' },
    { kind: 'single', prompt: 'Best fit for Step Functions?', options: ['Coordinating several Lambdas/services in order', 'Storing relational data', 'A single one-line function', 'A CDN'], correct: [0], explain: 'It shines at orchestrating multi-step, multi-service workflows.' },
    { kind: 'single', prompt: 'A benefit over wiring functions together yourself?', options: ['Visual flow + durable state + built-in error handling', 'It’s always cheaper to run', 'It removes the need for IAM', 'It encrypts at rest'], correct: [0], explain: 'You get managed state tracking, visualization and retries.' },
  ],
};

const scaling = {
  id: 'auto-scaling', title: 'Match Staff to Demand', examDomain: 'Design Cost-Optimized Architectures',
  summary: 'Call in cooks when the tickets pile up, send them home when it’s quiet — pay only for what you need.',
  scenery: 'open',
  blocks: [
    C('rail', 'Demand', 'generic', { pos: [-6.5, 0.7, 0] }, { name: 'The tickets', prop: 'ticketrail', pos: [-6.5, 0], yaw: 0 }, 'The load, rising and falling through the day.', 'Demand measured by CPU, requests or queue depth.'),
    C('asg', 'Auto Scaling group', 'compute', { pos: [-1.5, 0.7, -1.6] }, { name: 'Shift manager', prop: 'host', pos: [-1.5, -1.6], yaw: -90 }, 'Adds or removes cooks to match the load.', 'An Auto Scaling group with a scaling policy.', 'min 2 · desired 2 · max 10\nTarget tracking: avg CPU = 50%\nadd capacity when > 50% for 3 min'),
    C('c1', 'Instance', 'compute', { pos: [2, 0.7, -1.6] }, { name: 'Cook', prop: 'cook', pos: [2, -1.6], yaw: -90 }, 'A baseline worker.', 'An EC2 instance in the group.'),
    C('c2', 'Instance #2', 'compute', { pos: [3.8, 0.7, -0.2] }, { name: 'Extra cook', prop: 'cook', pos: [3.8, -0.2], yaw: -90 }, 'Added when busy.', 'An instance added on scale-out.'),
    C('c3', 'Instance #3', 'compute', { pos: [4.6, 0.7, 1.8] }, { name: 'Another cook', prop: 'cook', pos: [4.6, 1.8], yaw: -90 }, 'Added when busy.', 'An instance added on scale-out.'),
  ],
  connections: [
    { id: 'c_rail_asg', from: 'rail', to: 'asg', flow: 'data' },
    { id: 'c_asg_c1', from: 'asg', to: 'c1', flow: 'request' },
    { id: 'c_asg_c2', from: 'asg', to: 'c2', flow: 'request' },
    { id: 'c_asg_c3', from: 'asg', to: 'c3', flow: 'request' },
  ],
  stages: [
    { title: 'Demand rises and falls', focus: 'rail', anim: 'pulse', animConn: 'c_rail_asg', narration: 'Load changes through the day. Fixed capacity either wastes money at night or falls over at the peak.', storyNarration: 'Some hours the rail is empty; at the dinner rush it’s packed. A fixed crew is wrong most of the time.', concept: 'Demand is variable; fixed capacity fits poorly.', blocks: ['rail', 'asg', 'c1'], conns: ['c_rail_asg', 'c_asg_c1'] },
    { title: 'Add cooks when busy (scale out)', focus: 'c2', anim: 'spike', narration: 'When a metric (CPU, requests, queue depth) rises, Auto Scaling launches more instances automatically.', storyNarration: 'The rail fills up, so the manager calls in extra cooks — no one has to phone around.', concept: 'Scale out automatically as load rises.', blocks: ['rail', 'asg', 'c1', 'c2', 'c3'], conns: ['c_rail_asg', 'c_asg_c1', 'c_asg_c2', 'c_asg_c3'] },
    { title: 'Send them home when quiet (scale in)', focus: 'asg', anim: 'pulse', animConn: 'c_rail_asg', narration: 'When load drops, it terminates the extra instances — so you stop paying for idle capacity.', storyNarration: 'The rush passes and the rail clears, so the extra cooks clock out. You’re not paying a full crew at midnight.', concept: 'Scale in to stop paying for idle capacity.', blocks: ['rail', 'asg', 'c1'], conns: ['c_rail_asg', 'c_asg_c1'] },
    { title: 'Set the target', focus: 'asg', anim: 'pulse', animConn: 'c_rail_asg', narration: 'Target-tracking keeps a metric at a set point (e.g. 60% CPU); min/max bounds keep it safe and predictable.', storyNarration: 'Tell the manager: “keep each cook about 60% busy, never fewer than two, never more than ten.” It handles the rest.', concept: 'Target-tracking policy with min/max bounds.', blocks: ['rail', 'asg', 'c1', 'c2', 'c3'], conns: ['c_rail_asg', 'c_asg_c1', 'c_asg_c2', 'c_asg_c3'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'What does an Auto Scaling group do?', options: ['Adds/removes instances to match demand', 'Stores objects durably', 'Routes DNS', 'Encrypts data'], correct: [0], explain: 'ASGs change instance count based on policies/metrics.' },
    { kind: 'single', prompt: 'Auto Scaling commonly scales on…', options: ['CPU, request count or queue depth', 'The number of S3 buckets', 'DNS TTL', 'IAM users'], correct: [0], explain: 'Scaling policies track utilization/load metrics.' },
    { kind: 'single', prompt: 'Keep average CPU at ~60% automatically. Use…', options: ['A target-tracking scaling policy', 'A fixed instance count', 'A NAT gateway', 'Glacier'], correct: [0], explain: 'Target tracking holds a metric near a chosen value.' },
    { kind: 'single', prompt: 'The main benefit of Auto Scaling?', options: ['Capacity matches demand — performance at peak, savings when quiet', 'Permanent maximum capacity', 'It encrypts traffic', 'It replaces the database'], correct: [0], explain: 'You pay for what you need while meeting peak load.' },
  ],
};

const analytics = {
  id: 'analyse-the-data', title: 'Query the Archives', examDomain: 'Design High-Performing Architectures',
  summary: 'Search the records where they sit, or load them into a warehouse built for heavy number-crunching.',
  scenery: 'open',
  blocks: [
    C('analyst', 'Analyst', 'generic', { pos: [-6.5, 0.7, 0] }, { name: 'The analyst', prop: 'customer', pos: [-6.5, 0], yaw: 90 }, 'Asks questions of the data.', 'A BI / analytics user.'),
    C('lake', 'Data in S3', 'storage', { pos: [-0.5, 0.7, -1.7] }, { name: 'The archives', prop: 'larder', pos: [-0.5, -1.7], yaw: -90 }, 'Mountains of raw records kept cheaply.', 'A data lake in S3.'),
    C('athena', 'Athena', 'edge', { pos: [-0.5, 0.7, 1.4] }, { name: 'Search-in-place clerk', prop: 'securitydesk', pos: [-0.5, 1.4], yaw: -90 }, 'Runs SQL directly on the files; pay per query.', 'Amazon Athena; serverless SQL on S3.'),
    C('redshift', 'Redshift', 'database', { pos: [3.5, 0.7, 0] }, { name: 'The analysis room', prop: 'pantry', pos: [3.5, 0], yaw: -90 }, 'A warehouse built for big, repeated analysis.', 'Amazon Redshift; columnar data warehouse.'),
  ],
  connections: [
    { id: 'c_analyst_athena', from: 'analyst', to: 'athena', flow: 'request' },
    { id: 'c_athena_lake', from: 'athena', to: 'lake', flow: 'data' },
    { id: 'c_analyst_redshift', from: 'analyst', to: 'redshift', flow: 'request' },
    { id: 'c_lake_redshift', from: 'lake', to: 'redshift', flow: 'data' },
  ],
  stages: [
    { title: 'Mountains of records', focus: 'lake', anim: 'pulse', animConn: 'c_athena_lake', narration: 'Logs, clicks and sales pile up cheaply in S3 — a data lake of raw records.', storyNarration: 'Years of dockets and receipts fill the archive room — cheap to keep, but a lot to wade through.', concept: 'S3 is a cheap, scalable data lake.', blocks: ['analyst', 'lake'], conns: ['c_athena_lake'] },
    { title: 'Search in place (Athena)', focus: 'athena', anim: 'chain', chain: ['c_analyst_athena', 'c_athena_lake'], narration: 'Athena runs SQL directly on the S3 files — no servers, pay per query. Great for ad-hoc questions.', storyNarration: 'Send a clerk into the archive to find exactly the dockets you asked for — you pay only for that search.', concept: 'Athena = serverless SQL over S3, pay per query.', blocks: ['analyst', 'lake', 'athena'], conns: ['c_analyst_athena', 'c_athena_lake'] },
    { title: 'Load a warehouse (Redshift)', focus: 'redshift', anim: 'chain', chain: ['c_lake_redshift', 'c_analyst_redshift'], narration: 'For big, repeated analytics, load data into Redshift — a columnar warehouse tuned for fast aggregation.', storyNarration: 'For the nightly numbers you always run, move the records into a dedicated analysis room laid out for fast counting.', concept: 'Redshift = managed columnar data warehouse.', blocks: ['analyst', 'lake', 'redshift'], conns: ['c_lake_redshift', 'c_analyst_redshift'] },
    { title: 'Pick the tool', focus: 'analyst', narration: 'Occasional, ad-hoc queries on raw S3 → Athena. Large-scale, frequent BI and joins → Redshift.', storyNarration: 'A one-off lookup? Send the clerk to the archive. Crunching the same big reports daily? Use the analysis room.', concept: 'Athena for ad-hoc; Redshift for heavy, repeated BI.', blocks: ['analyst', 'lake', 'athena', 'redshift'], conns: ['c_analyst_athena', 'c_athena_lake', 'c_lake_redshift', 'c_analyst_redshift'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Run occasional SQL directly on files in S3, no servers. Use…', options: ['Amazon Athena', 'Amazon Redshift', 'DynamoDB', 'EFS'], correct: [0], explain: 'Athena is serverless SQL over S3, billed per query.' },
    { kind: 'single', prompt: 'Large-scale, frequent BI with complex joins over structured data. Use…', options: ['Amazon Redshift', 'Athena for everything', 'A single RDS micro instance', 'S3 Glacier'], correct: [0], explain: 'Redshift is a columnar warehouse built for heavy analytics.' },
    { kind: 'single', prompt: 'A cheap, scalable place to keep raw analytics data?', options: ['A data lake in S3', 'An EBS volume', 'A DynamoDB item', 'A NAT gateway'], correct: [0], explain: 'S3 is the standard low-cost, scalable data lake.' },
    { kind: 'single', prompt: 'Athena’s cost model is…', options: ['Pay per query (data scanned)', 'A fixed hourly cluster fee', 'Per stored object', 'Per IAM user'], correct: [0], explain: 'Athena charges for the data each query scans.' },
  ],
};

const secrets = {
  id: 'manage-secrets', title: 'Manage Secrets', examDomain: 'Design Secure Architectures',
  summary: 'No passwords on a sticky note by the till: keep them in a locked box that rotates the locks itself.',
  scenery: 'open',
  blocks: [
    C('app', 'App / service', 'compute', { pos: [-6, 0.7, 0] }, { name: 'The cook', prop: 'cook', pos: [-6, 0], yaw: 90 }, 'Needs a database password to work.', 'Your application needing credentials.'),
    C('secrets', 'Secrets Manager', 'security', { pos: [0, 0.7, -1.6] }, { name: 'The lockbox', prop: 'safe', pos: [0, -1.6], yaw: -90 }, 'Stores credentials and hands them out at runtime.', 'AWS Secrets Manager; central, rotated, IAM-gated secrets.', 'GetSecretValue(SecretId: prod/db/creds)\n→ { "username": ..., "password": ... }\nRotation: every 30 days via Lambda'),
    C('db', 'Database', 'database', { pos: [3.2, 0.7, 1.2] }, { name: 'The pantry', prop: 'pantry', pos: [3.2, 1.2], yaw: -90 }, 'The resource the password unlocks.', 'The database the credential authenticates to.'),
  ],
  connections: [
    { id: 'c_app_secrets', from: 'app', to: 'secrets', flow: 'request' },
    { id: 'c_app_db', from: 'app', to: 'db', flow: 'data' },
    { id: 'c_secrets_db', from: 'secrets', to: 'db', flow: 'network' },
  ],
  stages: [
    { title: 'Don’t bake in passwords', focus: 'app', anim: 'overload', animConn: 'c_app_db', narration: 'A password hard-coded in source or config leaks easily and can’t be rotated without a redeploy.', storyNarration: 'Scrawling the safe code on a sticky note by the till: anyone walking past reads it, and changing it is a pain.', concept: 'Never hard-code or commit secrets.', blocks: ['app', 'db'], conns: ['c_app_db'] },
    { title: 'Keep them in Secrets Manager', focus: 'secrets', anim: 'pulse', animConn: 'c_app_secrets', narration: 'Store credentials centrally; the app fetches them at runtime instead of holding them.', storyNarration: 'Keep the codes in a locked box; staff ask the box for today’s code when they need it.', concept: 'Central secret store, fetched at runtime.', blocks: ['app', 'secrets', 'db'], conns: ['c_app_secrets'] },
    { title: 'Rotate automatically', focus: 'secrets', anim: 'pulse', animConn: 'c_secrets_db', narration: 'Secrets Manager rotates the credential on a schedule and updates the database — no downtime, no manual edits.', storyNarration: 'The box quietly re-keys the locks every week and tells the doors the new code. Nobody has to remember.', concept: 'Automatic credential rotation.', blocks: ['app', 'secrets', 'db'], conns: ['c_app_secrets', 'c_secrets_db'] },
    { title: 'Gate access with IAM', focus: 'secrets', anim: 'pulse', animConn: 'c_app_secrets', narration: 'Only permitted IAM identities can read a secret, and every retrieval is logged.', storyNarration: 'Only staff on the list may ask the box for a code, and it writes down every time one is handed out.', concept: 'Secret access is IAM-gated and audited.', blocks: ['app', 'secrets', 'db'], conns: ['c_app_secrets', 'c_secrets_db'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Where should a database password live?', options: ['In Secrets Manager, fetched at runtime', 'Hard-coded in the app', 'In a public S3 bucket', 'In the AMI name'], correct: [0], explain: 'Secrets Manager keeps credentials out of code and rotates them.' },
    { kind: 'single', prompt: 'A key benefit of Secrets Manager over a config file?', options: ['Automatic rotation of credentials', 'Faster queries', 'Cheaper storage', 'A global CDN'], correct: [0], explain: 'It rotates secrets on a schedule and updates the target.' },
    { kind: 'single', prompt: 'Who can read a given secret?', options: ['Only identities the IAM/secret policy allows', 'Anyone in the VPC', 'Only the root user', 'Anyone with the ARN'], correct: [0], explain: 'Access is governed by IAM and the resource policy, and audited.' },
    { kind: 'tapfix', prompt: 'Credentials are hard-coded and leaking. Tap where they should live instead.', tapTarget: 'secrets', explain: 'Secrets Manager stores and rotates them, gated by IAM.' },
  ],
};

const bill = {
  id: 'watch-the-bill', title: 'Watch the Bill', examDomain: 'Design Cost-Optimized Architectures',
  summary: 'See where the money goes, get an alarm before you overspend, and let a consultant flag the waste.',
  scenery: 'open',
  blocks: [
    C('workload', 'Your spend', 'compute', { pos: [-6, 0.7, 0] }, { name: 'The kitchen', prop: 'cook', pos: [-6, 0], yaw: 90 }, 'Everything running and costing money.', 'Your running resources accruing cost.'),
    C('explorer', 'Cost Explorer', 'edge', { pos: [-0.5, 0.7, -1.6] }, { name: 'The books', prop: 'dashboard', pos: [-0.5, -1.6], yaw: -90 }, 'Charts spend by service, tag and time.', 'AWS Cost Explorer; spend visualization.'),
    C('budget', 'AWS Budgets', 'security', { pos: [3.2, 0.7, -0.4] }, { name: 'The budget alarm', prop: 'tannoy', pos: [3.2, -0.4], yaw: -90 }, 'Goes off when spend crosses a line.', 'AWS Budgets; threshold/forecast alerts.'),
    C('advisor', 'Trusted Advisor', 'generic', { pos: [1, 0.7, 1.7] }, { name: 'The consultant', prop: 'securitydesk', pos: [1, 1.7], yaw: -90 }, 'Points out waste and savings.', 'Trusted Advisor; cost (and other) checks.'),
  ],
  connections: [
    { id: 'c_workload_explorer', from: 'workload', to: 'explorer', flow: 'data' },
    { id: 'c_explorer_budget', from: 'explorer', to: 'budget', flow: 'request' },
    { id: 'c_workload_advisor', from: 'workload', to: 'advisor', flow: 'data' },
  ],
  stages: [
    { title: 'See where the money goes', focus: 'explorer', anim: 'pulse', animConn: 'c_workload_explorer', narration: 'Cost Explorer charts your spend by service, tag and time — so you can find what’s actually costing you.', storyNarration: 'Open the books: a clear chart of what every station spent this month, not a shoebox of receipts.', concept: 'Cost Explorer gives spend visibility.', blocks: ['workload', 'explorer'], conns: ['c_workload_explorer'] },
    { title: 'Alarm before it hurts (Budgets)', focus: 'budget', anim: 'pulse', animConn: 'c_explorer_budget', narration: 'AWS Budgets alerts you when actual or forecast spend crosses a threshold you set.', storyNarration: 'Set a spending line; when the month’s costs head over it, the alarm sounds before payday, not after.', concept: 'Budgets alert on spend thresholds.', blocks: ['workload', 'explorer', 'budget'], conns: ['c_workload_explorer', 'c_explorer_budget'] },
    { title: 'Flag the waste (Trusted Advisor)', focus: 'advisor', anim: 'pulse', animConn: 'c_workload_advisor', narration: 'Trusted Advisor checks for idle and under-used resources and recommends right-sizing and savings.', storyNarration: 'A consultant walks the kitchen and points out the fridge left on overnight and the oven nobody uses.', concept: 'Trusted Advisor finds savings.', blocks: ['workload', 'explorer', 'advisor'], conns: ['c_workload_advisor'] },
    { title: 'Tag for attribution', focus: 'workload', narration: 'Cost allocation tags attribute spend to teams, projects or environments — so you know who owns what.', storyNarration: 'Label every order by which party it’s for, so you can split the bill fairly at the end of the night.', concept: 'Tags attribute cost to owners.', blocks: ['workload', 'explorer', 'budget', 'advisor'], conns: ['c_workload_explorer', 'c_explorer_budget', 'c_workload_advisor'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Visualize and break down your AWS spend over time. Use…', options: ['Cost Explorer', 'CloudWatch Logs', 'Route 53', 'EFS'], correct: [0], explain: 'Cost Explorer charts spend by service, tag and time.' },
    { kind: 'single', prompt: 'Be alerted before you blow your monthly spend. Use…', options: ['AWS Budgets', 'A bigger instance', 'A NAT gateway', 'Glacier'], correct: [0], explain: 'Budgets sends alerts on actual/forecast thresholds.' },
    { kind: 'single', prompt: 'Get automated recommendations to cut waste. Use…', options: ['Trusted Advisor', 'An SQS queue', 'A security group', 'CloudFront'], correct: [0], explain: 'Trusted Advisor flags idle/under-used resources and savings.' },
    { kind: 'single', prompt: 'Attribute spend to a specific team or project?', options: ['Cost allocation tags', 'A second region', 'A read replica', 'A bastion host'], correct: [0], explain: 'Tags let you slice and attribute costs by owner.' },
  ],
};

const aurora = {
  id: 'aurora-database', title: 'A Self-Healing Database', examDomain: 'Design High-Performing Architectures',
  summary: 'A cloud-native pantry that keeps six copies across three rooms, grows itself, and adds read counters on demand.',
  scenery: 'open',
  blocks: [
    C('app', 'App', 'compute', { pos: [-6, 0.7, 0] }, { name: 'The cook', prop: 'cook', pos: [-6, 0], yaw: 90 }, 'Reads and writes data.', 'Your application tier.'),
    C('primary', 'Aurora (writer)', 'database', { pos: [-0.5, 0.7, 0] }, { name: 'Main pantry', prop: 'pantry', pos: [-0.5, 0], yaw: -90 }, 'Handles writes; storage self-heals across AZs.', 'Aurora writer; MySQL/PostgreSQL-compatible, managed.', 'Cluster endpoint → writer (all writes)\nReader endpoint → replicas (reads)\nStorage self-heals: 6 copies / 3 AZs'),
    C('r1', 'Read replica', 'database', { pos: [3.2, 0.7, -1.7] }, { name: 'Reading counter', prop: 'pantry', pos: [3.2, -1.7], yaw: -90 }, 'Serves reads; can be promoted on failover.', 'An Aurora read replica.'),
    C('r2', 'Read replica', 'database', { pos: [3.6, 0.7, 1.7] }, { name: 'Reading counter', prop: 'pantry', pos: [3.6, 1.7], yaw: -90 }, 'Another reader for scale.', 'Another Aurora replica (up to 15).'),
  ],
  connections: [
    { id: 'c_app_primary', from: 'app', to: 'primary', flow: 'data' },
    { id: 'c_primary_r1', from: 'primary', to: 'r1', flow: 'replication' },
    { id: 'c_primary_r2', from: 'primary', to: 'r2', flow: 'replication' },
    { id: 'c_app_r1', from: 'app', to: 'r1', flow: 'data' },
  ],
  stages: [
    { title: 'A managed cloud database', focus: 'primary', anim: 'pulse', animConn: 'c_app_primary', narration: 'Aurora is a managed, MySQL/PostgreSQL-compatible database — you get the engine without running servers.', storyNarration: 'A pantry run for you: same familiar shelves as before, but someone else stocks, cleans and fixes it.', concept: 'Aurora = managed, compatible relational DB.', blocks: ['app', 'primary'], conns: ['c_app_primary'] },
    { title: 'Storage that heals itself', focus: 'primary', narration: 'Aurora keeps six copies of your data across three AZs and auto-grows storage — it survives disk and AZ failures transparently.', storyNarration: 'Every item is duplicated across three rooms, six copies in all; lose a room and nothing’s missing, and the shelves grow on their own.', concept: 'Durable, self-healing, auto-scaling storage.', blocks: ['app', 'primary'], conns: ['c_app_primary'] },
    { title: 'Scale reads with replicas', focus: 'r1', anim: 'chain', chain: ['c_primary_r1', 'c_app_r1'], narration: 'Add up to 15 low-latency read replicas to spread read load; one is promoted automatically if the writer fails.', storyNarration: 'Open extra reading counters off the same stock for the queue of lookups — and if the main pantry falls over, a counter takes over.', concept: 'Read replicas scale reads and provide failover.', blocks: ['app', 'primary', 'r1', 'r2'], conns: ['c_app_primary', 'c_primary_r1', 'c_primary_r2', 'c_app_r1'] },
    { title: 'Go serverless if spiky', focus: 'primary', anim: 'spike', narration: 'Aurora Serverless auto-scales database capacity up and down with demand — good for variable or unpredictable load.', storyNarration: 'On an unpredictable night, the pantry quietly grows and shrinks its staff to match the rush, then stands down.', concept: 'Aurora Serverless scales capacity to load.', blocks: ['app', 'primary', 'r1', 'r2'], conns: ['c_app_primary', 'c_primary_r1', 'c_primary_r2', 'c_app_r1'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Amazon Aurora is compatible with…', options: ['MySQL and PostgreSQL', 'Only DynamoDB', 'Redis', 'S3'], correct: [0], explain: 'Aurora offers MySQL- and PostgreSQL-compatible editions.' },
    { kind: 'single', prompt: 'How does Aurora protect your data?', options: ['6 copies across 3 AZs, self-healing storage', 'A single disk', 'Backups only, no redundancy', 'It does not'], correct: [0], explain: 'Aurora’s storage layer replicates 6 ways across 3 AZs.' },
    { kind: 'single', prompt: 'Read traffic is overwhelming the database. Add…', options: ['Aurora read replicas', 'A NAT gateway', 'A bigger EBS volume', 'An SNS topic'], correct: [0], explain: 'Replicas spread read load (and provide failover targets).' },
    { kind: 'single', prompt: 'Unpredictable, spiky database load. Consider…', options: ['Aurora Serverless (auto-scaling capacity)', 'A fixed tiny instance', 'Glacier', 'A static website'], correct: [0], explain: 'Aurora Serverless scales capacity with demand.' },
  ],
};

const networks = {
  id: 'connect-networks', title: 'Connect Your Networks', examDomain: 'Design Secure Architectures',
  summary: 'Separate buildings stay private — link two with a corridor, or wire many to one central hub.',
  scenery: 'open',
  blocks: [
    C('vpcA', 'VPC A', 'compute', { pos: [-6, 0.7, -1.7] }, { name: 'Kitchen A', prop: 'cook', pos: [-6, -1.7], yaw: -90 }, 'A private network and its resources.', 'A VPC.'),
    C('vpcB', 'VPC B', 'compute', { pos: [-6, 0.7, 1.7] }, { name: 'Kitchen B', prop: 'cook', pos: [-6, 1.7], yaw: -90 }, 'Another private network.', 'Another VPC.'),
    C('tgw', 'Transit Gateway', 'networking', { pos: [-0.5, 0.7, 0] }, { name: 'The hub', prop: 'hub', pos: [-0.5, 0], yaw: 0 }, 'A central hub every network plugs into.', 'AWS Transit Gateway; hub-and-spoke for many VPCs.'),
    C('vpcC', 'VPC C', 'compute', { pos: [4, 0.7, 0] }, { name: 'Kitchen C', prop: 'cook', pos: [4, 0], yaw: -90 }, 'A third network on the hub.', 'A third VPC.'),
  ],
  connections: [
    { id: 'c_a_b', from: 'vpcA', to: 'vpcB', flow: 'network' },
    { id: 'c_a_tgw', from: 'vpcA', to: 'tgw', flow: 'network' },
    { id: 'c_b_tgw', from: 'vpcB', to: 'tgw', flow: 'network' },
    { id: 'c_c_tgw', from: 'vpcC', to: 'tgw', flow: 'network' },
  ],
  stages: [
    { title: 'Private by default', focus: 'vpcA', narration: 'By default, separate VPCs can’t reach each other — that isolation is a security feature.', storyNarration: 'Each kitchen is its own locked building; nobody wanders between them by accident.', concept: 'VPCs are isolated from each other by default.', blocks: ['vpcA', 'vpcB'], conns: [] },
    { title: 'A private link (peering)', focus: 'vpcB', anim: 'pulse', animConn: 'c_a_b', narration: 'VPC peering connects two VPCs privately, over the AWS network — no internet, no gateway.', storyNarration: 'Cut a private corridor between two buildings so staff pass directly, never stepping onto the street.', concept: 'Peering = a private 1:1 link between two VPCs.', blocks: ['vpcA', 'vpcB'], conns: ['c_a_b'] },
    { title: 'Many networks? Use a hub', focus: 'tgw', anim: 'pulse', animConn: 'c_a_tgw', narration: 'Peering every VPC to every other doesn’t scale. A Transit Gateway is one hub that all VPCs attach to.', storyNarration: 'Don’t dig a corridor between every pair of buildings — build one central hub they all connect into.', concept: 'Transit Gateway = hub-and-spoke for many VPCs.', blocks: ['vpcA', 'vpcB', 'tgw', 'vpcC'], conns: ['c_a_tgw', 'c_b_tgw', 'c_c_tgw'] },
    { title: 'Private and controlled', focus: 'tgw', narration: 'All this traffic stays on AWS’s private network; route tables decide exactly who can reach whom.', storyNarration: 'Every corridor is staff-only and signposted: each building reaches just the rooms its passes allow.', concept: 'Connectivity stays private and route-controlled.', blocks: ['vpcA', 'vpcB', 'tgw', 'vpcC'], conns: ['c_a_tgw', 'c_b_tgw', 'c_c_tgw'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Two VPCs by default can…', options: ['Not reach each other (isolated)', 'Always reach each other', 'Only talk via the internet', 'Share one subnet'], correct: [0], explain: 'VPCs are isolated until you connect them.' },
    { kind: 'single', prompt: 'Privately connect exactly two VPCs?', options: ['VPC peering', 'A public IP each', 'An SQS queue', 'A NAT gateway'], correct: [0], explain: 'Peering is a private 1:1 link between two VPCs.' },
    { kind: 'single', prompt: 'Connect dozens of VPCs without a mesh of links?', options: ['Transit Gateway (hub-and-spoke)', 'Peer them all pairwise', 'Give each a public IP', 'One big subnet'], correct: [0], explain: 'A Transit Gateway is a central hub for many VPCs.' },
    { kind: 'single', prompt: 'VPC peering is…', options: ['Private, non-transitive (A–B doesn’t link A–C)', 'Transitive by default', 'Over the public internet', 'A DNS feature'], correct: [0], explain: 'Peering isn’t transitive; that’s a reason to use TGW at scale.' },
  ],
};

const stateless = {
  id: 'keep-it-stateless', title: 'Keep Servers Stateless', examDomain: 'Design Resilient Architectures',
  summary: 'Don’t keep the order in one cook’s head — put it on the rail so any cook can pick it up.',
  scenery: 'open',
  blocks: [
    C('user', 'User', 'generic', { pos: [-7.5, 0.7, 0] }, { name: 'Customer', prop: 'customer', pos: [-7.5, 0], yaw: 90 }, 'A returning user with a session.', 'A client with session state.'),
    C('lb', 'Load balancer', 'networking', { pos: [-3, 0.7, 0] }, { name: 'The pass', prop: 'pass', pos: [-3, 0], yaw: -90 }, 'Sends each request to any server.', 'An ALB spreading requests.'),
    C('srvA', 'Server A', 'compute', { pos: [1, 0.7, -1.6] }, { name: 'Cook A', prop: 'cook', pos: [1, -1.6], yaw: -90 }, 'One interchangeable server.', 'A stateless app instance.'),
    C('srvB', 'Server B', 'compute', { pos: [1.4, 0.7, 1.6] }, { name: 'Cook B', prop: 'cook', pos: [1.4, 1.6], yaw: -90 }, 'Another interchangeable server.', 'Another instance.'),
    C('store', 'Session store', 'database', { pos: [4.5, 0.7, 0] }, { name: 'Shared locker', prop: 'coldroom', pos: [4.5, 0], yaw: -90 }, 'Holds session/state outside the servers.', 'DynamoDB / ElastiCache for sessions.'),
  ],
  connections: [
    { id: 'c_user_lb', from: 'user', to: 'lb', flow: 'request' },
    { id: 'c_lb_a', from: 'lb', to: 'srvA', flow: 'request' },
    { id: 'c_lb_b', from: 'lb', to: 'srvB', flow: 'request' },
    { id: 'c_a_store', from: 'srvA', to: 'store', flow: 'data' },
    { id: 'c_b_store', from: 'srvB', to: 'store', flow: 'data' },
  ],
  stages: [
    { title: 'State stuck in one server', focus: 'srvA', anim: 'overload', animConn: 'c_lb_a', narration: 'If a server keeps your session in its own memory, losing that server logs you out — and you must keep coming back to it.', storyNarration: 'If only one cook remembers your order, you’re stuck with that cook — and if they walk off, the order’s gone.', concept: 'In-memory state makes servers fragile and sticky.', blocks: ['user', 'lb', 'srvA'], conns: ['c_user_lb', 'c_lb_a'] },
    { title: 'Put state in a shared store', focus: 'store', anim: 'pulse', animConn: 'c_a_store', narration: 'Externalize session/state to a shared store like DynamoDB or ElastiCache.', storyNarration: 'Write every order on the rail and in a shared locker, not in any one cook’s memory.', concept: 'Externalize state to a shared store.', blocks: ['user', 'lb', 'srvA', 'store'], conns: ['c_user_lb', 'c_lb_a', 'c_a_store'] },
    { title: 'Any server can serve you', focus: 'lb', anim: 'pulse', animConn: 'c_lb_b', narration: 'With state outside, any server can handle any request — the load balancer spreads freely, no stickiness.', storyNarration: 'Now any cook reads the locker and finishes your dish; the pass hands the ticket to whoever’s free.', concept: 'Stateless servers = free load balancing.', blocks: ['user', 'lb', 'srvA', 'srvB', 'store'], conns: ['c_user_lb', 'c_lb_a', 'c_lb_b', 'c_a_store', 'c_b_store'] },
    { title: 'Scale and recover freely', focus: 'srvB', anim: 'spike', narration: 'Add, remove or lose a server with no user impact — the state lives elsewhere.', storyNarration: 'Call in extra cooks for the rush and send them home after; nobody’s order is lost when a cook clocks out.', concept: 'Statelessness enables elastic scaling and recovery.', blocks: ['user', 'lb', 'srvA', 'srvB', 'store'], conns: ['c_user_lb', 'c_lb_a', 'c_lb_b', 'c_a_store', 'c_b_store'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Why is keeping session state in a server’s memory a problem?', options: ['Losing the server loses the session; it forces sticky routing', 'It’s faster', 'It improves security', 'It scales better'], correct: [0], explain: 'In-memory state is fragile and ties users to one server.' },
    { kind: 'single', prompt: 'Where should shared session state live?', options: ['An external store like DynamoDB or ElastiCache', 'Each server’s RAM', 'The load balancer', 'An EBS root volume'], correct: [0], explain: 'Externalizing state makes servers interchangeable.' },
    { kind: 'single', prompt: 'A benefit of stateless servers?', options: ['Any server handles any request; easy scaling/recovery', 'No need for a database', 'No need for IAM', 'Lower latency always'], correct: [0], explain: 'Statelessness enables free load balancing and elasticity.' },
    { kind: 'tapfix', prompt: 'Users get logged out whenever an instance is replaced. Tap where session state should move.', tapTarget: 'store', explain: 'Move session state to a shared external store so servers stay stateless.' },
  ],
};

const events = {
  id: 'route-events-eventbridge', title: 'Route Events', examDomain: 'Design Resilient Architectures',
  summary: 'A smart noticeboard that reads each event and sends it, by rule, to exactly the right handler.',
  scenery: 'open',
  blocks: [
    C('source', 'Event source', 'compute', { pos: [-6, 0.7, 0] }, { name: 'The line', prop: 'cook', pos: [-6, 0], yaw: 90 }, 'Emits events (“order placed”, “refund”).', 'A producer / AWS service event.'),
    C('bus', 'EventBridge', 'generic', { pos: [-1, 0.7, 0] }, { name: 'The router', prop: 'hub', pos: [-1, 0], yaw: 0 }, 'Matches each event to a rule and routes it.', 'Amazon EventBridge; content-based event bus.', '{ "source": ["orders"],\n  "detail-type": ["OrderPlaced"] }\nmatches → Lambda · SQS · Step Functions'),
    C('h1', 'Orders handler', 'compute', { pos: [3, 0.7, -1.6] }, { name: 'Orders cook', prop: 'cook', pos: [3, -1.6], yaw: -90 }, 'Handles order events.', 'A target (Lambda/queue) for one rule.'),
    C('h2', 'Audit handler', 'compute', { pos: [3.5, 0.7, 1.6] }, { name: 'Audit cook', prop: 'cook', pos: [3.5, 1.6], yaw: -90 }, 'Handles audit/other events.', 'A target for a different rule.'),
  ],
  connections: [
    { id: 'c_src_bus', from: 'source', to: 'bus', flow: 'request' },
    { id: 'c_bus_h1', from: 'bus', to: 'h1', flow: 'data' },
    { id: 'c_bus_h2', from: 'bus', to: 'h2', flow: 'data' },
  ],
  stages: [
    { title: 'Many events, many handlers', focus: 'bus', anim: 'pulse', animConn: 'c_src_bus', narration: 'Different event types should go to different places — orders to one service, audit to another.', storyNarration: 'Tickets of all kinds arrive; each should reach exactly the right station, not everyone.', concept: 'Events need routing by type/content.', blocks: ['source', 'bus'], conns: ['c_src_bus'] },
    { title: 'Rules route each event', focus: 'bus', anim: 'pulse', animConn: 'c_bus_h1', narration: 'EventBridge matches each event against rules and delivers it to the matching targets.', storyNarration: 'The router reads each ticket and clips it to the right rail by its rules — orders here, audits there.', concept: 'EventBridge = rule/content-based routing.', blocks: ['source', 'bus', 'h1', 'h2'], conns: ['c_src_bus', 'c_bus_h1', 'c_bus_h2'] },
    { title: 'Producers don’t know consumers', focus: 'h2', anim: 'pulse', animConn: 'c_bus_h2', narration: 'Add a new rule and target without touching the producer — fully decoupled, event-driven.', storyNarration: 'Open a new station and add a routing rule; the line that raised the ticket never has to know.', concept: 'Event-driven decoupling via the bus.', blocks: ['source', 'bus', 'h1', 'h2'], conns: ['c_src_bus', 'c_bus_h1', 'c_bus_h2'] },
    { title: 'EventBridge vs SNS', focus: 'bus', narration: 'SNS fans one message to all subscribers; EventBridge routes by content from many AWS sources to chosen targets.', storyNarration: 'A tannoy shouts to everyone; the router reads each ticket and sends it only where it belongs.', concept: 'EventBridge routes by content; SNS broadcasts.', blocks: ['source', 'bus', 'h1', 'h2'], conns: ['c_src_bus', 'c_bus_h1', 'c_bus_h2'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Route events to different targets based on their content?', options: ['Amazon EventBridge', 'A single SQS queue', 'An EBS volume', 'Route 53'], correct: [0], explain: 'EventBridge matches events to rules and routes accordingly.' },
    { kind: 'single', prompt: 'Add a new consumer for an event type. With EventBridge you…', options: ['Add a rule + target; the producer is untouched', 'Edit the producer’s code', 'Restart the source', 'Create a new VPC'], correct: [0], explain: 'Producers and consumers are decoupled by the bus.' },
    { kind: 'single', prompt: 'EventBridge differs from SNS in that it…', options: ['Routes by content/rules from many sources', 'Only stores files', 'Is a DNS service', 'Cannot have multiple targets'], correct: [0], explain: 'SNS = broadcast pub/sub; EventBridge = content-based routing.' },
    { kind: 'single', prompt: 'EventBridge is best described as…', options: ['A serverless event bus', 'A relational database', 'A CDN', 'A block storage volume'], correct: [0], explain: 'It’s a managed, serverless event bus with routing rules.' },
  ],
};

const kinesis = {
  id: 'stream-data-kinesis', title: 'Stream Real-Time Data', examDomain: 'Design High-Performing Architectures',
  summary: 'A conveyor of records flowing past in real time, that several apps can read at once.',
  scenery: 'open',
  blocks: [
    C('producers', 'Producers', 'generic', { pos: [-7, 0.7, 0] }, { name: 'The sources', prop: 'customer', pos: [-7, 0], yaw: 90 }, 'Devices/apps emitting a high-volume feed.', 'Producers writing records (clicks, logs, telemetry).'),
    C('stream', 'Kinesis stream', 'edge', { pos: [-1.5, 0.7, 0] }, { name: 'The conveyor', prop: 'ticketrail', pos: [-1.5, 0], yaw: 0 }, 'An ordered, real-time stream of records.', 'A Kinesis Data Stream; ordered, replayable.', 'PutRecord(partitionKey, data)\nShard = 1MB/s in · 2MB/s out\nRetention 24h–365d → replayable'),
    C('rt', 'Real-time app', 'compute', { pos: [3, 0.7, -1.6] }, { name: 'Live cook', prop: 'cook', pos: [3, -1.6], yaw: -90 }, 'Processes records as they arrive.', 'A real-time consumer.'),
    C('an', 'Analytics', 'compute', { pos: [3.5, 0.7, 1.6] }, { name: 'Analytics cook', prop: 'cook', pos: [3.5, 1.6], yaw: -90 }, 'Reads the same stream for analysis.', 'A second, independent consumer.'),
  ],
  connections: [
    { id: 'c_prod_stream', from: 'producers', to: 'stream', flow: 'data' },
    { id: 'c_stream_rt', from: 'stream', to: 'rt', flow: 'data' },
    { id: 'c_stream_an', from: 'stream', to: 'an', flow: 'data' },
  ],
  stages: [
    { title: 'A firehose of records', focus: 'stream', anim: 'overload', animConn: 'c_prod_stream', narration: 'Clicks, logs and telemetry arrive continuously and fast — far too much to handle one request at a time.', storyNarration: 'Orders pour in nonstop on a conveyor belt — there’s no pausing to deal with them one by one.', concept: 'Some workloads are continuous high-volume streams.', blocks: ['producers', 'stream'], conns: ['c_prod_stream'] },
    { title: 'Put it on a stream (Kinesis)', focus: 'stream', anim: 'pulse', animConn: 'c_prod_stream', narration: 'Kinesis ingests the ordered stream of records in real time and holds them for a retention window.', storyNarration: 'Run everything onto one ordered conveyor that keeps moving and remembers the last while of tickets.', concept: 'Kinesis = ordered, real-time, replayable stream.', blocks: ['producers', 'stream'], conns: ['c_prod_stream'] },
    { title: 'Many consumers, one stream', focus: 'rt', anim: 'pulse', animConn: 'c_stream_rt', narration: 'Multiple applications read the same stream independently — a real-time app and an analytics job at once.', storyNarration: 'Different stations watch the same belt at the same time, each taking what it needs.', concept: 'Multiple independent consumers per stream.', blocks: ['producers', 'stream', 'rt', 'an'], conns: ['c_prod_stream', 'c_stream_rt', 'c_stream_an'] },
    { title: 'Stream vs queue', focus: 'stream', narration: 'A queue removes a message once it’s processed; a stream keeps an ordered log many consumers can replay.', storyNarration: 'A ticket rail clears each ticket as it’s cooked; the conveyor keeps the ordered record so anyone can re-watch it.', concept: 'Stream = replayable ordered log (vs a queue).', blocks: ['producers', 'stream', 'rt', 'an'], conns: ['c_prod_stream', 'c_stream_rt', 'c_stream_an'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Ingest a high-volume, real-time feed (clicks/logs/telemetry)?', options: ['Amazon Kinesis', 'A single RDS instance', 'S3 Glacier', 'A NAT gateway'], correct: [0], explain: 'Kinesis ingests ordered, real-time streams at scale.' },
    { kind: 'single', prompt: 'How many apps can read one Kinesis stream?', options: ['Many, independently and in parallel', 'Only one', 'None — it’s write-only', 'Only Lambda'], correct: [0], explain: 'Multiple consumers read the same stream independently.' },
    { kind: 'single', prompt: 'A stream differs from an SQS queue because it…', options: ['Keeps an ordered, replayable log', 'Deletes data faster', 'Can’t scale', 'Is for files'], correct: [0], explain: 'Streams retain ordered records consumers can replay; queues remove on consume.' },
    { kind: 'single', prompt: 'Good use case for Kinesis?', options: ['Clickstream / log / IoT real-time processing', 'Storing static images', 'A relational join', 'DNS routing'], correct: [0], explain: 'Real-time, high-throughput event/data streams suit Kinesis.' },
  ],
};

const storageclass = {
  id: 'right-storage-class', title: 'Right Storage Class', examDomain: 'Design Cost-Optimized Architectures',
  summary: 'Hot stock on the front shelf, cold stock in the deep freeze, and a rule that moves it as it ages.',
  scenery: 'open',
  blocks: [
    C('user', 'Access', 'generic', { pos: [-7, 0.7, 0] }, { name: 'Customer', prop: 'customer', pos: [-7, 0], yaw: 90 }, 'How often the data is read.', 'Object access pattern.'),
    C('standard', 'S3 Standard', 'storage', { pos: [-1.5, 0.7, -1.4] }, { name: 'Front shelf', prop: 'larder', pos: [-1.5, -1.4], yaw: -90 }, 'Frequently-accessed data; instant, priciest per GB.', 'S3 Standard (or Standard-IA for less-frequent).'),
    C('glacier', 'S3 Glacier', 'storage', { pos: [2.5, 0.7, -1.4] }, { name: 'Deep freeze', prop: 'coldroom', pos: [2.5, -1.4], yaw: -90 }, 'Rarely-accessed archives; very cheap, slower to fetch.', 'S3 Glacier / Deep Archive.', 'Lifecycle: STANDARD →30d→ GLACIER\n→90d→ DEEP_ARCHIVE\nRetrieval: minutes to 12h'),
    C('smart', 'Intelligent-Tiering', 'edge', { pos: [0.5, 0.7, 1.6] }, { name: 'Auto-sorter', prop: 'grabandgo', pos: [0.5, 1.6], yaw: -90 }, 'Moves objects between tiers by actual access.', 'S3 Intelligent-Tiering.'),
  ],
  connections: [
    { id: 'c_user_standard', from: 'user', to: 'standard', flow: 'request' },
    { id: 'c_standard_glacier', from: 'standard', to: 'glacier', flow: 'data' },
    { id: 'c_user_smart', from: 'user', to: 'smart', flow: 'request' },
  ],
  stages: [
    { title: 'Hot data, front shelf', focus: 'standard', anim: 'pulse', animConn: 'c_user_standard', narration: 'Frequently-read objects belong in S3 Standard — instant access, but the priciest per GB.', storyNarration: 'The dishes you serve all night sit on the front shelf, within arm’s reach.', concept: 'Standard for frequently-accessed data.', blocks: ['user', 'standard'], conns: ['c_user_standard'] },
    { title: 'Cold data, deep freeze', focus: 'glacier', anim: 'pulse', animConn: 'c_standard_glacier', narration: 'Rarely-accessed archives go to Glacier / Deep Archive — a fraction of the cost, retrieved in minutes to hours.', storyNarration: 'Stock you almost never touch goes to the deep freeze in the back — pennies to keep, just slower to fetch.', concept: 'Glacier for cold/archival data.', blocks: ['user', 'standard', 'glacier'], conns: ['c_user_standard', 'c_standard_glacier'] },
    { title: 'Let a rule move it', focus: 'glacier', anim: 'pulse', animConn: 'c_standard_glacier', narration: 'A lifecycle rule automatically transitions objects to colder, cheaper classes as they age.', storyNarration: 'Set a standing rule: anything untouched for a month gets carried to the freeze without anyone deciding.', concept: 'Lifecycle rules automate transitions.', blocks: ['user', 'standard', 'glacier'], conns: ['c_user_standard', 'c_standard_glacier'] },
    { title: 'Unsure? Intelligent-Tiering', focus: 'smart', anim: 'pulse', animConn: 'c_user_smart', narration: 'If access is unpredictable, S3 Intelligent-Tiering moves each object between tiers automatically — no guessing.', storyNarration: 'Can’t predict what’ll be popular? An auto-sorter quietly shelves each item where it belongs by how often it’s grabbed.', concept: 'Intelligent-Tiering auto-optimizes cost.', blocks: ['user', 'standard', 'glacier', 'smart'], conns: ['c_user_standard', 'c_standard_glacier', 'c_user_smart'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Frequently-accessed objects should use…', options: ['S3 Standard', 'Glacier Deep Archive', 'An EBS volume', 'EFS'], correct: [0], explain: 'Standard gives instant access for hot data.' },
    { kind: 'single', prompt: 'Cheapest class for rarely-accessed archives?', options: ['S3 Glacier / Deep Archive', 'S3 Standard', 'A read replica', 'DynamoDB'], correct: [0], explain: 'Glacier classes cost the least for cold data.' },
    { kind: 'single', prompt: 'Move objects to colder classes automatically as they age?', options: ['A lifecycle rule', 'A NAT gateway', 'A security group', 'Route 53'], correct: [0], explain: 'Lifecycle rules transition objects on a schedule.' },
    { kind: 'single', prompt: 'Access patterns are unknown/changing. Use…', options: ['S3 Intelligent-Tiering', 'Always Standard', 'Always Glacier', 'EFS'], correct: [0], explain: 'Intelligent-Tiering auto-moves objects between tiers.' },
  ],
};

const compute = {
  id: 'choose-compute', title: 'Choose Your Compute', examDomain: 'Design Cost-Optimized Architectures',
  summary: 'Full-time cooks, on-call cooks who appear per order, or pre-packed kit stations — match it to the work.',
  scenery: 'open',
  blocks: [
    C('work', 'The work', 'generic', { pos: [-6.5, 0.7, 0] }, { name: 'The orders', prop: 'ticketrail', pos: [-6.5, 0], yaw: 0 }, 'The workload to run.', 'Your workload.'),
    C('ec2', 'EC2', 'compute', { pos: [-1, 0.7, -1.7] }, { name: 'Full-time cook', prop: 'cook', pos: [-1, -1.7], yaw: -90 }, 'A server you control and run by the hour.', 'EC2; full OS control, pay per running hour.', 't3.micro · Amazon Linux 2023\nOn-Demand $/hr · Savings Plan -72%\nSpot -90% (can be interrupted)'),
    C('lambda', 'Lambda', 'compute', { pos: [1.5, 0.7, 0] }, { name: 'On-call cook', prop: 'cook', pos: [1.5, 0], yaw: -90 }, 'Runs per event; no servers; pay per use.', 'Lambda; serverless functions.'),
    C('cont', 'Containers', 'edge', { pos: [3.8, 0.7, 1.7] }, { name: 'Kit station', prop: 'crate', pos: [3.8, 1.7], yaw: 0 }, 'Portable packaged units (ECS/Fargate).', 'Containers on ECS/Fargate.'),
  ],
  connections: [
    { id: 'c_work_ec2', from: 'work', to: 'ec2', flow: 'request' },
    { id: 'c_work_lambda', from: 'work', to: 'lambda', flow: 'request' },
    { id: 'c_work_cont', from: 'work', to: 'cont', flow: 'request' },
  ],
  stages: [
    { title: 'Run your own servers (EC2)', focus: 'ec2', anim: 'pulse', animConn: 'c_work_ec2', narration: 'EC2 gives full control of the OS and instance — best for steady, heavy or special workloads. You manage and pay per hour.', storyNarration: 'Hire full-time cooks: total control of the kitchen, but you pay them for every hour on shift.', concept: 'EC2 = full control, you manage, per-hour.', blocks: ['work', 'ec2'], conns: ['c_work_ec2'] },
    { title: 'Just run code (Lambda)', focus: 'lambda', anim: 'spike', narration: 'Lambda runs code per event with no servers to manage; pay per execution. Great for spiky or glue work.', storyNarration: 'On-call cooks appear when a ticket lands, cook it, and clock out — you pay only per dish.', concept: 'Lambda = serverless, per-use, no servers.', blocks: ['work', 'ec2', 'lambda'], conns: ['c_work_ec2', 'c_work_lambda'] },
    { title: 'Package it (containers)', focus: 'cont', anim: 'pulse', animConn: 'c_work_cont', narration: 'Containers give consistent, portable units; run them on ECS/Fargate (serverless containers, no hosts to manage).', storyNarration: 'Pre-pack identical kit stations you can stamp out anywhere — and with Fargate, you don’t staff the building.', concept: 'Containers = portable; Fargate = no hosts.', blocks: ['work', 'ec2', 'lambda', 'cont'], conns: ['c_work_ec2', 'c_work_lambda', 'c_work_cont'] },
    { title: 'Match compute to the work', focus: 'work', narration: 'Steady/heavy or needs OS control → EC2; spiky/event-driven → Lambda; portable services at scale → containers.', storyNarration: 'A packed restaurant every night → full-time cooks; the odd surprise order → on-call; many identical outlets → kit stations.', concept: 'Pick compute by workload shape and ops appetite.', blocks: ['work', 'ec2', 'lambda', 'cont'], conns: ['c_work_ec2', 'c_work_lambda', 'c_work_cont'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'You need full control of the operating system. Choose…', options: ['EC2', 'Lambda', 'S3', 'Route 53'], correct: [0], explain: 'EC2 gives OS-level control of the instance.' },
    { kind: 'single', prompt: 'Spiky, event-driven work with no servers to manage?', options: ['Lambda', 'A fleet of always-on EC2', 'Glacier', 'A NAT gateway'], correct: [0], explain: 'Lambda is serverless and event-driven; pay per use.' },
    { kind: 'single', prompt: 'Portable, consistent units you can run many of?', options: ['Containers (ECS/Fargate)', 'A single EBS volume', 'An SNS topic', 'A hosted zone'], correct: [0], explain: 'Containers package the app to run identically anywhere.' },
    { kind: 'single', prompt: 'Run containers without managing servers/clusters?', options: ['AWS Fargate', 'Self-managed EC2 only', 'Glacier', 'A bastion host'], correct: [0], explain: 'Fargate runs containers serverlessly.' },
  ],
};

const hybrid = {
  id: 'hybrid-connectivity', title: 'Link to On-Premises', examDomain: 'Design Secure Architectures',
  summary: 'Wire your old kitchen to the cloud one — an armored van over public roads, or a private dedicated cable.',
  scenery: 'open',
  blocks: [
    C('onprem', 'Your datacenter', 'compute', { pos: [-6.5, 0.7, 0] }, { name: 'Old kitchen', prop: 'cook', pos: [-6.5, 0], yaw: 90 }, 'Servers you still run on-premises.', 'Your on-prem datacenter.'),
    C('vpn', 'Site-to-Site VPN', 'networking', { pos: [-0.5, 0.7, -1.6] }, { name: 'Encrypted tunnel', prop: 'servicedoor', pos: [-0.5, -1.6], yaw: -90 }, 'An encrypted tunnel over the public internet.', 'Site-to-Site VPN; encrypted, over the internet.'),
    C('dx', 'Direct Connect', 'networking', { pos: [-0.5, 0.7, 1.6] }, { name: 'Private cable', prop: 'guardpost', pos: [-0.5, 1.6], yaw: -90 }, 'A dedicated private physical link, not the internet.', 'AWS Direct Connect; private, consistent, high-bandwidth.'),
    C('aws', 'AWS VPC', 'compute', { pos: [4, 0.7, 0] }, { name: 'Cloud kitchen', prop: 'cook', pos: [4, 0], yaw: -90 }, 'Your VPC in the cloud.', 'Your AWS VPC.'),
  ],
  connections: [
    { id: 'c_op_vpn', from: 'onprem', to: 'vpn', flow: 'network' },
    { id: 'c_vpn_aws', from: 'vpn', to: 'aws', flow: 'network' },
    { id: 'c_op_dx', from: 'onprem', to: 'dx', flow: 'network' },
    { id: 'c_dx_aws', from: 'dx', to: 'aws', flow: 'network' },
  ],
  stages: [
    { title: 'Two kitchens, one operation', focus: 'onprem', narration: 'You still run an on-prem datacenter and want it to reach AWS privately — a hybrid setup.', storyNarration: 'You keep the old kitchen running while the new cloud one opens; they need a private way to pass stock.', concept: 'Hybrid = on-prem connected privately to AWS.', blocks: ['onprem', 'aws'], conns: [] },
    { title: 'An encrypted tunnel (VPN)', focus: 'vpn', anim: 'chain', chain: ['c_op_vpn', 'c_vpn_aws'], narration: 'Site-to-Site VPN runs an encrypted tunnel over the public internet — quick to set up and cheap.', storyNarration: 'Send stock in an armored van over the public roads: encrypted and private, but sharing the traffic.', concept: 'VPN = encrypted tunnel over the internet.', blocks: ['onprem', 'vpn', 'aws'], conns: ['c_op_vpn', 'c_vpn_aws'] },
    { title: 'A dedicated private cable (Direct Connect)', focus: 'dx', anim: 'chain', chain: ['c_op_dx', 'c_dx_aws'], narration: 'Direct Connect is a private physical link — consistent low latency and high bandwidth, not over the internet.', storyNarration: 'Lay your own private delivery tunnel between the kitchens: steady, fast, and no public traffic at all.', concept: 'Direct Connect = dedicated private link.', blocks: ['onprem', 'dx', 'aws'], conns: ['c_op_dx', 'c_dx_aws'] },
    { title: 'Pick by need', focus: 'aws', narration: 'VPN for quick, cheap, encrypted links; Direct Connect for steady high-bandwidth, low-latency needs (often with a VPN as backup).', storyNarration: 'The van for now and for backup; the private tunnel when you move stock constantly and can’t wait on traffic.', concept: 'VPN (quick/cheap) vs Direct Connect (steady/fast).', blocks: ['onprem', 'vpn', 'dx', 'aws'], conns: ['c_op_vpn', 'c_vpn_aws', 'c_op_dx', 'c_dx_aws'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'A quick, encrypted link from on-prem to AWS over the internet?', options: ['Site-to-Site VPN', 'Direct Connect', 'An internet gateway', 'A NAT gateway'], correct: [0], explain: 'VPN gives an encrypted tunnel over the public internet.' },
    { kind: 'single', prompt: 'Consistent low latency + high bandwidth, not over the internet?', options: ['AWS Direct Connect', 'A VPN only', 'A public IP', 'CloudFront'], correct: [0], explain: 'Direct Connect is a dedicated private physical link.' },
    { kind: 'single', prompt: '“Hybrid” architecture means…', options: ['On-prem and cloud working together', 'Two AWS regions only', 'Two AZs', 'Two instance sizes'], correct: [0], explain: 'Hybrid connects on-premises with AWS.' },
    { kind: 'single', prompt: 'A common resilient pattern is…', options: ['Direct Connect with a VPN as backup', 'Two VPNs to the same endpoint', 'No redundancy', 'Public internet only'], correct: [0], explain: 'VPN often backs up Direct Connect for resilience.' },
  ],
};

const threats = {
  id: 'detect-threats', title: 'Detect Threats', examDomain: 'Design Secure Architectures',
  summary: 'A camera watching for intruders, a scanner finding unlocked doors, and a clerk flagging sensitive papers.',
  scenery: 'open',
  blocks: [
    C('account', 'Your account', 'compute', { pos: [-6, 0.7, 0] }, { name: 'The kitchen', prop: 'cook', pos: [-6, 0], yaw: 90 }, 'The activity and data to protect.', 'Your account’s logs, workloads and data.'),
    C('guardduty', 'GuardDuty', 'security', { pos: [-0.5, 0.7, -1.6] }, { name: 'Security camera', prop: 'cctv', pos: [-0.5, -1.6], yaw: -90 }, 'Watches logs for malicious activity.', 'GuardDuty; threat detection from VPC/DNS/CloudTrail logs.'),
    C('findings', 'Findings', 'security', { pos: [3.2, 0.7, 0] }, { name: 'Alerts board', prop: 'dashboard', pos: [3.2, 0], yaw: -90 }, 'Suspicious activity surfaced for action.', 'Findings you alert/respond to.'),
    C('macie', 'Macie', 'security', { pos: [0.5, 0.7, 1.7] }, { name: 'Sensitive-data clerk', prop: 'securitydesk', pos: [0.5, 1.7], yaw: -90 }, 'Flags sensitive data (PII) left exposed.', 'Amazon Macie; sensitive-data discovery in S3.'),
  ],
  connections: [
    { id: 'c_acc_gd', from: 'account', to: 'guardduty', flow: 'data' },
    { id: 'c_gd_find', from: 'guardduty', to: 'findings', flow: 'request' },
    { id: 'c_acc_macie', from: 'account', to: 'macie', flow: 'data' },
  ],
  stages: [
    { title: 'Spot the intruder (GuardDuty)', focus: 'guardduty', anim: 'pulse', animConn: 'c_acc_gd', narration: 'GuardDuty continuously watches your logs (VPC, DNS, CloudTrail) for malicious or unusual activity.', storyNarration: 'A camera quietly watches the doors and tills all night for anyone who shouldn’t be there.', concept: 'GuardDuty = threat detection from your logs.', blocks: ['account', 'guardduty'], conns: ['c_acc_gd'] },
    { title: 'Raise findings', focus: 'findings', anim: 'pulse', animConn: 'c_gd_find', narration: 'Detected threats become findings you can alert on and respond to automatically.', storyNarration: 'Anything suspicious lights up on the board so the manager acts at once.', concept: 'Findings drive alerting and response.', blocks: ['account', 'guardduty', 'findings'], conns: ['c_acc_gd', 'c_gd_find'] },
    { title: 'Find weak spots (Inspector)', focus: 'account', narration: 'Amazon Inspector scans your workloads for known software vulnerabilities (CVEs) and exposure.', storyNarration: 'An inspector walks the kitchen checking for unlocked back doors and dodgy wiring before anyone exploits them.', concept: 'Inspector = vulnerability scanning.', blocks: ['account', 'guardduty', 'findings'], conns: ['c_acc_gd', 'c_gd_find'] },
    { title: 'Protect sensitive data (Macie)', focus: 'macie', anim: 'pulse', animConn: 'c_acc_macie', narration: 'Macie discovers and flags sensitive data such as PII sitting in your S3 buckets.', storyNarration: 'A clerk spots customer details left out on a counter and flags them before they walk.', concept: 'Macie = sensitive-data (PII) discovery.', blocks: ['account', 'guardduty', 'findings', 'macie'], conns: ['c_acc_gd', 'c_gd_find', 'c_acc_macie'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Detect malicious activity from your account’s logs?', options: ['Amazon GuardDuty', 'Amazon Macie', 'An EBS volume', 'Route 53'], correct: [0], explain: 'GuardDuty analyzes logs for threats.' },
    { kind: 'single', prompt: 'Scan workloads for known software vulnerabilities?', options: ['Amazon Inspector', 'GuardDuty', 'Macie', 'CloudFront'], correct: [0], explain: 'Inspector checks for CVEs and exposure.' },
    { kind: 'single', prompt: 'Discover sensitive data (PII) sitting in S3?', options: ['Amazon Macie', 'Inspector', 'A NAT gateway', 'EFS'], correct: [0], explain: 'Macie finds and classifies sensitive data in S3.' },
    { kind: 'tapfix', prompt: 'You want continuous detection of malicious activity across the account. Tap the right service.', tapTarget: 'guardduty', explain: 'GuardDuty continuously analyzes logs for threats.' },
  ],
};

const accelerator = {
  id: 'global-accelerator', title: 'Accelerate Global Traffic', examDomain: 'Design High-Performing Architectures',
  summary: 'Express lanes: users enter at the nearest edge and ride the AWS backbone to the best healthy region.',
  scenery: 'open',
  blocks: [
    C('user', 'Global user', 'generic', { pos: [-7, 0.7, 0] }, { name: 'Customer', prop: 'customer', pos: [-7, 0], yaw: 90 }, 'A user far from your app.', 'A client far from your regions.'),
    C('ga', 'Global Accelerator', 'edge', { pos: [-1.5, 0.7, 0] }, { name: 'The express gate', prop: 'hub', pos: [-1.5, 0], yaw: 0 }, 'Static anycast entry at the nearest edge.', 'AWS Global Accelerator; anycast IPs + backbone routing.'),
    C('r1', 'Region A', 'compute', { pos: [3, 0.7, -1.6] }, { name: 'Kitchen A', prop: 'cook', pos: [3, -1.6], yaw: -90 }, 'One regional endpoint.', 'An app endpoint in region A.'),
    C('r2', 'Region B', 'compute', { pos: [3.5, 0.7, 1.6] }, { name: 'Kitchen B', prop: 'cook', pos: [3.5, 1.6], yaw: -90 }, 'Another regional endpoint.', 'An app endpoint in region B.'),
  ],
  connections: [
    { id: 'c_user_ga', from: 'user', to: 'ga', flow: 'request' },
    { id: 'c_ga_r1', from: 'ga', to: 'r1', flow: 'request' },
    { id: 'c_ga_r2', from: 'ga', to: 'r2', flow: 'request' },
  ],
  stages: [
    { title: 'Users far from your app', focus: 'user', anim: 'pulse', animConn: 'c_user_ga', narration: 'Distant users cross the unpredictable public internet, adding latency and jitter.', storyNarration: 'A guest across the country waits while their order crawls through traffic on the public roads.', concept: 'Global users need a fast, stable path in.', blocks: ['user', 'ga'], conns: ['c_user_ga'] },
    { title: 'Enter at the nearest edge', focus: 'ga', anim: 'pulse', animConn: 'c_user_ga', narration: 'Global Accelerator gives you static anycast IPs; every user enters at the closest AWS edge location.', storyNarration: 'Open an express gate at every city; each guest steps in at the nearest one, same address everywhere.', concept: 'Anycast entry at the nearest edge.', blocks: ['user', 'ga'], conns: ['c_user_ga'] },
    { title: 'Ride the AWS backbone', focus: 'r1', anim: 'chain', chain: ['c_user_ga', 'c_ga_r1'], narration: 'From the edge, traffic travels AWS’s private backbone to the best healthy region — and fails over automatically.', storyNarration: 'From the gate, a private express lane carries the order straight to the nearest open kitchen, rerouting if one closes.', concept: 'Backbone routing to the best region + failover.', blocks: ['user', 'ga', 'r1', 'r2'], conns: ['c_user_ga', 'c_ga_r1', 'c_ga_r2'] },
    { title: 'vs CloudFront', focus: 'ga', narration: 'CloudFront caches content at the edge; Global Accelerator routes/accelerates whole apps (TCP/UDP) without caching.', storyNarration: 'Grab-and-go shelves hand out copies of popular dishes; the express gate speeds you to the actual kitchen for anything.', concept: 'Global Accelerator (apps) vs CloudFront (content).', blocks: ['user', 'ga', 'r1', 'r2'], conns: ['c_user_ga', 'c_ga_r1', 'c_ga_r2'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Static anycast IPs + the AWS backbone to reach your app fast worldwide?', options: ['AWS Global Accelerator', 'A bigger instance', 'An EBS volume', 'A NAT gateway'], correct: [0], explain: 'Global Accelerator gives anycast entry and backbone routing.' },
    { kind: 'single', prompt: 'Global Accelerator differs from CloudFront because it…', options: ['Accelerates whole apps (TCP/UDP); CloudFront caches content', 'Stores objects', 'Is a database', 'Resolves DNS'], correct: [0], explain: 'GA routes/accelerates apps; CloudFront is a content cache.' },
    { kind: 'single', prompt: 'A benefit of entering at the nearest edge?', options: ['Lower, more consistent latency + fast failover', 'Cheaper storage', 'More IAM users', 'Bigger disks'], correct: [0], explain: 'Edge entry + backbone gives stable latency and failover.' },
    { kind: 'single', prompt: 'Best fit for Global Accelerator?', options: ['Non-HTTP or latency-sensitive apps across regions', 'Caching images', 'A single-region static site', 'A relational join'], correct: [0], explain: 'GA suits app traffic (incl. TCP/UDP) needing global speed/failover.' },
  ],
};

const cognito = {
  id: 'user-signin-cognito', title: 'Sign In Your Users', examDomain: 'Design Secure Architectures',
  summary: 'A membership desk that signs your app’s customers up and in — separate from the staff keys (IAM).',
  scenery: 'open',
  blocks: [
    C('user', 'App user', 'generic', { pos: [-6.5, 0.7, 0] }, { name: 'Customer', prop: 'customer', pos: [-6.5, 0], yaw: 90 }, 'An end user of your application.', 'An application end user (not an AWS user).'),
    C('cognito', 'Cognito', 'security', { pos: [-1, 0.7, 0] }, { name: 'Membership desk', prop: 'securitydesk', pos: [-1, 0], yaw: -90 }, 'Signs users up and in; issues tokens.', 'Amazon Cognito user pool; sign-up/in, MFA, social/SSO.', 'User pool → JWT (id + access token)\nMFA · hosted UI · social / SSO\nAPI Gateway authorizer verifies the token'),
    C('app', 'Your app', 'compute', { pos: [3.5, 0.7, -1.5] }, { name: 'The app', prop: 'cook', pos: [3.5, -1.5], yaw: -90 }, 'Accepts the user’s token.', 'Your app/API trusting Cognito tokens.'),
    C('api', 'API / data', 'database', { pos: [4, 0.7, 1.5] }, { name: 'The pantry', prop: 'pantry', pos: [4, 1.5], yaw: -90 }, 'Protected resource behind the token.', 'A protected API/resource.'),
  ],
  connections: [
    { id: 'c_user_cognito', from: 'user', to: 'cognito', flow: 'request' },
    { id: 'c_user_app', from: 'user', to: 'app', flow: 'request' },
    { id: 'c_app_api', from: 'app', to: 'api', flow: 'data' },
  ],
  stages: [
    { title: 'App users aren’t IAM users', focus: 'cognito', narration: 'IAM secures AWS access for you and your services. Your app’s customers need their own sign-in — that’s Cognito.', storyNarration: 'Staff have keys to the building; diners don’t. Diners sign in at a membership desk of their own.', concept: 'App users use Cognito, not IAM.', blocks: ['user', 'cognito'], conns: ['c_user_cognito'] },
    { title: 'Sign up & sign in (Cognito)', focus: 'cognito', anim: 'pulse', animConn: 'c_user_cognito', narration: 'A Cognito user pool handles registration, login, MFA and social/SSO sign-in — managed for you.', storyNarration: 'The desk signs new members up, checks them in, and even takes a second ID for the careful ones.', concept: 'Cognito user pools = managed app sign-in.', blocks: ['user', 'cognito', 'app'], conns: ['c_user_cognito'] },
    { title: 'Issue a token', focus: 'app', anim: 'chain', chain: ['c_user_cognito', 'c_user_app'], narration: 'On login the user gets a token; your app/API verifies it — no passwords stored in your app.', storyNarration: 'The desk hands the member a wristband; every counter just checks the band, never asks for a password again.', concept: 'Token-based access to your app.', blocks: ['user', 'cognito', 'app', 'api'], conns: ['c_user_cognito', 'c_user_app', 'c_app_api'] },
    { title: 'Scale to millions', focus: 'cognito', narration: 'Cognito is managed and scales to millions of users, and plugs into API Gateway and ALB for authorization.', storyNarration: 'One desk that never gets overwhelmed, however many members turn up.', concept: 'Managed, scalable user identity.', blocks: ['user', 'cognito', 'app', 'api'], conns: ['c_user_cognito', 'c_user_app', 'c_app_api'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Sign-up/sign-in for your application’s end users?', options: ['Amazon Cognito', 'IAM users', 'A security group', 'Route 53'], correct: [0], explain: 'Cognito manages app end-user identity; IAM is for AWS access.' },
    { kind: 'single', prompt: 'IAM vs Cognito:', options: ['IAM = AWS access; Cognito = your app’s users', 'They are the same', 'Cognito = AWS access', 'IAM = app users'], correct: [0], explain: 'Different audiences: AWS principals vs application users.' },
    { kind: 'single', prompt: 'A Cognito user pool provides…', options: ['Registration, login, MFA, social/SSO', 'Object storage', 'A CDN', 'A message queue'], correct: [0], explain: 'User pools are a managed identity store for apps.' },
    { kind: 'single', prompt: 'After login, how does your API trust the user?', options: ['It verifies the Cognito-issued token', 'It stores their password', 'It checks their IP', 'It uses the root user'], correct: [0], explain: 'Apps verify the issued token rather than handling passwords.' },
  ],
};

const iac = {
  id: 'iac-cloudformation', title: 'Blueprint Your Stack', examDomain: 'Design Resilient Architectures',
  summary: 'A written blueprint that builds the whole kitchen identically every time — no hand-assembly.',
  scenery: 'open',
  blocks: [
    C('template', 'Template', 'edge', { pos: [-6.5, 0.7, 0] }, { name: 'The blueprint', prop: 'dashboard', pos: [-6.5, 0], yaw: 90 }, 'A declarative description of all resources.', 'A CloudFormation template (infrastructure as code).'),
    C('cfn', 'CloudFormation', 'generic', { pos: [-1, 0.7, 0] }, { name: 'The builder', prop: 'hub', pos: [-1, 0], yaw: 0 }, 'Provisions exactly what the blueprint says.', 'AWS CloudFormation; provisions stacks from templates.', 'Resources:\n  AssetsBucket:\n    Type: AWS::S3::Bucket   # declarative, idempotent'),
    C('dev', 'Dev stack', 'compute', { pos: [3, 0.7, -1.6] }, { name: 'Dev kitchen', prop: 'cook', pos: [3, -1.6], yaw: -90 }, 'One environment built from the template.', 'A dev environment.'),
    C('prod', 'Prod stack', 'compute', { pos: [3.5, 0.7, 1.6] }, { name: 'Prod kitchen', prop: 'cook', pos: [3.5, 1.6], yaw: -90 }, 'An identical environment from the same template.', 'An identical prod environment.'),
  ],
  connections: [
    { id: 'c_tmpl_cfn', from: 'template', to: 'cfn', flow: 'data' },
    { id: 'c_cfn_dev', from: 'cfn', to: 'dev', flow: 'request' },
    { id: 'c_cfn_prod', from: 'cfn', to: 'prod', flow: 'request' },
  ],
  stages: [
    { title: 'Don’t build by hand', focus: 'template', anim: 'overload', animConn: 'c_tmpl_cfn', narration: 'Clicking around the console to build infra is slow, error-prone and impossible to reproduce exactly.', storyNarration: 'Fitting out each kitchen by hand from memory means every one comes out slightly different — and mistakes creep in.', concept: 'Manual setup doesn’t reproduce or scale.', blocks: ['template', 'cfn'], conns: ['c_tmpl_cfn'] },
    { title: 'Write a blueprint', focus: 'template', anim: 'pulse', animConn: 'c_tmpl_cfn', narration: 'Describe every resource declaratively in a CloudFormation template — infrastructure as code.', storyNarration: 'Draw one exact blueprint of the kitchen: every counter, socket and shelf written down.', concept: 'IaC = declare infrastructure as a template.', blocks: ['template', 'cfn'], conns: ['c_tmpl_cfn'] },
    { title: 'Stamp out identical stacks', focus: 'dev', anim: 'pulse', animConn: 'c_cfn_dev', narration: 'CloudFormation provisions the whole stack consistently — dev, staging and prod come out identical.', storyNarration: 'Hand the blueprint to the builder and every kitchen — dev, staging, prod — is fitted out exactly the same.', concept: 'Reproducible environments from one template.', blocks: ['template', 'cfn', 'dev', 'prod'], conns: ['c_tmpl_cfn', 'c_cfn_dev', 'c_cfn_prod'] },
    { title: 'Version, review, roll back', focus: 'cfn', narration: 'Templates live in version control; changes are reviewed, repeatable, and can be rolled back cleanly.', storyNarration: 'The blueprint is filed and dated; propose a change, get it checked, and if it’s wrong, revert to the last good plan.', concept: 'Infra is versioned, reviewable and reversible.', blocks: ['template', 'cfn', 'dev', 'prod'], conns: ['c_tmpl_cfn', 'c_cfn_dev', 'c_cfn_prod'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Provision AWS infrastructure repeatably from a definition?', options: ['CloudFormation (infrastructure as code)', 'Click it in the console each time', 'A bigger instance', 'Route 53'], correct: [0], explain: 'CloudFormation builds stacks from declarative templates.' },
    { kind: 'single', prompt: 'A key benefit of infrastructure as code?', options: ['Consistent, repeatable environments', 'Faster CPUs', 'Cheaper storage', 'More IAM users'], correct: [0], explain: 'One template yields identical environments.' },
    { kind: 'single', prompt: 'Where should templates live?', options: ['Version control, reviewed like code', 'Only in someone’s laptop', 'Pasted in chat', 'Nowhere — memorize them'], correct: [0], explain: 'Versioning gives history, review and rollback.' },
    { kind: 'single', prompt: 'A change goes wrong. With CloudFormation you can…', options: ['Roll back to the previous stack state', 'Only rebuild by hand', 'Nothing', 'Delete the account'], correct: [0], explain: 'Stacks support rollback to a known-good state.' },
  ],
};

const audit = {
  id: 'audit-cloudtrail', title: 'Audit Every Action', examDomain: 'Design Secure Architectures',
  summary: 'A logbook of who did what, and when, across the whole operation — for investigations and compliance.',
  scenery: 'open',
  blocks: [
    C('users', 'Users & services', 'compute', { pos: [-6, 0.7, 0] }, { name: 'The staff', prop: 'cook', pos: [-6, 0], yaw: 90 }, 'Everyone making API calls.', 'IAM users, roles and services calling AWS APIs.'),
    C('cloudtrail', 'CloudTrail', 'security', { pos: [-0.5, 0.7, 0] }, { name: 'The logbook', prop: 'securitydesk', pos: [-0.5, 0], yaw: -90 }, 'Records who did what, when.', 'AWS CloudTrail; records account API activity.', '{ "eventName": "DeleteBucket",\n  "userIdentity": {...}, "sourceIPAddress": ... }\n→ logged to S3 (+ CloudWatch Logs)'),
    C('log', 'Audit log (S3)', 'storage', { pos: [3.5, 0.7, 0] }, { name: 'The archive', prop: 'larder', pos: [3.5, 0], yaw: -90 }, 'Stores the trail durably for later.', 'CloudTrail logs delivered to S3 (often locked).'),
  ],
  connections: [
    { id: 'c_users_ct', from: 'users', to: 'cloudtrail', flow: 'request' },
    { id: 'c_ct_log', from: 'cloudtrail', to: 'log', flow: 'data' },
  ],
  stages: [
    { title: 'Who did what?', focus: 'cloudtrail', anim: 'pulse', animConn: 'c_users_ct', narration: 'For security and compliance you need a record of every action taken in the account.', storyNarration: 'When something’s off, the manager needs to know exactly who opened which door, and when.', concept: 'You need an audit trail of actions.', blocks: ['users', 'cloudtrail'], conns: ['c_users_ct'] },
    { title: 'CloudTrail logs every API call', focus: 'cloudtrail', anim: 'pulse', animConn: 'c_users_ct', narration: 'CloudTrail records the who, what and when of API calls across your account.', storyNarration: 'A logbook by the door notes every entry: who, what they did, and the time.', concept: 'CloudTrail = an audit log of API activity.', blocks: ['users', 'cloudtrail'], conns: ['c_users_ct'] },
    { title: 'Store it durably', focus: 'log', anim: 'chain', chain: ['c_users_ct', 'c_ct_log'], narration: 'Trails are delivered to S3 — often with retention and object-lock — for later investigation and compliance.', storyNarration: 'Each night’s logbook is filed in the archive and can’t be edited, ready if anyone asks questions later.', concept: 'Durable, tamper-resistant audit storage.', blocks: ['users', 'cloudtrail', 'log'], conns: ['c_users_ct', 'c_ct_log'] },
    { title: 'CloudTrail vs CloudWatch', focus: 'cloudtrail', narration: 'CloudTrail answers “who did what” (audit); CloudWatch answers “how is it performing” (metrics/logs).', storyNarration: 'The logbook says who came and went; the gauges on the board say how busy the kitchen is. Different questions.', concept: 'CloudTrail = audit; CloudWatch = monitoring.', blocks: ['users', 'cloudtrail', 'log'], conns: ['c_users_ct', 'c_ct_log'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Get a record of every API call (who/what/when) in your account?', options: ['AWS CloudTrail', 'CloudWatch metrics', 'A NAT gateway', 'EFS'], correct: [0], explain: 'CloudTrail records account API activity for audit.' },
    { kind: 'single', prompt: 'CloudTrail vs CloudWatch:', options: ['CloudTrail = who-did-what; CloudWatch = performance', 'They are identical', 'CloudTrail = metrics', 'CloudWatch = audit log'], correct: [0], explain: 'Audit trail vs monitoring/metrics.' },
    { kind: 'single', prompt: 'Where are CloudTrail logs typically delivered for retention?', options: ['Amazon S3 (often with object lock)', 'An EBS volume', 'A DynamoDB item', 'A security group'], correct: [0], explain: 'Trails are stored durably in S3, often locked.' },
    { kind: 'single', prompt: 'Investigating a suspicious change, you check…', options: ['CloudTrail', 'The billing console', 'Route 53', 'An SQS queue'], correct: [0], explain: 'CloudTrail shows who made the change and when.' },
  ],
};

const sgnacl = {
  id: 'sg-vs-nacl', title: 'Security Groups vs NACLs', examDomain: 'Design Secure Architectures',
  summary: 'A bouncer at each door who remembers you, and a gate guard at the perimeter with a strict allow/deny list.',
  scenery: 'open',
  blocks: [
    C('traffic', 'Traffic', 'generic', { pos: [-7.5, 0.7, 0] }, { name: 'The crowd', prop: 'customer', pos: [-7.5, 0], yaw: 90 }, 'Packets arriving (and leaving).', 'Inbound/outbound traffic.'),
    C('nacl', 'Network ACL', 'security', { pos: [-3, 0.7, 0] }, { name: 'Perimeter guard', prop: 'guardpost', pos: [-3, 0], yaw: 90 }, 'Filters at the subnet edge; allow AND deny; stateless.', 'A NACL; subnet-level, stateless, ordered allow/deny rules.', '#100 ALLOW tcp/443 0.0.0.0/0\n#200 DENY  tcp/22  1.2.3.4/32\n#*   DENY  all  (stateless)'),
    C('sg', 'Security group', 'security', { pos: [1, 0.7, 0] }, { name: 'Door bouncer', prop: 'bouncer', pos: [1, 0], yaw: 90 }, 'Allows specific traffic to the instance; remembers the conversation.', 'A security group; instance-level, stateful, allow-only.', 'ALLOW tcp/443 from 0.0.0.0/0\n(reply traffic auto-allowed)'),
    C('server', 'Instance', 'compute', { pos: [4.5, 0.7, 0] }, { name: 'The kitchen', prop: 'cook', pos: [4.5, 0], yaw: -90 }, 'The protected instance.', 'An EC2 instance.'),
  ],
  connections: [
    { id: 'c_t_nacl', from: 'traffic', to: 'nacl', flow: 'network' },
    { id: 'c_nacl_sg', from: 'nacl', to: 'sg', flow: 'network' },
    { id: 'c_sg_server', from: 'sg', to: 'server', flow: 'network' },
  ],
  stages: [
    { title: 'Two layers of firewall', focus: 'server', anim: 'chain', chain: ['c_t_nacl', 'c_nacl_sg', 'c_sg_server'], narration: 'Traffic passes a subnet-level Network ACL, then an instance-level security group — two checkpoints.', storyNarration: 'A guest clears the perimeter guard at the gate, then the bouncer at the room door.', concept: 'NACL (subnet) + security group (instance) = layered.', blocks: ['traffic', 'nacl', 'sg', 'server'], conns: ['c_t_nacl', 'c_nacl_sg', 'c_sg_server'] },
    { title: 'Security group: stateful, instance-level', focus: 'sg', anim: 'pulse', animConn: 'c_sg_server', narration: 'A security group attaches to the instance, has allow rules only, and is stateful — reply traffic is allowed automatically.', storyNarration: 'The bouncer lets in who’s on the list and remembers them, so they can leave freely without being re-checked.', concept: 'SG = stateful, instance-level, allow-only.', blocks: ['traffic', 'nacl', 'sg', 'server'], conns: ['c_sg_server'] },
    { title: 'NACL: stateless, subnet-level', focus: 'nacl', anim: 'pulse', animConn: 'c_t_nacl', narration: 'A NACL guards the whole subnet, supports allow AND deny rules, and is stateless — you must allow return traffic explicitly.', storyNarration: 'The perimeter guard checks every entry and every exit against a strict list, and never remembers a face.', concept: 'NACL = stateless, subnet-level, allow + deny.', blocks: ['traffic', 'nacl', 'sg', 'server'], conns: ['c_t_nacl'] },
    { title: 'When to use which', focus: 'sg', narration: 'Use security groups for normal instance access; reach for NACLs for subnet-wide rules or to explicitly DENY (e.g. block a bad IP).', storyNarration: 'The bouncer handles the everyday list; the perimeter guard is who you tell to ban a specific troublemaker outright.', concept: 'SG by default; NACL for subnet-wide or explicit denies.', blocks: ['traffic', 'nacl', 'sg', 'server'], conns: ['c_t_nacl', 'c_nacl_sg', 'c_sg_server'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'A security group is…', options: ['Stateful, at the instance level, allow-only', 'Stateless, at the subnet level', 'A DNS service', 'A storage class'], correct: [0], explain: 'SGs are stateful, instance-level, and only have allow rules.' },
    { kind: 'single', prompt: 'A Network ACL is…', options: ['Stateless, at the subnet level, with allow AND deny', 'Stateful, at the instance level', 'A CDN', 'A queue'], correct: [0], explain: 'NACLs are stateless, subnet-level, ordered allow/deny.' },
    { kind: 'single', prompt: 'You must explicitly allow return traffic on…', options: ['A NACL (stateless)', 'A security group (stateful)', 'Both equally', 'Neither'], correct: [0], explain: 'NACLs are stateless; SGs auto-allow replies.' },
    { kind: 'single', prompt: 'Block one specific malicious IP across a subnet. Use…', options: ['A NACL deny rule', 'A security group', 'Route 53', 'An IAM policy'], correct: [0], explain: 'Only NACLs support deny rules; SGs can’t deny.' },
  ],
};

const multiaz = {
  id: 'multiaz-vs-replicas', title: 'Multi-AZ vs Read Replicas', examDomain: 'Design Resilient Architectures',
  summary: 'A standby pantry that takes over if the main one fails — versus extra reading counters that share the load.',
  scenery: 'open',
  blocks: [
    C('app', 'App', 'compute', { pos: [-6, 0.7, 0] }, { name: 'The cook', prop: 'cook', pos: [-6, 0], yaw: 90 }, 'Reads and writes the database.', 'Your application tier.'),
    C('primary', 'Primary DB', 'database', { pos: [-0.5, 0.7, 0] }, { name: 'Main pantry', prop: 'pantry', pos: [-0.5, 0], yaw: -90 }, 'Handles all writes.', 'The RDS primary (writer).'),
    C('standby', 'Multi-AZ standby', 'database', { pos: [3, 0.7, -1.7] }, { name: 'Standby pantry', prop: 'pantry', pos: [3, -1.7], yaw: -90 }, 'Synchronous copy in another AZ; fails over automatically. Not readable.', 'RDS Multi-AZ standby; synchronous, automatic failover.'),
    C('replica', 'Read replica', 'database', { pos: [3.5, 0.7, 1.7] }, { name: 'Reading counter', prop: 'pantry', pos: [3.5, 1.7], yaw: -90 }, 'Asynchronous copy you read from to offload the primary.', 'An RDS read replica; asynchronous, read scaling.'),
  ],
  connections: [
    { id: 'c_app_primary', from: 'app', to: 'primary', flow: 'data' },
    { id: 'c_primary_standby', from: 'primary', to: 'standby', flow: 'replication' },
    { id: 'c_primary_replica', from: 'primary', to: 'replica', flow: 'replication' },
    { id: 'c_app_replica', from: 'app', to: 'replica', flow: 'data' },
  ],
  stages: [
    { title: 'Survive an AZ failure (Multi-AZ)', focus: 'standby', anim: 'pulse', animConn: 'c_primary_standby', narration: 'Multi-AZ keeps a synchronous standby in another AZ and fails over automatically. It’s for availability — you can’t read from it.', storyNarration: 'A standby pantry in the next room mirrors the main one exactly; if the main floods, it takes over instantly. Nobody serves from it meanwhile.', concept: 'Multi-AZ = synchronous standby + auto-failover (HA).', blocks: ['app', 'primary', 'standby'], conns: ['c_app_primary', 'c_primary_standby'] },
    { title: 'Scale reads (read replicas)', focus: 'replica', anim: 'chain', chain: ['c_primary_replica', 'c_app_replica'], narration: 'Read replicas are asynchronous copies you CAN read from — they offload read traffic from the primary.', storyNarration: 'Open extra reading counters off the same stock; the queue of lookups spreads across them, easing the main pantry.', concept: 'Read replicas = async copies that scale reads.', blocks: ['app', 'primary', 'replica'], conns: ['c_app_primary', 'c_primary_replica', 'c_app_replica'] },
    { title: 'Don’t confuse them', focus: 'primary', narration: 'A Multi-AZ standby is NOT readable and exists for failover; read replicas scale reads but don’t auto-fail-over (one can be promoted).', storyNarration: 'The standby just waits to step in; the reading counters serve customers but won’t automatically run the kitchen if the main pantry dies.', concept: 'HA (Multi-AZ) ≠ read scaling (replicas).', blocks: ['app', 'primary', 'standby', 'replica'], conns: ['c_app_primary', 'c_primary_standby', 'c_primary_replica', 'c_app_replica'] },
    { title: 'Use both together', focus: 'app', narration: 'Combine them: Multi-AZ for resilience, read replicas for read scale — they solve different problems.', storyNarration: 'Keep the standby ready for disaster AND run extra counters for the rush; you need both.', concept: 'Multi-AZ + replicas cover HA and read scale.', blocks: ['app', 'primary', 'standby', 'replica'], conns: ['c_app_primary', 'c_primary_standby', 'c_primary_replica', 'c_app_replica'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'RDS Multi-AZ primarily gives you…', options: ['Automatic failover to a synchronous standby (HA)', 'More read throughput', 'A global CDN', 'Cheaper storage'], correct: [0], explain: 'Multi-AZ is about availability, not read scaling.' },
    { kind: 'single', prompt: 'Read-heavy app overwhelming the database. Add…', options: ['Read replicas', 'A Multi-AZ standby to read from', 'A NAT gateway', 'A bigger EBS volume'], correct: [0], explain: 'Replicas scale reads; the Multi-AZ standby isn’t readable.' },
    { kind: 'single', prompt: 'Can you read from a Multi-AZ standby?', options: ['No — it’s for failover only', 'Yes, freely', 'Only on weekends', 'Only writes'], correct: [0], explain: 'The standby serves failover, not read traffic.' },
    { kind: 'single', prompt: 'Do read replicas automatically fail over for writes?', options: ['No (one can be manually promoted)', 'Yes, instantly', 'Yes, but only in one AZ', 'They never replicate'], correct: [0], explain: 'Replicas are async read copies; promotion is manual.' },
  ],
};

const messaging = {
  id: 'pick-messaging', title: 'Which Messaging Service?', examDomain: 'Design Resilient Architectures',
  summary: 'Queue, broadcast, rule-router or stream — match the integration pattern to the right service.',
  scenery: 'open',
  blocks: [
    C('need', 'Your need', 'compute', { pos: [-6.5, 0.7, 0] }, { name: 'The line', prop: 'cook', pos: [-6.5, 0], yaw: 90 }, 'What you’re trying to integrate.', 'Your integration requirement.'),
    C('sqs', 'SQS', 'generic', { pos: [-1, 0.7, -2] }, { name: 'Ticket rail', prop: 'ticketrail', pos: [-1, -2], yaw: 0 }, 'Buffer work for one consumer group to pull.', 'SQS; pull queue, decouples producer/consumer.'),
    C('sns', 'SNS', 'generic', { pos: [2.6, 0.7, -1.7] }, { name: 'Tannoy', prop: 'tannoy', pos: [2.6, -1.7], yaw: 0 }, 'Push one message to many subscribers.', 'SNS; pub/sub fan-out (push).'),
    C('eb', 'EventBridge', 'generic', { pos: [0.8, 0.7, 0.8] }, { name: 'Router', prop: 'hub', pos: [0.8, 0.8], yaw: 0 }, 'Route events to targets by content rules.', 'EventBridge; rule-based event bus.'),
    C('kin', 'Kinesis', 'edge', { pos: [3.8, 0.7, 1.9] }, { name: 'Conveyor', prop: 'ticketrail', pos: [3.8, 1.9], yaw: 0 }, 'Ordered, real-time stream many can replay.', 'Kinesis; ordered, replayable data stream.'),
  ],
  connections: [
    { id: 'c_need_sqs', from: 'need', to: 'sqs', flow: 'request' },
    { id: 'c_need_sns', from: 'need', to: 'sns', flow: 'request' },
    { id: 'c_need_eb', from: 'need', to: 'eb', flow: 'request' },
    { id: 'c_need_kin', from: 'need', to: 'kin', flow: 'request' },
  ],
  stages: [
    { title: 'Decouple one-to-one (SQS)', focus: 'sqs', anim: 'pulse', animConn: 'c_need_sqs', narration: 'Need to hand work to ONE consumer group that processes at its own pace, with buffering and retries? Use SQS.', storyNarration: 'Clip the order on a rail; whichever cook is free pulls the next one.', concept: 'SQS = queue, pull, decouple + buffer.', blocks: ['need', 'sqs'], conns: ['c_need_sqs'] },
    { title: 'Broadcast one-to-many (SNS)', focus: 'sns', anim: 'pulse', animConn: 'c_need_sns', narration: 'Need to notify MANY independent subscribers of the same event at once? Use SNS pub/sub.', storyNarration: 'Call it once over the tannoy; everyone listening hears it together.', concept: 'SNS = push pub/sub fan-out.', blocks: ['need', 'sqs', 'sns'], conns: ['c_need_sns'] },
    { title: 'Route by content (EventBridge)', focus: 'eb', anim: 'pulse', animConn: 'c_need_eb', narration: 'Need to route different events to different targets by rules, from many AWS sources? Use EventBridge.', storyNarration: 'A router reads each ticket and sends it only to the station whose rule it matches.', concept: 'EventBridge = rule/content-based routing.', blocks: ['need', 'sqs', 'sns', 'eb'], conns: ['c_need_eb'] },
    { title: 'Stream & replay (Kinesis)', focus: 'kin', anim: 'pulse', animConn: 'c_need_kin', narration: 'Need a high-volume, ordered, replayable real-time feed read by multiple consumers? Use Kinesis.', storyNarration: 'Run records past on a conveyor that keeps the ordered log so any station can re-watch it.', concept: 'Kinesis = ordered, replayable real-time stream.', blocks: ['need', 'sqs', 'sns', 'eb', 'kin'], conns: ['c_need_kin'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Buffer tasks for one worker pool to pull and retry?', options: ['SQS', 'SNS', 'Kinesis', 'EventBridge'], correct: [0], explain: 'SQS is a pull queue for decoupling one consumer group.' },
    { kind: 'single', prompt: 'Notify many independent subscribers of one event at once?', options: ['SNS', 'SQS', 'A read replica', 'EBS'], correct: [0], explain: 'SNS pushes each message to all subscribers (fan-out).' },
    { kind: 'single', prompt: 'Route events to different targets based on their content?', options: ['EventBridge', 'SQS', 'Kinesis', 'Route 53'], correct: [0], explain: 'EventBridge does rule/content-based routing.' },
    { kind: 'single', prompt: 'High-volume, ordered, replayable real-time feed for many readers?', options: ['Kinesis', 'SQS', 'SNS', 'A NAT gateway'], correct: [0], explain: 'Kinesis is an ordered, replayable stream with multiple consumers.' },
  ],
};

const scaleupout = {
  id: 'scale-up-vs-out', title: 'Scale Up vs Scale Out', examDomain: 'Design Cost-Optimized Architectures',
  summary: 'A bigger oven, or more cooks? Vertical hits a ceiling; horizontal spreads load and survives failures.',
  scenery: 'open',
  blocks: [
    C('load', 'Load', 'generic', { pos: [-6.5, 0.7, 0] }, { name: 'The orders', prop: 'ticketrail', pos: [-6.5, 0], yaw: 0 }, 'Demand on the system.', 'Your workload.'),
    C('big', 'Scale up', 'compute', { pos: [-1, 0.7, -1.6] }, { name: 'Bigger oven', prop: 'cook', pos: [-1, -1.6], yaw: -90 }, 'One larger instance — more CPU/RAM.', 'Vertical scaling: a bigger instance type.'),
    C('out1', 'Scale out', 'compute', { pos: [2.5, 0.7, -1.6] }, { name: 'More cooks', prop: 'cook', pos: [2.5, -1.6], yaw: -90 }, 'More instances behind a load balancer.', 'Horizontal scaling: add instances.'),
    C('out2', 'Scale out', 'compute', { pos: [3, 0.7, 1.6] }, { name: 'More cooks', prop: 'cook', pos: [3, 1.6], yaw: -90 }, 'Another instance.', 'Another instance in the group.'),
  ],
  connections: [
    { id: 'c_load_big', from: 'load', to: 'big', flow: 'request' },
    { id: 'c_load_o1', from: 'load', to: 'out1', flow: 'request' },
    { id: 'c_load_o2', from: 'load', to: 'out2', flow: 'request' },
  ],
  stages: [
    { title: 'Scale up: a bigger box', focus: 'big', anim: 'spike', narration: 'Vertical scaling means a larger instance — more CPU and memory. Simple, but it hits a ceiling and is a single point of failure.', storyNarration: 'Buy one giant oven. Powerful — but there’s a biggest oven made, and if it breaks, service stops.', concept: 'Scale up = bigger instance; capped + single point of failure.', blocks: ['load', 'big'], conns: ['c_load_big'] },
    { title: 'Scale out: more boxes', focus: 'out1', anim: 'flow', narration: 'Horizontal scaling means more instances behind a load balancer — no single ceiling.', storyNarration: 'Hire more ordinary cooks and spread the tickets across them; need more? Add more.', concept: 'Scale out = more instances, no single ceiling.', blocks: ['load', 'out1', 'out2'], conns: ['c_load_o1', 'c_load_o2'] },
    { title: 'Out is resilient and elastic', focus: 'out2', anim: 'flow', narration: 'Many small instances + Auto Scaling means losing one is harmless, and you grow and shrink with demand.', storyNarration: 'If one cook walks, the rest carry on; call extras for the rush and send them home after.', concept: 'Scale out = resilient + elastic.', blocks: ['load', 'out1', 'out2'], conns: ['c_load_o1', 'c_load_o2'] },
    { title: 'Pick by workload', focus: 'load', narration: 'Prefer scale-out for stateless web/HA. Scale-up suits simple, stateful, or licensing-bound workloads that are hard to distribute.', storyNarration: 'Most kitchens want more cooks; a single specialist appliance is the exception, not the rule.', concept: 'Prefer scale-out for web/HA; scale-up for special cases.', blocks: ['load', 'big', 'out1', 'out2'], conns: ['c_load_big', 'c_load_o1', 'c_load_o2'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Vertical scaling (scale up) means…', options: ['A bigger/more powerful instance', 'More instances', 'A second region', 'A read replica'], correct: [0], explain: 'Scaling up increases one instance’s size.' },
    { kind: 'single', prompt: 'Horizontal scaling (scale out) means…', options: ['More instances behind a load balancer', 'A bigger instance', 'A bigger disk', 'More IAM users'], correct: [0], explain: 'Scaling out adds instances to share load.' },
    { kind: 'single', prompt: 'Which is generally more resilient and elastic?', options: ['Scale out (horizontal)', 'Scale up (vertical)', 'Neither', 'Both identical'], correct: [0], explain: 'Many instances + Auto Scaling tolerate failure and flex with demand.' },
    { kind: 'single', prompt: 'A drawback of only scaling up?', options: ['A hard ceiling and a single point of failure', 'It’s always cheaper', 'It needs no instance', 'It can’t use EBS'], correct: [0], explain: 'One big box caps out and is a SPOF.' },
  ],
};

const egress = {
  id: 'private-egress-nat', title: 'Private Servers, Public Updates', examDomain: 'Design Secure Architectures',
  summary: 'No street door to the back rooms — but a staffed exit lets staff fetch supplies without letting anyone in.',
  scenery: 'open',
  blocks: [
    C('server', 'Private server', 'compute', { pos: [-5.5, 0.7, 0] }, { name: 'Back-of-house', prop: 'cook', pos: [-5.5, 0], yaw: 90 }, 'In a private subnet — no inbound from the internet.', 'An EC2 instance in a private subnet.'),
    C('nat', 'NAT gateway', 'networking', { pos: [-0.5, 0.7, 0] }, { name: 'Staffed exit', prop: 'guardpost', pos: [-0.5, 0], yaw: -90 }, 'Lets private servers reach OUT; nobody can start a connection IN.', 'A NAT gateway in a public subnet.', 'private subnet route table:\n0.0.0.0/0 → nat-0a1b2c3d\none NAT per AZ = resilient egress'),
    C('igw', 'Internet gateway', 'networking', { pos: [2.8, 0.7, 1.4] }, { name: 'Front door', prop: 'servicedoor', pos: [2.8, 1.4], yaw: -90 }, 'The VPC’s door to the internet (for public subnets).', 'The internet gateway.'),
    C('net', 'Internet', 'generic', { pos: [5, 0.7, -0.6] }, { name: 'The supplier', prop: 'customer', pos: [5, -0.6], yaw: -90 }, 'Updates, packages, external APIs.', 'The public internet.'),
  ],
  connections: [
    { id: 'c_server_nat', from: 'server', to: 'nat', flow: 'network' },
    { id: 'c_nat_igw', from: 'nat', to: 'igw', flow: 'network' },
    { id: 'c_igw_net', from: 'igw', to: 'net', flow: 'network' },
  ],
  stages: [
    { title: 'No inbound to private servers', focus: 'server', narration: 'A server in a private subnet can’t be reached from the internet — good for security. But it still needs OS updates and packages.', storyNarration: 'The back-of-house has no street door, so nobody wanders in — but the cooks still need to fetch supplies.', concept: 'Private subnet = no inbound route from the internet.', blocks: ['server'], conns: [] },
    { title: 'Let it reach out (NAT)', focus: 'nat', anim: 'chain', chain: ['c_server_nat', 'c_nat_igw'], narration: 'A NAT gateway lets private instances start outbound connections; replies come back, but nobody outside can initiate a connection in.', storyNarration: 'A staffed exit lets cooks pop out for supplies and return — but it never lets a stranger walk in off the street.', concept: 'NAT = outbound-only internet for private subnets.', blocks: ['server', 'nat', 'igw', 'net'], conns: ['c_server_nat', 'c_nat_igw', 'c_igw_net'] },
    { title: 'The gateway is for public subnets', focus: 'igw', narration: 'The internet gateway gives public subnets two-way internet. Private subnets route outbound THROUGH the NAT (which sits in a public subnet) to the IGW.', storyNarration: 'The front door is for the dining room; the back rooms reach the street only via the staffed exit that leads to it.', concept: 'IGW = public; NAT (in public subnet) gives private egress.', blocks: ['server', 'nat', 'igw', 'net'], conns: ['c_server_nat', 'c_nat_igw', 'c_igw_net'] },
    { title: 'Mind the cost (and IPv6)', focus: 'nat', narration: 'NAT gateways bill per hour plus per GB processed. For IPv6, use an egress-only internet gateway instead.', storyNarration: 'The staffed exit costs wages by the hour and by the load it handles — worth knowing when the bill arrives.', concept: 'NAT has hourly + data cost; egress-only IGW for IPv6.', blocks: ['server', 'nat', 'igw', 'net'], conns: ['c_server_nat', 'c_nat_igw', 'c_igw_net'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Private-subnet instances need OS updates from the internet. Use…', options: ['A NAT gateway', 'A public IP on each', 'An internet gateway directly', 'A security group'], correct: [0], explain: 'NAT lets private instances make outbound connections only.' },
    { kind: 'single', prompt: 'Can the internet start a connection to a server behind a NAT gateway?', options: ['No — outbound only', 'Yes', 'Only on port 443', 'Only with a key'], correct: [0], explain: 'NAT permits outbound-initiated traffic and its replies, not new inbound.' },
    { kind: 'single', prompt: 'A NAT gateway must live in…', options: ['A public subnet (with a route to the IGW)', 'A private subnet', 'Another region', 'On-premises'], correct: [0], explain: 'The NAT sits in a public subnet so it can reach the IGW.' },
    { kind: 'single', prompt: 'For IPv6 outbound from private subnets, use…', options: ['An egress-only internet gateway', 'A NAT gateway', 'A second VPC', 'A read replica'], correct: [0], explain: 'Egress-only IGW is the IPv6 equivalent of NAT.' },
  ],
};

const s3protect = {
  id: 's3-protection', title: 'S3 Durability & Protection', examDomain: 'Design High-Performing Architectures',
  summary: 'Built to never lose data: redundant copies, every version kept, a tamper lock, and copies in another region.',
  scenery: 'open',
  blocks: [
    C('user', 'Writer', 'generic', { pos: [-6.5, 0.7, 0] }, { name: 'Customer', prop: 'customer', pos: [-6.5, 0], yaw: 90 }, 'Writes and overwrites objects.', 'A client writing objects.'),
    C('bucket', 'S3 bucket', 'storage', { pos: [-1, 0.7, 0] }, { name: 'The larder', prop: 'larder', pos: [-1, 0], yaw: -90 }, 'Stores objects redundantly across AZs.', 'An S3 bucket (~11 nines durability).', 'Block Public Access: ON\nVersioning + MFA Delete\nDefault encryption: SSE-KMS'),
    C('versions', 'Versioning', 'storage', { pos: [3, 0.7, -1.6] }, { name: 'Old copies', prop: 'coldroom', pos: [3, -1.6], yaw: -90 }, 'Keeps every past version of an object.', 'S3 Versioning; recover overwrites/deletes.'),
    C('lock', 'Object Lock', 'security', { pos: [3.5, 0.7, 1.6] }, { name: 'The lock', prop: 'safe', pos: [3.5, 1.6], yaw: -90 }, 'Prevents objects being changed or deleted.', 'S3 Object Lock (WORM) / MFA-delete.'),
  ],
  connections: [
    { id: 'c_user_bucket', from: 'user', to: 'bucket', flow: 'data' },
    { id: 'c_bucket_versions', from: 'bucket', to: 'versions', flow: 'data' },
    { id: 'c_bucket_lock', from: 'bucket', to: 'lock', flow: 'network' },
  ],
  stages: [
    { title: 'Built not to lose data', focus: 'bucket', anim: 'pulse', animConn: 'c_user_bucket', narration: 'S3 stores each object redundantly across multiple AZs, giving roughly eleven nines of durability.', storyNarration: 'Every item in the larder is copied to several shelves across rooms — losing one shelf loses nothing.', concept: 'S3 ≈ 11 nines durability (redundant across AZs).', blocks: ['user', 'bucket'], conns: ['c_user_bucket'] },
    { title: 'Undo with versioning', focus: 'versions', anim: 'pulse', animConn: 'c_bucket_versions', narration: 'With versioning on, every overwrite and delete keeps the old version — so mistakes are recoverable.', storyNarration: 'Each time stock is replaced, the previous one is kept in the back; nothing is truly thrown away.', concept: 'Versioning recovers overwrites and deletes.', blocks: ['user', 'bucket', 'versions'], conns: ['c_user_bucket', 'c_bucket_versions'] },
    { title: 'Lock against tampering', focus: 'lock', anim: 'pulse', animConn: 'c_bucket_lock', narration: 'Object Lock (write-once-read-many) and MFA-delete stop objects being altered or deleted — for compliance.', storyNarration: 'Seal the important stock so it can’t be swapped or binned, even by staff — only opened with the manager’s key.', concept: 'Object Lock / MFA-delete = immutability.', blocks: ['user', 'bucket', 'lock'], conns: ['c_user_bucket', 'c_bucket_lock'] },
    { title: 'Copy to another region', focus: 'bucket', narration: 'Cross-Region Replication copies objects to a bucket in another region — for disaster recovery or low-latency local reads.', storyNarration: 'Mirror the whole larder to a second city, so a regional disaster can’t wipe you out.', concept: 'Cross-Region Replication for DR / locality.', blocks: ['user', 'bucket', 'versions', 'lock'], conns: ['c_user_bucket', 'c_bucket_versions', 'c_bucket_lock'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'S3’s durability comes from…', options: ['Redundant copies across multiple AZs (~11 nines)', 'A single disk', 'One AZ only', 'Your backups alone'], correct: [0], explain: 'S3 replicates objects across AZs for very high durability.' },
    { kind: 'single', prompt: 'Recover an object after an accidental overwrite or delete. Enable…', options: ['Versioning', 'A NAT gateway', 'A read replica', 'A security group'], correct: [0], explain: 'Versioning retains prior versions for recovery.' },
    { kind: 'single', prompt: 'Make objects immutable for compliance (WORM)?', options: ['S3 Object Lock', 'A bigger instance', 'CloudFront', 'EFS'], correct: [0], explain: 'Object Lock enforces write-once-read-many retention.' },
    { kind: 'single', prompt: 'Keep a copy of objects in another region automatically?', options: ['Cross-Region Replication', 'A second EBS volume', 'A NACL', 'Route 53'], correct: [0], explain: 'CRR replicates objects to a bucket in another region.' },
  ],
};

const govern = {
  id: 'govern-accounts', title: 'Govern Many Accounts', examDomain: 'Design Cost-Optimized Architectures',
  summary: 'Run franchises from head office: one combined bill with volume discounts, and house rules all must follow.',
  scenery: 'open',
  blocks: [
    C('billing', 'Consolidated billing', 'edge', { pos: [-6.5, 0.7, 0] }, { name: 'One bill', prop: 'dashboard', pos: [-6.5, 0], yaw: 90 }, 'All accounts roll up to one payer.', 'Consolidated billing; pooled usage earns volume/Savings discounts.'),
    C('org', 'Organizations', 'generic', { pos: [-1, 0.7, 0] }, { name: 'Head office', prop: 'hub', pos: [-1, 0], yaw: 0 }, 'Manages all the accounts centrally.', 'AWS Organizations; SCP guardrails + central management.', '{\n  "Effect": "Deny",\n  "Action": "cloudtrail:StopLogging",\n  "Resource": "*"\n}'),
    C('dev', 'Account: Dev', 'compute', { pos: [3.2, 0.7, -1.7] }, { name: 'Dev franchise', prop: 'cook', pos: [3.2, -1.7], yaw: -90 }, 'An isolated member account.', 'A member account (isolation + blast-radius limit).'),
    C('prod', 'Account: Prod', 'compute', { pos: [3.7, 0.7, 1.7] }, { name: 'Prod franchise', prop: 'cook', pos: [3.7, 1.7], yaw: -90 }, 'Another isolated account.', 'Another member account.'),
  ],
  connections: [
    { id: 'c_org_dev', from: 'org', to: 'dev', flow: 'network' },
    { id: 'c_org_prod', from: 'org', to: 'prod', flow: 'network' },
    { id: 'c_org_billing', from: 'org', to: 'billing', flow: 'data' },
  ],
  stages: [
    { title: 'Many accounts, one org', focus: 'org', narration: 'Separate accounts isolate teams, environments and blast radius; AWS Organizations manages them centrally.', storyNarration: 'Each franchise is its own kitchen with its own books; head office oversees them all.', concept: 'Multi-account isolates; Organizations manages centrally.', blocks: ['org', 'dev', 'prod'], conns: ['c_org_dev', 'c_org_prod'] },
    { title: 'One combined bill', focus: 'billing', anim: 'pulse', animConn: 'c_org_billing', narration: 'Consolidated billing rolls every account into one payer — and pooled usage unlocks volume and Savings Plan discounts.', storyNarration: 'All the franchises’ tills total to one bill, and buying in bulk across them earns a better rate.', concept: 'Consolidated billing = one bill + pooled discounts.', blocks: ['billing', 'org', 'dev', 'prod'], conns: ['c_org_billing', 'c_org_dev', 'c_org_prod'] },
    { title: 'House rules (SCPs)', focus: 'org', anim: 'pulse', animConn: 'c_org_dev', narration: 'Service Control Policies set guardrails every account must obey — e.g. “never disable logging”, or restrict regions.', storyNarration: 'Head office posts non-negotiable house rules in every franchise: some things simply cannot be done, ever.', concept: 'SCPs = org-wide permission guardrails (max permissions).', blocks: ['billing', 'org', 'dev', 'prod'], conns: ['c_org_dev', 'c_org_prod'] },
    { title: 'Scale safely', focus: 'org', narration: 'New accounts inherit the guardrails and billing automatically; Control Tower sets up a governed landing zone.', storyNarration: 'Open a new franchise and it arrives pre-fitted with the house rules and on the shared bill from day one.', concept: 'Governed multi-account at scale.', blocks: ['billing', 'org', 'dev', 'prod'], conns: ['c_org_billing', 'c_org_dev', 'c_org_prod'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Why use multiple AWS accounts under Organizations?', options: ['Isolation and limited blast radius, centrally managed', 'It’s faster', 'To avoid IAM', 'To get a public IP'], correct: [0], explain: 'Separate accounts isolate workloads; Organizations governs them.' },
    { kind: 'single', prompt: 'Consolidated billing gives you…', options: ['One bill and pooled volume/Savings discounts', 'Free compute', 'A second region', 'A CDN'], correct: [0], explain: 'Usage pools across accounts for better pricing.' },
    { kind: 'single', prompt: 'Enforce “no account may disable CloudTrail” across the org. Use…', options: ['A Service Control Policy (SCP)', 'An IAM user policy in each account', 'A security group', 'Route 53'], correct: [0], explain: 'SCPs set guardrails (maximum permissions) for all accounts.' },
    { kind: 'single', prompt: 'An SCP defines…', options: ['The maximum permissions accounts can have', 'Who pays the bill', 'A VPC’s CIDR', 'A backup schedule'], correct: [0], explain: 'SCPs bound permissions; they don’t grant them by themselves.' },
  ],
};

const endpoints = {
  id: 'vpc-endpoints', title: 'Keep Traffic Private', examDomain: 'Design Cost-Optimized Architectures',
  summary: 'A private hatch straight to the AWS pantry, so deliveries never hit the street — faster, private, no NAT toll.',
  scenery: 'open',
  blocks: [
    C('server', 'Private server', 'compute', { pos: [-5.5, 0.7, 0] }, { name: 'Back-of-house', prop: 'cook', pos: [-5.5, 0], yaw: 90 }, 'An instance in a private subnet.', 'A private EC2 instance.'),
    C('endpoint', 'VPC endpoint', 'networking', { pos: [0, 0.7, 0] }, { name: 'Private hatch', prop: 'servicedoor', pos: [0, 0], yaw: -90 }, 'A private door to AWS services, bypassing the internet.', 'A VPC endpoint; reaches AWS services over the AWS network.', 'Gateway endpoint → com.amazonaws.eu-west-1.s3\nroute: pl-id (S3 prefix list)'),
    C('s3svc', 'S3 / service', 'storage', { pos: [4, 0.7, 0] }, { name: 'The pantry', prop: 'larder', pos: [4, 0], yaw: -90 }, 'The AWS service you’re reaching.', 'e.g. Amazon S3.'),
  ],
  connections: [
    { id: 'c_server_ep', from: 'server', to: 'endpoint', flow: 'network' },
    { id: 'c_ep_s3', from: 'endpoint', to: 's3svc', flow: 'data' },
  ],
  stages: [
    { title: 'Reaching S3 the long way', focus: 'server', anim: 'overload', animConn: 'c_server_ep', narration: 'Without an endpoint, traffic to S3 leaves your VPC via the NAT/internet gateway — slower, exposed, and you pay NAT + data charges.', storyNarration: 'Every delivery walks out to the busy street and back, paying a toll each trip, just to reach the pantry next door.', concept: 'The public path to AWS services adds cost and exposure.', blocks: ['server', 's3svc'], conns: ['c_server_ep'] },
    { title: 'Open a private hatch', focus: 'endpoint', anim: 'chain', chain: ['c_server_ep', 'c_ep_s3'], narration: 'A VPC endpoint lets private instances reach AWS services over the AWS network — no internet, no NAT.', storyNarration: 'Cut a private hatch straight through to the pantry; deliveries never touch the street.', concept: 'VPC endpoint = private path to AWS services.', blocks: ['server', 'endpoint', 's3svc'], conns: ['c_server_ep', 'c_ep_s3'] },
    { title: 'Gateway vs Interface', focus: 'endpoint', narration: 'Gateway endpoints serve S3 and DynamoDB (free, via route tables); Interface endpoints (PrivateLink, an ENI) serve most other services.', storyNarration: 'A built-in hatch for the two big pantries (S3/DynamoDB); a fitted intercom port for everything else.', concept: 'Gateway (S3/DynamoDB) vs Interface (PrivateLink) endpoints.', blocks: ['server', 'endpoint', 's3svc'], conns: ['c_server_ep', 'c_ep_s3'] },
    { title: 'Private, cheaper, scoped', focus: 's3svc', narration: 'Traffic stays on AWS’s network, avoids NAT/egress cost, and endpoint policies can scope exactly what’s reachable.', storyNarration: 'No street, no toll, and the hatch only opens to the shelves you’re allowed.', concept: 'Private + cheaper + policy-scoped access.', blocks: ['server', 'endpoint', 's3svc'], conns: ['c_server_ep', 'c_ep_s3'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Let a private instance reach S3 without the internet or a NAT gateway?', options: ['A VPC (gateway) endpoint', 'A public IP', 'An internet gateway', 'A second VPC'], correct: [0], explain: 'Endpoints reach AWS services over the AWS network privately.' },
    { kind: 'single', prompt: 'Which services use a (free) gateway endpoint?', options: ['S3 and DynamoDB', 'All services', 'Only EC2', 'Lambda only'], correct: [0], explain: 'Gateway endpoints serve S3 and DynamoDB; others use interface endpoints.' },
    { kind: 'single', prompt: 'A cost benefit of VPC endpoints?', options: ['Avoids NAT gateway + internet data charges', 'Free compute', 'Cheaper storage class', 'No need for IAM'], correct: [0], explain: 'Keeping traffic private avoids NAT/egress costs.' },
    { kind: 'single', prompt: 'Interface endpoints are powered by…', options: ['AWS PrivateLink (an ENI in your subnet)', 'A NAT gateway', 'Route 53', 'An SQS queue'], correct: [0], explain: 'Interface endpoints use PrivateLink ENIs.' },
  ],
};

const backups = {
  id: 'centralize-backups', title: 'Centralize Backups', examDomain: 'Design Resilient Architectures',
  summary: 'One vault that automatically copies every fridge and pantry on a schedule, locks them, and restores on demand.',
  scenery: 'open',
  blocks: [
    C('ebs', 'EBS / EFS', 'storage', { pos: [-5, 0.7, -1.6] }, { name: 'Cooler', prop: 'coldroom', pos: [-5, -1.6], yaw: -90 }, 'One resource to protect.', 'EBS volumes / EFS file systems.'),
    C('rds', 'RDS / DynamoDB', 'database', { pos: [-5, 0.7, 1.6] }, { name: 'Pantry', prop: 'pantry', pos: [-5, 1.6], yaw: -90 }, 'Another resource to protect.', 'Databases to back up.'),
    C('backup', 'AWS Backup', 'security', { pos: [1, 0.7, 0] }, { name: 'Backup vault', prop: 'safe', pos: [1, 0], yaw: -90 }, 'Central, scheduled backups with retention.', 'AWS Backup; policy-based backups across services.', 'Backup plan: daily 05:00 UTC\nRetain 35 days · copy to us-east-1\nSelection: tag backup=true'),
  ],
  connections: [
    { id: 'c_ebs_backup', from: 'ebs', to: 'backup', flow: 'data' },
    { id: 'c_rds_backup', from: 'rds', to: 'backup', flow: 'data' },
  ],
  stages: [
    { title: 'Backups scattered everywhere', focus: 'backup', narration: 'Each service has its own snapshots and scripts — it’s easy to miss one or let a schedule drift.', storyNarration: 'Every fridge gets backed up by a different person on a different day — until one quietly doesn’t.', concept: 'Ad-hoc, per-service backups are inconsistent.', blocks: ['ebs', 'rds', 'backup'], conns: [] },
    { title: 'One place, one policy', focus: 'backup', anim: 'flow', narration: 'AWS Backup centrally schedules and stores backups across EBS, EFS, RDS, DynamoDB and more, by policy.', storyNarration: 'One vault automatically takes a copy of every fridge and pantry on the same schedule — nothing forgotten.', concept: 'AWS Backup = central, policy-based backups.', blocks: ['ebs', 'rds', 'backup'], conns: ['c_ebs_backup', 'c_rds_backup'] },
    { title: 'Retention & vault lock', focus: 'backup', anim: 'pulse', animConn: 'c_rds_backup', narration: 'Set retention rules, lock the vault so backups can’t be deleted (immutable), and copy cross-region/account for DR.', storyNarration: 'Keep copies for a set time in a sealed vault nobody can empty, and mirror it to another city.', concept: 'Retention + vault lock + cross-region copies.', blocks: ['ebs', 'rds', 'backup'], conns: ['c_ebs_backup', 'c_rds_backup'] },
    { title: 'Restore on demand', focus: 'backup', narration: 'When something’s lost or corrupted, restore the resource from the vault to a known good point.', storyNarration: 'Lost a tray of stock? Pull the exact copy from the vault and you’re back.', concept: 'Centralized, point-in-time restore.', blocks: ['ebs', 'rds', 'backup'], conns: ['c_ebs_backup', 'c_rds_backup'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Centrally schedule and manage backups across EBS, RDS, DynamoDB, EFS…?', options: ['AWS Backup', 'Per-service scripts only', 'A NAT gateway', 'Route 53'], correct: [0], explain: 'AWS Backup centralizes backup policy across services.' },
    { kind: 'single', prompt: 'Stop backups being deleted (ransomware/insider)?', options: ['Backup Vault Lock (immutable)', 'A bigger instance', 'A security group', 'A read replica'], correct: [0], explain: 'Vault Lock makes backups immutable for a retention period.' },
    { kind: 'single', prompt: 'Protect backups against a regional disaster?', options: ['Cross-region (and cross-account) backup copies', 'One copy in one AZ', 'No copies', 'A NAT gateway'], correct: [0], explain: 'Copy backups to another region/account for DR.' },
    { kind: 'single', prompt: 'AWS Backup’s main value over per-service snapshots?', options: ['One consistent policy across many services', 'Faster CPUs', 'Cheaper data transfer', 'A global CDN'], correct: [0], explain: 'Central policy = consistent, auditable backups.' },
  ],
};

const migrate = {
  id: 'migrate-data', title: 'Move Big Data In', examDomain: 'Design Resilient Architectures',
  summary: 'Years of stock to shift: a truck of crates for a huge one-off, or a steady conveyor over the wire for ongoing sync.',
  scenery: 'open',
  blocks: [
    C('onprem', 'On-prem data', 'compute', { pos: [-6.5, 0.7, 0] }, { name: 'Old store', prop: 'cook', pos: [-6.5, 0], yaw: 90 }, 'Large datasets sitting on-premises.', 'On-prem data to migrate.'),
    C('snow', 'Snow Family', 'storage', { pos: [-1, 0.7, -1.7] }, { name: 'The truck', prop: 'crate', pos: [-1, -1.7], yaw: 0 }, 'A rugged device AWS ships you for offline transfer.', 'AWS Snowball/Snowmobile; offline bulk transfer.'),
    C('datasync', 'DataSync', 'edge', { pos: [-0.5, 0.7, 1.6] }, { name: 'The conveyor', prop: 'ticketrail', pos: [-0.5, 1.6], yaw: 0 }, 'Moves and syncs file data over the network.', 'AWS DataSync; online file transfer/sync.'),
    C('s3', 'S3', 'storage', { pos: [4, 0.7, 0] }, { name: 'New larder', prop: 'larder', pos: [4, 0], yaw: -90 }, 'The destination in AWS.', 'Amazon S3 (or EFS/FSx).'),
  ],
  connections: [
    { id: 'c_op_snow', from: 'onprem', to: 'snow', flow: 'data' },
    { id: 'c_snow_s3', from: 'snow', to: 's3', flow: 'data' },
    { id: 'c_op_ds', from: 'onprem', to: 'datasync', flow: 'data' },
    { id: 'c_ds_s3', from: 'datasync', to: 's3', flow: 'data' },
  ],
  stages: [
    { title: 'Petabytes to move', focus: 'onprem', narration: 'Pushing huge datasets over a normal internet link could take weeks or months.', storyNarration: 'Carrying years of stock to the new kitchen one box at a time would take all season.', concept: 'Large offline data is slow over the wire.', blocks: ['onprem', 's3'], conns: [] },
    { title: 'Ship it on a device (Snow)', focus: 'snow', anim: 'chain', chain: ['c_op_snow', 'c_snow_s3'], narration: 'AWS ships you a rugged Snow device; you load the data and send it back — faster than the network for huge one-off moves.', storyNarration: 'AWS sends a truck of crates; load it up, send it back, and it’s shelved far quicker than carrying boxes.', concept: 'Snow Family = offline bulk transfer.', blocks: ['onprem', 'snow', 's3'], conns: ['c_op_snow', 'c_snow_s3'] },
    { title: 'Sync over the network (DataSync)', focus: 'datasync', anim: 'chain', chain: ['c_op_ds', 'c_ds_s3'], narration: 'For ongoing or online transfers, DataSync moves and continuously syncs file data over the network.', storyNarration: 'For steady restocking, run a conveyor over the wire that keeps the new larder in sync with the old.', concept: 'DataSync = online file transfer/sync.', blocks: ['onprem', 'datasync', 's3'], conns: ['c_op_ds', 'c_ds_s3'] },
    { title: 'Pick by size & cadence', focus: 's3', narration: 'One-off petabytes or a poor link → Snow; ongoing/online sync → DataSync; databases → DMS.', storyNarration: 'A whole season’s stock at once → the truck; a daily top-up → the conveyor.', concept: 'Choose the transfer by volume and frequency.', blocks: ['onprem', 'snow', 'datasync', 's3'], conns: ['c_op_snow', 'c_snow_s3', 'c_op_ds', 'c_ds_s3'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Move 100 TB once, over a slow link, fastest?', options: ['AWS Snowball (offline device)', 'Upload over the internet', 'A read replica', 'A NAT gateway'], correct: [0], explain: 'Snow devices beat the wire for big one-off transfers.' },
    { kind: 'single', prompt: 'Continuously sync on-prem files to S3/EFS over the network?', options: ['AWS DataSync', 'Snowmobile', 'A security group', 'Route 53'], correct: [0], explain: 'DataSync is for online file transfer and ongoing sync.' },
    { kind: 'single', prompt: 'Migrate a relational database to AWS?', options: ['AWS Database Migration Service (DMS)', 'Snowball only', 'DataSync only', 'CloudFront'], correct: [0], explain: 'DMS migrates databases (often with SCT for engine changes).' },
    { kind: 'single', prompt: 'Why ship a Snow device instead of uploading?', options: ['Bandwidth/time: the network would take too long', 'It’s more secure than everything', 'It’s always cheaper', 'It avoids IAM'], correct: [0], explain: 'For huge datasets, physical transfer is faster than the link.' },
  ],
};

const compliance = {
  id: 'stay-compliant', title: 'Stay Compliant', examDomain: 'Design Secure Architectures',
  summary: 'An inspector that records the exact setup of every appliance and checks it against the rulebook, flagging breaches.',
  scenery: 'open',
  blocks: [
    C('resources', 'Your resources', 'compute', { pos: [-6, 0.7, 0] }, { name: 'The kitchen', prop: 'cook', pos: [-6, 0], yaw: 90 }, 'The resources whose config matters.', 'Your AWS resources and their settings.'),
    C('config', 'AWS Config', 'security', { pos: [-0.5, 0.7, 0] }, { name: 'The inspector', prop: 'securitydesk', pos: [-0.5, 0], yaw: -90 }, 'Records config and how it changes.', 'AWS Config; configuration recorder + rules.'),
    C('status', 'Compliance status', 'security', { pos: [3.5, 0.7, 0] }, { name: 'The rulebook board', prop: 'dashboard', pos: [3.5, 0], yaw: -90 }, 'Shows what’s compliant and what isn’t.', 'Config rules evaluation results.'),
  ],
  connections: [
    { id: 'c_res_config', from: 'resources', to: 'config', flow: 'data' },
    { id: 'c_config_status', from: 'config', to: 'status', flow: 'request' },
  ],
  stages: [
    { title: 'What’s actually configured?', focus: 'config', anim: 'pulse', animConn: 'c_res_config', narration: 'AWS Config records the configuration of every resource and tracks how it changes over time.', storyNarration: 'An inspector writes down the exact setup of every appliance, and notes every time someone tweaks one.', concept: 'Config = a configuration history of your resources.', blocks: ['resources', 'config'], conns: ['c_res_config'] },
    { title: 'Check against the rules', focus: 'status', anim: 'chain', chain: ['c_res_config', 'c_config_status'], narration: 'Config rules continuously evaluate resources — “no public S3”, “EBS encrypted” — and flag non-compliant ones.', storyNarration: 'The inspector checks each appliance against the rulebook and lights up anything that’s out of code.', concept: 'Config rules = continuous compliance checks.', blocks: ['resources', 'config', 'status'], conns: ['c_res_config', 'c_config_status'] },
    { title: 'Auto-remediate', focus: 'status', anim: 'pulse', animConn: 'c_config_status', narration: 'A non-compliant resource can trigger automatic remediation to put it back in line.', storyNarration: 'Catch an unplugged fridge and the system quietly switches it back on — no waiting for someone to notice.', concept: 'Drift can trigger automatic remediation.', blocks: ['resources', 'config', 'status'], conns: ['c_res_config', 'c_config_status'] },
    { title: 'Config vs CloudTrail', focus: 'config', narration: 'Config answers “what does this resource look like, and is it compliant?”; CloudTrail answers “who changed it?”.', storyNarration: 'The inspector’s notes say how each appliance is set; the door logbook says who came in and changed it.', concept: 'Config (state/compliance) vs CloudTrail (actions).', blocks: ['resources', 'config', 'status'], conns: ['c_res_config', 'c_config_status'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Track resource configuration over time and check compliance?', options: ['AWS Config', 'CloudTrail', 'CloudFront', 'A NAT gateway'], correct: [0], explain: 'Config records configuration state and evaluates rules.' },
    { kind: 'single', prompt: 'Continuously flag any S3 bucket that becomes public. Use…', options: ['An AWS Config rule', 'A security group', 'Route 53', 'An SQS queue'], correct: [0], explain: 'Config rules evaluate resources against desired settings.' },
    { kind: 'single', prompt: 'Config vs CloudTrail:', options: ['Config = resource state/compliance; CloudTrail = who did what', 'They are identical', 'Config = audit log', 'CloudTrail = config history'], correct: [0], explain: 'Different lenses: configuration state vs API actions.' },
    { kind: 'single', prompt: 'A non-compliant resource is found. Config can…', options: ['Trigger automatic remediation', 'Only email yearly', 'Do nothing ever', 'Delete the account'], correct: [0], explain: 'Config supports automatic remediation actions.' },
  ],
};

const ssm = {
  id: 'ssm-session', title: 'Access Without a Bastion', examDomain: 'Design Secure Architectures',
  summary: 'Reach the back room through a secure, logged hatch — no open door, no keys, nothing exposed to the street.',
  scenery: 'open',
  blocks: [
    C('admin', 'Admin', 'generic', { pos: [-6, 0.7, 0] }, { name: 'Admin', prop: 'customer', pos: [-6, 0], yaw: 90 }, 'An operator who needs shell access.', 'An administrator (authenticated by IAM).'),
    C('ssm', 'Session Manager', 'security', { pos: [-0.5, 0.7, 0] }, { name: 'Secure hatch', prop: 'securitydesk', pos: [-0.5, 0], yaw: -90 }, 'Opens a logged shell via the SSM agent + IAM.', 'SSM Session Manager; no inbound ports, no keys.'),
    C('server', 'Private server', 'compute', { pos: [3.5, 0.7, 0] }, { name: 'Back-of-house', prop: 'cook', pos: [3.5, 0], yaw: -90 }, 'A private instance — no public IP, no open SSH.', 'A private EC2 instance with the SSM agent.'),
  ],
  connections: [
    { id: 'c_admin_ssm', from: 'admin', to: 'ssm', flow: 'request' },
    { id: 'c_ssm_server', from: 'ssm', to: 'server', flow: 'network' },
  ],
  stages: [
    { title: 'A bastion is still a door', focus: 'admin', narration: 'A bastion host works, but it’s an SSH door you must harden, patch, key-manage and audit.', storyNarration: 'A guarded entrance helps, but it’s still a door that can be forced, and someone must mind it.', concept: 'A bastion adds an exposed entry point to manage.', blocks: ['admin', 'server'], conns: [] },
    { title: 'Connect through SSM', focus: 'ssm', anim: 'chain', chain: ['c_admin_ssm', 'c_ssm_server'], narration: 'SSM Session Manager opens a shell via the instance’s SSM agent and IAM — no inbound ports, no bastion, no SSH keys.', storyNarration: 'Staff reach the back room through a secure intercom hatch the building opens from inside — there’s no street door at all.', concept: 'Session Manager = no-bastion, no-inbound access.', blocks: ['admin', 'ssm', 'server'], conns: ['c_admin_ssm', 'c_ssm_server'] },
    { title: 'Logged and controlled', focus: 'ssm', anim: 'pulse', animConn: 'c_admin_ssm', narration: 'Every session is authorized by IAM and fully logged — who connected, when, and what they ran.', storyNarration: 'The hatch only opens for staff on the list, and records every visit and everything done.', concept: 'IAM-gated, fully-audited access.', blocks: ['admin', 'ssm', 'server'], conns: ['c_admin_ssm', 'c_ssm_server'] },
    { title: 'Even fully-private instances', focus: 'server', narration: 'It works for instances with no public IP (via VPC endpoints) — nothing is exposed to the internet at all.', storyNarration: 'Even the deepest back room with no outside wall is reachable through the hatch — and still invisible from the street.', concept: 'Secure access to fully-private instances.', blocks: ['admin', 'ssm', 'server'], conns: ['c_admin_ssm', 'c_ssm_server'] },
  ],
  quiz: [
    { kind: 'single', prompt: 'Get a shell on EC2 without SSH, a bastion, or open inbound ports?', options: ['SSM Session Manager', 'A public IP + SSH', 'A second bastion', 'A NAT gateway'], correct: [0], explain: 'Session Manager connects via the SSM agent + IAM, no inbound.' },
    { kind: 'single', prompt: 'Session Manager requires which inbound ports open?', options: ['None', 'Port 22', 'Port 443 from anywhere', 'All ports'], correct: [0], explain: 'It needs no inbound ports; the agent connects outbound.' },
    { kind: 'single', prompt: 'How is Session Manager access controlled and recorded?', options: ['IAM authorization + full session logging', 'A shared SSH key', 'It isn’t', 'A security group only'], correct: [0], explain: 'IAM authorizes; sessions are logged for audit.' },
    { kind: 'tapfix', prompt: 'You want admins to reach private instances without exposing SSH. Tap the right path.', tapTarget: 'ssm', explain: 'Session Manager gives keyless, no-inbound, audited access.' },
  ],
};

export const COURSE = {
  id: 'saa-c03',
  title: 'AWS Solutions Architect',
  topics: [kitchen, storage, iam, vpc, sqs, lambda, datastore, cache, cost, monitor, blockfile, fanout, dns, dr, containers, kms, edge, apigw, orchestrate, scaling, analytics, secrets, bill, aurora, networks, stateless, events, kinesis, storageclass, compute, hybrid, threats, accelerator, cognito, iac, audit, sgnacl, multiaz, messaging, scaleupout, egress, s3protect, govern, endpoints, backups, migrate, compliance, ssm],
};
