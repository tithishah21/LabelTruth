export function Header() {
  return (
    <header className="site-header">
      <a className="site-logo" href="#top">
        LABEL*TRUTH
      </a>
      <nav className="site-nav" aria-label="Main navigation">
        <a href="#scan">Scan</a>
        <a href="#results">Results</a>
        <a href="#about">About</a>
        <a href="#faq">FAQ</a>
      </nav>
      <a className="btn-brutal btn-brutal--lime" href="#scan">
        Scan Now
      </a>
    </header>
  );
}
