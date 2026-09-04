'use client';

import { useState } from 'react';
import {
  ArrowRight,
  BookOpenText,
  CircleAlert,
  Compass,
  Crosshair,
  Landmark,
  MapPinned,
  Sparkles,
  Waves,
} from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { doubtfulSites, thermalSites, type SourceFigure, type ThermalSite } from './atlas-data';
import mapGeodata from './map-geodata.json';

const mapBounds = { west: 22.1, east: 27.9, north: 43.25, south: 40.65 };
const mapViewBox = { width: 1000, height: 650 };

type MapPoint = [number, number];
type MapGeometry =
  | { type: 'Polygon'; coordinates: MapPoint[][] }
  | { type: 'MultiPolygon'; coordinates: MapPoint[][][] };
type MapFeature = { name: string; geometry: MapGeometry };

const mapData = mapGeodata as unknown as { countries: MapFeature[]; romanProvinces: MapFeature[] };

const countryLabels = [
  { name: 'SERBIA', lng: 22.55, lat: 43.02 },
  { name: 'BULGARIA', lng: 24.55, lat: 42.98 },
  { name: 'GREECE', lng: 24.9, lat: 40.93 },
  { name: 'TÜRKIYE', lng: 27.45, lat: 40.95 },
];

const romanLabels = [
  { name: 'MOESIA SUPERIOR', lng: 22.7, lat: 42.7 },
  { name: 'MOESIA INFERIOR', lng: 26.15, lat: 42.92 },
  { name: 'THRACIA', lng: 25.7, lat: 42.2 },
  { name: 'MACEDONIA', lng: 23.55, lat: 41.13 },
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
  const points = [site.model.bath, site.model.catchment, site.model.ritual].filter(Boolean).length;
  return (
    <span className="evidence-dots" aria-label={`${points} evidence categories recorded`}>
      {[0, 1, 2].map((point) => <i key={point} className={point < points ? 'is-on' : ''} />)}
    </span>
  );
}

function referenceImageBadge(site: ThermalSite) {
  return /locality context/i.test(site.referenceCaption ?? '')
    ? 'CURRENT LOCALITY CONTEXT · REAL IMAGE'
    : 'PLACE RECORD · REAL IMAGE';
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
    return /locality context/i.test(visual.caption)
      ? 'A present-day locality image, included only to orient the site in its living landscape.'
      : 'A real site image that anchors the catalogue record in the present landscape.';
  }

  if (visual.kind === 'context') {
    return `No site-specific plan or reusable field image is reproduced for ${primaryName(site)} in the supplied dissertation. This regional map is retained as clearly labelled corpus context.`;
  }

  return 'A source image from the supplied dissertation, retained as archaeological evidence rather than turned into a reconstruction.';
}

