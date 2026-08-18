const MARQUEE_ITEMS = [
  "DECODE ANY LABEL",
  "NO CAP JUST FACTS",
  "HIDDEN SUGARS EXPOSED",
  "ALLERGEN ALERTS",
  "ADDITIVE CHECK",
  "PLAIN-ENGLISH RESULTS"
];

export function Marquee() {
  const text = MARQUEE_ITEMS.map((item) => `${item} ★`).join(" ");

  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        <span>{text}</span>
        <span>{text}</span>
      </div>
    </div>
  );
}
