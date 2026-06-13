using UnityEngine;
using LearnAWS.Content;

namespace LearnAWS.World
{
    /// <summary>
    /// Generates a stylized kitchen prop from primitives for the story view when no model is supplied in
    /// Resources/Models. Built ~1 unit in local space so it drops into a block's body cleanly. Drop a real
    /// CC0 model into Resources/Models/{key} to override it (see ASSETS.md).
    /// </summary>
    public static class StoryBuildingFactory
    {
        private static readonly Color ChefWhite = new Color(0.94f, 0.94f, 0.91f);
        private static readonly Color Skin = new Color(0.92f, 0.78f, 0.62f);
        private static readonly Color Steel = new Color(0.62f, 0.64f, 0.67f);
        private static readonly Color Warm = new Color(0.98f, 0.55f, 0.20f);

        public static GameObject Create(string prop, Color tint, Transform parent)
        {
            var root = new GameObject("StoryProp");
            root.transform.SetParent(parent, false);
            root.transform.localPosition = Vector3.zero;

            switch (prop)
            {
                case "customer": Customer(root.transform, tint); break;
                case "host": HostStand(root.transform, tint); break;
                case "grabandgo": GrabAndGo(root.transform, tint); break;
                case "pantry": Pantry(root.transform, tint); break;
                case "pass": ThePass(root.transform, tint); break;
                case "servicedoor": ServiceDoor(root.transform, tint); break;
                case "cook": Cook(root.transform, tint); break;
                case "larder": Larder(root.transform, tint); break;
                case "coldroom": ColdRoom(root.transform, tint); break;
                default: Station(root.transform, tint); break;
            }
            return root;
        }

        /// <summary>Story prop a block uses when it doesn't set storyProp explicitly.</summary>
        public static string DefaultStoryProp(AwsBlockKind kind)
        {
            switch (kind)
            {
                case AwsBlockKind.User: return "customer";
                case AwsBlockKind.Route53: return "host";
                case AwsBlockKind.CloudFront: return "grabandgo";
                case AwsBlockKind.RdsPrimary:
                case AwsBlockKind.RdsStandby: return "pantry";
                case AwsBlockKind.ApplicationLoadBalancer: return "pass";
                case AwsBlockKind.InternetGateway: return "servicedoor";
                case AwsBlockKind.Ec2Instance:
                case AwsBlockKind.GenericServer: return "cook";
                case AwsBlockKind.S3Bucket: return "larder";
                case AwsBlockKind.GlacierVault: return "coldroom";
                default: return "station";
            }
        }

        private static Color Shade(Color c, float f) => new Color(c.r * f, c.g * f, c.b * f, c.a);

        private static void Prim(Transform p, PrimitiveType type, Vector3 pos, Vector3 scale, Color color, Vector3 euler = default)
        {
            var go = GameObject.CreatePrimitive(type);
            go.transform.SetParent(p, false);
            go.transform.localPosition = pos;
            go.transform.localEulerAngles = euler;
            go.transform.localScale = scale;
            go.GetComponent<Renderer>().material = MaterialFactory.CreateLit(color);
        }

        // A chef in whites with a toque, at a cooktop (the tint shows on the station).
        private static void Cook(Transform p, Color tint)
        {
            Prim(p, PrimitiveType.Capsule, new Vector3(-0.08f, -0.12f, -0.08f), new Vector3(0.3f, 0.3f, 0.3f), ChefWhite);
            Prim(p, PrimitiveType.Sphere, new Vector3(-0.08f, 0.18f, -0.08f), new Vector3(0.22f, 0.22f, 0.22f), Skin);
            Prim(p, PrimitiveType.Cylinder, new Vector3(-0.08f, 0.33f, -0.08f), new Vector3(0.17f, 0.1f, 0.17f), ChefWhite);  // hat band
            Prim(p, PrimitiveType.Sphere, new Vector3(-0.08f, 0.43f, -0.08f), new Vector3(0.24f, 0.18f, 0.24f), ChefWhite);   // toque
            Prim(p, PrimitiveType.Cube, new Vector3(0.2f, -0.24f, 0.12f), new Vector3(0.44f, 0.22f, 0.36f), tint);            // station
            Prim(p, PrimitiveType.Cylinder, new Vector3(0.2f, -0.11f, 0.12f), new Vector3(0.18f, 0.02f, 0.18f), new Color(0.18f, 0.18f, 0.2f)); // burner
        }

