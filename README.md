# Learn AWS — interactive certification trainer (Unity)

A cross-platform (desktop + mobile) Unity app that teaches AWS certifications by letting learners
**assemble cloud architectures out of modular building blocks**. First cert: Solutions Architect (SAA-C03).

## The idea
- AWS services are **blocks** with typed ports; Region = baseplate, Availability Zone = tile,
  VPC = walled plot, subnet = fenced area; request/data flow = animated **pulses** along connectors.
- Connectors only complete when the architecture is valid, so wrong designs are physically obvious.
- Every topic runs one loop: **explore → learn → assemble & animate (replayable) → assess → track mastery.**

## Making integrations tangible
Hooking two services together requires three things to line up — **Address** (ARN / endpoint),
**Permission** (security group + IAM), **Route** (subnets / CIDR / route table). Each block carries a
nameplate (ARN), plot sign (CIDR), doorman + guest list (security group), badge (IAM) and numbered
doors (ports). A **Tangible ⇄ Real** inspector flips any element to its real AWS artifact, bridging
intuition into exam-ready syntax.

## Monetization (production only)
Ads run **only in Production builds** — never in the Editor or dev/staging (enforced by
`AppEnvironmentResolver` + `AdServiceFactory` + `AdGatekeeper`). Ads live in the "seams" (course map,
topic transitions, results) and as opt-in rewarded videos — **never during active learning**.
Freemium with a "remove ads / Pro" IAP.

## Status — v1 vertical slice implemented (runnable)
The full **"Build a Highly Available Web App"** topic runs end-to-end:
course map → 3D build journey (9 stages, replay + scrub, animated request flow and AZ-failover) →
**Tangible ⇄ Real** inspector → assessment (multiple-choice + tap-to-fix) → results → progress/mastery saved.

Built **code-first** to run on a stock Unity 6 URP project with **no extra packages and no scene setup**.
See [SETUP.md](SETUP.md): create a URP project, ensure legacy input is on, press Play.

## Visuals
The architecture view shows official **AWS service icons** on each block — run `bash scripts/fetch-assets.sh`
to fetch them locally (they're gitignored, not redistributed). The story view is a restaurant **kitchen
service line** and can use **low-poly kitchen models** dropped into `Resources/Models/`. Both fall back to
generated primitives if absent. See [ASSETS.md](ASSETS.md).

## Layout
```
Assets/_Project/Scripts/
  App/           AppRoot — bootstrap + screen flow (course map / topic / assessment / results)
  Core/          AppEnvironment, AppConfig
  Content/       AWS value types, content specs, and the Solutions Architect course (HA web app)
  Input/         IInputProvider + legacy provider (desktop + touch)
  World/         camera rig, materials, block/container/connection views, world builder
  Journey/       JourneyController — step / replay / scrub, drives world + camera
  Progress/      ProgressService — mastery + scores over IProgressStore
  Persistence/   IProgressStore, LocalJsonProgressStore, progress models
  Monetization/  IAdService, NoOp/Production services, AdServiceFactory, AdGatekeeper, AdPlacement
  UI/            IMGUI screens — course map, topic HUD, inspector, assessment, results
```
Each placeholder layer (IMGUI, legacy input, code content, primitive art, no-op ads) sits behind a
seam so it can be upgraded for production without touching the rest. See SETUP.md → "Production swaps".
