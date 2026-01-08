import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { RefreshCw, Radio, Map as MapIcon, Calendar, Clock, Square, Circle, Backpack, BookOpen, ArrowDown, ChevronDown, ChevronUp, User, Camera, ShieldAlert } from 'lucide-react';
import { MAP_CENTER_JAPAN, MAP_ZOOM_LEVEL } from '../constants';
import { BearHotspot } from '../types';

// Fix for default Leaflet marker icons
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

// Helper to calculate days ago
const getDaysAgo = (dateString: string) => {
  if (!dateString) return 0;
  const today = new Date();
  const sightingDate = new Date(dateString);
  const diffTime = Math.abs(today.getTime() - sightingDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// --- MARKER STYLES ---

const getMarkerColor = (daysAgo: number) => {
  if (daysAgo <= 7) return { fill: "#ef4444", border: "#991b1b" }; // Red
  if (daysAgo <= 14) return { fill: "#eab308", border: "#854d0e" }; // Yellow
  return { fill: "#94a3b8", border: "#475569" }; // Slate
};

interface BearMapProps {
  hotspots: BearHotspot[];
  onScan: () => void;
  loading: boolean;
  lastUpdated: string;
  cooldown?: number;
  searchLocation: string;
  setSearchLocation: (loc: string) => void;
  onUseCurrentLocation: () => void;
}

const BearMap: React.FC<BearMapProps> = ({ hotspots, onScan, loading, lastUpdated, cooldown = 0, searchLocation, setSearchLocation, onUseCurrentLocation }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Legend State: Open by default on desktop, Closed by default on mobile (handled by useEffect)
  const [isLegendOpen, setIsLegendOpen] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current).setView(MAP_CENTER_JAPAN, MAP_ZOOM_LEVEL);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);

    // Initial check for mobile to collapse legend
    if (window.innerWidth < 768) {
      setIsLegendOpen(false);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when hotspots prop changes
  useEffect(() => {
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
      console.log('[BearMap Debug] Hotspots received:', hotspots);
      console.log('[BearMap Debug] Hotspots length:', hotspots.length);

      hotspots.forEach((spot, index) => {
        // Skip Search Summary items (they are shown in the UI, not as map markers)
        if (spot.isSearchSummary) return;

        const daysAgo = getDaysAgo(spot.date);
        const { fill, border } = getMarkerColor(daysAgo);

        // ... badge logic ... (omitted, will be preserved by replace if I target correctly, but wait, replace needs context)
        // I should just target the loop start and the jitter block separately or use a larger block.
        // Let's use a larger block to be safe.

        let badgeClass;
        let badgeText;

        if (spot.verificationStatus === 'VERIFIED') {
          badgeClass = "bg-green-50 text-green-700 border-green-200 shadow-sm";
          badgeText = "社群回報 (已驗證)";
        } else if (daysAgo <= 7) {
          badgeClass = "bg-red-50 text-red-700 border-red-200 shadow-sm";
          badgeText = "危險 (7天內)";
        } else if (daysAgo <= 14) {
          badgeClass = "bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm";
          badgeText = "注意 (8-14天)";
        } else {
          badgeClass = "bg-slate-100 text-slate-600 border-slate-200";
          badgeText = `紀錄 (>14天)`;
        }

        // Safety check and casting
        const lat = Number(spot.lat);
        const lng = Number(spot.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        // Apply pseudo-random jitter using index to separate identical coordinates
        // Use a spiral pattern or simple random-like scatter based on index
        const angle = index * 137.5; // Golden angle to spread evenly
        const radius = 0.003 + (index * 0.0005); // Increasing radius

        const latOffset = Math.sin(angle) * radius;
        const lngOffset = Math.cos(angle) * radius;

        // --- Marker Creation Logic ---
        let markerIcon;

        if (spot.provider === 'user') {
          // User Report Marker (Circle with User icon)
          markerIcon = L.divIcon({
            className: 'custom-user-marker',
            html: `<div style="
                    width: 32px; 
                    height: 32px; 
                    background-color: #22c55e;
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                ">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
          });
        } else if (spot.provider === 'grok') {
          // Grok (xAI) Style: Diamond (Rotated Square)
          markerIcon = L.divIcon({
            className: 'custom-grok-marker',
            html: `<div style="
                    width: 16px; 
                    height: 16px; 
                    background-color: ${fill};
                    border: 2px solid white;
                    transform: rotate(45deg);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                "></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            popupAnchor: [0, -10]
          });
        } else {
          // Gemini / Default: Square (Official News)
          markerIcon = L.divIcon({
            className: 'custom-news-marker',
            html: `<div style="
                    width: 16px; 
                    height: 16px; 
                    background-color: ${fill};
                    border: 2px solid white;
                    border-radius: 2px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                "></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
            popupAnchor: [0, -8]
          });
        }

        // Apply Jitter here
        const marker = L.marker([lat + latOffset, lng + lngOffset], { icon: markerIcon });

        const popupContent = `
          <div class="font-sans min-w-[220px]">
            <div class="flex items-center gap-2 mb-2">
               <span class="text-[10px] font-bold px-2 py-0.5 rounded border ${badgeClass}">
                 ${badgeText}
               </span>
               <span class="text-[10px] text-slate-400 font-mono ml-auto">
                 ${spot.date}
               </span>
            </div>
            
            <h3 class="font-bold text-base text-slate-800 leading-tight mb-2">
              ${spot.title}
            </h3>
            
            <p class="text-xs text-slate-600 mb-3 leading-relaxed border-l-2 border-slate-100 pl-2">
              ${spot.desc}
            </p>

            <div class="flex items-center justify-between pt-2 border-t border-slate-100">
               <div class="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wide">
                 ${spot.provider === 'grok' ? '<span class="text-slate-800 font-bold">xAI Grok</span>' :
            spot.provider === 'user' ? '<span class="text-green-600 font-bold">User Verified</span>' :
              '<span class="text-blue-600 font-bold">Gemini News</span>'}
               </div>
               ${spot.url ? `<a href="${spot.url}" target="_blank" class="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">來源 <span class="text-[10px]">↗</span></a>` : ''}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        if (markersLayerRef.current) {
          markersLayerRef.current.addLayer(marker);
        }
      });
    }
  }, [hotspots]);

  return (
    <div className="relative w-full h-[550px] bg-slate-100 rounded-2xl overflow-hidden group">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* --- Map Controls Overlay --- */}

      {/* 1. Status Bar (Top Left) */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2 pointer-events-none">
        <div className="bg-white/90 backdrop-blur shadow-sm border border-slate-200 px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-auto">
          <div className={`w-2 h-2 rounded-full ${loading ? 'bg-blue-500 animate-ping' : 'bg-green-500'}`}></div>
          <span className="text-xs font-bold text-slate-600">
            {loading ? 'AI 掃描中...' : `監測點: ${hotspots.length}`}
          </span>
        </div>
        {lastUpdated && (
          <div className="bg-slate-900/80 backdrop-blur text-white px-3 py-1 rounded-full text-[10px] font-mono pointer-events-auto shadow-lg">
            {lastUpdated}
          </div>
        )}
      </div>

      {/* 2. Action Buttons (Top Right) */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2 items-end">

        {/* Search Input Container */}
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur shadow-lg rounded-full p-1 pl-4 border border-slate-200 transition-all focus-within:ring-2 focus-within:ring-blue-100">
          <input
            type="text"
            placeholder="輸入城市 (例如: 札幌)"
            className="bg-transparent border-none outline-none text-sm text-slate-700 w-32 md:w-48 placeholder:text-slate-400"
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
          />
          <button
            onClick={onUseCurrentLocation}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
            title="使用目前位置"
          >
            <MapIcon size={16} />
          </button>
        </div>

        {/* Scan Button */}
        <button
          onClick={onScan}
          disabled={loading || cooldown > 0}
          className={`
              flex items-center gap-2 px-5 py-3 rounded-full shadow-lg transition-all duration-300 font-bold text-sm
              ${loading || cooldown > 0
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:scale-105 active:scale-95'
            }
            `}
          title="啟動 AI 掃描"
        >
          <RefreshCw size={20} className={`${loading ? 'animate-spin' : ''}`} />
          <span>啟動 AI 掃描</span>
          {cooldown > 0 && (
            <span className="ml-1 flex items-center justify-center w-5 h-5 bg-slate-100 text-slate-500 rounded-full text-[10px] border border-slate-200">
              {cooldown}
            </span>
          )}
        </button>

        {/* Search Summary Card (Grok Fallback) */}
        {hotspots.find(h => h.isSearchSummary) && (
          <a
            href={hotspots.find(h => h.isSearchSummary)?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 bg-slate-900/90 hover:bg-black backdrop-blur text-white p-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-3 max-w-[260px] animate-in slide-in-from-right-10 transition-transform hover:-translate-x-1 cursor-pointer"
          >
            <div className="w-8 h-8 flex-shrink-0 bg-white text-black rounded-lg flex items-center justify-center font-bold text-xl">
              𝕏
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">AI 搜尋摘要</span>
              <span className="text-sm font-bold truncate">查看「{searchLocation || "日本"}」即時結果</span>
              <span className="text-[10px] text-slate-400 truncate">Grok 偵測到大量相關討論</span>
            </div>
          </a>
        )}
      </div>

      {/* 3. Legend (Bottom Right) */}
      <div className={`absolute bottom-6 right-4 z-[400] bg-white/95 backdrop-blur shadow-xl border border-slate-200 rounded-2xl transition-all duration-300 overflow-hidden ${isLegendOpen ? 'w-48' : 'w-10 h-10 rounded-full'}`}>

        {/* Toggle Button for Mobile */}
        <button
          onClick={() => setIsLegendOpen(!isLegendOpen)}
          className="absolute top-0 right-0 p-2.5 text-slate-400 hover:text-slate-600 z-10 w-full flex justify-end"
        >
          {isLegendOpen ? <ChevronDown size={16} /> : <MapIcon size={16} className="text-slate-600 m-auto mt-0" />}
        </button>

        {isLegendOpen && (
          <div className="p-4 pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">圖例說明</h4>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 border border-red-800"></div>
                <span className="text-xs font-bold text-slate-700">7天內 (危險)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-700"></div>
                <span className="text-xs font-bold text-slate-700">14天內 (注意)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-400 border border-slate-600"></div>
                <span className="text-xs text-slate-500">非近期 (&gt;14天)</span>
              </div>
              {/* Gemini Legend Item */}
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-slate-400 border border-slate-600 rounded-[1px]"></div>
                <span className="text-xs text-slate-500">Gemini 官方新聞</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-slate-400 border border-slate-600 transform rotate-45"></div>
                <span className="text-xs text-slate-500">xAI 社群來源</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 border border-white ring-1 ring-green-600 flex items-center justify-center">
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                </div>
                <span className="text-xs text-slate-500">用戶即時回報</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Quick Links Overlay (Bottom Left) */}
      <div className="absolute bottom-6 left-6 z-[400] flex gap-2">
        <a href="#alert-section" className="bg-white/90 hover:bg-white backdrop-blur px-3 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-lg border border-slate-200 flex items-center gap-2 transition-transform hover:-translate-y-1">
          <Radio size={14} className="text-orange-500" /> 風險分析
        </a>
        <a href="#quiz-section" className="bg-white/90 hover:bg-white backdrop-blur px-3 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-lg border border-slate-200 flex items-center gap-2 transition-transform hover:-translate-y-1">
          <BookOpen size={14} className="text-blue-500" /> 生存模擬
        </a>
      </div>
    </div>
  );
};

export default BearMap;