using UnityEngine;
using LearnAWS.Content;

namespace LearnAWS.World
{
    /// <summary>Creates simple coloured materials that work whether the project uses URP or the built-in pipeline.</summary>
    public static class MaterialFactory
    {
        public static Material CreateLit(Color color)
        {
            Shader shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) shader = Shader.Find("Standard");
            if (shader == null) shader = Shader.Find("Sprites/Default");

            var m = new Material(shader);
            ApplyColor(m, color);
            return m;
        }

        public static Material CreateUnlit(Color color)
        {
            Shader shader = Shader.Find("Universal Render Pipeline/Unlit");
            if (shader == null) shader = Shader.Find("Unlit/Color");
            if (shader == null) shader = Shader.Find("Sprites/Default");

            var m = new Material(shader);
            ApplyColor(m, color);
            return m;
        }

        /// <summary>A material that renders LineRenderer vertex colours reliably across pipelines.</summary>
        public static Material CreateLineMaterial(Color color)
        {
            Shader shader = Shader.Find("Sprites/Default");
            if (shader == null) shader = Shader.Find("Unlit/Color");
            if (shader == null) shader = Shader.Find("Universal Render Pipeline/Unlit");

            var m = new Material(shader);
            ApplyColor(m, color);
            return m;
        }

        /// <summary>An unlit, alpha-blended material showing a texture (an AWS service icon) — works on URP and built-in.</summary>
        public static Material CreateIconMaterial(Texture texture)
        {
            Shader shader = Shader.Find("Sprites/Default");
            if (shader == null) shader = Shader.Find("Unlit/Transparent");
            if (shader == null) shader = Shader.Find("Universal Render Pipeline/Unlit");

            var m = new Material(shader);
            m.mainTexture = texture;
            if (m.HasProperty("_BaseMap")) m.SetTexture("_BaseMap", texture);
            return m;
        }

        /// <summary>A lit material that also glows (heat lamps, signage, screens).</summary>
        public static Material CreateEmissive(Color color, float intensity = 1.4f)
        {
            var m = CreateLit(color);
            if (m.HasProperty("_EmissionColor"))
            {
                m.SetColor("_EmissionColor", color * intensity);
                m.EnableKeyword("_EMISSION");
                m.globalIlluminationFlags = MaterialGlobalIlluminationFlags.RealtimeEmissive;
            }
            return m;
        }

        private static void ApplyColor(Material m, Color color)
        {
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", color);
            if (m.HasProperty("_Color")) m.SetColor("_Color", color);
            m.color = color;
        }

        public static Color ColorForCategory(ServiceCategory category)
        {
            switch (category)
            {
                case ServiceCategory.Networking: return new Color(0.20f, 0.52f, 0.78f);
                case ServiceCategory.Compute: return new Color(0.94f, 0.61f, 0.18f);
                case ServiceCategory.Database: return new Color(0.49f, 0.40f, 0.82f);
                case ServiceCategory.Edge: return new Color(0.20f, 0.70f, 0.55f);
                case ServiceCategory.Storage: return new Color(0.85f, 0.52f, 0.24f);
                case ServiceCategory.Security: return new Color(0.82f, 0.34f, 0.34f);
                default: return new Color(0.62f, 0.64f, 0.62f);
            }
        }

        public static Color ColorForContainer(AwsBlockKind kind)
        {
            switch (kind)
            {
                case AwsBlockKind.Region: return new Color(0.70f, 0.72f, 0.74f);
                case AwsBlockKind.AvailabilityZone: return new Color(0.55f, 0.62f, 0.70f);
                case AwsBlockKind.Vpc: return new Color(0.30f, 0.62f, 0.85f);
                case AwsBlockKind.PublicSubnet: return new Color(0.35f, 0.75f, 0.45f);
                case AwsBlockKind.PrivateSubnet: return new Color(0.90f, 0.62f, 0.30f);
                case AwsBlockKind.AutoScalingGroup: return new Color(0.95f, 0.80f, 0.30f);
                default: return new Color(0.7f, 0.7f, 0.7f);
            }
        }
    }
}
