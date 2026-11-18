/* A housing society at dusk, drawn rather than photographed.

   Three layers so the hero can move them at different speeds: the far towers,
   the near towers, and the compound wall with its trees in front of the
   phone. The towers carry the details that make them read as Indian
   apartment blocks rather than offices — a balcony band on every floor, a
   lift room and black water tanks on the roof — and their windows come on a
   flat at a time, two windows per flat.

   Deterministic for the same reason as PassQr: a random pattern would change
   on every render. Only lit windows are drawn; the dark ones are the wall. */

const W = 1440;
const H = 440;
const hash = (a, b, c = 0) => ((a * 73856093) ^ (b * 19349663) ^ (c * 83492791)) >>> 0;

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

function Tower({ x, w, h, i, far }) {
  const top = H - h;
  const floor = far ? 16 : 22;
  const floors = Math.floor((h - 14) / floor);
  const pairs = Math.floor((w - 16) / (far ? 26 : 34));
  const pairW = (w - 16) / pairs;
  const parts = [];

  for (let f = 0; f < floors; f++) {
    const y = top + 12 + f * floor;
    // the balcony slab that runs across every floor
    parts.push(<rect key={`b${f}`} className="cn-sky-slab" x={x - 2} y={y + floor - 3} width={w + 4} height="2.5" />);
    for (let p = 0; p < pairs; p++) {
      const n = hash(i + 1, f + 1, p + 1);
      if (n % 100 >= 30) continue;
      const wx = x + 8 + p * pairW + pairW * 0.12;
      const ww = (pairW * 0.76 - 3) / 2;
      // spread over two seconds, so the society comes on gradually
      // fill-opacity, not opacity: the switch-on animation owns opacity
      const style = { animationDelay: `${300 + (n % 1800)}ms`, fillOpacity: n % 3 ? 1 : 0.65 };
      parts.push(
        <g key={`w${f}-${p}`} className={n % 11 ? 'cn-sky-win' : 'cn-sky-win cn-sky-win--tv'} style={style}>
          <rect x={wx} y={y + 3} width={ww} height={floor - 9} rx="1" />
          <rect x={wx + ww + 3} y={y + 3} width={ww} height={floor - 9} rx="1" />
        </g>
      );
    }
  }

  return (
    <g>
      <rect className="cn-sky-body" x={x} y={top} width={w} height={h} />
      {/* lift machine room and the water tanks every Indian rooftop has */}
      <rect className="cn-sky-body" x={x + w * 0.56} y={top - 14} width={w * 0.24} height="14" />
      <rect className="cn-sky-body" x={x + w * 0.14} y={top - 11} width="15" height="11" rx="4" />
      <rect className="cn-sky-body" x={x + w * 0.14 + 19} y={top - 11} width="15" height="11" rx="4" />
      {parts}
    </g>
  );
}

// trees along the compound wall, as clumps of overlapping canopies
const TREES = [40, 230, 380, 470, 1000, 1110, 1290, 1400];

export default function Skyline({ layer }) {
  if (layer === 'front') {
    return (
      <svg className="cn-sky-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
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

  const far = layer === 'far';
  return (
    <svg className="cn-sky-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {TOWERS[layer].map(([x, w, h], i) => (
        <Tower key={x} x={x} w={w} h={h} i={far ? i + 40 : i} far={far} />
      ))}
    </svg>
  );
}
