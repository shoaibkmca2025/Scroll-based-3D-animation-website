export default function Hero() {
  return (
    <section id="top" data-cam="wide" className="cn-hero" data-side="left">
      <div className="cn-hero-copy">
        <div className="cn-badge">
          <span className="cn-badge-dot" />
          For Indian housing societies
        </div>
        <h1>
          Everything your
          <br />
          society runs on,
          <br />
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
      <div className="cn-scroll-hint">Scroll to enter the society</div>
    </section>
  );
}
