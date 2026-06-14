using System;
using UnityEngine;
using LearnAWS.Core;

namespace LearnAWS.Monetization
{
    /// <summary>
    /// The single entry point gameplay/UI uses to request ads. Enforces every monetization rule in one place:
    ///  - ads only in Production builds (never locally),
    ///  - never while the user is actively learning (narration / animation),
    ///  - suppressed for Pro (ad-free) users,
    ///  - interstitial frequency caps,
    ///  - rewarded ads are opt-in value, offered only when ready and to non-Pro users.
    /// </summary>
    public sealed class AdGatekeeper : MonoBehaviour
    {
        [SerializeField] private AppConfig config;

        private IAdService _ads;
        private float _lastInterstitialTime = -9999f;

        /// <summary>Set true by the journey/learning controller whenever narration or an animation is playing.</summary>
        public bool IsLearningInProgress { get; set; }

        /// <summary>True once the user owns the ad-free entitlement (IAP) — or the local test override is on.</summary>
        public bool IsProUser { get; set; }

        /// <summary>True only when real, interruptive ads are permitted right now.</summary>
        public bool AdsAreLive => AppEnvironmentResolver.IsProduction && config != null && config.adsEnabled && !IsProUser;

        private void Awake() => EnsureService();

        private void EnsureService()
        {
            if (_ads != null) return;
            _ads = AdServiceFactory.Create();
            _ads.Initialize();
        }

        /// <summary>Wire up config at runtime (used when the app is bootstrapped from code).</summary>
        public void Configure(AppConfig cfg)
        {
            config = cfg;
            EnsureService();
            if (cfg != null) IsProUser = cfg.proEntitlementOverride;
        }

        public void TryShowInterstitial(AdPlacement placement, Action onClosed = null)
        {
            if (!CanShowInterruptiveAd() || !_ads.IsInterstitialReady)
            {
                onClosed?.Invoke();
                return;
            }

            _lastInterstitialTime = Time.unscaledTime;
            _ads.ShowInterstitial(placement, onClosed);
            _ads.LoadInterstitial(); // preload the next one
        }

        public bool CanOfferReward(AdPlacement placement) => !IsProUser && _ads.IsRewardedReady;

        public void ShowRewarded(AdPlacement placement, Action onReward, Action onClosedWithoutReward = null)
            => _ads.ShowRewarded(placement, onReward, onClosedWithoutReward);

        public void ShowBanner(AdPlacement placement)
        {
            if (AdsAreLive) _ads.ShowBanner(placement);
        }

        public void HideBanner() => _ads.HideBanner();

        private bool CanShowInterruptiveAd()
        {
            if (!AdsAreLive) return false;
            if (IsLearningInProgress) return false; // never interrupt learning / animation
            float cooldown = config != null ? config.interstitialCooldownSeconds : 120f;
            return Time.unscaledTime - _lastInterstitialTime >= cooldown;
        }
    }
}
