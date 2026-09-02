import ScrollExpandHero from '../components/ScrollExpandHero.jsx';

/* The opening. The panel expands from a card to nearly the full screen as you
   turn the wheel, the headline parts around it, and the copy and actions fade
   in once it is open.

   What sits inside the panel is the gate working rather than a picture of it:
   a pass with a line scanning down it, and the attendance row that same scan
   produces. Those were already built for the previous hero, so the expansion
   reveals something real instead of a gradient. */
export default function Hero() {
  return (
    <section id="top">
      <ScrollExpandHero
        bgImageSrc="hero-bg.webp"
        mediaSrc="hero-media.webp"
        title="Everything your society runs on"
        date="For Indian housing societies"
        scrollToExpand="Scroll to expand"
        textBlend
        panelContent={
          <>
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
          </>
        }
      >
        <div className="se-copy">
          <p className="se-lede">
            The gate, the books and the noticeboard — replacing the WhatsApp groups, paper visitor
            registers and phone-call reminders your committee runs on today.
          </p>
          <div className="se-actions">
            <a href="#demo" className="cn-btn cn-btn--primary">
              Get your society onboarded
            </a>
            <a href="#gate" className="cn-btn cn-btn--ghost">
              See how the gate works
            </a>
          </div>
        </div>
      </ScrollExpandHero>
    </section>
  );
}
