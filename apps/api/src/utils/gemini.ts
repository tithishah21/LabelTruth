export interface GeminiIngredientExplanation {
  ingredient?: string;
  label: string;
  category: "additive" | "hidden-sugar" | "allergen" | "ultra-processed" | "unknown";
  severity: "low" | "medium" | "high";
  summary: string;
  whyItMatters: string;
  tags: string[];
}

function parseGeminiJsonText(rawText: string): GeminiIngredientExplanation | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? jsonMatch[0] : trimmed;

  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== "object") return null;

    const category = parsed.category;
    const validCategory = category === "additive" || category === "hidden-sugar" || category === "allergen" || category === "ultra-processed" || category === "unknown"
      ? category
      : "unknown";

    const severity = parsed.severity === "low" || parsed.severity === "medium" || parsed.severity === "high"
      ? parsed.severity
      : "low";

    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((tag: unknown): tag is string => typeof tag === "string")
      : ["needs verification"];

    return {
      ingredient: typeof parsed.ingredient === "string" ? parsed.ingredient : undefined,
      label: typeof parsed.label === "string" ? parsed.label : "Ingredient",
      category: validCategory,
      severity,
      summary: typeof parsed.summary === "string" ? parsed.summary : "This ingredient may need verification.",
      whyItMatters:
        typeof parsed.whyItMatters === "string"
          ? parsed.whyItMatters
          : "This ingredient can affect how a packaged food is evaluated.",
      tags,
    };
  } catch {
    return null;
  }
}

function parseGeminiJsonArray(rawText: string): GeminiIngredientExplanation[] {
  const trimmed = rawText.trim();
  const jsonMatch = trimmed.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => parseGeminiJsonText(JSON.stringify(item)))
      .filter((item): item is GeminiIngredientExplanation => Boolean(item));
  } catch {
    return [];
  }
}

async function requestGemini(prompt: string, maxOutputTokens: number): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      console.warn("Gemini API request failed:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join(" ")
      .trim() || null;
  } catch (error) {
    console.warn("Gemini ingredient classification failed:", error);
    return null;
  }
}

export async function classifyIngredientWithGemini(ingredient: string): Promise<GeminiIngredientExplanation | null> {
  const prompt = `You are a food label analyst. Classify this ingredient for packaged food analysis. Return valid JSON only with keys: label, category, severity, summary, whyItMatters, tags. Category must be one of: additive, hidden-sugar, allergen, ultra-processed, unknown. Severity must be low, medium, or high. Keep the answer concise but useful for a consumer. Ingredient: ${ingredient}`;
  const text = await requestGemini(prompt, 220);
  return text ? parseGeminiJsonText(text) : null;
}

export async function classifyIngredientsWithGemini(ingredients: string[]): Promise<GeminiIngredientExplanation[]> {
  const uniqueIngredients = [...new Set(ingredients.map((ingredient) => ingredient.trim()).filter(Boolean))];
  if (uniqueIngredients.length === 0) return [];

  const prompt = `You are a food label analyst. Classify every ingredient in this list. Return a JSON array only, exactly one object per input ingredient, with keys ingredient, label, category, severity, summary, whyItMatters, tags. Category: additive, hidden-sugar, allergen, ultra-processed, or unknown. Severity: low, medium, or high. Identify INS/E numbers by their actual substance name. Keep each summary and whyItMatters under 15 words. Ingredients: ${JSON.stringify(uniqueIngredients)}`;
  const text = await requestGemini(prompt, Math.min(3000, 260 + uniqueIngredients.length * 170));
  return text ? parseGeminiJsonArray(text) : [];
}

export async function explainUnknownIngredient(ingredient: string): Promise<GeminiIngredientExplanation | null> {
  return classifyIngredientWithGemini(ingredient);
}

export async function enrichUnknownFindingsWithGemini(ingredients: string[]) {
  const uniqueIngredients = [...new Set(ingredients.map((ingredient) => ingredient.trim()).filter(Boolean))];
  const resolved: Record<string, Partial<GeminiIngredientExplanation>> = {};

  for (const ingredient of uniqueIngredients) {
    const explanation = await classifyIngredientWithGemini(ingredient);
    if (explanation) {
      resolved[ingredient] = explanation;
    }
  }

  return resolved;
}
