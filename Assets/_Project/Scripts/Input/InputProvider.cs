using UnityEngine;

namespace LearnAWS.InputSys
{
    /// <summary>
    /// Camera/selection input behind a seam so platform specifics never leak into gameplay.
    /// v1 is backed by the legacy Input class (works on desktop + touch with zero setup); a New Input System
    /// provider can replace it later without touching callers.
    /// </summary>
    public interface IInputProvider
    {
        void Sample();
        Vector2 PointerPosition { get; }
        bool PrimaryPressed { get; }
        bool PrimaryHeld { get; }
        bool PrimaryReleased { get; }
        Vector2 DragDelta { get; }
        bool PanModifier { get; }
        float ZoomDelta { get; }
        int TouchCount { get; }
    }

    public sealed class LegacyInputProvider : IInputProvider
    {
        private Vector2 _last;
        private float _lastPinch;
        private bool _hadPinch;

        public Vector2 PointerPosition { get; private set; }
        public bool PrimaryPressed { get; private set; }
        public bool PrimaryHeld { get; private set; }
        public bool PrimaryReleased { get; private set; }
        public Vector2 DragDelta { get; private set; }
        public bool PanModifier { get; private set; }
        public float ZoomDelta { get; private set; }
        public int TouchCount { get; private set; }

        public void Sample()
        {
            Vector2 pointer = Input.mousePosition;
            PointerPosition = pointer;
            TouchCount = Input.touchCount;

            bool leftDown = Input.GetMouseButtonDown(0);
            PrimaryPressed = leftDown;
            PrimaryHeld = Input.GetMouseButton(0);
            PrimaryReleased = Input.GetMouseButtonUp(0);

            bool rightHeld = Input.GetMouseButton(1);
            PanModifier = rightHeld; // right-drag pans on desktop
            bool anyDown = leftDown || Input.GetMouseButtonDown(1);
            bool anyHeld = PrimaryHeld || rightHeld;

            if (anyDown)
            {
                _last = pointer;
                DragDelta = Vector2.zero;
            }
            else if (anyHeld)
            {
                DragDelta = pointer - _last;
                _last = pointer;
            }
            else
            {
                DragDelta = Vector2.zero;
                _last = pointer;
            }

            // Zoom: mouse wheel on desktop, pinch on mobile.
            float zoom = Input.mouseScrollDelta.y;
            if (TouchCount == 2)
            {
                float dist = (Input.GetTouch(0).position - Input.GetTouch(1).position).magnitude;
                if (_hadPinch) zoom += (dist - _lastPinch) * 0.02f;
                _lastPinch = dist;
                _hadPinch = true;
            }
            else
            {
                _hadPinch = false;
            }
            ZoomDelta = zoom;
        }
    }
}
