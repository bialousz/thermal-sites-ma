/** All coordinates are pixels in the cited, unmodified source plate. */
export type PlanPoint = [number, number];
export type PlanPolygon = { outline: PlanPoint[]; holes?: PlanPoint[][] };
export type PlanFeature = {
  id: string;
  label: string;
  note: string;
  kind: 'masonry' | 'basin' | 'detail';
  polygons: PlanPolygon[];
};
export type PlanModel = {
  siteId: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  sourceSha256: string;
  crop: [number, number, number, number];
  title: string;
  figure: string;
  scope: string;
  limitation: string;
  features: PlanFeature[];
};

export type PlanSceneApi = {
  view: (view: 'axonometric' | 'plan') => void;
  zoom: (direction: number) => void;
  rotate: (direction: number) => void;
  pan: (x: number, y: number) => void;
  reset: () => void;
  source: (visible: boolean) => void;
  select: (id: string | null) => void;
};
