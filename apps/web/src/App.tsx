import { useMemo, useState, useEffect } from "react";
import { analyzeIngredientText, type RatingLevel, type ScanAnalysis } from "@labeltruth/shared";
import { Camera, ClipboardCheck, FileImage, Loader2, RotateCcw, ScanLine, Wand2, LogOut, Settings, UserRound } from "lucide-react";
import { recognize } from "tesseract.js";
import { FindingCard } from "./components/FindingCard";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Marquee } from "./components/Marquee";
import { TrafficLightBadge } from "./components/TrafficLightBadge";
import { PersonalizedBadge, ProfileMatches, type ProfileMatch } from "./components/PersonalizedBadge";
import { AlternativeSuggestions } from "./components/AlternativeSuggestions";
import { ExposureDashboard } from "./components/ExposureDashboard";
import { ProfileEditor } from "./components/ProfileEditor";
import { FaqSection } from "./components/FaqSection";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { sampleLabel } from "./lib/sampleLabel";
import { HERO_COLLAGE, HERO_COLLAGE_ALT } from "./lib/heroImage";

type OcrState = "idle" | "reading" | "success" | "error";
type AuthState = "login" | "register" | "app";

interface PersonalizedAnalysis {
  score?: number;
  rating?: RatingLevel;
  verdict?: string;
  findings?: any[];
  profileMatches?: ProfileMatch[];
}

