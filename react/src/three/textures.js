import * as THREE from 'three';

/* Procedurally drawn PBR texture sets — albedo, normal and (where it matters)
   roughness. Everything is painted on a 2D canvas and tiles seamlessly, so the
   scene still ships zero image assets: nothing to download, nothing to cache,
   and the maps scale with the device instead of being baked at one size. */

const clamp = (v, a, c) => (v < a ? a : v > c ? c : v);

function rand(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

/* Draws a blob at (x,y), repeating it across whichever edges it overlaps so the
   texture stays seamless when tiled. */
function wrapped(g, x, y, r, size, paint) {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const px = x + dx * size;
      const py = y + dy * size;
      if (px + r < 0 || px - r > size || py + r < 0 || py - r > size) continue;
      paint(px, py);
    }
  }
}

function blob(g, x, y, r, color, size) {
  wrapped(g, x, y, r, size, (px, py) => {
    const grd = g.createRadialGradient(px, py, 0, px, py, r);
    grd.addColorStop(0, color);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(px, py, r, 0, Math.PI * 2);
    g.fill();
  });
}

function speckle(g, size, count, seed, lo, hi, alpha) {
  const r = rand(seed);
  for (let i = 0; i < count; i++) {
    const v = Math.round(lo + r() * (hi - lo));
    g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (alpha * (0.4 + r() * 0.6)).toFixed(3) + ')';
    g.fillRect(r() * size, r() * size, 1 + Math.round(r() * 1.4), 1 + Math.round(r() * 1.4));
  }
}

/* Height (from luminance) → tangent-space normal map, sampled with wrap so the
   normals tile as cleanly as the albedo. */
function normalMapFrom(data, size, strength) {
  const out = new Uint8ClampedArray(size * size * 4);
  const lum = new Float32Array(size * size);
  for (let i = 0; i < size * size; i++) {
    lum[i] = (data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114) / 255;
  }
  const at = (x, y) => lum[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx =
        at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) -
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1));
      const dy =
        at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) -
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1));
      let nx = dx * strength;
      let ny = dy * strength;
      const nz = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const i = (y * size + x) * 4;
      out[i] = ((nx / len) * 0.5 + 0.5) * 255;
      out[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      out[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      out[i + 3] = 255;
    }
  }
  return out;
}

/* Luminance → roughness, remapped into [lo, hi]. Darker pockets read as rougher. */
function roughMapFrom(data, size, lo, hi) {
  const out = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const l = (data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114) / 255;
    const v = clamp((hi - (hi - lo) * l) * 255, 0, 255);
    out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v;
    out[i * 4 + 3] = 255;
  }
  return out;
}

