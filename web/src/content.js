// Course content (ported from the Unity SolutionsArchitectContent).
// arch.pos = [x,y,z] technical layout; container blocks also have arch.size = [w,h,d].
// story.pos = [x,z] on the floor; story.prop = procedural prop key (null = represented by scenery).

const C = (id, name, cat, arch, story, plain, real) => ({ id, name, cat, arch, story, plain, real });

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
    C('vpc', 'VPC', 'networking', { pos: [0, 1.1, 0.3], size: [12.6, 2.4, 8.2], container: true }, { name: 'The kitchen', prop: null, pos: [0, 0], yaw: 0 }, 'Your private network inside the region.', 'VPC 10.0.0.0/16 — carved into subnets.'),
    C('pubA', 'Public subnet A', 'networking', { pos: [-3.5, 0.8, -2.4], size: [5.6, 1.6, 3.2], container: true }, { name: 'Front of house A', prop: null, pos: [0, 0], yaw: 0 }, 'A subnet routed to the internet gateway.', 'Public subnet 10.0.0.0/24.'),
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
    C('s3', 'S3 bucket', 'storage', { pos: [1.5, 0.7, 0] }, { name: 'The larder', prop: 'larder', pos: [1.5, 0], yaw: -90 }, 'Virtually unlimited, durable object storage.', 'S3; ~11 nines of durability, copies across AZs.'),
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
    C('iam', 'IAM', 'security', { pos: [-2, 0.7, 0] }, { name: 'Security desk', prop: 'securitydesk', pos: [-2, 0], yaw: -90 }, 'Issues identities and decides who can do what.', 'IAM users, roles and policies.'),
    C('stockroom', 'Assets bucket', 'storage', { pos: [2.5, 0.7, -1.6] }, { name: 'Stockroom', prop: 'larder', pos: [2.5, -1.6], yaw: -90 }, 'A resource this identity may use.', 'An S3 bucket the policy permits.'),
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
    C('sg', 'Security group', 'security', { pos: [2, 0.7, 0] }, { name: 'Bouncer', prop: 'bouncer', pos: [2, 0], yaw: -90 }, 'Allows only specific traffic to the server.', 'Stateful, instance-level firewall; deny by default.'),
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
    C('queue', 'SQS queue', 'generic', { pos: [-1, 0.7, 0] }, { name: 'Ticket rail', prop: 'ticketrail', pos: [-1, 0], yaw: 0 }, 'Holds messages until a consumer is ready.', 'An SQS queue; messages wait, processed at-least-once.'),
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
    C('lambda', 'Lambda', 'compute', { pos: [1.5, 0.7, 0] }, { name: 'On-demand cook', prop: 'cook', pos: [1.5, 0], yaw: -90 }, 'Appears only when there is work; you manage no servers.', 'AWS Lambda; runs your code per event, auto-scaled.'),
    C('lambda2', 'Lambda (scaled)', 'compute', { pos: [4, 0.7, 1.6] }, { name: 'Extra cook', prop: 'cook', pos: [4, 1.6], yaw: -90 }, 'Another concurrent execution during a rush.', 'A concurrent Lambda execution.'),
    C('lambda3', 'Lambda (scaled)', 'compute', { pos: [4.3, 0.7, -1.6] }, { name: 'Extra cook', prop: 'cook', pos: [4.3, -1.6], yaw: -90 }, 'Another concurrent execution during a rush.', 'A concurrent Lambda execution.'),
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
    C('dynamo', 'DynamoDB', 'database', { pos: [2.2, 0.7, 1.7] }, { name: 'Numbered cubbies', prop: 'cubbies', pos: [2.2, 1.7], yaw: -90 }, 'Grab any item by its number instantly; endless cubbies.', 'DynamoDB; key-value/document NoSQL, single-digit-ms, scales horizontally.'),
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

export const COURSE = {
  id: 'saa-c03',
  title: 'AWS Solutions Architect',
  topics: [kitchen, storage, iam, vpc, sqs, lambda, datastore, cache, cost],
};
