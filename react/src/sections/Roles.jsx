import { roleColumns, roleRows } from '../data.js';

export default function Roles() {
  return (
    <section data-ground="warm-paper" id="roles" className="cn-sec">
      <div className="cn-roles-panel cn-surface cn-surface--cream">
        <div data-reveal="1" className="cn-kicker cn-kicker--neutral">
          Separation of powers
        </div>
        <h2 data-reveal="1">Built for how committees actually work.</h2>
        <p data-reveal="1" className="cn-roles-lede">
          The treasurer cannot touch the gate. A committee member cannot touch the books. The
          secretary is the only office that can appoint others.
        </p>
        <div data-reveal="1" className="cn-roles-scroll">
          <table className="cn-roles-table">
            <thead>
              <tr>
                {roleColumns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roleRows.map(([office, ...cells]) => (
                <tr key={office}>
                  <td>{office}</td>
                  {cells.map(([text, granted], i) => (
                    // the column name, shown beside the value once a phone
                    // stacks each row into a card and the header is hidden
                    <td key={i} className={granted ? 'cn-yes' : 'cn-no'} data-label={roleColumns[i + 1]}>
                      {text}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p data-reveal="1" className="cn-roles-foot">
          Chairman, secretary and treasurer are single seats — appointing a new one steps the
          sitting holder down to resident, and the change applies immediately.
        </p>
      </div>
    </section>
  );
}
