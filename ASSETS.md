# Visual assets

The app runs with plain coloured blocks out of the box. Drop in real assets and it uses them automatically —
no code changes. Two slots, both loaded from `Assets/_Project/Resources/` at runtime via `AssetCatalog`.

## Architecture view — AWS service icons (already wired)
Each service block shows its official AWS icon on a billboarded card.

- Location: `Assets/_Project/Resources/Icons/{Key}.png`
- Populate locally: **`bash scripts/fetch-assets.sh`**
- Source: AWS Architecture Icons (https://aws.amazon.com/architecture/icons/), fetched via
  awslabs/aws-icons-for-plantuml. They are **gitignored** (not redistributed here) — review AWS's icon
  terms before publishing the app.

Key mapping (block kind → file):

| Block | Icon file |
|------|------|
| EC2 web server | `EC2.png` |
| The one server | `Server.png` |
| RDS primary / standby | `RDS.png` |
| Application Load Balancer | `ELB.png` |
| CloudFront | `CloudFront.png` |
| Route 53 | `Route53.png` |
| Internet gateway | `InternetGateway.png` |

(`VPC`, `Region`, `AutoScaling`, `NATGateway` are also fetched for future use.)
Override per block with `BlockSpec.iconKey`; otherwise it's derived from the block kind.

## Story view — low-poly building models (optional, drop-in)
In story view each service becomes a building. If a model exists it's used; otherwise the coloured cube remains.

- Location: `Assets/_Project/Resources/Models/{key}` (a prefab, or an `.fbx` / `.glb` Unity imports)
- Suggested CC0 source: Kenney "City Kit" / "Building Kit" (https://kenney.nl/assets — public domain),
  or Quaternius. No attribution required for CC0.
- Author models roughly **1 unit** in size, centred, facing +Z. The loader auto-scales to fit, but a sane base helps.

Model keys (block kind → key):

| Building | Model key |
|------|------|
| Front desk (ALB) | `frontdesk` |
| Worker (EC2) | `worker` |
| Records office (RDS) | `records` |
| Pickup point (CloudFront) | `kiosk` |
| Signpost (Route 53) | `signpost` |
| Visitor (user) | `person` |
| The one shop | `shop` |
| Road to outside (IGW) | `gate` |

Override per block with `BlockSpec.modelKey`.

## How it falls back
`AssetCatalog.LoadIcon` / `LoadModel` return null when a file is absent, so the app always runs:
no icons → labelled coloured cubes; no models → cubes in story view too. Nothing here is required.
