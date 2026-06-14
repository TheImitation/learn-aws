# Asset credits

3D models in `models/` are **CC0** (public domain) — no attribution required, but credited here as a
courtesy.

| File | Source | Author | License |
|------|--------|--------|---------|
| `human.glb` | [Poly Pizza](https://poly.pizza/m/c3Ibh9I3udk) | Quaternius | CC0 |

To add a model: drop a `.glb` into `models/` and register it in `MODELS` in
[`../src/props.js`](../src/props.js) keyed by prop kind (`url`, `scale`, `yaw`, `y`). It loads async
and swaps in over the procedural prop; if it fails to load, the procedural prop stays. Use models only
where the prop's colour isn't semantic (the people are `generic`), so the service-category colour
coding on the other props is preserved.
