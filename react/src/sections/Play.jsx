import { everyday } from '../data.js';

export default function Play() {
  return (
    <section data-cam="play" className="cn-sec">
      <div className="cn-play-panel cn-surface cn-surface--ink">
        <div data-reveal="1" className="cn-kicker cn-kicker--light cn-mb16">
          Everyday life
        </div>
        <h2 data-reveal="1">The small things a society argues about, written down.</h2>
        <div className="cn-grid cn-play-grid">
          {everyday.map((e) => (
            <div key={e.title} data-reveal="1">
              <h3>{e.title}</h3>
              <p>{e.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
