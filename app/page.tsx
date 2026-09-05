'use client';

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  BookOpenText,
  CircleAlert,
  Compass,
  Crosshair,
  ExternalLink,
  Landmark,
  MapPinned,
  Maximize2,
  RotateCcw,
  Sparkles,
  Waves,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { dubiousSites, thermalSites, type SourceFigure, type ThermalSite } from './atlas-data';
import mapGeodata from './map-geodata.json';

const mapBounds = { west: 21.8, east: 28.9, north: 44.45, south: 40.65 };
const mapViewBox = { width: 1000, height: 650 };
const mapZoomBounds = { min: 1, max: 2.25, step: 0.15 };

type MapPoint = [number, number];
type MapPan = { x: number; y: number };
type MapTouchPoint = { pointerId: number; clientX: number; clientY: number };
type MapPinch = { distance: number; zoom: number; midpoint: MapPan; pan: MapPan };
type MapGeometry =
  | { type: 'Polygon'; coordinates: MapPoint[][] }
  | { type: 'MultiPolygon'; coordinates: MapPoint[][][] };
type MapFeature = { name: string; geometry: MapGeometry };

const mapData = mapGeodata as unknown as { countries: MapFeature[]; romanProvinces: MapFeature[] };

const countryLabels = [
  { name: 'SERBIA', lng: 22.55, lat: 43.5 },
  { name: 'ROMANIA', lng: 25.65, lat: 44.12 },
  { name: 'BULGARIA', lng: 25.15, lat: 43.02 },
  { name: 'GREECE', lng: 24.9, lat: 41.08 },
  { name: 'TÜRKIYE', lng: 27.65, lat: 41.12 },
];

const romanLabels = [
  { name: 'MOESIA SUPERIOR', lng: 22.8, lat: 43.12 },
  { name: 'MOESIA INFERIOR', lng: 26.4, lat: 43.48 },
  { name: 'THRACIA', lng: 25.8, lat: 42.32 },
  { name: 'MACEDONIA', lng: 23.55, lat: 41.3 },
];

function projectPoint([lng, lat]: MapPoint) {
  return [
    ((lng - mapBounds.west) / (mapBounds.east - mapBounds.west)) * mapViewBox.width,
    ((mapBounds.north - lat) / (mapBounds.north - mapBounds.south)) * mapViewBox.height,
  ] as const;
}

function mapPosition(site: Pick<ThermalSite, 'lat' | 'lng'>) {
  const [x, y] = projectPoint([site.lng, site.lat]);
  return {
    left: (x / mapViewBox.width) * 100 + '%',
    top: (y / mapViewBox.height) * 100 + '%',
  };
}

function pathForGeometry(geometry: MapGeometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons
    .map((polygon) => polygon
      .map((ring) => ring
        .map((point, index) => {
          const [x, y] = projectPoint(point);
          return (index === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2);
        })
        .join(' ') + ' Z')
      .join(' '))
    .join(' ');
}

function primaryName(site: ThermalSite) {
  return site.romanName === 'Unknown' ? site.currentName : site.romanName;
}

function secondaryName(site: ThermalSite) {
  return site.romanName === 'Unknown' ? 'Roman name not recorded' : site.currentName;
}

function EvidenceDots({ site }: { site: ThermalSite }) {
  const categories = [
    { name: 'Bath structures', recorded: site.model.bath },
    { name: 'Catchment', recorded: site.model.catchment },
    { name: 'Spring finds', recorded: site.model.ritual },
  ];
  const description = `Recorded evidence: ${categories.filter((category) => category.recorded).map((category) => category.name).join(', ') || 'none'}`;
  return (
    <span className="evidence-dots" aria-label={description} title={description}>
      {categories.map((category) => <i key={category.name} className={category.recorded ? 'is-on' : ''} />)}
    </span>
  );
}

function referenceImageBadge(site: ThermalSite) {
  return site.referenceLabel ?? 'PLACE PHOTOGRAPH';
}

type DisplayVisual = SourceFigure & {
  href?: string;
  kind: 'plan' | 'photo' | 'plate' | 'context';
};

function archiveAssets(site: ThermalSite): SourceFigure[] {
  const primaryPlate = site.image && site.imageCaption && site.figure
    ? {
      image: site.image,
      caption: site.imageCaption,
      figure: site.figure,
      label: 'ARCHIVE PLATE',
    }
    : undefined;
  const figures = [site.plan, primaryPlate, ...(site.sourceFigures ?? [])]
    .filter((figure): figure is SourceFigure => Boolean(figure));

  return figures.filter((figure, index) =>
    figures.findIndex((candidate) => candidate.image === figure.image) === index);
}

