import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildSurfaces, disposeSurfaces } from './textures.js';

/* The society behind the page.
   The camera — its stops, easing, lerp rate, idle sway and frame throttle — is
   unchanged from the original society3d.js. What changed is the model it looks
   at: textured PBR surfaces, image-based lighting, filmic tone mapping and a
   lot more built detail, all batched down to a couple of dozen draw calls. */

const TAU = Math.PI * 2;

// ── camera stops, keyed by the `data-cam` attribute on each section ──
const STOPS = {
  wide:      { p: [52, 36, 72], t: [-18, 10, -6], f: 34 },
  approach:  { p: [10, 9, 56], t: [0, 6, 20], f: 32 },
  gate:      { p: [3, 3.2, 43], t: [0, 3.2, 33], f: 40 },
  notice:    { p: [11.5, 3.6, 33], t: [7.5, 2.4, 27], f: 38 },
  towers:    { p: [26, 15, 22], t: [0, 12, -10], f: 30 },
  garden:    { p: [-31, 6.5, 23], t: [-24, 2, 8], f: 34 },
  play:      { p: [35, 7.5, 21], t: [25, 1.8, 7], f: 32 },
  roof:      { p: [11, 39, 6], t: [0, 27, -18], f: 30 },
  parking:   { p: [-15, 7, 29], t: [0, 1.4, 14], f: 36 },
  clubhouse: { p: [-38, 8.5, 5], t: [-25, 3, -15], f: 30 },
  pool:      { p: [-39, 13, -33], t: [-25, 1, -27], f: 32 },
  hall:      { p: [40, 10.5, -3], t: [25, 4, -17], f: 30 },
  dusk:      { p: [-48, 26, 50], t: [10, 9, -6], f: 36 }
};

// ── geometry helpers ──────────────────────────────────────────────────
// UVs are scaled by real dimensions so one texture tile covers a fixed number
// of world units on every surface — without this a 9 m wall and a 1 m sill
// would each stretch one tile across their whole face.

function boxGeo(w, h, d, uvs = 0.34) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const face = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * face[f][0] * uvs, uv.getY(k) * face[f][1] * uvs);
    }
  }
  return g;
}

function cylGeo(rt, rb, h, seg = 20, uvs = 0.34) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  const uv = g.attributes.uv;
  const circ = Math.max(rt, rb) * TAU;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ * uvs, uv.getY(i) * h * uvs);
  return g;
}

/** Ground pieces are built in XY and laid flat, so UVs come straight off x/y. */
function flatGeo(g, uvs) {
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) * uvs, p.getY(i) * uvs);
  return g;
}

const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

function TRS(x, y, z, rx = 0, ry = 0, rz = 0, s = 1) {
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(s, s, s));
}