function toTexture(source, size, colorSpace, aniso) {
  let tex;
  if (source instanceof HTMLCanvasElement) {
    tex = new THREE.CanvasTexture(source);
  } else {
    tex = new THREE.DataTexture(source, size, size, THREE.RGBAFormat);
    tex.needsUpdate = true;
  }
  tex.colorSpace = colorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = aniso;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

/** Paints one surface and derives its maps. `rough` is [lo, hi] or null. */
function surface(draw, { size, aniso, bump = 2, rough = null }) {
  const c = makeCanvas(size);
  const g = c.getContext('2d', { willReadFrequently: true });
  draw(g, size);
  const { data } = g.getImageData(0, 0, size, size);

  const out = {
    map: toTexture(c, size, THREE.SRGBColorSpace, aniso),
    normalMap: toTexture(normalMapFrom(data, size, bump), size, THREE.NoColorSpace, aniso)
  };
  if (rough) out.roughnessMap = toTexture(roughMapFrom(data, size, rough[0], rough[1]), size, THREE.NoColorSpace, aniso);
  return out;
}

// ── the surfaces ──────────────────────────────────────────────────────

const painters = {
  /* Painted cement render — the cream walls.
     Detail here is deliberately high-frequency only. A texture tile covers
     one or two metres, so any large soft blob gets magnified into a
     damp-looking stain the moment the camera comes near a wall; grain
     survives magnification, blotches do not. Every quiet surface below
     follows the same rule. */
  plaster: (g, s) => {
    g.fillStyle = '#f7eeda';
    g.fillRect(0, 0, s, s);
    const r = rand(11);
    for (let i = 0; i < s * 0.5; i++) {
      const t = 244 + Math.round(r() * 10);
      blob(g, r() * s, r() * s, s * (0.008 + r() * 0.022), 'rgba(' + t + ',' + (t - 6) + ',' + (t - 20) + ',0.07)', s);
    }
    speckle(g, s, s * 3, 7, 226, 250, 0.055);
  },

  // Compacted warm earth — the ground the whole society sits on.
  earth: (g, s) => {
    g.fillStyle = '#dacfb8';
    g.fillRect(0, 0, s, s);
    const r = rand(211);
    for (let i = 0; i < s * 1.1; i++) {
      const t = 202 + Math.round(r() * 38);
      blob(g, r() * s, r() * s, s * (0.006 + r() * 0.026), 'rgba(' + t + ',' + (t - 12) + ',' + (t - 32) + ',0.14)', s);
    }
    speckle(g, s, s * 8, 213, 176, 236, 0.13);
  },

  // Cast concrete — slabs, kerbs, parapets, plinths.
  concrete: (g, s) => {
    g.fillStyle = '#d6cec0';
    g.fillRect(0, 0, s, s);
    const r = rand(23);
    for (let i = 0; i < s * 0.9; i++) {
      const t = 196 + Math.round(r() * 40);
      blob(g, r() * s, r() * s, s * (0.005 + r() * 0.02), 'rgba(' + t + ',' + (t - 3) + ',' + (t - 12) + ',0.16)', s);
    }
    speckle(g, s, s * 9, 31, 168, 234, 0.16);
    g.strokeStyle = 'rgba(150,144,132,0.16)';
    g.lineWidth = Math.max(1, s / 900);
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      let x = r() * s;
      let y = r() * s;
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (r() - 0.5) * s * 0.12;
        y += (r() - 0.5) * s * 0.12;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  },

  // Asphalt — the ring drive and parking apron.
  asphalt: (g, s) => {
    g.fillStyle = '#6b665e';
    g.fillRect(0, 0, s, s);
    const r = rand(47);
    for (let i = 0; i < s * 0.9; i++) {
      const t = 92 + Math.round(r() * 38);
      blob(g, r() * s, r() * s, s * (0.004 + r() * 0.016), 'rgba(' + t + ',' + t + ',' + (t - 4) + ',0.2)', s);
    }
    speckle(g, s, s * 22, 53, 70, 190, 0.3);
  },

  // Mown lawn.
  grass: (g, s) => {
    g.fillStyle = '#87965f';
    g.fillRect(0, 0, s, s);
    const r = rand(67);
    for (let i = 0; i < s * 1.4; i++) {
      const t = 108 + Math.round(r() * 40);
      blob(g, r() * s, r() * s, s * (0.006 + r() * 0.02), 'rgba(' + (t - 10) + ',' + (t + 18) + ',' + (t - 36) + ',0.16)', s);
    }
    g.lineWidth = Math.max(1, s / 640);
    for (let i = 0; i < s * 12; i++) {
      const x = r() * s;
      const y = r() * s;
      const a = r() * Math.PI * 2;
      const l = s * (0.004 + r() * 0.012);
      const t = 90 + Math.round(r() * 70);
      g.strokeStyle = 'rgba(' + (t - 26) + ',' + (t + 18) + ',' + (t - 46) + ',0.5)';
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
  },

  // Sand — the play pit and the garden walk.
  sand: (g, s) => {
    g.fillStyle = '#ddc79c';
    g.fillRect(0, 0, s, s);
    const r = rand(83);
    for (let i = 0; i < s * 0.9; i++) {
      const t = 206 + Math.round(r() * 36);
      blob(g, r() * s, r() * s, s * (0.005 + r() * 0.018), 'rgba(' + t + ',' + (t - 20) + ',' + (t - 58) + ',0.16)', s);
    }
    speckle(g, s, s * 14, 89, 150, 245, 0.22);
  },

  // Terracotta pantiles — rows of barrel tiles, the strongest normal detail.
  tiles: (g, s) => {
    g.fillStyle = '#8f4a24';
    g.fillRect(0, 0, s, s);
    const r = rand(101);
    const rows = 8;
    const cols = 10;
    const rh = s / rows;
    const cw = s / cols;
    for (let y = 0; y < rows; y++) {
      for (let x = -1; x <= cols; x++) {
        const ox = x * cw + (y % 2 ? cw * 0.5 : 0);
        const oy = y * rh;
        const tone = 150 + Math.round(r() * 60);
        const grd = g.createLinearGradient(ox, 0, ox + cw, 0);
        grd.addColorStop(0, 'rgb(' + Math.round(tone * 0.62) + ',' + Math.round(tone * 0.36) + ',' + Math.round(tone * 0.24) + ')');
        grd.addColorStop(0.45, 'rgb(' + tone + ',' + Math.round(tone * 0.55) + ',' + Math.round(tone * 0.34) + ')');
        grd.addColorStop(1, 'rgb(' + Math.round(tone * 0.55) + ',' + Math.round(tone * 0.32) + ',' + Math.round(tone * 0.22) + ')');
        g.fillStyle = grd;
        g.beginPath();
        g.roundRect(ox + cw * 0.04, oy + rh * 0.06, cw * 0.92, rh * 1.02, [cw * 0.42, cw * 0.42, 0, 0]);
        g.fill();
      }
    }
    speckle(g, s, s * 4, 103, 90, 200, 0.14);
  },

  // Timber — benches and the play frame.
  wood: (g, s) => {
    g.fillStyle = '#6a5a45';
    g.fillRect(0, 0, s, s);
    const r = rand(127);
    g.lineWidth = Math.max(1, s / 380);
    for (let i = 0; i < s * 0.5; i++) {
      const y = r() * s;
      const t = 78 + Math.round(r() * 58);
      g.strokeStyle = 'rgba(' + t + ',' + Math.round(t * 0.82) + ',' + Math.round(t * 0.62) + ',0.55)';
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= s; x += s / 12) g.lineTo(x, y + Math.sin(x / s * Math.PI * 2 + i) * s * 0.01);
      g.stroke();
    }
    speckle(g, s, s * 2, 131, 70, 170, 0.12);
  },

  /* Car body paint. Painted near-white so each car's colour can tint it —
     the character is in the metallic flake and the faint orange-peel of a
     sprayed clearcoat. */
  carPaint: (g, s) => {
    g.fillStyle = '#f2f0ed';
    g.fillRect(0, 0, s, s);
    const r = rand(307);
    for (let i = 0; i < s * 0.6; i++) {
      const t = 236 + Math.round(r() * 18);
      blob(g, r() * s, r() * s, s * (0.01 + r() * 0.035), 'rgba(' + t + ',' + t + ',' + t + ',0.1)', s);
    }
    speckle(g, s, s * 12, 311, 200, 255, 0.1);
  },

  // Tyre rubber with a circumferential tread.
  tyre: (g, s) => {
    g.fillStyle = '#22201e';
    g.fillRect(0, 0, s, s);
    const r = rand(331);
    const rows = 18;
    for (let i = 0; i < rows; i++) {
      const y = (i / rows) * s;
      g.fillStyle = 'rgba(' + (52 + Math.round(r() * 26)) + ',' + (50 + Math.round(r() * 24)) + ',' + (48 + Math.round(r() * 22)) + ',0.85)';
      g.fillRect(0, y, s, s / rows * 0.52);
      for (let k = 0; k < 26; k++) {
        g.fillStyle = 'rgba(14,13,12,0.9)';
        g.fillRect((k / 26) * s + (i % 2 ? s / 52 : 0), y, s / 90, (s / rows) * 0.52);
      }
    }
    speckle(g, s, s * 3, 337, 20, 90, 0.3);
  },

  // Brushed metal for railings, poles and lamp arms.
  metal: (g, s) => {
    // Neutral grey on purpose — a warm base plus the sun's warm key reads as
    // brass on poles and wheel hubs.
    g.fillStyle = '#b7b7b4';
    g.fillRect(0, 0, s, s);
    const r = rand(353);
    g.lineWidth = 1;
    for (let i = 0; i < s * 6; i++) {
      const y = r() * s;
      const t = 140 + Math.round(r() * 90);
      g.strokeStyle = 'rgba(' + t + ',' + t + ',' + (t - 8) + ',0.16)';
      const x = r() * s;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + s * (0.05 + r() * 0.3), y);
      g.stroke();
    }
  },

  /* Still water. Only the normal map really matters here — the interference
     of a dozen ring sets gives the surface something for the sky to break up
     on, without anything actually moving. */
  water: (g, s) => {
    g.fillStyle = '#7f7f7f';
    g.fillRect(0, 0, s, s);
    const r = rand(373);
    g.lineWidth = Math.max(1, s / 320);
    for (let c = 0; c < 14; c++) {
      const cx = r() * s;
      const cy = r() * s;
      const rings = 8 + Math.floor(r() * 12);
      const step = s * (0.012 + r() * 0.02);
      for (let i = 1; i <= rings; i++) {
        const a = 0.16 * (1 - i / rings);
        g.strokeStyle = 'rgba(' + (i % 2 ? 220 : 40) + ',' + (i % 2 ? 220 : 40) + ',' + (i % 2 ? 220 : 40) + ',' + a.toFixed(3) + ')';
        wrapped(g, cx, cy, i * step, s, (px, py) => {
          g.beginPath();
          g.arc(px, py, i * step, 0, Math.PI * 2);
          g.stroke();
        });
      }
    }
  },

  // Foliage.
  leaf: (g, s) => {
    g.fillStyle = '#5f7345';
    g.fillRect(0, 0, s, s);
    const r = rand(149);
    for (let i = 0; i < s * 2.2; i++) {
      const t = 80 + Math.round(r() * 70);
      blob(g, r() * s, r() * s, s * (0.008 + r() * 0.03), 'rgba(' + (t - 18) + ',' + (t + 26) + ',' + (t - 44) + ',0.55)', s);
    }
  }
};

