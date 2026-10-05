/* Line glyphs for the tiles, drawn on a 24px grid with round caps and joins
   so they sit with the download arrow in the nav. Stroke only — the colour
   comes from `currentColor`, which lets each ground tint them. */
const PATHS = {
  // a speech bubble: the group chat
  chat: (
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17H6.5A2.5 2.5 0 0 1 4 14.5z" />
  ),
  // a bound register
  register: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3v18M12.5 8H16M12.5 12H16" />
    </>
  ),
  // a phone, for dues chased by calling round
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </>
  ),
  // a way in, and nothing written down about it
  entry: (
    <>
      <path d="M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5M15 12H3" />
    </>
  ),
  // a parking sign
  parking: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M10 17V7h3.5a3 3 0 0 1 0 6H10" />
    </>
  ),
  // three stages joined by a line: a status timeline
  timeline: (
    <>
      <circle cx="6" cy="5.5" r="1.8" />
      <circle cx="6" cy="12" r="1.8" />
      <circle cx="6" cy="18.5" r="1.8" />
      <path d="M6 7.3v2.9M6 13.8v2.9M10.5 5.5H19M10.5 12H19M10.5 18.5H15" />
    </>
  ),
  // a shield with a tick: the guard's standing instruction
  shield: (
    <>
      <path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  // a map pin: what is nearby
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  )
};

export default function Glyph({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
