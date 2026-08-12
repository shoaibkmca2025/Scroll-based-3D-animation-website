import * as THREE from 'https://unpkg.com/three@0.184.0/build/three.module.js';

// ── procedural texture helpers (no external assets) ───────────────────
function noiseTex(base, spread, cell, rep, mono) {
  const N = 256, c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, N, N);
  for (let i = 0; i < (N * N) / (cell * cell) * 2.2; i++) {
    const v = (Math.random() - 0.5) * spread;
    const w = 255 * (mono ? 1 : 0.85);
    g.fillStyle = 'rgba(' + (v > 0 ? w : 0) + ',' + (v > 0 ? w : 0) + ',' + (v > 0 ? w : 0) + ',' + Math.abs(v).toFixed(3) + ')';
    g.fillRect(Math.random() * N, Math.random() * N, cell, cell);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep, rep);
  t.anisotropy = 4;
  return t;
}

function skyTexture() {
  const W = 1024, H = 512, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0.00, '#2f6ea8');
  sky.addColorStop(0.34, '#77aad3');
  sky.addColorStop(0.52, '#c9dcea');
  sky.addColorStop(0.60, '#e8e3d8');
  sky.addColorStop(1.00, '#b9ab93');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  const sun = g.createRadialGradient(W * 0.24, H * 0.2, 0, W * 0.24, H * 0.2, H * 0.5);
  sun.addColorStop(0, 'rgba(255,246,224,0.95)');
  sun.addColorStop(0.25, 'rgba(255,238,205,0.35)');
  sun.addColorStop(1, 'rgba(255,238,205,0)');
  g.fillStyle = sun; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 34; i++) {
    const x = Math.random() * W, y = H * (0.06 + Math.random() * 0.34);
    const rw = 40 + Math.random() * 150, rh = rw * (0.18 + Math.random() * 0.16);
    const cl = g.createRadialGradient(x, y, 0, x, y, rw);
    const al = 0.16 + Math.random() * 0.4;
    cl.addColorStop(0, 'rgba(255,255,255,' + al.toFixed(2) + ')');
    cl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = cl;
    g.save(); g.translate(x, y); g.scale(1, rh / rw); g.beginPath();
    g.arc(0, 0, rw, 0, Math.PI * 2); g.fill(); g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}

const T = {
  plaster: noiseTex('#efe4d1', 0.16, 3, 5),
  slab: noiseTex('#d9d0c0', 0.2, 3, 4),
  road: noiseTex('#8f887b', 0.34, 2, 9),
  grass: noiseTex('#8a9c6d', 0.42, 3, 7),
  sand: noiseTex('#ddc498', 0.3, 2, 6),
  clay: noiseTex('#b96633', 0.2, 3, 3)
};

const M = {
  ground: new THREE.MeshStandardMaterial({ name: 'ground', color: 0xd8cdb6, roughness: 0.98 }),
  grass: new THREE.MeshStandardMaterial({ name: 'grass', color: 0x93a578, roughness: 0.96 }),
  sand: new THREE.MeshStandardMaterial({ name: 'sand', color: 0xe0c79b, roughness: 1 }),
  road: new THREE.MeshStandardMaterial({ name: 'road', color: 0x8d867a, roughness: 0.88 }),
  wall: new THREE.MeshStandardMaterial({ name: 'plaster', color: 0xf4ead8, roughness: 0.82 }),
  trim: new THREE.MeshStandardMaterial({ name: 'terracotta', color: 0xc67139, roughness: 0.62 }),
  deep: new THREE.MeshStandardMaterial({ name: 'clay-dark', color: 0x8c491a, roughness: 0.66 }),
  glass: new THREE.MeshStandardMaterial({ name: 'glass', color: 0x1f2b33, roughness: 0.06, metalness: 0.2, envMapIntensity: 2.4 }),
  slab: new THREE.MeshStandardMaterial({ name: 'slab', color: 0xdcd3c4, roughness: 0.9 }),
  leaf: new THREE.MeshStandardMaterial({ name: 'foliage', color: 0x6f8253, roughness: 0.95, flatShading: true }),
  leaf2: new THREE.MeshStandardMaterial({ name: 'foliage-warm', color: 0x87965f, roughness: 0.95, flatShading: true }),
  bark: new THREE.MeshStandardMaterial({ name: 'bark', color: 0x5c5347, roughness: 1 }),
  metal: new THREE.MeshStandardMaterial({ name: 'metal', color: 0xb3aa99, roughness: 0.3, metalness: 0.9, envMapIntensity: 1.6 }),
  red: new THREE.MeshStandardMaterial({ name: 'signal-red', color: 0xa72608, roughness: 0.45 }),
  water: new THREE.MeshStandardMaterial({ name: 'water', color: 0x4f7f96, roughness: 0.04, metalness: 0.35, envMapIntensity: 2.2 })
};

