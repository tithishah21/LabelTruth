import cors from "cors";
import "dotenv/config";
import express from "express";
import { analyzeIngredientText, type ScanAnalysis } from "@labeltruth/shared";
import { Prisma, PrismaClient } from "@prisma/client";
import { authMiddleware, requireAuth } from "./utils/middleware";
import { generateToken, hashPassword, verifyPassword } from "./utils/auth";
import {
  matchAllergens,
  applyMedicalConditionFlags,
  applyDietTypeFlags,
  calculatePersonalizedScoreAdjustment,
  generatePersonalizedVerdict,
  type HealthProfile,
} from "./utils/profileMatcher";
import {
  calculateTotalSugarGrams,
  countUltraProcessed,
  countAllergenFlags,
  getAggregationKey,
  isAggregateStale,
} from "./utils/exposure";
import {
  queryOFFCategory,
  scoreOFFProduct,
  generateAlternativeReason,
  isCacheExpired,
  type AlternativeSuggestion,
} from "./utils/openFoodFacts";
import { classifyIngredientsWithGemini } from "./utils/gemini";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(authMiddleware);

// ============ HEALTH CHECK ============
app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "labeltruth-api" });
});

// ============ AUTH ENDPOINTS ============

/**
 * POST /api/auth/register
 * Register a new user account with email and password
 */
app.post("/api/auth/register", async (request, response) => {
  const { email, password } = request.body;

  if (!email || !password) {
    response.status(400).json({ error: "Email and password are required." });
    return;
  }

  if (password.length < 8) {
    response.status(400).json({ error: "Password must be at least 8 characters." });
    return;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      response.status(409).json({ error: "Email already registered." });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    // Create empty health profile
    await prisma.healthProfile.create({
      data: { userId: user.id },
    });

    const token = generateToken(user.id, user.email);
    response.status(201).json({ userId: user.id, email: user.email, token });
  } catch (error) {
    console.error("Registration error:", error);
    response.status(500).json({ error: "Registration failed." });
  }
});

/**
 * POST /api/auth/login
 * Log in with email and password
 */
app.post("/api/auth/login", async (request, response) => {
  const { email, password } = request.body;

  if (!email || !password) {
    response.status(400).json({ error: "Email and password are required." });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      response.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      response.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const token = generateToken(user.id, user.email);
    response.json({ userId: user.id, email: user.email, token });
  } catch (error) {
    console.error("Login error:", error);
    response.status(500).json({ error: "Login failed." });
  }
});

// ============ PROFILE ENDPOINTS ============

/**
 * GET /api/profile
 * Get current user's health profile
 */
