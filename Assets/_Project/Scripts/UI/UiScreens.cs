using System.Collections.Generic;
using UnityEngine;
using LearnAWS.App;
using LearnAWS.Content;
using LearnAWS.Persistence;
using LearnAWS.Progress;
using LearnAWS.Monetization;

namespace LearnAWS.UI
{
    /// <summary>
    /// IMGUI screens. Functional and cross-platform (touch registers as clicks) with zero asset setup —
    /// the deliberate placeholder so the whole product loop runs today. Production UI moves to uGUI/UI Toolkit.
    /// </summary>
    internal static class UiStyles
    {
        public static GUIStyle Title, H2, Body, Small, SmallEmph, Button, Toggle, Ok, Bad, CenteredSmall, Card;
        private static Texture2D _white, _cardBg;
        private static bool _ready;

        private static readonly Color PanelColor = new Color(0.12f, 0.13f, 0.16f, 0.97f);

        public static Color Panel => PanelColor;
        public static Color Screen = new Color(0.10f, 0.11f, 0.14f, 1f);

        public static void Ensure()
        {
            if (_ready) return;
            _ready = true;

            Color text = new Color(0.93f, 0.94f, 0.96f);
            _white = Tex(Color.white);
            _cardBg = Tex(new Color(0.17f, 0.18f, 0.22f));

            Title = Mk(24, FontStyle.Bold, text);
            H2 = Mk(18, FontStyle.Bold, text);
            Body = Mk(15, FontStyle.Normal, text);
            Small = Mk(12, FontStyle.Normal, new Color(0.75f, 0.77f, 0.80f));
            SmallEmph = Mk(13, FontStyle.Bold, new Color(0.80f, 0.84f, 0.90f));
            Ok = Mk(15, FontStyle.Bold, new Color(0.50f, 0.85f, 0.55f));
            Bad = Mk(15, FontStyle.Bold, new Color(0.92f, 0.58f, 0.52f));
            CenteredSmall = Mk(12, FontStyle.Normal, new Color(0.70f, 0.72f, 0.76f));
            CenteredSmall.alignment = TextAnchor.MiddleCenter;

            Button = new GUIStyle(GUI.skin.button) { fontSize = 14, wordWrap = true };
            Toggle = new GUIStyle(GUI.skin.toggle) { fontSize = 15, wordWrap = true };
            Toggle.normal.textColor = Toggle.onNormal.textColor = Toggle.hover.textColor = Toggle.onHover.textColor = text;

            Card = new GUIStyle { padding = new RectOffset(14, 14, 12, 12) };
            Card.normal.background = _cardBg;
        }

        private static GUIStyle Mk(int size, FontStyle fs, Color col)
        {
            var s = new GUIStyle(GUI.skin.label) { fontSize = size, fontStyle = fs, wordWrap = true };
            s.normal.textColor = col;
            return s;
        }

        private static Texture2D Tex(Color c)
        {
            var t = new Texture2D(1, 1);
            t.SetPixel(0, 0, c);
            t.Apply();
            t.hideFlags = HideFlags.HideAndDontSave;
            return t;
        }

        public static void Fill(Rect r, Color c)
        {
            var g = GUI.color;
            GUI.color = c;
            GUI.DrawTexture(r, _white);
            GUI.color = g;
        }
    }

    public sealed class CourseMapView
    {
        public void Draw(AppRoot app)
        {
            UiStyles.Fill(new Rect(0, 0, Screen.width, Screen.height), UiStyles.Screen);

            float w = Mathf.Min(760f, Screen.width - 32f);
            GUILayout.BeginArea(new Rect((Screen.width - w) / 2f, 24f, w, Screen.height - 24f - 48f));
            GUILayout.Label("AWS Solutions Architect", UiStyles.Title);
            GUILayout.Label("Learn cloud architecture by building it, block by block. Pick a topic to begin.", UiStyles.Small);
            GUILayout.Space(12);

            foreach (var topic in app.Course.topics)
            {
                var mastery = app.Progress.GetMastery(topic.id);
                int best = app.Progress.Get(topic.id).bestQuizScorePercent;

                GUILayout.BeginVertical(UiStyles.Card);
                GUILayout.Label(topic.title, UiStyles.H2);
                string meta = topic.examDomain + "     Mastery: " + mastery + (best > 0 ? "     Best: " + best + "%" : "");
                GUILayout.Label(meta, UiStyles.Small);
                GUILayout.Label(topic.summary, UiStyles.Body);
                GUILayout.Space(6);
                string action = mastery == MasteryState.NotStarted ? "Start" : (mastery == MasteryState.Mastered ? "Review" : "Continue");
                if (GUILayout.Button(action, UiStyles.Button, GUILayout.Width(150f), GUILayout.Height(34f)))
                    app.OpenTopic(topic);
                GUILayout.EndVertical();
                GUILayout.Space(10);
            }
            GUILayout.EndArea();

            var banner = new Rect(0, Screen.height - 40f, Screen.width, 40f);
            UiStyles.Fill(banner, new Color(0.18f, 0.19f, 0.23f));
            GUI.Label(banner, "[ Banner ad — shown in production builds only ]", UiStyles.CenteredSmall);
        }
    }

