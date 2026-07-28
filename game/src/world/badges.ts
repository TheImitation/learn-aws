import { Mesh, MeshBuilder, Scene, TransformNode, Vector3 } from '@babylonjs/core';
import { drawnMat } from './textures';

/** AWS service badges — floating markers over mission machines so you always
 *  know which service a contraption stands for. Drawn in the official AWS
 *  category colours (compute orange, storage green, database magenta,
 *  networking purple, security red, integration pink) with the service name;
 *  we deliberately don't embed Amazon's trademarked icon art. */

export interface ServiceDef {
  abbrev: string; // big text on the badge
  label: string; //  small line underneath
  color: string; //  AWS architecture-icon category colour
}

const COMPUTE = '#ED7100';
const STORAGE = '#7AA116';
const DATABASE = '#C925D1';
const NETWORK = '#8C4FFF';
const SECURITY = '#DD344C';
const INTEGRATION = '#E7157B';
const MGMT = '#E7157B';

export const SERVICES: Record<string, ServiceDef> = {
  ec2: { abbrev: 'EC2', label: 'Amazon EC2', color: COMPUTE },
  lambda: { abbrev: 'λ', label: 'AWS Lambda', color: COMPUTE },
  ecs: { abbrev: 'ECS', label: 'Amazon ECS', color: COMPUTE },
  asg: { abbrev: 'ASG', label: 'Auto Scaling', color: COMPUTE },
  s3: { abbrev: 'S3', label: 'Amazon S3', color: STORAGE },
  ebs: { abbrev: 'EBS', label: 'Amazon EBS', color: STORAGE },
  efs: { abbrev: 'EFS', label: 'Amazon EFS', color: STORAGE },
  glacier: { abbrev: 'GL', label: 'S3 Glacier', color: STORAGE },
  backup: { abbrev: 'BKP', label: 'AWS Backup', color: STORAGE },
  rds: { abbrev: 'RDS', label: 'Amazon RDS', color: DATABASE },
  aurora: { abbrev: 'AUR', label: 'Amazon Aurora', color: DATABASE },
  dynamodb: { abbrev: 'DDB', label: 'DynamoDB', color: DATABASE },
  elasticache: { abbrev: 'ELC', label: 'ElastiCache', color: DATABASE },
  alb: { abbrev: 'ALB', label: 'Load Balancer', color: NETWORK },
  nat: { abbrev: 'NAT', label: 'NAT Gateway', color: NETWORK },
  igw: { abbrev: 'IGW', label: 'Internet Gateway', color: NETWORK },
  vpc: { abbrev: 'VPC', label: 'Amazon VPC', color: NETWORK },
  cloudfront: { abbrev: 'CF', label: 'CloudFront', color: NETWORK },
  route53: { abbrev: 'R53', label: 'Route 53', color: NETWORK },
  ga: { abbrev: 'GA', label: 'Global Accelerator', color: NETWORK },
  privatelink: { abbrev: 'PL', label: 'PrivateLink', color: NETWORK },
  iam: { abbrev: 'IAM', label: 'AWS IAM', color: SECURITY },
  kms: { abbrev: 'KMS', label: 'AWS KMS', color: SECURITY },
  waf: { abbrev: 'WAF', label: 'AWS WAF', color: SECURITY },
  sg: { abbrev: 'SG', label: 'Security Group', color: SECURITY },
  nacl: { abbrev: 'NACL', label: 'Network ACL', color: SECURITY },
  guardduty: { abbrev: 'GD', label: 'GuardDuty', color: SECURITY },
  secrets: { abbrev: 'SM', label: 'Secrets Manager', color: SECURITY },
  cognito: { abbrev: 'COG', label: 'Amazon Cognito', color: SECURITY },
  sqs: { abbrev: 'SQS', label: 'Amazon SQS', color: INTEGRATION },
  dlq: { abbrev: 'DLQ', label: 'Dead-letter queue', color: INTEGRATION },
  sns: { abbrev: 'SNS', label: 'Amazon SNS', color: INTEGRATION },
  eventbridge: { abbrev: 'EVB', label: 'EventBridge', color: INTEGRATION },
  stepfunctions: { abbrev: 'SFN', label: 'Step Functions', color: INTEGRATION },
  kinesis: { abbrev: 'KDS', label: 'Amazon Kinesis', color: DATABASE },
  apigw: { abbrev: 'API', label: 'API Gateway', color: INTEGRATION },
  cloudwatch: { abbrev: 'CW', label: 'CloudWatch', color: MGMT },
  cloudtrail: { abbrev: 'CT', label: 'CloudTrail', color: MGMT },
  cloudformation: { abbrev: 'CFN', label: 'CloudFormation', color: MGMT },
};

/** Kind-based defaults — ONLY kinds whose service is unambiguous across every
 *  mission that uses them. Anything context-dependent (shelfUnit, badgeDoor)
 *  must set MachineDef.service explicitly; 'none' suppresses a default. */
export const KIND_SERVICE: Record<string, string> = {
  serverRack: 'ec2',
  dbTower: 'rds',
  natAirlock: 'nat',
  internetGate: 'igw',
  cacheNode: 'elasticache',
  conveyor: 'sqs',
  dlqBin: 'dlq',
  routerArm: 'alb',
};

/** A floating, camera-facing service badge. Returns null for unknown keys. */
export function serviceBadge(scene: Scene, at: Vector3, serviceKey: string): TransformNode | null {
  const def = SERVICES[serviceKey];
  if (!def) return null;
  const root = new TransformNode('svc-badge', scene);
  root.position.copyFrom(at);
  const plane = MeshBuilder.CreatePlane('svc-badge-p', { width: 0.62, height: 0.78 }, scene);
  plane.parent = root;
  plane.billboardMode = Mesh.BILLBOARDMODE_Y;
  plane.isPickable = false;
  plane.metadata = { noOutline: true, noShadow: true };
  plane.material = drawnMat(scene, 'svc-' + serviceKey, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    // rounded service square in the category colour
    const pad = 14;
    const size = w - pad * 2;
    const r = 26;
    ctx.beginPath();
    ctx.roundRect(pad, pad, size, size, r);
    const g = ctx.createLinearGradient(0, pad, 0, pad + size);
    g.addColorStop(0, shade(def.color, 1.12));
    g.addColorStop(1, shade(def.color, 0.86));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${def.abbrev.length > 3 ? 56 : 78}px ui-monospace, Menlo, monospace`;
    ctx.fillText(def.abbrev, w / 2, pad + size / 2 + 2);
    // name plate under the square
    ctx.font = '700 26px ui-monospace, Menlo, monospace';
    ctx.fillStyle = '#0d1017';
    ctx.fillRect(0, h - 44, w, 40);
    ctx.fillStyle = '#d7e3f5';
    ctx.fillText(def.label, w / 2, h - 24);
  }, 256, 320);
  (plane.material as { diffuseTexture?: { hasAlpha: boolean } }).diffuseTexture!.hasAlpha = true;
  (plane.material as { useAlphaFromDiffuseTexture?: boolean }).useAlphaFromDiffuseTexture = true;
  return root;
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, '0');
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
}
