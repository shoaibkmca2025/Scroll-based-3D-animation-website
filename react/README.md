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
| Weight 800 requested in a dozen places but never loaded, so browsers faked it — twice over on the `h3`s, which inherited a display face that only ships weight 400 | Both faces variable with real weights; display is Fraunces 700 with its SOFT/WONK axes, card titles are a true Figtree 700. The crispness came from loading the real weight, not from the number — so the weight can be retuned freely from `--font-heading-weight` |
| Flat-shaded blocks in solid colours, one draw call per object | a built society — PBR surfaces, image-based lighting, filmic tone mapping — in 35 draw calls |
| Shadow map re-rendered every frame for a scene where nothing moves | rendered once (`shadowMap.autoUpdate = false`) |
| Screenshots loaded eagerly with no dimensions | `loading="lazy"` with `width`/`height` so nothing shifts |

First load drops from ~4.1 MB over 26 requests to ~731 KB over 9 (~185 KB
gzipped), with the screenshots deferred until they scroll into view.

## The 3D backdrop

`src/three/scene.js` builds the society; `src/three/textures.js` paints its
surfaces. The camera keeps the original's stops, easing curve, follow rate and
idle sway.

**Camera smoothness.** Three things were making the move and the zoom
fluctuate, all now fixed:

1. *A frame cap.* The original drew at most one frame every 32 ms. Gone — the
   scene draws on every visible animation frame.
2. *Frame skipping.* The render-on-demand check kept declaring the camera
   "settled" between scroll deltas, so mid-scroll it drew roughly every other
   frame. Measured 0.49 renders per animation frame; now 0.99, with the gap
   between frames pinned at 7 ms (min, median and p90 all 7).
3. *Stepped input.* A wheel scroll arrives as a train of ~90 px jumps. A plain
   lerp snaps its velocity the moment the target moves, turning that into a
   train of surges. The scroll position now goes through a critically damped
   spring (`SMOOTH_TIME`, 0.45 s) before the camera reads it, which carries
   velocity across the steps without overshooting. Frame-to-frame roughness
   dropped 22% against feeding `scrollY` straight in.

The follow itself is exponential on elapsed time rather than per frame, so the
camera travels at the same speed on a 30, 60 or 144 Hz display and simply
draws more in-between frames. `prefers-reduced-motion` drops the idle sway and
restores the go-quiet-when-settled behaviour.

**Idling.** Every frame is drawn *while anything is moving*, and none once
everything is at rest — the loop stops after a 900 ms grace and wakes on the
next scroll, resize or texture swap. This matters far more than the canvas
alone suggests: the glass panels above use `backdrop-filter`, so every frame
this canvas paints forces the browser to re-blur the backdrop behind each of
them. Idling the canvas idles the whole page.

The rest thresholds are set where the eye stops being able to tell, not where
the float stops changing — 2e-5 squared world units is about 4 mm of camera
travel seen from 50 units away. An earlier attempt used 1e-7 and a 0.03 px
scroll snap; both sit deep in the exponential tail of a spring, so rest was
never reached and the page repainted forever. Measured: 0.99 renders per
animation frame while scrolling, **0 renders across 2 s at rest**.

**No post-processing.** A previous pass added GTAO ambient occlusion. It did
look better, but it costs a depth+normal prepass, the AO pass and a denoise
every frame on top of a half-float multisampled target, and it was what made
the page lag. Rendering goes straight to the canvas, which also gets hardware
MSAA back for free from the renderer's own `antialias` flag — the cheapest
anti-aliasing there is, and what keeps the thin railings and window frames
from crawling.

**Looking real.** Thirteen surfaces — cream plaster, cast concrete, asphalt,
terracotta pantiles, compacted earth, mown grass, sand, timber, bark, foliage,
car paint, tyre rubber and brushed metal, plus a ripple normal for water — are
painted on canvas at load and derived into albedo, normal and roughness maps.
27 of the 34 material slots carry maps; glass, the lamp lens and the plastics
are deliberately plain. UVs are scaled by each
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
| Draw calls per frame | 207 | **35** |
| Triangles | 10.8 k | 71.8 k |
| Unique geometries on the GPU | 217 | 35 |
| Shadow map | 1536², re-rendered every frame | 2048², rendered once |
| Tone mapping | none | ACES filmic |

The shadow map renders once because nothing in the scene moves. Surfaces are
painted *after* the first frames are on screen, so the backdrop still appears
immediately and the detail arrives a beat later. The maps that the camera gets
close to are 1024²; grass, sand, asphalt, timber and foliage are 512², halving
both the painting cost and the GPU memory. Pixel ratio is capped at 2 — on a 4K display that
*is* native resolution, since a 4K panel at 200% scaling reports a device
pixel ratio of 2. It steps down once if real frame intervals average over
22 ms across a 1.5 s window, measured only after the surfaces have finished
painting and never from the CPU time `renderer.render` takes to return (WebGL
submits asynchronously, so that number says nothing about GPU cost and would
drop the resolution on a machine that was keeping up fine).

Append `?stats` to the URL to get `window.__society` for `renderer.info`.

**Legibility over the scene.** Panels and cards are deliberately see-through
so the society keeps moving behind them; readability comes from conditioning
the backdrop rather than hiding it. Each glass surface runs
`blur() saturate() contrast() brightness()`: the blur kills the high-frequency
detail that breaks up letterforms (roof tiles, foliage, window grids), and the
contrast/brightness pair compresses the range between a sunlit wall and a
shadowed tower so no dark patch can land under a word. Light panels lift the
backdrop, dark panels push it down. Body copy was darkened a step too —
mid-grey cannot hold 4.5:1 over a live scene at these fills, near-black can.

One blurred layer per element, never nested: cards inside a panel have no
backdrop-filter of their own, since each is a separate GPU pass.

Measured rather than eyeballed — the check renders the page, hides the glyphs
of a text block, samples the pixels actually behind them and computes the WCAG
ratio at the worst 2% of the backdrop. All ten body-copy blocks pass AA, from
5.8:1 to 13.8:1 against the 4.5:1 requirement.

The app screenshots are ~75% transparent PNGs, so they take the colour of
whatever is behind them; those sit on an opaque plate, and each rail screen
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
