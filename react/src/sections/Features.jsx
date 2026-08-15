import { features } from '../data.js';

export default function Features() {
  return (
    <section id="features" data-cam="clubhouse" className="cn-sec cn-side cn-side--left" data-side="left">
      <div className="cn-features-panel cn-surface cn-surface--cream">
        <h2 data-reveal="1">Everything that is built and working.</h2>
        <div className="cn-grid cn-features-grid">
          {features.map((f) => (
            <div key={f.title} data-reveal="1" className="cn-feature">
              <div className="cn-feature-tag">{f.tag}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
