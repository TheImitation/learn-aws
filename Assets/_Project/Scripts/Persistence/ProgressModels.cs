using System;
using System.Collections.Generic;

namespace LearnAWS.Persistence
{
    public enum MasteryState
    {
        NotStarted,
        Learning,
        Assessed,
        Mastered
    }

    [Serializable]
    public class TopicProgress
    {
        public string topicId;
        public MasteryState mastery = MasteryState.NotStarted;
        public int highestStageReached;
        public int bestQuizScorePercent;
        public int replayCount;
        public string lastVisitedIso;
    }

    [Serializable]
    public class UserProgress
    {
        public int schemaVersion = 1;
        public List<TopicProgress> topics = new List<TopicProgress>();

        public TopicProgress GetOrCreate(string topicId)
        {
            var existing = topics.Find(t => t.topicId == topicId);
            if (existing != null) return existing;

            var created = new TopicProgress { topicId = topicId };
            topics.Add(created);
            return created;
        }
    }
}
