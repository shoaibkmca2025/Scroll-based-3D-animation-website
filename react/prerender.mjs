// Puts the rendered page into dist/index.html, so the first paint is the page
// itself instead of an empty #root waiting for the JavaScript to download and
// run (measured: ~1.8s of blank screen on a mid-range phone). React then
// hydrates the markup rather than building it from nothing.
import fs from 'node:fs';

const { render } = await import('./dist-ssr/entry-server.js');
const file = 'dist/index.html';
const html = fs.readFileSync(file, 'utf8');
let out = html.replace('<div id="root"></div>', `<div id="root">${render()}</div>`);
if (out === html) throw new Error('prerender: <div id="root"></div> not found in dist/index.html');
// The stylesheet goes inline too: it was the one request standing between
// the HTML arriving and anything being drawn.
const linked = out;
out = out.replace(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/, (_, css) => `<style>${fs.readFileSync(`dist/${css}`, 'utf8')}</style>`);
if (out === linked) throw new Error('prerender: stylesheet <link> not found in dist/index.html');
fs.writeFileSync(file, out);
fs.rmSync('dist-ssr', { recursive: true, force: true });
console.log(`prerender: wrote ${Math.round(out.length / 1024)} KB of HTML`);
