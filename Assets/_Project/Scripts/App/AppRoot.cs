using System;
using UnityEngine;
using LearnAWS.Core;
using LearnAWS.Monetization;
using LearnAWS.Persistence;
using LearnAWS.Content;
using LearnAWS.World;
using LearnAWS.Journey;
using LearnAWS.Progress;
using LearnAWS.InputSys;
using LearnAWS.UI;

namespace LearnAWS.App
{
    /// <summary>
    /// Single entry point. Builds the entire app from code (camera, light, services, content) so it runs in
    /// any scene on Play — then drives the screen flow: course map -> topic journey -> assessment -> results.
    /// </summary>
    public sealed class AppRoot : MonoBehaviour
    {
        public enum AppScreen { CourseMap, Topic, Assessment, Results }

        public const float BottomPanelH = 184f;
        public const float InspectorW = 372f;
        public const float AssessW = 466f;

        private Camera _camera;
        private OrbitCameraRig _rig;
        private IInputProvider _input;
        private ProgressService _progress;
        private AdGatekeeper _ads;
        private CourseSpec _course;
        private TopicWorldBuilder _world;
        private JourneyController _journey;

        private TopicSpec _topic;
        private AppScreen _screen = AppScreen.CourseMap;
        private string _selectedBlockId;
        private bool _inspectorOpen;
        private QuizResult _lastResult;

        private Vector2 _pressPos;
        private bool _pressOverUi;

        private readonly CourseMapView _courseMapView = new CourseMapView();
        private readonly TopicHudView _topicHud = new TopicHudView();
        private readonly InspectorView _inspector = new InspectorView();
        private readonly AssessmentView _assessmentView = new AssessmentView();
        private readonly ResultsView _resultsView = new ResultsView();

        // ---- public surface used by the UI views ----
        public ProgressService Progress => _progress;
        public CourseSpec Course => _course;
        public TopicSpec Topic => _topic;
        public JourneyController Journey => _journey;
        public AdGatekeeper Ads => _ads;
        public string SelectedBlockId => _selectedBlockId;
        public bool InspectorOpen => _inspectorOpen;
        public QuizResult LastResult => _lastResult;
        public string LastTappedBlockId { get; private set; }
        public void ClearTapped() => LastTappedBlockId = null;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void AutoBoot()
        {
            if (FindObjectOfType<AppRoot>() != null) return;
            new GameObject("LearnAWS").AddComponent<AppRoot>();
        }

        private void Awake()
        {
            DontDestroyOnLoad(gameObject);
            RenderSettings.ambientLight = new Color(0.45f, 0.46f, 0.5f);

            // Take over rendering from any camera already in the scene (e.g. the URP template's Main Camera).
            foreach (var existing in FindObjectsOfType<Camera>()) existing.enabled = false;

            // Camera + free-movement rig.
            var camGo = new GameObject("MainCamera");
            camGo.transform.SetParent(transform, false);
            camGo.tag = "MainCamera";
            _camera = camGo.AddComponent<Camera>();
            _camera.clearFlags = CameraClearFlags.SolidColor;
            _camera.backgroundColor = new Color(0.09f, 0.10f, 0.13f);
            _rig = camGo.AddComponent<OrbitCameraRig>();

            // A key light so Lit materials read well.
            var lightGo = new GameObject("Sun");
            lightGo.transform.SetParent(transform, false);
            var sun = lightGo.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.intensity = 1.15f;
            lightGo.transform.rotation = Quaternion.Euler(50f, -28f, 0f);

            // Services.
            _input = new LegacyInputProvider();
            _rig.Input = _input;

            _progress = new ProgressService();
            _progress.Initialize(new LocalJsonProgressStore());

            var adsGo = new GameObject("Ads");
            adsGo.transform.SetParent(transform, false);
            _ads = adsGo.AddComponent<AdGatekeeper>();
            _ads.Configure(ScriptableObject.CreateInstance<AppConfig>());

            var worldGo = new GameObject("WorldBuilder");
            worldGo.transform.SetParent(transform, false);
            _world = worldGo.AddComponent<TopicWorldBuilder>();

            _course = SolutionsArchitectContent.BuildCourse();

            _journey = new JourneyController();
            _journey.OnStageChanged += HandleStageChanged;

            GoToCourseMap();
        }

