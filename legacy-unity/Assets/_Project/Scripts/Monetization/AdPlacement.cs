namespace LearnAWS.Monetization
{
    /// <summary>
    /// Named moments where an ad may appear. Placements live in the "seams" of the experience —
    /// never during active learning, narration, or animations.
    /// </summary>
    public enum AdPlacement
    {
        AppOpen,             // cold start (frequency capped)
        CourseMapBanner,     // persistent banner on the course map only
        TopicCompleted,      // interstitial after finishing a topic, before returning to the map
        StageMilestone,      // optional interstitial every N stages (off by default)
        RewardedHint,        // opt-in rewarded video to reveal an assessment hint
        RewardedRetry,       // opt-in rewarded video to retry a failed quiz
        RewardedBonusReplay  // opt-in rewarded video to unlock a deep-dive replay
    }

    /// <summary>The technical ad format behind a placement.</summary>
    public enum AdKind
    {
        Banner,
        Interstitial,
        Rewarded,
        AppOpen,
        Native
    }
}
