/* A QR stand-in.

   The previous version was a checkerboard of two repeating gradients, which
   reads as texture rather than as a code. What actually makes a square of
   noise legible as a QR is the three finder squares in the corners — so those
   are drawn properly and the payload is deterministic noise around them.

   Deterministic on purpose: a random fill would change on every render and
   make the pass look like it was still loading. */
const FINDERS = [
  [0, 0],
  [14, 0],
  [0, 14]
];

function isFinder(x, y) {
  return FINDERS.some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
}

export default function PassQr({ modules = 21 }) {
  const cells = [];
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      if (isFinder(x, y)) continue;
      // a cheap hash so the pattern is stable but looks unstructured
      const h = (x * 73856093) ^ (y * 19349663) ^ ((x + y) * 83492791);
      if ((h >>> 3) % 100 < 46) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
    }
  }
  return (
    <svg className="cn-qr" viewBox={`-1 -1 ${modules + 2} ${modules + 2}`} aria-hidden="true">
      <g fill="currentColor">{cells}</g>
      {FINDERS.map(([fx, fy]) => (
        <g key={`${fx}-${fy}`} transform={`translate(${fx} ${fy})`}>
          <rect width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1" />
          <rect x="2" y="2" width="3" height="3" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}
