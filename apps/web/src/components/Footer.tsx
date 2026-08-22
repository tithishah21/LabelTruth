import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="site-footer" id="about">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <h2>LABEL*TRUTH</h2>
          <p>
            Your local spot for high-fidelity ingredient facts and low-fidelity jargon. Since 2026 but
            feels like 1974.
          </p>
        </div>
        <div className="site-footer__cols">
          <div className="site-footer__col">
            <h4>Nav</h4>
            <a href="#scan">Scan</a>
            <a href="#results">Results</a>
            <a href="#faq">FAQ</a>
            <a href="#top">Top</a>
          </div>
          <div className="site-footer__col">
            <h4>Data</h4>
            <span>Local ingredient DB</span>
            <span>OCR via Tesseract</span>
            <span>No health claims</span>
          </div>
          <div className="site-footer__col">
            <h4>Hours</h4>
            <span>Mon–Fri: Scan anytime</span>
            <span>Sat–Sun: Still scanning</span>
            <span>Always open source</span>
          </div>
        </div>
      </div>
      <div className="site-footer__bar">
        <span>© 2025 Label Truth Group</span>
        <span className="footer-credit">
          Built by Tithi with <Heart size={15} fill="currentColor" aria-label="love" />
        </span>
      </div>
    </footer>
  );
}
