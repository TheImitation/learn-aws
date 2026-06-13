using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using LearnAWS.Content;

namespace LearnAWS.World
{
    internal static class Billboard
    {
        public static void Face(Transform t)
        {
            var cam = Camera.main;
            if (cam != null) t.rotation = cam.transform.rotation;
        }

        public static TextMesh MakeLabel(Transform parent, string text, Vector3 localPos)
        {
            var go = new GameObject("Label");
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPos;
            var tm = go.AddComponent<TextMesh>();
            var mr = go.GetComponent<MeshRenderer>();
            if (mr == null) mr = go.AddComponent<MeshRenderer>();
            tm.text = text;
            tm.fontSize = 48;
            tm.characterSize = 0.055f;
            tm.anchor = TextAnchor.MiddleCenter;
            tm.alignment = TextAlignment.Center;
            tm.color = Color.white;
            var font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            if (font != null)
            {
                tm.font = font;
                mr.material = font.material;
            }
            return tm;
        }
    }

    /// <summary>Keeps a standalone label (e.g. scenery text) facing the camera.</summary>
    internal sealed class LabelBillboard : MonoBehaviour
    {
        private void LateUpdate() => Billboard.Face(transform);
    }

    /// <summary>
    /// A placed service. Architecture view = coloured cube + AWS icon card; Story view = a low-poly model
    /// (if one is provided in Resources/Models) else the cube. Selectable via raycast for the inspector.
    /// </summary>
    public sealed class BlockView : MonoBehaviour
    {
        public BlockSpec Spec { get; private set; }

        private Transform _body;
        private Renderer _renderer;
        private TextMesh _label;
        private Color _baseColor;
        private Vector3 _baseScale;
        private GameObject _model;
        private GameObject _iconCard;

        public void Build(BlockSpec spec, Transform parent)
        {
            Spec = spec;
            transform.SetParent(parent, false);
            transform.position = spec.position;

            var body = GameObject.CreatePrimitive(PrimitiveType.Cube);
            body.name = "Body";
            _body = body.transform;
            _body.SetParent(transform, false);
            _baseScale = new Vector3(1.1f, 1.1f, 1.1f);
            _body.localScale = _baseScale;
            _baseColor = MaterialFactory.ColorForCategory(spec.category);
            _renderer = body.GetComponent<Renderer>();
            _renderer.material = MaterialFactory.CreateLit(_baseColor);

            // Story-view building: a dropped-in model if present, else a generated stylized building.
            var prefab = AssetCatalog.LoadModel(AssetCatalog.ModelKeyFor(spec));
            if (prefab != null)
            {
                _model = Instantiate(prefab, _body);
                _model.transform.localPosition = Vector3.zero;
                _model.transform.localRotation = Quaternion.identity;
                foreach (var col in _model.GetComponentsInChildren<Collider>()) Destroy(col);
                FitModel(_model, 1.1f);
            }
            else
            {
                string prop = !string.IsNullOrEmpty(spec.storyProp) ? spec.storyProp : StoryBuildingFactory.DefaultStoryProp(spec.kind);
                _model = StoryBuildingFactory.Create(prop, _baseColor, _body);
            }
            if (_model != null) _model.SetActive(false);

            // Optional AWS service icon shown in architecture view.
            var icon = AssetCatalog.LoadIcon(AssetCatalog.IconKeyFor(spec));
            if (icon != null)
            {
                var card = GameObject.CreatePrimitive(PrimitiveType.Quad);
                card.name = "Icon";
                var cc = card.GetComponent<Collider>();
                if (cc != null) Destroy(cc);
                card.transform.SetParent(transform, false);
                card.transform.localPosition = new Vector3(0f, 1.8f, 0f);
                card.transform.localScale = Vector3.one * 1.25f;
                card.GetComponent<Renderer>().material = MaterialFactory.CreateIconMaterial(icon);
                _iconCard = card;
            }

            _label = Billboard.MakeLabel(transform, spec.displayName, new Vector3(0f, 1.05f, 0f));
            SetVisualMode(false);
        }

        private static void FitModel(GameObject m, float target)
        {
            var rends = m.GetComponentsInChildren<Renderer>();
            if (rends.Length == 0) return;
            Bounds b = rends[0].bounds;
            for (int i = 1; i < rends.Length; i++) b.Encapsulate(rends[i].bounds);
            float maxd = Mathf.Max(b.size.x, b.size.y, b.size.z);
            if (maxd > 0.0001f) m.transform.localScale *= target / maxd;
        }

