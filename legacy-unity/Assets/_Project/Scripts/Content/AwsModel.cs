using System;

namespace LearnAWS.Content
{
    /// <summary>High-level service family — used for colour-coding blocks in the world.</summary>
    public enum ServiceCategory
    {
        Generic,
        Networking,
        Compute,
        Database,
        Edge,
        Storage,
        Security
    }

    /// <summary>Every kind of block the world can place. Containers (Region/VPC/Subnet) are drawn as wireframe plots.</summary>
    public enum AwsBlockKind
    {
        User,
        GenericServer,
        Region,
        AvailabilityZone,
        Vpc,
        PublicSubnet,
        PrivateSubnet,
        InternetGateway,
        NatGateway,
        Ec2Instance,
        AutoScalingGroup,
        ApplicationLoadBalancer,
        RdsPrimary,
        RdsStandby,
        CloudFront,
        Route53,
        S3Bucket,
        GlacierVault,
        IamService,
        SecurityGroup,
        BastionHost,
        SqsQueue
    }

    public enum ConnectionFlowKind
    {
        Request,
        Data,
        Replication,
        Network
    }

    /// <summary>The "nameplate" on a block — an Amazon Resource Name.</summary>
    [Serializable]
    public class ArnInfo
    {
        public string partition = "aws";
        public string service;
        public string region;
        public string accountId;
        public string resource;

        public ArnInfo() { }

        public ArnInfo(string service, string region, string accountId, string resource)
        {
            this.service = service;
            this.region = region;
            this.accountId = accountId;
            this.resource = resource;
        }

        public string ToArnString()
        {
            return $"arn:{partition}:{service}:{region}:{accountId}:{resource}";
        }
    }

    /// <summary>The "plot sign" on a container — a CIDR range. Its size is literally visible in the world.</summary>
    [Serializable]
    public class CidrInfo
    {
        public string baseAddress;
        public int prefixLength;

        public CidrInfo() { }

        public CidrInfo(string baseAddress, int prefixLength)
        {
            this.baseAddress = baseAddress;
            this.prefixLength = prefixLength;
        }

        /// <summary>Total addresses in the block (e.g. /16 = 65,536, /24 = 256).</summary>
        public long AddressCount => 1L << (32 - prefixLength);

        public string ToCidrString() => $"{baseAddress}/{prefixLength}";
    }

    /// <summary>One line on a security group's "guest list".</summary>
    [Serializable]
    public class SecurityGroupRule
    {
        public string direction;   // "inbound" / "outbound"
        public string protocol;    // "TCP"
        public string portRange;   // "443"
        public string source;      // "web-tier SG", "0.0.0.0/0"

        public SecurityGroupRule() { }

        public SecurityGroupRule(string direction, string protocol, string portRange, string source)
        {
            this.direction = direction;
            this.protocol = protocol;
            this.portRange = portRange;
            this.source = source;
        }

        public string Describe() => $"{direction} {protocol} {portRange} from {source}";
    }

    /// <summary>The "badge" a block wears — an IAM role granting it rights elsewhere.</summary>
    [Serializable]
    public class IamGrant
    {
        public string roleName;
        public string[] allows;

        public IamGrant() { }

        public IamGrant(string roleName, params string[] allows)
        {
            this.roleName = roleName;
            this.allows = allows;
        }
    }
}
