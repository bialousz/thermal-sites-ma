# Thermae Thraciae

An interactive, source-led atlas of Roman thermalism in present-day Bulgaria.

**Live atlas:** [thermae-thraciae-atlas.abialousz773445.chatgpt.site](https://thermae-thraciae-atlas.abialousz773445.chatgpt.site)  
The published atlas is private and requires ChatGPT sign-in.

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
| `.openai/hosting.json` | Hosting-project configuration. |

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

## Editorial guardrails

- Preserve the distinction between **confirmed** and **dubious** records.
- Do not infer building dimensions, elevations, rooms, or reconstructions that are not documented in the cited evidence.
- Keep image captions, source credits, and dissertation page references with the visual or claim they support.
- If a coordinate is only a modern locality context, describe it as such rather than presenting it as an excavated bath location.

## Updating the corpus

Start with `app/atlas-data.ts`. Add or revise the record’s citation, evidence summary, coordinates, and any supporting image metadata together. If a new image is added, place it in `public/archive-plates/`, give it useful alt text and a credit, then confirm it opens correctly in the lightbox and remains readable on a narrow screen.
