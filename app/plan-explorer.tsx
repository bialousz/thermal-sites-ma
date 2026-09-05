'use client';

/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- The scoped 3D application is intentionally focusable for documented keyboard orbit, zoom and pan controls. */

import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Box, ChevronDown, Layers2, Maximize2, Move, RotateCcw, RotateCw, ScanLine, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import type { PlanModel, PlanSceneApi } from './plan-model-types';
import './plan-explorer.css';

export function PlanExplorer({ model, onOpenSource }: {
  model: PlanModel;
  onOpenSource: (opener: HTMLButtonElement) => void;
}) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  return <section className={`plan-explorer ${open ? 'is-open' : ''}`} aria-labelledby={`plan-heading-${model.siteId}`}>
    <div className="plan-heading">
      <div className="plan-heading-icon"><Box size={24} strokeWidth={1.3} /></div>
      <div className="plan-heading-copy"><p className="plan-eyebrow">Spatial study · Experimental</p><h3 id={`plan-heading-${model.siteId}`}>{model.title}</h3><p>Explore the recorded footprint in 3D.</p></div>
      <Button ref={opener} variant="outline" className="plan-launch" aria-expanded={open} aria-controls={`plan-content-${model.siteId}`} onClick={() => setOpen(!open)}>
        {open ? <><X size={17} /> Close 3D</> : <><Box size={17} /> Explore in 3D <ArrowRight size={17} /></>}
      </Button>
    </div>
    {open && <PlanWorkbench model={model} onOpenSource={onOpenSource} onClose={() => { setOpen(false); opener.current?.focus(); }} />}
  </section>;
}

