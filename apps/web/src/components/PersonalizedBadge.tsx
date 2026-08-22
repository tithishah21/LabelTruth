import { AlertTriangle } from "lucide-react";
import "../styles/personalized.css";

export interface ProfileMatch {
  allergen: string;
  matchedIngredients: string[];
}

interface PersonalizedBadgeProps {
  genericRating: string;
  personalizedRating?: string;
  profileMatches?: ProfileMatch[];
}

export function PersonalizedBadge({
  genericRating,
  personalizedRating,
  profileMatches,
}: PersonalizedBadgeProps) {
  if (!personalizedRating) {
    return (
      <div className="rating-comparison">
        <div className="rating-item">
          <span className="rating-label">Product Rating</span>
          <span className={`rating-badge rating-${genericRating}`}>
            {genericRating.toUpperCase()}
          </span>
        </div>
      </div>
    );
  }

  const ratingChanged = personalizedRating !== genericRating;

  return (
    <div className="rating-comparison">
      <div className="rating-item">
        <span className="rating-label">Generic</span>
        <span className={`rating-badge rating-${genericRating}`}>
          {genericRating.toUpperCase()}
        </span>
      </div>

      <div className={`rating-item ${ratingChanged ? "highlighted" : ""}`}>
        <span className="rating-label">Your Profile</span>
        <span className={`rating-badge rating-${personalizedRating}`}>
          {personalizedRating.toUpperCase()}
        </span>
        {ratingChanged && (
          <div className="profile-badge">
            <AlertTriangle size={16} aria-hidden="true" />
            Flagged for your profile
          </div>
        )}
      </div>
    </div>
  );
}

interface ProfileMatchesProps {
  matches: ProfileMatch[];
}

export function ProfileMatches({ matches }: ProfileMatchesProps) {
  if (matches.length === 0) return null;

  return (
    <div className="profile-matches">
      <h3>Your Profile Conflicts</h3>
      {matches.map((match) => (
        <div key={match.allergen} className="match-item">
          <div className="match-header">
            <AlertTriangle size={18} aria-hidden="true" className="match-icon" />
            <strong>{match.allergen.toUpperCase()}</strong>
          </div>
          <div className="match-ingredients">
            {match.matchedIngredients.map((ingredient) => (
              <span key={ingredient} className="ingredient-tag">
                {ingredient}
              </span>
            ))}
          </div>
        </div>
      ))}
      <p className="match-note">
        ⚠️ These ingredients conflict with your health profile. Review before consuming.
      </p>
    </div>
  );
}