app.get("/api/profile", requireAuth, async (request, response) => {
  try {
    const profile = await prisma.healthProfile.findUnique({
      where: { userId: request.user!.userId },
    });

    if (!profile) {
      response.status(404).json({ error: "Profile not found." });
      return;
    }

    response.json({
      userId: profile.userId,
      fullName: profile.fullName,
      allergies: profile.allergies,
      medicalCondition: profile.medicalCondition,
      dietType: profile.dietType,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    response.status(500).json({ error: "Failed to fetch profile." });
  }
});

/**
 * PUT /api/profile
 * Update user's health profile
 * PRIVACY: Allergies and medical conditions are sensitive data
 */
app.put("/api/profile", requireAuth, async (request, response) => {
  const { fullName, allergies, medicalCondition, dietType } = request.body;

  try {
    const profile = await prisma.healthProfile.update({
      where: { userId: request.user!.userId },
      data: {
        fullName: typeof fullName === "string" && fullName.trim() ? fullName.trim() : null,
        allergies: Array.isArray(allergies) ? allergies : [],
        medicalCondition: medicalCondition || null,
        dietType: dietType || null,
      },
    });

    response.json({
      userId: profile.userId,
      fullName: profile.fullName,
      allergies: profile.allergies,
      medicalCondition: profile.medicalCondition,
      dietType: profile.dietType,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    response.status(500).json({ error: "Failed to update profile." });
  }
});

// ============ SCAN ENDPOINTS ============

/**
 * POST /api/scans/analyze
 * Analyze ingredient text with optional user personalization
 * Guest scans are allowed (no userId required)
 * Authenticated users get personalized scoring + profile matching
 */
app.post("/api/scans/analyze", async (request, response) => {
  const { labelText } = request.body;

  if (!labelText || typeof labelText !== "string" || !labelText.trim()) {
    response.status(400).json({ error: "Ingredient text is required." });
    return;
  }

  try {
    // Generic analysis (existing LabelTruth logic)
    const genericAnalysis = analyzeIngredientText(labelText);

    const unmatchedIngredients = genericAnalysis.ingredients.filter((ingredient) =>
      !genericAnalysis.findings.some((finding) => finding.matchedTerm === ingredient || finding.name === ingredient)
    );
    const geminiResults = await classifyIngredientsWithGemini(unmatchedIngredients);
    const geminiFindings = geminiResults.map((explanation, index) => {
      const ingredient = explanation.ingredient || unmatchedIngredients[index] || explanation.label;
      return {
        id: `gemini-${ingredient.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
        name: explanation.label || ingredient,
        matchedTerm: ingredient,
        category: explanation.category,
        severity: explanation.severity,
        summary: explanation.summary,
        whyItMatters: explanation.whyItMatters,
        tags: explanation.tags,
      };
    });

    const aiFindings = geminiFindings.filter((finding): finding is NonNullable<typeof finding> => Boolean(finding));

    const mergedFindings = [...genericAnalysis.findings, ...aiFindings];
    const uniqueFindings = mergedFindings.filter((finding, index, list) => {
      const key = `${finding.category}-${finding.name}-${finding.matchedTerm}`;
      return list.findIndex((other) => `${other.category}-${other.name}-${other.matchedTerm}` === key) === index;
    });

    const enrichedAnalysis = {
      ...genericAnalysis,
      findings: uniqueFindings,
      unknowns: uniqueFindings.filter((finding) => finding.category === "unknown"),
      additives: uniqueFindings.filter((finding) => finding.category === "additive"),
      hiddenSugars: uniqueFindings.filter((finding) => finding.category === "hidden-sugar"),
      allergens: uniqueFindings.filter((finding) => finding.category === "allergen"),
      ultraProcessedMarkers: uniqueFindings.filter((finding) => finding.category === "ultra-processed"),
    };

    let personalizedScore: number | undefined;
    let personalizedRating: string | undefined;
    let personalizedVerdict: string | undefined;
    let profileMatches: any = undefined;
    let personalizedFindings: any = undefined;

    // If user is authenticated, apply personalization
    if (request.user) {
      const profile = await prisma.healthProfile.findUnique({
        where: { userId: request.user.userId },
      });

      if (profile && (profile.allergies.length > 0 || profile.medicalCondition || profile.dietType)) {
        // Allergen matching
        const allergenMatches = matchAllergens(genericAnalysis.ingredients, profile.allergies);

        // Medical condition flags
        const medicalFindings = applyMedicalConditionFlags(
          genericAnalysis.ingredients,
          profile.medicalCondition
        );

        // Diet type flags
        const dietFindings = applyDietTypeFlags(genericAnalysis.ingredients, profile.dietType);

        // Calculate personalized score adjustment
        const scoreAdjustment = calculatePersonalizedScoreAdjustment(
          allergenMatches,
          medicalFindings,
          dietFindings
        );

        personalizedScore = Math.min(100, genericAnalysis.score + scoreAdjustment);
        personalizedRating = personalizedScore >= 58 ? "red" : personalizedScore >= 28 ? "yellow" : "green";
        personalizedVerdict = generatePersonalizedVerdict(
          genericAnalysis.rating,
          allergenMatches,
          medicalFindings,
          dietFindings
        );

        // Store profile matches for transparency
        profileMatches = allergenMatches.length > 0 ? allergenMatches : undefined;
        personalizedFindings = [...medicalFindings, ...dietFindings];
      }
    }

    const analysisForStorage = enrichedAnalysis ?? genericAnalysis;

    // Store scan in database if user is authenticated
    let scanId: string | undefined;
    if (request.user) {
      const scan = await prisma.scan.create({
        data: {
          userId: request.user.userId,
          labelText,
          normalizedText: analysisForStorage.normalizedText,
          ingredients: analysisForStorage.ingredients,
          genericFindings: analysisForStorage.findings as unknown as Prisma.InputJsonValue,
          genericScore: analysisForStorage.score,
          genericRating: analysisForStorage.rating,
          genericVerdict: analysisForStorage.verdict,
          genericQuickTake: analysisForStorage.quickTake,
          personalizedScore,
          personalizedRating,
          personalizedVerdict,
          profileMatches,
        },
      });
      scanId = scan.id;

      // Update exposure aggregates
      await updateExposureAggregates(request.user.userId, genericAnalysis);
    }

    // Return response
    response.json({
      scanId,
      generic: enrichedAnalysis ?? genericAnalysis,
      personalized: request.user
        ? {
            score: personalizedScore,
            rating: personalizedRating,
            verdict: personalizedVerdict,
            findings: personalizedFindings,
            profileMatches,
          }
        : undefined,
    });
  } catch (error) {
    console.error("Scan analysis error:", error);
    response.status(500).json({ error: "Analysis failed." });
  }
});

/**
 * GET /api/scans/:scanId
 * Retrieve a specific scan (authenticated users only, own scans)
 */
app.get("/api/scans/:scanId", requireAuth, async (request, response) => {
  const { scanId } = request.params;

  try {
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { alternatives: true },
    });

    if (!scan || scan.userId !== request.user!.userId) {
      response.status(404).json({ error: "Scan not found." });
      return;
    }

    response.json({
      id: scan.id,
      createdAt: scan.createdAt,
      labelText: scan.labelText,
      ingredients: scan.ingredients,
      generic: {
        findings: scan.genericFindings,
        score: scan.genericScore,
        rating: scan.genericRating,
        verdict: scan.genericVerdict,
      },
      personalized: scan.personalizedScore
        ? {
            score: scan.personalizedScore,
            rating: scan.personalizedRating,
            verdict: scan.personalizedVerdict,
            profileMatches: scan.profileMatches,
          }
        : null,
      alternatives: scan.alternatives?.alternatives || [],
    });
  } catch (error) {
    console.error("Scan fetch error:", error);
    response.status(500).json({ error: "Failed to fetch scan." });
  }
});

/**
 * GET /api/scans/history
 * List user's recent scans (with pagination)
 */
app.get("/api/scans/history", requireAuth, async (request, response) => {
  const limit = Math.min(Number(request.query.limit) || 20, 100);
  const offset = Number(request.query.offset) || 0;

  try {
    const scans = await prisma.scan.findMany({
      where: { userId: request.user!.userId },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        createdAt: true,
        labelText: true,
        ingredients: true,
        genericScore: true,
        genericRating: true,
        personalizedScore: true,
        personalizedRating: true,
      },
    });

    response.json({ scans, total: scans.length });
  } catch (error) {
    console.error("History fetch error:", error);
    response.status(500).json({ error: "Failed to fetch history." });
  }
});

// ============ EXPOSURE TRACKING ============

/**
 * GET /api/exposure/summary
 * Get rolling window summaries (today + this week)
 */
app.get("/api/exposure/summary", requireAuth, async (request, response) => {
  try {
    const aggregates = await prisma.exposureAggregate.findMany({
      where: { userId: request.user!.userId },
    });

    const summary = {
      today: {
        hiddenSugarGrams: 0,
        ultraProcessedCount: 0,
        allergenFlagCount: 0,
      },
      week: {
        hiddenSugarGrams: 0,
        ultraProcessedCount: 0,
        allergenFlagCount: 0,
      },
    };

    for (const agg of aggregates) {
      if (agg.window === "today") {
        summary.today = {
          hiddenSugarGrams: agg.hiddenSugarGrams,
          ultraProcessedCount: agg.ultraProcessedCount,
          allergenFlagCount: agg.allergenFlagCount,
        };
      } else if (agg.window === "week") {
        summary.week = {
          hiddenSugarGrams: agg.hiddenSugarGrams,
          ultraProcessedCount: agg.ultraProcessedCount,
          allergenFlagCount: agg.allergenFlagCount,
        };
      }
    }

    response.json(summary);
  } catch (error) {
    console.error("Exposure summary error:", error);
    response.status(500).json({ error: "Failed to fetch exposure summary." });
  }
});

// ============ ALTERNATIVES ENDPOINTS ============

/**
 * GET /api/scans/:scanId/alternatives
 * Get alternative product suggestions for a scan
 * Uses Open Food Facts API with 7-day caching
 */
app.get("/api/scans/:scanId/alternatives", requireAuth, async (request, response) => {
  const { scanId } = request.params;

  try {
    // Fetch scan
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { alternatives: true },
    });

    if (!scan || scan.userId !== request.user!.userId) {
      response.status(404).json({ error: "Scan not found." });
      return;
    }

    // Skip alternatives for green-rated products
    if (scan.genericRating === "green" && !scan.personalizedRating) {
      response.json({ alternatives: [] });
      return;
    }

    // Check cache
    if (scan.alternatives && !isCacheExpired(scan.alternatives.cachedAt)) {
      response.json({ alternatives: scan.alternatives.alternatives });
      return;
    }

    // Query OFF API for alternatives (mock category)
    const category = "snacks"; // Simplified for now
    const offProducts = await queryOFFCategory(category);

    const profile = await prisma.healthProfile.findUnique({
      where: { userId: request.user!.userId },
    });

    const alternatives: AlternativeSuggestion[] = await Promise.all(
      offProducts.slice(0, 3).map(async (product) => ({
        offId: product.id,
        name: product.name,
        category: product.category,
        score: scoreOFFProduct(product),
        reason: generateAlternativeReason(
          scan.personalizedScore || scan.genericScore,
          product,
          profile?.allergies
        ),
      }))
    );

    // Cache alternatives
    if (alternatives.length > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.scanAlternative.upsert({
        where: { scanId },
        update: { alternatives: alternatives as unknown as Prisma.InputJsonValue, expiresAt },
        create: { scanId, alternatives: alternatives as unknown as Prisma.InputJsonValue, expiresAt },
      });
    }

    response.json({ alternatives });
  } catch (error) {
    console.error("Alternatives fetch error:", error);
    response.status(500).json({ error: "Failed to fetch alternatives." });
  }
});

// ============ LEGACY ENDPOINT (GUEST SCANS) ============

/**
 * POST /api/analyze-text
 * Guest scan endpoint (no auth required, no persistence)
 */
app.post("/api/analyze-text", async (request, response) => {
  const text = typeof request.body?.text === "string" ? request.body.text : "";

  if (!text.trim()) {
    response.status(400).json({ error: "Ingredient text is required." });
    return;
  }

  const genericAnalysis = analyzeIngredientText(text);
  const unmatchedIngredients = genericAnalysis.ingredients.filter((ingredient) =>
    !genericAnalysis.findings.some((finding) => finding.matchedTerm === ingredient || finding.name === ingredient)
  );
  const geminiResults = await classifyIngredientsWithGemini(unmatchedIngredients);
  const geminiFindings = geminiResults.map((explanation, index) => {
    const ingredient = explanation.ingredient || unmatchedIngredients[index] || explanation.label;
    return {
      id: `gemini-${ingredient.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
      name: explanation.label || ingredient,
      matchedTerm: ingredient,
      category: explanation.category,
      severity: explanation.severity,
      summary: explanation.summary,
      whyItMatters: explanation.whyItMatters,
      tags: explanation.tags,
    };
  });

  const aiFindings = geminiFindings.filter((finding): finding is NonNullable<typeof finding> => Boolean(finding));
  const mergedFindings = [...genericAnalysis.findings, ...aiFindings];
  const uniqueFindings = mergedFindings.filter((finding, index, list) => {
    const key = `${finding.category}-${finding.name}-${finding.matchedTerm}`;
    return list.findIndex((other) => `${other.category}-${other.name}-${other.matchedTerm}` === key) === index;
  });

  response.json({
    ...genericAnalysis,
    findings: uniqueFindings,
    unknowns: uniqueFindings.filter((finding) => finding.category === "unknown"),
    additives: uniqueFindings.filter((finding) => finding.category === "additive"),
    hiddenSugars: uniqueFindings.filter((finding) => finding.category === "hidden-sugar"),
    allergens: uniqueFindings.filter((finding) => finding.category === "allergen"),
    ultraProcessedMarkers: uniqueFindings.filter((finding) => finding.category === "ultra-processed"),
  });
});

// ============ HELPER FUNCTIONS ============

/**
 * Update exposure aggregates for "today" and "week" windows
 */
async function updateExposureAggregates(userId: string, analysis: ScanAnalysis): Promise<void> {
  for (const window of ["today", "week"] as const) {
    const windowKey = getAggregationKey(window);

    const existing = await prisma.exposureAggregate.findUnique({
      where: { userId_window: { userId, window } },
    });

    // Check if stale
    if (existing && isAggregateStale(existing.lastUpdated, window)) {
      // Reset for new window
      await prisma.exposureAggregate.update({
        where: { id: existing.id },
        data: {
          hiddenSugarGrams: calculateTotalSugarGrams(analysis.findings),
          ultraProcessedCount: countUltraProcessed(analysis.findings),
          allergenFlagCount: countAllergenFlags(analysis.findings),
          lastUpdated: new Date(),
        },
      });
    } else if (existing) {
      // Accumulate
      await prisma.exposureAggregate.update({
        where: { id: existing.id },
        data: {
          hiddenSugarGrams: {
            increment: calculateTotalSugarGrams(analysis.findings),
          },
          ultraProcessedCount: {
            increment: countUltraProcessed(analysis.findings),
          },
          allergenFlagCount: {
            increment: countAllergenFlags(analysis.findings),
          },
          lastUpdated: new Date(),
        },
      });
    } else {
      // Create new
      await prisma.exposureAggregate.create({
        data: {
          userId,
          window,
          hiddenSugarGrams: calculateTotalSugarGrams(analysis.findings),
          ultraProcessedCount: countUltraProcessed(analysis.findings),
          allergenFlagCount: countAllergenFlags(analysis.findings),
        },
      });
    }
  }
}

// ============ STARTUP ============

app.listen(port, () => {
  console.log(`LabelTruth API listening on http://localhost:${port}`);
  console.log("Features:");
  console.log("  ✓ User authentication (JWT)");
  console.log("  ✓ Health profile matching");
  console.log("  ✓ Personalized scoring");
  console.log("  ✓ Scan history tracking");
  console.log("  ✓ Exposure aggregation");
  console.log("  ✓ Open Food Facts alternatives");
});
