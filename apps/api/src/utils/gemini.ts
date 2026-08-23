export interface GeminiIngredientExplanation {
  label: string;
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

    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((tag: unknown): tag is string => typeof tag === "string")
      : ["needs verification"];

    return {
      label: typeof parsed.label === "string" ? parsed.label : "Ingredient",
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

export async function explainUnknownIngredient(ingredient: string): Promise<GeminiIngredientExplanation | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are a food label analyst. Explain this ingredient in plain English for a consumer. Return valid JSON only with keys: label, summary, whyItMatters, tags. Keep it objective and short. Ingredient: ${ingredient}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: prompt }],
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 200,
          },
        }),
      }
    );

    if (!response.ok) {
      console.warn("Gemini API request failed:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join(" ")
      .trim();

    if (!text) return null;

    return parseGeminiJsonText(text);
  } catch (error) {
    console.warn("Gemini ingredient explanation failed:", error);
    return null;
  }
}

export async function enrichUnknownFindingsWithGemini(ingredients: string[]) {
  const uniqueIngredients = [...new Set(ingredients.map((ingredient) => ingredient.trim()).filter(Boolean))];
  const resolved: Record<string, Partial<GeminiIngredientExplanation>> = {};

  for (const ingredient of uniqueIngredients) {
    const explanation = await explainUnknownIngredient(ingredient);
    if (explanation) {
      resolved[ingredient] = explanation;
    }
  }

  return resolved;
}
