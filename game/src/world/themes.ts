import { Scene, TransformNode, Vector3 } from '@babylonjs/core';
import {
  barrels, cameraPole, cableTray, crateStack, entryArch, floorZone, gantry,
  hazardStrip, serverRow, siteLight, ventBlock, wallPanels,
} from './decor';

/** Domain themes: automatic set-dressing for the mission pad, keyed by the
 *  topic's exam domain. Applied by the MissionManager on mission start (cached
 *  while the domain stays the same); disposed with root.dispose(false, true).
 *  All pieces are physics-free and sit outside the central machine field
 *  (|x| ≥ 10 or |z| ≥ 8 origin-relative, or overhead) so no mission layout,
 *  carry path, or E2E script can collide with them. */

interface ThemeSpec {
  label: string; //  arch subtitle
  accent: string;
  dress: (scene: Scene, o: Vector3, root: TransformNode) => void;
}

const parentAll = (root: TransformNode, ...nodes: TransformNode[]) => {
  for (const n of nodes) n.parent = root;
};

// pad half-extents: x ±17, z ±15 (walls at 17.3/15.3)
const THEMES: Record<string, ThemeSpec> = {
  'Design Secure Architectures': {
    label: 'secure perimeter',
    accent: '#d15656',
    dress: (s, o, r) => {
      parentAll(r,
        wallPanels(s, o.add(new Vector3(0, 0, 15.1)), 0, 33, '#d15656'),
        wallPanels(s, o.add(new Vector3(-17.1, 0, 0)), Math.PI / 2, 29, '#d15656'),
        wallPanels(s, o.add(new Vector3(17.1, 0, 0)), Math.PI / 2, 29, '#d15656'),
        cameraPole(s, o.add(new Vector3(-15.5, 0, 13.5)), Math.PI * 0.75),
        cameraPole(s, o.add(new Vector3(15.5, 0, 13.5)), -Math.PI * 0.75),
        cameraPole(s, o.add(new Vector3(-15.5, 0, -13.5)), Math.PI * 0.25),
        hazardStrip(s, o.add(new Vector3(0, 0, -12.8)), 12, 0.9),
        floorZone(s, o.add(new Vector3(-13, 0, -10.5)), 5, 4, '#3a1c1c', 'restricted'),
        gantry(s, o.add(new Vector3(0, 0, 10)), 0, 26, '#d15656'),
        siteLight(s, o.add(new Vector3(14.5, 0, -12.5)), -Math.PI / 4),
        siteLight(s, o.add(new Vector3(-14.5, 0, 12.5)), Math.PI * 0.75),
        ventBlock(s, o.add(new Vector3(12, 0, 14.6)), 0),
        ventBlock(s, o.add(new Vector3(-12, 0, 14.6)), 0),
      );
    },
  },
  'Design Resilient Architectures': {
    label: 'dual-hall datacenter',
    accent: '#5a8fd1',
    dress: (s, o, r) => {
      parentAll(r,
        wallPanels(s, o.add(new Vector3(0, 0, 15.1)), 0, 33, '#5a8fd1'),
        wallPanels(s, o.add(new Vector3(-17.1, 0, 0)), Math.PI / 2, 29, '#5a8fd1'),
        wallPanels(s, o.add(new Vector3(17.1, 0, 0)), Math.PI / 2, 29, '#5a8fd1'),
        serverRow(s, o.add(new Vector3(-12.5, 0, 13.8)), 0, 5, '#7ab3e0'),
        serverRow(s, o.add(new Vector3(12.5, 0, 13.8)), 0, 5, '#7ab3e0'),
        serverRow(s, o.add(new Vector3(-16.2, 0, -6)), Math.PI / 2, 4, '#7ab3e0'),
        gantry(s, o.add(new Vector3(-8, 0, 0)), 0, 16, '#5a8fd1'),
        gantry(s, o.add(new Vector3(8, 0, 0)), 0, 16, '#5a8fd1'),
        cableTray(s, o.add(new Vector3(-12, 0, 12)), o.add(new Vector3(12, 0, 12)), 3.0),
        floorZone(s, o.add(new Vector3(-13.5, 0, -12)), 5, 4, '#16233a', 'hall a'),
        floorZone(s, o.add(new Vector3(13.5, 0, -12)), 5, 4, '#16233a', 'hall b'),
        siteLight(s, o.add(new Vector3(16.2, 0, 6)), -Math.PI / 2),
      );
    },
  },
  'Design High-Performing Architectures': {
    label: 'performance lab',
    accent: '#33b38c',
    dress: (s, o, r) => {
      parentAll(r,
        wallPanels(s, o.add(new Vector3(0, 0, 15.1)), 0, 33, '#33b38c'),
        wallPanels(s, o.add(new Vector3(-17.1, 0, 0)), Math.PI / 2, 29, '#33b38c'),
        wallPanels(s, o.add(new Vector3(17.1, 0, 0)), Math.PI / 2, 29, '#33b38c'),
        gantry(s, o.add(new Vector3(0, 0, -4)), Math.PI / 2, 22, '#33b38c'),
        cableTray(s, o.add(new Vector3(-13, 0, 13)), o.add(new Vector3(13, 0, 13)), 2.9),
        cableTray(s, o.add(new Vector3(-16, 0, -10)), o.add(new Vector3(-16, 0, 10)), 2.7),
        floorZone(s, o.add(new Vector3(0, 0, -12.6)), 14, 3.4, '#12332a', 'benchmark lane'),
        serverRow(s, o.add(new Vector3(13, 0, 13.8)), 0, 4, '#5fd29a'),
        siteLight(s, o.add(new Vector3(-14.5, 0, -12.5)), Math.PI / 4),
        siteLight(s, o.add(new Vector3(14.5, 0, -12.5)), -Math.PI / 4),
        ventBlock(s, o.add(new Vector3(-9, 0, 14.6)), 0),
      );
    },
  },
  'Design Cost-Optimized Architectures': {
    label: 'logistics yard',
    accent: '#67ad5b',
    dress: (s, o, r) => {
      parentAll(r,
        wallPanels(s, o.add(new Vector3(0, 0, 15.1)), 0, 33, '#67ad5b'),
        wallPanels(s, o.add(new Vector3(-17.1, 0, 0)), Math.PI / 2, 29, '#67ad5b'),
        wallPanels(s, o.add(new Vector3(17.1, 0, 0)), Math.PI / 2, 29, '#67ad5b'),
        crateStack(s, o.add(new Vector3(-14.8, 0, 12.6)), 0.4),
        crateStack(s, o.add(new Vector3(14.6, 0, 13)), -0.7, '#7a6a4c'),
        barrels(s, o.add(new Vector3(-15.6, 0, -11.5))),
        barrels(s, o.add(new Vector3(15.2, 0, -12)), '#7a5a3a'),
        hazardStrip(s, o.add(new Vector3(0, 0, 13.4)), 14, 0.9),
        floorZone(s, o.add(new Vector3(13.5, 0, -12)), 6, 4, '#1c2e1a', 'inventory'),
        gantry(s, o.add(new Vector3(0, 0, 12)), 0, 24, '#67ad5b'),
        siteLight(s, o.add(new Vector3(-16.2, 0, 0)), Math.PI / 2),
        siteLight(s, o.add(new Vector3(16.2, 0, 0)), -Math.PI / 2),
      );
    },
  },
};

