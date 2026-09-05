import diocletianopolis from './plan-models/diocletianopolis.json';
import starozagorski from './plan-models/starozagorski-bani.json';
import haskovo from './plan-models/haskovski-mineralni-bani.json';
import pautalia from './plan-models/pautalia.json';
import type { PlanModel } from './plan-model-types';

// Deliberate allowlist: a plan image or evidence confidence NEVER enables 3D.
// JSON widens pixel tuples to arrays; source dimensions and all rings are checked in plan-models.test.mjs.
const models = [diocletianopolis, starozagorski, haskovo, pautalia] as unknown as PlanModel[];
export function planModelForSite(siteId: string): PlanModel | undefined {
  return models.find((model) => model.siteId === siteId);
}

export const planExclusions: Record<string, string> = {
  germania: 'The plate records an incomplete excavation, and the bath identification is tentative. It does not establish a reliable bath footprint.',
  serdica: 'The catchment interior is measured, but external wall boundaries and the Roman elevation cannot be separated securely from later repairs.',
  'aquae-calidae': 'The plan and section combine successive building phases. A reliable footprint for one phase has not yet been separated.',
};
