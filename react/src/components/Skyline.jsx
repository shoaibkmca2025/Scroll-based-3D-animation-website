/* A housing society at dusk, drawn rather than photographed.

   Three layers so the hero can move them at different speeds: the far towers,
   the near towers, and the compound wall with its trees in front of the
   phone. The towers carry the details that make them read as Indian
   apartment blocks rather than offices — a balcony band on every floor, a
   lift room and black water tanks on the roof — and their windows come on a
   flat at a time, two windows per flat.

   Each layer is drawn as a few long paths rather than a rect per window: it
   was 1,200 SVG nodes and 300 separate switch-on animations, which iPhones
   felt for the first seconds of every visit. Now the lit windows are three
   batches per layer, and each batch switches on as one.

   Deterministic: a random pattern would differ between the prerendered HTML
   and the browser, and change on every render. Only lit windows are drawn;
   the dark ones are the wall. */

const W = 1440;
const H = 440;
const hash = (a, b, c = 0) => ((a * 73856093) ^ (b * 19349663) ^ (c * 83492791)) >>> 0;
const r1 = (v) => Math.round(v * 10) / 10;
const box = (x, y, w, h) => `M${r1(x)} ${r1(y)}h${r1(w)}v${r1(h)}h${r1(-w)}z`;

// [x, width, height] on a 1440 × 440 canvas, standing on its bottom edge
const TOWERS = {
  far: [
    [30, 110, 330], [190, 92, 280], [400, 124, 400], [600, 100, 310],
    [820, 132, 420], [1000, 104, 336], [1170, 120, 372], [1330, 112, 300]
  ],
  near: [
    [-20, 150, 290], [150, 118, 220], [296, 168, 350], [516, 128, 250],
    [700, 156, 320], [898, 118, 240], [1048, 170, 376], [1250, 140, 286], [1384, 120, 236]
  ]
};

function draw(layer) {
  const far = layer === 'far';
  const floor = far ? 16 : 22;
  let body = '';
  let slab = '';
  const tanks = [];
  // three switch-on batches, each in three tones
  const lit = [0, 1, 2].map(() => ({ warm: '', dim: '', tv: '' }));

  TOWERS[layer].forEach(([x, w, h], t) => {
    const id = far ? t + 40 : t;
    const top = H - h;
    // the tower and its lift machine room
    body += box(x, top, w, h) + box(x + w * 0.56, top - 14, w * 0.24, 14);
    tanks.push([x + w * 0.14, top - 11], [x + w * 0.14 + 19, top - 11]);

    const floors = Math.floor((h - 14) / floor);
    const pairs = Math.floor((w - 16) / (far ? 26 : 34));
    const pairW = (w - 16) / pairs;
    for (let f = 0; f < floors; f++) {
      const y = top + 12 + f * floor;
      // the balcony slab that runs across every floor
      slab += box(x - 2, y + floor - 3, w + 4, 2.5);
      for (let p = 0; p < pairs; p++) {
        const n = hash(id + 1, f + 1, p + 1);
        if (n % 100 >= 30) continue;
        const wx = x + 8 + p * pairW + pairW * 0.12;
        const ww = (pairW * 0.76 - 3) / 2;
        const tone = n % 11 === 0 ? 'tv' : n % 3 === 0 ? 'dim' : 'warm';
        lit[(n >>> 5) % 3][tone] += box(wx, y + 3, ww, floor - 9) + box(wx + ww + 3, y + 3, ww, floor - 9);
      }
    }
  });
  return { body, slab, tanks, lit };
}

// computed once, at import
const DRAWN = { far: draw('far'), near: draw('near') };
const TREES = [40, 230, 380, 470, 1000, 1110, 1290, 1400];

export default function Skyline({ layer }) {
  if (layer === 'front') {
    return (
      <svg className="cn-sky-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        {/* trees along the compound wall, as clumps of overlapping canopies */}
        {TREES.map((tx, i) => {
          const r = 26 + (hash(i + 3, 7) % 22);
          return (
            <g key={tx} className="cn-sky-tree">
              <circle cx={tx} cy={H - 24 - r * 0.7} r={r} />
              <circle cx={tx - r * 0.75} cy={H - 24 - r * 0.35} r={r * 0.7} />
              <circle cx={tx + r * 0.8} cy={H - 24 - r * 0.4} r={r * 0.75} />
            </g>
          );
        })}
        <rect className="cn-sky-wall" x="0" y={H - 26} width={W} height="26" />
        {/* the coping along the top of the wall, catching the glow */}
        <rect className="cn-sky-slab" x="0" y={H - 26} width={W} height="2" />
      </svg>
    );
  }

  const { body, slab, tanks, lit } = DRAWN[layer];
  return (
    <svg className="cn-sky-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path className="cn-sky-body" d={body} />
      {/* the black water tanks every Indian rooftop has */}
      {tanks.map(([x, y]) => (
        <rect key={`${x}-${y}`} className="cn-sky-body" x={r1(x)} y={y} width="15" height="11" rx="4" />
      ))}
      <path className="cn-sky-slab" d={slab} />
      {lit.map((b, i) => (
        // spread over two seconds, so the society comes on gradually
        <g key={i} className="cn-sky-win" style={{ animationDelay: `${300 + i * 550}ms` }}>
          <path d={b.warm} />
          <path className="cn-sky-dim" d={b.dim} />
          <path className="cn-sky-tv" d={b.tv} />
        </g>
      ))}
    </svg>
  );
}
