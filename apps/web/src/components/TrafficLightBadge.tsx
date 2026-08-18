import type { RatingLevel } from "@labeltruth/shared";

interface TrafficLightBadgeProps {
  rating: RatingLevel;
  score: number;
}

const labels: Record<RatingLevel, string> = {
  green: "Low concern",
  yellow: "Check label",
  red: "High concern"
};

export function TrafficLightBadge({ rating, score }: TrafficLightBadgeProps) {
  return (
    <div className={`traffic-badge traffic-badge--${rating}`} aria-label={`${labels[rating]} rating`}>
      <span className="traffic-badge__light" />
      <span>{labels[rating]}</span>
      <strong>{score}/100</strong>
    </div>
  );
}
