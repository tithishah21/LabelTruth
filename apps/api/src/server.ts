import cors from "cors";
import "dotenv/config";
import express from "express";
import { analyzeIngredientText } from "@labeltruth/shared";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "labeltruth-api" });
});

app.post("/api/analyze-text", (request, response) => {
  const text = typeof request.body?.text === "string" ? request.body.text : "";

  if (!text.trim()) {
    response.status(400).json({ error: "Ingredient text is required." });
    return;
  }

  response.json(analyzeIngredientText(text));
});

app.post("/api/scans", (_request, response) => {
  response.status(501).json({
    error: "OCR ingestion is not wired yet.",
    next: "The next milestone connects this route to Google Vision or Tesseract."
  });
});

app.listen(port, () => {
  console.log(`LabelTruth API listening on http://localhost:${port}`);
});