        /// <summary>Swap visual emphasis: architecture (cube + icon) vs story (model if present).</summary>
        public void SetVisualMode(bool story)
        {
            bool hasModel = _model != null;
            if (_renderer != null) _renderer.enabled = !(story && hasModel);
            if (_model != null) _model.SetActive(story);
            if (_iconCard != null) _iconCard.SetActive(!story);
        }

        private void LateUpdate()
        {
            if (_label != null) Billboard.Face(_label.transform);
            if (_iconCard != null) Billboard.Face(_iconCard.transform);
        }

        public void SetVisible(bool v) => gameObject.SetActive(v);

        public void SetDimmed(bool d)
        {
            if (_renderer == null) return;
            Color c = d ? new Color(_baseColor.r * 0.32f, _baseColor.g * 0.32f, _baseColor.b * 0.32f, _baseColor.a) : _baseColor;
            SetColor(c);
        }

        public void SetHighlighted(bool h)
        {
            if (_body != null) _body.localScale = h ? _baseScale * 1.16f : _baseScale;
        }

        public void SetWorldPosition(Vector3 worldPos) => transform.position = worldPos;

        public void SetLabel(string text)
        {
            if (_label != null) _label.text = text;
        }

        public void Flash(Color color, int times = 3)
        {
            if (isActiveAndEnabled) StartCoroutine(FlashRoutine(color, times));
        }

        private IEnumerator FlashRoutine(Color color, int times)
        {
            for (int i = 0; i < times; i++)
            {
                SetColor(color);
                yield return new WaitForSeconds(0.16f);
                SetColor(_baseColor);
                yield return new WaitForSeconds(0.16f);
            }
        }

        private void SetColor(Color c)
        {
            if (_renderer == null) return;
            _renderer.material.color = c;
            if (_renderer.material.HasProperty("_BaseColor")) _renderer.material.SetColor("_BaseColor", c);
        }

        public void PlayPop()
        {
            if (isActiveAndEnabled) StartCoroutine(PopRoutine());
        }

        private IEnumerator PopRoutine()
        {
            float t = 0f;
            while (t < 1f)
            {
                t += Time.deltaTime * 4f;
                if (_body != null) _body.localScale = _baseScale * Mathf.SmoothStep(0.1f, 1f, t);
                yield return null;
            }
            if (_body != null) _body.localScale = _baseScale;
        }

        public void Shake(float duration = 1f, float magnitude = 0.12f)
        {
            if (isActiveAndEnabled) StartCoroutine(ShakeRoutine(duration, magnitude));
        }

        private IEnumerator ShakeRoutine(float duration, float magnitude)
        {
            float t = 0f;
            while (t < duration)
            {
                t += Time.deltaTime;
                if (_body != null) _body.localPosition = Random.insideUnitSphere * magnitude;
                yield return null;
            }
            if (_body != null) _body.localPosition = Vector3.zero;
        }
    }

    /// <summary>A container (Region / VPC / subnet / ASG) drawn as a wireframe plot — a fence you can see the size of.</summary>
    public sealed class ContainerView : MonoBehaviour
    {
        public BlockSpec Spec { get; private set; }

        private readonly List<LineRenderer> _edges = new List<LineRenderer>();
        private Color _color;
        private TextMesh _label;

        public void Build(BlockSpec spec, Transform parent)
        {
            Spec = spec;
            transform.SetParent(parent, false);
            transform.position = Vector3.zero;

            _color = MaterialFactory.ColorForContainer(spec.kind);
            var mat = MaterialFactory.CreateLineMaterial(_color);

            Vector3 c = spec.position;
            Vector3 h = spec.size * 0.5f;
            Vector3[] k =
            {
                c + new Vector3(-h.x, -h.y, -h.z), c + new Vector3(h.x, -h.y, -h.z),
                c + new Vector3(h.x, -h.y, h.z),  c + new Vector3(-h.x, -h.y, h.z),
                c + new Vector3(-h.x, h.y, -h.z),  c + new Vector3(h.x, h.y, -h.z),
                c + new Vector3(h.x, h.y, h.z),   c + new Vector3(-h.x, h.y, h.z)
            };
            int[,] edges =
            {
                {0,1},{1,2},{2,3},{3,0},
                {4,5},{5,6},{6,7},{7,4},
                {0,4},{1,5},{2,6},{3,7}
            };
            for (int i = 0; i < edges.GetLength(0); i++)
                AddEdge(mat, k[edges[i, 0]], k[edges[i, 1]]);

            string labelText = spec.displayName;
            if (spec.cidr != null) labelText += "  " + spec.cidr.ToCidrString();
            _label = Billboard.MakeLabel(transform, labelText, c + new Vector3(0f, h.y + 0.25f, 0f));
        }

