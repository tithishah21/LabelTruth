import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyzeIngredientText } from "./index.js";

describe("analyzeIngredientText", () => {
  it("deduplicates repeated allergen names and ignores common benign ingredients", () => {
    const result = analyzeIngredientText(
      "Ingredients: fish extract, fish, vegetable oil, potato starch, garlic powder, onion powder, acidity regulator"
    );

    assert.equal(result.allergens.length, 1);
    assert.equal(result.unknowns.length, 0);
    assert.ok(result.allergens.every((finding) => finding.name === "Fish"));
    assert.ok(result.findings.every((finding) => !finding.tags.includes("needs verification")));
  });
});
