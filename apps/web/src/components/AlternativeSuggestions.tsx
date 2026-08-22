import { useEffect, useState } from "react";
import { Lightbulb, Loader2, AlertCircle } from "lucide-react";
import "../styles/alternatives.css";

export interface Alternative {
  offId: string;
  name: string;
  category: string;
  score: number;
  reason: string;
}

interface AlternativeSuggestionsProps {
  scanId: string;
  token: string;
  genericRating: string;
  personalizedRating?: string;
}

export function AlternativeSuggestions({
  scanId,
  token,
  genericRating,
  personalizedRating,
}: AlternativeSuggestionsProps) {
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Only show alternatives if product is yellow or red
  const shouldShowAlternatives =
    genericRating === "yellow" || genericRating === "red" || personalizedRating === "yellow" || personalizedRating === "red";

  useEffect(() => {
    if (!shouldShowAlternatives) return;

    async function loadAlternatives() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(`http://localhost:4000/api/scans/${scanId}/alternatives`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to load");

        const data = await response.json();
        setAlternatives(data.alternatives || []);
      } catch (err) {
        setError("Could not load alternatives");
      } finally {
        setIsLoading(false);
      }
    }

    loadAlternatives();
  }, [scanId, token, shouldShowAlternatives]);

  if (!shouldShowAlternatives) return null;

  return (
    <div className="alternatives-section">
      <h3>
        <Lightbulb size={22} aria-hidden="true" />
        Healthier Alternatives
      </h3>

      {isLoading && (
        <div className="loading">
          <Loader2 className="spinner" aria-hidden="true" />
          <p>Finding better options...</p>
        </div>
      )}

      {error && (
        <div className="error">
          <AlertCircle size={20} aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && alternatives.length === 0 && (
        <p className="no-alternatives">
          No alternatives found in our database at this time. Check back soon!
        </p>
      )}

      {!isLoading && !error && alternatives.length > 0 && (
        <div className="alternatives-grid">
          {alternatives.map((alt) => (
            <div key={alt.offId} className="alternative-card">
              <div className="alt-header">
                <h4>{alt.name}</h4>
                <span className="alt-score">
                  {alt.score}% <small>healthier</small>
                </span>
              </div>

              <div className="alt-category">{alt.category}</div>

              <p className="alt-reason">✓ {alt.reason}</p>

              <a
                href={`https://world.openfoodfacts.org/product/${alt.offId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="alt-link"
              >
                View on Open Food Facts →
              </a>
            </div>
          ))}
        </div>
      )}

      <p className="alternatives-disclaimer">
        <small>
          Alternatives sourced from Open Food Facts API. Scores based on Nutri-Score and NOVA processing levels.
        </small>
      </p>
    </div>
  );
}