// Developer badge (DVA-C02) domains reuse the closest SAA identity:
// Development = speed-lab, Security = secure facility, Deployment = logistics
// dock (shipping!), Troubleshooting = twin-hall datacenter.
THEMES['Development with AWS Services'] = THEMES['Design High-Performing Architectures'];
THEMES['Security (Developer)'] = THEMES['Design Secure Architectures'];
THEMES['Deployment'] = THEMES['Design Cost-Optimized Architectures'];
THEMES['Troubleshooting and Optimization'] = THEMES['Design Resilient Architectures'];

THEMES['Cloud Concepts'] = THEMES['Design High-Performing Architectures'];
THEMES['Security and Compliance'] = THEMES['Design Secure Architectures'];
THEMES['Cloud Technology and Services'] = THEMES['Design Resilient Architectures'];
THEMES['Billing, Pricing, and Support'] = THEMES['Design Cost-Optimized Architectures'];
THEMES['Monitoring, Logging, and Remediation'] = THEMES['Design Resilient Architectures'];
THEMES['Reliability and Business Continuity'] = THEMES['Design Resilient Architectures'];
THEMES['Deployment, Provisioning, and Automation'] = THEMES['Design Cost-Optimized Architectures'];
THEMES['Security and Compliance (Ops)'] = THEMES['Design Secure Architectures'];
THEMES['Networking and Content Delivery (Ops)'] = THEMES['Design High-Performing Architectures'];
THEMES['Cost and Performance Optimization'] = THEMES['Design Cost-Optimized Architectures'];

export function applyTheme(scene: Scene, origin: Vector3, domainKey: string): TransformNode {
  const root = new TransformNode('theme-' + domainKey, scene);
  const t = THEMES[domainKey] ?? THEMES['Design Resilient Architectures'];
  t.dress(scene, origin, root);
  // entry arch over the south spawn approach, naming the site by domain
  const arch = entryArch(
    scene, origin.add(new Vector3(0, 0, -14.8)), 0,
    `field site 07 · ${t.label}`, t.accent,
  );
  arch.parent = root;
  return root;
}
