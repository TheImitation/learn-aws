using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using LearnAWS.Content;

namespace LearnAWS.World
{
    /// <summary>Which world representation is shown. Same data, two layouts the learner toggles between.</summary>
    public enum WorldViewMode
    {
        Architecture, // the technical drawing: Region / VPC / subnets, real topology
        Story         // the narrative "town": visitor -> signpost -> front desk -> workers -> records office
    }

    /// <summary>
    /// Builds a topic's 3D world and applies a journey stage by setting absolute visibility (so scrubbing and
    /// replay are trivial) plus the stage's animation. Supports switching between the Architecture and Story
    /// layouts: blocks reposition + relabel, technical containers hide in favour of town scenery, and
    /// connections re-route — all from the same TopicSpec.
    /// </summary>
    public sealed class TopicWorldBuilder : MonoBehaviour
    {
        private readonly Dictionary<string, BlockView> _blocks = new Dictionary<string, BlockView>();
        private readonly Dictionary<string, ContainerView> _containers = new Dictionary<string, ContainerView>();
        private readonly Dictionary<string, ConnectionView> _connections = new Dictionary<string, ConnectionView>();

        private TopicSpec _topic;
        private Transform _root;
        private GameObject _scenery;
        private WorldViewMode _mode = WorldViewMode.Architecture;

        public WorldViewMode Mode => _mode;

        public void Build(TopicSpec topic)
        {
            Clear();
            _topic = topic;
            _root = new GameObject("TopicWorld").transform;

            foreach (var spec in topic.blocks)
            {
                if (spec.isContainer)
                {
                    var cv = new GameObject("ctr_" + spec.id).AddComponent<ContainerView>();
                    cv.Build(spec, _root);
                    cv.SetVisible(false);
                    _containers[spec.id] = cv;
                }
                else
                {
                    var bv = new GameObject("blk_" + spec.id).AddComponent<BlockView>();
                    bv.Build(spec, _root);
                    bv.SetVisible(false);
                    _blocks[spec.id] = bv;
                }
            }

            foreach (var conn in topic.connections)
            {
                var from = topic.GetBlock(conn.fromBlockId);
                var to = topic.GetBlock(conn.toBlockId);
                if (from == null || to == null) continue;
                var cv = new GameObject("con_" + conn.id).AddComponent<ConnectionView>();
                cv.Build(conn, from.position + Vector3.up * 0.35f, to.position + Vector3.up * 0.35f, _root);
                cv.SetVisible(false);
                _connections[conn.id] = cv;
            }

            BuildScenery();
            SetViewMode(WorldViewMode.Architecture);
        }

        // ---------- view switching ----------
        public void SetViewMode(WorldViewMode mode)
        {
            _mode = mode;
            RepositionAll();
            if (_scenery != null) _scenery.SetActive(mode == WorldViewMode.Story);
        }

        private void RepositionAll()
        {
            foreach (var kv in _blocks)
            {
                var spec = _topic.GetBlock(kv.Key);
                if (spec == null) continue;
                kv.Value.SetWorldPosition(_mode == WorldViewMode.Story ? spec.storyPosition : spec.position);
                bool useStoryName = _mode == WorldViewMode.Story && !string.IsNullOrEmpty(spec.storyName);
                kv.Value.SetLabel(useStoryName ? spec.storyName : spec.displayName);
                kv.Value.SetVisualMode(_mode == WorldViewMode.Story);
            }

            foreach (var kv in _connections)
            {
                var spec = kv.Value.Spec;
                var from = _topic.GetBlock(spec.fromBlockId);
                var to = _topic.GetBlock(spec.toBlockId);
                if (from == null || to == null) continue;
                kv.Value.SetEndpoints(BlockPos(from) + Vector3.up * 0.35f, BlockPos(to) + Vector3.up * 0.35f);
            }
        }

        private Vector3 BlockPos(BlockSpec b) => _mode == WorldViewMode.Story ? b.storyPosition : b.position;

