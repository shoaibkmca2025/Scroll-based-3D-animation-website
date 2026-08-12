import { amenityChips } from '../data.js';

export default function Garden() {
  return (
    <section data-cam="garden" className="cn-sec">
      <div className="cn-grid cn-garden">
        <div className="cn-garden-copy cn-surface cn-surface--sage">
          <div data-reveal="1" className="cn-kicker cn-kicker--sage cn-mb16">
            Shared spaces
          </div>
          <h2 data-reveal="1">The clubhouse, the garden, the gym — booked, not argued over.</h2>
          <p data-reveal="1">
            Amenity booking with conflict detection, and approval where the committee wants it.
            Events and notices sit alongside, with RSVPs and paid events handled in the same place.
          </p>
          <ul data-reveal="1" className="cn-chips">
            {amenityChips.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <div data-reveal="1" className="cn-garden-shots">
          <img src="screens/11-amenities.png" alt="Amenities" width="1170" height="2532" loading="lazy" />
          <img src="screens/09-events.png" alt="Events" width="1170" height="2532" loading="lazy" />
        </div>
      </div>
    </section>
  );
}