        private void AddEdge(Material mat, Vector3 a, Vector3 b)
        {
            var go = new GameObject("edge");
            go.transform.SetParent(transform, false);
            var lr = go.AddComponent<LineRenderer>();
            lr.useWorldSpace = true;
            lr.positionCount = 2;
            lr.SetPosition(0, a);
            lr.SetPosition(1, b);
            lr.widthMultiplier = 0.04f;
            lr.material = mat;
            lr.startColor = lr.endColor = _color;
            lr.numCapVertices = 0;
            _edges.Add(lr);
        }

        private void LateUpdate()
        {
            if (_label != null) Billboard.Face(_label.transform);
        }

        public void SetVisible(bool v) => gameObject.SetActive(v);

        public void SetDimmed(bool d)
        {
            Color c = d ? new Color(_color.r, _color.g, _color.b, 0.25f) * 0.5f : _color;
            foreach (var lr in _edges) lr.startColor = lr.endColor = c;
        }
    }

    /// <summary>A line between two blocks with a travelling pulse — the "request/data flow" animation.</summary>
    public sealed class ConnectionView : MonoBehaviour
    {
        public ConnectionSpec Spec { get; private set; }

        private LineRenderer _line;
        private Transform _pulse;
        private Vector3 _from;
        private Vector3 _to;
        private Color _color;
        private Coroutine _running;

        public void Build(ConnectionSpec spec, Vector3 from, Vector3 to, Transform parent)
        {
            Spec = spec;
            transform.SetParent(parent, false);
            _from = from;
            _to = to;
            _color = ColorForFlow(spec.flow);

            _line = gameObject.AddComponent<LineRenderer>();
            _line.useWorldSpace = true;
            _line.positionCount = 2;
            _line.SetPosition(0, from);
            _line.SetPosition(1, to);
            _line.widthMultiplier = 0.05f;
            _line.material = MaterialFactory.CreateLineMaterial(_color);
            _line.startColor = _line.endColor = _color;
            _line.numCapVertices = 2;

            var sphere = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            sphere.name = "Pulse";
            var col = sphere.GetComponent<Collider>();
            if (col != null) Destroy(col);
            sphere.transform.SetParent(transform, false);
            sphere.transform.localScale = Vector3.one * 0.22f;
            sphere.GetComponent<Renderer>().material = MaterialFactory.CreateUnlit(Color.white);
            _pulse = sphere.transform;
            _pulse.gameObject.SetActive(false);
        }

        private static Color ColorForFlow(ConnectionFlowKind flow)
        {
            switch (flow)
            {
                case ConnectionFlowKind.Data: return new Color(0.4f, 0.85f, 0.5f);
                case ConnectionFlowKind.Replication: return new Color(0.65f, 0.5f, 0.9f);
                case ConnectionFlowKind.Network: return new Color(0.7f, 0.7f, 0.75f);
                default: return new Color(0.4f, 0.8f, 1f);
            }
        }

        public void SetVisible(bool v) => gameObject.SetActive(v);

        public void SetDimmed(bool d)
        {
            Color c = d ? new Color(0.5f, 0.5f, 0.5f) : _color;
            if (_line != null) _line.startColor = _line.endColor = c;
        }

        public void SetEndpoints(Vector3 from, Vector3 to)
        {
            _from = from;
            _to = to;
            if (_line != null)
            {
                _line.SetPosition(0, from);
                _line.SetPosition(1, to);
            }
        }

        public void PlayPulse() => StartMotion(MovePulse(1.2f));

        /// <summary>Several quick pulses in a row — used to show a flood of arrivals.</summary>
        public void PlayBurst(int count = 5) => StartMotion(BurstRoutine(count));

        private void StartMotion(IEnumerator routine)
        {
            if (!isActiveAndEnabled) return;
            if (_running != null) StopCoroutine(_running);
            _running = StartCoroutine(routine);
        }

        private IEnumerator BurstRoutine(int count)
        {
            for (int i = 0; i < count; i++)
                yield return MovePulse(0.4f);
            _running = null;
        }

        private IEnumerator MovePulse(float duration)
        {
            _pulse.gameObject.SetActive(true);
            float t = 0f;
            while (t < 1f)
            {
                t += Time.deltaTime / Mathf.Max(0.05f, duration);
                _pulse.position = Vector3.Lerp(_from, _to, Mathf.Clamp01(t));
                yield return null;
            }
            _pulse.gameObject.SetActive(false);
        }
    }
}
