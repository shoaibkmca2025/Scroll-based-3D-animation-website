import { amenityChips } from '../data.js';
import Shot from '../components/Shot.jsx';

export default function Garden() {
  return (
    <section data-ground="paper-warm" className="cn-sec">
      <div className="cn-grid cn-garden">
        <div className="cn-garden-copy">
          <div data-reveal="1" className="cn-kicker cn-kicker--sage cn-mb16">Shared spaces</div>
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
        <div data-reveal="1" className="cn-garden-shots" data-parallax="0.07">
          <Shot img="shots/home" alt="Notices and society tools" sizes="(max-width: 720px) 34vw, 176px" />
          <Shot img="shots/finance" alt="Payment history" sizes="(max-width: 720px) 34vw, 176px" />
        </div>
      </div>
    </section>
  );
}
