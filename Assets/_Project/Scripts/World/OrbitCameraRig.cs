using UnityEngine;
using LearnAWS.InputSys;

namespace LearnAWS.World
{
    /// <summary>
    /// Free-movement camera: drag to orbit, scroll/pinch to zoom, right-drag to pan.
    /// FocusOn smoothly frames a target (used when the journey advances), but any user input
    /// immediately takes back control — so learners can roam while a stage is being explained.
    /// </summary>
    public sealed class OrbitCameraRig : MonoBehaviour
    {
        public IInputProvider Input;
        public bool ControlEnabled = true;

        [SerializeField] private float orbitSpeed = 0.25f;
        [SerializeField] private float panSpeed = 0.0016f;
        [SerializeField] private float zoomSpeed = 1.4f;
        [SerializeField] private float minDistance = 4f;
        [SerializeField] private float maxDistance = 42f;
        [SerializeField] private float minPitch = 8f;
        [SerializeField] private float maxPitch = 84f;

        private Vector3 _focus = new Vector3(0f, 1.2f, 0f);
        private float _distance = 22f;
        private float _yaw = 0f;
        private float _pitch = 34f;

        private Vector3 _focusGoal;
        private float _distanceGoal;
        private bool _framing;

        private void Start()
        {
            _focusGoal = _focus;
            _distanceGoal = _distance;
            Apply();
        }

        public void FocusOn(Vector3 point, float distance, bool instant = false)
        {
            _focusGoal = point;
            _distanceGoal = Mathf.Clamp(distance, minDistance, maxDistance);
            if (instant)
            {
                _focus = _focusGoal;
                _distance = _distanceGoal;
                _framing = false;
                Apply();
            }
            else
            {
                _framing = true;
            }
        }

        private void Update()
        {
            bool userActed = false;

            if (ControlEnabled && Input != null)
            {
                if (Mathf.Abs(Input.ZoomDelta) > 0.001f)
                {
                    _distance = Mathf.Clamp(_distance - Input.ZoomDelta * zoomSpeed, minDistance, maxDistance);
                    userActed = true;
                }

                Vector2 drag = Input.DragDelta;
                if (drag.sqrMagnitude > 0.01f)
                {
                    if (Input.PanModifier)
                    {
                        Vector3 right = transform.right;
                        Vector3 up = transform.up;
                        _focus += (-right * drag.x - up * drag.y) * panSpeed * _distance;
                    }
                    else if (Input.PrimaryHeld)
                    {
                        _yaw += drag.x * orbitSpeed;
                        _pitch = Mathf.Clamp(_pitch - drag.y * orbitSpeed, minPitch, maxPitch);
                    }
                    userActed = true;
                }
            }

            if (userActed) _framing = false;

            if (_framing)
            {
                _focus = Vector3.Lerp(_focus, _focusGoal, Time.deltaTime * 4f);
                _distance = Mathf.Lerp(_distance, _distanceGoal, Time.deltaTime * 4f);
                if ((_focus - _focusGoal).sqrMagnitude < 0.0004f && Mathf.Abs(_distance - _distanceGoal) < 0.02f)
                    _framing = false;
            }

            Apply();
        }

        private void Apply()
        {
            Quaternion rot = Quaternion.Euler(_pitch, _yaw, 0f);
            Vector3 dir = rot * Vector3.forward;
            transform.position = _focus - dir * _distance;
            transform.rotation = rot;
        }
    }
}
