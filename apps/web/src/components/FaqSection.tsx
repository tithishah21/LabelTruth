import { ChevronDown } from "lucide-react";

const FAQ_ITEMS = [
  {
    question: "What does LabelTruth analyze?",
    answer:
      "LabelTruth reads the ingredient list, highlights common additives, hidden sugars, allergens, and ultra-processed markers, then gives you a plain-English summary.",
  },
  {
    question: "How does personalized analysis work?",
    answer:
      "Your saved allergies, medical condition, and diet preferences are compared with the ingredients in each scan to surface flags that matter to you.",
  },
  {
    question: "Is LabelTruth medical advice?",
    answer:
      "No. LabelTruth is an educational tool for understanding food labels. Always consult a qualified healthcare professional for medical or dietary advice.",
  },
];

export function FaqSection() {
  return (
    <section className="faq-section" id="faq">
      <div className="faq-section__inner">
        <div className="section-header">
          <p className="section-kicker">Good to know</p>
          <h2>FAQs</h2>
        </div>

        <div className="faq-list">
          {FAQ_ITEMS.map((item) => (
            <details className="faq-item" key={item.question}>
              <summary>
                <span>{item.question}</span>
                <ChevronDown size={20} aria-hidden="true" />
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}