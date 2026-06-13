using UnityEngine;

namespace LearnAWS.Core
{
    /// <summary>
    /// Project-wide configuration asset. Create via Assets → Create → LearnAWS → App Config.
    /// Keep one instance referenced by the bootstrap scene.
    /// </summary>
    [CreateAssetMenu(fileName = "AppConfig", menuName = "LearnAWS/App Config", order = 0)]
    public class AppConfig : ScriptableObject
    {
        [Header("Monetization")]
        [Tooltip("Master switch for ads. Even when true, ads only ever run in Production builds (never in the Editor or dev/staging).")]
        public bool adsEnabled = true;

        [Tooltip("Minimum seconds between full-screen (interstitial) ads.")]
        public float interstitialCooldownSeconds = 120f;

        [Tooltip("Show an interstitial after this many completed stages (0 = never on stage completion).")]
        public int interstitialEveryNStages = 0;

        [Header("Pro / remove-ads entitlement")]
        [Tooltip("Local override for testing the Pro (ad-free) experience. Real entitlement comes from IAP at runtime.")]
        public bool proEntitlementOverride = false;
    }
}
