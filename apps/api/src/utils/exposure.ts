import type { IngredientFinding } from "@labeltruth/shared";

export interface ExposureSummary {
  today: {
    hiddenSugarGrams: number;
    ultraProcessedCount: number;
    allergenFlagCount: number;
  };
  week: {
    hiddenSugarGrams: number;
    ultraProcessedCount: number;
    allergenFlagCount: number;
  };
}

/**
 * Estimate sugar grams from a hidden-sugar finding
 * Conservative estimate: ~8g per flagged ingredient (assumes added sugar)
 * If OFF data with actual nutrition is available, use that instead
 */
export function estimateSugarGrams(finding: IngredientFinding): number {
  // High-severity hidden sugar findings: ~12g
  if (finding.severity === "high") return 12;
  // Medium-severity: ~8g
  if (finding.severity === "medium") return 8;
  // Low-severity: ~4g
  return 4;
}

/**
 * Count ultra-processed findings in a scan result
 * Only counts if category is "ultra-processed" or contains processed markers
 */
export function countUltraProcessed(findings: IngredientFinding[]): number {
  return findings.filter((f) => f.category === "ultra-processed").length;
}

/**
 * Count allergen findings (generic, not personalized)
 * Only counts if category is "allergen"
 */
export function countAllergenFlags(findings: IngredientFinding[]): number {
  return findings.filter((f) => f.category === "allergen").length;
}

/**
 * Calculate total hidden sugar grams from a list of findings
 * Only sums findings marked as "hidden-sugar"
 * Returns 0 if no data available
 */
export function calculateTotalSugarGrams(findings: IngredientFinding[]): number {
  const sugarFindings = findings.filter((f) => f.category === "hidden-sugar");
  if (sugarFindings.length === 0) return 0;
  return sugarFindings.reduce((total, finding) => total + estimateSugarGrams(finding), 0);
}

/**
 * Build aggregation key for a time window
 * "today" = YYYY-MM-DD
 * "week" = YYYY-Www (ISO week number)
 */
export function getAggregationKey(window: "today" | "week"): string {
  const now = new Date();
  if (window === "today") {
    return now.toISOString().split("T")[0]; // YYYY-MM-DD
  }

  // ISO week number
  const THURSDAY = 4; // ISO week starts Monday
  const target = new Date(now);
  target.setDate(target.getDate() - ((target.getDay() + 6) % 7) + THURSDAY);
  const yearStart = new Date(target.getFullYear(), 0, 4);
  yearStart.setDate(yearStart.getDate() - ((yearStart.getDay() + 6) % 7) + THURSDAY);
  const weekNumber = Math.floor((target.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000 * 7)) + 1;
  return `${now.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

/**
 * Check if a cached aggregate is still valid (not stale)
 */
export function isAggregateStale(lastUpdated: Date, window: "today" | "week"): boolean {
  const now = new Date();
  const lastKey = getAggregationKey(window);
  const lastUpdatedKey = lastUpdated.toISOString().split("T")[0];

  if (window === "today") {
    // Stale if not updated today
    return lastUpdatedKey !== lastKey;
  }

  // "week": Stale if not updated this week
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() - ((targetDate.getDay() + 6) % 7) + 4);
  const currentWeek = Math.floor(
    (targetDate.getTime() - new Date(targetDate.getFullYear(), 0, 4).getTime()) /
      (24 * 60 * 60 * 1000 * 7)
  );

  const lastUpdatedDate = new Date(lastUpdated);
  lastUpdatedDate.setDate(lastUpdatedDate.getDate() - ((lastUpdatedDate.getDay() + 6) % 7) + 4);
  const lastUpdatedWeek = Math.floor(
    (lastUpdatedDate.getTime() - new Date(lastUpdatedDate.getFullYear(), 0, 4).getTime()) /
      (24 * 60 * 60 * 1000 * 7)
  );

  return currentWeek !== lastUpdatedWeek;
}
