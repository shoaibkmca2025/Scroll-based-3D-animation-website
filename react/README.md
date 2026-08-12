# ClearNest — React port

A React + Vite rebuild of `ClearNest Website.dc.html`. The rendered page is
unchanged: same layout, type, colours, scroll reveals, progress bar, screens
rail and 3D society backdrop. Only the code underneath is different.

## Run it

Easiest: double-click `start.cmd` in the parent folder. It installs if needed
and opens the browser.

Or from a terminal — this works from the project root **or** from `react/`:

```bash
npm run dev      # http://localhost:5173
npm run build    # → react/dist/
npm run preview  # serve the build
```

Note: you cannot open `index.html` (or `dist/index.html`) by double-clicking
it. Browsers block ES modules over `file://`, so the page comes up blank. It
has to be served — that is what the commands above do.

## What changed

| Before | After |
| --- | --- |
| `support.js` (69 KB) parsed the HTML template and compiled it to React in the browser, pulling React + ReactDOM off unpkg at runtime | Real React components, compiled at build time |
| 48 KB of HTML, almost all of it repeated inline `style` attributes | JSX + one stylesheet of reusable classes |
| Copy hard-coded into `sc-for` template loops | `src/data.js` |
| three.js fetched unminified from unpkg (2.0 MB) | bundled, minified, split into its own chunk and imported on mount |
| The full 10.8 KB design-system stylesheet, of which only the tokens were used (the page has no `class` attributes) | `src/styles/tokens.css` — tokens plus the element defaults the page actually depends on |
| Flat-shaded blocks in solid colours, one draw call per object | a built society — PBR surfaces, image-based lighting, filmic tone mapping — in 33 draw calls |
| Shadow map re-rendered every frame for a scene where nothing moves | rendered once (`shadowMap.autoUpdate = false`) |
| Screenshots loaded eagerly with no dimensions | `loading="lazy"` with `width`/`height` so nothing shifts |

First load drops from ~4.1 MB over 26 requests to ~731 KB over 9 (~185 KB
gzipped), with the screenshots deferred until they scroll into view.

## The 3D backdrop

`src/three/scene.js` builds the society; `src/three/textures.js` paints its
surfaces. The camera is untouched from the original — same stops, same easing,
same lerp rate, same idle sway, same 32 ms throttle and render-on-demand — so
the scroll animation behaves exactly as before. Everything else was rebuilt.

**Looking real.** Cream plaster, cast concrete, asphalt, terracotta pantiles,
compacted earth, mown grass, timber and foliage are painted on canvas at load
and derived into albedo, normal and roughness maps. UVs are scaled by each
piece's real dimensions, so one texture tile covers a fixed number of metres
whether it lands on a 9 m wall or a 1 m sill. Lighting is a filmic (ACES) pass
over a sun, a weak sky fill and image-based light generated from the sky
itself, which is what puts real reflections in the glass, water and metal. The
model gained window frames, sills and shading hoods, balconies with railings,
floor bands, parapets, stair headroom, entrance canopies, kerbs, footpaths,
wall plinths and coping, roof tiles, hedges and far more planting.

**Staying fast.** Static geometry is merged per material and repeated parts
(238 windows, their frames, balconies, railings, AC units, trees, hedges,
lamps) are instanced:

| | before | after |
| --- | --- | --- |
| Draw calls per frame | 207 | **33** |
| Triangles | 10.8 k | 44.8 k |
| Unique geometries on the GPU | 217 | 33 |
| Shadow map | 1536², re-rendered every frame | 2048², rendered once |
| Tone mapping | none | ACES filmic |

The shadow map renders once because nothing in the scene moves. Surfaces are
painted *after* the first frames are on screen, so the backdrop still appears
immediately and the detail arrives a beat later. The maps that the camera gets
close to are 1024²; grass, sand, asphalt, timber and foliage are 512², halving
both the painting cost and the GPU memory. Pixel ratio is capped at 2 and steps
down automatically if the first 45 rendered frames average over 20 ms.

Append `?stats` to the URL to get `window.__society` for `renderer.info`.

**Legibility over the scene.** The app screenshots are ~75% transparent PNGs,
so they take the colour of whatever is behind them — over a detailed backdrop
that means towers and tree canopies showing through the UI. Every screenshot
now sits on a plate, the three audience cards and the screens rail carry
enough fill (plus a backdrop blur) to hold their text, and each rail screen
rides on its own card so its caption no longer lands on a tree.

Note on "4K": detail comes from tiling these maps at roughly one tile per
metre, not from one enormous image. A literal 4096² set across nine surfaces
would be about 1.3 GB of GPU memory for no visible gain at these camera
distances.

## Layout

```
index.html            fonts + root
src/main.jsx          mount
src/App.jsx           page composition
src/data.js           all copy
src/sections/*        one component per section
src/components/       Society3D — loads the three.js chunk on mount
src/three/scene.js    the model, lighting and scroll-driven camera
src/three/textures.js procedurally painted PBR surfaces
src/hooks/            scroll reveals, progress bar, rail
src/styles/           design tokens, page styles
public/screens/       app screenshots
```

## Fidelity check

Both versions were rendered at 1440×900 and compared: identical document
height (10979 px) and identical position, size, font and colour on every
matched text element. The only measured differences come from the old runtime
wrapping interpolated text in inline `<span>`s, so the probe measured an inline
box there and a block box here.
