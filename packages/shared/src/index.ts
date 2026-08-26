export type RatingLevel = "green" | "yellow" | "red";

export type FindingCategory =
  | "additive"
  | "hidden-sugar"
  | "allergen"
  | "ultra-processed"
  | "unknown";

export type FindingSeverity = "low" | "medium" | "high";

export interface IngredientFinding {
  id: string;
  name: string;
  matchedTerm: string;
  category: FindingCategory;
  severity: FindingSeverity;
  summary: string;
  whyItMatters: string;
  tags: string[];
}

export interface ScanAnalysis {
  normalizedText: string;
  ingredients: string[];
  findings: IngredientFinding[];
  hiddenSugars: IngredientFinding[];
  allergens: IngredientFinding[];
  additives: IngredientFinding[];
  ultraProcessedMarkers: IngredientFinding[];
  unknowns: IngredientFinding[];
  score: number;
  rating: RatingLevel;
  verdict: string;
  quickTake: string;
}

interface LexiconEntry {
  id: string;
  name: string;
  aliases: string[];
  category: Exclude<FindingCategory, "unknown">;
  severity: FindingSeverity;
  summary: string;
  whyItMatters: string;
  tags: string[];
}

const lexicon: LexiconEntry[] = [
  {
    id: "sugar-dextrose",
    name: "Dextrose",
    aliases: ["dextrose", "glucose powder"],
    category: "hidden-sugar",
    severity: "medium",
    summary: "A fast-digesting sugar that can raise the product's total sugar load.",
    whyItMatters: "Food labels often split sugars across multiple names, making the sweetener load look smaller at first glance.",
    tags: ["hidden sugar", "sweetener"]
  },
  {
    id: "sugar-maltodextrin",
    name: "Maltodextrin",
    aliases: ["maltodextrin"],
    category: "hidden-sugar",
    severity: "medium",
    summary: "A processed carbohydrate used for texture, bulk, or sweetness.",
    whyItMatters: "It may not read like sugar, but it behaves like a refined carbohydrate in many packaged foods.",
    tags: ["hidden sugar", "ultra-processed marker"]
  },
  {
    id: "sugar-hfcs",
    name: "High-fructose corn syrup",
    aliases: ["high fructose corn syrup", "hfcs", "corn syrup"],
    category: "hidden-sugar",
    severity: "high",
    summary: "A concentrated sweetener commonly used in processed foods and drinks.",
    whyItMatters: "It is a clear signal that sweetness is being added through an industrial syrup.",
    tags: ["hidden sugar", "syrup"]
  },
  {
    id: "additive-sodium-benzoate",
    name: "Sodium benzoate",
    aliases: ["sodium benzoate", "e211", "ins 211"],
    category: "additive",
    severity: "medium",
    summary: "A preservative used to slow spoilage in acidic foods and drinks.",
    whyItMatters: "It is permitted in many foods, but its presence means the product is designed for longer shelf life.",
    tags: ["preservative", "additive"]
  },
  {
    id: "additive-potassium-sorbate",
    name: "Potassium sorbate",
    aliases: ["potassium sorbate", "e202", "ins 202"],
    category: "additive",
    severity: "low",
    summary: "A preservative that helps prevent mold and yeast growth.",
    whyItMatters: "It is common in packaged foods, sauces, and bakery items where shelf stability matters.",
    tags: ["preservative", "additive"]
  },
  {
    id: "additive-msg",
    name: "Monosodium glutamate",
    aliases: ["monosodium glutamate", "msg", "e621", "ins 621"],
    category: "additive",
    severity: "medium",
    summary: "A flavor enhancer that boosts savory taste.",
    whyItMatters: "It is not automatically harmful for most people, but it signals engineered flavor intensity.",
    tags: ["flavor enhancer", "additive"]
  },
  {
    id: "additive-lecithin",
    name: "Lecithin",
    aliases: ["soy lecithin", "sunflower lecithin", "lecithin", "e322", "ins 322"],
    category: "additive",
    severity: "low",
    summary: "An emulsifier that helps oil and water stay mixed.",
    whyItMatters: "It is common in chocolate, spreads, and baked goods to improve texture and consistency.",
    tags: ["emulsifier", "additive"]
  },
  {
    id: "allergen-milk",
    name: "Milk",
    aliases: ["milk", "whey", "casein", "lactose", "milk solids"],
    category: "allergen",
    severity: "high",
    summary: "A major allergen and intolerance trigger for some people.",
    whyItMatters: "Milk-derived ingredients can appear under names like whey, casein, or lactose.",
    tags: ["allergen", "dairy"]
  },
  {
    id: "allergen-soy",
    name: "Soy",
    aliases: ["soy", "soya", "soybean", "soy lecithin"],
    category: "allergen",
    severity: "high",
    summary: "A major allergen that can appear directly or inside additives.",
    whyItMatters: "Soy can be easy to miss when it appears as lecithin or protein isolate.",
    tags: ["allergen"]
  },
  {
    id: "allergen-gluten",
    name: "Gluten/wheat",
    aliases: ["wheat", "gluten", "barley", "rye", "malt extract"],
    category: "allergen",
    severity: "high",
    summary: "A major concern for people with celiac disease, wheat allergy, or gluten sensitivity.",
    whyItMatters: "Gluten-containing grains may appear through flour, malt, flavorings, or cereal derivatives.",
    tags: ["allergen", "gluten"]
  },
  {
    id: "allergen-fish",
    name: "Fish",
    aliases: ["fish", "fish extract", "salmon", "cod", "tuna", "sardine", "anchovy", "herring", "seafood"],
    category: "allergen",
    severity: "high",
    summary: "A major allergen that can trigger reactions in some people.",
    whyItMatters: "Fish can appear directly or in extracts, broths, and mixed seasonings, so it is easy to miss in ingredient lists.",
    tags: ["allergen", "seafood"]
  },
  {
    id: "up-hydrogenated-oil",
    name: "Hydrogenated oil",
    aliases: ["hydrogenated oil", "partially hydrogenated", "vegetable shortening"],
    category: "ultra-processed",
    severity: "high",
    summary: "A highly processed fat used for shelf stability and texture.",
    whyItMatters: "This is a strong marker of industrial processing in packaged foods.",
    tags: ["ultra-processed marker", "fat"]
  },
  {
    id: "up-isolate",
    name: "Protein isolate",
    aliases: ["protein isolate", "soy protein isolate", "whey protein isolate"],
    category: "ultra-processed",
    severity: "medium",
    summary: "A refined protein fraction added to change nutrition numbers or texture.",
    whyItMatters: "Isolates are not automatically bad, but they are a sign the food has been heavily reformulated.",
    tags: ["ultra-processed marker"]
  }
];

