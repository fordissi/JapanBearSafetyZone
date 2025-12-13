import 'dotenv/config'; // Load environment variables from .env file
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
const performGrokSearch = async (apiKey) => {
  if (!apiKey) return [];
  console.log("[Server] Starting Grok search...");
  try {
    const systemPrompt = `Task: List 3-5 recent bear sightings in Japan. Format: JSON Array only. Keys: id, title, lat, lng, desc, count, source, date, url.`;
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "grok-2-latest",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Search recent sightings." }],
        stream: false,
        temperature: 0.1 
      })
    });
    
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Grok status ${response.status}: ${errText}`);
    }
    
    const data = await response.json();
    const result = sanitizeData(extractJsonArray(data.choices?.[0]?.message?.content || ""));
    console.log(`[Server] Grok found ${result.length} items.`);
    return result;
  } catch (e) {
    console.error(`Grok Error: ${e.message}`);
    return [];
  }
};

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
      Task: Search Google News for confirmed "熊出没" (Bear sightings) in Japan within the last 30 days.
      Output: A purely JSON Array (no markdown).
      Schema: [{
        "id": "g-1",
        "title": "Location/News Title",
        "lat": 35.123,
        "lng": 139.123,
        "desc": "Short description of the event",
        "count": 1,
        "source": "News Source Name",
        "date": "YYYY-MM-DD",
        "url": "https://news-link..."
      }]
    `;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });
    
    const text = response.text || "";
    console.log("[Server] Gemini raw response length:", text.length);
    
    const result = sanitizeData(extractJsonArray(text));
    console.log(`[Server] Gemini found ${result.length} items.`);
    return result;
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

app.post('/api/scan', async (req, res) => {
  console.log("[Server] Scan request received");
  const { manualKeys } = req.body || {};
  
  const xaiKey = manualKeys?.xai || process.env.XAI_API_KEY;
  const googleKey = manualKeys?.google || process.env.API_KEY || process.env.GOOGLE_API_KEY;
  
  if (!xaiKey && !googleKey) {
      console.error("[Server] Missing API Keys");
      return res.status(400).json({ error: "Missing API Keys. Please configure .env or settings." });
  }

  try {
    const TIMEOUT_MS = 25000;
    const searchPromise = Promise.all([
      performGrokSearch(xaiKey),
      performGeminiSearch(googleKey, new Date().toISOString())
    ]);
    
    const [grokData, geminiData] = await Promise.race([
        searchPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("AI Search Timeout")), TIMEOUT_MS))
    ]);
    
    const combined = [...grokData, ...geminiData].sort((a, b) => new Date(b.date) - new Date(a.date));
    
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
app.all('/api/*', (req, res) => res.status(404).json({ error: "API Route Not Found" }));

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));