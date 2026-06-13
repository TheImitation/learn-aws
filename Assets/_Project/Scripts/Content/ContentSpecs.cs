using System.Collections.Generic;
using UnityEngine;

namespace LearnAWS.Content
{
    /// <summary>
    /// Data description of one block in a topic. Plain runtime POCOs today; the catalog that produces them
    /// (see SolutionsArchitectContent) is the seam where ScriptableObject/JSON authoring can drop in later.
    /// </summary>
    public class BlockSpec
    {
        public string id;
        public AwsBlockKind kind;
        public string displayName;
        public ServiceCategory category = ServiceCategory.Generic;

        public bool isContainer;          // Region / VPC / Subnet -> drawn as a wireframe plot
        public Vector3 position;          // architecture-view world position (container = centre)
        public Vector3 size = Vector3.one; // container extents

        // Story ("town") view:
        public Vector3 storyPosition;     // where this block sits in the town layout
        public string storyName;          // friendly name shown in story view (falls back to displayName)

        // Visual assets (optional overrides; otherwise derived from kind). Files live under Resources/Icons & Resources/Models.
        public string iconKey;            // AWS service icon shown in architecture view
        public string modelKey;           // low-poly model used as the building in story view

        // "Peel the label" detail:
        public ArnInfo arn;
        public CidrInfo cidr;
        public string endpoint;
        public string[] ports;

        public string plainSummary;       // tangible explanation
        public string realSummary;        // the real AWS detail
    }

    /// <summary>The three gates that must line up before a connection completes.</summary>
    public class ConnectionRequirement
    {
        public string addressNote;        // ARN / endpoint that identifies the target
        public string permissionNote;     // human summary of the permission needed
        public SecurityGroupRule securityGroup;
        public IamGrant iam;
        public string routeNote;          // network reachability (subnets / CIDR / route table)
    }

    public class ConnectionSpec
    {
        public string id;
        public string fromBlockId;
        public string toBlockId;
        public ConnectionFlowKind flow = ConnectionFlowKind.Request;
        public string plainSummary;
        public ConnectionRequirement requirement = new ConnectionRequirement();
    }

    public enum StageAnimation
    {
        None,
        Pulse,       // a request travels along one connection
        Spike,       // a surge -> the Auto Scaling group adds a worker
        Overload,    // a single thing is swamped by arrivals and buckles
        Chain,       // a request hops the whole path, link by link
        Failover     // an AZ drops; traffic reroutes to the other
    }

    /// <summary>One step of the guided journey. Visibility lists are absolute, so scrubbing/replay is trivial.</summary>
    public class StageSpec
    {
        public int index;
        public string title;
        public string narration;
        public string concept;
        public string focusBlockId;
        public StageAnimation animation = StageAnimation.None;
        public string animationConnectionId;                                    // for Pulse
        public List<string> animationChainConnectionIds = new List<string>();   // for Chain (ordered hops)
        public List<string> visibleBlockIds = new List<string>();
        public List<string> visibleConnectionIds = new List<string>();
    }

    public enum QuestionKind
    {
        SingleChoice,
        MultiChoice,
        TapToFix     // tap the block in the 3D world that fixes the scenario
    }

    public class QuestionSpec
    {
        public QuestionKind kind = QuestionKind.SingleChoice;
        public string prompt;
        public string[] options;
        public int[] correctIndices;     // for single/multi choice
        public string tapTargetBlockId;  // for TapToFix
        public string explanation;
    }

    public class QuizSpec
    {
        public List<QuestionSpec> questions = new List<QuestionSpec>();
    }

    public class TopicSpec
    {
        public string id;
        public string title;
        public string examDomain;
        public string summary;

        public List<BlockSpec> blocks = new List<BlockSpec>();
        public List<ConnectionSpec> connections = new List<ConnectionSpec>();
        public List<StageSpec> stages = new List<StageSpec>();
        public QuizSpec quiz = new QuizSpec();

        public BlockSpec GetBlock(string id) => blocks.Find(b => b.id == id);
        public ConnectionSpec GetConnection(string id) => connections.Find(c => c.id == id);
    }

    public class CourseSpec
    {
        public string id;
        public string title;
        public List<TopicSpec> topics = new List<TopicSpec>();
    }
}
