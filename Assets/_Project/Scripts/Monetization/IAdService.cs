using System;

namespace LearnAWS.Monetization
{
    /// <summary>
    /// Abstraction over the ad network. The production implementation wraps the chosen SDK / mediation
    /// (e.g. Unity LevelPlay or AdMob). In the Editor and non-production builds this is a no-op.
    /// Never call this directly from gameplay — go through <see cref="AdGatekeeper"/>, which enforces the rules.
    /// </summary>
    public interface IAdService
    {
        bool IsInitialized { get; }
        void Initialize();

        void LoadInterstitial();
        bool IsInterstitialReady { get; }
        void ShowInterstitial(AdPlacement placement, Action onClosed = null);

        void LoadRewarded();
        bool IsRewardedReady { get; }
        /// <summary><paramref name="onReward"/> fires only if the user watched to the reward threshold.</summary>
        void ShowRewarded(AdPlacement placement, Action onReward, Action onClosedWithoutReward = null);

        void ShowBanner(AdPlacement placement);
        void HideBanner();
    }
}
