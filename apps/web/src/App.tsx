import { useMemo, useState } from "react";
import { analyzeIngredientText, type ScanAnalysis } from "@labeltruth/shared";
import { Camera, ClipboardCheck, FileImage, Loader2, RotateCcw, ScanLine, Wand2 } from "lucide-react";
import { recognize } from "tesseract.js";
import { FindingCard } from "./components/FindingCard";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Marquee } from "./components/Marquee";
import { TrafficLightBadge } from "./components/TrafficLightBadge";
import { sampleLabel } from "./lib/sampleLabel";
import { HERO_COLLAGE, HERO_COLLAGE_ALT } from "./lib/heroImage";

type OcrState = "idle" | "reading" | "success" | "error";

export function App() {
  const [labelText, setLabelText] = useState(sampleLabel);
  const [analysis, setAnalysis] = useState<ScanAnalysis>(() => analyzeIngredientText(sampleLabel));
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrState, setOcrState] = useState<OcrState>("idle");
  const [ocrMessage, setOcrMessage] = useState("Upload a clear ingredient label image.");

  const summaryStats = useMemo(
    () => [
      { label: "Ingredients", value: analysis.ingredients.length },
      { label: "Additives", value: analysis.additives.length },
      { label: "Sugars", value: analysis.hiddenSugars.length },
      { label: "Allergens", value: analysis.allergens.length }
    ],
    [analysis]
  );

  function runAnalysis() {
    setAnalysis(analyzeIngredientText(labelText));
  }

  function resetDemo() {
    setLabelText(sampleLabel);
    setAnalysis(analyzeIngredientText(sampleLabel));
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

      const nextAnalysis = analyzeIngredientText(extractedText);
      setLabelText(extractedText);
      setAnalysis(nextAnalysis);
      setOcrState("success");
      setOcrMessage(`Text extracted from image. Found ${nextAnalysis.ingredients.length} ingredients.`);
    } catch (error) {
      setOcrState("error");
      setOcrMessage("OCR failed for this image. You can still paste the ingredient text manually.");
      console.error(error);
    }
  }

  return (
    <div className="app-shell" id="top">
      <Header />
      <Marquee />

      <section className="hero-split">
        <div className="hero-split__copy">
          <h1>
            NO CAP, JUST
            <br />
            <em className="hero-accent">Clarity</em>
          </h1>
          <p>
            Upload a label image or paste ingredients directly. The app explains hidden sugars,
            allergens, additives, and processing signals without making up health claims.
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
            Serving 70s aesthetics with a modern twist. Locally sourced ingredient data, highkey
            transparent, and strictly for the label readers.
          </p>
          <a className="btn-brutal btn-brutal--black" href="#results">
            See Results
          </a>
        </div>
        <div className="vibe-band__visual">
          <div className="vibe-band__rating">
            <TrafficLightBadge rating={analysis.rating} score={analysis.score} />
            <strong>{analysis.quickTake}</strong>
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

            <div className={`verdict-card verdict-card--${analysis.rating}`}>
              <TrafficLightBadge rating={analysis.rating} score={analysis.score} />
              <h2>{analysis.verdict}</h2>
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
          </div>
        </div>
      </section>

      <Footer />
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
