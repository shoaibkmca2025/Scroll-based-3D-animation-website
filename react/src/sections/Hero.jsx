import Glyph from '../components/Glyph.jsx';
import Shot from '../components/Shot.jsx';
import Skyline from '../components/Skyline.jsx';

/* An evening in the society, and the app it runs on.

   The towers light up a flat at a time, the phone rises out of the compound,
   and the things that happen in a society every evening arrive around it as
   notifications — a guest at the gate, dues paid, a notice, the cook checking
   in. Every layer moves at its own speed as the page scrolls (`--drift`, see
   .cn-depth in app.css), which is where the depth comes from; nothing locks
   the scroll. */
const NOTES = [
  { icon: 'entry', tag: 'Gate', time: 'now', title: 'Ravi Kulkarni is at the gate', body: 'Guest for B-1204 · approved by Meera', drift: '-150px' },
  { icon: 'rupee', tag: 'Maintenance', time: '2m ago', title: '₹3,500 received from A-302', body: 'October dues · receipt sent', drift: '-60px' },
  { icon: 'notice', tag: 'Notice', time: '1h ago', title: 'Water shutdown tomorrow', body: 'Overhead tanks · 10 AM to 2 PM', drift: '-110px' },
  { icon: 'person', tag: 'Staff', time: '09:04', title: 'Sunita checked in', body: 'Cook · B-1204 · scanned at the gate', drift: '-30px' }
];

export default function Hero() {
  return (
    <section id="top" className="cn-hero" data-ground="dark">
      <div className="cn-hero-copy">
        <div className="cn-badge">
          <span className="cn-badge-dot" />
          For Indian housing societies
        </div>
        <h1>
          <span>Everything your society</span> <em>runs on, in one place.</em>
        </h1>
        <p>
          The gate, the books and the noticeboard — replacing the WhatsApp groups, paper visitor
          registers and phone-call reminders your committee runs on today.
        </p>
        <div className="cn-hero-actions">
          <a href="#demo" className="cn-btn cn-btn--primary">
            Get your society onboarded
          </a>
          <a href="#gate" className="cn-btn cn-btn--ghost">
            See how the gate works
          </a>
        </div>
      </div>

      <div className="cn-hero-scene">
        <div className="cn-depth cn-sky cn-sky--far" style={{ '--drift': '150px' }}>
          <Skyline layer="far" />
        </div>
        <div className="cn-depth cn-sky cn-sky--near" style={{ '--drift': '70px' }}>
          <Skyline layer="near" />
        </div>

        <div className="cn-depth cn-hero-phone" style={{ '--drift': '-40px', '--grow': 1.05 }}>
          <div className="cn-hero-device">
            <Shot
              img="shots/home"
              alt="The Grihive home screen: an urgent notice, the society's tools and quick actions"
              sizes="(max-width: 900px) 240px, 300px"
              priority
            />
          </div>
        </div>

        <div className="cn-depth cn-sky cn-sky--front" style={{ '--drift': '-20px' }}>
          <Skyline layer="front" />
        </div>

        {/* Illustration: the names are invented and the copy above says the
            same thing, so screen readers skip them. */}
        {NOTES.map((n, i) => (
          <div key={n.tag} className={`cn-depth cn-note-at cn-note-at--${i}`} style={{ '--drift': n.drift }} aria-hidden="true">
            <div className="cn-note" style={{ animationDelay: `${900 + i * 280}ms` }}>
              <span className="cn-note-ico">
                <Glyph name={n.icon} />
              </span>
              <div>
                <div className="cn-note-top">
                  <span>Grihive · {n.tag}</span>
                  <span>{n.time}</span>
                </div>
                <strong>{n.title}</strong>
                <span className="cn-note-body">{n.body}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
