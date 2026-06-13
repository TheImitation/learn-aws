using System;
using UnityEngine;

namespace LearnAWS.Monetization
{
    /// <summary>
    /// Production implementation. TODO (M6): wrap the chosen ad SDK / mediation (Unity LevelPlay or AdMob)
    /// and the consent flow (Google UMP / iOS App Tracking Transparency). Until the SDK is added this safely
    /// no-ops so the project compiles. This type is only ever selected for Production builds
    /// (see <see cref="AdServiceFactory"/>) — it cannot run locally.
    /// </summary>
    public sealed class ProductionAdService : IAdService
    {
        public bool IsInitialized { get; private set; }
        public bool IsInterstitialReady { get; private set; }
        public bool IsRewardedReady { get; private set; }

        public void Initialize()
        {
            // TODO (M6): request consent (UMP / ATT), initialize SDK, preload first ads.
            IsInitialized = true;
            Debug.Log("[Ads] ProductionAdService initialized (SDK wiring pending — see M6).");
        }

        public void LoadInterstitial() { /* TODO (M6) */ }

        public void ShowInterstitial(AdPlacement placement, Action onClosed = null)
        {
            // TODO (M6): show real interstitial; invoke onClosed when dismissed.
            onClosed?.Invoke();
        }

        public void LoadRewarded() { /* TODO (M6) */ }

        public void ShowRewarded(AdPlacement placement, Action onReward, Action onClosedWithoutReward = null)
        {
            // TODO (M6): show real rewarded ad; invoke onReward only at the reward threshold.
            onClosedWithoutReward?.Invoke();
        }

        public void ShowBanner(AdPlacement placement) { /* TODO (M6) */ }

        public void HideBanner() { /* TODO (M6) */ }
    }
}
