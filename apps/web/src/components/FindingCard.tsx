import { AlertTriangle, Info, ShieldAlert, Sparkles, Tags } from "lucide-react";
import type { IngredientFinding } from "@labeltruth/shared";

interface FindingCardProps {
  finding: IngredientFinding;
  isProfileConflict?: boolean;
}

const categoryIcon = {
  additive: Tags,
  "hidden-sugar": Sparkles,
  allergen: ShieldAlert,
  "ultra-processed": AlertTriangle,
  unknown: Info
};

export function FindingCard({ finding, isProfileConflict = false }: FindingCardProps) {
  const Icon = categoryIcon[finding.category];
  const categoryLabel = !isProfileConflict && finding.category === "unknown"
    ? "no profile conflict"
    : finding.category.replace("-", " ");
  const summary = isProfileConflict
    ? finding.summary
    : finding.category === "unknown"
      ? "No profile conflict identified from the available information."
      : finding.category === "allergen"
        ? "This is a recognized allergen, but it does not match an allergy in your profile."
        : finding.summary;

  return (
    <article className={`finding-card finding-card--${finding.severity}`}>
      <div className="finding-card__icon" title={finding.category.replace("-", " ")}>
        <Icon size={19} aria-hidden="true" />
      </div>
      <div>
        <div className="finding-card__header">
          <h3>{finding.name}</h3>
          <span>{categoryLabel}</span>
        </div>
        <p>{summary}</p>
        <details>
          <summary>Why this matters</summary>
          <p>
            {isProfileConflict
              ? finding.whyItMatters
              : finding.category === "unknown"
                ? "No specific conflict with your saved profile was identified. If you have a personal sensitivity, check the ingredient with a healthcare professional."
                : finding.whyItMatters}
          </p>
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
