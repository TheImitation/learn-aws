using System.Collections.Generic;
using UnityEngine;
using LearnAWS.Content;

namespace LearnAWS.World
{
    /// <summary>
    /// Builds a topic's 3D world from its data and applies a journey stage by setting absolute visibility
    /// (so scrubbing and replay are trivial) plus the stage's animation.
    /// </summary>
    public sealed class TopicWorldBuilder : MonoBehaviour
    {
        private readonly Dictionary<string, BlockView> _blocks = new Dictionary<string, BlockView>();
        private readonly Dictionary<string, ContainerView> _containers = new Dictionary<string, ContainerView>();
        private readonly Dictionary<string, ConnectionView> _connections = new Dictionary<string, ConnectionView>();

        private TopicSpec _topic;
        private Transform _root;

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
        }

        public void ApplyStage(StageSpec stage)
        {
            foreach (var kv in _blocks)
            {
                bool vis = stage.visibleBlockIds.Contains(kv.Key);
                kv.Value.SetVisible(vis);
                if (vis) { kv.Value.SetDimmed(false); kv.Value.SetHighlighted(kv.Key == stage.focusBlockId); }
            }
            foreach (var kv in _containers)
            {
                bool vis = stage.visibleBlockIds.Contains(kv.Key);
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
                    if (!string.IsNullOrEmpty(stage.animationConnectionId) &&
                        _connections.TryGetValue(stage.animationConnectionId, out var pulseConn))
                        pulseConn.PlayPulse();
                    break;

                case StageAnimation.Spike:
                    if (_blocks.TryGetValue("ec2A2", out var scaled) && scaled.gameObject.activeSelf)
                        scaled.PlayPop();
                    if (_blocks.TryGetValue(stage.focusBlockId, out var spikeFocus) && spikeFocus.gameObject.activeSelf)
                        spikeFocus.Flash(new Color(0.85f, 0.25f, 0.2f));
                    break;

                case StageAnimation.Failover:
                    DimIfPresent("ec2A");
                    DimIfPresent("ec2A2");
                    DimIfPresent("rdsPrimary");
                    PulseIfPresent("c_alb_ec2B");
                    PulseIfPresent("c_ec2B_rds");
                    if (_blocks.TryGetValue("rdsStandby", out var standby) && standby.gameObject.activeSelf)
                        standby.Flash(new Color(0.45f, 0.85f, 0.5f), 2);
                    break;
            }
        }

        private void DimIfPresent(string id)
        {
            if (_blocks.TryGetValue(id, out var bv) && bv.gameObject.activeSelf) bv.SetDimmed(true);
        }

        private void PulseIfPresent(string id)
        {
            if (_connections.TryGetValue(id, out var cv) && cv.gameObject.activeSelf) cv.PlayPulse();
        }

        public BlockView Raycast(Ray ray)
        {
            if (Physics.Raycast(ray, out RaycastHit hit, 250f))
                return hit.transform.GetComponentInParent<BlockView>();
            return null;
        }

        public Vector3 FocusPointFor(string id)
        {
            var b = _topic != null ? _topic.GetBlock(id) : null;
            return b != null ? b.position + Vector3.up * 0.5f : new Vector3(0f, 1.2f, 0f);
        }

        public float FocusDistanceFor(string id)
        {
            var b = _topic != null ? _topic.GetBlock(id) : null;
            if (b == null) return 20f;
            if (b.isContainer) return Mathf.Clamp(Mathf.Max(b.size.x, b.size.z) * 1.9f, 12f, 40f);
            return 10f;
        }

        public void Clear()
        {
            _blocks.Clear();
            _containers.Clear();
            _connections.Clear();
            if (_root != null) Destroy(_root.gameObject);
            _root = null;
            _topic = null;
        }
    }
}
