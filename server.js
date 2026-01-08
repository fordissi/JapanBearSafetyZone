import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
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

// SIMPLIFIED GROK: Direct X.com Search (User's Optimized Approach)
const performGrokSearch = async (apiKey, location, dateLimit) => {
  const validKey = apiKey || process.env.XAI_API_KEY;
  if (!validKey) return [];

  console.log("[Server] 🔍 Grok: Direct X.com Search (Simplified)");

  const prompt = `你是一個專業的日本熊出沒即時監測系統。

任務：使用你的X.com搜索工具，搜尋最近在 ${location || "日本"}（特別是 ${location || "仙台及周邊"}）的熊出沒相關貼文。重點使用日文關鍵字如“クマ 出没”或“熊 出没”，並限制語言為日文（lang:ja），以獲取準確的日本本地報告。搜尋應優先考慮最近的即時或最新貼文（使用 since: 或 until: 操作符，基於當前日期限制在最近7-30天內）。

策略（優先級）：
1. **具體貼文**：使用 x_keyword_search 或 x_semantic_search 工具查找真實、可驗證的貼文。如果找到有ID/URL的相關貼文，請提取並列出它們。限於最新且相關的5-10條，避免無關或舊貼文。
2. **搜尋摘要（Fallback）**：如果找不到具體貼文，或者作為補充，永遠提供一個"搜尋結果頁"連結。這一點非常重要，因為用戶希望看到即便沒有具體貼文，也能直接點擊查看最新搜尋結果。使用 URL-encoded 的查詢字符串確保連結有效。

搜尋摘要項目格式：
- id: "x-search-summary"
- title: "X.com 實時搜尋: ${location || "地區"}"
- desc: "點擊此處查看 X.com 上關於 ${location || "該地區"} 熊出沒的最新即時搜尋結果。"
- **url**: "https://x.com/search?q=%E3%82%AF%E3%83%9E%20%E5%87%BA%E6%B2%A1+${encodeURIComponent(location || "Japan")}&src=typed_query&f=live" (請自動填入地點並URL-encode關鍵字)
- lat/lng: 該地點的中心座標（例如仙台：lat: 38.2682, lng: 140.8694）

JSON 格式範例：
[
  {
    "id": "x-{真實ID}",
    "title": "具體貼文標題",
    "lat": 38.3, "lng": 140.9,
    "desc": "貼文內容摘要...（包括任何提及的地點或細節）",
    "source": "X.com",
    "date": "YYYY-MM-DD",
    "url": "https://x.com/{user}/status/{id}"
  },
  {
    "id": "x-search-summary",
    "title": "X.com 實時搜尋: 仙台",
    "jp_title": "X.com 實時搜尋: 仙台",
    "lat": 38.2682,
    "lng": 140.8694,
    "desc": "點擊查看仙台地區最新的熊出沒搜尋結果 (X.com Live Search)。",
    "count": 1, // 可選：估計結果數量
    "source": "X.com Search",
    "date": "YYYY-MM-DD", // 當前日期
    "url": "https://x.com/search?q=%E3%82%AF%E3%83%9E%20%E5%87%BA%E6%B2%A1+%E4%BB%99%E5%8F%B0&src=typed_query&f=live"
  }
]

現在，請先使用適當的X.com工具（如 x_keyword_search with query: "クマ 出没 ${location || "仙台"}" lang:ja mode:Latest limit:10）進行搜尋，提取相關資訊，然後返回嚴格符合上述JSON格式的陣列結果。如果沒有具體貼文，只返回搜尋摘要項目。確保所有資料準確且基於工具結果，不要捏造資訊。`;

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validKey}`
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 2000,
        stream: false
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Grok] ❌ API Error: ${response.status} - ${errText}`);
      return [];
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";

    console.log("[Grok] 📥 Raw response (first 300 chars):", rawContent.substring(0, 300));

    let result = sanitizeData(extractJsonArray(rawContent));

    // Strict validation
    result = result.filter(item => {
      const hasValidDate = item.date &&
        item.date.match(/^\d{4}-\d{2}-\d{2}$/) &&
        item.date !== "YYYY-MM-DD" &&
        item.date >= dateLimit;

      const hasValidId = item.id &&
        !item.id.includes("12345") &&
        !item.id.includes("xxxxx") &&
        item.id.startsWith("x-") &&
        item.id.length > 5;

      const hasValidUrl = item.url &&
        item.url.match(/^https:\/\/(x\.com|twitter\.com)\/[\w]+\/status\/\d{15,20}$/);

      const hasValidCoords = item.lat >= 24 && item.lat <= 46 &&
        item.lng >= 122 && item.lng <= 154;

      const hasContent = item.desc && item.desc.length > 10;

      const isValid = hasValidDate && hasValidId && hasValidUrl && hasValidCoords && hasContent;

      if (!isValid && item.id) {
        console.log(`[Grok] ❌ Filtered: ${item.id}`, {
          date: hasValidDate,
          id: hasValidId,
          url: hasValidUrl,
          coords: hasValidCoords,
          content: hasContent
        });
      }

      return isValid;
    });

    console.log(`[Grok] ✅ Valid items: ${result.length}`);

    // CODE-LEVEL FALLBACK: If Grok finds nothing (no live access),
    // manually inject the "Search Summary" item so user always has a link.
    if (result.length === 0) {
      console.log("[Grok] result is empty. Injecting Fallback Summary.");
      const searchQuery = `熊出没 ${location || "Japan"}`;
      const encodedQuery = encodeURIComponent(searchQuery);

      // Default coordinates
      let fallbackLat = 38.2682; // Sendai default
      let fallbackLng = 140.8694;

      // Simple heuristic for major cities
      if (location && location.includes("札幌")) { fallbackLat = 43.0618; fallbackLng = 141.3545; }
      else if (location && location.includes("東京")) { fallbackLat = 35.6895; fallbackLng = 139.6917; }
      else if (location && location.includes("秋田")) { fallbackLat = 39.7169; fallbackLng = 140.1025; }

      const summaryItem = {
        "id": "x-search-summary-" + Date.now(),
        "title": `X.com 實時搜尋: ${location || "仙台及周邊"}`,
        "jp_title": `X.com 實時搜尋: ${location || "仙台及周邊"}`,
        "lat": fallbackLat,
        "lng": fallbackLng,
        "desc": `Grok 暫未抓取到具體貼文。點擊標題直接查看 X.com 上關於「${searchQuery}」的最新即時結果。`,
        "count": 1,
        "source": "X.com Search",
        "date": new Date().toISOString().split('T')[0],
        "url": `https://x.com/search?q=${encodedQuery}&src=typed_query&f=live`,
        "isSearchSummary": true,
        "provider": "grok"
      };

      result.push(summaryItem);
    }

    if (result.length > 0) {
      console.log("[Grok] 📌 Sample:", JSON.stringify(result[0], null, 2));
    }

    return result;

  } catch (e) {
    console.error(`[Grok] ❌ Error: ${e.message}`);
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
        model: "grok-2-vision-latest",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Is this image containing a Bear, Bear Footprint, or Bear Scat? Answer strictly 'YES' or 'NO'." },
            { type: "image_url", image_url: { url: base64Image } }
          ]
        }],
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