const commonFoodWords = new Set([
  "salt",
  "water",
  "sugar",
  "flour",
  "oil",
  "vegetable oil",
  "spices",
  "natural flavour",
  "natural flavor",
  "flavour",
  "flavor",
  "cocoa",
  "rice",
  "corn",
  "oats",
  "almonds",
  "peanuts",
  "vanilla",
  "yeast",
  "starch",
  "potato starch",
  "garlic",
  "garlic powder",
  "onion",
  "onion powder",
  "acidity regulator",
  "acid regulator",
  "extract",
  "powder",
  "seasoning",
  "seasonings",
  "acid",
  "acidity",
  "regulator",
  "vegetable",
  "potato"
]);

export function analyzeIngredientText(input: string): ScanAnalysis {
  const normalizedText = normalizeWhitespace(input);
  const ingredients = splitIngredients(normalizedText);
  const findings = dedupeFindings(ingredients.flatMap((ingredient) => matchIngredient(ingredient)));
  const matchedIngredients = new Set(
    findings.flatMap((finding) => getNormalizedFindingTerms(finding.matchedTerm))
  );
  const unknowns = ingredients
    .filter((ingredient) => {
      const normalized = normalizeTerm(ingredient);
      return normalized.length > 2 && !matchedIngredients.has(normalized) && !commonFoodWords.has(normalized);
    })
    .slice(0, 8)
    .map((ingredient, index): IngredientFinding => ({
      id: `unknown-${index}-${normalizeTerm(ingredient).replaceAll(" ", "-")}`,
      name: ingredient,
      matchedTerm: ingredient,
      category: "unknown",
      severity: "low",
      summary: "No local match yet. Treat this as a verify-separately ingredient.",
      whyItMatters: "LabelTruth should be transparent when it does not know something instead of guessing.",
      tags: ["needs verification"]
    }));

  const allFindings = [...findings, ...unknowns];
  const hiddenSugars = allFindings.filter((finding) => finding.category === "hidden-sugar");
  const allergens = allFindings.filter((finding) => finding.category === "allergen");
  const additives = allFindings.filter((finding) => finding.category === "additive");
  const ultraProcessedMarkers = allFindings.filter((finding) => finding.category === "ultra-processed");
  const score = calculateScore({
    additives,
    allergens,
    hiddenSugars,
    ultraProcessedMarkers,
    unknowns
  });
  const rating = getRating(score);

  return {
    normalizedText,
    ingredients,
    findings: allFindings,
    hiddenSugars,
    allergens,
    additives,
    ultraProcessedMarkers,
    unknowns,
    score,
    rating,
    verdict: getVerdict(rating, additives.length, hiddenSugars.length, ultraProcessedMarkers.length),
    quickTake: getQuickTake(rating, allFindings.length)
  };
}

