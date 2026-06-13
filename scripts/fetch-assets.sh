#!/usr/bin/env bash
# Fetches the official AWS service icons used by the architecture view into Resources/Icons.
# Icons are AWS's (https://aws.amazon.com/architecture/icons/), sourced via the awslabs
# aws-icons-for-plantuml project. They are gitignored (not redistributed) — run this to populate locally.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICONS="$ROOT/Assets/_Project/Resources/Icons"
BASE="https://raw.githubusercontent.com/awslabs/aws-icons-for-plantuml/main/dist"
mkdir -p "$ICONS"

fetch() { # key  remote-path
  if curl -fsSL --max-time 30 "$BASE/$2" -o "$ICONS/$1.png"; then
    echo "  ok   $1"
  else
    echo "  FAIL $1 ($2)"
  fi
}

echo "Fetching AWS service icons -> $ICONS"
fetch EC2             Compute/EC2.png
fetch Server          General/Traditionalserver.png
fetch RDS             Database/RDS.png
fetch ELB             NetworkingContentDelivery/ElasticLoadBalancingApplicationLoadBalancer.png
fetch Route53         NetworkingContentDelivery/Route53.png
fetch CloudFront      NetworkingContentDelivery/CloudFront.png
fetch VPC             NetworkingContentDelivery/VirtualPrivateCloud.png
fetch InternetGateway NetworkingContentDelivery/VPCInternetGateway.png
fetch NATGateway      NetworkingContentDelivery/VPCNATGateway.png
fetch AutoScaling     Groups/AutoScalingGroup.png
fetch Region          Groups/Region.png
fetch User            General/User.png
echo "Done."