const performGeminiSearch = async (apiKey, requestTime, location, dateLimit) => {
  if (!apiKey) {
    console.log("[Server] No Gemini API Key.");
    return [];
  }
  console.log("[Server] 🔍 Gemini: Google News Search");
  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Current Time: ${requestTime}.
      Task: Search for "熊 出没" (Bear Sightings) in ${location || "Japan"}.
      Time: ONLY reports >= ${dateLimit}.
      Sources: Official Government/Police or Major News.
      
      CRITICAL RULES:
      1. Provide valid lat/lng for locations (Sendai ~38.3/140.9, Sapporo ~43.1/141.3)
      2. **URL must be the ACTUAL direct link** to the news article found by the googleSearch tool.
      3. Do NOT use "https://news..." or any placeholder.

      Output: Pure JSON Array (no markdown).
      Schema: [{
        "id": "g-{unique_id}",
        "title": "Location - Source",
        "lat": 38.2682,
        "lng": 140.8694,
        "desc": "Summary",
        "count": 1,
        "source": "NHK/Police",
        "date": "YYYY-MM-DD",
        "url": "https://www3.nhk.or.jp/tohoku/news/..."
      }]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });

    const text = typeof response.text === 'function' ? response.text() : (response.text || "");
    console.log("[Gemini] Response length:", text.length);

    let result = sanitizeData(extractJsonArray(text));
    result = result.filter(item => item.date >= dateLimit).map(item => ({ ...item, provider: 'gemini' }));

    console.log(`[Gemini] ✅ Items: ${result.length}`);
    return result;
  } catch (e) {
    console.error(`[Gemini] ❌ Error: ${e.message}`);
    return [];
  }
};

