using System;
using UnityEngine;
using LearnAWS.Persistence;

namespace LearnAWS.Progress
{
    public struct QuizResult
    {
        public int correct;
        public int total;
        public int percent;
        public bool passed;
    }

    /// <summary>
    /// In-memory cache over an <see cref="IProgressStore"/>. Updates mastery as the learner progresses and
    /// records quiz results. Save is fire-and-forget; the local store completes synchronously.
    /// </summary>
    public sealed class ProgressService
    {
        public const int PassPercent = 80;

        private IProgressStore _store;
        private UserProgress _data = new UserProgress();

        public void Initialize(IProgressStore store)
        {
            _store = store;
            _data = _store.LoadAsync().GetAwaiter().GetResult() ?? new UserProgress();
        }

        public MasteryState GetMastery(string topicId)
        {
            var tp = _data.topics.Find(t => t.topicId == topicId);
            return tp != null ? tp.mastery : MasteryState.NotStarted;
        }

        public TopicProgress Get(string topicId) => _data.GetOrCreate(topicId);

        public void MarkLearning(string topicId)
        {
            var tp = _data.GetOrCreate(topicId);
            if (tp.mastery == MasteryState.NotStarted) tp.mastery = MasteryState.Learning;
            tp.lastVisitedIso = NowIso();
            Save();
        }

        public void MarkStageReached(string topicId, int index)
        {
            var tp = _data.GetOrCreate(topicId);
            if (index > tp.highestStageReached) tp.highestStageReached = index;
            Save();
        }

        public void IncrementReplay(string topicId)
        {
            var tp = _data.GetOrCreate(topicId);
            tp.replayCount++;
            Save();
        }

        public QuizResult RecordQuiz(string topicId, int correct, int total)
        {
            int pct = total > 0 ? Mathf.RoundToInt(100f * correct / total) : 0;
            bool passed = pct >= PassPercent;

            var tp = _data.GetOrCreate(topicId);
            if (pct > tp.bestQuizScorePercent) tp.bestQuizScorePercent = pct;
            tp.mastery = passed ? MasteryState.Mastered : MasteryState.Assessed;
            tp.lastVisitedIso = NowIso();
            Save();

            return new QuizResult { correct = correct, total = total, percent = pct, passed = passed };
        }

        private void Save()
        {
            if (_store != null) _store.SaveAsync(_data);
        }

        private static string NowIso() => DateTime.UtcNow.ToString("o");
    }
}
