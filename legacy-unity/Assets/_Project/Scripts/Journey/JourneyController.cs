using System;
using UnityEngine;
using LearnAWS.Content;
using LearnAWS.World;

namespace LearnAWS.Journey
{
    /// <summary>
    /// Drives the guided journey. Each stage sets the world's visibility + animation and frames the camera.
    /// Because stage visibility is absolute, Next/Prev/Replay/GoTo all work the same way — pure scrubbing.
    /// </summary>
    public sealed class JourneyController
    {
        private TopicSpec _topic;
        private TopicWorldBuilder _world;
        private OrbitCameraRig _camera;
        private int _index;

        public event Action<StageSpec> OnStageChanged;

        public TopicSpec Topic => _topic;
        public int CurrentIndex => _index;
        public int Count => _topic != null ? _topic.stages.Count : 0;
        public StageSpec Current => _topic != null ? _topic.stages[_index] : null;
        public bool IsFirst => _index == 0;
        public bool IsLast => _topic != null && _index == Count - 1;

        public void Begin(TopicSpec topic, TopicWorldBuilder world, OrbitCameraRig camera)
        {
            _topic = topic;
            _world = world;
            _camera = camera;
            _index = 0;
            _world.Build(topic);
            ApplyCurrent(instant: true);
        }

        public void Next() { if (!IsLast) { _index++; ApplyCurrent(); } }
        public void Prev() { if (!IsFirst) { _index--; ApplyCurrent(); } }
        public void Replay() => ApplyCurrent();
        public void GoTo(int index) { _index = Mathf.Clamp(index, 0, Count - 1); ApplyCurrent(); }

        private void ApplyCurrent(bool instant = false)
        {
            var stage = Current;
            if (stage == null) return;

            _world.ApplyStage(stage);
            if (_camera != null)
                _camera.FocusOn(_world.FocusPointFor(stage.focusBlockId), _world.FocusDistanceFor(stage.focusBlockId), instant);

            OnStageChanged?.Invoke(stage);
        }
    }
}
