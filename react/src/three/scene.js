import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildSurfaces, disposeSurfaces } from './textures.js';

/* The society behind the page.
   The camera keeps the original society3d.js stops, easing curve, follow rate
   and idle sway. Its delivery is rebuilt: every visible frame is drawn, the
   follow is time-based rather than per-frame, and the scroll position is run
   through a critically damped spring before the camera reads it. The model is
   rebuilt too — textured PBR surfaces, image-based lighting, filmic tone
   mapping and far more built detail, batched into ~35 draw calls. */

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

// ── swept surfaces, for the cars ──────────────────────────────────────

const smoothstep = (t) => t * t * (3 - 2 * t);

/** A curve through keyed [t, value] points, smoothstepped between them so a
    surface swept along it picks up no crease the keys did not ask for. */
function curve(keys) {
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    const last = keys[keys.length - 1];
    if (t >= last[0]) return last[1];
    let i = 0;
    while (keys[i + 1][0] < t) i++;
    const [t0, v0] = keys[i];
    const [t1, v1] = keys[i + 1];
    return v0 + (v1 - v0) * smoothstep((t - t0) / (t1 - t0));
  };
}

/* Sweeps a rounded cross-section along z, its width, roofline and underside
   read from profile curves at every station.

   `boxy` is the superellipse exponent: 1 gives a plain ellipse, below that the
   section squares up while keeping its corners radiused, which is what a body
   panel actually looks like in section. `belt` and `tumble` lean the sides in
   above a given height — the tumblehome every car has and no box ever does.

   With `band` the sweep covers only an arc rather than the full ring, which is
   how the roof, the pillars and every light and bumper are laid on: the same
   surface, a sliver of it, pushed `offset` metres straight out along its own
   normal. Details built this way curve with the panel they sit on, which is
   the whole difference between a tail light and a brick glued to a wing. */
function sweep({
  rings, seg, z0, z1, top, bot, half,
  belt = 0, tumble = 0.26, boxy = 0.62, band = null, offset = 0, cap = false
}) {
  const pos = [];
  const uv = [];
  const idx = [];
  const closed = !band;
  const cols = closed ? seg : seg + 1;
  const at = (v, t) => (typeof v === 'function' ? v(t) : v);

  for (let i = 0; i < rings; i++) {
    const t = i / (rings - 1);
    const z = z0 + (z1 - z0) * t;
    const yT = top(t);
    const yB = bot(t);
    const hw = half(t);
    const cy = (yT + yB) / 2;
    const hh = Math.max(0.012, (yT - yB) / 2);
    for (let j = 0; j < cols; j++) {
      const th = band
        ? at(band.center, t) - at(band.half, t) + (2 * at(band.half, t) * j) / seg
        : (j / seg) * TAU;
      const c = Math.cos(th);
      const s = Math.sin(th);
      let y = cy + hh * Math.sign(s) * Math.pow(Math.abs(s), boxy);
      let x = hw * Math.sign(c) * Math.pow(Math.abs(c), boxy);
      if (belt && y > belt && yT > belt) {
        x *= 1 - tumble * smoothstep(Math.min(1, (y - belt) / (yT - belt)));
      }
      if (offset) {
        // straight out from the section's centre, which for a convex section
        // is the surface normal to within a degree or two
        const dy = y - cy;
        const len = Math.hypot(x, dy) || 1;
        x += (x / len) * offset;
        y += (dy / len) * offset;
      }
      pos.push(x, y, z);
      // the paint map is fine metallic flake, so the scale only has to be sane
      uv.push((j / seg) * 1.8, t * Math.abs(z1 - z0) * 0.5);
    }
  }

  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < seg; j++) {
      const jn = closed ? (j + 1) % seg : j + 1;
      const a = i * cols + j;
      const b = i * cols + jn;
      const c = (i + 1) * cols + j;
      const d = (i + 1) * cols + jn;
      idx.push(a, c, b, b, c, d);
    }
  }

  /* Close the two ends. Without this the body is a tube open at the bumpers,
     and back-face culling turns each opening into a hole straight through. */
  if (closed && cap) {
    for (const ring of [0, rings - 1]) {
      const t = ring / (rings - 1);
      const centre = pos.length / 3;
      pos.push(0, (top(t) + bot(t)) / 2, z0 + (z1 - z0) * t);
      uv.push(0.5, 0.5);
      for (let j = 0; j < seg; j++) {
        const a = ring * cols + j;
        const b = ring * cols + ((j + 1) % seg);
        if (ring === 0) idx.push(centre, a, b);
        else idx.push(centre, b, a);
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Revolves a [radius, offset-along-axle] profile into a wheel part. */
function wheelGeo(profile, seg) {
  return new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), seg)
    .rotateZ(Math.PI / 2);
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
    bark: std('bark', { color: 0x554634, roughness: 0.97 }),
    plastic: std('plastic', { color: 0x3a3733, roughness: 0.6 }),
    leaf: std('foliage', { color: 0x5f7345, roughness: 0.94, flatShading: true }),
    glass: std('glazing', { color: 0x14222c, roughness: 0.07, metalness: 0.05, envMapIntensity: 2.2 }),
    metal: std('metal', { color: 0xa9a396, roughness: 0.34, metalness: 0.88, envMapIntensity: 1.7 }),
    water: std('water', { color: 0x2f6a80, roughness: 0.05, metalness: 0.15, envMapIntensity: 2.4 }),
    red: std('signal-red', { color: 0xa72608, roughness: 0.42 }),
    tyre: std('tyre', { color: 0x22201e, roughness: 0.9 }),
    cars: [0xb5652f, 0x5c554a, 0x9c2e12, 0x86986c].map((c, i) =>
      std('car-paint-' + i, { color: c, roughness: 0.26, metalness: 0.5, envMapIntensity: 1.7 })
    ),
    white: std('paint-white', { color: 0xece7dc, roughness: 0.5 }),
    lamp: std('lamp-lens', { color: 0xfff4dc, roughness: 0.3, emissive: 0xffe6b0, emissiveIntensity: 0.35 }),
    /* Headlamps are their own material, not the street lamps'. A parked car in
       daylight has no lit lens — what you actually see is a clear cover over a
       silvered reflector, which means something glossy that takes its
       brightness from the sky. Borrowing the emissive lamp lens made every car
       look like it had two squares of paper taped to the nose. */
    headlamp: std('headlamp', { color: 0xdde3e6, roughness: 0.11, metalness: 0.25, envMapIntensity: 2.1 })
  };
}