export default function Home() {
  const [selectedId, setSelectedId] = useState('diocletianopolis');
  const [showCaveats, setShowCaveats] = useState(false);
  const [showDoubtful, setShowDoubtful] = useState(true);
  const [showCurrentBorders, setShowCurrentBorders] = useState(true);
  const [showRomanEmpire, setShowRomanEmpire] = useState(true);
  const [doubtfulFocusId, setDoubtfulFocusId] = useState<string | null>(null);

  const selected = thermalSites.find((site) => site.id === selectedId) ?? thermalSites[0];
  const selectedVisual = primaryVisual(selected);
  const selectedSupportingVisuals = supportingVisuals(selected, selectedVisual?.image);
  const doubtfulFocus = doubtfulSites.find((site) => site.id === doubtfulFocusId) ?? null;
  const selectSite = (site: ThermalSite) => {
    setSelectedId(site.id);
    setDoubtfulFocusId(null);
  };
  return (
    <main className="atlas-shell">
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
            <h2 id="map-title">Thermal sites in Bulgaria</h2>
          </div>
          <div className="toolbar-controls">
            <label className="doubtful-toggle">
              <Checkbox checked={showDoubtful} onCheckedChange={(checked) => { setShowDoubtful(checked === true); if (checked !== true) setDoubtfulFocusId(null); }} />
              <span>Doubtful layer <b>{doubtfulSites.length}</b></span>
            </label>
            <div className="layer-controls" role="group" aria-label="Map layers">
              <span className="layer-control-label">Map layers</span>
              <label className="layer-toggle layer-toggle-modern">
                <Checkbox checked={showCurrentBorders} onCheckedChange={(checked) => setShowCurrentBorders(checked === true)} />
                <span><i />Modern borders</span>
              </label>
              <label className="layer-toggle layer-toggle-roman">
                <Checkbox checked={showRomanEmpire} onCheckedChange={(checked) => setShowRomanEmpire(checked === true)} />
                <span><i />Roman Empire · AD 117</span>
              </label>
            </div>
          </div>
        </div>

        <div className="map-and-records">
          <div className="coordinate-map" aria-label="Map of the catalogued thermal sites">
            <div className="map-topline"><span><Crosshair size={13} /> geographic reference map</span><span>{thermalSites.length} confirmed{showDoubtful ? ` · ${doubtfulSites.length} doubtful` : ''}</span></div>
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
              return <button type="button" className={`map-marker ${isSelected ? 'is-selected' : ''} ${site.coordinatePrecision === 'area' ? 'is-area' : ''}`} key={site.id} style={mapPosition(site)} onClick={() => selectSite(site)} aria-pressed={isSelected} aria-label={`Select ${primaryName(site)}, ${site.currentName}`}><span className="marker-core"><i /></span><span className="marker-label"><b>{site.catalogueNo}</b> {primaryName(site)}</span></button>;
            })}
            {showDoubtful && doubtfulSites.map((site) => <button type="button" className={`map-marker map-marker-doubtful ${doubtfulFocus?.id === site.id ? 'is-selected' : ''}`} key={site.id} style={mapPosition(site)} onClick={() => setDoubtfulFocusId(site.id)} aria-pressed={doubtfulFocus?.id === site.id} aria-label={`Inspect doubtful site: ${site.name}`}><span className="marker-core"><i /></span><span className="marker-label"><b>DOUBTFUL</b> {site.name}</span></button>)}
            <div className="map-footnote">
              <span>Points are named settlement / spring anchors. Country borders locate the modern landscape; Roman provinces are a dated historical reference.</span>
              <span><a href="https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/" target="_blank" rel="noreferrer">Natural Earth 1:50m ↗</a> · <a href="https://services3.arcgis.com/nwUScSWGt2wNe9dC/ArcGIS/rest/services/BA_Map100_Roman_Empire_117AD_Roman_Provinces/FeatureServer/0" target="_blank" rel="noreferrer">GISGILDE / Barrington Atlas, AD 117 ↗</a></span>
            </div>
            {doubtfulFocus && <div className="doubtful-map-card"><button type="button" onClick={() => setDoubtfulFocusId(null)} aria-label="Close doubtful site note">×</button><span><CircleAlert size={13} /> DOUBTFUL / NOT CONFIRMED</span><b>{doubtfulFocus.name}</b><p>{doubtfulFocus.reason}</p><small>{doubtfulFocus.sourcePages} · mapped only to modern locality context</small></div>}
          </div>

          <aside className="record-stack" aria-label="Visible site records">
            <div className="record-stack-header"><span>Catalogued sites</span><span className="record-count">{thermalSites.length}</span></div>
            <div className="record-list">
              {thermalSites.map((site) => <button type="button" className={`record-row ${selected.id === site.id ? 'is-selected' : ''}`} onClick={() => selectSite(site)} key={site.id}><span className="record-index">{site.catalogueNo}</span><span className="record-name"><b>{primaryName(site)}</b><small>{secondaryName(site)}</small></span><EvidenceDots site={site} /></button>)}
            </div>
            <div className="record-key">
              <span><i className="key-confirmed" />confirmed anchor</span>
              {thermalSites.some((site) => site.coordinatePrecision === 'area') && <span><i className="key-area" />approximate area anchor</span>}
              {showDoubtful && <span><i className="key-doubtful" />doubtful locality</span>}
              <span className="record-key-evidence"><span className="evidence-dots" aria-hidden="true"><i className="is-on" /><i className="is-on" /><i /></span>dots = reported evidence categories</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="site-stage" aria-labelledby="site-title">
        <div className="stage-titlebar">
          <div><p className="section-kicker">02 · Explore</p><h2 id="site-title"><span>{selected.catalogueNo}</span> {primaryName(selected)}</h2></div>
          <button type="button" className="site-next" onClick={() => { const index = thermalSites.findIndex((site) => site.id === selected.id); selectSite(thermalSites[(index + 1) % thermalSites.length]); }}>Next site <ArrowRight size={16} /></button>
        </div>

        <div className="stage-grid">
          {selectedVisual ? <article className={`site-visual is-${selectedVisual.kind}`}>
            <div className="site-visual-topline"><span>{selectedVisual.label}</span><span>{selectedVisual.kind === 'plan' ? 'CITED DOCUMENT' : selectedVisual.kind === 'photo' ? 'PLACE IMAGE' : 'SOURCE IMAGE'}</span></div>
            <div className="site-visual-frame">
              {selectedVisual.href ? <a href={selectedVisual.href} target="_blank" rel="noreferrer" aria-label={`Open source for ${selectedVisual.caption}`}><img src={selectedVisual.image} alt={selectedVisual.caption} /></a> : <img src={selectedVisual.image} alt={selectedVisual.caption} />}
            </div>
            <div className="site-visual-caption"><div><span>{selectedVisual.figure}</span><h3>{selectedVisual.caption}</h3></div><p>{visualScope(selected, selectedVisual)}</p></div>
          </article> : <article className="site-visual is-empty"><p>Source image pending</p><span>The catalogue record remains available at right.</span></article>}

          <article className="site-dossier">
            <div className="dossier-head"><div><p className="roman-name">{primaryName(selected)}</p><p className="modern-name">{secondaryName(selected)}</p></div><MapPinned size={22} /></div>
            <p className="site-location">{selected.location}</p>
            <div className="water-strip"><div><span><Waves size={14} /> source</span><b>{selected.temperature}</b></div><div><span>acidity</span><b>{selected.acidity}</b></div><div><span>residue</span><b>{selected.mineral}</b></div></div>
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
            <p>Directly linked dissertation figures and, where available, a credited real-place image. The lead visual is not repeated here.</p>
          </div>
          {selectedSupportingVisuals.length > 0 ? <div className="source-strip">
            {selectedSupportingVisuals.map((asset) => <figure className={`support-card is-${asset.kind}`} key={asset.image}>
              {asset.href ? <a href={asset.href} target="_blank" rel="noreferrer" aria-label={`Open source for ${asset.caption}`}><img src={asset.image} alt={asset.caption} /></a> : <img src={asset.image} alt={asset.caption} />}
              <figcaption><span>{asset.label}</span><p>{asset.caption}</p><small>{asset.figure}</small></figcaption>
            </figure>)}
          </div> : <div className="source-empty"><span>Single-source record</span><p>The lead visual is the only reusable site material currently reproduced in the supplied dissertation.</p></div>}
        </section>
      </section>

      <section className="catalog-section" aria-labelledby="catalog-title">
        <div className="catalog-heading"><div><p className="section-kicker">03 · Compare</p><h2 id="catalog-title">The confirmed corpus</h2></div><p>Each tile moves the map and source view to that site. Water metadata is copied as catalogued; cautions stay attached to the records.</p></div>
        <div className="catalog-grid">
          {thermalSites.map((site) => <button type="button" key={site.id} className={`catalog-tile ${site.id === selected.id ? 'is-selected' : ''}`} onClick={() => { selectSite(site); document.getElementById('site-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><span className="tile-code">{site.catalogueNo}</span><h3>{primaryName(site)}</h3><p>{secondaryName(site)}</p><div className="tile-meta"><span>{site.temperature}</span><EvidenceDots site={site} /></div></button>)}
        </div>
        <div className="doubtful-section">
          <div className="doubtful-heading"><div><p className="section-kicker"><CircleAlert size={13} /> Separate evidence status</p><h3>Doubtful sites, visibly held apart.</h3></div><p>These eleven localities are named in the dissertation’s <i>Dubious Sites</i> section. They are shown as amber, dashed locality markers—not confirmed spas—and do not receive reconstructed site views.</p></div>
          <div className="doubtful-grid">{doubtfulSites.map((site) => <button type="button" className="doubtful-tile" key={site.id} onClick={() => { setShowDoubtful(true); setDoubtfulFocusId(site.id); document.querySelector('.coordinate-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}><span>DOUBTFUL</span><h3>{site.name}</h3><p>{site.reason}</p><small>{site.sourcePages}</small></button>)}</div>
        </div>
      </section>

      <section className="method-section" aria-labelledby="method-title">
        <div className="method-stamp"><span>AV</span><small>2024</small></div>
          <div><p className="section-kicker">Method & scope</p><h2 id="method-title">Evidence before atmosphere.</h2><p className="method-copy">This atlas follows the dissertation’s confirmed <i>Catalogue of Sites</i> (PDF pp. 199–249; printed pp. 195–245). Architecture, spring deposits, water data and citations are preserved as distinct evidence threads. Seven records have a plan or excavation plan reproduced in the supplied PDF; each is shown as a labelled source document. The atlas does not invent height, bath geometry or unrecorded dimensions.</p><button type="button" className="caveat-toggle" aria-expanded={showCaveats} onClick={() => setShowCaveats(!showCaveats)}><CircleAlert size={16} /> {showCaveats ? 'Hide' : 'Read'} scope & uncertainty notes</button>{showCaveats && <div className="caveat-box"><p><b>Included:</b> 16 confirmed top-level catalogue entries. Diocletianopolis is represented as one site with five separately catalogued spring sources.</p><p><b>Visible but separate:</b> 11 doubtful localities are amber and dashed on the map, receive written cautions, and never count as confirmed spas or receive reconstructed site views.</p><p><b>Plans:</b> Pautalia, Germania, Serdica, Diocletianopolis, Starozagorski Bani, Haskovski Mineralni Bani and Aquae Calidae have cited plan material in the supplied PDF. A plan is shown as source evidence, never expanded into an unsupported reconstruction.</p><p><b>Map layers:</b> current national borders come from Natural Earth; the Roman provincial reference is GISGILDE’s AD 117 vectorization based on Barrington Atlas Map 100, and is not treated as a time-specific boundary for every AD 46–395 record.</p><p><b>Editorial flags:</b> duplicate printed catalogue numbers, later well analyses, incomplete excavation publication and numerical contradictions stay visible in the relevant dossiers.</p></div>}</div>
      </section>

      <footer className="atlas-footer"><span>THERMAE THRACIAE</span><span>Source-led exploration of Roman thermalism in Thrace</span><span>16 confirmed sites</span></footer>
    </main>
  );
}
