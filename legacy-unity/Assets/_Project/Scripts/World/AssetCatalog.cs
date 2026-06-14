using System.Collections.Generic;
using UnityEngine;
using LearnAWS.Content;

namespace LearnAWS.World
{
    /// <summary>
    /// Loads optional drop-in assets from Resources so the app uses real artwork when present and falls back
    /// to coloured primitives when not. Drop AWS service icons in Resources/Icons/{key}.png and low-poly
    /// building models in Resources/Models/{key} (see ASSETS.md). Nothing here is required to run.
    /// </summary>
    public static class AssetCatalog
    {
        private static readonly Dictionary<string, Texture2D> _icons = new Dictionary<string, Texture2D>();
        private static readonly Dictionary<string, GameObject> _models = new Dictionary<string, GameObject>();

        public static Texture2D LoadIcon(string key)
        {
            if (string.IsNullOrEmpty(key)) return null;
            if (_icons.TryGetValue(key, out var tex)) return tex;
            tex = Resources.Load<Texture2D>("Icons/" + key);
            _icons[key] = tex; // cache nulls too, so we don't re-hit Resources every block
            return tex;
        }

        public static GameObject LoadModel(string key)
        {
            if (string.IsNullOrEmpty(key)) return null;
            if (_models.TryGetValue(key, out var go)) return go;
            go = Resources.Load<GameObject>("Models/" + key);
            _models[key] = go;
            return go;
        }

        public static string IconKeyFor(BlockSpec s) => !string.IsNullOrEmpty(s.iconKey) ? s.iconKey : DefaultIconKey(s.kind);
        public static string ModelKeyFor(BlockSpec s) => !string.IsNullOrEmpty(s.modelKey) ? s.modelKey : DefaultModelKey(s.kind);

        private static string DefaultIconKey(AwsBlockKind kind)
        {
            switch (kind)
            {
                case AwsBlockKind.Ec2Instance: return "EC2";
                case AwsBlockKind.GenericServer: return "Server";
                case AwsBlockKind.RdsPrimary:
                case AwsBlockKind.RdsStandby: return "RDS";
                case AwsBlockKind.ApplicationLoadBalancer: return "ELB";
                case AwsBlockKind.CloudFront: return "CloudFront";
                case AwsBlockKind.Route53: return "Route53";
                case AwsBlockKind.Vpc: return "VPC";
                case AwsBlockKind.Region: return "Region";
                case AwsBlockKind.AutoScalingGroup: return "AutoScaling";
                case AwsBlockKind.InternetGateway: return "InternetGateway";
                case AwsBlockKind.NatGateway: return "NATGateway";
                case AwsBlockKind.User: return "User";
                case AwsBlockKind.S3Bucket: return "S3";
                case AwsBlockKind.GlacierVault: return "S3Glacier";
                case AwsBlockKind.IamService: return "IAM";
                case AwsBlockKind.BastionHost: return "EC2";
                case AwsBlockKind.SqsQueue: return "SQS";
                default: return "";
            }
        }

        private static string DefaultModelKey(AwsBlockKind kind)
        {
            switch (kind)
            {
                case AwsBlockKind.ApplicationLoadBalancer: return "pass";
                case AwsBlockKind.Ec2Instance: return "cook";
                case AwsBlockKind.RdsPrimary:
                case AwsBlockKind.RdsStandby: return "pantry";
                case AwsBlockKind.CloudFront: return "grabandgo";
                case AwsBlockKind.Route53: return "host";
                case AwsBlockKind.User: return "customer";
                case AwsBlockKind.GenericServer: return "linecook";
                case AwsBlockKind.InternetGateway: return "servicedoor";
                default: return "";
            }
        }
    }
}