        // The pass: a steel counter under a heat lamp, with a ticket rail (the visible queue).
        private static void ThePass(Transform p, Color tint)
        {
            Prim(p, PrimitiveType.Cube, new Vector3(0f, -0.22f, 0f), new Vector3(0.95f, 0.4f, 0.55f), Steel);
            Prim(p, PrimitiveType.Cube, new Vector3(0f, -0.22f, 0.28f), new Vector3(0.95f, 0.4f, 0.05f), tint);   // coloured front
            Prim(p, PrimitiveType.Cube, new Vector3(-0.36f, 0.06f, 0f), new Vector3(0.04f, 0.5f, 0.04f), Steel);  // lamp post
            Prim(p, PrimitiveType.Cube, new Vector3(0.36f, 0.06f, 0f), new Vector3(0.04f, 0.5f, 0.04f), Steel);
            Prim(p, PrimitiveType.Cube, new Vector3(0f, 0.3f, 0f), new Vector3(0.82f, 0.07f, 0.22f), Warm);        // heat lamp
            // ticket rail + tickets
            Prim(p, PrimitiveType.Cube, new Vector3(0f, 0.06f, 0.31f), new Vector3(0.7f, 0.02f, 0.02f), Steel);
            Prim(p, PrimitiveType.Cube, new Vector3(-0.22f, 0.14f, 0.31f), new Vector3(0.09f, 0.13f, 0.01f), Color.white);
            Prim(p, PrimitiveType.Cube, new Vector3(-0.02f, 0.14f, 0.31f), new Vector3(0.09f, 0.13f, 0.01f), Color.white);
            Prim(p, PrimitiveType.Cube, new Vector3(0.18f, 0.14f, 0.31f), new Vector3(0.09f, 0.13f, 0.01f), Color.white);
        }

        // A tall fridge / pantry cabinet.
        private static void Pantry(Transform p, Color tint)
        {
            Prim(p, PrimitiveType.Cube, new Vector3(0f, -0.02f, 0f), new Vector3(0.6f, 0.85f, 0.5f), tint);
            Prim(p, PrimitiveType.Cube, new Vector3(0f, 0.45f, 0f), new Vector3(0.66f, 0.08f, 0.56f), Shade(tint, 0.7f));
            Prim(p, PrimitiveType.Cube, new Vector3(0.2f, 0f, 0.26f), new Vector3(0.04f, 0.5f, 0.03f), Shade(tint, 0.55f)); // handle
        }

        // A glass display counter with a few dishes — the grab-and-go (cache).
        private static void GrabAndGo(Transform p, Color tint)
        {
            Prim(p, PrimitiveType.Cube, new Vector3(0f, -0.28f, 0f), new Vector3(0.7f, 0.28f, 0.5f), tint);
            Prim(p, PrimitiveType.Cube, new Vector3(0f, -0.02f, 0f), new Vector3(0.66f, 0.24f, 0.46f), new Color(0.8f, 0.86f, 0.92f)); // glass case
            Prim(p, PrimitiveType.Sphere, new Vector3(-0.16f, 0.08f, 0f), new Vector3(0.13f, 0.13f, 0.13f), new Color(0.9f, 0.5f, 0.3f));
            Prim(p, PrimitiveType.Sphere, new Vector3(0f, 0.08f, 0f), new Vector3(0.13f, 0.13f, 0.13f), new Color(0.95f, 0.8f, 0.35f));
            Prim(p, PrimitiveType.Sphere, new Vector3(0.16f, 0.08f, 0f), new Vector3(0.13f, 0.13f, 0.13f), new Color(0.85f, 0.42f, 0.42f));
            Prim(p, PrimitiveType.Cube, new Vector3(0f, 0.28f, 0f), new Vector3(0.82f, 0.06f, 0.55f), Shade(tint, 0.7f)); // canopy
        }

        // A podium with a slanted lectern and a sign — the host stand (DNS).
        private static void HostStand(Transform p, Color tint)
        {
            Prim(p, PrimitiveType.Cube, new Vector3(0f, -0.2f, 0f), new Vector3(0.2f, 0.45f, 0.2f), Shade(tint, 0.7f));
            Prim(p, PrimitiveType.Cube, new Vector3(0f, 0.08f, 0.05f), new Vector3(0.42f, 0.06f, 0.3f), tint, new Vector3(-22f, 0f, 0f));
            Prim(p, PrimitiveType.Cube, new Vector3(0f, 0.34f, 0f), new Vector3(0.34f, 0.2f, 0.04f), tint);
        }

