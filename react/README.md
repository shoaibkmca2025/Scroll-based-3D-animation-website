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
| `society3d.js` built six procedural noise textures on every load and assigned them to nothing | removed |
| Shadow map re-rendered every frame for a scene where nothing moves | rendered once (`shadowMap.autoUpdate = false`) |
| Screenshots loaded eagerly with no dimensions | `loading="lazy"` with `width`/`height` so nothing shifts |

First load drops from ~4.1 MB over 26 requests to ~731 KB over 9 (~185 KB
gzipped), with the screenshots deferred until they scroll into view.

## Layout

```
index.html            fonts + root
src/main.jsx          mount
src/App.jsx           page composition
src/data.js           all copy
src/sections/*        one component per section
src/components/       Society3D — loads the three.js chunk on mount
src/three/scene.js    the model, lighting and scroll-driven camera
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
