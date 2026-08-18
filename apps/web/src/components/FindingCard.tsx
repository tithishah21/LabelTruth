import { AlertTriangle, Info, ShieldAlert, Sparkles, Tags } from "lucide-react";
import type { IngredientFinding } from "@labeltruth/shared";

interface FindingCardProps {
  finding: IngredientFinding;
}

const categoryIcon = {
  additive: Tags,
  "hidden-sugar": Sparkles,
  allergen: ShieldAlert,
  "ultra-processed": AlertTriangle,
  unknown: Info
};

export function FindingCard({ finding }: FindingCardProps) {
  const Icon = categoryIcon[finding.category];

  return (
    <article className={`finding-card finding-card--${finding.severity}`}>
      <div className="finding-card__icon" title={finding.category.replace("-", " ")}>
        <Icon size={19} aria-hidden="true" />
      </div>
      <div>
        <div className="finding-card__header">
          <h3>{finding.name}</h3>
          <span>{finding.category.replace("-", " ")}</span>
        </div>
        <p>{finding.summary}</p>
        <details>
          <summary>Why this matters</summary>
          <p>{finding.whyItMatters}</p>
        </details>
        <div className="finding-card__tags">
          {finding.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
    </article>
  );
}