function referenceVisual(site: ThermalSite): DisplayVisual | undefined {
  if (!site.referenceImage || !site.referenceCaption || !site.referenceSource || !site.referenceRights) return undefined;

  return {
    image: site.referenceImage,
    caption: site.referenceCaption,
    figure: `${site.referenceSource} · ${site.referenceRights}`,
    label: referenceImageBadge(site),
    href: site.referenceUrl,
    kind: 'photo',
  };
}

function archiveVisual(asset: SourceFigure): DisplayVisual {
  return {
    ...asset,
    kind: asset.label === 'THESIS CORPUS MAP' ? 'context' : 'plate',
  };
}

function primaryVisual(site: ThermalSite): DisplayVisual | undefined {
  if (site.plan) return { ...site.plan, kind: 'plan' };

  return referenceVisual(site) ?? archiveAssets(site).map(archiveVisual)[0];
}

function supportingVisuals(site: ThermalSite, primaryImage?: string): DisplayVisual[] {
  const visuals = [referenceVisual(site), ...archiveAssets(site).map(archiveVisual)]
    .filter((visual): visual is DisplayVisual => Boolean(visual))
    .filter((visual) => visual.image !== primaryImage);

  return visuals.filter((visual, index) =>
    visuals.findIndex((candidate) => candidate.image === visual.image) === index);
}

function visualScope(site: ThermalSite, visual: DisplayVisual) {
  if (visual.kind === 'plan') {
    return visual.note ?? 'A cited archaeological document, shown as source evidence rather than expanded into a reconstruction.';
  }

  if (visual.kind === 'photo') {
    return visual.label === 'HISTORICAL PHOTOGRAPH'
      ? 'A historical photograph documenting the locality at the date given in its caption.'
      : 'A credited photograph of the site or its surroundings; the caption identifies its archaeological or locality context.';
  }

  if (visual.kind === 'context') {
    return `Regional context for ${primaryName(site)}. No site-specific plan or photograph is currently included in this atlas.`;
  }

  return 'A source image from the supplied dissertation, retained as archaeological evidence rather than turned into a reconstruction.';
}