        private void BuildScenery()
        {
            _scenery = new GameObject("StoryScenery");
            _scenery.transform.SetParent(_root, false);

            if (_topic != null && _topic.sceneryStyle == StorySceneryStyle.KitchenLines)
            {
                AddPad(new Vector3(-1.5f, -0.04f, 0f), new Vector3(16f, 0.08f, 8.5f), new Color(0.15f, 0.15f, 0.17f));  // floor
                AddPad(new Vector3(2.6f, 0.0f, -2.2f), new Vector3(7.6f, 0.06f, 1.8f), new Color(0.22f, 0.27f, 0.33f)); // line A
                AddPad(new Vector3(2.6f, 0.0f, 2.2f), new Vector3(7.6f, 0.06f, 1.8f), new Color(0.20f, 0.30f, 0.24f));  // line B
                AddPad(new Vector3(-6.0f, 0.0f, 0f), new Vector3(3.2f, 0.06f, 4.6f), new Color(0.27f, 0.24f, 0.20f));   // front of house
                AddSceneryLabel("Kitchen line A", new Vector3(2.6f, 0.7f, -3.4f));
                AddSceneryLabel("Kitchen line B", new Vector3(2.6f, 0.7f, 3.4f));
                AddSceneryLabel("Front of house", new Vector3(-6.0f, 0.7f, 2.7f));
            }
            else
            {
                AddPad(new Vector3(-1.5f, -0.04f, 0f), new Vector3(16f, 0.08f, 8f), new Color(0.15f, 0.15f, 0.17f));    // floor
                AddPad(new Vector3(3.0f, 0.0f, 0f), new Vector3(7f, 0.06f, 5f), new Color(0.24f, 0.22f, 0.18f));        // the store
                AddPad(new Vector3(-5.5f, 0.0f, 0f), new Vector3(3.2f, 0.06f, 4.6f), new Color(0.20f, 0.24f, 0.27f));   // service area
                AddSceneryLabel("The store", new Vector3(3.0f, 0.7f, 2.9f));
                AddSceneryLabel("Service area", new Vector3(-5.5f, 0.7f, 2.7f));
            }

            _scenery.SetActive(false);
        }

        private void AddPad(Vector3 center, Vector3 size, Color color)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = "pad";
            var col = go.GetComponent<Collider>();
            if (col != null) Destroy(col);
            go.transform.SetParent(_scenery.transform, false);
            go.transform.position = center;
            go.transform.localScale = size;
            go.GetComponent<Renderer>().material = MaterialFactory.CreateLit(color);
        }

        private void AddSceneryLabel(string text, Vector3 pos)
        {
            var tm = Billboard.MakeLabel(_scenery.transform, text, pos);
            tm.gameObject.AddComponent<LabelBillboard>();
        }

        // ---------- per-stage ----------
        public void ApplyStage(StageSpec stage)
        {
            StopAllCoroutines(); // cancel any in-flight chain/failover from the previous stage

            foreach (var kv in _blocks)
            {
                bool vis = stage.visibleBlockIds.Contains(kv.Key);
                kv.Value.SetVisible(vis);
                if (vis) { kv.Value.SetDimmed(false); kv.Value.SetHighlighted(kv.Key == stage.focusBlockId); }
            }
            foreach (var kv in _containers)
            {
                bool vis = _mode == WorldViewMode.Architecture && stage.visibleBlockIds.Contains(kv.Key);
                kv.Value.SetVisible(vis);
                if (vis) kv.Value.SetDimmed(false);
            }
            foreach (var kv in _connections)
            {
                bool vis = stage.visibleConnectionIds.Contains(kv.Key);
                kv.Value.SetVisible(vis);
                if (vis) kv.Value.SetDimmed(false);
            }

            switch (stage.animation)
            {
                case StageAnimation.Pulse:
                    PulseIfPresent(stage.animationConnectionId);
                    break;

                case StageAnimation.Spike:
                    if (_blocks.TryGetValue("ec2A2", out var scaled) && scaled.gameObject.activeSelf) scaled.PlayPop();
                    PulseIfPresent("c_alb_ec2A2");
                    break;

                case StageAnimation.Overload:
                    BurstIfPresent("c_user_server", 6);
                    if (_blocks.TryGetValue(stage.focusBlockId, out var swamped) && swamped.gameObject.activeSelf)
                    {
                        swamped.Shake(1.4f);
                        swamped.Flash(new Color(0.85f, 0.25f, 0.2f), 4);
                    }
                    break;

                case StageAnimation.Chain:
                    StartCoroutine(ChainRoutine(stage.animationChainConnectionIds));
                    break;

                case StageAnimation.Failover:
                    StartCoroutine(FailoverRoutine());
                    break;
            }
        }

