import type { Topic } from '@content';
import { readProgress } from '../core/progress';

/** Course presentation metadata, ported from the frozen narrative app (web/src/main.js):
 *  official exam-domain weights and the per-topic difficulty tier. */

export interface DomainMeta { key: string; label: string; accent: string; weight: number }

export const DOMAINS: DomainMeta[] = [
  { key: 'Design Secure Architectures', label: 'Secure architectures', accent: '#d15656', weight: 30 },
  { key: 'Design Resilient Architectures', label: 'Resilient architectures', accent: '#5a8fd1', weight: 26 },
  { key: 'Design High-Performing Architectures', label: 'High-performing architectures', accent: '#33b38c', weight: 24 },
  { key: 'Design Cost-Optimized Architectures', label: 'Cost-optimized architectures', accent: '#67ad5b', weight: 20 },
];

/** DVA-C02 (Developer – Associate) domains, official weights. */
export const DEV_DOMAINS: DomainMeta[] = [
  { key: 'Development with AWS Services', label: 'Development with AWS services', accent: '#e8a03c', weight: 32 },
  { key: 'Security (Developer)', label: 'Security', accent: '#d15656', weight: 26 },
  { key: 'Deployment', label: 'Deployment', accent: '#8f7ae6', weight: 24 },
  { key: 'Troubleshooting and Optimization', label: 'Troubleshooting & optimization', accent: '#33b38c', weight: 18 },
];

/** CLF-C02 (Cloud Practitioner) domains, official weights. */
export const CLF_DOMAINS: DomainMeta[] = [
  { key: 'Cloud Concepts', label: 'Cloud concepts', accent: '#8da3c4', weight: 24 },
  { key: 'Security and Compliance', label: 'Security & compliance', accent: '#d15656', weight: 30 },
  { key: 'Cloud Technology and Services', label: 'Technology & services', accent: '#33b38c', weight: 34 },
  { key: 'Billing, Pricing, and Support', label: 'Billing, pricing & support', accent: '#67ad5b', weight: 12 },
];

/** CloudOps Engineer – Associate (formerly SysOps), classic six domains. */
export const SOA_DOMAINS: DomainMeta[] = [
  { key: 'Monitoring, Logging, and Remediation', label: 'Monitoring & remediation', accent: '#7ab3e0', weight: 20 },
  { key: 'Reliability and Business Continuity', label: 'Reliability & continuity', accent: '#5a8fd1', weight: 16 },
  { key: 'Deployment, Provisioning, and Automation', label: 'Deployment & automation', accent: '#8f7ae6', weight: 18 },
  { key: 'Security and Compliance (Ops)', label: 'Security & compliance', accent: '#d15656', weight: 16 },
  { key: 'Networking and Content Delivery (Ops)', label: 'Networking & delivery', accent: '#c98ae8', weight: 18 },
  { key: 'Cost and Performance Optimization', label: 'Cost & performance', accent: '#67ad5b', weight: 12 },
];

export const LEVEL_NAME: Record<number, string> = { 1: 'Foundational', 2: 'Core', 3: 'Advanced' };