    public sealed class TopicHudView
    {
        public void Draw(AppRoot app)
        {
            var j = app.Journey;
            var s = j.Current;
            if (s == null) return;

            var top = new Rect(0, 0, Screen.width, 52f);
            UiStyles.Fill(top, UiStyles.Panel);
            GUILayout.BeginArea(new Rect(14f, 7f, Screen.width - 28f, 40f));
            GUILayout.BeginHorizontal();
            GUILayout.Label(app.Topic.title, UiStyles.H2);
            GUILayout.FlexibleSpace();
            GUILayout.Label("Stage " + (s.index + 1) + "/" + j.Count + ":  " + s.title, UiStyles.Body);
            GUILayout.EndHorizontal();
            GUILayout.EndArea();

            float h = AppRoot.BottomPanelH;
            UiStyles.Fill(new Rect(0, Screen.height - h, Screen.width, h), UiStyles.Panel);
            GUILayout.BeginArea(new Rect(16f, Screen.height - h + 12f, Screen.width - 32f, h - 22f));

            GUILayout.Label(s.narration, UiStyles.Body);
            GUILayout.Label("Why it matters:  " + s.concept, UiStyles.SmallEmph);
            GUILayout.Space(4);

            GUILayout.BeginHorizontal();
            GUILayout.Label("Journey", UiStyles.Small, GUILayout.Width(58f));
            float sv = GUILayout.HorizontalSlider(j.CurrentIndex, 0f, Mathf.Max(1, j.Count - 1));
            int ni = Mathf.RoundToInt(sv);
            if (ni != j.CurrentIndex) j.GoTo(ni);
            GUILayout.EndHorizontal();
            GUILayout.Space(4);

            GUILayout.BeginHorizontal();
            GUI.enabled = !j.IsFirst;
            if (GUILayout.Button("Prev", UiStyles.Button, GUILayout.Width(90f), GUILayout.Height(34f))) app.JourneyPrev();
            GUI.enabled = true;
            if (GUILayout.Button("Replay", UiStyles.Button, GUILayout.Width(90f), GUILayout.Height(34f))) app.JourneyReplay();
            GUI.enabled = !j.IsLast;
            if (GUILayout.Button("Next", UiStyles.Button, GUILayout.Width(90f), GUILayout.Height(34f))) app.JourneyNext();
            GUI.enabled = true;
            GUILayout.Space(12f);
            if (GUILayout.Button(app.InspectorOpen ? "Hide inspector" : "Inspect", UiStyles.Button, GUILayout.Width(140f), GUILayout.Height(34f)))
                app.ToggleInspector();
            GUILayout.FlexibleSpace();
            GUILayout.Label("Drag: orbit    Scroll/pinch: zoom    Right-drag: pan", UiStyles.Small);
            GUILayout.FlexibleSpace();
            if (j.IsLast && GUILayout.Button("Start assessment", UiStyles.Button, GUILayout.Width(170f), GUILayout.Height(34f)))
                app.StartAssessment();
            if (GUILayout.Button("Map", UiStyles.Button, GUILayout.Width(80f), GUILayout.Height(34f))) app.BackToMap();
            GUILayout.EndHorizontal();

            GUILayout.EndArea();
        }
    }

    public sealed class InspectorView
    {
        private bool _real;
        private Vector2 _scroll;