export default function Home() {
  const [selectedId, setSelectedId] = useState('diocletianopolis');
  const [showCaveats, setShowCaveats] = useState(false);
  const [showDubious, setShowDubious] = useState(true);
  const [showCurrentBorders, setShowCurrentBorders] = useState(true);
  const [showRomanEmpire, setShowRomanEmpire] = useState(true);
  const [dubiousFocusId, setDubiousFocusId] = useState<string | null>(null);
  const [activeVisual, setActiveVisual] = useState<DisplayVisual | null>(null);
  const [mapZoom, setMapZoom] = useState(mapZoomBounds.min);
  const [mapPan, setMapPan] = useState<MapPan>({ x: 0, y: 0 });
  const [isMapDragging, setIsMapDragging] = useState(false);
  const mapViewportRef = useRef<HTMLDivElement>(null);
  const mapLayerRef = useRef<HTMLDivElement>(null);
  const recordListRef = useRef<HTMLDivElement>(null);
  const mapDragOrigin = useRef<(MapPan & { pointerId: number; clientX: number; clientY: number }) | null>(null);
  const mapTouchPoints = useRef<Map<number, MapTouchPoint>>(new Map());
  const mapPinchOrigin = useRef<MapPinch | null>(null);
  const lightboxOpenerRef = useRef<HTMLElement | null>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement | null>(null);

  const selected = thermalSites.find((site) => site.id === selectedId) ?? thermalSites[0];
  const selectedVisual = primaryVisual(selected);
  const selectedSupportingVisuals = supportingVisuals(selected, selectedVisual?.image);
  const selectedVisuals = [selectedVisual, ...selectedSupportingVisuals].filter((visual): visual is DisplayVisual => Boolean(visual));
  const activeVisualIndex = selectedVisuals.findIndex((visual) => visual.image === activeVisual?.image);
  const openVisual = (visual: DisplayVisual, opener: HTMLButtonElement) => {
    lightboxOpenerRef.current = opener;
    setActiveVisual(visual);
  };
  const stepVisual = (direction: number) => {
    setActiveVisual(selectedVisuals[(activeVisualIndex + direction + selectedVisuals.length) % selectedVisuals.length]);
  };
  const dubiousFocus = dubiousSites.find((site) => site.id === dubiousFocusId) ?? null;
  const selectSite = (site: ThermalSite) => {
    setSelectedId(site.id);
    setDubiousFocusId(null);
  };
  const scrollCatalogueToSite = (siteId: string) => {
    const list = recordListRef.current;
    const row = list?.querySelector<HTMLElement>(`[data-site-id="${siteId}"]`);
    if (!list || !row) return;

    const listBounds = list.getBoundingClientRect();
    const rowBounds = row.getBoundingClientRect();
    const centeredTop = list.scrollTop + rowBounds.top - listBounds.top - (listBounds.height - rowBounds.height) / 2;
    list.scrollTo({ top: Math.max(0, centeredTop), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  const selectMapSite = (site: ThermalSite) => {
    selectSite(site);
    scrollCatalogueToSite(site.id);
  };
  const constrainMapPan = (position: MapPan, zoom = mapZoom) => {
    const viewport = mapViewportRef.current?.getBoundingClientRect();
    const layer = mapLayerRef.current;
    if (!viewport || !layer) return { x: 0, y: 0 };

    const maxX = Math.max(0, (layer.offsetWidth * zoom - viewport.width) / 2);
    const maxY = Math.max(0, (layer.offsetHeight * zoom - viewport.height) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, position.x)),
      y: Math.max(-maxY, Math.min(maxY, position.y)),
    };
  };
  const centerMapOnSite = (site: Pick<ThermalSite, 'lat' | 'lng'>) => {
    const layer = mapLayerRef.current;
    if (!layer) return;

    const [x, y] = projectPoint([site.lng, site.lat]);
    const target = {
      x: -(x / mapViewBox.width - 0.5) * layer.offsetWidth * mapZoom,
      y: -(y / mapViewBox.height - 0.5) * layer.offsetHeight * mapZoom,
    };
    setMapPan(constrainMapPan(target));
  };
  const selectCorpusSite = (site: ThermalSite) => {
    selectSite(site);
    centerMapOnSite(site);
    scrollCatalogueToSite(site.id);
    document.getElementById('site-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('site-title')?.focus({ preventScroll: true });
  };
  const stepSite = (direction: number) => {
    const index = thermalSites.findIndex((site) => site.id === selected.id);
    const site = thermalSites[(index + direction + thermalSites.length) % thermalSites.length];
    selectSite(site);
    centerMapOnSite(site);
    scrollCatalogueToSite(site.id);
  };
  const mapCanPan = (zoom = mapZoom) => {
    const viewport = mapViewportRef.current;
    const layer = mapLayerRef.current;
    if (!viewport || !layer) return zoom > mapZoomBounds.min;
    return layer.offsetWidth * zoom > viewport.clientWidth + 1 || layer.offsetHeight * zoom > viewport.clientHeight + 1;
  };
  const setMapViewZoom = (nextZoom: number) => {
    const boundedZoom = Math.min(
      mapZoomBounds.max,
      Math.max(mapZoomBounds.min, Math.round(nextZoom * 100) / 100),
    );
    setMapZoom(boundedZoom);
    setMapPan((current) => constrainMapPan(current, boundedZoom));
  };
  const updateMapZoom = (amount: number) => {
    setMapViewZoom(mapZoom + amount);
  };
  const resetMapView = () => {
    setMapZoom(mapZoomBounds.min);
    setMapPan({ x: 0, y: 0 });
    setIsMapDragging(false);
    mapDragOrigin.current = null;
    mapTouchPoints.current.clear();
    mapPinchOrigin.current = null;
  };
  const panMapBy = (x: number, y: number) => {
    setMapPan((current) => constrainMapPan({ x: current.x + x, y: current.y + y }));
  };
  const startMapDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!mapCanPan() || event.button !== 0) return;
    if ((event.target as Element).closest('button, a, .dubious-map-card')) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    mapDragOrigin.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, ...mapPan };
    setIsMapDragging(true);
  };
  const touchPairDistance = () => {
    const [first, second] = [...mapTouchPoints.current.values()];
    if (!first || !second) return 0;
    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
  };
  const touchPairMidpoint = (): MapPan => {
    const [first, second] = [...mapTouchPoints.current.values()];
    const bounds = mapViewportRef.current?.getBoundingClientRect();
    if (!first || !second || !bounds) return { x: 0, y: 0 };
    return { x: (first.clientX + second.clientX) / 2 - bounds.left - bounds.width / 2, y: (first.clientY + second.clientY) / 2 - bounds.top - bounds.height / 2 };
  };
  const startMapTouch = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest('button, a, .dubious-map-card')) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    mapTouchPoints.current.set(event.pointerId, {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    });

    if (mapTouchPoints.current.size >= 2) {
      const distance = touchPairDistance();
      if (distance > 0) {
        mapPinchOrigin.current = { distance, zoom: mapZoom, midpoint: touchPairMidpoint(), pan: mapPan };
        mapDragOrigin.current = null;
        setIsMapDragging(true);
        event.preventDefault();
      }
      return;
    }

    if (mapCanPan()) startMapDrag(event);
  };
  const moveMap = (event: ReactPointerEvent<HTMLDivElement>) => {
    const origin = mapDragOrigin.current;
    if (!origin || origin.pointerId !== event.pointerId) return;

    setMapPan(constrainMapPan({
      x: origin.x + event.clientX - origin.clientX,
      y: origin.y + event.clientY - origin.clientY,
    }));
  };
  const moveMapTouch = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = mapTouchPoints.current.get(event.pointerId);
    if (!current) return;

    mapTouchPoints.current.set(event.pointerId, { ...current, clientX: event.clientX, clientY: event.clientY });
    const pinch = mapPinchOrigin.current;
    if (!pinch || mapTouchPoints.current.size < 2) {
      moveMap(event);
      return;
    }

    const distance = touchPairDistance();
    if (distance <= 0) return;
    event.preventDefault();
    const zoom = Math.max(mapZoomBounds.min, Math.min(mapZoomBounds.max, pinch.zoom * distance / pinch.distance));
    const midpoint = touchPairMidpoint();
    const ratio = zoom / pinch.zoom;
    setMapZoom(zoom);
    setMapPan(constrainMapPan({
      x: midpoint.x - (pinch.midpoint.x - pinch.pan.x) * ratio,
      y: midpoint.y - (pinch.midpoint.y - pinch.pan.y) * ratio,
    }, zoom));
  };
  const endMapDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const origin = mapDragOrigin.current;
    if (!origin || origin.pointerId !== event.pointerId) return;

    mapDragOrigin.current = null;
    setIsMapDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const endMapTouch = (event: ReactPointerEvent<HTMLDivElement>) => {
    mapTouchPoints.current.delete(event.pointerId);
    if (mapTouchPoints.current.size < 2) mapPinchOrigin.current = null;

    const remainingTouch = [...mapTouchPoints.current.values()][0];
    if (remainingTouch && mapCanPan()) {
      mapDragOrigin.current = { ...mapPan, ...remainingTouch };
      setIsMapDragging(true);
    } else {
      endMapDrag(event);
      setIsMapDragging(false);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const handleMapKeyboardPan = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest('.dubious-map-card')) return;
    if (!mapCanPan()) return;

    const distance = event.shiftKey ? 90 : 42;
    const directions: Record<string, MapPan> = {
      ArrowLeft: { x: -distance, y: 0 },
      ArrowRight: { x: distance, y: 0 },
      ArrowUp: { x: 0, y: -distance },
      ArrowDown: { x: 0, y: distance },
    };
    const movement = directions[event.key];
    if (!movement) return;

    event.preventDefault();
    panMapBy(movement.x, movement.y);
  };

  useEffect(() => {
    const viewport = mapViewportRef.current;
    if (!viewport) return;
    const zoomOnWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;
      if ((event.target as Element).closest('button, a, .dubious-map-card')) return;
      const nextZoom = Math.min(mapZoomBounds.max, Math.max(mapZoomBounds.min, mapZoom + (event.deltaY < 0 ? mapZoomBounds.step : -mapZoomBounds.step)));
      if (nextZoom === mapZoom) return;
      event.preventDefault();
      setMapViewZoom(nextZoom);
    };
    viewport.addEventListener('wheel', zoomOnWheel, { passive: false });
    return () => {
      viewport.removeEventListener('wheel', zoomOnWheel);
    };
  });
  return (
    <main className="atlas-shell">
      <a className="skip-link" href="#map-title">Skip to the map</a>
      <header className="atlas-header">
        <a className="wordmark" href="#atlas" aria-label="Thermae Thraciae home">
          <span className="wordmark-mark"><Waves size={18} strokeWidth={1.7} /></span>
          <span>THERMAE<br /><em>THRACIAE</em></span>
        </a>
        <div className="header-context">
          <span className="source-pill"><BookOpenText size={14} /> Avramova 2024</span>
          <span className="header-statement">Roman thermal sites · Thrace · AD 46–395</span>
        </div>
      </header>

      <section className="atlas-intro" id="atlas">
        <div>
          <p className="eyebrow"><Compass size={14} /> Interactive field atlas</p>
          <h1>Follow the water.<br /><span>Read the evidence.</span></h1>
        </div>
        <p className="intro-copy">A source-led atlas of the sixteen confirmed sites in Mariya Avramova’s doctoral dissertation, <i>Thermalism in Roman Thrace (AD 46–395)</i> (University of Warsaw, 2024). Explore their present-day Bulgarian setting through current borders and an AD 117 Roman reference, then read each record through cited plans, field photographs and archaeological evidence.</p>
      </section>

      <section className="map-workspace" aria-labelledby="map-title">
        <div className="workspace-toolbar">
          <div>
            <p className="section-kicker">01 · Locate</p>
            <h2 id="map-title" tabIndex={-1}>Thermal sites in Thrace</h2>
          </div>
          <div className="toolbar-controls">
            <label className="dubious-toggle" htmlFor="dubious-sites-layer">
              <Checkbox id="dubious-sites-layer" aria-label="Dubious sites layer" checked={showDubious} onCheckedChange={(checked) => { setShowDubious(checked === true); if (checked !== true) setDubiousFocusId(null); }} />
              <span>Dubious sites layer <b>{dubiousSites.length}</b></span>
            </label>
            <div className="layer-controls" role="group" aria-label="Map layers">
              <span className="layer-control-label">Map layers</span>
              <label className="layer-toggle layer-toggle-modern" htmlFor="modern-borders-layer">
                <Checkbox id="modern-borders-layer" aria-label="Modern borders" checked={showCurrentBorders} onCheckedChange={(checked) => setShowCurrentBorders(checked === true)} />
                <span><i />Modern borders</span>
              </label>
              <label className="layer-toggle layer-toggle-roman" htmlFor="roman-empire-layer">
                <Checkbox id="roman-empire-layer" aria-label="Roman Empire · AD 117" checked={showRomanEmpire} onCheckedChange={(checked) => setShowRomanEmpire(checked === true)} />
                <span><i />Roman Empire · AD 117</span>
              </label>
            </div>
          </div>
        </div>

        <div className="map-and-records">
          <div
            ref={mapViewportRef}
            className={`coordinate-map ${mapZoom > mapZoomBounds.min ? 'is-pannable' : ''} ${isMapDragging ? 'is-dragging' : ''}`}
            role="region"
            tabIndex={0}
            aria-label="Interactive map of catalogued thermal sites. Use the controls, scroll wheel, or pinch gesture to zoom; drag or use the arrow keys to pan."
            onPointerDown={(event) => event.pointerType === 'touch' ? startMapTouch(event) : startMapDrag(event)}
            onPointerMove={(event) => event.pointerType === 'touch' ? moveMapTouch(event) : moveMap(event)}
            onPointerUp={(event) => event.pointerType === 'touch' ? endMapTouch(event) : endMapDrag(event)}
            onPointerCancel={(event) => event.pointerType === 'touch' ? endMapTouch(event) : endMapDrag(event)}
            onKeyDown={handleMapKeyboardPan}
          >
            <div className="map-topline"><span><Crosshair size={13} /> geographic reference map</span><span>{thermalSites.length} confirmed{showDubious ? ` · ${dubiousSites.length} dubious` : ''}</span></div>
            <div ref={mapLayerRef} className="map-zoom-layer" style={{ transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapZoom})` }}>
              <svg className="map-geography" viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true">
                <g className="map-graticule">
                  {[20, 22, 24, 26, 28, 30].map((lng) => {
                    const [x] = projectPoint([lng, mapBounds.north]);
                    return <line key={lng} x1={x} x2={x} y1="0" y2="650" />;
                  })}
                  {[39, 40, 41, 42, 43, 44, 45].map((lat) => {
                    const [, y] = projectPoint([mapBounds.west, lat]);
                    return <line key={lat} x1="0" x2="1000" y1={y} y2={y} />;
                  })}
                </g>
                {showCurrentBorders && <g className="modern-map-layer">
                  {mapData.countries.map((feature) => <path key={feature.name} className="country-shape" d={pathForGeometry(feature.geometry)} fillRule="evenodd" />)}
                  {countryLabels.map((label) => {
                    const [x, y] = projectPoint([label.lng, label.lat]);
                    return <text className="country-label" key={label.name} x={x} y={y}>{label.name}</text>;
                  })}
                </g>}
                {showRomanEmpire && <g className="roman-map-layer">
                  {mapData.romanProvinces.map((feature) => <path key={feature.name} className="roman-province" d={pathForGeometry(feature.geometry)} fillRule="evenodd" />)}
                  {romanLabels.map((label) => {
                    const [x, y] = projectPoint([label.lng, label.lat]);
                    return <text className="roman-label" key={label.name} x={x} y={y}>{label.name}</text>;
                  })}
                </g>}
              </svg>
              <div className="mountain-wash wash-one" />
              <div className="mountain-wash wash-two" />
              <div className="map-grid" aria-hidden="true" />
              <div className="map-axis map-axis-x"><span>22°E</span><span>24°E</span><span>26°E</span><span>28°E</span></div>
              <div className="map-axis map-axis-y"><span>43°N</span><span>42°N</span><span>41°N</span></div>
              <span className="place-label label-sofia">SERDICA / SOFIA</span><span className="place-label label-hisarya">HISARYA</span><span className="place-label label-burgas">BURGAS</span><span className="place-label label-rhodope">RHODOPE<br />MOUNTAINS</span>
              {thermalSites.map((site) => {
                const isSelected = selected.id === site.id;
                return <button type="button" className={`map-marker ${isSelected ? 'is-selected' : ''}`} key={site.id} style={mapPosition(site)} onClick={() => selectMapSite(site)} aria-pressed={isSelected} aria-label={`Select ${primaryName(site)}, ${site.currentName}`}><span className="marker-core"><i /></span><span className="marker-label"><b>{site.catalogueNo}</b> {primaryName(site)}</span></button>;
              })}
              {showDubious && dubiousSites.map((site) => <button type="button" className={`map-marker map-marker-dubious ${dubiousFocus?.id === site.id ? 'is-selected' : ''}`} key={site.id} style={mapPosition(site)} onClick={() => setDubiousFocusId(site.id)} aria-pressed={dubiousFocus?.id === site.id} aria-label={`Inspect dubious site: ${site.name}`}><span className="marker-core"><i /></span><span className="marker-label"><b>DUBIOUS</b> {site.name}</span></button>)}
            </div>
            <div className="map-footnote">
              <span>Points are named settlement / spring anchors. Country borders locate the modern landscape; Roman provinces are a dated historical reference.</span>
              <span><a href="https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/" target="_blank" rel="noreferrer">Natural Earth 1:50m ↗</a> · <a href="https://services3.arcgis.com/nwUScSWGt2wNe9dC/ArcGIS/rest/services/BA_Map100_Roman_Empire_117AD_Roman_Provinces/FeatureServer/0" target="_blank" rel="noreferrer">GISGILDE / Barrington Atlas, AD 117 ↗</a></span>
            </div>
            <div className="map-zoom-controls" role="group" aria-label="Map zoom controls">
              <button type="button" onClick={() => updateMapZoom(mapZoomBounds.step)} disabled={mapZoom >= mapZoomBounds.max} aria-label="Zoom map in" title="Zoom in"><ZoomIn size={15} /></button>
              <button type="button" onClick={() => updateMapZoom(-mapZoomBounds.step)} disabled={mapZoom <= mapZoomBounds.min} aria-label="Zoom map out" title="Zoom out"><ZoomOut size={15} /></button>
              <button type="button" onClick={resetMapView} disabled={mapZoom === mapZoomBounds.min && mapPan.x === 0 && mapPan.y === 0} aria-label="Reset map zoom and position" title="Reset zoom and position"><RotateCcw size={14} /></button>
              <span aria-live="polite" title={mapZoom > mapZoomBounds.min ? 'Drag the map to pan' : undefined}><b>{Math.round(mapZoom * 100)}%</b>{mapZoom > mapZoomBounds.min && <small>drag</small>}</span>
            </div>
            {dubiousFocus && <div className="dubious-map-card" tabIndex={-1} aria-label={`${dubiousFocus.name}: dubious site`}><button type="button" onClick={() => setDubiousFocusId(null)} aria-label="Close dubious site note">×</button><span><CircleAlert size={13} /> DUBIOUS / NOT CONFIRMED</span><b>{dubiousFocus.name}</b>{dubiousFocus.currentName !== dubiousFocus.name && <p className="dubious-alias">{dubiousFocus.currentName}</p>}<small>{dubiousFocus.location}</small><p>{dubiousFocus.reason}</p><small>{dubiousFocus.sourcePages}</small></div>}
          </div>

          <aside className="record-stack" aria-label="Visible site records">
            <div className="record-stack-header"><span>Catalogued sites</span><span className="record-count">{thermalSites.length}</span></div>
            <div className="record-list" ref={recordListRef}>
              {thermalSites.map((site) => <button type="button" data-site-id={site.id} aria-pressed={selected.id === site.id} className={`record-row ${selected.id === site.id ? 'is-selected' : ''}`} onClick={() => { selectSite(site); centerMapOnSite(site); }} key={site.id}><span className="record-index">{site.catalogueNo}</span><span className="record-name"><b>{primaryName(site)}</b><small>{secondaryName(site)}</small></span><EvidenceDots site={site} /></button>)}
            </div>
            <div className="record-key">
              <span><i className="key-confirmed" />confirmed anchor</span>
              {showDubious && <span><i className="key-dubious" />dubious locality</span>}
              <span className="record-key-evidence"><span className="evidence-dots" aria-hidden="true"><i className="is-on" /><i className="is-on" /><i /></span>Bath · catchment · spring finds</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="site-stage" aria-labelledby="site-title">
        <div className="stage-titlebar">
          <div><p className="section-kicker">02 · Explore</p><h2 id="site-title" tabIndex={-1}><span>{selected.catalogueNo}</span> {primaryName(selected)}</h2></div>
          <div className="site-navigation" aria-label="Browse site records"><button type="button" className="site-next site-previous" onClick={() => stepSite(-1)} aria-label="Previous site"><ArrowLeft size={17} /></button><span>{thermalSites.findIndex((site) => site.id === selected.id) + 1} / {thermalSites.length}</span><button type="button" className="site-next" onClick={() => stepSite(1)}>Next site <ArrowRight size={17} /></button></div>
        </div>
        <output className="sr-only" aria-live="polite">Selected site: {primaryName(selected)}</output>

        <div className="stage-grid">
          {selectedVisual ? <article className={`site-visual is-${selectedVisual.kind}`}>
            <div className="site-visual-topline"><span>{selectedVisual.label}</span><span>{selectedVisual.kind === 'plan' ? 'CITED DOCUMENT' : selectedVisual.kind === 'photo' ? 'PLACE IMAGE' : 'SOURCE IMAGE'}</span></div>
            <div className="site-visual-frame">
              <button type="button" className="visual-image-trigger" onClick={(event) => openVisual(selectedVisual, event.currentTarget)} aria-label={`View ${selectedVisual.caption} at full size`}><img src={selectedVisual.image} alt={selectedVisual.caption} decoding="async" /><span><Maximize2 size={16} /> View full image</span></button>
            </div>
            <div className="site-visual-caption"><div><span>{selectedVisual.figure}</span><h3>{selectedVisual.caption}</h3></div><p>{visualScope(selected, selectedVisual)}</p></div>
          </article> : <article className="site-visual is-empty"><p>Source image pending</p><span>The catalogue record remains available at right.</span></article>}

          <article className="site-dossier">
            <div className="dossier-head"><div><p className="roman-name">{primaryName(selected)}</p><p className="modern-name">{secondaryName(selected)}</p></div><MapPinned size={22} /></div>
            <p className="site-location">{selected.location}</p>
            <div className="water-strip"><div><span><Waves size={14} /> temperature</span><b>{selected.temperature}</b></div><div><span>acidity</span><b>{selected.acidity}</b></div><div><span>fixed residue</span><b>{selected.mineral}</b></div></div>
            {selected.waterNote && <p className="data-note"><CircleAlert size={14} /> {selected.waterNote}</p>}
            <div className="dossier-evidence"><div><span className="evidence-icon"><Landmark size={17} /></span><div><h3>Built evidence</h3><p>{selected.archaeology}</p></div></div><div><span className="evidence-icon ritual"><Sparkles size={17} /></span><div><h3>Spring deposits & ritual</h3><p>{selected.ritual}</p></div></div></div>
            {selected.caveat && <p className="data-note warning"><CircleAlert size={14} /> {selected.caveat}</p>}
            {selected.coordinateNote && <p className="coordinate-note"><Crosshair size={14} /> {selected.coordinateNote}</p>}
            <div className="source-line"><BookOpenText size={14} /><span>{selected.sourcePages}</span><a href={selected.coordinateSource.url} target="_blank" rel="noreferrer">{selected.coordinateSource.label} ↗</a></div>
          </article>
        </div>

        <section className="source-shelf" aria-labelledby="source-plates-title">
          <div className="source-shelf-heading">
            <div><p className="section-kicker">02a · Verify</p><h3 id="source-plates-title">Supporting material</h3></div>
          </div>
          {selectedSupportingVisuals.length > 0 ? <div className="source-strip">
            {selectedSupportingVisuals.map((asset) => <figure className={`support-card is-${asset.kind}`} key={asset.image}>
              <button type="button" className="support-image-trigger" onClick={(event) => openVisual(asset, event.currentTarget)} aria-label={`View ${asset.caption} at full size`}><img src={asset.image} alt={asset.caption} loading="lazy" decoding="async" /><span><Maximize2 size={17} /></span></button>
              <figcaption><span>{asset.label}</span><p>{asset.caption}</p><small>{asset.figure}</small></figcaption>
            </figure>)}
          </div> : <div className="source-empty"><p>No additional site images are currently included in this atlas.</p></div>}
        </section>
      </section>

      <section className="catalog-section" aria-labelledby="catalog-title">
        <div className="catalog-heading"><div><p className="section-kicker">03 · Compare</p><h2 id="catalog-title" tabIndex={-1}>The confirmed corpus</h2></div></div>
        <div className="catalog-grid">
          {thermalSites.map((site) => <button type="button" key={site.id} aria-pressed={site.id === selected.id} className={`catalog-tile ${site.id === selected.id ? 'is-selected' : ''}`} onClick={() => selectCorpusSite(site)}><span className="tile-code">{site.catalogueNo}</span><h3>{primaryName(site)}</h3><p>{secondaryName(site)}</p><div className="tile-meta"><span>{site.temperature}</span><EvidenceDots site={site} /></div></button>)}
        </div>
        <div className="dubious-section">
          <div className="dubious-heading"><div><h3>Dubious sites</h3></div><p>These eleven localities comprise the dissertation’s <i>Dubious sites</i> section. They are shown as amber, dashed locality markers—not confirmed thermal sites—and remain separate from the confirmed-site dossiers.</p></div>
          <div className="dubious-grid">{dubiousSites.map((site) => <button type="button" className="dubious-tile" key={site.id} onClick={() => { setShowDubious(true); setDubiousFocusId(site.id); centerMapOnSite(site); mapViewportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); requestAnimationFrame(() => document.querySelector<HTMLElement>('.dubious-map-card')?.focus({ preventScroll: true })); }}><h3>{site.name}</h3><p>{site.reason}</p><small>{site.sourcePages}</small></button>)}</div>
        </div>
      </section>

      <section className="method-section" aria-labelledby="method-title">
        <div className="method-stamp"><span>AV</span><small>2024</small></div>
          <div>
            <p className="section-kicker">Method & scope</p>
            <h2 id="method-title">Evidence before atmosphere.</h2>
            <p className="method-copy">This atlas follows the confirmed <i>Catalogue of Sites</i> in Avramova’s dissertation (digital pp. 199–249; printed pp. 195–245). Architecture, spring deposits, water data and citations are preserved as distinct evidence threads. Seven records have a plan or excavation plan reproduced in the dissertation; each is shown as a labelled source document. The atlas does not invent height, bath geometry or unrecorded dimensions.</p>
            <button type="button" className="caveat-toggle" aria-expanded={showCaveats} onClick={() => setShowCaveats(!showCaveats)}><CircleAlert size={16} /> {showCaveats ? 'Hide' : 'Read'} scope & uncertainty notes</button>
            {showCaveats && <div className="caveat-box">
              <p><b>Included:</b> Sixteen confirmed entries from the dissertation’s <i>Catalogue of Sites</i> are presented as interactive site dossiers. Diocletianopolis remains one dossier, with its five Roman-used springs identified separately within that record.</p>
              <p><b>Visible but separate:</b> Eleven localities from the dissertation’s <i>Dubious sites</i> section appear as amber, dashed markers and in a separate catalogue. They are excluded from the confirmed total and do not receive confirmed-site dossiers.</p>
              <p><b>Plans and images:</b> Cited plan material is available for Pautalia, Germania, Ulpia Serdica, Diocletianopolis, Starozagorski Bani, Mineralni Bani (Haskovo) and Aquae Calidae. Plans, archaeological plates and credited place photographs are shown as source evidence and can be enlarged; none is converted into a speculative three-dimensional reconstruction.</p>
              <p><b>Map layers:</b> Site points use modern settlement or spring anchors. Present-day national borders come from Natural Earth; the Roman provincial overlay is GISGILDE’s AD 117 vectorization based on <i>Barrington Atlas</i> Map 100. The overlay is a dated geographic reference, not a boundary model for every record across AD 46–395.</p>
              <p><b>Editorial cautions:</b> Record-specific notes preserve uncertainty around coordinate precision, source provenance, later well measurements, incomplete excavation publication, duplicate numbering and conflicting numerical data instead of silently resolving it.</p>
            </div>}
          </div>
      </section>

      <footer className="atlas-footer"><span>THERMAE THRACIAE</span><span>Source-led exploration of Roman thermalism in Thrace</span></footer>

      <Dialog open={Boolean(activeVisual)} onOpenChange={(open) => { if (!open) setActiveVisual(null); }}>
        {activeVisual && <DialogContent className={`lightbox-panel is-${activeVisual.kind}`} showCloseButton={false} initialFocus={lightboxCloseRef} finalFocus={lightboxOpenerRef} onKeyDown={(event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); stepVisual(event.key === 'ArrowRight' ? 1 : -1); } }}>
          <div className="lightbox-toolbar"><span>{primaryName(selected)}</span><div className="lightbox-navigation"><button type="button" onClick={() => stepVisual(-1)} disabled={selectedVisuals.length < 2} aria-label="Previous image"><ArrowLeft size={18} /></button><span aria-live="polite">{activeVisualIndex + 1} / {selectedVisuals.length}</span><button type="button" onClick={() => stepVisual(1)} disabled={selectedVisuals.length < 2} aria-label="Next image"><ArrowRight size={18} /></button><DialogClose className="lightbox-close" ref={lightboxCloseRef} aria-label="Close full image"><X size={20} /></DialogClose></div></div>
          <div className="lightbox-media"><img src={activeVisual.image} alt={activeVisual.caption} /></div>
          <div className="lightbox-caption"><div><span>{activeVisual.label}</span><DialogTitle id="lightbox-title">{activeVisual.caption}</DialogTitle><DialogDescription>{activeVisual.figure}</DialogDescription>{activeVisual.note && <p className="lightbox-note">{activeVisual.note}</p>}</div><div className="lightbox-links"><a href={activeVisual.image} target="_blank" rel="noreferrer">Open original image <ExternalLink size={14} /></a>{activeVisual.href && <a href={activeVisual.href} target="_blank" rel="noreferrer">Credited source <ExternalLink size={14} /></a>}</div></div>
        </DialogContent>}
      </Dialog>
    </main>
  );
}