function box(w, h, d, mat, x, y, z, name) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  m.name = name || 'box';
  return m;
}
function cyl(rt, rb, h, mat, x, y, z, seg, name) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 24), mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  m.name = name || 'cyl';
  return m;
}

function tower(w, d, floors, x, z, name) {
  const g = new THREE.Group();
  g.name = name;
  const fh = 2.6, h = floors * fh;
  g.add(box(w, h, d, M.wall, 0, h / 2, 0, name + '-shell'));
  g.add(box(w + 0.5, 0.35, d + 0.5, M.trim, 0, h + 0.18, 0, name + '-cornice'));
  g.add(box(w * 0.34, h, 0.5, M.deep, -w * 0.24, h / 2, d / 2 + 0.02, name + '-stripe'));

  const winGeo = new THREE.BoxGeometry(1.15, 1.0, 0.14);
  const perRow = Math.max(2, Math.floor(w / 2.1));
  const total = floors * perRow * 2;
  const inst = new THREE.InstancedMesh(winGeo, M.glass, total);
  inst.name = name + '-windows';
  const dummy = new THREE.Object3D();
  let i = 0;
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < perRow; c++) {
      const px = -w / 2 + w * ((c + 0.5) / perRow);
      const py = f * fh + fh * 0.55;
      dummy.position.set(px, py, d / 2 + 0.04); dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix(); inst.setMatrixAt(i++, dummy.matrix);
      dummy.position.set(w / 2 + 0.04, py, -d / 2 + d * ((c + 0.5) / perRow));
      dummy.rotation.set(0, Math.PI / 2, 0);
      dummy.updateMatrix(); inst.setMatrixAt(i++, dummy.matrix);
    }
  }
  inst.instanceMatrix.needsUpdate = true;
  g.add(inst);

  for (let f = 1; f < floors; f += 1) {
    const b = box(w * 0.42, 0.12, 1.1, M.slab, w * 0.22, f * fh + 0.1, d / 2 + 0.5, name + '-balcony');
    g.add(b);
    g.add(box(w * 0.42, 0.7, 0.08, M.trim, w * 0.22, f * fh + 0.45, d / 2 + 1.0, name + '-rail'));
  }
  g.position.set(x, 0, z);
  return g;
}

function tree(x, z, s) {
  const g = new THREE.Group();
  g.name = 'tree';
  g.add(cyl(0.16 * s, 0.22 * s, 1.6 * s, M.bark, 0, 0.8 * s, 0, 10, 'trunk'));
  const c1 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05 * s, 1), M.leaf);
  c1.position.y = 2.3 * s; c1.name = 'canopy';
  const c2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72 * s, 1), M.leaf);
  c2.position.set(0.6 * s, 1.85 * s, 0.35 * s); c2.name = 'canopy';
  g.add(c1, c2);
  g.position.set(x, 0, z);
  return g;
}

