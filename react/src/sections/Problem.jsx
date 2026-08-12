import { problems } from '../data.js';

export default function Problem() {
  return (
    <section data-cam="notice" className="cn-sec">
      <div className="cn-problem-panel cn-surface cn-surface--cream">
        <div data-reveal="1" className="cn-kicker cn-kicker--neutral cn-mb20">
          What it replaces
        </div>
        <h2 data-reveal="1">
          Most societies are still run out of a group chat and a register at the gate.
        </h2>
        <div className="cn-grid cn-problem-grid">
          {problems.map((p) => (
            <div key={p.n} data-reveal="1" className="cn-problem-card">
              <div className="cn-num">{p.n}</div>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
