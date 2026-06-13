using System;
using UnityEngine;

namespace LearnAWS.Monetization
{
    /// <summary>
    /// Editor / dev / staging implementation: shows nothing, logs the intent so placements are testable locally.
    /// Rewarded callbacks grant the reward immediately so reward-gated flows can be exercised without a network.
    /// </summary>
    public sealed class NoOpAdService : IAdService
    {
        public bool IsInitialized { get; private set; }
        public bool IsInterstitialReady => true;
        public bool IsRewardedReady => true;

        public void Initialize()
        {
            IsInitialized = true;
            Debug.Log("[Ads] NoOpAdService initialized (no real ads in this environment).");
        }

        public void LoadInterstitial() { }

        public void ShowInterstitial(AdPlacement placement, Action onClosed = null)
        {
            Debug.Log($"[Ads] (no-op) would show INTERSTITIAL at {placement}.");
            onClosed?.Invoke();
        }

        public void LoadRewarded() { }

        public void ShowRewarded(AdPlacement placement, Action onReward, Action onClosedWithoutReward = null)
        {
            Debug.Log($"[Ads] (no-op) would show REWARDED at {placement}; granting reward for local testing.");
            onReward?.Invoke();
        }

        public void ShowBanner(AdPlacement placement) => Debug.Log($"[Ads] (no-op) would show BANNER at {placement}.");

        public void HideBanner() { }
    }
}
