# Setup & run (v1)

Target: **Unity 6 LTS** (6000.x) + URP. v1 is built to run on a **stock URP project with no extra packages
and no scene wiring** — it boots itself.

## 1. Create the project
1. Install Unity 6 LTS via Unity Hub.
2. New project → **Universal 3D (URP)** template.
3. Create it in this `learn-aws` folder (so `Assets/_Project` is included), **or** copy the `Assets/_Project`
   folder into your new project's `Assets/`.

## 2. Input handling (one setting)
v1 uses the legacy `Input` class so it runs with zero input setup. Ensure legacy input is enabled:
- Project Settings → Player → **Active Input Handling → "Both"** (or "Input Manager (Old)").
  If it's set to "Input System Package (New)" only, switch it to **Both** and restart the editor.

## 3. Run it
Open any scene (the template's `SampleScene` is fine) and press **Play**. The app auto-boots
(`RuntimeInitializeOnLoadMethod`): it disables the template camera, builds its own camera + UI + 3D world,
and opens the course map. There are **no prefabs, scenes, or assets to wire**.

Controls: **drag** to orbit · **scroll / pinch** to zoom · **right-drag** to pan · **click a block** to inspect it.

## 4. Environment defines — this keeps ads out of local builds
Ads only ever run in **Production** builds. Use Build Profiles (File → Build Profiles) or Scripting Define Symbols:
- **Development** (Editor / default): no define.
- **Staging**: define `STAGING`.
- **Production**: define `PRODUCTION`.

The Editor is always Development, so ads never run while you work locally — you'll just see console logs like
`[Ads] (no-op) would show INTERSTITIAL at TopicCompleted`.

## 5. Sanity check
On Play the console logs `NoOpAdService initialized`. UI ad placeholders appear ("Banner ad — production only",
etc.) but no real ads load.

## Production swaps (later milestones — all behind existing seams)
- **UI**: IMGUI → uGUI / UI Toolkit (touch-friendly, styled).
- **Input**: legacy → New Input System provider (implement `IInputProvider`).
- **Content**: code catalog → ScriptableObjects / JSON (behind `SolutionsArchitectContent`).
- **Art**: primitive blocks → modelled assets (swap meshes/materials; logic untouched).
- **Ads (M6)**: `NoOpAdService` → real SDK (LevelPlay / AdMob) + consent (UMP / ATT) + remove-ads IAP.