const yieldToPage = () => new Promise((r) => setTimeout(r, 0));

/**
 * Builds every surface. Yields between them so a mid-scroll page never janks
 * while the maps are being painted.
 *
 * `size` is per-map resolution. 1024² across 8 surfaces is ~80 MB of GPU
 * memory; 4096² would be ~1.3 GB, which is why detail comes from tiling these
 * at a high repeat rather than from one enormous map.
 */
export async function buildSurfaces({ size = 1024, aniso = 8 } = {}) {
  const out = {};
  // `detail` scales each surface's resolution. The walls, ground and roofs get
  // the full map because the camera comes close to them; grass, sand and
  // foliage are only ever seen at a distance or in small pieces, and halving
  // those cuts total painting work and GPU memory by roughly half for no
  // visible difference.
  const opts = {
    plaster: { bump: 0.5, detail: 1 },
    earth: { bump: 1.6, rough: [0.88, 1.0], detail: 1 },
    concrete: { bump: 2.2, rough: [0.72, 0.98], detail: 1 },
    tiles: { bump: 4.0, rough: [0.5, 0.85], detail: 1 },
    carPaint: { bump: 0.35, detail: 0.5 },
    asphalt: { bump: 2.6, rough: [0.78, 0.99], detail: 0.5 },
    grass: { bump: 2.8, rough: [0.85, 1.0], detail: 0.5 },
    sand: { bump: 2.0, rough: [0.9, 1.0], detail: 0.5 },
    wood: { bump: 1.8, rough: [0.6, 0.92], detail: 0.5 },
    tyre: { bump: 3.2, rough: [0.72, 0.95], detail: 0.5 },
    metal: { bump: 0.8, rough: [0.2, 0.55], detail: 0.5 },
    water: { bump: 1.1, detail: 0.5 },
    leaf: { bump: 2.4, detail: 0.5 }
  };
  for (const [name, draw] of Object.entries(painters)) {
    const { detail, ...rest } = opts[name];
    out[name] = surface(draw, { size: Math.round(size * detail), aniso, ...rest });
    await yieldToPage();
  }
  return out;
}

export function disposeSurfaces(surfaces) {
  Object.values(surfaces).forEach((s) => Object.values(s).forEach((t) => t.dispose()));
}