/** Difficulty tier per topic (1 Foundational · 2 Core · 3 Advanced) — v1's CARD levels. */
export const LEVELS: Record<string, number> = {
  'ha-web-app': 1, 'store-serve-content': 1, 'secure-access-iam': 1, 'network-boundaries-vpc': 1,
  'decouple-with-queue-sqs': 2, 'go-serverless-lambda': 2, 'pick-the-pantry': 2, 'cache-hot-items': 2,
  'optimise-cost': 1, 'monitor-cloudwatch': 2, 'block-vs-file-storage': 2, 'fan-out-sns': 2,
  'dns-routing-route53': 2, 'disaster-recovery': 3, 'containers-ecs': 2, 'encrypt-with-kms': 2,
  'protect-the-edge': 3, 'api-front-door': 2, 'orchestrate-step-functions': 3, 'auto-scaling': 2,
  'analyse-the-data': 3, 'manage-secrets': 2, 'watch-the-bill': 1, 'aurora-database': 3,
  'connect-networks': 2, 'keep-it-stateless': 2, 'route-events-eventbridge': 3, 'stream-data-kinesis': 3,
  'right-storage-class': 2, 'choose-compute': 1, 'hybrid-connectivity': 3, 'detect-threats': 3,
  'global-accelerator': 3, 'user-signin-cognito': 2, 'iac-cloudformation': 3, 'audit-cloudtrail': 2,
  'sg-vs-nacl': 3, 'multiaz-vs-replicas': 3, 'pick-messaging': 2, 'scale-up-vs-out': 2,
  'private-egress-nat': 2, 's3-protection': 2, 'govern-accounts': 3, 'vpc-endpoints': 3,
  'centralize-backups': 2, 'migrate-data': 2, 'stay-compliant': 3, 'ssm-session': 2,
  // Developer badge (DVA-C02)
  'dva-api-proxy': 1, 'dva-secrets-in-code': 1, 'dva-sam-drift': 1, 'dva-lambda-tuning': 1,
  'dva-idempotent-lambda': 2, 'dva-ddb-hot-partition': 2, 'dva-jwt-cognito': 2,
  'dva-sts-least-priv': 2, 'dva-canary-alias': 2, 'dva-pipeline-gates': 2,
  'dva-stepfn-retry': 3, 'dva-xray-tracing': 3,
  // Cloud Practitioner (CLF-C02) — all foundational
  'clf-elasticity': 1, 'clf-regions-azs': 1, 'clf-shared-responsibility': 1, 'clf-account-hygiene': 1,
  'clf-core-services': 1, 'clf-managed-vs-diy': 1, 'clf-pricing-models': 1, 'clf-support-plans': 1,
  // CloudOps (SysOps)
  'soa-alarm-fatigue': 1, 'soa-runbook-automation': 2, 'soa-restore-drill': 1, 'soa-asg-health': 2,
  'soa-launch-templates': 2, 'soa-patch-fleet': 2, 'soa-vpc-debug': 2, 'soa-rightsize': 1,
};

export const levelOf = (id: string) => LEVELS[id] ?? 2;

/** Domain order → tier → course order (v1's learning order). */
export function orderedTopics(topics: Topic[], domains: DomainMeta[] = DOMAINS): Topic[] {
  const di = (t: Topic) => { const i = domains.findIndex((d) => d.key === t.examDomain); return i < 0 ? 99 : i; };
  return topics.map((t, i) => ({ t, i }))
    .sort((a, b) => di(a.t) - di(b.t) || levelOf(a.t.id) - levelOf(b.t.id) || a.i - b.i)
    .map((x) => x.t);
}

/** Highest unlocked tier in a domain: tier N+1 opens once every tier-N topic is Mastered. */
export function unlockedLevel(topics: Topic[], domainKey: string): number {
  const prog = readProgress();
  const inDomain = topics.filter((t) => t.examDomain === domainKey);
  let lvl = 1;
  for (const l of [1, 2]) {
    const tier = inDomain.filter((t) => levelOf(t.id) === l);
    if (tier.length && tier.every((t) => prog[t.id]?.mastery === 'Mastered')) lvl = l + 1;
    else break;
  }
  return lvl;
}

export const isLocked = (topics: Topic[], t: Topic) => levelOf(t.id) > unlockedLevel(topics, t.examDomain);

/** v1's readiness(): per-domain average of best scores, blended by official exam weight. */
export function readiness(topics: Topic[], domains: DomainMeta[] = DOMAINS) {
  const prog = readProgress();
  const score = (id: string) => prog[id]?.best || 0;
  const per = domains.map((d) => {
    const ts = topics.filter((t) => t.examDomain === d.key);
    const avg = ts.length ? ts.reduce((s, t) => s + score(t.id), 0) / ts.length : 0;
    return { d, pct: Math.round(avg) };
  });
  const wsum = domains.reduce((s, d) => s + d.weight, 0);
  const overall = Math.round(per.reduce((s, x) => s + x.pct * x.d.weight, 0) / wsum);
  const weakest = per.slice().sort((a, b) => a.pct - b.pct)[0];
  const attempted = topics.filter((t) => (prog[t.id]?.mastery ?? 'Not started') !== 'Not started').length;
  return { overall, per, weakest, attempted, total: topics.length };
}

/** First unlocked, non-mastered topic in learning order — the "recommended" ticket. */
export function recommended(topics: Topic[], domains: DomainMeta[] = DOMAINS): Topic | null {
  const prog = readProgress();
  return orderedTopics(topics, domains).find((t) => prog[t.id]?.mastery !== 'Mastered' && !isLocked(topics, t)) ?? null;
}