class Society3D extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    const host = this;
    host.style.display = 'block';
    Object.assign(host.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.3));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block' });

    const scene = new THREE.Scene();
    const sky = skyTexture();
    scene.background = sky;
    scene.fog = new THREE.Fog(0xd6cdba, 90, 260);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 500);

    scene.add(new THREE.HemisphereLight(0xe8f0fa, 0x9a8f77, 0.95));
    const sun = new THREE.DirectionalLight(0xfff0d6, 2.35);
    sun.position.set(38, 42, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    const c = sun.shadow.camera;
    c.left = -46; c.right = 46; c.top = 46; c.bottom = -46; c.near = 1; c.far = 160;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xbcd2ea, 0.42);
    fill.position.set(-30, 18, -20);
    scene.add(fill);

    const world = new THREE.Group();
    world.name = 'society';
    scene.add(world);

    const plot = new THREE.Mesh(new THREE.CircleGeometry(78, 64), M.ground);
    plot.rotation.x = -Math.PI / 2; plot.receiveShadow = true; plot.name = 'ground';
    world.add(plot);

    // internal road: a ring drive
    const ring = new THREE.Mesh(new THREE.RingGeometry(17, 21, 64), M.road);
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; ring.receiveShadow = true; ring.name = 'drive';
    world.add(ring);
    const spur = box(5, 0.04, 16, M.road, 0, 0.02, 26, 'entry-road');
    world.add(spur);

    // boundary wall — one instanced mesh instead of 64 draw calls
    {
      const N = 64, r = 33;
      const panels = [], piers = [];
      for (let a = 0; a < N; a++) {
        const th = (a / N) * Math.PI * 2;
        if (Math.abs(th - Math.PI / 2) < 0.16) continue;
        (a % 4 === 0 ? piers : panels).push(th);
      }
      const dummy = new THREE.Object3D();
      const mk = (list, geo, mat, name) => {
        const im = new THREE.InstancedMesh(geo, mat, list.length);
        im.name = name; im.castShadow = true; im.receiveShadow = true;
        list.forEach((th, i) => {
          dummy.position.set(Math.cos(th) * r, 1, Math.sin(th) * r);
          dummy.rotation.set(0, -th + Math.PI / 2, 0);
          dummy.updateMatrix();
          im.setMatrixAt(i, dummy.matrix);
        });
        im.instanceMatrix.needsUpdate = true;
        return im;
      };
      world.add(mk(panels, new THREE.BoxGeometry(3.4, 2.0, 0.5), M.wall, 'boundary-wall'));
      world.add(mk(piers, new THREE.BoxGeometry(3.4, 2.3, 0.62), M.trim, 'boundary-piers'));
    }

    // ── GATE ──────────────────────────────────────────
    const gate = new THREE.Group(); gate.name = 'gate'; gate.position.set(0, 0, 33);
    gate.add(box(1.5, 5.2, 1.5, M.wall, -4.4, 2.6, 0, 'gate-pillar-l'));
    gate.add(box(1.5, 5.2, 1.5, M.wall, 4.4, 2.6, 0, 'gate-pillar-r'));
    gate.add(box(1.9, 0.6, 1.9, M.trim, -4.4, 5.4, 0, 'gate-cap-l'));
    gate.add(box(1.9, 0.6, 1.9, M.trim, 4.4, 5.4, 0, 'gate-cap-r'));
    gate.add(box(10.6, 1.2, 0.6, M.deep, 0, 5.9, 0, 'gate-arch'));
    const barrier = box(7.6, 0.28, 0.28, M.red, 3.4, 1.5, 1.6, 'boom-barrier');
    barrier.rotation.z = -0.06;
    gate.add(barrier);
    gate.add(cyl(0.3, 0.34, 1.5, M.metal, -0.4, 0.75, 1.6, 16, 'barrier-post'));
    const cabin = new THREE.Group(); cabin.name = 'guard-cabin'; cabin.position.set(-7.6, 0, 1.4);
    cabin.add(box(3.4, 3.0, 3.0, M.wall, 0, 1.5, 0, 'cabin-shell'));
    cabin.add(box(3.9, 0.35, 3.5, M.trim, 0, 3.1, 0, 'cabin-roof'));
    cabin.add(box(2.4, 1.2, 0.12, M.glass, 0, 1.9, 1.52, 'cabin-window'));
    gate.add(cabin);
    world.add(gate);

    // ── TOWERS ────────────────────────────────────────
    world.add(tower(9, 9, 7, -11, -7, 'wing-a'));
    world.add(tower(9, 9, 9, 11, -7, 'wing-b'));
    const central = tower(10.5, 10.5, 11, 0, -20, 'wing-c');
    world.add(central);

    // rooftop of central tower
    const roof = new THREE.Group(); roof.name = 'roof-deck'; roof.position.set(0, 11 * 2.6 + 0.35, -20);
    roof.add(cyl(1.5, 1.5, 2.4, M.water, -3.2, 1.2, 2.2, 24, 'water-tank'));
    roof.add(cyl(1.6, 1.6, 0.25, M.metal, -3.2, 2.5, 2.2, 24, 'tank-lid'));
    for (let i = 0; i < 4; i++) {
      const p = box(2.6, 0.12, 1.5, M.glass, 1.4 + (i % 2) * 3, 0.6, -2 + Math.floor(i / 2) * 2.2, 'solar-panel');
      p.rotation.x = -0.3;
      roof.add(p);
    }
    roof.add(box(10.5, 0.6, 0.25, M.trim, 0, 0.3, 5.1, 'parapet-s'));
    roof.add(box(10.5, 0.6, 0.25, M.trim, 0, 0.3, -5.1, 'parapet-n'));
    roof.add(box(0.25, 0.6, 10.5, M.trim, 5.1, 0.3, 0, 'parapet-e'));
    roof.add(box(0.25, 0.6, 10.5, M.trim, -5.1, 0.3, 0, 'parapet-w'));
    world.add(roof);

    // ── GARDEN (west) ─────────────────────────────────
    const garden = new THREE.Group(); garden.name = 'garden'; garden.position.set(-24, 0, 8);
    const lawn = new THREE.Mesh(new THREE.CircleGeometry(9.5, 48), M.grass);
    lawn.rotation.x = -Math.PI / 2; lawn.position.y = 0.03; lawn.receiveShadow = true; lawn.name = 'lawn';
    garden.add(lawn);
    const path = new THREE.Mesh(new THREE.RingGeometry(4.6, 5.6, 40), M.sand);
    path.rotation.x = -Math.PI / 2; path.position.y = 0.05; path.receiveShadow = true; path.name = 'garden-path';
    garden.add(path);
    [[-5, -4, 1.15], [4.5, -5, 0.95], [6, 3.5, 1.25], [-6, 4, 1.0], [0, -7.5, 0.85]].forEach((t) => garden.add(tree(t[0], t[1], t[2])));
    for (let i = 0; i < 4; i++) {
      const th = i * Math.PI / 2 + 0.4;
      const b = box(1.9, 0.16, 0.6, M.bark, Math.cos(th) * 6.6, 0.55, Math.sin(th) * 6.6, 'bench');
      b.rotation.y = -th;
      garden.add(b);
      const l = box(1.9, 0.6, 0.12, M.bark, Math.cos(th) * 6.6, 0.85, Math.sin(th) * 6.6, 'bench-back');
      l.rotation.y = -th;
      garden.add(l);
    }
    garden.add(cyl(1.9, 2.3, 0.7, M.slab, 0, 0.35, 0, 32, 'fountain-base'));
    garden.add(cyl(1.5, 1.5, 0.12, M.water, 0, 0.72, 0, 32, 'fountain-water'));
    world.add(garden);

    // ── PLAY AREA (east) ──────────────────────────────
    const play = new THREE.Group(); play.name = 'play-area'; play.position.set(25, 0, 7);
    const pit = new THREE.Mesh(new THREE.CircleGeometry(8, 40), M.sand);
    pit.rotation.x = -Math.PI / 2; pit.position.y = 0.03; pit.receiveShadow = true; pit.name = 'sand-pit';
    play.add(pit);
    const slide = new THREE.Group(); slide.name = 'slide'; slide.position.set(-2.6, 0, -1);
    slide.add(box(2.0, 0.16, 2.0, M.trim, 0, 2.2, 0, 'slide-platform'));
    [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]].forEach((p, i) => slide.add(cyl(0.09, 0.09, 2.2, M.metal, p[0], 1.1, p[1], 10, 'slide-leg-' + i)));
    const chute = box(1.0, 0.12, 4.2, M.red, 0, 1.35, 2.6, 'chute');
    chute.rotation.x = 0.55;
    slide.add(chute);
    play.add(slide);
    const swing = new THREE.Group(); swing.name = 'swing-set'; swing.position.set(3.2, 0, 1.4);
    swing.add(box(0.16, 2.6, 0.16, M.metal, -1.8, 1.3, 0, 'swing-post-l'));
    swing.add(box(0.16, 2.6, 0.16, M.metal, 1.8, 1.3, 0, 'swing-post-r'));
    swing.add(box(4.0, 0.16, 0.16, M.metal, 0, 2.6, 0, 'swing-beam'));
    [-0.9, 0.9].forEach((sx, i) => {
      swing.add(box(0.06, 1.5, 0.06, M.metal, sx - 0.3, 1.85, 0, 'chain-a' + i));
      swing.add(box(0.06, 1.5, 0.06, M.metal, sx + 0.3, 1.85, 0, 'chain-b' + i));
      swing.add(box(0.85, 0.1, 0.35, M.trim, sx, 1.1, 0, 'swing-seat-' + i));
    });
    play.add(swing);
    play.add(cyl(0.5, 0.5, 0.35, M.deep, -0.4, 0.18, 3.4, 20, 'spring-base'));
    world.add(play);

    // ── PARKING ───────────────────────────────────────
    const park = new THREE.Group(); park.name = 'parking'; park.position.set(0, 0, 14);
    park.add(box(26, 0.06, 7, M.road, 0, 0.04, 0, 'parking-slab'));
    for (let i = -5; i <= 5; i++) park.add(box(0.12, 0.02, 6.4, M.slab, i * 2.3, 0.08, 0, 'bay-line'));
    [[-8.1, 0xc67139], [-3.4, 0x645c50], [1.2, 0xa72608], [8.0, 0x8fa073]].forEach((v, i) => {
      const carMat = new THREE.MeshStandardMaterial({ name: 'car-paint-' + i, color: v[1], roughness: 0.35, metalness: 0.5 });
      const car = new THREE.Group(); car.name = 'car-' + i;
      car.add(box(1.85, 0.72, 4.1, carMat, 0, 0.62, 0, 'car-body'));
      car.add(box(1.6, 0.6, 2.1, M.glass, 0, 1.25, -0.15, 'car-cabin'));
      [[-0.92, 1.4], [0.92, 1.4], [-0.92, -1.4], [0.92, -1.4]].forEach((w, j) => {
        const wheel = cyl(0.34, 0.34, 0.22, M.bark, w[0], 0.34, w[1], 14, 'wheel-' + j);
        wheel.rotation.z = Math.PI / 2;
        car.add(wheel);
      });
      car.position.set(v[0], 0, 0);
      park.add(car);
    });
    world.add(park);

    // ── CLUBHOUSE + POOL (north-west) ─────────────────
    const club = new THREE.Group(); club.name = 'clubhouse'; club.position.set(-25, 0, -15);
    club.add(box(12, 5, 8, M.wall, 0, 2.5, 0, 'clubhouse-shell'));
    club.add(box(13, 0.5, 9, M.trim, 0, 5.2, 0, 'clubhouse-roof'));
    club.add(box(9, 2.2, 0.2, M.glass, 0, 2.6, 4.02, 'clubhouse-glazing'));
    [-4.4, -1.5, 1.5, 4.4].forEach((px, i) => club.add(cyl(0.28, 0.32, 3.4, M.slab, px, 1.7, 5.4, 12, 'portico-col-' + i)));
    club.add(box(12, 0.35, 3.2, M.trim, 0, 3.5, 5.4, 'portico-beam'));
    club.add(box(14, 0.12, 4, M.slab, 0, 0.06, 6.6, 'clubhouse-plinth'));
    world.add(club);

    const poolG = new THREE.Group(); poolG.name = 'pool'; poolG.position.set(-25, 0, -27);
    poolG.add(box(16, 0.1, 11, M.slab, 0, 0.05, 0, 'pool-deck'));
    poolG.add(box(11, 0.5, 6.5, M.water, 0, 0.16, 0, 'pool-water'));
    poolG.add(box(11.8, 0.24, 7.3, M.neutralEdge || M.slab, 0, 0.1, 0, 'pool-coping'));
    [[-6.4, 3.6], [6.4, 3.6], [-6.4, -3.6], [6.4, -3.6]].forEach((p, i) => {
      const lo = box(1.9, 0.12, 0.8, M.trim, p[0], 0.42, p[1], 'lounger-' + i);
      lo.rotation.z = 0.12;
      poolG.add(lo);
    });
    poolG.add(cyl(0.12, 0.12, 2.6, M.metal, 5.2, 1.3, 0, 10, 'pool-post'));
    world.add(poolG);

    // ── COMMUNITY HALL (north-east) ───────────────────
    const hall = new THREE.Group(); hall.name = 'community-hall'; hall.position.set(25, 0, -17);
    hall.add(box(13, 6, 9.5, M.wall, 0, 3, 0, 'hall-shell'));
    const gable = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 5.6, 2.6, 3), M.deep);
    gable.rotation.y = Math.PI / 4; gable.position.set(0, 7.2, 0);
    gable.scale.set(1.25, 1, 0.92); gable.castShadow = true; gable.name = 'hall-roof';
    hall.add(gable);
    hall.add(box(3.2, 3.4, 0.2, M.deep, 0, 1.7, -4.8, 'hall-door'));
    [-4, 0, 4].forEach((px, i) => hall.add(box(1.6, 2.2, 0.16, M.glass, px, 3.4, 4.8, 'hall-window-' + i)));
    hall.add(box(15, 0.12, 4, M.slab, 0, 0.06, -7, 'hall-forecourt'));
    world.add(hall);

    // notice board by the gate
    const notice = new THREE.Group(); notice.name = 'notice-board'; notice.position.set(7.5, 0, 27);
    notice.add(box(0.2, 1.6, 0.2, M.metal, -1.3, 0.8, 0, 'notice-leg-l'));
    notice.add(box(0.2, 1.6, 0.2, M.metal, 1.3, 0.8, 0, 'notice-leg-r'));
    notice.add(box(3.2, 2.0, 0.16, M.wall, 0, 2.4, 0, 'notice-face'));
    notice.add(box(3.5, 0.28, 0.4, M.trim, 0, 3.5, 0, 'notice-hood'));
    world.add(notice);

    [[-30, -4, 1.3], [30, -4, 1.2], [-16, -30, 1.1], [14, -30, 1.35], [-14, 22, 1.0], [16, 22, 1.05]].forEach((t) => world.add(tree(t[0], t[1], t[2])));

    // ── CAMERA STOPS ──────────────────────────────────
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

    {
      const dummy = new THREE.Object3D();
      const lampPos = [];
      for (let i = 0; i < 10; i++) {
        const th = (i / 10) * Math.PI * 2 + 0.3;
        lampPos.push([Math.cos(th) * 22.6, Math.sin(th) * 22.6]);
      }
      const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.13, 4.6, 8), M.metal, lampPos.length);
      poles.name = 'street-lamp-poles'; poles.castShadow = true;
      const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.16, 0.34), M.slab, lampPos.length);
      heads.name = 'street-lamp-heads';
      lampPos.forEach((p, i) => {
        dummy.position.set(p[0], 2.3, p[1]); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
        poles.setMatrixAt(i, dummy.matrix);
        dummy.position.set(p[0], 4.7, p[1]); dummy.rotation.set(0, Math.atan2(p[0], p[1]), 0); dummy.updateMatrix();
        heads.setMatrixAt(i, dummy.matrix);
      });
      poles.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
      world.add(poles, heads);

      const acPos = [];
      [[-11, -7, 9, 7], [11, -7, 9, 9], [0, -20, 10.5, 11]].forEach((t) => {
        for (let f = 1; f < t[3]; f++) {
          acPos.push([t[0] - t[2] * 0.3, f * 2.6 + 1.5, t[1] + t[2] / 2 + 0.2]);
          if (f % 2 === 0) acPos.push([t[0] + t[2] / 2 + 0.2, f * 2.6 + 1.5, t[1] + t[2] * 0.2, 1]);
        }
      });
      const acs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.78, 0.5, 0.4), M.slab, acPos.length);
      acs.name = 'ac-units'; acs.castShadow = true;
      acPos.forEach((p, i) => {
        dummy.position.set(p[0], p[1], p[2]);
        dummy.rotation.set(0, p[3] ? Math.PI / 2 : 0, 0);
        dummy.updateMatrix(); acs.setMatrixAt(i, dummy.matrix);
      });
      acs.instanceMatrix.needsUpdate = true;
      world.add(acs);
    }

    const kerbOuter = new THREE.Mesh(new THREE.RingGeometry(21, 21.5, 64), M.slab);
    kerbOuter.rotation.x = -Math.PI / 2; kerbOuter.position.y = 0.09; kerbOuter.name = 'kerb-outer';
    const kerbInner = new THREE.Mesh(new THREE.RingGeometry(16.5, 17, 64), M.slab);
    kerbInner.rotation.x = -Math.PI / 2; kerbInner.position.y = 0.09; kerbInner.name = 'kerb-inner';
    world.add(kerbOuter, kerbInner);

    world.updateMatrixWorld(true);
    world.matrixWorldAutoUpdate = false;

    const camPos = new THREE.Vector3(...STOPS.wide.p);
    const camTgt = new THREE.Vector3(...STOPS.wide.t);
    const wantPos = camPos.clone();
    const wantTgt = camTgt.clone();
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    let fov = STOPS.wide.f, wantFov = fov;
    let needs = true;

    function resize() {
      const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      needs = true;
    }
    new ResizeObserver(resize).observe(host);
    resize();

    const ease = (t) => t * t * (3 - 2 * t);

    // cached section table — rebuilt on layout change, never per frame
    let table = [];
    function build() {
      table = Array.from(document.querySelectorAll('[data-cam]')).map((el) => ({
        top: el.getBoundingClientRect().top + scrollY,
        stop: STOPS[el.dataset.cam] || STOPS.wide
      })).sort((x, y) => x.top - y.top);
      needs = true;
    }
    build();
    addEventListener('resize', build);
    addEventListener('load', build);
    setTimeout(build, 1400);

    function targets() {
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
    }

    let lastY = -1, clock = 0, lastT = 0;
    function frame(now) {
      requestAnimationFrame(frame);
      const settled = camPos.distanceToSquared(wantPos) + camTgt.distanceToSquared(wantTgt) + Math.abs(wantFov - fov) < 0.0006;
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
      renderer.render(scene, camera);
      needs = false;
    }
    addEventListener('scroll', () => { needs = true; }, { passive: true });
    frame();
  }
}

if (!customElements.get('society-3d')) customElements.define('society-3d', Society3D);
