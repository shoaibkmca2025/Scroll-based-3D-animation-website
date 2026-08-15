import { gateNotes, gateSteps } from '../data.js';

export default function Gate() {
  return (
    <section id="gate" data-cam="gate" className="cn-sec cn-side cn-side--left" data-side="left">
      <div className="cn-gate-panel">
        <div data-reveal="1" className="cn-kicker cn-kicker--onink">
          The strongest part
        </div>
        <h2 data-reveal="1">The gate actually works.</h2>
        <p data-reveal="1" className="cn-gate-lede">
          Most competitors stop at a visitor log the guard types in. Here the pass is scanned — and
          the entry log and staff attendance fall out of it.
        </p>
        <div className="cn-grid cn-gate-grid">
          {gateSteps.map((s) => (
            <div key={s.n} data-reveal="1" className="cn-gate-step">
              <div className="cn-num">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
        <div className="cn-grid cn-gate-notes">
          {gateNotes.map((n) => (
            <div key={n.title}>
              <strong>{n.title}</strong>
              {n.body}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
