import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ShapeUtils, Shape, Path, ExtrudeGeometry, Vector2 } from 'three';

const root = new URL('../', import.meta.url);
const models = readdirSync(new URL('app/plan-models/', root))
  .filter((name) => name.endsWith('.json'))
  .map((name) => JSON.parse(readFileSync(new URL(`app/plan-models/${name}`, root), 'utf8')));

function jpegDimensions(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8);
  let offset = 2;
  while (offset < bytes.length) {
    assert.equal(bytes[offset], 0xff);
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) return [bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5)];
    offset += 2 + length;
  }
  throw new Error('JPEG frame not found');
}

const auditedFigures = {
  diocletianopolis: 37,
  'haskovski-mineralni-bani': 19,
  pautalia: 50,
  'starozagorski-bani': 24,
};

test('only the audited site plans are supplied', () => {
  assert.deepEqual(models.map((model) => model.siteId).sort(), Object.keys(auditedFigures).sort());
});

for (const model of models) {
  test(`${model.siteId}: source image still matches the reviewed tracing`, () => {
    const bytes = readFileSync(new URL(`public${model.image}`, root));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), model.sourceSha256, 'Changing a source plate requires re-auditing the trace and overlay');
    assert.deepEqual(jpegDimensions(bytes), [model.imageWidth, model.imageHeight]);
    const [x, y, w, h] = model.crop;
    assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0);
    assert.ok(x + w <= model.imageWidth && y + h <= model.imageHeight);
    assert.ok(model.figure.includes(`Fig. ${auditedFigures[model.siteId]}`));
    assert.match(model.limitation, /height/);
    assert.ok(model.scope.length > 40);
  });

  test(`${model.siteId}: every ring is finite, in the source crop, and triangulates without losing openings`, () => {
    const featureIds = new Set();
    for (const feature of model.features) {
      assert.ok(!featureIds.has(feature.id));
      featureIds.add(feature.id);
      assert.ok(['masonry', 'basin', 'detail', 'outline'].includes(feature.kind));
      assert.ok(feature.label && feature.note);
      for (const polygon of feature.polygons) {
        const rings = [polygon.outline, ...(polygon.holes ?? [])];
        for (const ring of rings) {
          assert.ok(ring.length >= 3);
          for (const [x, y] of ring) {
            assert.ok(Number.isFinite(x) && Number.isFinite(y));
            assert.ok(x >= model.crop[0] && x <= model.crop[0] + model.crop[2]);
            assert.ok(y >= model.crop[1] && y <= model.crop[1] + model.crop[3]);
          }
        }
        const vectors = rings.map((ring) => ring.map(([x, y]) => new Vector2(x, y)));
        const expectedArea = Math.abs(ShapeUtils.area(vectors[0])) - vectors.slice(1).reduce((sum, ring) => sum + Math.abs(ShapeUtils.area(ring)), 0);
        assert.ok(expectedArea > 0, 'A wall polygon must retain positive area after removing room holes');
        const triangles = ShapeUtils.triangulateShape(vectors[0], vectors.slice(1));
        const points = vectors.flat();
        const actualArea = triangles.reduce((sum, triangle) => sum + Math.abs(ShapeUtils.area(triangle.map((index) => points[index]))), 0);
        assert.ok(Math.abs(actualArea - expectedArea) < 0.01, `Triangulation altered the footprint: ${actualArea} vs ${expectedArea}`);
      }
    }
  });

  test(`${model.siteId}: batched Three.js features preserve every polygon with finite buffers`, () => {
    for (const feature of model.features) {
      const shapes = feature.polygons.map((polygon) => {
        const shape = new Shape(polygon.outline.map(([x, y]) => new Vector2(x, -y)));
        shape.holes = (polygon.holes ?? []).map((ring) => new Path(ring.map(([x, y]) => new Vector2(x, -y))));
        return shape;
      });
      const options = { depth: feature.kind === 'basin' ? 0.018 : 0.24, bevelEnabled: false, steps: 1, curveSegments: 1 };
      const geometry = new ExtrudeGeometry(shapes, options);
      assert.ok(geometry.attributes.position.count > 0);
      assert.ok(geometry.attributes.position.array.every(Number.isFinite));
      assert.ok(geometry.attributes.normal.array.every(Number.isFinite));
      const individualVertexCount = shapes.reduce((count, shape) => {
        const individual = new ExtrudeGeometry(shape, options);
        const result = count + individual.attributes.position.count;
        individual.dispose();
        return result;
      }, 0);
      assert.equal(geometry.attributes.position.count, individualVertexCount, 'Batching must not drop tiny support polygons or open boundary segments');
      geometry.dispose();
    }
  });
}

test('single-line studies explicitly explain display line width', () => {
  for (const model of models.filter((model) => model.features.some((feature) => feature.kind === 'outline'))) {
    assert.match(model.limitation, /thickness/);
    for (const feature of model.features.filter((feature) => feature.kind === 'outline')) {
      assert.match(feature.note, /outline|line|ribbon|marker|stroke|copied/i);
    }
  }
});
