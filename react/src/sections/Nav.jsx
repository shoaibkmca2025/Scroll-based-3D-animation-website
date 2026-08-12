export default function Nav() {
  return (
    <nav className="cn-nav">
      <div className="cn-progress" data-progress-bar="1" />
      <a href="#top" className="cn-brand">
        <span className="cn-brand-mark" />
        ClearNest
      </a>
      <div className="cn-nav-links">
        <a href="#gate">The gate</a>
        <a href="#roles">Roles</a>
        <a href="#features">Features</a>
        <a href="#demo" className="cn-btn cn-btn--nav">
          Book a demo
        </a>
      </div>
    </nav>
  );
}
