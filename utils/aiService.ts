import { GoogleGenAI } from "@google/genai";
import { BearHotspot } from "../types";

// Helper to extract JSON from markdown code blocks or raw text
const extractJsonArray = (text: string): any[] => {
  if (!text) return [];
  try {
    // Try to find markdown block first
    const match = text.match(/```json\s*(\[\s*[\s\S]*?\s*\])\s*```/);
    if (match && match[1]) return JSON.parse(match[1]);
    
    // Fallback: look for array brackets [ ... ]
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(text.substring(start, end + 1));
    }
  } catch (e) {
    console.error("JSON Parse Error:", e);
  }
  return [];
};

const sanitizeData = (data: any[]): BearHotspot[] => {
  if (!Array.isArray(data)) return [];
  return data.map((item: any) => ({
    ...item,
    lat: Number(item.lat),
    lng: Number(item.lng),
    count: Number(item.count || 1),
    // Ensure ID is string
    id: String(item.id || Math.random().toString(36).substr(2, 9)),
    url: item.url || undefined
  })).filter(item => !isNaN(item.lat) && !isNaN(item.lng));
};

// Helper to calculate date range strings
const getDateRangeInfo = (days: number) => {
  const today = new Date();
  const pastDate = new Date();
  pastDate.setDate(today.getDate() - days);
  
  return {
    todayStr: today.toISOString().split('T')[0],
    pastDateStr: pastDate.toISOString().split('T')[0],
    days
  };
};

export const performScan = async (xaiKey?: string): Promise<{ hotspots: BearHotspot[], counts: { grok: number, gemini: number } }> => {
  let geminiResults: BearHotspot[] = [];
  let grokResults: BearHotspot[] = [];
  
  // Calculate dynamic date range (Last 30 days)
  const { todayStr, pastDateStr, days } = getDateRangeInfo(30);

  // 1. Gemini Search (Client Side)
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Current Date: ${todayStr}.
      
      **STRICT DATE REQUIREMENT**: 
      Only search for events that happened between ${pastDateStr} and ${todayStr} (Last ${days} days).
      IGNORE any news older than ${pastDateStr}.

      Task: Search Google News for confirmed "熊出没" (Bear sightings) in Japan.
      Output: A purely JSON Array (no markdown).
      
      Schema: [{
        "id": "g-1",
        "title": "Location/News Title (Traditional Chinese)",
        "lat": 35.123,
        "lng": 139.123,
        "desc": "Short description of the event (Traditional Chinese)",
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
    
    geminiResults = sanitizeData(extractJsonArray(response.text || ""));
    
    // Client-side double check to filter out old dates if AI hallucinates
    geminiResults = geminiResults.filter(item => item.date >= pastDateStr);

  } catch (e) {
    console.error("Gemini Client Error:", e);
    // Re-throw if it's a critical auth error so the UI can show it
    if (e instanceof Error && (e.message.includes("403") || e.message.includes("API key"))) {
        throw new Error("Gemini API Key 無效或未啟用 (Invalid API Key)");
    }
  }

  // 2. Grok Search (Client Side) 
  if (xaiKey) {
    try {
       const systemPrompt = `
         You are a real-time event tracker.
         Current Date: ${todayStr}.
         
         **CRITICAL RULE**: 
         You must ONLY return bear sightings that occurred AFTER ${pastDateStr}.
         DO NOT return data from 2022, 2023, or early 2024.
         If a date is not within the last ${days} days, ignore it.
         
         Task: List 3-5 recent bear sightings in Japan based on social media or news.
         Format: JSON Array only. 
         Keys: id, title (Traditional Chinese), lat, lng, desc (Traditional Chinese), count, source, date (YYYY-MM-DD), url.
         
         Provider mark: Set 'provider' field to 'grok'.
       `;
       
       const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${xaiKey}` },
        body: JSON.stringify({
          model: "grok-2-latest",
          messages: [
            { role: "system", content: systemPrompt }, 
            { role: "user", content: `Find bear sightings in Japan between ${pastDateStr} and ${todayStr}.` }
          ],
          stream: false,
          temperature: 0.1 
        })
      });
      if (response.ok) {
        const data = await response.json();
        const rawGrokData = extractJsonArray(data.choices?.[0]?.message?.content || "");
        
        // Sanitize and explicitly attach provider info
        grokResults = sanitizeData(rawGrokData).map(item => ({ ...item, provider: 'grok' }));
        
        // Client-side double check for Grok dates
        grokResults = grokResults.filter(item => item.date >= pastDateStr);
      }
    } catch (e) {
      console.warn("Grok Client Error (likely CORS):", e);
    }
  }

  const combined = [...grokResults, ...geminiResults].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return {
    hotspots: combined,
    counts: { grok: grokResults.length, gemini: geminiResults.length }
  };
};