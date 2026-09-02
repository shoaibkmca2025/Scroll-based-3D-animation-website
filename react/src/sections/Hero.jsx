import ScrollExpandHero from '../components/ScrollExpandHero.jsx';
import PassQr from '../components/PassQr.jsx';

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
        panelContent={
          <>
            {/* The pass a resident issues, and the log line the guard's scan
                produces. Between them they are the whole product in two
                cards: something granted, and the record it leaves. */}
            <div className="cn-mock cn-mock--pass">
              <div className="cn-mock-head">
                <span>Visitor pass</span>
                <span className="cn-mock-flat">B-1204</span>
              </div>
              <div className="cn-mock-qr">
                <PassQr />
                <div className="cn-mock-scan" />
              </div>
              <div className="cn-pass-who">
                <span className="cn-pass-name">Ravi Kulkarni</span>
                <span className="cn-pass-note">Guest of Meera · A-101</span>
              </div>
              <div className="cn-pass-meta">
                <span>VALID TILL 21:00</span>
                <span>ONE ENTRY</span>
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
              <div className="cn-mock-time">IN 09:04 · OUT 13:20</div>
              <div className="cn-mock-row">
                <span className="cn-mock-name">Ramesh · driver</span>
                <span className="cn-mock-tag">PRESENT</span>
              </div>
              <div className="cn-mock-time">IN 07:40 · ON DUTY</div>
              <div className="cn-mock-row">
                <span className="cn-mock-name">Anita · help</span>
                <span className="cn-mock-tag cn-mock-tag--wait">AWAITED</span>
              </div>
              <div className="cn-mock-foot">
                <span className="cn-live cn-live--calm" />
                2 of 3 marked in by the gate
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

          {/* The block the expansion reveals. Without this the panel opened
              onto a line of copy and two buttons, which is most of a screen of
              nothing — the "blank" the page was complaining about. */}
          <div className="se-after">
            <figure className="se-after-media">
              <img src="hero-after.webp" alt="A residential society" width="1100" height="700" loading="lazy" />
            </figure>
            <div className="se-after-copy">
              <div className="cn-kicker cn-kicker--onink cn-mb12">One backend</div>
              <h2>Every part of the society, on the same records.</h2>
              <ul className="se-after-list">
                <li>
                  <strong>The gate</strong>
                  Passes are scanned, not written down. Entry, exit and staff attendance all fall out
                  of the same scan.
                </li>
                <li>
                  <strong>The books</strong>
                  Dues, receipts and expenses against a balance every resident can see.
                </li>
                <li>
                  <strong>The noticeboard</strong>
                  Notices, events and complaints with a status, instead of a group chat.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </ScrollExpandHero>
    </section>
  );
}
