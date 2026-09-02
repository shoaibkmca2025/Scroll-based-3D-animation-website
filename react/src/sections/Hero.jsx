/* The opening: a tall track with a stuck stage, so the headline and the
   mock-ups hold on screen while the page scrolls under them.

   The mock-ups are the point. Rather than a screenshot of the gate, this is
   the gate working — a pass being scanned, an entry landing in the log, a
   staff attendance row filled in. Each runs on its own clock so they never
   line up into a single pulse. */
export default function Hero() {
  return (
    <section id="top" className="cn-hero">
      <span className="cn-orb cn-orb--a" aria-hidden="true" />
      <span className="cn-orb cn-orb--b" aria-hidden="true" />

      <div className="cn-hero-track">
        <div className="cn-hero-stage">
          <div className="cn-hero-copy">
            <div className="cn-badge">
              <span className="cn-badge-dot" />
              For Indian housing societies
            </div>
            <h1>
              <span>Everything your</span>
              <span>society runs on,</span>
              <span>in one place.</span>
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

          <div className="cn-hero-media" aria-hidden="true">
            <div className="cn-mock cn-mock--pass">
              <div className="cn-mock-head">
                <span>Visitor pass</span>
                <span className="cn-mock-flat">B-1204</span>
              </div>
              <div className="cn-mock-qr">
                <div className="cn-mock-scan" />
              </div>
              <div className="cn-mock-status">
                <span className="cn-live" />
                ENTRY LOGGED · 19:42
              </div>
            </div>

            <div className="cn-mock cn-mock--log">
              <div className="cn-mock-head">
                <span>Staff attendance</span>
                <span className="cn-mock-flat">Today</span>
              </div>
              <div className="cn-mock-row">
                <span className="cn-mock-name">Sunita · cook</span>
                <span className="cn-mock-tag">PRESENT</span>
              </div>
              <div className="cn-mock-row">
                <span className="cn-mock-time">IN 09:04 · OUT 13:20</span>
              </div>
            </div>
          </div>

          <div className="cn-scroll-hint">Scroll to expand</div>
        </div>
      </div>
    </section>
  );
}
