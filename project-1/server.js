// server.js — REST version using Gemini 2.5 Flash
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import "dotenv/config"; // loads .env from project root (must include GEMINI_API_KEY)

const app = express();

// Allow local Live Server / frontend origins
app.use(cors({
  origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
}));
app.use(bodyParser.json());

// --- Verify API key ---
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("❌ ERROR: GEMINI_API_KEY not found in environment");
  process.exit(1);
}

// --- Model + API version ---
const API_VERSION = "v1";
const MODEL = "gemini-2.5-flash";

// --- Helper functions ---
function extractTextFromCandidates(data) {
  const cand = data?.candidates?.[0];
  const parts = cand?.content?.parts || [];
  return parts.map(p => p.text || "").join("").trim();
}

function ensureValidPalette(json) {
  if (!json || !Array.isArray(json.colors)) {
    throw new Error("Invalid response format: missing colors array");
  }
  const isHex = (c) => typeof c === "string" && /^#[0-9A-F]{6}$/i.test(c);
  if (!json.colors.every(isHex)) {
    throw new Error("Invalid hex color codes in response");
  }
  return json;
}

// --- Quiet common GETs ---
app.get("/", (_req, res) => {
  res.status(200).send("🎨 Palette API running (Gemini 2.5 Flash). POST /palette with { prompt }");
});
app.get("/favicon.ico", (_req, res) => res.status(204).end());
app.get("/.well-known/appspecific/com.chrome.devtools.json", (_req, res) => res.status(204).end());

// --- Palette route ---
app.post("/palette", async (req, res) => {
  console.log("\n=== New Request ===");
  console.log("Request body:", req.body);

  try {
    const user = String(req.body?.prompt || "").slice(0, 600).trim();
    if (!user) throw new Error("No prompt provided");

    const sys = `You are a color palette generator.
ONLY return a valid JSON object in this format: {"colors":["#RRGGBB","#RRGGBB"]}.
Each color must be a valid 6-digit hex code starting with #.
Generate between 3–6 colors that work well together.
No other text or explanation.`;

    const fullPrompt = `${sys}\n\nUser requested colors for: ${user}`;
    console.log("Full prompt:", fullPrompt);

    const url = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL}:generateContent?key=${encodeURIComponent(API_KEY)}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: fullPrompt }],
        },
      ],
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    if (!resp.ok) {
      const apiMsg =
        data?.error?.message ||
        data?.message ||
        JSON.stringify(data).slice(0, 400);
      throw new Error(`Gemini API error ${resp.status}: ${apiMsg}`);
    }

    const text = extractTextFromCandidates(data);
    console.log("Model raw text:", text);

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found in model response");

    const palette = ensureValidPalette(JSON.parse(match[0]));
    console.log("✅ Validated palette:", palette);

    res.json(palette);
  } catch (err) {
    console.error("Error details:", {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    });

    res.status(500).json({
      colors: ["#808080"],
      error: err?.message || "Unknown error",
      type: err?.name || "Error",
    });
  }
});

// ListModels
app.get("/list-models", async (_req, res) => {
  try {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(API_KEY)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`ListModels error ${response.status}: ${JSON.stringify(data)}`);
    }
    res.json(data);
  } catch (err) {
    console.error("ListModels error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- Start server ---
const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`🧠 Using model: ${MODEL}`);
  console.log("✅ Ready to process color requests (REST mode)");
});
