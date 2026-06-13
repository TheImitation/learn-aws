namespace LearnAWS.Core
{
    /// <summary>Which build environment we're running in. Drives whether production-only integrations (ads, analytics) are live.</summary>
    public enum AppEnvironment
    {
        Development,
        Staging,
        Production
    }

    /// <summary>
    /// Resolves the current environment from compile-time defines.
    /// Hard rule: the Editor and any non-Production build are NEVER treated as Production,
    /// so ads and other production-only integrations cannot run locally.
    /// Set the PRODUCTION (or STAGING) scripting define symbol on that build profile only — see SETUP.md.
    /// </summary>
    public static class AppEnvironmentResolver
    {
        public static AppEnvironment Current
        {
            get
            {
#if UNITY_EDITOR
                return AppEnvironment.Development;
#elif PRODUCTION
                return AppEnvironment.Production;
#elif STAGING
                return AppEnvironment.Staging;
#else
                return AppEnvironment.Development;
#endif
            }
        }

        public static bool IsProduction => Current == AppEnvironment.Production;
    }
}
