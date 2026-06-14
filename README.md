# Learn AWS — interactive certification trainer

A browser-based, 3D interactive trainer for AWS certifications, starting with **Solutions Architect
(SAA-C03)**. Each topic is taught twice, side by side, and you can switch between the two at any time:

- **Story view** — an immersive restaurant. AWS is the storefront; the lesson plays out behind the
  scenes (the kitchen, the larder, the bouncer on the door, the ticket rail). Work *flows* through
  the scene: couriers carry orders, queues buffer a rush, a kitchen floods and service reroutes.
- **Architecture view** — the real AWS topology as a wireframe: Region → Availability Zones → VPC →
  subnets, with the actual services placed inside.

Every topic runs one loop: **explore (free camera) → learn (plain-language narration, with a
highlighted KEY POINT) → watch it happen (replayable, scrubbable, journey-driven animation) →
assess (multiple-choice + tap-to-fix in the 3D scene) → track mastery** (saved locally).

A **Tangible ⇄ Real** inspector flips any element from its grounded analogy to the real AWS artifact
(ARN, CIDR range, security-group rule, IAM), and an **Analogy** toggle surfaces the other view's
explanation from whichever view you're in.

## Topics

1. **Build a Highly Available Web App** — single server → Region/AZs → VPC/subnets → EC2 → ALB →
   Auto Scaling → Multi-AZ RDS → CloudFront/Route 53, ending in a "survive losing a whole AZ" payoff.
2. **Store & Serve Content** — S3, CloudFront, Glacier.
3. **Secure Access with IAM** — root, least privilege, roles, MFA.
4. **Network Boundaries** — private subnets, security groups, a bastion host.
5. **Decouple with a Queue** — SQS, scaling consumers, dead-letter queues.

## Run it

It's a static site with **no build step** (vendored Three.js + ES modules). Serve `web/` with any
static file server, for example:

```bash
python3 -m http.server 8080 --directory web
# open http://localhost:8080
```

(`.claude/launch.json` defines the same server under the name `web` for the in-editor preview.)

## Structure

```
web/
  index.html        # importmap + UI overlay
  styles.css        # dark UI
  src/
    content.js      # all course data (topics, blocks, connections, stages, quizzes) — author here
    props.js        # procedural 3D props, travelling tokens and couriers
    world.js        # scene building, per-stage visibility, the beat-script animation system
    journey.js      # stage stepping + camera framing
    main.js         # three.js setup, screens, inspector, assessment, progress
  vendor/           # three.js r0.160 (module + OrbitControls + CSS2DRenderer)
```

### Adding a topic or animating a stage
Add a topic object to `content.js` (blocks carry both an `arch` position and a `story` prop). A stage
animates from its `anim` shorthand (`overload` / `failover` / `spike` / `pulse` / `chain`), or you can
author bespoke choreography with `script: [ ...beats ]` — beat types `carry`, `flow`, `flood`,
`pulse`, `pop`, `shake`, `bob`. See the failover stage of topic 1 for a worked example.

## Legacy Unity prototype

This started as a Unity app; that project now lives in [`legacy-unity/`](legacy-unity/). It's
superseded by the web app (which is far faster to iterate on and distributes as a URL) but kept for
reference — all of its conceptual work carries over as data.