function PlanWorkbench({ model, onOpenSource, onClose }: {
  model: PlanModel;
  onOpenSource: (opener: HTMLButtonElement) => void;
  onClose: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const api = useRef<PlanSceneApi | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [source, setSource] = useState(false);
  const [view, setView] = useState<'axonometric' | 'plan'>('axonometric');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const selectedFeature = model.features.find((feature) => feature.id === selectedId);

  useEffect(() => {
    const abort = new AbortController();
    let dispose: (() => void) | undefined;
    const element = host.current;
    if (!element) return;
    import('./plan-scene').then(({ createPlanScene }) => createPlanScene(element, model, setSelectedId, () => setStatus('error'), abort.signal))
      .then((scene) => {
        if (!scene) return;
        if (abort.signal.aborted) { scene.dispose(); return; }
        api.current = scene.api;
        dispose = scene.dispose;
        setStatus('ready');
      }).catch(() => { if (!abort.signal.aborted) setStatus('error'); });
    return () => { abort.abort(); dispose?.(); api.current = null; };
  }, [model]);

  useEffect(() => { if (status === 'ready') api.current?.select(selectedId); }, [selectedId, status]);
  useEffect(() => { workspace.current?.focus({ preventScroll: true }); }, []);

  const setCamera = (nextView: 'axonometric' | 'plan') => { setView(nextView); api.current?.view(nextView); };
  const reset = () => { setView('axonometric'); api.current?.reset(); };
  const rotate = (direction: number) => {
    if (view === 'plan') setCamera('axonometric');
    api.current?.rotate(direction);
  };
  const ready = status === 'ready';
  return <div id={`plan-content-${model.siteId}`} className={`plan-workbench ${expanded ? 'is-expanded' : ''}`}>
    <div className="plan-workbench-bar">
      <fieldset className="plan-view-switch" aria-label="Camera view">
        <Button variant="ghost" disabled={!ready} aria-pressed={view === 'axonometric'} onClick={() => setCamera('axonometric')}><Box size={16} /> 3D view</Button>
        <Button variant="ghost" disabled={!ready} aria-pressed={view === 'plan'} onClick={() => setCamera('plan')}><ScanLine size={16} /> Top view</Button>
      </fieldset>
      <label className="plan-source-toggle" htmlFor={`plan-source-toggle-${model.siteId}`}><Checkbox id={`plan-source-toggle-${model.siteId}`} checked={source} disabled={!ready} onCheckedChange={(checked) => { setSource(checked); api.current?.source(checked); }} /><Layers2 size={16} /> Source underlay</label>
      <Button variant="ghost" className="plan-expand" aria-pressed={expanded} onClick={() => setExpanded(!expanded)}><Maximize2 size={16} /> {expanded ? 'Compact' : 'Larger view'}</Button>
    </div>
    <div className="plan-workbench-grid">
      <div className="plan-canvas-column">
        <div ref={workspace} className="plan-canvas-shell" tabIndex={0} role="application" aria-label="Interactive 3D plan" aria-describedby={`plan-help-${model.siteId}`} onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'Escape') { onClose(); return; }
          if (!ready) return;
          const actions: Record<string, () => void> = {
            ArrowLeft: () => rotate(1), ArrowRight: () => rotate(-1),
            ArrowUp: () => api.current?.pan(0, 35), ArrowDown: () => api.current?.pan(0, -35),
            '+': () => api.current?.zoom(1), '=': () => api.current?.zoom(1), '-': () => api.current?.zoom(-1),
            Home: reset,
          };
          const action = actions[event.key];
          if (action) { event.preventDefault(); action(); }
        }}>
          <div className="plan-canvas-label"><span><i /> Recorded footprint</span><span>Height is schematic</span></div>
          <div ref={host} className="plan-canvas" aria-hidden={status !== 'ready'} />
          {status !== 'ready' && <div className="plan-render-state" aria-live="polite">
            <Box size={34} strokeWidth={1.2} />
            <h4>{status === 'loading' ? 'Preparing the plan…' : '3D is unavailable on this device'}</h4>
            <p>{status === 'loading' ? 'Loading the documented geometry.' : 'The original plan and source notes remain available.'}</p>
            {status === 'error' && <Button variant="outline" onClick={(event) => onOpenSource(event.currentTarget)}>View source plan <ArrowRight size={16} /></Button>}
          </div>}
          <fieldset className="plan-orbit-tools" aria-label="Rotate and zoom model">
            <Button variant="ghost" disabled={!ready} onClick={() => rotate(1)} aria-label="Rotate model left" title="Rotate left"><RotateCcw size={18} /></Button>
            <Button variant="ghost" disabled={!ready} onClick={() => rotate(-1)} aria-label="Rotate model right" title="Rotate right"><RotateCw size={18} /></Button>
            <span />
            <Button variant="ghost" disabled={!ready} onClick={() => api.current?.zoom(1)} aria-label="Zoom model in" title="Zoom in"><ZoomIn size={18} /></Button>
            <Button variant="ghost" disabled={!ready} onClick={() => api.current?.zoom(-1)} aria-label="Zoom model out" title="Zoom out"><ZoomOut size={18} /></Button>
            <Button variant="ghost" disabled={!ready} onClick={reset} aria-label="Reset model view" title="Reset view"><ScanLine size={18} /></Button>
          </fieldset>
        </div>
        <div className="plan-canvas-footer">
          <p id={`plan-help-${model.siteId}`}><Move size={16} /><span>Drag to orbit · Scroll or pinch to zoom<br /><small>Keyboard: ← → rotate · ↑ ↓ pan · + − zoom · Home reset</small></span></p>
          <details className="plan-pan-details"><summary>Pan <ChevronDown size={14} /></summary><fieldset aria-label="Pan model">
            <Button variant="ghost" disabled={!ready} aria-label="Pan model left" onClick={() => api.current?.pan(35, 0)}><ArrowLeft size={16} /></Button>
            <Button variant="ghost" disabled={!ready} aria-label="Pan model up" onClick={() => api.current?.pan(0, 35)}><ArrowUp size={16} /></Button>
            <Button variant="ghost" disabled={!ready} aria-label="Pan model down" onClick={() => api.current?.pan(0, -35)}><ArrowDown size={16} /></Button>
            <Button variant="ghost" disabled={!ready} aria-label="Pan model right" onClick={() => api.current?.pan(-35, 0)}><ArrowRight size={16} /></Button>
          </fieldset></details>
        </div>
      </div>
      <aside className="plan-inspector" aria-label="Plan evidence and features">
        <div className="plan-source-card"><p className="plan-eyebrow">Compare with the evidence</p><button className="plan-source-image" type="button" onClick={(event) => onOpenSource(event.currentTarget)} aria-label={`Enlarge source plan: ${model.figure}`}><Image src={model.image} width={model.imageWidth} height={model.imageHeight} unoptimized alt={`${model.title}, original archaeological plan`} /><span><Maximize2 size={15} /> Open source</span></button><p className="plan-citation">{model.figure}</p></div>
        <div className="plan-feature-list"><h4>Explore the plan</h4><p>Select a feature here or in the model.</p><fieldset aria-label="Documented plan features">
          {model.features.map((feature) => <Button key={feature.id} variant="ghost" disabled={!ready} aria-pressed={selectedId === feature.id} onClick={() => setSelectedId(selectedId === feature.id ? null : feature.id)}><i className={`plan-feature-dot is-${feature.kind}`} /><span>{feature.label}</span><ArrowRight size={14} /></Button>)}
        </fieldset><p className="plan-feature-note" aria-live="polite">{selectedFeature?.note ?? model.scope}</p></div>
      </aside>
    </div>
    <div className="plan-evidence-note"><span className="plan-evidence-mark"><Layers2 size={18} /></span><div><h4>A plan in relief</h4><p>Horizontal outlines are traced from the cited plate. The uniform relief height is only a viewing aid; original wall heights, roofs and missing structures are not reconstructed.</p><p>{model.limitation}</p></div></div>
  </div>;
}
