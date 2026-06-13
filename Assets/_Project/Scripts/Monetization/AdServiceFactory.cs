using LearnAWS.Core;

namespace LearnAWS.Monetization
{
    /// <summary>
    /// Chooses the ad implementation for the current environment.
    /// Production builds get the real service; everything else (Editor, dev, staging) gets the no-op.
    /// This is the second guardrail (after <see cref="AdGatekeeper"/>) ensuring ads never run locally.
    /// </summary>
    public static class AdServiceFactory
    {
        public static IAdService Create()
        {
            return AppEnvironmentResolver.IsProduction
                ? new ProductionAdService()
                : (IAdService)new NoOpAdService();
        }
    }
}
