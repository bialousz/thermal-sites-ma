import type { PlanModel, PlanPoint, PlanSceneApi } from './plan-model-types';

/** Lazy-loaded only when the visitor opens an audited plan. */
export async function createPlanScene(
  host: HTMLDivElement,
  model: PlanModel,
  onSelect: (id: string | null) => void,
  onError: () => void,
  signal: AbortSignal,
): Promise<{ api: PlanSceneApi; dispose: () => void } | null> {
  const [THREE, { OrbitControls }] = await Promise.all([
    import('three'),
    import('three/examples/jsm/controls/OrbitControls.js'),
  ]);
  if (signal.aborted) return null;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor('#152b2d');
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const canvas = renderer.domElement as HTMLCanvasElement;
  canvas.setAttribute('aria-label', `${model.title}. Drag to rotate; pinch or scroll to zoom. Use the adjacent buttons or arrow keys for keyboard exploration.`);
  canvas.setAttribute('role', 'img');
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const [cropX, cropY, cropWidth, cropHeight] = model.crop;
  const unit = 12 / Math.max(cropWidth, cropHeight);
  const width = cropWidth * unit;
  const height = cropHeight * unit;
  const centerX = cropX + cropWidth / 2;
  const centerY = cropY + cropHeight / 2;
  const camera = new THREE.OrthographicCamera(-9, 9, 9, -9, 0.1, 150);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.minPolarAngle = 0.001;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.minZoom = 0.65;
  controls.maxZoom = 4;
  controls.zoomSpeed = 0.7;
  controls.panSpeed = 0.65;
  controls.target.set(0, 0, 0);
  let disposed = false;
  let frame = 0;
  const draw = () => {
    if (disposed || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!disposed) renderer.render(scene, camera);
    });
  };
  controls.addEventListener('change', draw);

  scene.add(new THREE.HemisphereLight('#e7f4f2', '#526561', 2.4));
  const sunlight = new THREE.DirectionalLight('#ffefdb', 3.4);
  sunlight.position.set(-7, 14, 5);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunlight.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 45 });
  sunlight.shadow.normalBias = 0.035;
  sunlight.shadow.bias = -0.0001;
  scene.add(sunlight);
  const fill = new THREE.DirectionalLight('#9fdad5', 1.0);
  fill.position.set(8, 7, -7);
  scene.add(fill);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#152b2d', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.27;
  ground.receiveShadow = true;
  scene.add(ground);
  const board = new THREE.Mesh(new THREE.BoxGeometry(width + 0.5, 0.22, height + 0.5), new THREE.MeshStandardMaterial({ color: '#d1c7af', roughness: 0.9 }));
  board.position.y = -0.12;
  board.receiveShadow = true;
  board.castShadow = true;
  scene.add(board);

  // The paper and geometry share the same crop and scale. No inferred metric grid.
  const paperMaterial = new THREE.MeshStandardMaterial({ color: '#f0ecdf', roughness: 1 });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(width, height), paperMaterial);
  paper.rotation.x = -Math.PI / 2;
  paper.position.y = 0.002;
  paper.receiveShadow = true;
  scene.add(paper);

  const sourceMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.88 });
  const sourcePlane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), sourceMaterial);
  sourcePlane.rotation.x = -Math.PI / 2;
  sourcePlane.position.y = 0.008;
  sourcePlane.visible = true;
  scene.add(sourcePlane);

  const resources: { dispose: () => void }[] = [];
  const texture = new THREE.TextureLoader().load(model.image, (loaded: typeof texture) => {
    if (disposed) { loaded.dispose(); return; }
    loaded.colorSpace = THREE.SRGBColorSpace;
    loaded.offset.set(cropX / model.imageWidth, 1 - (cropY + cropHeight) / model.imageHeight);
    loaded.repeat.set(cropWidth / model.imageWidth, cropHeight / model.imageHeight);
    loaded.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    sourceMaterial.map = loaded;
    sourceMaterial.needsUpdate = true;
    draw();
  }, undefined, () => { if (!disposed) onError(); });
  resources.push(texture);

  const pickable: typeof board[] = [];
  const featureMeshes = new Map<string, typeof board[]>();
  const toPath = (points: PlanPoint[], hole = false) => {
    const path = hole ? new THREE.Path() : new THREE.Shape();
    points.forEach(([x, y], index) => {
      const px = (x - centerX) * unit;
      const py = -(y - centerY) * unit;
      if (index === 0) path.moveTo(px, py);
      else path.lineTo(px, py);
    });
    path.closePath();
    return path;
  };
  const colors = { masonry: '#b7a489', basin: '#779c9b', detail: '#c6b899', outline: '#a76b45' };
  for (const feature of model.features) {
    const shapes = feature.polygons.map((polygon) => {
      const shape = toPath(polygon.outline);
      for (const hole of polygon.holes ?? []) shape.holes.push(toPath(hole, true));
      return shape;
    });
    // Batch repeated supports into one mesh per feature, retaining every source polygon.
    // Display relief only: 2% of the longest crop side, NEVER historical height.
    const depth = feature.kind === 'basin' ? 0.018 : 0.24;
    const geometry = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, steps: 1, curveSegments: 1 });
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({ color: colors[feature.kind], roughness: 0.84, metalness: 0 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.015;
    mesh.castShadow = feature.kind !== 'basin';
    mesh.receiveShadow = true;
    mesh.userData.featureId = feature.id;
    mesh.userData.baseColor = colors[feature.kind];
    scene.add(mesh);
    pickable.push(mesh);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 35), new THREE.LineBasicMaterial({ color: '#514e44', transparent: true, opacity: 0.28 }));
    edges.position.copy(mesh.position);
    scene.add(edges);
    featureMeshes.set(feature.id, [mesh]);
  }

  const resize = () => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h);
    const aspect = w / h;
    const radius = Math.hypot(width, height) * 0.63;
    const halfHeight = radius / Math.min(aspect, 1);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    draw();
  };
  const setView = (view: 'axonometric' | 'plan') => {
    controls.target.set(0, 0, 0);
    camera.zoom = 1;
    camera.position.set(...(view === 'plan' ? [0, 24, 0.024] : [10, 17, 14]));
    controls.enableRotate = view !== 'plan';
    camera.updateProjectionMatrix();
    controls.update();
    draw();
  };
  const api: PlanSceneApi = {
    view: setView,
    zoom: (direction) => { if (direction > 0) controls.dollyIn(1 / 1.2); else controls.dollyOut(1 / 1.2); controls.update(); draw(); },
    rotate: (direction) => { controls.enableRotate = true; controls.rotateLeft(direction * Math.PI / 12); controls.update(); draw(); },
    pan: (x, y) => { controls.pan(x, y); controls.update(); draw(); },
    reset: () => setView('axonometric'),
    source: (visible) => { sourcePlane.visible = visible; draw(); },
    select: (id) => {
      for (const [featureId, meshes] of featureMeshes) for (const mesh of meshes) {
        mesh.material.color.set(featureId === id ? '#299e9b' : mesh.userData.baseColor);
      }
      draw();
    },
  };
  const raycaster = new THREE.Raycaster();
  let down: { x: number; y: number; id: number } | null = null;
  const pointerDown = (event: PointerEvent) => { down = event.isPrimary ? { x: event.clientX, y: event.clientY, id: event.pointerId } : null; };
  const pointerUp = (event: PointerEvent) => {
    if (!down || down.id !== event.pointerId || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) { down = null; return; }
    down = null;
    const bounds = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1), camera);
    onSelect(raycaster.intersectObjects(pickable)[0]?.object.userData.featureId ?? null);
  };
  const contextLost = (event: Event) => { event.preventDefault(); onError(); };
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('webglcontextlost', contextLost);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  setView('axonometric');
  resize();

  const dispose = () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    controls.removeEventListener('change', draw);
    controls.dispose();
    canvas.removeEventListener('pointerdown', pointerDown);
    canvas.removeEventListener('pointerup', pointerUp);
    canvas.removeEventListener('webglcontextlost', contextLost);
    const geometries = new Set<{ dispose: () => void }>();
    const materials = new Set<{ dispose: () => void }>();
    scene.traverse((object: { geometry?: { dispose: () => void }; material?: { dispose: () => void } | { dispose: () => void }[] }) => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    resources.forEach((resource) => resource.dispose());
    sunlight.shadow.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  };
  return { api, dispose };
}
