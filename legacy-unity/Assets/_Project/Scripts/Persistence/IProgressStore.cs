using System.Threading.Tasks;

namespace LearnAWS.Persistence
{
    /// <summary>
    /// Persistence abstraction for user progress. The v1 implementation is local JSON;
    /// a future CloudProgressStore can implement this same interface for cross-device sync
    /// (the chosen approach: "local, behind an interface") with no changes to callers.
    /// </summary>
    public interface IProgressStore
    {
        Task<UserProgress> LoadAsync();
        Task SaveAsync(UserProgress progress);
        Task ClearAsync();
    }
}