function splitIngredients(input: string): string[] {
  const withoutPrefix = input.replace(/^.*ingredients?\s*[:\-]\s*/i, "");
  const withoutContains = withoutPrefix.replace(/\bcontains\s*[:\-].*$/i, "");
  const parts: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of withoutContains) {
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);

    if ((char === "," || char === ";" || char === "\n") && depth === 0) {
      pushPart(parts, current);
      current = "";
    } else {
      current += char;
    }
  }

  pushPart(parts, current);
  return parts;
}

function pushPart(parts: string[], value: string): void {
  const cleaned = value
    .replace(/\.$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned) {
    parts.push(cleaned);
  }
}

function matchIngredient(ingredient: string): IngredientFinding[] {
  const normalizedIngredient = normalizeTerm(ingredient);

  return lexicon
    .filter((entry) =>
      entry.aliases.some((alias) => {
        const normalizedAlias = normalizeTerm(alias);
        return normalizedIngredient === normalizedAlias || hasWordMatch(normalizedIngredient, normalizedAlias);
      })
    )
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      matchedTerm: ingredient,
      category: entry.category,
      severity: entry.severity,
      summary: entry.summary,
      whyItMatters: entry.whyItMatters,
      tags: entry.tags
    }));
}

function dedupeFindings(findings: IngredientFinding[]): IngredientFinding[] {
  const merged = new Map<string, IngredientFinding>();

  for (const finding of findings) {
    const normalizedName = normalizeTerm(finding.name);
    const key = `${finding.category}:${normalizedName}`;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, { ...finding });
      continue;
    }

    const combinedMatchedTerms = Array.from(
      new Set([...getNormalizedFindingTerms(existing.matchedTerm), ...getNormalizedFindingTerms(finding.matchedTerm)])
    )
      .filter(Boolean)
      .map((term) => term.trim())
      .filter((term) => term.length > 0)
      .join(", ");

    merged.set(key, {
      ...existing,
      matchedTerm: combinedMatchedTerms,
      tags: Array.from(new Set([...existing.tags, ...finding.tags])),
    });
  }

  return [...merged.values()];
}

function getNormalizedFindingTerms(value: string): string[] {
  if (!value) return [];

  return value
    .split(/[;,]|\s+and\s+|\s+or\s+/i)
    .map((term) => normalizeTerm(term))
    .filter(Boolean);
}

function calculateScore(input: {
  additives: IngredientFinding[];
  allergens: IngredientFinding[];
  hiddenSugars: IngredientFinding[];
  ultraProcessedMarkers: IngredientFinding[];
  unknowns: IngredientFinding[];
}): number {
  const severityPoints = [...input.additives, ...input.hiddenSugars, ...input.ultraProcessedMarkers].reduce(
    (total, finding) => total + severityWeight(finding.severity),
    0
  );
  const allergenSignal = input.allergens.length > 0 ? 8 : 0;
  const unknownSignal = Math.min(12, input.unknowns.length * 2);

  return Math.min(100, Math.round(severityPoints + allergenSignal + unknownSignal));
}

function severityWeight(severity: FindingSeverity): number {
  if (severity === "high") return 22;
  if (severity === "medium") return 14;
  return 7;
}

function getRating(score: number): RatingLevel {
  if (score >= 58) return "red";
  if (score >= 28) return "yellow";
  return "green";
}

function getVerdict(
  rating: RatingLevel,
  additiveCount: number,
  hiddenSugarCount: number,
  ultraProcessedCount: number
): string {
  if (rating === "red") {
    return `Highly processed - ${additiveCount} additives, ${hiddenSugarCount} hidden sugars, ${ultraProcessedCount} processing markers.`;
  }

  if (rating === "yellow") {
    return `Moderately processed - ${additiveCount} additives and ${hiddenSugarCount} hidden sugar signals to review.`;
  }

  return "Low concern - few processing signals detected in this ingredient list.";
}

function getQuickTake(rating: RatingLevel, findingCount: number): string {
  if (rating === "red") return "Pause before buying. This label has several signals worth checking.";
  if (rating === "yellow") return "Reasonable to compare. A few ingredients deserve a second look.";
  if (findingCount === 0) return "No major flags found from the current local database.";
  return "Mostly straightforward, with a small number of explainable flags.";
}

function hasWordMatch(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\W)${escaped}(\\W|$)`, "i").test(text);
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function normalizeTerm(input: string): string {
  return input
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
