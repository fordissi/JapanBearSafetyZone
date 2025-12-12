import React, { useState, useEffect } from 'react';
import { Info, Leaf, Mountain, Share2, Copy } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import BearMap from './components/BearMap';
import AlertSystem from './components/AlertSystem';
import Quiz from './components/Quiz';
import GearChecklist from './components/GearChecklist';
import { BearHotspot } from './types';

const STORAGE_KEY = 'bear_hotspots_cache_v1';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const App: React.FC = () => {
  const [hotspots, setHotspots] = useState<BearHotspot[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Load cached data on mount
  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        // Load if cache is valid (less than 24h)
        if (age < CACHE_DURATION) {
          setHotspots(data);
          const date = new Date(timestamp);
          setLastUpdated(`上次掃描 (庫存資料): ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
        }
      } catch (e) {
        console.error("Failed to load cache", e);
      }
    }
  }, []);

  const fetchLiveSightings = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        Task: Search for bear sightings (熊出没) and human-bear conflicts in Japan from the last 14 days.
        
        Output Requirement:
        1. Search in Japanese/English sources but output the result content in **Traditional Chinese (繁體中文)** for a Taiwanese audience.
        2. Extract 3 to 6 distinct locations.
        3. Return ONLY a raw JSON array string inside a markdown code block (e.g., \`\`\`json ... \`\`\`).
        
        The JSON objects must follow this structure:
        {
          "id": "unique-id",
          "title": "地點名稱 (縣市/町)",
          "lat": 12.34, 
          "lng": 123.45,
          "desc": "簡短的事件描述（請翻譯成繁體中文，例如：有人在附近目擊身高約1.5米的熊...）",
          "count": 1,
          "source": "新聞來源 (NHK/Twitter)",
          "date": "YYYY-MM-DD" 
        }
        
        Important:
        - "date": Must be the date of the sighting in YYYY-MM-DD format.
        - You MUST estimate the Latitude (lat) and Longitude (lng) for the specific location mentioned.
        - Ensure coordinates are within Japan.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text;
      
      const jsonMatch = text?.match(/```json\n([\s\S]*?)\n```/) || text?.match(/```([\s\S]*?)```/);
      
      if (jsonMatch && jsonMatch[1]) {
        const parsedData: BearHotspot[] = JSON.parse(jsonMatch[1]);
        setHotspots(parsedData);
        
        const now = new Date();
        const timestamp = now.getTime();
        setLastUpdated(`最後更新: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
        
        // Persist to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          data: parsedData,
          timestamp: timestamp
        }));

      } else {
        console.warn("Could not parse JSON from AI response:", text);
        alert("AI 掃描完成但無法解析資料，請重試。");
      }

    } catch (error) {
      console.error("Failed to fetch live data:", error);
      alert("連線失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Japan Safe Trip - 熊出沒注意',
      text: '這是我為了日本旅遊開發的熊出沒警示 App，可以查最近的目擊熱點！',
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('網址已複製到剪貼簿！');
      } catch (err) {
        alert('無法複製網址，請手動複製瀏覽器網址列。');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-16 selection:bg-red-200">
      {/* Hero Header - Fluent Design */}
      <header className="relative bg-slate-900 text-white overflow-hidden shadow-2xl">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600 rounded-full mix-blend-overlay filter blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/4 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-600 rounded-full mix-blend-overlay filter blur-[80px] opacity-20 translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="max-w-6xl mx-auto pt-16 pb-24 px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 text-red-100 px-4 py-1.5 rounded-full text-sm font-medium mb-6 backdrop-blur-md shadow-sm">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
            2025 日本熊出沒注意
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
            日本旅遊護身符
            <span className="block text-2xl md:text-3xl font-medium text-slate-300 mt-3 tracking-widest">BEAR SAFETY ZONE</span>
          </h1>
          <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-light">
            專為台灣旅日遊客設計。利用 AI 即時追蹤熊出沒熱點、偵測所在地風險，並提供專業生存指南。
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 -mt-20 space-y-8 relative z-20">
        
        {/* Section 1: Map (Full Width) */}
        <section className="bg-white/80 backdrop-blur-xl rounded-3xl p-2 shadow-2xl border border-white/50 ring-1 ring-slate-900/5">
           <BearMap 
             hotspots={hotspots} 
             onScan={fetchLiveSightings} 
             loading={loading}
             lastUpdated={lastUpdated}
           />
        </section>

        {/* Section 2: Alert & Checklist (Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section>
             <AlertSystem hotspots={hotspots} />
          </section>
          
          <section>
             <GearChecklist />
          </section>
        </div>

        {/* Section 3: Quiz (Full Width) */}
        <section>
           <Quiz />
        </section>

        {/* Info Footer */}
        <footer className="text-center text-slate-500 text-sm py-12 border-t border-slate-200/60 mt-8 flex flex-col items-center gap-4">
          
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-5 py-2 bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 text-slate-600 transition-all active:scale-95"
          >
            <Share2 size={16} />
            分享給旅伴
          </button>

          <div className="flex items-center justify-center gap-2 font-medium">
            <Info size={16} />
            資料來源：Google Search Grounding (Live AI Analysis)
          </div>
          <p className="text-xs opacity-70 max-w-md">
            免責聲明：此為 Beta 測試版本。在危及生命的緊急情況下，請勿僅依賴此應用程式，務必遵循當地官方指示。
          </p>
          <div className="flex justify-center gap-4 text-slate-400">
             <span className="flex items-center gap-1 text-xs"><Mountain size={12}/> Safe Hiking</span>
             <span className="flex items-center gap-1 text-xs"><Leaf size={12}/> Respect Nature</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;