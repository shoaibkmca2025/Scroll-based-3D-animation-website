import { onboarding } from '../data.js';

export default function Onboarding() {
  return (
    <section id="onboarding" data-cam="pool" className="cn-sec">
      <div className="cn-onboard-panel cn-surface cn-surface--sage">
        <div data-reveal="1" className="cn-kicker cn-kicker--sage">
          Done for you
        </div>
        <h2 data-reveal="1">We set your society up.</h2>
        <p data-reveal="1" className="cn-onboard-lede">
          This is not a sign-up-and-figure-it-out product. Our team does the setup, and your
          residents join with a code.
        </p>
        <div className="cn-grid cn-onboard-grid">
          {onboarding.map((s) => (
            <div key={s.n} data-reveal="1" className="cn-onboard-card">
              <div className="cn-num">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
