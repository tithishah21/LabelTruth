import type { IngredientFinding } from "@labeltruth/shared";

export interface HealthProfile {
  allergies: string[]; // Allergen IDs: "milk", "peanuts", "tree-nuts", etc.
  medicalCondition?: string | null; // "diabetes", "hypertension", or null
  dietType?: string | null; // "vegan", "vegetarian", "gluten-free", "low-sodium", or null
}

export interface ProfileMatch {
  allergen: string;
  matchedIngredients: string[];
}

/**
 * Mapping of allergen IDs to common ingredient aliases
 * Used to match allergen profiles against parsed ingredients
 * PRIVACY: Allergens are medical data — handle deliberately
 */
const ALLERGEN_MAPPINGS: Record<string, string[]> = {
  milk: ["milk", "whey", "whey protein", "whey protein isolate", "casein", "milk solids", "milk fat", "butter", "cream", "yogurt", "cheese", "ghee", "lactalbumin"],
  peanuts: ["peanut", "peanuts", "groundnut", "arachis oil"],
  "tree-nuts": ["almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut", "macadamia", "brazil nut", "pine nut", "tree nut"],
  wheat: ["wheat", "wheat flour", "wheat gluten", "semolina", "bulgur", "spelt", "kamut", "triticum"],
  soy: ["soy", "soya", "soybean", "soy lecithin", "soy protein", "tofu", "miso", "tempeh", "edamame"],
  eggs: ["egg", "eggs", "albumin", "ovomucin", "ovalbumin", "egg white", "egg yolk"],
  fish: ["fish", "anchovy", "cod", "salmon", "tuna", "sardine", "herring"],
  shellfish: ["shrimp", "prawn", "crab", "lobster", "clam", "mussel", "oyster", "scallop"],
  sesame: ["sesame", "tahini", "sesame seed", "sesame oil"],
  mustard: ["mustard", "mustard seed", "mustard powder"],
};

/**
 * Mapping of medical conditions to ingredient red flags
 * (Simplified rules — not medical advice)
 */
const MEDICAL_CONDITION_FLAGS: Record<string, { keywords: string[]; reason: string }> = {
  diabetes: {
    keywords: ["sugar", "high-fructose corn syrup", "hfcs", "dextrose", "maltodextrin", "glucose", "fructose", "sucrose", "honey", "syrup"],
    reason: "High sugar content may impact blood glucose levels",
  },
  hypertension: {
    keywords: ["sodium", "salt", "sodium chloride", "sodium benzoate", "sodium nitrite", "sodium nitrate"],
    reason: "High sodium content may affect blood pressure",
  },
};

/**
 * Mapping of diet types to ingredient restrictions
 * (Simplified rules — no medical basis, just dietary preference markers)
 */
const DIET_TYPE_FLAGS: Record<string, { keywords: string[]; reason: string }> = {
  vegan: {
    keywords: ["milk", "whey", "casein", "eggs", "egg", "honey", "gelatin", "carmine", "shellac"],
    reason: "Contains animal-derived ingredient (not vegan)",
  },
  vegetarian: {
    keywords: ["meat", "beef", "beef stock", "beef extract", "pork", "chicken", "chicken meat", "chicken stock", "chicken extract", "fish", "gelatin", "carmine"],
    reason: "Contains animal flesh or insect-derived ingredient (not vegetarian)",
  },
  "gluten-free": {
    keywords: ["wheat", "barley", "rye", "gluten", "malt", "brewer's yeast"],
    reason: "Contains gluten or gluten-containing grain",
  },
  "low-sodium": {
    keywords: ["sodium", "salt", "sodium chloride", "sodium benzoate", "sodium nitrite", "sodium nitrate"],
    reason: "High sodium content (not suitable for low-sodium diet)",
  },
};

/**
 * Normalize ingredient name for matching (same logic as shared)
 */
