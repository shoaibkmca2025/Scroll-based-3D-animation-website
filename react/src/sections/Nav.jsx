export default function Nav() {
  return (
    <nav className="cn-nav">
      <div className="cn-progress" data-progress-bar="1" />
      <a href="#top" className="cn-brand">
        <img src="logo.webp" alt="Grihive" width="128" height="26" />
      </a>
      <div className="cn-nav-links">
        <a href="#gate">The gate</a>
        <a href="#roles">Roles</a>
        <a href="#features">Features</a>

        {/* The app is a PWA, so this is not a file download — it opens
            app.grihive.com, where the browser offers "Add to Home Screen"
            itself. Kept outlined so the demo stays the one primary action. */}
        <a
          href="https://app.grihive.com"
          className="cn-btn cn-btn--app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg className="cn-btn-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v11m0 0 4-4m-4 4-4-4" />
            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          <span className="cn-btn-label">Download Grihive</span>
        </a>

        <a href="#demo" className="cn-btn cn-btn--nav">
          Book a demo
        </a>
      </div>
    </nav>
  );
}
