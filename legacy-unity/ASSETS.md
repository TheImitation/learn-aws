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

## Story view — kitchen models (optional, drop-in)
The story view is a restaurant **kitchen service line**. If a model exists for a station it's used; otherwise
a stylized primitive prop is generated.

- Location: `Assets/_Project/Resources/Models/{key}` (a prefab, or an `.fbx` / `.glb` Unity imports)
- Suggested CC0 sources: Kenney **"Food Kit"** + **"Mini Characters"** / **"Blocky Characters"** + **"Furniture Kit"**
  (https://kenney.nl/assets — public domain, no attribution), or Quaternius.
- Author models roughly **1 unit** in size, centred, facing +Z. The loader auto-scales to fit.

Model keys (block kind → key):

| Station | Model key |
|------|------|
| The pass (ALB) | `pass` |
| Cook (EC2) | `cook` |
| Pantry (RDS primary/standby) | `pantry` |
| Grab-and-go (CloudFront) | `grabandgo` |
| Host stand (Route 53) | `host` |
| Customer (user) | `customer` |
| The one cook (single server) | `linecook` |
| Service door (IGW) | `servicedoor` |

Override per block with `BlockSpec.modelKey`.

## How it falls back
`AssetCatalog.LoadIcon` / `LoadModel` return null when a file is absent, so the app always runs:
no icons → labelled coloured cubes; no models → cubes in story view too. Nothing here is required.
