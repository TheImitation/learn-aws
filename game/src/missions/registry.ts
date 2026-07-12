import type { MissionFactory } from './manager';
import { OrdersVanishingMission } from './ordersVanishing';
import { StorageBillMission } from './storageBill';
import { FlashSaleMission } from './flashSale';
import { SpecMission, type MissionSpec } from './spec';
import { CHECKOUT_SPEC, IAM_SPEC, PATCH_NIGHT_SPEC } from './specs/flagships';
import { DNS_ROUTING_SPEC, MULTIAZ_SPEC, VPC_ENDPOINTS_SPEC } from './specs/pilots';
import { DETECT_SPEC, KMS_SPEC, SECRETS_SPEC, SG_VS_NACL_SPEC, SSM_SPEC } from './specs/secure';
import {
  CLOUDTRAIL_SPEC, COGNITO_SPEC, COMPLIANT_SPEC, CONNECT_SPEC, EDGE_SPEC, HYBRID_SPEC,
  NET_BOUNDARIES_SPEC,
} from './specs/secure2';
import { CLOUDWATCH_SPEC, DR_SPEC, SNS_SPEC, STATELESS_SPEC, STEPFN_SPEC } from './specs/resilient';
import { BACKUP_SPEC, CFN_SPEC, EVENTBRIDGE_SPEC, MIGRATE_SPEC, PICKMSG_SPEC } from './specs/resilient2';
import { APIGW_SPEC, BLOCKFILE_SPEC, CDN_SPEC, ECS_SPEC, PANTRY_SPEC } from './specs/hp';
import { ATHENA_SPEC, AURORA_SPEC, GA_SPEC, KINESIS_SPEC, S3PROTECT_SPEC } from './specs/hp2';
import {
  ASG_SPEC, BILLWATCH_SPEC, COMPUTE_SPEC, LAMBDA_SPEC, ORG_SPEC, PURCHASE_SPEC, SCALEUPOUT_SPEC,
} from './specs/cost';

const spec = (s: MissionSpec): MissionFactory => (deps, topic) => new SpecMission(deps, topic, s);

/** Every playable field mission, keyed by topic id. Bespoke flagships first;
 *  everything after them is declarative (MissionSpec + SpecMission). */
export const MISSIONS: Record<string, MissionFactory> = {
  'private-egress-nat': spec(PATCH_NIGHT_SPEC),
  'ha-web-app': spec(CHECKOUT_SPEC),
  'decouple-with-queue-sqs': (deps, topic) => new OrdersVanishingMission(deps, topic),
  'secure-access-iam': spec(IAM_SPEC),
  'right-storage-class': (deps, topic) => new StorageBillMission(deps, topic),
  'cache-hot-items': (deps, topic) => new FlashSaleMission(deps, topic),
  'multiaz-vs-replicas': spec(MULTIAZ_SPEC),
  'vpc-endpoints': spec(VPC_ENDPOINTS_SPEC),
  'dns-routing-route53': spec(DNS_ROUTING_SPEC),
  'sg-vs-nacl': spec(SG_VS_NACL_SPEC),
  'encrypt-with-kms': spec(KMS_SPEC),
  'manage-secrets': spec(SECRETS_SPEC),
  'detect-threats': spec(DETECT_SPEC),
  'ssm-session': spec(SSM_SPEC),
  'network-boundaries-vpc': spec(NET_BOUNDARIES_SPEC),
  'protect-the-edge': spec(EDGE_SPEC),
  'connect-networks': spec(CONNECT_SPEC),
  'hybrid-connectivity': spec(HYBRID_SPEC),
  'user-signin-cognito': spec(COGNITO_SPEC),
  'audit-cloudtrail': spec(CLOUDTRAIL_SPEC),
  'stay-compliant': spec(COMPLIANT_SPEC),
  'monitor-cloudwatch': spec(CLOUDWATCH_SPEC),
  'fan-out-sns': spec(SNS_SPEC),
  'disaster-recovery': spec(DR_SPEC),
  'orchestrate-step-functions': spec(STEPFN_SPEC),
  'keep-it-stateless': spec(STATELESS_SPEC),
  'route-events-eventbridge': spec(EVENTBRIDGE_SPEC),
  'iac-cloudformation': spec(CFN_SPEC),
  'pick-messaging': spec(PICKMSG_SPEC),
  'centralize-backups': spec(BACKUP_SPEC),
  'migrate-data': spec(MIGRATE_SPEC),
  'store-serve-content': spec(CDN_SPEC),
  'pick-the-pantry': spec(PANTRY_SPEC),
  'block-vs-file-storage': spec(BLOCKFILE_SPEC),
  'containers-ecs': spec(ECS_SPEC),
  'api-front-door': spec(APIGW_SPEC),
  'analyse-the-data': spec(ATHENA_SPEC),
  'aurora-database': spec(AURORA_SPEC),
  'stream-data-kinesis': spec(KINESIS_SPEC),
  'global-accelerator': spec(GA_SPEC),
  's3-protection': spec(S3PROTECT_SPEC),
  'go-serverless-lambda': spec(LAMBDA_SPEC),
  'optimise-cost': spec(PURCHASE_SPEC),
  'auto-scaling': spec(ASG_SPEC),
  'watch-the-bill': spec(BILLWATCH_SPEC),
  'choose-compute': spec(COMPUTE_SPEC),
  'scale-up-vs-out': spec(SCALEUPOUT_SPEC),
  'govern-accounts': spec(ORG_SPEC),
};
