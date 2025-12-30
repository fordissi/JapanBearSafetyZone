import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.enable('trust proxy');
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ... Data Helpers ...
const extractJsonArray = (text) => {
  if (!text) return [];
  try {
    const match = text.match(/```json\s*(\[\s*[\s\S]*?\s*\])\s*```/);
    if (match && match[1]) return JSON.parse(match[1]);

    // Fallback: look for [ ... ]
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(text.substring(start, end + 1));
    }
  } catch (e) {
    console.error("[Server] JSON Parse Error:", e.message);
  }
  return [];
};

const sanitizeData = (data) => {
  if (!Array.isArray(data)) return [];
  return data.map(item => ({
    ...item,
    lat: Number(item.lat),
    lng: Number(item.lng),
    count: Number(item.count || 1),
    url: item.url || null
  })).filter(item => !isNaN(item.lat) && !isNaN(item.lng));
};

// ... AI Service ...
// ... AI Service ...
const performGrokSearch = async (apiKey) => {
  // Priority: Argument apiKey > Environment Variable
  const validKey = apiKey || process.env.XAI_API_KEY;

  if (!validKey) {
    console.log("[Server] No Grok/xAI API Key provided.");
    return [];
  }

  console.log("[Server] Starting Grok search (Model: grok-3)...");
  try {
    const systemPrompt = `Role: Real-time Social Media Analyst.
Task: Analyze recent trends/reports of "熊出沒" (Bear sightings) in Japan.
Focus: Identify specific cities/areas with recent reports.
Output: JSON Array only.
Schema: [{"id": "x-1", "title": "Location (City/Area)", "lat": 35.12, "lng": 139.34, "desc": "Summary of report", "count": 1, "source": "X.com", "date": "YYYY-MM-DD", "url": ""}]
Constraint: Leave 'url' EMPTY unless you have a 100% verified specific tweet URL. Do not guess.`;

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${validKey}` },
      body: JSON.stringify({
        model: "grok-3",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "List 5 recent bear sighting areas in Japan from X.com." }
        ],
        stream: false,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Grok status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";
    console.log("[Server] Grok Raw Content:", rawContent);

    let result = sanitizeData(extractJsonArray(rawContent));

    // Smart Link Fallback: If URL is empty/fake, generate a valid X search link
    result = result.map(item => ({
      ...item,
      provider: 'grok',
      url: item.url && item.url.includes('x.com/') ? item.url : `https://x.com/search?q=${encodeURIComponent(item.title + ' 熊出没')}&src=typed_query&f=live`
    }));

    console.log(`[Server] Grok found ${result.length} items.`);
    return result;
  } catch (e) {
    console.error(`Grok Error: ${e.message}`);
    return [];
  }
};

const performGrokVerify = async (apiKey, base64Image) => {
  const validKey = apiKey || process.env.XAI_API_KEY;
  if (!validKey) return { vote: false, error: "No Key" };

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${validKey}` },
      body: JSON.stringify({
        model: "grok-2-vision-latest", // Use vision model for image verification
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Is this image containing a Bear, Bear Footprint, or Bear Scat? Answer strictly 'YES' or 'NO'." },
              { type: "image_url", image_url: { url: base64Image } }
            ]
          }
        ],
        max_tokens: 10,
        temperature: 0
      })
    });

    if (!response.ok) return { vote: false, error: "API Error" };
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.toUpperCase() || "";
    return { vote: content.includes("YES"), error: null };
  } catch (e) {
    return { vote: false, error: e.message };
  }
}

const performGeminiSearch = async (apiKey, requestTime) => {
  if (!apiKey) {
    console.log("[Server] No Gemini API Key provided.");
    return [];
  }
  console.log("[Server] Starting Gemini search...");
  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
      Current Time: ${requestTime}.
      Task: Search for "熊 出没" (Bear Sightings) in Japan.
      Sources: STRICTLY LIMIT to:
      1. Official Government/Police websites (e.g., pref.hokkaido.lg.jp, police.pref...)
      2. Major Japanese News Media (NHK, Yahoo News JP, Hokkaido Shimbun...)
      3. DO NOT use social media (X/Twitter, Facebook) for this search.

      Output: A purely JSON Array (no markdown).
      Schema: [{
        "id": "g-1",
        "title": "Location - Source Name",
        "lat": 35.123,
        "lng": 139.123,
        "desc": "Summary of the official report",
        "count": 1,
        "source": "NHK/Police",
        "date": "YYYY-MM-DD",
        "url": "https://news..."
      }]
    `;
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });

    const text = response.text || "";
    console.log("[Server] Gemini raw response length:", text.length);

    const result = sanitizeData(extractJsonArray(text));
    console.log(`[Server] Gemini found ${result.length} items.`);
    return result.map(item => ({ ...item, provider: 'gemini' }));
  } catch (e) {
    console.error(`Gemini Error: ${e.message}`);
    return [];
  }
};

let globalCache = { hotspots: [], timestamp: 0, counts: { grok: 0, gemini: 0 } };

app.get('/api/health', (req, res) => {
  console.log("[Server] Health check received");
  res.json({ status: "ok", port: PORT });
});

app.get('/api/sightings', (req, res) => res.json(globalCache));

app.post('/api/verify', async (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: "No image provided" });

  const xaiKey = process.env.XAI_API_KEY;
  console.log("[Server] Verify request - invoking Grok Vision...");

  const result = await performGrokVerify(xaiKey, image);
  res.json({
    vote: result.vote,
    provider: 'GROK',
    success: !result.error
  });
});

app.post('/api/scan', async (req, res) => {
  console.log("[Server] Scan request received");
  // Use environment variables primarily
  const xaiKey = process.env.XAI_API_KEY;
  const googleKey = process.env.API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  console.log(`[Server] Keys Status - xAI: ${!!xaiKey}, Google: ${!!googleKey}`);

  if (!xaiKey && !googleKey) {
    console.error("[Server] Missing API Keys");
    return res.status(400).json({ error: "Missing API Keys. Please configure .env or settings." });
  }

  try {
    const TIMEOUT_MS = 30000;
    const searchPromise = Promise.all([
      performGrokSearch(xaiKey),
      performGeminiSearch(googleKey, new Date().toISOString())
    ]);

    const [grokData, geminiData] = await Promise.race([
      searchPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("AI Search Timeout")), TIMEOUT_MS))
    ]);

    const combined = [...grokData, ...geminiData].sort((a, b) => new Date(b.date) - new Date(a.date));

    // DEBUG: Check if providers are preserved
    console.log("[Server] Combined Providers:", combined.map(i => i.provider));

    globalCache = {
      hotspots: combined,
      timestamp: Date.now(),
      counts: { grok: grokData.length, gemini: geminiData.length }
    };

    console.log(`[Server] Scan complete. Total items: ${combined.length}`);
    res.json(globalCache);

  } catch (error) {
    console.error("[API] Scan Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Default route for SPA
app.use('/api', (req, res) => res.status(404).json({ error: "API Route Not Found" }));

app.use(express.static(path.join(__dirname, 'dist')));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));