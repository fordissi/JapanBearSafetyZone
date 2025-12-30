import React, { useState, useEffect } from 'react';
import { Info, Leaf, Mountain, Share2, Key, Settings, ArrowRight, Activity, Twitter, Globe, Edit3, X, Save, Cloud, CloudLightning, WifiOff, AlertTriangle, RefreshCw, Zap, Camera } from 'lucide-react';
import BearMap from './components/BearMap';
import AlertSystem from './components/AlertSystem';
import Quiz from './components/Quiz';
import GearChecklist from './components/GearChecklist';
import ReportModal from './components/ReportModal'; // NEW
import { BearHotspot } from './types';
import { performScan } from './utils/aiService';

const STORAGE_KEY = 'bear_hotspots_client_v1';

const App: React.FC = () => {
  const [hotspots, setHotspots] = useState<BearHotspot[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Detailed Error State
  const [scanError, setScanError] = useState<{ message: string, details?: string } | null>(null);

  const [keyStatusText, setKeyStatusText] = useState<string>('System Ready');
  const [cooldown, setCooldown] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false); // New state for report modal
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | undefined>(undefined);

  // Guidelines: API Key handled externally via process.env.API_KEY.

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Initial Location Check for Reporting
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log("User location denied/unavailable", err)
      );
    }
  }, []);

  const formatUpdateString = (timestamp: number, counts: { grok: number, gemini: number, overlap?: number }) => {
    const date = new Date(timestamp);
    let str = `Live Scan: ${date.toLocaleTimeString()} (Gemini: ${counts.gemini}, Grok: ${counts.grok})`;
    if (counts.overlap && counts.overlap > 0) {
      str += ` [雙重確認: ${counts.overlap}筆]`;
    }
    return str;
  };

  // Initial Load from Cache
  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const { data, timestamp, counts } = JSON.parse(cached);
        if (Array.isArray(data) && data.length > 0) {
          setHotspots(data);
          // If counts exist in cache use them, otherwise default to 0
          const c = counts || { grok: 0, gemini: data.length };
          setLastUpdated(`Cached: ${new Date(timestamp).toLocaleTimeString()}`);
        }
      } catch (e) { }
    }
  }, []);

  const handleScan = async () => {
    if (cooldown > 0) return;

    setLoading(true);
    setScanError(null);

    try {
      const result = await performScan();

      if (result.hotspots.length === 0) {
        throw new Error("AI 未能找到相關新聞。請稍後再試。");
      }

      setHotspots(result.hotspots);
      const timestamp = Date.now();
      setLastUpdated(formatUpdateString(timestamp, result.counts));

      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        data: result.hotspots,
        timestamp: timestamp,
        counts: result.counts
      }));

    } catch (error: any) {
      console.error("Scan Failed:", error);
      setScanError({
        message: "掃描失敗",
        details: error.message || error.toString()
      });
    } finally {
      setLoading(false);
      setCooldown(15);
    }
  };

  const handleNewReport = (report: BearHotspot) => {
    // Add new verified report to the list
    const updated = [report, ...hotspots];
    setHotspots(updated);
    // Update cache as well to persist the user report locally
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      data: updated,
      timestamp: Date.now(),
      counts: { grok: 0, gemini: updated.length } // simplified count update
    }));
    setShowReportModal(false);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Japan Safe Trip',
        url: window.location.href,
      }).catch(console.error);
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('網址已複製！');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-16 selection:bg-red-200">

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          onClose={() => setShowReportModal(false)}
          onSubmit={handleNewReport}
          userLocation={userLocation}
        // xaiKey prop removed as it's handled on backend now
        />
      )}

      {/* Settings Modal - REMOVED (No longer needed) */}

      {/* Hero Header */}
      <header className="relative bg-slate-900 text-white overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600 rounded-full mix-blend-overlay filter blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/4 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-600 rounded-full mix-blend-overlay filter blur-[80px] opacity-20 translate-y-1/3 -translate-x-1/4"></div>

        {/* Top Right Controls Container */}
        <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
          {/* Report Button (Moved Here) */}
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 border border-red-500"
          >
            <Camera size={18} />
            <span className="hidden sm:inline">回報目擊</span>
          </button>

          {/* Settings Button Removed */}
        </div>

        <div className="max-w-6xl mx-auto pt-16 pb-24 px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 text-red-100 px-4 py-1.5 rounded-full text-sm font-medium mb-6 backdrop-blur-md shadow-sm">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
            2025 日本熊出没注意 (Client-Side Beta)
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
            日本旅遊護身符
            <span className="block text-2xl md:text-3xl font-medium text-slate-300 mt-3 tracking-widest">BEAR SAFETY ZONE</span>
          </h1>
          <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-light mb-4">
            Gemini 鎖定官方新聞 ✕ Grok 監測社群情報
            <br /><span className="text-sm opacity-70 mt-1 block">全方位分析日本最新熊出沒熱點</span>
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 -mt-20 space-y-8 relative z-20">
        <section className="bg-white/80 backdrop-blur-xl rounded-3xl p-2 shadow-2xl border border-white/50 ring-1 ring-slate-900/5 relative overflow-hidden min-h-[550px]">
          {/* General Error Overlay */}
          {scanError && (
            <div className="absolute inset-0 z-[500] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-l-4 border-red-500">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                  <Zap size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{scanError.message}</h3>
                <p className="text-slate-600 mb-6 text-sm">{scanError.details}</p>
                <div className="flex gap-3">
                  <button onClick={handleScan} className="flex-1 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg">
                    重試
                  </button>
                </div>
              </div>
            </div>
          )}

          <BearMap
            hotspots={hotspots}
            onScan={handleScan}
            loading={loading}
            lastUpdated={lastUpdated}
            cooldown={cooldown}
          />
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section id="alert-section"><AlertSystem hotspots={hotspots} /></section>
          {/* Added ID for scroll targeting */}
          <section id="gear-section" className="scroll-mt-24"><GearChecklist /></section>
        </div>

        {/* Added ID for scroll targeting */}
        <section id="quiz-section" className="scroll-mt-24"><Quiz /></section>

        <footer className="text-center text-slate-500 text-sm py-12 border-t border-slate-200/60 mt-8 flex flex-col items-center gap-4">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-5 py-2 bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 text-slate-600 transition-all active:scale-95"
          >
            <Share2 size={16} />
            分享給旅伴
          </button>
        </footer>
      </main>
    </div>
  );
};

export default App;