        private void Update()
        {
            if (_input == null) return;
            _input.Sample();

            Vector2 p = _input.PointerPosition;
            bool overUi = IsPointerOverUi(p);
            _rig.ControlEnabled = (_screen == AppScreen.Topic || _screen == AppScreen.Assessment) && !overUi;

            if (_input.PrimaryPressed) { _pressPos = p; _pressOverUi = overUi; }
            if (_input.PrimaryReleased && !_pressOverUi && Vector2.Distance(_pressPos, p) < 12f)
                HandleWorldClick(p);
        }

        private void HandleWorldClick(Vector2 pointer)
        {
            if (_camera == null || _world == null) return;
            var bv = _world.Raycast(_camera.ScreenPointToRay(pointer));
            if (bv == null) return;

            if (_screen == AppScreen.Topic)
            {
                _selectedBlockId = bv.Spec.id;
                _inspectorOpen = true;
            }
            else if (_screen == AppScreen.Assessment)
            {
                LastTappedBlockId = bv.Spec.id;
            }
        }

        private void OnGUI()
        {
            UiStyles.Ensure();
            switch (_screen)
            {
                case AppScreen.CourseMap: _courseMapView.Draw(this); break;
                case AppScreen.Topic:
                    _topicHud.Draw(this);
                    if (_inspectorOpen) _inspector.Draw(this);
                    break;
                case AppScreen.Assessment: _assessmentView.Draw(this); break;
                case AppScreen.Results: _resultsView.Draw(this); break;
            }
        }

        private bool IsPointerOverUi(Vector2 p)
        {
            switch (_screen)
            {
                case AppScreen.CourseMap:
                case AppScreen.Results:
                    return true;
                case AppScreen.Topic:
                    return p.y <= BottomPanelH
                           || p.y >= Screen.height - 58f
                           || (_inspectorOpen && p.x >= Screen.width - InspectorW);
                case AppScreen.Assessment:
                    return p.x >= Screen.width - AssessW;
                default:
                    return false;
            }
        }

        private void HandleStageChanged(StageSpec stage)
        {
            _selectedBlockId = stage.focusBlockId;
            if (_topic != null) _progress.MarkStageReached(_topic.id, stage.index);
        }

        // ---- flow API ----
        public void OpenTopic(TopicSpec topic)
        {
            _topic = topic;
            _screen = AppScreen.Topic;
            _inspectorOpen = false;
            _ads.HideBanner();
            _ads.IsLearningInProgress = true;
            _progress.MarkLearning(topic.id);
            _journey.Begin(topic, _world, _rig);
            if (_journey.Current != null) _selectedBlockId = _journey.Current.focusBlockId;
        }

        public void JourneyNext() => _journey.Next();
        public void JourneyPrev() => _journey.Prev();

        public void JourneyReplay()
        {
            if (_topic != null) _progress.IncrementReplay(_topic.id);
            _journey.Replay();
        }

        public void ToggleInspector() => _inspectorOpen = !_inspectorOpen;

        public void StartAssessment()
        {
            _screen = AppScreen.Assessment;
            _ads.IsLearningInProgress = false;
            _assessmentView.Begin(_topic, this);
        }

        public void SubmitAssessment(int correct, int total)
        {
            _lastResult = _progress.RecordQuiz(_topic.id, correct, total);
            _resultsView.Set(_lastResult, _topic.id);
            _screen = AppScreen.Results;
        }

        public void BackToMap()
        {
            // Ad seam: an interstitial may show here (production only). NoOp invokes the callback immediately.
            _ads.TryShowInterstitial(AdPlacement.TopicCompleted, GoToCourseMap);
        }

        private void GoToCourseMap()
        {
            _screen = AppScreen.CourseMap;
            _ads.IsLearningInProgress = false;
            _ads.ShowBanner(AdPlacement.CourseMapBanner);
        }

        public void OfferReward(AdPlacement placement, Action onReward)
        {
            _ads.ShowRewarded(placement, onReward);
        }
    }
}