        public void Draw(AppRoot app)
        {
            float w = AppRoot.InspectorW;
            float top = 56f;
            float bottom = AppRoot.BottomPanelH + 8f;
            var rect = new Rect(Screen.width - w, top, w, Screen.height - top - bottom);
            UiStyles.Fill(rect, UiStyles.Panel);

            GUILayout.BeginArea(new Rect(rect.x + 14f, rect.y + 12f, rect.width - 28f, rect.height - 24f));
            GUILayout.BeginHorizontal();
            GUILayout.Label("Inspector", UiStyles.H2);
            GUILayout.FlexibleSpace();
            _real = GUILayout.Toolbar(_real ? 1 : 0, new[] { "Tangible", "Real" }, GUILayout.Width(180f)) == 1;
            GUILayout.EndHorizontal();
            GUILayout.Space(6);

            var b = app.Topic != null ? app.Topic.GetBlock(app.SelectedBlockId) : null;
            _scroll = GUILayout.BeginScrollView(_scroll);

            if (b == null)
            {
                GUILayout.Label("Tap any block in the scene to inspect it.", UiStyles.Body);
            }
            else
            {
                GUILayout.Label(b.displayName, UiStyles.H2);
                GUILayout.Space(4);

                if (!_real)
                {
                    GUILayout.Label(b.plainSummary, UiStyles.Body);
                }
                else
                {
                    GUILayout.Label(b.realSummary, UiStyles.Body);
                    GUILayout.Space(6);
                    if (b.arn != null) Field("ARN", b.arn.ToArnString());
                    if (b.cidr != null) Field("CIDR", b.cidr.ToCidrString() + "   (" + b.cidr.AddressCount.ToString("N0") + " addresses)");
                    if (!string.IsNullOrEmpty(b.endpoint)) Field("Endpoint", b.endpoint);
                    if (b.ports != null && b.ports.Length > 0) Field("Ports", string.Join(", ", b.ports));

                    foreach (var c in app.Topic.connections)
                    {
                        if (c.toBlockId != b.id || c.requirement == null) continue;
                        if (c.requirement.securityGroup != null) Field("Security group", c.requirement.securityGroup.Describe());
                        if (c.requirement.iam != null) Field("IAM role", c.requirement.iam.roleName + ": " + string.Join(", ", c.requirement.iam.allows));
                    }
                }
            }

            GUILayout.EndScrollView();
            GUILayout.EndArea();
        }

        private void Field(string label, string value)
        {
            GUILayout.Label(label, UiStyles.SmallEmph);
            GUILayout.Label(value, UiStyles.Small);
            GUILayout.Space(5);
        }
    }

    public sealed class AssessmentView
    {
        private QuizSpec _quiz;
        private int _q;
        private int _correct;
        private bool _answered;
        private bool _wasCorrect;
        private bool _hintShown;
        private Vector2 _scroll;
        private readonly HashSet<int> _picked = new HashSet<int>();

        public void Begin(TopicSpec topic, AppRoot app)
        {
            _quiz = topic.quiz;
            _q = 0;
            _correct = 0;
            ResetQuestion(app);
        }

        private QuestionSpec Current => _quiz.questions[_q];

        private void ResetQuestion(AppRoot app)
        {
            _picked.Clear();
            _answered = false;
            _hintShown = false;
            if (Current.kind == QuestionKind.TapToFix) app.ClearTapped();
        }

        public void Draw(AppRoot app)
        {
            if (_quiz == null || _quiz.questions.Count == 0) return;

            float w = AppRoot.AssessW;
            var rect = new Rect(Screen.width - w, 0, w, Screen.height);
            UiStyles.Fill(rect, UiStyles.Panel);

            GUILayout.BeginArea(new Rect(rect.x + 16f, 16f, rect.width - 32f, Screen.height - 32f));
            GUILayout.Label("Assessment", UiStyles.Title);
            GUILayout.Label(app.Topic.title + "    Question " + (_q + 1) + " of " + _quiz.questions.Count, UiStyles.Small);
            GUILayout.Space(8);

            var q = Current;
            _scroll = GUILayout.BeginScrollView(_scroll);
            GUILayout.Label(q.prompt, UiStyles.Body);
            GUILayout.Space(8);

            if (q.kind == QuestionKind.SingleChoice || q.kind == QuestionKind.MultiChoice)
                DrawChoice(app, q);
            else
                DrawTapToFix(app, q);

            GUILayout.EndScrollView();
            GUILayout.EndArea();
        }

