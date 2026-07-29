import type { Topic } from '@content';
import { COURSE } from '@content';
import { type DomainMeta, DOMAINS, DEV_DOMAINS, CLF_DOMAINS, SOA_DOMAINS } from './meta';
import { DEV_COURSE } from './devCourse';
import { CLF_COURSE } from './clfCourse';
import { SOA_COURSE } from './sysopsCourse';

/** The badge catalog — every certification in the official AWS suite, so the
 *  player always knows WHICH badge a ticket teaches toward. Playable badges
 *  carry a full course + missions; planned ones show their official domain
 *  structure as the roadmap. */

export interface BadgeDef {
  id: string;
  code: string; //     exam code shown on signage
  name: string;
  level: 'Foundational' | 'Associate' | 'Professional' | 'Specialty';
  accent: string;
  blurb: string; //    one line: who this badge is for
  domains: DomainMeta[];
  topics: Topic[]; //  empty for planned badges
  status: 'playable' | 'planned';
}

export const BADGES: BadgeDef[] = [
  {
    id: 'clf', code: 'CLF-C02', name: 'Cloud Practitioner', level: 'Foundational', accent: '#8da3c4',
    blurb: 'The foundation: what the cloud is, who secures what, and where the money goes.',
    domains: CLF_DOMAINS, topics: CLF_COURSE.topics, status: 'playable',
  },
  {
    id: 'aif', code: 'AIF-C01', name: 'AI Practitioner', level: 'Foundational', accent: '#8da3c4',
    blurb: 'AI/ML and generative AI fundamentals, responsibly applied.',
    domains: [
      { key: 'Fundamentals of AI and ML', label: 'Fundamentals of AI & ML', accent: '#8da3c4', weight: 20 },
      { key: 'Fundamentals of Generative AI', label: 'Fundamentals of generative AI', accent: '#8da3c4', weight: 24 },
      { key: 'Applications of Foundation Models', label: 'Applications of foundation models', accent: '#8da3c4', weight: 28 },
      { key: 'Guidelines for Responsible AI', label: 'Responsible AI', accent: '#8da3c4', weight: 14 },
      { key: 'Security, Compliance, and Governance for AI', label: 'Security & governance for AI', accent: '#8da3c4', weight: 14 },
    ], topics: [], status: 'planned',
  },
  {
    id: 'saa', code: 'SAA-C03', name: 'Solutions Architect – Associate', level: 'Associate', accent: '#5fd29a',
    blurb: 'Design secure, resilient, high-performing, cost-optimized architectures.',
    domains: DOMAINS, topics: COURSE.topics, status: 'playable',
  },
  {
    id: 'dva', code: 'DVA-C02', name: 'Developer – Associate', level: 'Associate', accent: '#e8a03c',
    blurb: 'Build, secure, deploy, and debug applications ON AWS.',
    domains: DEV_DOMAINS, topics: DEV_COURSE.topics, status: 'playable',
  },
  {
    id: 'cop', code: 'SOA', name: 'CloudOps Engineer – Associate', level: 'Associate', accent: '#7ab3e0',
    blurb: 'Run production: monitoring, remediation, patching, and the 3 a.m. pager. (Formerly SysOps Administrator.)',
    domains: SOA_DOMAINS, topics: SOA_COURSE.topics, status: 'playable',
  },
  {
    id: 'dea', code: 'DEA-C01', name: 'Data Engineer – Associate', level: 'Associate', accent: '#b8a3f0',
    blurb: 'Pipelines, stores, and governance for data at scale.',
    domains: [
      { key: 'Data Ingestion and Transformation', label: 'Ingestion & transformation', accent: '#b8a3f0', weight: 34 },
      { key: 'Data Store Management', label: 'Data store management', accent: '#b8a3f0', weight: 26 },
      { key: 'Data Operations and Support', label: 'Operations & support', accent: '#b8a3f0', weight: 22 },
      { key: 'Data Security and Governance', label: 'Security & governance', accent: '#b8a3f0', weight: 18 },
    ], topics: [], status: 'planned',
  },
  {
    id: 'mla', code: 'MLA-C01', name: 'Machine Learning Engineer – Associate', level: 'Associate', accent: '#b8a3f0',
    blurb: 'Prepare data, train, deploy, and operate ML workloads.',
    domains: [
      { key: 'Data Preparation for ML', label: 'Data preparation for ML', accent: '#b8a3f0', weight: 28 },
      { key: 'ML Model Development', label: 'Model development', accent: '#b8a3f0', weight: 26 },
      { key: 'Deployment and Orchestration of ML Workflows', label: 'Deployment & orchestration', accent: '#b8a3f0', weight: 22 },
      { key: 'ML Solution Monitoring, Maintenance, and Security', label: 'Monitoring & security', accent: '#b8a3f0', weight: 24 },
    ], topics: [], status: 'planned',
  },
  {
    id: 'sap', code: 'SAP-C02', name: 'Solutions Architect – Professional', level: 'Professional', accent: '#e87a7a',
    blurb: 'Architecture at organizational scale: complexity, migration, continuous improvement.',
    domains: [
      { key: 'Design Solutions for Organizational Complexity', label: 'Organizational complexity', accent: '#e87a7a', weight: 26 },
      { key: 'Design for New Solutions', label: 'New solutions', accent: '#e87a7a', weight: 29 },
      { key: 'Continuous Improvement for Existing Solutions', label: 'Continuous improvement', accent: '#e87a7a', weight: 25 },
      { key: 'Accelerate Workload Migration and Modernization', label: 'Migration & modernization', accent: '#e87a7a', weight: 20 },
    ], topics: [], status: 'planned',
  },
  {
    id: 'dop', code: 'DOP-C02', name: 'DevOps Engineer – Professional', level: 'Professional', accent: '#e87a7a',
    blurb: 'SDLC automation, IaC, and incident response at professional depth.',
    domains: [
      { key: 'SDLC Automation', label: 'SDLC automation', accent: '#e87a7a', weight: 22 },
      { key: 'Configuration Management and IaC', label: 'Config management & IaC', accent: '#e87a7a', weight: 17 },
      { key: 'Resilient Cloud Solutions', label: 'Resilient solutions', accent: '#e87a7a', weight: 15 },
      { key: 'Monitoring and Logging', label: 'Monitoring & logging', accent: '#e87a7a', weight: 15 },
      { key: 'Incident and Event Response', label: 'Incident response', accent: '#e87a7a', weight: 14 },
      { key: 'Security and Compliance (DevOps)', label: 'Security & compliance', accent: '#e87a7a', weight: 17 },
    ], topics: [], status: 'planned',
  },
  {
    id: 'ans', code: 'ANS-C01', name: 'Advanced Networking – Specialty', level: 'Specialty', accent: '#c98ae8',
    blurb: 'Hybrid connectivity, DNS, and network security at specialist depth.',
    domains: [
      { key: 'Network Design', label: 'Network design', accent: '#c98ae8', weight: 30 },
      { key: 'Network Implementation', label: 'Network implementation', accent: '#c98ae8', weight: 26 },
      { key: 'Network Management and Operation', label: 'Management & operation', accent: '#c98ae8', weight: 20 },
      { key: 'Network Security, Compliance, and Governance', label: 'Security & governance', accent: '#c98ae8', weight: 24 },
    ], topics: [], status: 'planned',
  },
  {
    id: 'scs', code: 'SCS-C02', name: 'Security – Specialty', level: 'Specialty', accent: '#c98ae8',
    blurb: 'Threat detection, data protection, and IAM at specialist depth.',
    domains: [
      { key: 'Threat Detection and Incident Response', label: 'Threat detection & IR', accent: '#c98ae8', weight: 14 },
      { key: 'Security Logging and Monitoring', label: 'Logging & monitoring', accent: '#c98ae8', weight: 18 },
      { key: 'Infrastructure Security', label: 'Infrastructure security', accent: '#c98ae8', weight: 20 },
      { key: 'Identity and Access Management', label: 'IAM', accent: '#c98ae8', weight: 16 },
      { key: 'Data Protection', label: 'Data protection', accent: '#c98ae8', weight: 18 },
      { key: 'Management and Security Governance', label: 'Governance', accent: '#c98ae8', weight: 14 },
    ], topics: [], status: 'planned',
  },
];

export const playableBadges = () => BADGES.filter((b) => b.status === 'playable');
