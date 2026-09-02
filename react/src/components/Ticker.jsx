/* A slow band of everything the product covers, running between sections.

   The set is rendered twice and the strip is translated by exactly -50%, so
   the second copy is where the first one was when the loop restarts and the
   seam never shows. It pauses on hover, because a moving list that cannot be
   read is decoration rather than content. */
const ITEMS = [
  'Visitor gate passes',
  'Household staff attendance',
  'Maintenance dues',
  'UPI collection',
  'Amenity booking',
  'Complaints timeline',
  'Notices & events',
  'Parking map',
  'SOS to the gate',
  'Committee roles',
  'Member directory',
  'Community funds'
];

export default function Ticker() {
  const set = (
    <div className="cn-ticker-set" aria-hidden="true">
      {ITEMS.map((t) => (
        <span key={t}>{t}</span>
      ))}
    </div>
  );
  return (
    <div className="cn-ticker">
      <div className="cn-ticker-run">
        {set}
        {set}
      </div>
    </div>
  );
}