        private static void Customer(Transform p, Color tint)
        {
            Prim(p, PrimitiveType.Capsule, new Vector3(0f, -0.12f, 0f), new Vector3(0.3f, 0.3f, 0.3f), tint);
            Prim(p, PrimitiveType.Sphere, new Vector3(0f, 0.22f, 0f), new Vector3(0.26f, 0.26f, 0.26f), Skin);
        }

        // The single service door between back of house and the world (internet gateway).
        private static void ServiceDoor(Transform p, Color tint)
        {
            Prim(p, PrimitiveType.Cube, new Vector3(-0.28f, -0.1f, 0f), new Vector3(0.1f, 0.7f, 0.12f), tint);
            Prim(p, PrimitiveType.Cube, new Vector3(0.28f, -0.1f, 0f), new Vector3(0.1f, 0.7f, 0.12f), tint);
            Prim(p, PrimitiveType.Cube, new Vector3(0f, 0.3f, 0f), new Vector3(0.74f, 0.12f, 0.14f), Shade(tint, 0.7f));         // lintel
            Prim(p, PrimitiveType.Cube, new Vector3(0f, -0.12f, 0.02f), new Vector3(0.42f, 0.5f, 0.04f), Shade(tint, 0.9f), new Vector3(0f, 18f, 0f)); // door ajar
        }

        private static void Station(Transform p, Color tint)
        {
            Prim(p, PrimitiveType.Cube, new Vector3(0f, -0.15f, 0f), new Vector3(0.6f, 0.5f, 0.5f), tint);
            Prim(p, PrimitiveType.Cube, new Vector3(0f, 0.16f, 0f), new Vector3(0.66f, 0.06f, 0.56f), Shade(tint, 0.7f));
        }

        // A shelving unit stacked with stock — the larder (S3). Three shelves hint at copies across AZs.
        private static void Larder(Transform p, Color tint)
        {
            Color box = new Color(0.66f, 0.50f, 0.34f);
            Prim(p, PrimitiveType.Cube, new Vector3(0f, -0.02f, -0.22f), new Vector3(0.7f, 0.88f, 0.06f), Shade(tint, 0.7f)); // back
            Prim(p, PrimitiveType.Cube, new Vector3(-0.34f, 0f, 0f), new Vector3(0.05f, 0.9f, 0.42f), Shade(tint, 0.6f));     // post
            Prim(p, PrimitiveType.Cube, new Vector3(0.34f, 0f, 0f), new Vector3(0.05f, 0.9f, 0.42f), Shade(tint, 0.6f));
            Prim(p, PrimitiveType.Cube, new Vector3(0f, -0.28f, 0f), new Vector3(0.66f, 0.05f, 0.4f), Shade(tint, 0.85f));    // shelves
            Prim(p, PrimitiveType.Cube, new Vector3(0f, 0.0f, 0f), new Vector3(0.66f, 0.05f, 0.4f), Shade(tint, 0.85f));
            Prim(p, PrimitiveType.Cube, new Vector3(0f, 0.28f, 0f), new Vector3(0.66f, 0.05f, 0.4f), Shade(tint, 0.85f));
            Prim(p, PrimitiveType.Cube, new Vector3(-0.16f, -0.16f, 0.05f), new Vector3(0.18f, 0.18f, 0.18f), box);           // stock
            Prim(p, PrimitiveType.Cube, new Vector3(0.16f, 0.12f, 0.05f), new Vector3(0.18f, 0.18f, 0.18f), box);
            Prim(p, PrimitiveType.Cube, new Vector3(-0.04f, 0.4f, 0.05f), new Vector3(0.18f, 0.18f, 0.18f), box);
        }

        // A walk-in freezer with a heavy door — the deep cold room (Glacier).
        private static void ColdRoom(Transform p, Color tint)
        {
            Color ice = new Color(0.72f, 0.82f, 0.9f);
            Prim(p, PrimitiveType.Cube, new Vector3(0f, -0.02f, 0f), new Vector3(0.7f, 0.85f, 0.6f), ice);
            Prim(p, PrimitiveType.Cube, new Vector3(0f, -0.05f, 0.31f), new Vector3(0.5f, 0.7f, 0.04f), new Color(0.82f, 0.9f, 0.95f)); // door
            Prim(p, PrimitiveType.Cube, new Vector3(0.18f, -0.05f, 0.34f), new Vector3(0.04f, 0.3f, 0.04f), new Color(0.5f, 0.52f, 0.55f)); // handle
            Prim(p, PrimitiveType.Cube, new Vector3(0f, 0.45f, 0f), new Vector3(0.76f, 0.08f, 0.66f), Shade(tint, 0.7f)); // accent
        }
    }
}