// --- 3. Gemini Species Analysis (New) ---
const performSpeciesAnalysis = async (lat, lng) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
    Role: Wildlife Expert & GIS Specialist.
    Task: Identify the bear species native to the specific coordinates: (${lat}, ${lng}).
    
    Instructions:
    1. Determine the country/region (e.g., Japan, Taiwan, USA).
    2. Identify if any bear species naturally inhabit this area.
    3. If YES, provide details for the dominant or most dangerous species.
    4. If NO (e.g. Urban Center, Desert, Island without bears like Okinawa/Hawaii, or Taiwan City Center), return type 'NONE' (unless mountains in Taiwan -> Formosan Black Bear).
    5. Be specific about subspecies (e.g. Hokkaido Brown Bear vs Japanese Black Bear vs Formosan Black Bear).
    6. Language: Traditional Chinese (繁體中文).
    
    Output JSON Schema:
    {
      "name": "Species Name (Common & Local)",
      "scientificName": "Scientific Name",
      "type": "BROWN" | "BLACK" | "POLAR" | "NONE",
      "riskLevel": "EXTREME (極高)" | "HIGH (高)" | "MODERATE (中)" | "LOW (低)" | "NONE (無)",
      "features": "Brief physical description (max 30 chars)",
      "advice": "One key survival tip for this specific species (max 30 chars)"
    }
    
    Examples:
    - Sapporo -> Brown Bear
    - Tokyo (Urban) -> NONE or LOW risk (Asian Black Bear in nearby mountains)
    - Taipei (Urban) -> NONE or LOW risk (Formosan Black Bear in deep mountains)
    - Yushan (Taiwan) -> Formosan Black Bear (Asian Black Bear subspecies)
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const text = typeof response.text === 'function' ? response.text() : (response.text || "");
    return JSON.parse(text);
  } catch (e) {
    console.error(`[Server] Species Analysis Error: ${e.message}`);
    return null;
  }
};

app.post('/api/analyze-species', async (req, res) => {
  const { lat, lng } = req.body;
  if (!lat || !lng) return res.status(400).json({ error: "Missing lat/lng" });

  try {
    console.log(`[Server] Analyzing species for: ${lat}, ${lng}`);
    const data = await performSpeciesAnalysis(lat, lng);

    if (!data) {
      return res.status(500).json({ error: "AI Analysis Failed" });
    }

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

let globalCache = { hotspots: [], timestamp: 0, counts: { grok: 0, gemini: 0 } };

app.get('/api/health', (req, res) => {
  console.log("[Server] Health check");
  res.json({ status: "ok", port: PORT });
});

app.get('/api/sightings', (req, res) => res.json(globalCache));

app.post('/api/verify', async (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: "No image" });

  const result = await performGrokVerify(process.env.XAI_API_KEY, image);
  res.json({ vote: result.vote, provider: 'GROK', success: !result.error });
});

app.post('/api/scan', async (req, res) => {
  console.log("[Server] Scan request");
  const { location } = req.body;

  const xaiKey = process.env.XAI_API_KEY;
  const googleKey = process.env.API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  if (!xaiKey && !googleKey) {
    return res.status(400).json({ error: "Missing API Keys" });
  }

  const dateObj = new Date();
  dateObj.setDate(dateObj.getDate() - 60);
  const dateLimit = dateObj.toISOString().split('T')[0];

  console.log(`[Server] Location: ${location || "All"}, Date: > ${dateLimit}`);

  const results = await Promise.allSettled([
    performGrokSearch(xaiKey, location, dateLimit),
    performGeminiSearch(googleKey, new Date().toISOString(), location, dateLimit)
  ]);

  const grokData = results[0].status === 'fulfilled' ? results[0].value : [];
  const geminiData = results[1].status === 'fulfilled' ? results[1].value : [];

  if (results[0].status === 'rejected') console.error("Grok Failed:", results[0].reason);
  if (results[1].status === 'rejected') console.error("Gemini Failed:", results[1].reason);

  const combined = [...grokData, ...geminiData].sort((a, b) => new Date(b.date) - new Date(a.date));

  console.log("[Server] Providers:", combined.map(i => i.provider));

  globalCache = {
    hotspots: combined,
    timestamp: Date.now(),
    counts: { grok: grokData.length, gemini: geminiData.length }
  };

  console.log(`[Server] ✅ Total: ${combined.length}`);
  res.json(globalCache);
});

app.use('/api', (req, res) => res.status(404).json({ error: "API Route Not Found" }));
app.use(express.static(path.join(__dirname, 'dist')));
app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));