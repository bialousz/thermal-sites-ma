# Experimental 3D plans: evidence and limits

This branch presents **plan reliefs**, not reconstructed buildings. Horizontal footprints come from the unmodified atlas plates. Masonry and support footprints use a display thickness of 2% of the longest cropped plan side. Copper drawing markers sit lower, at 0.75%, to distinguish symbolic linework from wall bands. Neither is a statement about ancient or surviving height. Pool identifiers are flat coloured areas, not water surfaces. No roof, conjectural wall, shared ancient floor level or map-derived scale is supplied.

Research agents audited all seven plan-bearing dossiers against the locally supplied dissertation text and rendered plates. Four plans have reviewed traces that distinguish recorded masonry and supports from drawing outlines. Copper outlines are narrow display ribbons, not assertions of actual wall thickness. The original source underlay is visible by default for every model. The other nine confirmed sites have no usable site plan, and none of the dubious localities receives a model.

A [second, independent subagent review](review-2026-09-05.md) compared all four models with their source plans, relevant photographs and dissertation explanations. The resulting corrections and selected source landmarks are recorded for future review.

Primary corpus: Mariya Avramova, *Thermalism in Roman Thrace (AD 46–395)*, University of Warsaw, 2024. Digital page numbers below count PDF pages; printed numbers refer to the page text. The [university record](https://repozytorium.uw.edu.pl/entities/publication/f4a38e54-bb50-4a77-9b45-cd2f446025dd) identifies the dissertation as `0000-DR-205903-praca.pdf` (deposited January 2025).

## Included

| Site / model | Evidence | Scope and uncertainty |
| --- | --- | --- |
| Diocletianopolis: Momina salza | Fig. 37, after Madzharov, Tancheva & Madzharov 2021a: 705, fig. 1; digital p. 289 / printed p. 285 | Solid-black masonry of the five named rooms and adjoining southern masonry. Eight polygons with fifteen source-shaped aperture holes. Reading/sampling tolerance is estimated at ±2 image pixels, not survey accuracy. Thin drainage, paving, patterned rubble, ambiguous marks, excavation hatching and disconnected southern extension remain in the source only. This is the published recorded state, not a claim of one construction phase. |
| Starozagorski Bani: recorded fabric | Fig. 24, author based on Nikolov 1968: 44, fig. 1; digital p. 280 / printed p. 276 | Solid-black masonry, fourteen detached catchment columns, one isolated square mark, three pool identifiers and readable basin contours. Bounded hatched walls around the northern enclosure and spaces 9–14 are traced separately in sage. Boundary approximation about ±3 raster pixels. Dashed channels, stair risers and ambiguous details remain unraised. The figure provides no explicit phase key for either fabric convention. |
| Pautalia: public thermae | Fig. 50, after Ruseva-Slokoska 2002: 44, fig. 2; digital p. 296 / printed p. 292. Hypocaust explanation on digital pp. 93–95 / printed pp. 89–91 and Fig. 51, digital p. 297 / printed p. 293. | Reliably bounded masonry, 140 visible support marks, seven symbolic arcade alignments and readable boundary/stair strokes. Copper markers distinguish projected alignments from solid walls. Page borders, diagonal section lines, unkeyed semicircular profiles, unknown external wall thickness and unrecorded elevations are excluded. The full hypocaust section is available as supporting evidence. |
| Mineralni Bani (Haskovo): second spring group | Fig. 19, after Tsonchev 1940a: 99, fig. 17; digital p. 277 / printed p. 273 | Two inner basin-floor identifiers and readable boundaries/step lines. Main boundary ribbons are 3 source pixels wide; fine step lines 1.8 pixels. Widths and relief height are display conventions. No hatching is turned into solid masonry, no fading boundary is closed, and no crop-edge wall is added. Raster tracing tolerance about ±3 pixels. |

**Pautalia's vertical evidence is limited to parts of the hypocaust.** Printed p. 89 describes seven arcades, supports 0.84 m apart, lower floor-to-keystone height 0.43 m, and perpendicular upper vaults with 1.50 m span and 0.90 m rise. These dimensions do not establish the bath's full elevations or the heights of all visible supports. The plan relief does not impose those dimensions on the whole building. Printed p. 91 documents different support constructions in rooms 3 and 4, without supplying their complete heights.

**Haskovo's model belongs only to the second spring group.** Table 2 (digital p. 80 / printed p. 76) records both pools at 6.90 × 4.50 m and 1.10–1.20 m deep. These measurements appear in feature notes, but no metre-per-pixel scale is imposed on the atlas crop. Tread lines follow the source; risers and depth are not reconstructed. The complete dissertation page, including its scale and legend, is available as supporting material. Northern rectangles and the central strip are neutral outlines, with no invented functions. Underground catchment/drainage paths remain in the source only.

**Starozagorski structure 6 is an underground catchment**, not a hypocaust. Avramova digital p. 62 / printed p. 58 describes brick columns and arches, while warning that publication is incomplete. The relief displays the column footprints only; their relationship in elevation to the bath is not reconstructed. Pool 5's water supply is hypothetical (digital p. 68 / printed p. 64), so no pipe is added.

**Diocletianopolis contains separate complexes.** The 1935 Late Antique bath in Fig. 15 belongs to Toplitsa (catalogue digital p. 231 / printed p. 227), although it received some water from Momina salza. Fig. 37 records the separate Momina salza thermal complex. The dossier captions were clarified accordingly; these footprints and the other springs must never be merged.

Inspected trace overlays (not production textures):

- [Diocletianopolis overlay](diocletianopolis-overlay.jpg)
- [Starozagorski overlay](starozagorski-bani-overlay.jpg)
- [Pautalia overlay](pautalia-overlay.jpg)
- [Haskovo overlay](haskovski-mineralni-bani-overlay.jpg)

## Omitted after review

| Site | Reason for omission | Supporting evidence |
| --- | --- | --- |
| Germania | Building III's bath identification is tentative; excavation is incomplete. Treating trench edges as bath walls would overstate the evidence. | Fig. 108; digital p. 190 / printed p. 186 describes incomplete room 3 and the residential character of other rooms. |
| Ulpia Serdica | A 4 × 4 m inner catchment is measured, but the complete external wall footprint and Roman elevation cannot be resolved from the mixed-period section. Wall thickness must not be guessed. | Fig. 9, digital p. 271 / printed p. 267; description digital pp. 55–56 / printed pp. 51–52. Roman work was repaired in the Ottoman period and 1894; some piping may be later. |
| Aquae Calidae | Fig. 20 combines successive pools and levels, including Roman and old Turkish structures. A reliable single-phase masonry/step footprint was not established. | Fig. 20, digital p. 278 / printed p. 274; chronologically separated pool dimensions in Table 2, digital pp. 81–82 / printed pp. 77–78. Precise circular seat/step dimensions are unavailable (digital p. 85 / printed p. 81). |

## Reproducibility

`app/plan-models/*.json` stores source-image pixel coordinates, dimensions, exact crop, source SHA-256, citations, feature notes and limitations. Holes are explicit polygons, so courtyard/room voids remain voids. Model and texture use the same crop and uniform scale. The top view preserves image orientation; no undocumented north arrow or metric ruler is added.

The source underlay maps the original plate onto the display board beneath the geometry and starts **on for every model**, including after closing and reopening the viewer. Full-image comparison remains available through the atlas image reader. The source thumbnail for Diocletianopolis intentionally shows Fig. 37, even though the main dossier image remains Fig. 15.

Run `node --test tests/plan-models.test.mjs` to verify the audited allowlist, source checksums and image dimensions, crop bounds, finite coordinates, triangulated footprint area with openings, and finite Three.js extrusion buffers. [Source landmarks](source-landmarks.json) also check selected supports, openings and omitted annotations against observations from the independent review. These points use original image pixels and include an explanation of their evidence; they are not inferred coordinates or historical measurements. A replaced source image requires explicit re-audit. These checks verify selected source details and geometry; they do not replace archaeological review or browser visual checks.

Three.js and its controls load only after opening the model. Rendering is event-driven with no continuous animation. Repeated supports and boundary segments are batched into one mesh per feature, retaining every polygon and its feature selection. The canvas grows with the evidence panel so longer source notes do not leave a dark gap below the model. The canvas is released on close or site change, including controls, observers, geometries, materials, textures, shadow resources and the WebGL context. Failed WebGL initialization retains the cited plan.
