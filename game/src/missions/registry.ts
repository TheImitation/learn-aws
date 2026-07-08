import type { MissionFactory } from './manager';
import { PatchNightMission } from './patchNight';
import { CheckoutDownMission } from './checkoutDown';
import { OrdersVanishingMission } from './ordersVanishing';
import { LeakedKeyMission } from './leakedKey';
import { StorageBillMission } from './storageBill';
import { FlashSaleMission } from './flashSale';
import { SpecMission, type MissionSpec } from './spec';
import { DNS_ROUTING_SPEC, MULTIAZ_SPEC, VPC_ENDPOINTS_SPEC } from './specs/pilots';

const spec = (s: MissionSpec): MissionFactory => (deps, topic) => new SpecMission(deps, topic, s);

/** Every playable field mission, keyed by topic id. Bespoke flagships first;
 *  everything after them is declarative (MissionSpec + SpecMission). */
export const MISSIONS: Record<string, MissionFactory> = {
  'private-egress-nat': (deps, topic) => new PatchNightMission(deps, topic),
  'ha-web-app': (deps, topic) => new CheckoutDownMission(deps, topic),
  'decouple-with-queue-sqs': (deps, topic) => new OrdersVanishingMission(deps, topic),
  'secure-access-iam': (deps, topic) => new LeakedKeyMission(deps, topic),
  'right-storage-class': (deps, topic) => new StorageBillMission(deps, topic),
  'cache-hot-items': (deps, topic) => new FlashSaleMission(deps, topic),
  'multiaz-vs-replicas': spec(MULTIAZ_SPEC),
  'vpc-endpoints': spec(VPC_ENDPOINTS_SPEC),
  'dns-routing-route53': spec(DNS_ROUTING_SPEC),
};
