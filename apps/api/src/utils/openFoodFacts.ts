import axios from "axios";

const OFF_BASE_URL = process.env.OFF_API_BASE || "https://world.openfoodfacts.org";

/**
 * Open Food Facts product summary (cached format)
 */
export interface OFFProduct {
  id: string; // OFF product code
  name: string;
  category: string;
  nutriScore?: string; // A-E (A is best)
  novaGroup?: number; // 1-4 (1 is least processed)
  ingredients: string;
  allergies?: string[];
}

/**
 * Suggestion reason
 */
export interface AlternativeSuggestion {
  offId: string;
  name: string;
  category: string;
  score: number; // 0-100, higher is better
  reason: string; // Why this is better than the scanned product
}

/**
 * Query Open Food Facts for products in a category
 * Returns top 10 products sorted by Nutri-Score
 */
export async function queryOFFCategory(category: string): Promise<OFFProduct[]> {
  try {
    const params = new URLSearchParams({
      action: "process",
      tagtype_0: "categories",
      tag_contains_0: "contains",
      tag_0: category.toLowerCase().replace(/\s+/g, "-"),
      page_size: "20",
      json: "1",
    });

    const response = await axios.get(`${OFF_BASE_URL}/cgi/search.pl?${params.toString()}`, {
      timeout: 5000,
    });

    if (response.data?.products) {
      return response.data.products
        .slice(0, 10)
        .map((product: any) => ({
          id: product.code,
          name: product.product_name || "Unknown",
          category: product.categories || "Unknown",
          nutriScore: product.nutriscore_grade,
          novaGroup: product.nova_group,
          ingredients: product.ingredients_text || "",
          allergies: product.allergens?.split(",").map((a: string) => a.trim()),
        }));
    }
  } catch (error) {
    console.error("OFF API error:", error);
  }

  return [];
}

/**
 * Search for a specific product on Open Food Facts
 */
export async function searchOFFProduct(query: string): Promise<OFFProduct | null> {
  try {
    const response = await axios.get(`${OFF_BASE_URL}/api/v0/product/${query}.json`, {
      timeout: 5000,
    });

    const product = response.data?.product;
    if (!product) return null;

    return {
      id: product.code,
      name: product.product_name || "Unknown",
      category: product.categories || "Unknown",
      nutriScore: product.nutriscore_grade,
      novaGroup: product.nova_group,
      ingredients: product.ingredients_text || "",
      allergies: product.allergens?.split(",").map((a: string) => a.trim()),
    };
  } catch (error) {
    console.error("OFF API error:", error);
    return null;
  }
}

/**
 * Score a product based on Nutri-Score and NOVA group
 * Higher score = healthier
 */
export function scoreOFFProduct(product: OFFProduct): number {
  let score = 50; // Baseline

  // Nutri-Score adjustment (A=+20, B=+10, C=0, D=-10, E=-20)
  if (product.nutriScore) {
    const nutriScores: Record<string, number> = { A: 20, B: 10, C: 0, D: -10, E: -20 };
    score += nutriScores[product.nutriScore] || 0;
  }

  // NOVA group adjustment (1=+15, 2=+5, 3=-5, 4=-20)
  if (product.novaGroup) {
    const novaScores: Record<number, number> = { 1: 15, 2: 5, 3: -5, 4: -20 };
    score += novaScores[product.novaGroup] || 0;
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Generate a human-readable reason why an alternative is better
 */
export function generateAlternativeReason(
  scannedScore: number,
  alternative: OFFProduct,
  userAllergens?: string[]
): string {
  const alternativeScore = scoreOFFProduct(alternative);
  const reasons: string[] = [];

  // Compare Nutri-Score
  if (alternative.nutriScore && alternative.nutriScore <= "B") {
    reasons.push(`Better Nutri-Score (${alternative.nutriScore})`);
  }

  // Compare NOVA (processing level)
  if (alternative.novaGroup && alternative.novaGroup <= 2) {
    reasons.push("Less processed");
  }

  // Check allergens
  if (userAllergens && userAllergens.length > 0) {
    const hasNoAllergens = !alternative.allergies || 
      !alternative.allergies.some((a) => userAllergens.some((ua) => a.toLowerCase().includes(ua.toLowerCase())));
    if (hasNoAllergens) {
      reasons.push("No flagged allergens for your profile");
    }
  }

  if (reasons.length === 0) {
    reasons.push("Similar category, comparable ingredients");
  }

  return reasons.slice(0, 2).join(" • ");
}

/**
 * Cache key for alternatives (scan ID + category)
 */
export function getCacheKey(scanId: string, category: string): string {
  return `${scanId}:${category.toLowerCase().replace(/\s+/g, "-")}`;
}

/**
 * Check if cache is expired (7 days)
 */
export function isCacheExpired(cachedAt: Date): boolean {
  const now = new Date();
  const ageMs = now.getTime() - cachedAt.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return ageMs > sevenDaysMs;
}