/** Returns one thunk per material, each swapping that material's maps in and
    handing back the textures it now uses. Colours go white so the map is not
    tinted twice — anything still tinted below is deliberately shifting a scan
    off its own colour, not re-applying it.

    The caller runs these a frame apart rather than calling them in a loop.
    Assigning a map to a material changes its shader permutation, so applying
    all sixteen at once costs sixteen program compiles, every texture upload
    and its mipmap chain, and a fresh shadow map — inside one frame. Measured
    on an integrated Radeon that was a single 3.5 second freeze, which is the
    whole of what the page felt like it was lagging on. One material per frame
    is the same work spread over a quarter of a second, and none of it lands
    while the camera is mid-move. */
function surfaceSwaps(M, S) {
  const put = (mat, set, { normal = 1, tint = 0xffffff, rough } = {}) => () => {
    mat.map = set.map;
    mat.normalMap = set.normalMap;
    mat.normalScale.set(normal, normal);
    if (set.armMap) {
      /* One image, three slots. The scans pack ambient occlusion into red,
         roughness into green and metalness into blue — exactly the channels
         three.js already reads each of those maps from, so the same texture
         can be bound to all three and the GPU samples it once.
         `roughness` then goes to 1 so the measured values pass through
         unscaled; a multiplier here would only be second-guessing the scan. */
      mat.aoMap = set.armMap;
      mat.aoMapIntensity = 0.75;
      mat.roughnessMap = set.armMap;
      if (rough === undefined) mat.roughness = 1;
    } else if (set.roughnessMap) mat.roughnessMap = set.roughnessMap;
    if (rough !== undefined) mat.roughness = rough;
    mat.color.setHex(tint);
    mat.needsUpdate = true;
    return set;
  };
  return [
    /* Ordered by how much of the frame each covers, so the surfaces that carry
       the shot land first and the swap-in reads as detail arriving rather than
       as a patchwork settling. */
    put(M.plaster, S.plaster, { normal: 0.7, tint: 0xfff6e6 }),
    put(M.concrete, S.concrete, { normal: 0.8, tint: 0xf2ece0 }),
    put(M.earth, S.earth, { normal: 0.8, rough: 0.97 }),
    put(M.grass, S.grass, { normal: 1.0, rough: 0.98 }),
    put(M.tiles, S.tiles, { normal: 1.0 }),
    put(M.plasterWarm, S.plaster, { normal: 0.7, tint: 0xe8d5b4 }),
    put(M.asphalt, S.asphalt, { normal: 0.8, rough: 0.95 }),
    put(M.white, S.plaster, { normal: 0.4, tint: 0xe6e1d6 }),
    put(M.deep, S.concrete, { normal: 0.5, tint: 0x7d4118 }),
    put(M.trim, S.tiles, { normal: 0.8, tint: 0xe4a273, rough: 0.66 }),
    put(M.leaf, S.leaf, { normal: 0.9, rough: 0.94 }),
    put(M.sand, S.sand, { normal: 0.9, rough: 0.99 }),
    put(M.wood, S.wood, { normal: 0.9 }),
    put(M.bark, S.wood, { normal: 1.1, tint: 0x8f7a5f }),
    put(M.metal, S.metal, { normal: 0.4 }),
    put(M.tyre, S.tyre, { normal: 0.9 }),
    // Car paint keeps its colour: the map is near-white flake and clearcoat, so
    // tinting it with the body colour is the whole point.
    () => {
      M.cars.forEach((mat) => {
        mat.map = S.carPaint.map;
        mat.normalMap = S.carPaint.normalMap;
        mat.normalScale.set(0.3, 0.3);
        mat.needsUpdate = true;
      });
      return S.carPaint;
    },
    // Water is a normal map only — the colour and reflectivity are the material's.
    () => {
      M.water.normalMap = S.water.normalMap;
      M.water.normalScale.set(0.55, 0.55);
      M.water.needsUpdate = true;
      return S.water;
    }
  ];
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

  /* ── ground plane, drive and paths ──
     The ground repeats roughly every 3–4 m rather than every 6–11 m as it used
     to. A painted texture was pure high-frequency grain and survived being
     stretched that far; a photograph does not — its macro features come with a
     real-world size, and spreading a metre of dirt over eleven turns gravel
     into boulders and blades of grass into fronds. */
  B.add(flatGeo(new THREE.CircleGeometry(78, 72), 0.26), M.earth, TRS(0, 0, 0, -Math.PI / 2));

  // lawn inside the ring drive, and green verges outside the boundary
  // the inner lawn is the one the camera comes close to, so it repeats tighter
  // than the far verges, where a 2.5 m tile would show its seams across 100 m
  B.add(flatGeo(new THREE.CircleGeometry(16, 56), 0.4), M.grass, TRS(0, 0.012, 0, -Math.PI / 2));
  B.add(flatGeo(new THREE.RingGeometry(34, 52, 72), 0.3), M.grass, TRS(0, 0.012, 0, -Math.PI / 2));

  B.add(flatGeo(new THREE.RingGeometry(17, 21, 72), 0.34), M.asphalt, TRS(0, 0.02, 0, -Math.PI / 2));
  B.add(boxGeo(5, 0.04, 16, 0.34), M.asphalt, TRS(0, 0.02, 26));
  // centre line down the entry road
  B.add(boxGeo(0.16, 0.02, 1.4, 0.6), M.white, TRS(0, 0.05, 20));
  B.add(boxGeo(0.16, 0.02, 1.4, 0.6), M.white, TRS(0, 0.05, 23));
  B.add(boxGeo(0.16, 0.02, 1.4, 0.6), M.white, TRS(0, 0.05, 26));

  /* Kerbs sit at 0.062, not at the 0.09 they used to.
     Both of these circles cross the parking apron, whose top face is at
     exactly 0.09 — two coplanar surfaces, which the depth buffer cannot
     order, so the kerb flickered against the tarmac as a ring that shimmered
     whenever the camera moved. At 0.062 they fall inside the apron slab
     (which spans 0.01–0.09) and are simply hidden where it covers them,
     while still sitting proud of the drive everywhere else. */
  B.add(flatGeo(new THREE.RingGeometry(21, 21.5, 72), 0.5), M.concrete, TRS(0, 0.062, 0, -Math.PI / 2));
  B.add(flatGeo(new THREE.RingGeometry(16.5, 17, 72), 0.5), M.concrete, TRS(0, 0.062, 0, -Math.PI / 2));
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
    B.add(flatGeo(new THREE.CircleGeometry(9.5, 56), 0.4), M.grass, TRS(gx, 0.03, gz, -Math.PI / 2));
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
    B.add(flatGeo(new THREE.CircleGeometry(8, 48), 0.34), M.sand, TRS(px, 0.03, pz, -Math.PI / 2));
    // 0.072, not 0.06: the boundary footpath ring is at 0.06 and this ring
    // crosses it (it spans 17.6–34.3 from the origin, the footpath 29.6–31.2),
    // so sharing a height would set the two z-fighting where they meet
    B.add(flatGeo(new THREE.RingGeometry(7.9, 8.35, 48), 0.6), M.concrete, TRS(px, 0.072, pz, -Math.PI / 2));

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
    B.add(boxGeo(26, 0.08, 7, 0.34), M.asphalt, TRS(0, 0.05, 14));
    // bay lines clear the apron's top face rather than resting exactly on it
    for (let i = -5; i <= 5; i++) B.add(boxGeo(0.11, 0.02, 6.4, 0.5), M.white, TRS(i * 2.3, 0.105, 14));
    B.add(boxGeo(26.4, 0.14, 0.3, 0.5), M.concrete, TRS(0, 0.07, 17.55));

    /* ── the cars ──
       These were six boxes stacked on four cylinders, and no amount of paint
       rescues that silhouette. What reads as a car is a single continuous
       surface: it narrows towards both bumpers in plan, leans inward above the
       beltline, and has arches cut into it that the wheels sit *inside* rather
       than beside. So the body is swept, not stacked — one skin driven by a
       roofline, an underside and a plan taper, with the arches simply the
       underside rising over each axle.

       The cabin is a second sweep in glass, and the roof and pillars are thin
       bands of that same surface laid a few millimetres proud of it. Building
       them from the same profiles is what keeps the glass sitting truly flush
       in the opening instead of hovering in front of it. */
    const LEN = 4.32;
    const HALF_W = 0.92;
    const NOSE = LEN / 2;

    // bonnet → cowl → boot lid. The cabin sits on top of this, not inside it.
    const bodyTop = curve([
      [0.00, 0.74], [0.05, 0.87], [0.14, 0.94], [0.28, 0.99],
      [0.42, 1.01], [0.68, 1.02], [0.82, 1.06], [0.93, 1.04], [1.00, 0.93]
    ]);
    /* Sills at 0.30, lifting to 0.72 over each axle — that lift *is* the wheel
       arch. Front axle sits at t=0.186 and rear at t=0.814, which is a 2.7 m
       wheelbase under a 4.32 m car. */
    const bodyBot = curve([
      [0.00, 0.50], [0.07, 0.40], [0.12, 0.55], [0.186, 0.72], [0.25, 0.55],
      [0.31, 0.30], [0.70, 0.30],
      [0.76, 0.55], [0.814, 0.72], [0.88, 0.55], [0.94, 0.40], [1.00, 0.52]
    ]);
    const bodyHalf = curve([
      [0.00, 0.60], [0.05, 0.82], [0.13, 0.95], [0.30, 1.00],
      [0.72, 1.00], [0.87, 0.95], [0.95, 0.84], [1.00, 0.62]
    ]);

    // the greenhouse, in its own 0→1 running from windscreen base to backlight
    const CAB_0 = NOSE - 0.30 * LEN;
    const CAB_1 = NOSE - 0.82 * LEN;
    const cabTop = curve([
      [0.00, 1.00], [0.10, 1.14], [0.30, 1.42], [0.42, 1.475],
      [0.60, 1.48], [0.70, 1.44], [0.85, 1.24], [1.00, 1.02]
    ]);
    const cabBot = curve([[0.00, 0.96], [1.00, 0.98]]);
    const cabHalf = curve([
      [0.00, 0.62], [0.12, 0.80], [0.30, 0.87], [0.62, 0.88], [0.80, 0.84], [1.00, 0.62]
    ]);

    const cabin = { rings: 26, seg: 24, z0: CAB_0, z1: CAB_1, top: cabTop, bot: cabBot, belt: 1.02, tumble: 0.3 };
    const body = {
      rings: 40, seg: 28, z0: NOSE, z1: -NOSE,
      top: bodyTop, bot: bodyBot, half: (t) => bodyHalf(t) * HALF_W,
      // squarer than the default: a shoulder that rolls over too softly is
      // what makes a body read as a bar of soap rather than pressed steel
      belt: 0.94, tumble: 0.1, boxy: 0.54
    };
    const bodyGeo = sweep({ ...body, cap: true });
    const glassGeo = sweep({ ...cabin, half: (t) => cabHalf(t) * HALF_W });
    // roof panel: a band across the top, widening at each end into the pillars
    const roofGeo = sweep({
      ...cabin, half: (t) => cabHalf(t) * HALF_W, offset: 0.008,
      band: { center: Math.PI / 2, half: curve([[0.00, 0.95], [0.30, 0.74], [0.62, 0.74], [1.00, 0.92]]) }
    });
    /* B-pillar: the same skin again, a short arc down each flank mid-cabin.
       Every profile has to be remapped into the slice — `sweep` always walks
       its own 0→1, so handing it the cabin's curves unremapped would squeeze
       the entire roofline into these few centimetres and spit out a spike. */
    const pillarBand = (side) => {
      const a = 0.47;
      const b = 0.545;
      return sweep({
        ...cabin, rings: 6, seg: 4,
        z0: CAB_0 + (CAB_1 - CAB_0) * a, z1: CAB_0 + (CAB_1 - CAB_0) * b,
        top: (u) => cabTop(a + (b - a) * u),
        bot: (u) => cabBot(a + (b - a) * u),
        half: (u) => cabHalf(a + (b - a) * u) * HALF_W,
        offset: 0.006,
        band: { center: side * 0.66, half: 0.62 }
      });
    };

    /* Lights, bumpers and plates, each a patch of the body's own skin rather
       than a box parked next to it. `t0`/`t1` are positions along the car and
       `center`/`half` an arc around it, so every one of them wraps the panel
       it belongs to and stays inside the silhouette. */
    const trim = (t0, t1, center, halfArc, offset) =>
      sweep({
        rings: 7, seg: 7, z0: NOSE - t0 * LEN, z1: NOSE - t1 * LEN,
        top: (u) => bodyTop(t0 + (t1 - t0) * u),
        bot: (u) => bodyBot(t0 + (t1 - t0) * u),
        half: (u) => bodyHalf(t0 + (t1 - t0) * u) * HALF_W,
        belt: 0.94, tumble: 0.1, boxy: 0.54, offset,
        band: { center, half: halfArc }
      });
    const LOW = -Math.PI / 2; // wrapping the underside of a bumper
    const bumperF = trim(0.0, 0.062, LOW, 1.25, 0.007);
    const bumperR = trim(0.94, 1.0, LOW, 1.25, 0.007);
    const plateF = trim(0.008, 0.026, LOW, 0.2, 0.014);
    const plateR = trim(0.976, 0.994, LOW, 0.2, 0.014);
    const lamps = [1, -1].map((side) => trim(0.018, 0.080, side > 0 ? 0.78 : Math.PI - 0.78, 0.27, 0.008));
    const tails = [1, -1].map((side) => trim(0.926, 0.988, side > 0 ? 0.76 : Math.PI - 0.76, 0.30, 0.008));

    const tyreGeo = wheelGeo(
      [[0.175, -0.105], [0.255, -0.105], [0.30, -0.092], [0.325, -0.070],
        [0.335, -0.030], [0.335, 0.030], [0.325, 0.070], [0.30, 0.092],
        [0.255, 0.105], [0.175, 0.105]],
      22
    );
    /* The tread is painted once across the map, and a lathe hands it one tile
       for the whole wheel — 26 blocks around and 18 across, which comes out
       looking like a tractor tyre. Repeated around and compressed across, the
       same map gives about 80 blocks round and 5 across, which is a car's. */
    {
      const uv = tyreGeo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 0.3);
    }
    const rimGeo = wheelGeo(
      [[0.0, 0.070], [0.055, 0.084], [0.12, 0.081], [0.168, 0.060], [0.178, 0.020], [0.178, -0.02]],
      20
    );

    [-8.1, -3.4, 1.2, 8.0].forEach((cx, i) => {
      const paint = M.cars[i];
      const at = TRS(cx, 0, 14);
      const put = (geo, mat, m) => B.add(geo, mat, m ? at.clone().multiply(m) : at);

      put(bodyGeo, paint);
      put(roofGeo, paint);
      put(pillarBand(1), paint);
      put(pillarBand(-1), paint);
      put(glassGeo, M.glass);

      // wheels, tucked just inside the arches with a dark void behind the rim
      [[-0.75, 1.35], [0.75, 1.35], [-0.75, -1.35], [0.75, -1.35]].forEach(([wx, wz]) => {
        const w = TRS(wx, 0.335, wz);
        const face = TRS(wx + Math.sign(wx) * 0.052, 0.335, wz);
        put(tyreGeo, M.tyre, w);
        put(cylGeo(0.172, 0.172, 0.2, 14, 0.9), M.plastic, TRS(wx, 0.335, wz, 0, 0, Math.PI / 2));
        put(rimGeo, M.metal, face);
      });

      put(bumperF, M.plastic);
      put(bumperR, M.plastic);
      put(plateF, M.white);
      put(plateR, M.white);
      lamps.forEach((g) => put(g, M.headlamp));
      tails.forEach((g) => put(g, M.red));
      // door mirrors, sat on the beltline where the A-pillar meets the flank
      [-1, 1].forEach((sx) => {
        put(boxGeo(0.17, 0.085, 0.1, 1.2), M.plastic, TRS(sx * 0.94, 0.99, CAB_0 - 0.1, 0, 0, sx * 0.18));
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

  /* A crown built from many small irregular clumps rather than two or three
     big spheres. Three smooth blobs on a stick is the single most cartoon
     thing in the scene; real foliage reads as a broken silhouette, so the
     clumps are scattered on a squashed hemisphere with varied size and a
     ragged edge. */
  const trunkGeo = cylGeo(0.17, 0.28, 2.3, 10, 0.7).translate(0, 1.15, 0);
  let cseed = 9;
  const crnd = () => ((cseed = (cseed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const clumps = [];
  for (let i = 0; i < 16; i++) {
    const a = crnd() * TAU;
    const rr = 0.35 + crnd() * 0.78;
    const yy = 2.35 + crnd() * 1.15;
    const s = 0.34 + crnd() * 0.42;
    const g = new THREE.IcosahedronGeometry(s, 1);
    g.scale(1, 0.82 + crnd() * 0.3, 1);
    clumps.push(g.translate(Math.cos(a) * rr, yy, Math.sin(a) * rr));
  }
  const canopyGeo = mergeGeometries([
    new THREE.IcosahedronGeometry(0.95, 1).scale(1, 0.86, 1).translate(0, 2.95, 0),
    ...clumps
  ], false);
  world.add(instanced(trunkGeo, M.bark, trunks, 'tree-trunks'));
  // every tree the same green is another tell — vary it per instance
  const canopyMesh = instanced(canopyGeo, M.leaf, canopies, 'tree-canopies');
  const tint = new THREE.Color();
  canopies.forEach((_, i) => {
    const v = ((i * 2654435761) >>> 0) / 4294967296;
    tint.setHSL(0.22 + v * 0.06, 0.3 + v * 0.16, 0.36 + v * 0.16);
    canopyMesh.setColorAt(i, tint);
  });
  canopyMesh.instanceColor.needsUpdate = true;
  world.add(canopyMesh);
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
  /* Every material here is a stock three.js one — there is no hand-written GLSL
     in this scene for the check to catch. What it does cost is real: verifying
     a program means calling getProgramInfoLog, which blocks until the driver
     has finished compiling and linking, and that is exactly the wait the async
     compile below exists to avoid. Off, it also covers the shadow depth
     programs, which `compileAsync` does not reach. */
  renderer.debug.checkShaderErrors = false;
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

  /* Rendered straight to the canvas, no post-processing chain.
     An earlier pass added GTAO ambient occlusion here. It looked better, but
     it costs a depth+normal prepass, the AO pass and a denoise every frame on
     top of a half-float multisampled target, and that is what made the page
     lag. Direct rendering also gets hardware MSAA back for free from the
     renderer's own `antialias` flag, which is the cheapest anti-aliasing
     available and the thing that keeps the thin railings and window frames
     from crawling. */

  /* Fetch the surfaces after the first frames are already on screen — the page
     gets its backdrop immediately and the real materials arrive a beat later.

     The half-size tier goes to phones and to anything advertising a small heap
     or a metered connection. It is ~2 MB against ~10 MB, and on a screen that
     narrow the full set would be paying for detail below one texel per pixel. */
  const small = Math.min(innerWidth, innerHeight) < 700;
  const thin = navigator.connection?.saveData || (navigator.deviceMemory || 8) <= 4;
  let surfaces = null;
  let disposed = false;
  let uploads = null; // textures still to be pushed to the GPU, one per frame

  /* Nothing is drawn while the driver is building shader programs.

     Assigning a map to a material changes its shader permutation, and three
     checks the new program's link status the moment that program is first
     used — a check that blocks the main thread until the driver has finished
     compiling. Profiling the load, that one function (`onFirstUse`) accounted
     for 4.0 s of frozen page, dwarfing every other cost including the texture
     uploads at 0.47 s. `compileAsync` builds the same programs through
     KHR_parallel_shader_compile, on the driver's own threads, and resolves
     when they are genuinely ready.

     Pausing rendering across that window is the point: the canvas simply holds
     its last frame while the page above it stays completely responsive, which
     is a far better trade than a smooth backdrop bought with a locked tab. */
  let compiling = false;
  const warm = () => {
    compiling = true;
    renderer.compileAsync(scene, camera).then(() => {
      if (disposed) return;
      compiling = false;
      renderer.shadowMap.needsUpdate = true;
      needs = true;
    });
  };

  buildSurfaces({
    tier: small || thin ? 'low' : 'high',
    size: small ? 512 : 1024,
    aniso: Math.min(8, renderer.capabilities.getMaxAnisotropy())
  }).then((s) => {
    if (disposed) {
      disposeSurfaces(s);
      return;
    }
    surfaces = s;
    // de-duplicated: plaster backs three materials, and its maps upload once
    uploads = [...new Set(Object.values(s).flatMap((set) => Object.values(set)))];
    needs = true;
  });

  /* Pushes one texture to the GPU per frame, then switches every material over
     in one go. An upload and its mipmap chain is real GPU work — a 2048² map
     costs more than a frame's budget on integrated graphics — but it compiles
     nothing, so the scene keeps drawing throughout. Only once the pixels are
     all resident do the materials change, and that cost is handed to `warm`. */
  const prepareSurfaces = () => {
    if (!uploads) return;
    renderer.initTexture(uploads.pop());
    needs = true;
    if (uploads.length) return;
    uploads = null;
    for (const step of surfaceSwaps(M, surfaces)) step();
    warm();
  };

  // ── scroll-driven camera (unchanged) ──
  const camPos = new THREE.Vector3(...STOPS.wide.p);
  const camTgt = new THREE.Vector3(...STOPS.wide.t);
  const wantPos = camPos.clone();
  const wantTgt = camTgt.clone();
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  let fov = STOPS.wide.f, wantFov = fov;
  // the zoom's own spring state — see the frame loop for why it is not a lerp
  const zoom = { value: fov, vel: 0 };
  const ZOOM_TIME = 0.28; // seconds for the field of view to settle
  let side = 1, wantSide = 1; // which way the subject leans; +1 = pushed right
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

  /* The untextured scene has its own set of programs, and the first frame would
     otherwise stop to build every one of them. Start them now, in the
     background, so the backdrop arrives when it can be drawn without a stall.

     Holding this back until the scans land — one set of programs instead of
     two — was measurably worse, not better: the scans do not reliably beat the
     first frame, so the wait usually bought a second compile *and* a later
     backdrop. */
  warm();

  /* Read once, up here, because it decides how hard the camera has to work to
     smooth the scroll as well as whether it sways. */
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ease = (t) => t * t * (3 - 2 * t);

  // cached section table — rebuilt on layout change, never per frame
  let table = [];
  const build = () => {
    table = Array.from(document.querySelectorAll('[data-cam]'))
      .map((el) => ({
        top: el.getBoundingClientRect().top + scrollY,
        stop: STOPS[el.dataset.cam] || STOPS.wide,
        // text on the left wants the subject pushed right, and vice versa
        side: el.dataset.side === 'left' ? 1 : el.dataset.side === 'right' ? -1 : 0
      }))
      .sort((x, y) => x.top - y.top);
    needs = true;
  };
  build();
  const late = setTimeout(build, 1400);
  addEventListener('resize', build);
  addEventListener('load', build);

  /* The camera reads a smoothed copy of the scroll position rather than
     scrollY itself, and the zoom below rides the same solver.

     This is a critically damped spring rather than a plain lerp on purpose. A
     lerp snaps its velocity the instant the target moves, so a stepped input
     comes out as a train of little surges — measurably so: frame-to-frame
     camera speed varied by ~94% of its own mean. A spring carries velocity
     across the steps and never overshoots.

     How long it needs to be depends on what is feeding it. The page now eases
     its own scrolling, so scrollY arrives as a continuous ramp and the camera
     only has to track it — a long spring on top of that is not smoother, just
     late, and the backdrop visibly trails the text. Where the page is scrolling
     natively (reduced motion) the old 0.45 s is still what absorbs a wheel
     notch's ~100 px jump. */
  const SMOOTH_TIME = reduceMotion ? 0.45 : 0.14;

  /* One step of the solver, on a `{ value, vel }` pair. Pulled out of the
     scroll follower so the zoom can use exactly the same curve — the two are
     driven by the same gesture and want the same character of movement, and
     writing it twice is how they drift apart. */
  const stepSpring = (s, target, smoothTime, h) => {
    const omega = 2 / smoothTime;
    const x = omega * h;
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const change = s.value - target;
    const temp = (s.vel + omega * change) * h;
    s.vel = (s.vel - omega * temp) * exp;
    s.value = target + (change + temp) * exp;
    return s.value;
  };

  const scroll = { value: scrollY, vel: 0 };
  const followScroll = (dt) => {
    const target = scrollY;
    stepSpring(scroll, target, SMOOTH_TIME, dt / 1000);
    // Snap at a quarter of a pixel. A spring has an exponential tail, so
    // insisting on 0.03px kept "still scrolling" true for seconds after the
    // wheel stopped and the loop could never reach rest.
    if (Math.abs(target - scroll.value) < 0.25 && Math.abs(scroll.vel) < 3) {
      scroll.value = target;
      scroll.vel = 0;
    }
  };

  const targets = () => {
    if (!table.length) return;
    const y = scroll.value + innerHeight * 0.42;
    let i = 0;
    while (i < table.length - 1 && table[i + 1].top <= y) i++;
    const cur = table[i], nxt = table[i + 1] || cur;
    const span = nxt === cur ? innerHeight : Math.max(1, nxt.top - cur.top);
    const t = ease(Math.min(1, Math.max(0, (y - cur.top) / span)));
    a.set(...cur.stop.p); b.set(...nxt.stop.p); wantPos.copy(a).lerp(b, t);
    a.set(...cur.stop.t); b.set(...nxt.stop.t); wantTgt.copy(a).lerp(b, t);
    wantFov = (cur.stop.f || 32) + ((nxt.stop.f || 32) - (cur.stop.f || 32)) * t;
    wantSide = cur.side + (nxt.side - cur.side) * t;
  };

  /* Every stop centres its subject, so a half-width column of text would still
     land on top of it. This slides the whole view sideways — camera and target
     together, so there is no distortion, only a change of framing — by a
     fraction of the visible width at the subject's distance. Moving the eye
     left pushes the subject right, into the half the text has left free. */
  const _right = new THREE.Vector3();
  const _fwd = new THREE.Vector3();
  const _viewPos = new THREE.Vector3();
  const _viewTgt = new THREE.Vector3();
  const FRAME_SHIFT = 0.26; // of half-width, so about a quarter of the frame

  /* Writes the framed eye/target into the scratch pair. The offset must not go
     back into camPos/camTgt — those carry the lerped state, and folding the
     shift into them every frame would make it accumulate and walk the camera
     off the site. */
  const framedView = (shift) => {
    _viewPos.copy(camPos);
    _viewTgt.copy(camTgt);
    if (!shift || innerWidth < 1024) return;
    _fwd.subVectors(camTgt, camPos);
    const dist = _fwd.length();
    if (dist < 0.001) return;
    _fwd.divideScalar(dist);
    _right.crossVectors(_fwd, camera.up).normalize();
    const halfW = Math.tan((fov * Math.PI) / 360) * dist * camera.aspect;
    const off = -shift * halfW * FRAME_SHIFT;
    _viewPos.addScaledVector(_right, off);
    _viewTgt.addScaledVector(_right, off);
  };

  /* If the GPU cannot hold the frame budget at full resolution, step down once
     rather than letting the whole page stutter.

     This judges real frame intervals, not the time `renderer.render` takes to
     return. WebGL submits work asynchronously, so the CPU side of that call
     says almost nothing about GPU cost — timing it could drop the resolution
     on a machine that was keeping up perfectly. Measurement also waits for the
     surfaces to be fully in — both the fetch and the frame-by-frame swap above
     carry a shader compile and a texture upload, and letting that land inside
     the window makes any machine look like a slow GPU. */
  let winMs = 0;
  let winFrames = 0;
  let tuned = false;
  const tune = (dt) => {
    if (tuned || dpr <= 1 || !surfaces || uploads || compiling) return;
    winMs += dt;
    winFrames++;
    if (winMs < 1500) return;
    if (winMs / winFrames > 22) {
      dpr = dpr > 1.5 ? 1.5 : 1;
      renderer.setPixelRatio(dpr);
      resize();
      if (dpr <= 1) tuned = true;
    } else {
      tuned = true;
    }
    winMs = 0;
    winFrames = 0;
  };

  /* Motion runs at the display's own refresh rate. The original capped itself
     to one frame every 32 ms, which is what made the moves and the zoom look
     stepped; the smoothing below is exponential on elapsed time instead of
     per-frame, so the camera travels at exactly the same speed whether the
     screen is 30, 60 or 144 Hz — it just draws more in-between frames. */
  const FOLLOW = 0.14; // per 60 Hz frame, kept from the original
  const SWAY = 0.0009375; // clock units per ms — the original's 0.03 per 32 ms

  /* Every frame is drawn *while anything is moving*, and none are drawn once
     everything has come to rest.

     The distinction matters. An earlier version skipped frames mid-scroll
     whenever the camera briefly counted as "settled" between scroll deltas,
     which delivered roughly every other frame and read as the zoom
     fluctuating. Going quiet at genuine rest is a different thing and costs
     nothing visually — but it is worth a lot, because the glass panels above
     use backdrop-filter, and every frame this canvas paints forces the
     browser to re-blur the backdrop behind every one of them. Idling here
     idles the whole page. */
  const dbg = location.search.includes('stats') ? {} : null;
  const IDLE_GRACE = 900; // keep drawing this long after the last movement
  let clock = 0, prev = 0, raf = 0, alive = true, snapped = false, restMs = 0;
  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden) {
      prev = 0; // do not carry a huge dt back in when the tab returns
      return;
    }
    const dt = prev ? Math.min(now - prev, 64) : 16.667;
    prev = now;

    prepareSurfaces();

    const scrolling = scroll.value !== scrollY;
    followScroll(dt);
    targets();

    if (!snapped) {
      // land on the right stop straight away — on a reload part-way down the
      // page there is nothing to fly in from
      snapped = true;
      scroll.value = scrollY;
      scroll.vel = 0;
      targets();
      camPos.copy(wantPos);
      camTgt.copy(wantTgt);
      zoom.value = fov = wantFov;
      zoom.vel = 0;
      side = wantSide;
    } else {
      const k = 1 - Math.pow(1 - FOLLOW, dt / 16.667);
      camPos.lerp(wantPos, k);
      camTgt.lerp(wantTgt, k);
      side += (wantSide - side) * k;
      /* The zoom gets the spring rather than the lerp the position uses.
         Field of view is the one channel where an eased curve is legible as
         itself: a few degrees of change spread across the whole frame, so any
         kink in its velocity reads as the lens twitching. The lerp has exactly
         that kink built in — it restarts from zero speed every time the target
         moves, which at a section boundary is every frame. Slightly longer
         than the position follow, so the zoom settles just after the move
         lands instead of racing it. */
      fov = stepSpring(zoom, wantFov, ZOOM_TIME, dt / 1000);
    }

    /* Rest detection. The grace period keeps frames flowing for a beat after
       the camera arrives so the settle never clips, then the loop stops
       drawing entirely until the next scroll, resize or texture swap. */
    /* Thresholds are set at the point the eye stops being able to tell, not at
       the point the float stops changing. 2e-5 squared world units is ~4 mm of
       camera travel seen from 50 units away, and 0.004° of field of view is
       nothing — but the exponential tail below them runs for seconds, which is
       seconds of pointless full-page repainting. */
    const posErr = camPos.distanceToSquared(wantPos) + camTgt.distanceToSquared(wantTgt);
    const moving =
      scrolling || posErr > 2e-5 || Math.abs(wantFov - fov) > 0.004 || Math.abs(wantSide - side) > 0.002;
    restMs = moving || needs ? 0 : restMs + dt;
    if (dbg) {
      dbg.restMs = restMs;
      dbg.scrolling = scrolling;
      dbg.camErr = camPos.distanceToSquared(wantPos) + camTgt.distanceToSquared(wantTgt) + Math.abs(wantFov - fov);
      dbg.needs = needs;
      dbg.gap = scrollY - scroll.value;
    }
    if (restMs > IDLE_GRACE) return;

    if (!reduceMotion) clock += dt * SWAY;

    camera.fov = fov;
    camera.updateProjectionMatrix();
    framedView(side);
    camera.position.copy(_viewPos);
    camera.position.y += Math.sin(clock * 0.5) * 0.1;
    camera.position.x += Math.sin(clock * 0.31) * 0.07;
    camera.lookAt(_viewTgt);
    camera.rotation.z += Math.sin(clock * 0.23) * 0.004;
    if (compiling) {
      // Programs are still building. Keep the camera tracking the scroll so it
      // is already in the right place when drawing resumes, but stay off the
      // GPU — rendering now is what would block on the link check.
      needs = true;
      return;
    }
    renderer.render(scene, camera);
    tune(dt);
    needs = false;
  }
  const onScroll = () => { needs = true; };
  addEventListener('scroll', onScroll, { passive: true });
  frame();

  // opt-in diagnostics: append ?stats to the URL and read window.__society
  if (location.search.includes('stats')) window.__society = { renderer, scene, camera, dbg };

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