        private void DrawChoice(AppRoot app, QuestionSpec q)
        {
            for (int i = 0; i < q.options.Length; i++)
            {
                bool sel = _picked.Contains(i);
                bool now = GUILayout.Toggle(sel, "  " + q.options[i], UiStyles.Toggle);
                if (now != sel)
                {
                    if (q.kind == QuestionKind.SingleChoice)
                    {
                        _picked.Clear();
                        if (now) _picked.Add(i);
                    }
                    else
                    {
                        if (now) _picked.Add(i); else _picked.Remove(i);
                    }
                }
            }
            GUILayout.Space(8);

            if (!_answered)
            {
                if (q.kind == QuestionKind.MultiChoice) GUILayout.Label("Pick all that apply.", UiStyles.Small);
                if (GUILayout.Button("Submit answer", UiStyles.Button, GUILayout.Height(34f)))
                {
                    _wasCorrect = _picked.SetEquals(new HashSet<int>(q.correctIndices));
                    _answered = true;
                    if (_wasCorrect) _correct++;
                }
                if (!_hintShown && app.Ads.CanOfferReward(AdPlacement.RewardedHint))
                {
                    if (GUILayout.Button("Hint (watch ad)", UiStyles.Button, GUILayout.Height(30f)))
                        app.OfferReward(AdPlacement.RewardedHint, () => _hintShown = true);
                }
                if (_hintShown) GUILayout.Label("Hint: " + q.explanation, UiStyles.SmallEmph);
            }
            else
            {
                GUILayout.Label(_wasCorrect ? "Correct!" : "Not quite.", _wasCorrect ? UiStyles.Ok : UiStyles.Bad);
                GUILayout.Label(q.explanation, UiStyles.Body);
                GUILayout.Space(6);
                NextButton(app);
            }
        }

        private void DrawTapToFix(AppRoot app, QuestionSpec q)
        {
            GUILayout.Label("Tap the component in the 3D scene that fixes this.", UiStyles.SmallEmph);
            string tapped = app.LastTappedBlockId;
            string tappedName = string.IsNullOrEmpty(tapped) ? "(nothing yet)" : NameOf(app, tapped);
            GUILayout.Label("You tapped: " + tappedName, UiStyles.Body);
            GUILayout.Space(6);

            if (!_answered)
            {
                GUI.enabled = !string.IsNullOrEmpty(tapped);
                if (GUILayout.Button("Submit", UiStyles.Button, GUILayout.Height(34f)))
                {
                    _wasCorrect = tapped == q.tapTargetBlockId;
                    _answered = true;
                    if (_wasCorrect) _correct++;
                }
                GUI.enabled = true;
            }
            else
            {
                GUILayout.Label(_wasCorrect ? "Correct!" : "Not quite.", _wasCorrect ? UiStyles.Ok : UiStyles.Bad);
                GUILayout.Label(q.explanation, UiStyles.Body);
                GUILayout.Space(6);
                NextButton(app);
            }
        }

        private void NextButton(AppRoot app)
        {
            bool last = _q == _quiz.questions.Count - 1;
            if (GUILayout.Button(last ? "See results" : "Next question", UiStyles.Button, GUILayout.Height(34f)))
            {
                if (last)
                {
                    app.SubmitAssessment(_correct, _quiz.questions.Count);
                }
                else
                {
                    _q++;
                    ResetQuestion(app);
                }
            }
        }

        private static string NameOf(AppRoot app, string id)
        {
            var b = app.Topic.GetBlock(id);
            return b != null ? b.displayName : id;
        }
    }

    public sealed class ResultsView
    {
        private QuizResult _r;
        private string _topicId;

        public void Set(QuizResult r, string topicId)
        {
            _r = r;
            _topicId = topicId;
        }

        public void Draw(AppRoot app)
        {
            UiStyles.Fill(new Rect(0, 0, Screen.width, Screen.height), UiStyles.Screen);

            float w = Mathf.Min(520f, Screen.width - 32f);
            GUILayout.BeginArea(new Rect((Screen.width - w) / 2f, 80f, w, Screen.height - 120f));
            GUILayout.Label("Assessment complete", UiStyles.Title);
            GUILayout.Space(6);
            GUILayout.Label(_r.percent + "%    (" + _r.correct + "/" + _r.total + " correct)", UiStyles.H2);
            GUILayout.Space(4);
            GUILayout.Label(_r.passed
                ? "Passed — nicely done. You can survive an AZ outage now."
                : "Keep going — you need " + ProgressService.PassPercent + "% to master this topic.",
                UiStyles.Body);
            GUILayout.Label("Mastery: " + app.Progress.GetMastery(_topicId), UiStyles.Body);
            GUILayout.Space(16);

            if (GUILayout.Button("Back to course map", UiStyles.Button, GUILayout.Width(260f), GUILayout.Height(38f)))
                app.BackToMap();
            GUILayout.Space(6);
            if (GUILayout.Button("Retry assessment", UiStyles.Button, GUILayout.Width(260f), GUILayout.Height(32f)))
                app.StartAssessment();

            GUILayout.Space(14);
            GUILayout.Label("[ Interstitial ad may show on return — production builds only ]", UiStyles.CenteredSmall);
            GUILayout.EndArea();
        }
    }
}
