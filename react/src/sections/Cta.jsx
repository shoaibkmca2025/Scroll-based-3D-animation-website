import { useState } from 'react';
import { formFields } from '../data.js';

export default function Cta() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section data-ground="dark" id="demo" className="cn-sec cn-cta">
      <span className="cn-orb cn-orb--a" aria-hidden="true" />
      <span className="cn-orb cn-orb--b" aria-hidden="true" />
      <div className="cn-cta-panel">
        <div>
          <h2>Get your society onboarded.</h2>
          <p>
            Tell us about your society and we will set it up and walk your committee through it.
            Grihive is in live pilot with a small number of real societies.
          </p>
          <div className="cn-cta-note">
            Residents install one app.
            <br />
            Guards use the same app with a guard login.
            <br />
            The committee needs nothing extra.
          </div>
        </div>
        <form
          className="cn-form"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          {formFields.map((f) => (
            <input key={f.placeholder} type="text" placeholder={f.placeholder} required={f.required} />
          ))}
          <button type="submit">{submitted ? 'Thanks — we will call you' : 'Book a demo'}</button>
        </form>
      </div>
    </section>
  );
}