function normalizeTerm(input: string): string {
  return input
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if a normalized term matches a keyword (word-boundary match)
 */
function hasWordMatch(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\W)${escaped}(\\W|$)`, "i").test(text);
}

/**
 * Match a user's allergen profile against their parsed ingredients
 * Returns list of {allergen, matchedIngredients} tuples
 */
export function matchAllergens(
  ingredients: string[],
  allergyIds: string[]
): ProfileMatch[] {
  const matches: ProfileMatch[] = [];

  for (const allergyId of allergyIds) {
    const keywords = ALLERGEN_MAPPINGS[allergyId];
    if (!keywords) continue;

    const matchedIngredients: string[] = [];
    for (const ingredient of ingredients) {
      const normalizedIngredient = normalizeTerm(ingredient);
      for (const keyword of keywords) {
        if (hasWordMatch(normalizedIngredient, keyword)) {
          matchedIngredients.push(ingredient);
          break;
        }
      }
    }

    if (matchedIngredients.length > 0) {
      matches.push({
        allergen: allergyId,
        matchedIngredients,
      });
    }
  }

  return matches;
}

/**
 * Apply medical condition flags to generic findings
 * Returns additional personalized findings based on medical condition
 */
export function applyMedicalConditionFlags(
  ingredients: string[],
  condition?: string | null
): IngredientFinding[] {
  if (!condition || !MEDICAL_CONDITION_FLAGS[condition]) {
    return [];
  }

  const { keywords, reason } = MEDICAL_CONDITION_FLAGS[condition];
  const newFindings: IngredientFinding[] = [];

  for (const ingredient of ingredients) {
    const normalizedIngredient = normalizeTerm(ingredient);
    for (const keyword of keywords) {
      if (hasWordMatch(normalizedIngredient, keyword)) {
        newFindings.push({
          id: `profile-${condition}-${normalizeTerm(ingredient).replaceAll(" ", "-")}`,
          name: `Flagged for ${condition}`,
          matchedTerm: ingredient,
          category: "ultra-processed", // Reuse category for UI rendering
          severity: "high",
          summary: `Contains "${ingredient}" — may be problematic for your medical profile.`,
          whyItMatters: reason,
          tags: ["personalized", "medical-condition"],
        });
        break;
      }
    }
  }

  return newFindings;
}

/**
 * Apply diet type flags to generic findings
 * Returns additional personalized findings based on diet type
 */
export function applyDietTypeFlags(
  ingredients: string[],
  dietType?: string | null
): IngredientFinding[] {
  if (!dietType || !DIET_TYPE_FLAGS[dietType]) {
    return [];
  }

  const { keywords, reason } = DIET_TYPE_FLAGS[dietType];
  const newFindings: IngredientFinding[] = [];

  for (const ingredient of ingredients) {
    const normalizedIngredient = normalizeTerm(ingredient);
    for (const keyword of keywords) {
      if (hasWordMatch(normalizedIngredient, keyword)) {
        newFindings.push({
          id: `profile-${dietType}-${normalizeTerm(ingredient).replaceAll(" ", "-")}`,
          name: `Not compatible with ${dietType}`,
          matchedTerm: ingredient,
          category: "additive", // Reuse category for UI rendering
          severity: "high",
          summary: `Contains "${ingredient}" — conflicts with your ${dietType} diet.`,
          whyItMatters: reason,
          tags: ["personalized", "diet-type"],
        });
        break;
      }
    }
  }

  return newFindings;
}

/**
 * Calculate personalized score multiplier based on how many profile conflicts exist
 * Generic score is adjusted upward if conflicts are found
 */
export function calculatePersonalizedScoreAdjustment(
  profileMatches: ProfileMatch[],
  medicalConditionFindings: IngredientFinding[],
  dietTypeFindings: IngredientFinding[]
): number {
  let adjustment = 0;

  // Allergen matches: +15 points per allergen found
  adjustment += profileMatches.length * 15;

  // Medical condition findings: +12 points per finding
  adjustment += medicalConditionFindings.length * 12;

  // Diet type findings: +10 points per finding
  adjustment += dietTypeFindings.length * 10;

  return adjustment;
}

/**
 * Generate a personalized verdict based on profile matches
 */
export function generatePersonalizedVerdict(
  genericRating: string,
  profileMatches: ProfileMatch[],
  medicalConditionFindings: IngredientFinding[],
  dietTypeFindings: IngredientFinding[]
): string {
  const totalConflicts = profileMatches.length + medicalConditionFindings.length + dietTypeFindings.length;

  if (totalConflicts === 0) {
    return `No personal conflicts detected. Generic verdict: ${genericRating}`;
  }

  const conflictSummary = [
    profileMatches.length > 0 ? `${profileMatches.length} allergen(s)` : null,
    medicalConditionFindings.length > 0 ? `${medicalConditionFindings.length} medical flag(s)` : null,
    dietTypeFindings.length > 0 ? `${dietTypeFindings.length} diet conflict(s)` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return `⚠️ This product conflicts with your profile: ${conflictSummary}.`;
}
