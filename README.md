# Thermae Thraciae

An interactive, source-led atlas of Roman thermalism in Thrace, focused on sixteen confirmed sites in present-day Bulgaria with a separate corpus of dubious localities.

**Live atlas:** [thermal-thraciae.netlify.app](https://thermal-thraciae.netlify.app/)

## What this project does

Thermae Thraciae turns the site catalogue in Mariya Avramova’s doctoral dissertation into an explorable research interface. It brings together:

- 16 confirmed thermal-site records with catalogued water data and archaeological evidence; seven include cited plans. Skaptopara and Banya–Razlog currently show regional-map context only.
- 11 **Dubious sites**, kept visibly separate from the confirmed corpus. They are shown as amber dashed locality markers with an evidence note, not as confirmed spas or reconstructions.
- An interactive geographic map with current national borders and an AD 117 Roman provincial reference layer.
- Click-to-expand source imagery and plans, so field photographs, archive plates, and diagrams can be read at full size.
- Experimental 3D plan reliefs for Pautalia, Momina salza at Diocletianopolis, selected fabric at Starozagorski Bani, and the second spring group at Mineralni Bani (Haskovo). Other sites have no 3D model.

The experience is deliberately evidence-first: each relief preserves source-image proportions and openings. Its constant display height is explicitly schematic, with no restored roofs, missing walls or ancient elevations. Copper outlines trace drawing lines without asserting masonry thickness. The aligned source underlay is on by default for every model and can be hidden with its toggle. See [the 3D evidence audit](docs/3d-plans/README.md) for included scope, trace overlays, citations and reasons for excluding the other plans.

## Research basis

The primary corpus is:

> Avramova, Mariya. *Thermalism in Roman Thrace (AD 46–395).* Doctoral dissertation, University of Warsaw, 2024.

The dissertation’s own heading, **“Dubious sites”** (printed p. 246), is retained for the separate evidence-status group. Site records include the relevant dissertation and printed page references. The map also credits Natural Earth for present-day borders and GISGILDE / Barrington Atlas for the AD 117 provincial reference.

## Using the atlas

1. Use the map layers to compare modern borders with Roman provincial context.
2. Zoom with the controls, mouse wheel or a two-finger pinch. Drag the map or use arrow keys to pan; the cropped mobile view also supports panning at its initial zoom.
3. Select a confirmed marker or catalogue tile to open its dossier. The map and catalogue list stay synchronized, including when using Previous / Next site.
4. Click any plan or supporting image to open the image reader. Use its arrows or your keyboard’s left/right arrows to browse the record’s images. Source-specific notes and credits remain attached; **Open original image** opens the image separately.
5. Close the image reader with its close button or Escape; keyboard focus returns to the image you opened.
6. Amber dashed markers open separate **Dubious sites** notes with the locality, evidence caution and citation. These records are excluded from the confirmed total; Traianopolis is in present-day Greece.
7. Records marked **3D** have an **Explore in 3D** option below the dossier. Rotate or zoom the relief, switch to top view, toggle the source underlay (on by default), or select a feature. Keyboard controls and pan buttons are provided. **Larger view** expands the canvas within the page. Devices without WebGL2 retain the original source image.

## Project structure

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Atlas interface, map interaction, records, galleries, and lightbox. |
| `app/atlas-data.ts` | Curated confirmed and dubious site records, citations, and image metadata. |
| `app/map-geodata.json` | Simplified geographic reference data for the two map layers. |
| `app/globals.css` | Visual language, responsive layout, map, cards, and accessibility states. |
| `app/plan-explorer.tsx` / `app/plan-explorer.css` | Responsive 3D workbench, controls, source comparison and evidence notes. |
| `app/plan-scene.ts` | On-demand Three.js rendering, shared source/geometry transform, picking and resource cleanup. |
| `app/plan-models/` | Reviewed source-coordinate polygons; only these assets enable 3D. |
| `docs/3d-plans/` | Model eligibility, source provenance, limitations and verification overlays. |
| `public/archive-plates/` | Extracted plans, archive plates, and supporting visual evidence. |
| `next.config.ts` | Static-export configuration for the atlas. |
| `netlify.toml` | Netlify build command, publish directory, and Node runtime. |

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Run the production build with:

```bash
npm run build
npx tsc --noEmit
node --test tests/plan-models.test.mjs
```

The production build pre-renders the atlas as static HTML and assets in `dist/client/`. No server-side application runtime is required.

## Deploying with Netlify

The repository is configured for Git-based Netlify deployment from the `main` branch. `netlify.toml` supplies the required settings:

| Setting | Value |
| --- | --- |
| Base directory | Repository root |
| Build command | `npm run build` |
| Publish directory | `dist/client` |
| Node version | `22.13.0` |

To publish an update:

1. Commit and push changes to `main` on GitHub.
2. Netlify runs the static export automatically.
3. Check the deploy log for a successful `Pre-rendering all routes` step and confirm that `dist/client/index.html` was published.
4. Open the deploy preview, test the map, site selection, image lightbox, and a narrow browser width, then publish the production deploy.

Do not change the publish directory to `dist`: that folder also contains build intermediates. Netlify should publish only `dist/client`.

## Editorial guardrails

- Preserve the distinction between **confirmed** and **dubious** records.
- Do not infer building dimensions, elevations, rooms, or reconstructions that are not documented in the cited evidence.
- A plan image or a confidence label never enables 3D by itself. Add a reviewed source-coordinate asset to the explicit allowlist only after verifying the footprint. Unknown vertical dimensions must stay unknown; uniform relief is a display convention.
- Keep image captions, source credits, and dissertation page references with the visual or claim they support.
- If a coordinate is only a modern locality context, describe it as such rather than presenting it as an excavated bath location.

## Updating the corpus

Start with `app/atlas-data.ts`. Add or revise the record’s citation, evidence summary, coordinates, and any supporting image metadata together. If a new image is added, place it in `public/archive-plates/`, give it useful alt text and a credit, then confirm it opens correctly in the lightbox and remains readable on a narrow screen.
