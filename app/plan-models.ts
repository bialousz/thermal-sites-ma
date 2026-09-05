import diocletianopolis from './plan-models/diocletianopolis.json';
import starozagorski from './plan-models/starozagorski-bani.json';
import type { PlanModel } from './plan-model-types';

// Deliberate allowlist: a plan image or evidence confidence NEVER enables 3D.
const models: PlanModel[] = [diocletianopolis as PlanModel, starozagorski as PlanModel];
export function planModelForSite(siteId: string): PlanModel | undefined {
  return models.find((model) => model.siteId === siteId);
}

export const planExclusions: Record<string, string> = {
  pautalia: 'The public-thermae plate mixes wall outlines, section lines and hypocaust details. A reliable masonry footprint has not yet been reproduced from this source.',
  germania: 'The plate records an incomplete excavation, and the bath identification is tentative. It does not establish a reliable bath footprint.',
  serdica: 'The catchment interior is measured, but external wall boundaries and the Roman elevation cannot be separated securely from later repairs.',
  'haskovski-mineralni-bani': 'The plate has open and fading boundaries, and its hatching does not resolve all wall edges. The second spring group cannot yet be reproduced faithfully.',
  'aquae-calidae': 'The plan and section combine successive building phases. A reliable footprint for one phase has not yet been separated.',
};