/** Collects static geometry per material and merges each bucket into one mesh. */
function createBatch() {
  const buckets = new Map();
  return {
    add(geo, mat, m) {
      const g = geo.clone();
      if (m) g.applyMatrix4(m);
      let list = buckets.get(mat);
      if (!list) buckets.set(mat, (list = []));
      list.push(g);
    },
    flush(parent) {
      for (const [mat, list] of buckets) {
        const merged = mergeGeometries(list, false);
        const mesh = new THREE.Mesh(merged, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.name = 'batch-' + (mat.name || 'surface');
        parent.add(mesh);
      }
      buckets.clear();
    }
  };
}

function instanced(geo, mat, matrices, name) {
  const im = new THREE.InstancedMesh(geo, mat, matrices.length);
  matrices.forEach((m, i) => im.setMatrixAt(i, m));
  im.instanceMatrix.needsUpdate = true;
  im.castShadow = true;
  im.receiveShadow = true;
  im.name = name;
  return im;
}

// ── sky ───────────────────────────────────────────────────────────────

function skyTexture() {
  const W = 2048;
  const H = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');

  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0.0, '#2c5f96');
  sky.addColorStop(0.3, '#6fa3cc');
  sky.addColorStop(0.5, '#bcd4e6');
  sky.addColorStop(0.58, '#e9e2d4');
  sky.addColorStop(0.62, '#d3c3a6');
  sky.addColorStop(1.0, '#9b8d76');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  const sun = g.createRadialGradient(W * 0.24, H * 0.22, 0, W * 0.24, H * 0.22, H * 0.55);
  sun.addColorStop(0, 'rgba(255,250,232,1)');
  sun.addColorStop(0.12, 'rgba(255,243,214,0.55)');
  sun.addColorStop(1, 'rgba(255,238,205,0)');
  g.fillStyle = sun;
  g.fillRect(0, 0, W, H);

  // layered cumulus: a few soft masses each built from overlapping puffs
  let seed = 5;
  const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 26; i++) {
    const cx = r() * W;
    const cy = H * (0.05 + r() * 0.36);
    const spread = 90 + r() * 320;
    const puffs = 6 + Math.floor(r() * 10);
    for (let k = 0; k < puffs; k++) {
      const x = cx + (r() - 0.5) * spread;
      const y = cy + (r() - 0.5) * spread * 0.22;
      const rad = spread * (0.12 + r() * 0.22);
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      const a = 0.1 + r() * 0.3;
      grd.addColorStop(0, 'rgba(255,255,255,' + a.toFixed(3) + ')');
      grd.addColorStop(0.55, 'rgba(250,248,244,' + (a * 0.5).toFixed(3) + ')');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.save();
      g.translate(x, y);
      g.scale(1, 0.52);
      g.beginPath();
      g.arc(0, 0, rad, 0, TAU);
      g.fill();
      g.restore();
    }
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

// ── materials ─────────────────────────────────────────────────────────

function createMaterials() {
  // Matte surfaces take only a little of the sky's image-based light — at full
  // strength the blue environment cools the whole society out of the warm
  // palette the page is built on.
  const std = (name, opts) => new THREE.MeshStandardMaterial({ name, envMapIntensity: 0.5, ...opts });
  return {
    plaster: std('plaster', { color: 0xf7eeda, roughness: 0.9 }),
    plasterWarm: std('plaster-warm', { color: 0xeddcc0, roughness: 0.9 }),
    earth: std('earth', { color: 0xdacfb8, roughness: 0.97 }),
    concrete: std('concrete', { color: 0xd6cec0, roughness: 0.94 }),
    asphalt: std('asphalt', { color: 0x736d64, roughness: 0.95 }),
    grass: std('grass', { color: 0x7d9057, roughness: 0.98 }),
    sand: std('sand', { color: 0xe0cba1, roughness: 0.99 }),
    tiles: std('roof-tiles', { color: 0xa8552a, roughness: 0.72 }),
    trim: std('terracotta', { color: 0xc67139, roughness: 0.6 }),
    deep: std('clay-dark', { color: 0x8c491a, roughness: 0.64 }),
    wood: std('timber', { color: 0x6a5a45, roughness: 0.8 }),
    leaf: std('foliage', { color: 0x5f7345, roughness: 0.94, flatShading: true }),
    glass: std('glazing', { color: 0x14222c, roughness: 0.07, metalness: 0.05, envMapIntensity: 2.2 }),
    metal: std('metal', { color: 0xa9a396, roughness: 0.34, metalness: 0.88, envMapIntensity: 1.7 }),
    water: std('water', { color: 0x2f6a80, roughness: 0.05, metalness: 0.15, envMapIntensity: 2.4 }),
    red: std('signal-red', { color: 0xa72608, roughness: 0.42 }),
    white: std('paint-white', { color: 0xece7dc, roughness: 0.5 }),
    lamp: std('lamp-lens', { color: 0xfff4dc, roughness: 0.3, emissive: 0xffe6b0, emissiveIntensity: 0.35 })
  };
}

/** Swaps the painted maps in once they exist. Colours go white so the map is
    not tinted twice. */
function applySurfaces(M, S) {
  const put = (mat, set, { normal = 1, tint = 0xffffff, rough } = {}) => {
    mat.map = set.map;
    mat.normalMap = set.normalMap;
    mat.normalScale.set(normal, normal);
    if (set.roughnessMap) mat.roughnessMap = set.roughnessMap;
    if (rough !== undefined) mat.roughness = rough;
    mat.color.setHex(tint);
    mat.needsUpdate = true;
  };
  put(M.plaster, S.plaster, { normal: 0.35, tint: 0xfffaf0 });
  put(M.plasterWarm, S.plaster, { normal: 0.35, tint: 0xe8d5b4 });
  put(M.earth, S.earth, { normal: 0.6 });
  put(M.concrete, S.concrete, { normal: 0.7, tint: 0xf2ece0 });
  put(M.asphalt, S.asphalt, { normal: 0.7 });
  put(M.grass, S.grass, { normal: 0.9 });
  put(M.sand, S.sand, { normal: 0.7 });
  put(M.tiles, S.tiles, { normal: 1.2 });
  put(M.trim, S.tiles, { normal: 0.8, tint: 0xe4a273, rough: 0.66 });
  put(M.deep, S.concrete, { normal: 0.5, tint: 0x7d4118 });
  put(M.wood, S.wood, { normal: 0.8 });
  put(M.leaf, S.leaf, { normal: 0.9 });
  put(M.white, S.plaster, { normal: 0.3, tint: 0xe6e1d6 });
}

// ── the model ─────────────────────────────────────────────────────────

function buildWorld(M) {
  const world = new THREE.Group();
  world.name = 'society';
  const B = createBatch();

  // shared sub-assemblies, instanced rather than merged
  const windows = [];
  const frames = [];
  const balconies = [];
  const rails = [];
  const acs = [];
  const trunks = [];
  const canopies = [];
  const hedges = [];
  const lampPoles = [];
  const lampHeads = [];
  const lampLenses = [];

  // ── ground plane, drive and paths ──
  B.add(flatGeo(new THREE.CircleGeometry(78, 72), 0.09), M.earth, TRS(0, 0, 0, -Math.PI / 2));

  // lawn inside the ring drive, and green verges outside the boundary
  B.add(flatGeo(new THREE.CircleGeometry(16, 56), 0.14), M.grass, TRS(0, 0.012, 0, -Math.PI / 2));
  B.add(flatGeo(new THREE.RingGeometry(34, 52, 72), 0.1), M.grass, TRS(0, 0.012, 0, -Math.PI / 2));

  B.add(flatGeo(new THREE.RingGeometry(17, 21, 72), 0.16), M.asphalt, TRS(0, 0.02, 0, -Math.PI / 2));
  B.add(boxGeo(5, 0.04, 16, 0.16), M.asphalt, TRS(0, 0.02, 26));
  // centre line down the entry road
  B.add(boxGeo(0.16, 0.02, 1.4, 0.6), M.white, TRS(0, 0.05, 20));
  B.add(boxGeo(0.16, 0.02, 1.4, 0.6), M.white, TRS(0, 0.05, 23));
  B.add(boxGeo(0.16, 0.02, 1.4, 0.6), M.white, TRS(0, 0.05, 26));

  // kerbs
  B.add(flatGeo(new THREE.RingGeometry(21, 21.5, 72), 0.5), M.concrete, TRS(0, 0.09, 0, -Math.PI / 2));
  B.add(flatGeo(new THREE.RingGeometry(16.5, 17, 72), 0.5), M.concrete, TRS(0, 0.09, 0, -Math.PI / 2));
  // footpath just inside the boundary
  B.add(flatGeo(new THREE.RingGeometry(29.6, 31.2, 72), 0.55), M.concrete, TRS(0, 0.06, 0, -Math.PI / 2));

  // ── boundary wall: plinth, panels, piers, coping ──
  {
    const N = 64;
    const r = 33;
    const panel = boxGeo(3.35, 1.55, 0.42, 0.42);
    const plinth = boxGeo(3.42, 0.45, 0.56, 0.42);
    const coping = boxGeo(3.45, 0.16, 0.58, 0.5);
    const pier = boxGeo(0.72, 2.35, 0.72, 0.5);
    const pierCap = boxGeo(0.9, 0.18, 0.9, 0.6);
    for (let a = 0; a < N; a++) {
      const th = (a / N) * TAU;
      if (Math.abs(th - Math.PI / 2) < 0.16) continue;
      B.add(plinth, M.concrete, TRS(Math.cos(th) * r, 0.22, Math.sin(th) * r, 0, -th + Math.PI / 2, 0));
      B.add(panel, M.plasterWarm, TRS(Math.cos(th) * r, 1.22, Math.sin(th) * r, 0, -th + Math.PI / 2, 0));
      B.add(coping, M.concrete, TRS(Math.cos(th) * r, 2.06, Math.sin(th) * r, 0, -th + Math.PI / 2, 0));
      if (a % 4 === 0) {
        const th2 = ((a + 0.5) / N) * TAU;
        B.add(pier, M.plaster, TRS(Math.cos(th2) * r, 1.18, Math.sin(th2) * r, 0, -th2 + Math.PI / 2, 0));
        B.add(pierCap, M.trim, TRS(Math.cos(th2) * r, 2.4, Math.sin(th2) * r, 0, -th2 + Math.PI / 2, 0));
      }
    }
  }

  // ── the gate ──
  {
    const gx = 0;
    const gz = 33;
    const pillar = boxGeo(1.5, 5.2, 1.5, 0.6);
    const cap = boxGeo(1.9, 0.55, 1.9, 0.5);
    const capTop = boxGeo(1.2, 0.35, 1.2, 0.5);
    [-4.4, 4.4].forEach((dx) => {
      B.add(pillar, M.plaster, TRS(gx + dx, 2.6, gz));
      B.add(cap, M.trim, TRS(gx + dx, 5.4, gz));
      B.add(capTop, M.tiles, TRS(gx + dx, 5.78, gz));
    });
    B.add(boxGeo(10.6, 1.2, 0.6, 0.6), M.deep, TRS(gx, 5.9, gz));
    B.add(boxGeo(8.4, 0.62, 0.14, 0.6), M.plaster, TRS(gx, 5.9, gz + 0.34));
    B.add(boxGeo(10.9, 0.28, 0.9, 0.5), M.tiles, TRS(gx, 6.62, gz));

    // boom barrier with a striped sleeve
    B.add(cylGeo(0.28, 0.32, 1.5, 16, 0.5), M.metal, TRS(gx - 0.4, 0.75, gz + 1.6));
    B.add(boxGeo(0.42, 0.5, 0.42, 0.6), M.white, TRS(gx - 0.4, 1.6, gz + 1.6));
    const boom = boxGeo(7.6, 0.24, 0.24, 0.7);
    B.add(boom, M.red, TRS(gx + 3.4, 1.62, gz + 1.6, 0, 0, -0.05));
    for (let i = 0; i < 4; i++) {
      B.add(boxGeo(0.62, 0.26, 0.26, 0.7), M.white, TRS(gx + 0.5 + i * 1.9, 1.62 + (0.5 + i * 1.9 - 3.4) * -0.05, gz + 1.6, 0, 0, -0.05));
    }

    // guard cabin
    const cx = gx - 7.6;
    const cz = gz + 1.4;
    B.add(boxGeo(3.6, 0.16, 3.2, 0.6), M.concrete, TRS(cx, 0.08, cz));
    B.add(boxGeo(3.4, 3.0, 3.0, 0.6), M.plaster, TRS(cx, 1.6, cz));
    B.add(boxGeo(3.95, 0.3, 3.55, 0.5), M.tiles, TRS(cx, 3.2, cz));
    B.add(boxGeo(4.15, 0.16, 3.75, 0.5), M.trim, TRS(cx, 3.42, cz));
    B.add(boxGeo(2.4, 1.2, 0.1, 0.6), M.glass, TRS(cx, 1.95, cz + 1.53));
    B.add(boxGeo(2.6, 0.1, 0.16, 0.7), M.white, TRS(cx, 1.3, cz + 1.55));
    B.add(boxGeo(2.6, 0.1, 0.16, 0.7), M.white, TRS(cx, 2.6, cz + 1.55));
    B.add(boxGeo(0.9, 2.1, 0.1, 0.5), M.wood, TRS(cx - 1.74, 1.05, cz, 0, Math.PI / 2, 0));
  }

  // ── towers ──
  const towerSpecs = [
    { w: 9, d: 9, floors: 7, x: -11, z: -7 },
    { w: 9, d: 9, floors: 9, x: 11, z: -7 },
    { w: 10.5, d: 10.5, floors: 11, x: 0, z: -20 }
  ];

  const winGlass = boxGeo(1.16, 1.02, 0.07, 0.7);
  const winFrame = mergeGeometries([
    boxGeo(1.34, 0.09, 0.16, 0.9).translate(0, 0.56, 0.03),
    boxGeo(1.34, 0.09, 0.16, 0.9).translate(0, -0.56, 0.03),
    boxGeo(0.09, 1.12, 0.16, 0.9).translate(-0.63, 0, 0.03),
    boxGeo(0.09, 1.12, 0.16, 0.9).translate(0.63, 0, 0.03),
    boxGeo(0.07, 1.06, 0.1, 0.9).translate(0, 0, 0.02),
    boxGeo(1.5, 0.1, 0.34, 0.8).translate(0, -0.62, 0.1),
    boxGeo(1.62, 0.12, 0.46, 0.8).translate(0, 0.74, 0.14)
  ], false);
  const balconySlab = mergeGeometries([
    boxGeo(3.8, 0.16, 1.25, 0.6).translate(0, 0, 0),
    boxGeo(3.8, 0.1, 0.14, 0.6).translate(0, 0.12, 0.62)
  ], false);
  const balconyRail = mergeGeometries([
    boxGeo(3.8, 0.07, 0.07, 0.9).translate(0, 0.9, 0.6),
    boxGeo(3.8, 0.05, 0.05, 0.9).translate(0, 0.52, 0.6),
    boxGeo(0.07, 0.95, 0.07, 0.9).translate(-1.86, 0.47, 0.6),
    boxGeo(0.07, 0.95, 0.07, 0.9).translate(1.86, 0.47, 0.6),
    boxGeo(0.07, 0.95, 0.07, 0.9).translate(0, 0.47, 0.6)
  ], false);
  const acUnit = mergeGeometries([
    boxGeo(0.8, 0.52, 0.4, 0.9),
    boxGeo(0.66, 0.4, 0.05, 1.2).translate(0, 0, 0.21)
  ], false);

  towerSpecs.forEach((t) => {
    const { w, d, floors, x, z } = t;
    const fh = 2.6;
    const h = floors * fh;

    B.add(boxGeo(w + 1.6, 0.3, d + 1.6, 0.55), M.concrete, TRS(x, 0.15, z)); // plinth
    B.add(boxGeo(w, h, d, 0.55), M.plaster, TRS(x, h / 2, z)); // shell
    B.add(boxGeo(w * 0.34, h, 0.42, 0.55), M.deep, TRS(x - w * 0.24, h / 2, z + d / 2 + 0.02)); // accent stripe
    B.add(boxGeo(w + 0.5, 0.34, d + 0.5, 0.6), M.trim, TRS(x, h + 0.17, z)); // cornice
    B.add(boxGeo(w + 0.2, 0.55, d + 0.2, 0.6), M.concrete, TRS(x, h + 0.62, z)); // parapet
    B.add(boxGeo(w - 0.9, 0.5, d - 0.9, 0.6), M.concrete, TRS(x, h + 0.62, z)); // parapet inner face
    B.add(boxGeo(2.6, 2.2, 2.6, 0.6), M.plaster, TRS(x - w * 0.28, h + 1.4, z - d * 0.28)); // stair headroom
    B.add(boxGeo(2.9, 0.24, 2.9, 0.5), M.tiles, TRS(x - w * 0.28, h + 2.6, z - d * 0.28));

    // floor bands
    for (let f = 1; f < floors; f++) {
      B.add(boxGeo(w + 0.24, 0.18, d + 0.24, 0.6), M.concrete, TRS(x, f * fh, z));
    }

    // entrance
    B.add(boxGeo(3.4, 2.6, 0.3, 0.5), M.deep, TRS(x + w * 0.16, 1.3, z + d / 2 + 0.06));
    B.add(boxGeo(4.4, 0.28, 1.9, 0.5), M.concrete, TRS(x + w * 0.16, 2.75, z + d / 2 + 0.85));
    [-1.6, 1.6].forEach((dx) =>
      B.add(cylGeo(0.14, 0.16, 2.6, 12, 0.6), M.concrete, TRS(x + w * 0.16 + dx, 1.3, z + d / 2 + 1.6))
    );

    // window grid — the same layout the original used
    const perRow = Math.max(2, Math.floor(w / 2.1));
    for (let f = 0; f < floors; f++) {
      const py = f * fh + fh * 0.55;
      for (let c = 0; c < perRow; c++) {
        const px = x - w / 2 + w * ((c + 0.5) / perRow);
        const pz = z + d / 2;
        windows.push(TRS(px, py, pz + 0.05));
        frames.push(TRS(px, py, pz + 0.02));

        const sx = x + w / 2;
        const sz = z - d / 2 + d * ((c + 0.5) / perRow);
        windows.push(TRS(sx + 0.05, py, sz, 0, Math.PI / 2, 0));
        frames.push(TRS(sx + 0.02, py, sz, 0, Math.PI / 2, 0));
      }
      if (f >= 1) {
        balconies.push(TRS(x + w * 0.22, f * fh + 0.1, z + d / 2 + 0.5));
        rails.push(TRS(x + w * 0.22, f * fh + 0.1, z + d / 2 + 0.5));
        acs.push(TRS(x - w * 0.3, f * fh + 1.5, z + d / 2 + 0.24));
        if (f % 2 === 0) acs.push(TRS(x + w / 2 + 0.24, f * fh + 1.5, z + d * 0.2, 0, Math.PI / 2, 0));
      }
    }
  });

  // rooftop of the central tower
  {
    const ry = 11 * 2.6 + 0.35;
    B.add(cylGeo(1.5, 1.5, 2.4, 24, 0.6), M.water, TRS(-3.2, ry + 1.2, -17.8));
    B.add(cylGeo(1.62, 1.62, 0.22, 24, 0.5), M.metal, TRS(-3.2, ry + 2.5, -17.8));
    B.add(cylGeo(1.55, 1.55, 0.5, 24, 0.5), M.concrete, TRS(-3.2, ry + 0.25, -17.8));
    for (let i = 0; i < 6; i++) {
      const px = 1.2 + (i % 3) * 2.5;
      const pz = -22 + Math.floor(i / 3) * 2.4;
      B.add(boxGeo(2.3, 0.08, 1.35, 0.7), M.glass, TRS(px, ry + 0.62, pz, -0.32));
      B.add(boxGeo(2.3, 0.05, 0.06, 1.0), M.metal, TRS(px, ry + 0.44, pz + 0.6));
      [-1.0, 1.0].forEach((dx) => B.add(boxGeo(0.06, 0.42, 0.06, 1.0), M.metal, TRS(px + dx, ry + 0.28, pz)));
    }
  }

  // ── garden ──
  {
    const gx = -24;
    const gz = 8;
    B.add(flatGeo(new THREE.CircleGeometry(9.5, 56), 0.2), M.grass, TRS(gx, 0.03, gz, -Math.PI / 2));
    B.add(flatGeo(new THREE.RingGeometry(4.6, 5.6, 48), 0.55), M.sand, TRS(gx, 0.05, gz, -Math.PI / 2));
    B.add(flatGeo(new THREE.RingGeometry(9.4, 9.9, 56), 0.6), M.concrete, TRS(gx, 0.05, gz, -Math.PI / 2));

    // fountain
    B.add(cylGeo(2.3, 2.45, 0.7, 36, 0.6), M.concrete, TRS(gx, 0.35, gz));
    B.add(cylGeo(2.05, 2.05, 0.12, 36, 0.6), M.water, TRS(gx, 0.7, gz));
    B.add(cylGeo(0.36, 0.46, 1.1, 16, 0.5), M.concrete, TRS(gx, 1.05, gz));
    B.add(cylGeo(0.95, 0.2, 0.22, 20, 0.5), M.concrete, TRS(gx, 1.62, gz));

    // benches
    for (let i = 0; i < 6; i++) {
      const th = (i / 6) * TAU + 0.4;
      const bx = gx + Math.cos(th) * 6.9;
      const bz = gz + Math.sin(th) * 6.9;
      B.add(boxGeo(1.9, 0.12, 0.58, 0.8), M.wood, TRS(bx, 0.52, bz, 0, -th, 0));
      B.add(boxGeo(1.9, 0.5, 0.1, 0.8), M.wood, TRS(bx, 0.82, bz, 0, -th, 0).multiply(TRS(0, 0, -0.26)));
      [-0.78, 0.78].forEach((dx) =>
        B.add(boxGeo(0.1, 0.52, 0.5, 1.0), M.metal, TRS(bx, 0.26, bz, 0, -th, 0).multiply(TRS(dx, 0, 0)))
      );
    }

    [[-5, -4, 1.15], [4.5, -5, 0.95], [6, 3.5, 1.25], [-6, 4, 1.0], [0, -7.5, 0.85], [-7.5, -1, 1.05]].forEach((t) => {
      trunks.push(TRS(gx + t[0], 0, gz + t[1], 0, Math.random() * TAU, 0, t[2]));
      canopies.push(TRS(gx + t[0], 0, gz + t[1], 0, Math.random() * TAU, 0, t[2]));
    });
    for (let i = 0; i < 14; i++) {
      const th = (i / 14) * TAU;
      hedges.push(TRS(gx + Math.cos(th) * 8.6, 0.32, gz + Math.sin(th) * 8.6, 0, -th, 0));
    }
  }

  // ── play area ──
  {
    const px = 25;
    const pz = 7;
    B.add(flatGeo(new THREE.CircleGeometry(8, 48), 0.24), M.sand, TRS(px, 0.03, pz, -Math.PI / 2));
    B.add(flatGeo(new THREE.RingGeometry(7.9, 8.35, 48), 0.6), M.concrete, TRS(px, 0.06, pz, -Math.PI / 2));

    // slide
    B.add(boxGeo(2.0, 0.16, 2.0, 0.6), M.wood, TRS(px - 2.6, 2.2, pz - 1));
    [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]].forEach((p) =>
      B.add(cylGeo(0.09, 0.09, 2.2, 10, 0.8), M.metal, TRS(px - 2.6 + p[0], 1.1, pz - 1 + p[1]))
    );
    B.add(boxGeo(1.0, 0.1, 4.2, 0.6), M.red, TRS(px - 2.6, 1.35, pz + 1.6, 0.55));
    [-0.55, 0.55].forEach((dx) => B.add(boxGeo(0.08, 0.34, 4.2, 0.8), M.red, TRS(px - 2.6 + dx, 1.5, pz + 1.6, 0.55)));
    for (let i = 0; i < 4; i++) {
      B.add(boxGeo(0.9, 0.07, 0.24, 0.9), M.metal, TRS(px - 2.6, 0.5 + i * 0.5, pz - 2.3 + i * 0.16));
    }

    // swings
    const sx = px + 3.2;
    const sz = pz + 1.4;
    [-1.8, 1.8].forEach((dx) => {
      B.add(cylGeo(0.09, 0.11, 2.6, 12, 0.8), M.metal, TRS(sx + dx, 1.3, sz - 0.5, 0, 0, dx > 0 ? -0.14 : 0.14));
      B.add(cylGeo(0.09, 0.11, 2.6, 12, 0.8), M.metal, TRS(sx + dx, 1.3, sz + 0.5, 0, 0, dx > 0 ? -0.14 : 0.14));
    });
    B.add(cylGeo(0.1, 0.1, 4.2, 12, 0.8), M.metal, TRS(sx, 2.56, sz, 0, 0, Math.PI / 2));
    [-0.9, 0.9].forEach((dx) => {
      B.add(boxGeo(0.05, 1.42, 0.05, 1.2), M.metal, TRS(sx + dx - 0.28, 1.85, sz));
      B.add(boxGeo(0.05, 1.42, 0.05, 1.2), M.metal, TRS(sx + dx + 0.28, 1.85, sz));
      B.add(boxGeo(0.82, 0.09, 0.34, 0.9), M.wood, TRS(sx + dx, 1.12, sz));
    });

    B.add(cylGeo(0.5, 0.5, 0.35, 20, 0.6), M.deep, TRS(px - 0.4, 0.18, pz + 3.4));
    B.add(cylGeo(0.12, 0.12, 0.7, 10, 0.8), M.metal, TRS(px - 0.4, 0.5, pz + 3.4));
    B.add(boxGeo(1.1, 0.5, 0.5, 0.7), M.red, TRS(px - 0.4, 0.95, pz + 3.4));
  }

  // ── parking ──
  {
    B.add(boxGeo(26, 0.08, 7, 0.2), M.asphalt, TRS(0, 0.05, 14));
    for (let i = -5; i <= 5; i++) B.add(boxGeo(0.11, 0.02, 6.4, 0.5), M.white, TRS(i * 2.3, 0.1, 14));
    B.add(boxGeo(26.4, 0.14, 0.3, 0.5), M.concrete, TRS(0, 0.07, 17.55));

    const bodies = [
      [-8.1, 0xb5652f],
      [-3.4, 0x5c554a],
      [1.2, 0x9c2e12],
      [8.0, 0x86986c]
    ];
    bodies.forEach((v, i) => {
      const paint = new THREE.MeshStandardMaterial({
        name: 'car-paint-' + i,
        color: v[1],
        roughness: 0.28,
        metalness: 0.55,
        envMapIntensity: 1.6
      });
      const cx = v[0];
      B.add(boxGeo(1.86, 0.56, 4.1, 0.5), paint, TRS(cx, 0.62, 14));
      B.add(boxGeo(1.66, 0.42, 2.2, 0.5), paint, TRS(cx, 1.06, 13.85));
      B.add(boxGeo(1.7, 0.36, 1.9, 0.6), M.glass, TRS(cx, 1.12, 13.85));
      [-0.58, 0.58].forEach((dx) => {
        B.add(boxGeo(0.44, 0.13, 0.08, 1.2), M.lamp, TRS(cx + dx, 0.74, 16.03));
        B.add(boxGeo(0.4, 0.11, 0.08, 1.2), M.red, TRS(cx + dx, 0.76, 11.96));
      });
      B.add(boxGeo(1.9, 0.14, 0.16, 0.9), M.deep, TRS(cx, 0.5, 16.02));
      B.add(boxGeo(1.9, 0.14, 0.16, 0.9), M.deep, TRS(cx, 0.5, 11.98));
      [[-0.92, 1.4], [0.92, 1.4], [-0.92, -1.4], [0.92, -1.4]].forEach((wp) => {
        B.add(cylGeo(0.34, 0.34, 0.2, 16, 0.7), M.deep, TRS(cx + wp[0], 0.34, 14 + wp[1], 0, 0, Math.PI / 2));
        B.add(cylGeo(0.16, 0.16, 0.22, 12, 0.9), M.metal, TRS(cx + wp[0], 0.34, 14 + wp[1], 0, 0, Math.PI / 2));
      });
    });
  }

  // ── clubhouse ──
  {
    const cx = -25;
    const cz = -15;
    B.add(boxGeo(14, 0.24, 10, 0.55), M.concrete, TRS(cx, 0.12, cz));
    B.add(boxGeo(12, 5, 8, 0.55), M.plaster, TRS(cx, 2.6, cz));
    B.add(boxGeo(13, 0.42, 9, 0.6), M.trim, TRS(cx, 5.3, cz));
    B.add(boxGeo(13.6, 0.5, 9.6, 0.6), M.tiles, TRS(cx, 5.66, cz));
    B.add(boxGeo(9, 2.2, 0.16, 0.6), M.glass, TRS(cx, 2.7, cz + 4.02));
    [-4.5, -1.5, 1.5, 4.5].forEach((dx) => B.add(boxGeo(0.12, 2.3, 0.2, 0.9), M.white, TRS(cx + dx, 2.7, cz + 4.08)));
    B.add(boxGeo(9.2, 0.16, 0.24, 0.8), M.white, TRS(cx, 1.6, cz + 4.06));
    [-4.4, -1.5, 1.5, 4.4].forEach((dx) => {
      B.add(cylGeo(0.28, 0.32, 3.4, 16, 0.5), M.concrete, TRS(cx + dx, 1.7, cz + 5.4));
      B.add(boxGeo(0.7, 0.16, 0.7, 0.7), M.concrete, TRS(cx + dx, 3.48, cz + 5.4));
      B.add(boxGeo(0.76, 0.14, 0.76, 0.7), M.concrete, TRS(cx + dx, 0.07, cz + 5.4));
    });
    B.add(boxGeo(12, 0.34, 3.2, 0.6), M.trim, TRS(cx, 3.7, cz + 5.4));
    B.add(boxGeo(12.4, 0.26, 3.5, 0.5), M.tiles, TRS(cx, 3.98, cz + 5.4));
    B.add(boxGeo(14, 0.12, 4, 0.6), M.concrete, TRS(cx, 0.24, cz + 6.6));
  }

  // ── pool ──
  {
    const px = -25;
    const pz = -27;
    B.add(boxGeo(16, 0.16, 11, 0.55), M.concrete, TRS(px, 0.08, pz));
    B.add(boxGeo(11.8, 0.2, 7.3, 0.6), M.white, TRS(px, 0.14, pz));
    B.add(boxGeo(11, 0.5, 6.5, 0.6), M.water, TRS(px, 0.14, pz));
    [[-6.4, 3.6], [6.4, 3.6], [-6.4, -3.6], [6.4, -3.6]].forEach((p) => {
      B.add(boxGeo(1.9, 0.1, 0.72, 0.8), M.white, TRS(px + p[0], 0.45, pz + p[1], 0, 0, 0.12));
      [-0.7, 0.7].forEach((dx) => B.add(cylGeo(0.05, 0.05, 0.36, 8, 1.0), M.metal, TRS(px + p[0] + dx, 0.24, pz + p[1])));
    });
    B.add(cylGeo(0.1, 0.1, 2.6, 12, 0.8), M.metal, TRS(px + 5.2, 1.3, pz));
    B.add(boxGeo(2.4, 0.06, 2.4, 0.6), M.red, TRS(px + 5.2, 2.6, pz));
    // pool fence
    for (let i = -3; i <= 3; i++) {
      B.add(cylGeo(0.05, 0.05, 1.1, 8, 1.0), M.metal, TRS(px + i * 2.6, 0.7, pz - 5.4));
      B.add(cylGeo(0.05, 0.05, 1.1, 8, 1.0), M.metal, TRS(px + i * 2.6, 0.7, pz + 5.4));
    }
    B.add(boxGeo(16, 0.05, 0.05, 1.0), M.metal, TRS(px, 1.22, pz - 5.4));
    B.add(boxGeo(16, 0.05, 0.05, 1.0), M.metal, TRS(px, 1.22, pz + 5.4));
  }

  // ── community hall ──
  {
    const hx = 25;
    const hz = -17;
    B.add(boxGeo(15, 0.22, 11.5, 0.55), M.concrete, TRS(hx, 0.11, hz));
    B.add(boxGeo(13, 6, 9.5, 0.55), M.plaster, TRS(hx, 3.1, hz));
    B.add(boxGeo(13.5, 0.4, 10, 0.6), M.trim, TRS(hx, 6.3, hz));

    // pitched roof from two sloped slabs instead of a cone
    const pitch = 0.44;
    const slope = boxGeo(13.9, 0.34, 5.9, 0.6);
    B.add(slope, M.tiles, TRS(hx, 7.42, hz - 2.62, pitch));
    B.add(slope, M.tiles, TRS(hx, 7.42, hz + 2.62, -pitch));
    B.add(boxGeo(14.1, 0.26, 0.5, 0.6), M.trim, TRS(hx, 8.68, hz));

    B.add(boxGeo(3.2, 3.4, 0.22, 0.5), M.deep, TRS(hx, 1.8, hz - 4.85));
    B.add(boxGeo(3.8, 0.24, 1.6, 0.5), M.concrete, TRS(hx, 3.7, hz - 5.4));
    [-4, 0, 4].forEach((dx) => {
      B.add(boxGeo(1.6, 2.2, 0.14, 0.7), M.glass, TRS(hx + dx, 3.5, hz + 4.82));
      B.add(boxGeo(1.78, 0.12, 0.22, 0.9), M.white, TRS(hx + dx, 2.34, hz + 4.86));
      B.add(boxGeo(1.78, 0.12, 0.22, 0.9), M.white, TRS(hx + dx, 4.66, hz + 4.86));
    });
    B.add(boxGeo(15, 0.12, 4, 0.6), M.concrete, TRS(hx, 0.22, hz - 7));
  }

  // ── notice board ──
  {
    const nx = 7.5;
    const nz = 27;
    B.add(boxGeo(3.6, 0.16, 1.0, 0.5), M.concrete, TRS(nx, 0.08, nz));
    [-1.3, 1.3].forEach((dx) => B.add(boxGeo(0.18, 1.6, 0.18, 0.8), M.metal, TRS(nx + dx, 0.88, nz)));
    B.add(boxGeo(3.2, 2.0, 0.14, 0.5), M.concrete, TRS(nx, 2.4, nz));
    B.add(boxGeo(3.0, 1.8, 0.05, 0.6), M.white, TRS(nx, 2.4, nz + 0.09));
    B.add(boxGeo(3.5, 0.26, 0.42, 0.6), M.trim, TRS(nx, 3.5, nz));
  }

  // ── trees along the drive and the perimeter ──
  [
    [-30, -4, 1.3], [30, -4, 1.2], [-16, -30, 1.1], [14, -30, 1.35], [-14, 22, 1.0], [16, 22, 1.05],
    [-26, 20, 1.15], [26, 20, 1.1], [-33, 6, 1.25], [33, 6, 1.2], [-20, -34, 1.0], [18, -34, 1.15],
    [-8, 30, 0.95], [9, 30, 1.0], [-30, -20, 1.2], [30, -22, 1.1], [-4, -34, 1.05], [6, -33, 1.2]
  ].forEach((t) => {
    trunks.push(TRS(t[0], 0, t[1], 0, Math.random() * TAU, 0, t[2]));
    canopies.push(TRS(t[0], 0, t[1], 0, Math.random() * TAU, 0, t[2]));
  });
  for (let i = 0; i < 24; i++) {
    const th = (i / 24) * TAU + 0.12;
    if (Math.abs(th - Math.PI / 2) < 0.3) continue;
    hedges.push(TRS(Math.cos(th) * 28.4, 0.34, Math.sin(th) * 28.4, 0, -th, 0));
  }

  // ── street lamps ──
  for (let i = 0; i < 10; i++) {
    const th = (i / 10) * TAU + 0.3;
    const lx = Math.cos(th) * 22.6;
    const lz = Math.sin(th) * 22.6;
    const face = Math.atan2(lx, lz);
    lampPoles.push(TRS(lx, 0, lz, 0, face, 0));
    lampHeads.push(TRS(lx, 0, lz, 0, face, 0));
    lampLenses.push(TRS(lx, 0, lz, 0, face, 0));
  }

  // ── instanced assemblies ──
  world.add(instanced(winGlass, M.glass, windows, 'windows'));
  world.add(instanced(winFrame, M.white, frames, 'window-frames'));
  world.add(instanced(balconySlab, M.concrete, balconies, 'balconies'));
  world.add(instanced(balconyRail, M.metal, rails, 'balcony-rails'));
  world.add(instanced(acUnit, M.metal, acs, 'ac-units'));

  const trunkGeo = cylGeo(0.17, 0.28, 2.2, 10, 0.7).translate(0, 1.1, 0);
  const canopyGeo = mergeGeometries([
    new THREE.IcosahedronGeometry(1.12, 1).translate(0, 3.05, 0),
    new THREE.IcosahedronGeometry(0.8, 1).translate(0.72, 2.5, 0.55),
    new THREE.IcosahedronGeometry(0.66, 1).translate(-0.6, 2.42, -0.42)
  ], false);
  world.add(instanced(trunkGeo, M.wood, trunks, 'tree-trunks'));
  world.add(instanced(canopyGeo, M.leaf, canopies, 'tree-canopies'));
  world.add(instanced(boxGeo(2.1, 0.68, 0.8, 0.9), M.leaf, hedges, 'hedges'));

  const poleGeo = cylGeo(0.08, 0.12, 4.6, 8, 0.7).translate(0, 2.3, 0);
  const headGeo = mergeGeometries([
    boxGeo(0.16, 0.16, 0.9, 0.9).translate(0, 4.55, 0.6),
    boxGeo(0.34, 0.16, 0.7, 0.9).translate(0, 4.42, 0.85)
  ], false);
  world.add(instanced(poleGeo, M.metal, lampPoles, 'lamp-poles'));
  world.add(instanced(headGeo, M.metal, lampHeads, 'lamp-heads'));
  world.add(instanced(boxGeo(0.28, 0.05, 0.6, 1.0).translate(0, 4.33, 0.85), M.lamp, lampLenses, 'lamp-lenses'));

  B.flush(world);
  return world;
}

