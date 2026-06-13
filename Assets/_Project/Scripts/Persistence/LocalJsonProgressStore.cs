using System.IO;
using System.Threading.Tasks;
using UnityEngine;

namespace LearnAWS.Persistence
{
    /// <summary>
    /// Saves progress as JSON under Application.persistentDataPath. Works identically on desktop and mobile.
    /// Swap this for a CloudProgressStore later without touching callers (see <see cref="IProgressStore"/>).
    /// </summary>
    public sealed class LocalJsonProgressStore : IProgressStore
    {
        private readonly string _path;

        public LocalJsonProgressStore(string fileName = "progress.json")
        {
            _path = Path.Combine(Application.persistentDataPath, fileName);
        }

        public Task<UserProgress> LoadAsync()
        {
            if (!File.Exists(_path)) return Task.FromResult(new UserProgress());

            try
            {
                var json = File.ReadAllText(_path);
                var data = JsonUtility.FromJson<UserProgress>(json);
                return Task.FromResult(data ?? new UserProgress());
            }
            catch
            {
                // Corrupt or unreadable save — start fresh rather than crash.
                return Task.FromResult(new UserProgress());
            }
        }

        public Task SaveAsync(UserProgress progress)
        {
            var json = JsonUtility.ToJson(progress, prettyPrint: true);
            File.WriteAllText(_path, json);
            return Task.CompletedTask;
        }

        public Task ClearAsync()
        {
            if (File.Exists(_path)) File.Delete(_path);
            return Task.CompletedTask;
        }
    }
}