export function App() {
  // Auth state
  const [authState, setAuthState] = useState<AuthState>("login");
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem("userId"));
  const [fullName, setFullName] = useState<string | null>(() => localStorage.getItem("fullName"));
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  // Scan state
  const [labelText, setLabelText] = useState(sampleLabel);
  const [analysis, setAnalysis] = useState<ScanAnalysis>(() => analyzeIngredientText(sampleLabel));
  const [personalized, setPersonalized] = useState<PersonalizedAnalysis>({});
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrState, setOcrState] = useState<OcrState>("idle");
  const [ocrMessage, setOcrMessage] = useState("Upload a clear ingredient label image.");

  // Determine which UI to show
  useEffect(() => {
    if (!token || !userId) {
      setAuthState("login");
    } else {
      setAuthState("app");
    }
  }, [token, userId]);

  useEffect(() => {
    if (!token) return;

    fetch("http://localhost:4000/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((profile) => {
        if (profile) {
          const savedName = profile.fullName || null;
          setFullName(savedName);
          if (savedName) {
            localStorage.setItem("fullName", savedName);
          } else {
            localStorage.removeItem("fullName");
          }
        }
      })
      .catch(() => undefined);
  }, [token]);

  const summaryStats = useMemo(
    () => [
      { label: "Ingredients", value: analysis.ingredients.length },
      { label: "Additives", value: analysis.additives.length },
      { label: "Sugars", value: analysis.hiddenSugars.length },
      { label: "Allergens", value: analysis.allergens.length }
    ],
    [analysis]
  );

  // ============ AUTH HANDLERS ============

  function handleLoginSuccess(newToken: string, newUserId: string) {
    localStorage.setItem("token", newToken);
    localStorage.setItem("userId", newUserId);
    setToken(newToken);
    setUserId(newUserId);
    setFullName(localStorage.getItem("fullName"));
    setAuthState("app");
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("fullName");
    setToken(null);
    setUserId(null);
    setAuthState("login");
    resetDemo();
  }

  // ============ SCAN HANDLERS ============

  async function runAnalysis() {
    if (token) {
      // Authenticated: use API for personalized analysis
      try {
        const response = await fetch("http://localhost:4000/api/scans/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ labelText }),
        });

        const data = await response.json();

        if (response.ok) {
          setAnalysis(data.generic);
          setPersonalized(data.personalized || {});
          setCurrentScanId(data.scanId);
        } else {
          alert("Analysis failed: " + (data.error || "Unknown error"));
        }
      } catch (error) {
        console.error("API error:", error);
        // Fallback to guest analysis
        const guestAnalysis = analyzeIngredientText(labelText);
        setAnalysis(guestAnalysis);
        setPersonalized({});
      }
    } else {
      // Guest: use local analysis
      const guestAnalysis = analyzeIngredientText(labelText);
      setAnalysis(guestAnalysis);
      setPersonalized({});
      setCurrentScanId(null);
    }
  }

  function resetDemo() {
    setLabelText(sampleLabel);
    setAnalysis(analyzeIngredientText(sampleLabel));
    setPersonalized({});
    setCurrentScanId(null);
    setImagePreview(null);
    setOcrState("idle");
    setOcrMessage("Upload a clear ingredient label image.");
  }

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setOcrState("reading");
    setOcrMessage("Reading ingredients from the image...");

    try {
      const result = await recognize(file, "eng");
      const extractedText = extractIngredientText(result.data.text);

      if (!extractedText) {
        setOcrState("error");
        setOcrMessage("Could not read ingredient text clearly. Try a sharper, closer photo.");
        return;
      }

      // Update state and trigger analysis via runAnalysis
      setLabelText(extractedText);
      setOcrState("success");
      setOcrMessage(`Text extracted from image. Found ${extractedText.split(",").length} ingredients.`);

      // Immediately run analysis
      setTimeout(() => {
        if (token) {
          // Will use API with new labelText
          runAnalysis();
        } else {
          // Guest analysis
          const guestAnalysis = analyzeIngredientText(extractedText);
          setAnalysis(guestAnalysis);
          setPersonalized({});
        }
      }, 100);
    } catch (error) {
      setOcrState("error");
      setOcrMessage("OCR failed for this image. You can still paste the ingredient text manually.");
      console.error(error);
    }
  }

  // ============ RENDER ============

  // Show login page
  if (authState === "login") {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onSwitchToRegister={() => setAuthState("register")}
      />
    );
  }

  // Show register page
  if (authState === "register") {
    return (
      <RegisterPage
        onRegisterSuccess={handleLoginSuccess}
        onSwitchToLogin={() => setAuthState("login")}
      />
    );
  }

  // Main app
  return (
    <div className="app-shell" id="top">
      <Header />

      {/* Auth bar */}
      <div className="auth-bar">
        <div className="auth-bar-content">
          <span className="auth-user">
            <UserRound size={18} strokeWidth={2.5} aria-hidden="true" />
            <span>Hi, {getFirstName(fullName) || "there"}</span>
          </span>
          <div className="auth-bar-actions">
            <button
              className="icon-button"
              onClick={() => setShowProfileEditor(true)}
              title="Edit health profile"
            >
              <Settings size={20} aria-hidden="true" />
            </button>
            <button className="btn-logout" onClick={handleLogout}>
              <LogOut size={18} aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>
      </div>

      <Marquee />

      <section className="hero-split">
        <div className="hero-split__copy">
          <h1>
            NO CAP, JUST
            <br />
            <em className="hero-accent">Clarity</em>
          </h1>
          <p>
            Upload a label image or paste ingredients directly. Personalized analysis based on your
            health profile: allergies, medical conditions, and diet preferences.
          </p>
          <div className="hero-split__actions">
            <a className="btn-brutal btn-brutal--orange" href="#scan">
              Scan Now
            </a>
            <button className="btn-brutal btn-brutal--outline" type="button" onClick={resetDemo}>
              View Sample
            </button>
          </div>
        </div>
        <div className="hero-split__visual">
          <div className="hero-collage" role="img" aria-label={HERO_COLLAGE_ALT}>
            {HERO_COLLAGE.map((image) => (
              <img
                key={image.src}
                className="hero-collage__photo"
                src={image.src}
                alt=""
                style={{ objectPosition: image.objectPosition }}
              />
            ))}
          </div>
          <span className="hero-badge hero-badge--tl">#CleanLabel</span>
          <span className="hero-badge hero-badge--tr">Lowkey Fire</span>
          <span className="hero-badge hero-badge--circle">Fresh Scan Every Day</span>
        </div>
      </section>

      <section className="vibe-band">
        <div className="vibe-band__copy">
          <h2>The vibe check is passed.</h2>
          <p>
            Serving 70s aesthetics with a modern twist. Personalized ingredient analysis powered by your health profile.
          </p>
          <a className="btn-brutal btn-brutal--black" href="#results">
            See Results
          </a>
        </div>
        <div className="vibe-band__visual">
          <div className="vibe-band__rating">
            <TrafficLightBadge
              rating={personalized?.rating || analysis.rating}
              score={personalized?.score || analysis.score}
            />
            <strong>{personalized?.verdict || analysis.verdict}</strong>
          </div>
        </div>
      </section>

      <section className="workspace-section">
        <div className="section-header">
          <h2>Scan Breakdown</h2>
          <a href="#results">See all findings →</a>
        </div>

        <div className="workspace-grid">
          <div className="scan-panel" id="scan">
            <div className="panel-heading">
              <div>
                <span>Step 1</span>
                <h2>Capture label</h2>
              </div>
              <button className="icon-button" type="button" onClick={resetDemo} title="Reset demo">
                <RotateCcw size={18} aria-hidden="true" />
              </button>
            </div>

            <label className="upload-zone">
              {imagePreview ? (
                <img src={imagePreview} alt="Uploaded ingredient label preview" />
              ) : (
                <>
                  <FileImage size={30} aria-hidden="true" />
                  <span>Upload label image</span>
                  <small>OCR fills ingredient text automatically</small>
                </>
              )}
              <input accept="image/*" type="file" onChange={handleImageChange} />
            </label>

            <div className={`ocr-status ocr-status--${ocrState}`} role="status">
              {ocrState === "reading" ? (
                <Loader2 size={17} aria-hidden="true" />
              ) : (
                <ScanLine size={17} aria-hidden="true" />
              )}
              <span>{ocrMessage}</span>
            </div>

            <div className="camera-placeholder">
              <Camera size={20} aria-hidden="true" />
              <span>Camera scanner lane reserved for mobile capture</span>
            </div>

            <label className="text-input-label" htmlFor="ingredients">
              Ingredient text
            </label>
            <textarea
              id="ingredients"
              value={labelText}
              onChange={(event) => setLabelText(event.target.value)}
              rows={9}
            />

            <button className="primary-button" type="button" onClick={runAnalysis}>
              <Wand2 size={18} aria-hidden="true" />
              Analyze label
            </button>
          </div>

          <div className="results-panel" id="results">
            <div className="panel-heading">
              <div>
                <span>Step 2</span>
                <h2>Plain-English result</h2>
              </div>
              <ClipboardCheck size={22} aria-hidden="true" />
            </div>

            {/* Personalized badge */}
            <PersonalizedBadge
              genericRating={analysis.rating}
              personalizedRating={personalized?.rating}
              profileMatches={personalized?.profileMatches}
            />

            {/* Profile matches alert */}
            {personalized?.profileMatches && (
              <ProfileMatches matches={personalized.profileMatches} />
            )}

            <div className={`verdict-card verdict-card--${personalized?.rating || analysis.rating}`}>
              <TrafficLightBadge
                rating={personalized?.rating || analysis.rating}
                score={personalized?.score || analysis.score}
              />
              <h2>{personalized?.verdict || analysis.verdict}</h2>
              <p>{analysis.quickTake}</p>
            </div>

            <div className="stats-grid">
              {summaryStats.map((stat) => (
                <div key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>

            <div className="ingredient-strip">
              {analysis.ingredients.map((ingredient) => (
                <span key={ingredient}>{ingredient}</span>
              ))}
            </div>

            <div className="findings-list">
              {analysis.findings.length > 0 ? (
                analysis.findings.map((finding) => (
                  <FindingCard key={`${finding.id}-${finding.matchedTerm}`} finding={finding} />
                ))
              ) : (
                <div className="empty-state">
                  No major flags found from the current local ingredient database.
                </div>
              )}
            </div>

            {/* Personalized findings */}
            {personalized?.findings && personalized.findings.length > 0 && (
              <div className="personalized-findings">
                <h3>Personal Profile Flags</h3>
                {personalized.findings.map((finding) => (
                  <FindingCard
                    key={`${finding.id}-${finding.matchedTerm}`}
                    finding={finding}
                  />
                ))}
              </div>
            )}

            {/* Alternatives suggestions */}
            {currentScanId && (
              <AlternativeSuggestions
                scanId={currentScanId}
                token={token!}
                genericRating={analysis.rating}
                personalizedRating={personalized?.rating}
              />
            )}
          </div>
        </div>
      </section>

      {/* Exposure dashboard */}
      <section className="exposure-section">
        <div className="section-header">
          <h2>Your Exposure Tracking</h2>
        </div>
        <ExposureDashboard token={token!} />
      </section>

      <FaqSection />

      <Footer />

      {/* Profile editor modal */}
      {showProfileEditor && (
        <ProfileEditor
          token={token!}
          onClose={() => setShowProfileEditor(false)}
          onProfileSaved={(name) => {
            setFullName(name);
            if (name) {
              localStorage.setItem("fullName", name);
            } else {
              localStorage.removeItem("fullName");
            }
          }}
        />
      )}
    </div>
  );
}

function extractIngredientText(rawText: string): string {
  const normalized = rawText
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "";

  const ingredientMatch = normalized.match(
    /\bingredients?\b\s*[:\-]?\s*(.+?)(?=\b(?:contains|allergen|nutrition|nutritional|directions|storage|best before|net wt|manufactured|packed)\b|$)/i
  );

  const candidate = ingredientMatch?.[1] ?? normalized;
  return candidate
    .replace(/\bmay contain\b.*$/i, "")
    .replace(/\bcontains\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getFirstName(name: string | null): string {
  return name?.trim().split(/\s+/)[0] || "";
}
