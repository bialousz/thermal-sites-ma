# Thermae Thraciae

An interactive, source-led atlas of Roman thermalism in present-day Bulgaria.

**Live atlas:** [thermal-thraciae.netlify.app](https://thermal-thraciae.netlify.app/)

## What this project does

Thermae Thraciae turns the site catalogue in Mariya Avramova’s doctoral dissertation into an explorable research interface. It brings together:

- 16 confirmed thermal-site records, each with catalogued water data, archaeological evidence, cited plans where available, and supporting images.
- 11 **Dubious sites**, kept visibly separate from the confirmed corpus. They are shown as amber dashed locality markers with an evidence note, not as confirmed spas or reconstructions.
- An interactive geographic map with current national borders and an AD 117 Roman provincial reference layer.
- Click-to-expand source imagery and plans, so field photographs, archive plates, and diagrams can be read at full size.

The experience is deliberately evidence-first: a plan is shown as a cited document, never transformed into an unsupported reconstruction.

## Research basis

The primary corpus is:

> Avramova, Mariya. *Thermalism in Roman Thrace (AD 46–395).* Doctoral dissertation, University of Warsaw, 2024.

The dissertation’s own heading, **“Dubious sites”** (printed p. 246), is retained for the separate evidence-status group. Site records include the relevant dissertation and printed page references. The map also credits Natural Earth for present-day borders and GISGILDE / Barrington Atlas for the AD 117 provincial reference.

## Using the atlas

1. Use the map layers to compare modern borders with Roman provincial context.
2. Zoom with the controls or trackpad/mouse wheel; once magnified, drag the map or use arrow keys to pan.
3. Select a marker or catalog tile to open its site record.
4. Click any plan or supporting image to view it in the full-image lightbox.
5. Treat amber dashed markers as reported or uncertain localities, not confirmed thermal sites.

## Project structure

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Atlas interface, map interaction, records, galleries, and lightbox. |
| `app/atlas-data.ts` | Curated confirmed and dubious site records, citations, and image metadata. |
| `app/map-geodata.json` | Simplified geographic reference data for the two map layers. |
| `app/globals.css` | Visual language, responsive layout, map, cards, and accessibility states. |
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
- Keep image captions, source credits, and dissertation page references with the visual or claim they support.
- If a coordinate is only a modern locality context, describe it as such rather than presenting it as an excavated bath location.

## Updating the corpus

Start with `app/atlas-data.ts`. Add or revise the record’s citation, evidence summary, coordinates, and any supporting image metadata together. If a new image is added, place it in `public/archive-plates/`, give it useful alt text and a credit, then confirm it opens correctly in the lightbox and remains readable on a narrow screen.