        private IEnumerator ChainRoutine(List<string> ids)
        {
            if (ids == null) yield break;
            foreach (var id in ids)
            {
                PulseIfPresent(id);
                yield return new WaitForSeconds(0.45f);
            }
        }

        private IEnumerator FailoverRoutine()
        {
            DimIfPresent("ec2A");
            DimIfPresent("ec2A2");
            DimIfPresent("rdsPrimary");
            ShakeIfPresent("ec2A");
            ShakeIfPresent("rdsPrimary");
            yield return new WaitForSeconds(0.7f);

            PulseIfPresent("c_alb_ec2B");
            yield return new WaitForSeconds(0.5f);
            PulseIfPresent("c_ec2B_rds");

            if (_blocks.TryGetValue("rdsStandby", out var standby) && standby.gameObject.activeSelf)
            {
                standby.PlayPop();
                standby.Flash(new Color(0.45f, 0.85f, 0.5f), 3);
            }
        }

        private void PulseIfPresent(string id)
        {
            if (!string.IsNullOrEmpty(id) && _connections.TryGetValue(id, out var cv) && cv.gameObject.activeSelf) cv.PlayPulse();
        }

        private void BurstIfPresent(string id, int count)
        {
            if (_connections.TryGetValue(id, out var cv) && cv.gameObject.activeSelf) cv.PlayBurst(count);
        }

        private void DimIfPresent(string id)
        {
            if (_blocks.TryGetValue(id, out var bv) && bv.gameObject.activeSelf) bv.SetDimmed(true);
        }

        private void ShakeIfPresent(string id)
        {
            if (_blocks.TryGetValue(id, out var bv) && bv.gameObject.activeSelf) bv.Shake(0.7f);
        }

        // ---------- queries ----------
        public BlockView Raycast(Ray ray)
        {
            if (Physics.Raycast(ray, out RaycastHit hit, 250f))
                return hit.transform.GetComponentInParent<BlockView>();
            return null;
        }

        public Vector3 FocusPointFor(string id)
        {
            var b = _topic != null ? _topic.GetBlock(id) : null;
            if (b == null) return new Vector3(0f, 1.2f, 0f);
            return BlockPos(b) + Vector3.up * 0.5f;
        }

        public float FocusDistanceFor(string id)
        {
            var b = _topic != null ? _topic.GetBlock(id) : null;
            if (b == null) return _mode == WorldViewMode.Story ? 16f : 20f;
            if (_mode == WorldViewMode.Story) return b.isContainer ? 16f : 9f;
            if (b.isContainer) return Mathf.Clamp(Mathf.Max(b.size.x, b.size.z) * 1.9f, 12f, 40f);
            return 10f;
        }

        public void Clear()
        {
            StopAllCoroutines();
            _blocks.Clear();
            _containers.Clear();
            _connections.Clear();
            _scenery = null;
            if (_root != null) Destroy(_root.gameObject);
            _root = null;
            _topic = null;
            _mode = WorldViewMode.Architecture;
        }
    }
}