// ── mount ─────────────────────────────────────────────────────────────

export function createSociety(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  let dpr = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  // PCF is the default and the only percentage-closer filter left — three r184
  // deprecated PCFSoftShadowMap and silently falls back to this one. Softness
  // comes from the 2048² map and the normal bias below instead.
  // Nothing in the model moves and the sun is fixed, so the shadow map is
  // rendered once rather than every frame.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  host.appendChild(renderer.domElement);
  Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block' });

  const scene = new THREE.Scene();
  const sky = skyTexture();
  scene.background = sky;

  // image-based lighting from the sky, so glass, water and metal reflect
  // something real instead of a flat colour
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromEquirectangular(sky);
  scene.environment = envRT.texture;
  pmrem.dispose();

  scene.fog = new THREE.Fog(0xd6cbb4, 95, 300);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 500);

  scene.add(new THREE.HemisphereLight(0xe4edf7, 0x9c8c68, 0.55));
  const sun = new THREE.DirectionalLight(0xfff0d2, 3.5);
  sun.position.set(38, 42, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.024;
  const sc = sun.shadow.camera;
  sc.left = -46; sc.right = 46; sc.top = 46; sc.bottom = -46; sc.near = 1; sc.far = 170;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xc9d9ec, 0.22);
  fill.position.set(-30, 18, -20);
  scene.add(fill);

  const M = createMaterials();
  const world = buildWorld(M);
  scene.add(world);
  world.updateMatrixWorld(true);
  world.matrixWorldAutoUpdate = false;

  // Paint the surfaces after the first frames are already on screen — the page
  // gets its backdrop immediately and the detail arrives a beat later.
  let surfaces = null;
  let disposed = false;
  buildSurfaces({
    size: Math.min(innerWidth, innerHeight) < 700 ? 512 : 1024,
    aniso: Math.min(8, renderer.capabilities.getMaxAnisotropy())
  }).then((s) => {
    if (disposed) {
      disposeSurfaces(s);
      return;
    }
    surfaces = s;
    applySurfaces(M, s);
    renderer.shadowMap.needsUpdate = true;
    needs = true;
  });

  // ── scroll-driven camera (unchanged) ──
  const camPos = new THREE.Vector3(...STOPS.wide.p);
  const camTgt = new THREE.Vector3(...STOPS.wide.t);
  const wantPos = camPos.clone();
  const wantTgt = camTgt.clone();
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  let fov = STOPS.wide.f, wantFov = fov;
  let needs = true;

  const resize = () => {
    const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    needs = true;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  const ease = (t) => t * t * (3 - 2 * t);

  // cached section table — rebuilt on layout change, never per frame
  let table = [];
  const build = () => {
    table = Array.from(document.querySelectorAll('[data-cam]'))
      .map((el) => ({
        top: el.getBoundingClientRect().top + scrollY,
        stop: STOPS[el.dataset.cam] || STOPS.wide
      }))
      .sort((x, y) => x.top - y.top);
    needs = true;
  };
  build();
  const late = setTimeout(build, 1400);
  addEventListener('resize', build);
  addEventListener('load', build);

  const targets = () => {
    if (!table.length) return;
    const y = scrollY + innerHeight * 0.42;
    let i = 0;
    while (i < table.length - 1 && table[i + 1].top <= y) i++;
    const cur = table[i], nxt = table[i + 1] || cur;
    const span = nxt === cur ? innerHeight : Math.max(1, nxt.top - cur.top);
    const t = ease(Math.min(1, Math.max(0, (y - cur.top) / span)));
    a.set(...cur.stop.p); b.set(...nxt.stop.p); wantPos.copy(a).lerp(b, t);
    a.set(...cur.stop.t); b.set(...nxt.stop.t); wantTgt.copy(a).lerp(b, t);
    wantFov = (cur.stop.f || 32) + ((nxt.stop.f || 32) - (cur.stop.f || 32)) * t;
  };

  // If the GPU cannot hold the frame budget at full resolution, step down once
  // rather than letting the whole page stutter.
  let samples = 0;
  let acc = 0;
  const tune = (ms) => {
    if (dpr <= 1 || samples > 45) return;
    acc += ms;
    if (++samples < 45) return;
    if (acc / samples > 20) {
      dpr = dpr > 1.5 ? 1.5 : 1;
      renderer.setPixelRatio(dpr);
      resize();
      samples = 0;
      acc = 0;
    }
  };

  let lastY = -1, clock = 0, lastT = 0, raf = 0, alive = true;
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const settled =
      camPos.distanceToSquared(wantPos) + camTgt.distanceToSquared(wantTgt) + Math.abs(wantFov - fov) < 0.0006;
    if (settled && scrollY === lastY && !needs) return;
    if (now - lastT < 32) return;
    lastT = now || 0;
    lastY = scrollY;
    clock += 0.03;
    targets();
    camPos.lerp(wantPos, 0.14);
    camTgt.lerp(wantTgt, 0.14);
    fov += (wantFov - fov) * 0.14;
    camera.fov = fov;
    camera.updateProjectionMatrix();
    camera.position.copy(camPos);
    camera.position.y += Math.sin(clock * 0.5) * 0.1;
    camera.position.x += Math.sin(clock * 0.31) * 0.07;
    camera.lookAt(camTgt);
    camera.rotation.z += Math.sin(clock * 0.23) * 0.004;
    const t0 = performance.now();
    renderer.render(scene, camera);
    tune(performance.now() - t0);
    needs = false;
  }
  const onScroll = () => { needs = true; };
  addEventListener('scroll', onScroll, { passive: true });
  frame();

  // opt-in diagnostics: append ?stats to the URL and read window.__society
  if (location.search.includes('stats')) window.__society = { renderer, scene, camera };

  return function dispose() {
    disposed = true;
    alive = false;
    cancelAnimationFrame(raf);
    clearTimeout(late);
    ro.disconnect();
    removeEventListener('resize', build);
    removeEventListener('load', build);
    removeEventListener('scroll', onScroll);
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
    if (surfaces) disposeSurfaces(surfaces);
    envRT.dispose();
    sky.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
