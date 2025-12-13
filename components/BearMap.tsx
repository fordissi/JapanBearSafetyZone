import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { RefreshCw, Radio, Map as MapIcon, Calendar, Clock, Square, Circle, Backpack, BookOpen, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react';
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
}

const BearMap: React.FC<BearMapProps> = ({ hotspots, onScan, loading, lastUpdated, cooldown = 0 }) => {
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

      hotspots.forEach((spot) => {
        const daysAgo = getDaysAgo(spot.date);
        const { fill, border } = getMarkerColor(daysAgo);
        
        let badgeClass;
        let badgeText;

        if (daysAgo <= 7) {
          badgeClass = "bg-red-50 text-red-700 border-red-200 shadow-sm";
          badgeText = "危險 (7天內)";
        } else if (daysAgo <= 14) {
          badgeClass = "bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm";
          badgeText = "注意 (8-14天)";
        } else {
          badgeClass = "bg-slate-100 text-slate-600 border-slate-200";
          badgeText = `紀錄 (>14天)`;
        }

        // --- Marker Creation Logic ---
        
        if (spot.provider === 'grok') {
            // Grok (xAI) Style: Diamond (Rotated Square) with Purple Border
            // We use L.divIcon to create custom shapes via CSS
            const grokIcon = L.divIcon({
                className: 'custom-grok-marker',
                html: `<div style="
                    width: 16px; 
                    height: 16px; 
                    background-color: ${fill}; 
                    border: 3px solid #9333ea; 
                    transform: rotate(45deg); 
                    box-shadow: 0 0 10px rgba(147, 51, 234, 0.5);
                    border-radius: 2px;
                "></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10], // Center of the div
                popupAnchor: [0, -10]
            });
            
            L.marker([spot.lat, spot.lng], { icon: grokIcon })
             .bindPopup(createPopupContent(spot, daysAgo, badgeClass, badgeText, true))
             .addTo(markersLayerRef.current!);

        } else {
            // Gemini (Google) Style: Standard Circle Marker
            L.circleMarker([spot.lat, spot.lng], {
                radius: daysAgo <= 7 ? 14 : (daysAgo <= 14 ? 12 : 8),
                fillColor: fill,
                color: border,
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9,
                className: daysAgo <= 7 ? "animate-pulse" : ""
            })
            .bindPopup(createPopupContent(spot, daysAgo, badgeClass, badgeText, false))
            .addTo(markersLayerRef.current!);
        }
      });
    }
  }, [hotspots]);

  const createPopupContent = (spot: BearHotspot, daysAgo: number, badgeClass: string, badgeText: string, isGrok: boolean) => {
    const urlButton = spot.url 
      ? `<a href="${spot.url}" target="_blank" rel="noopener noreferrer" style="display:block; margin-top:10px; padding:6px 10px; background-color:#eff6ff; color:#2563eb; text-decoration:none; border-radius:6px; font-weight:bold; font-size:12px; text-align:center; border:1px solid #dbeafe;">🔗 查看來源 (Source)</a>` 
      : '';
      
    const providerBadge = isGrok 
      ? `<span style="background:#f3e8ff; color:#7e22ce; padding:2px 6px; border-radius:4px; border:1px solid #d8b4fe; font-size:10px; font-weight:bold; margin-right:4px;">xAI Grok (Social)</span>`
      : `<span style="background:#dbeafe; color:#1d4ed8; padding:2px 6px; border-radius:4px; border:1px solid #bfdbfe; font-size:10px; font-weight:bold; margin-right:4px;">Google Gemini (News)</span>`;

    return `
      <div class="p-2 font-sans min-w-[220px]">
         <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            ${providerBadge}
         </div>
         <div class="${badgeClass} text-xs font-bold px-2 py-1 rounded-md border flex items-center gap-1 w-fit mb-2">
           ${daysAgo <= 7 ? '<span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>' : ''}
           ${badgeText}
         </div>
        <h3 class="font-bold text-lg text-slate-800 leading-tight">${spot.title}</h3>
        <div class="flex items-center gap-1 text-xs text-slate-500 mb-2 mt-1 font-mono">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
           ${spot.date} (${daysAgo} 天前)
        </div>
        <p class="text-sm my-2 text-slate-600 leading-snug">${spot.desc}</p>
        <div class="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
           來源: ${spot.source}
        </div>
        ${urlButton}
      </div>
    `;
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="relative w-full h-[550px] rounded-2xl overflow-hidden z-0 group bg-slate-100">
      <div ref={mapContainerRef} className="w-full h-full outline-none" style={{ background: '#f8fafc' }} />
      
      {/* Control Panel Overlay (Scanner Button) */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        <button
          onClick={onScan}
          disabled={loading || cooldown > 0}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold shadow-xl transition-all duration-300 transform border border-white/20 backdrop-blur-md ${
            loading || cooldown > 0
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed scale-100' 
              : 'bg-white/90 text-blue-600 hover:bg-white hover:text-blue-700 hover:scale-105 active:scale-95'
          }`}
        >
          {cooldown > 0 ? (
            <>
              <Clock size={20} className="animate-pulse" />
              請稍候 {cooldown}s
            </>
          ) : (
            <>
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
              {loading ? 'AI 正在掃描...' : (hotspots.length > 0 ? '刷新即時資訊' : '啟動 AI 掃描')}
            </>
          )}
        </button>
      </div>

      {/* Legend / Status Overlay (Collapsible on Mobile) */}
      <div className={`absolute bottom-4 left-4 right-4 md:right-auto md:w-auto md:max-w-xs bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl z-[400] border border-white/50 ring-1 ring-slate-200 transition-all duration-300 overflow-hidden ${isLegendOpen ? 'max-h-[500px]' : 'max-h-[60px] md:max-h-[500px]'}`}>
        
        {/* Toggle Header */}
        <div 
          onClick={() => setIsLegendOpen(!isLegendOpen)} 
          className="px-5 py-4 flex items-center justify-between cursor-pointer md:cursor-auto active:bg-slate-50"
        >
           <div className="flex items-center gap-2">
             <MapIcon size={16} className="text-slate-500"/> 
             <span className="text-sm font-bold text-slate-700">即時狀態面板</span>
             {!isLegendOpen && (
               <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded ml-2">Live</span>
             )}
           </div>
           {/* Mobile Only Toggle Icon */}
           <div className="md:hidden text-slate-400">
              {isLegendOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
           </div>
        </div>

        {/* Collapsible Content */}
        <div className={`px-5 pb-5 ${isLegendOpen ? 'block' : 'hidden md:block'}`}>
            {/* Model Legend */}
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Radio size={12} /> AI 偵測來源
            </div>
            <div className="flex flex-col gap-2 mb-4">
                 <div className="flex items-center gap-2 bg-blue-50 px-2 py-1.5 rounded-lg border border-blue-100">
                    <Circle size={10} className="fill-blue-500 text-blue-600" />
                    <div className="flex flex-col leading-none">
                      <span className="text-xs font-bold text-blue-800">Google Gemini</span>
                      <span className="text-[9px] text-blue-600/80">官方新聞 / 警方通報</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 bg-purple-50 px-2 py-1.5 rounded-lg border border-purple-100">
                    <Square size={10} className="fill-purple-500 text-purple-700 rotate-45 ml-0.5" />
                    <div className="flex flex-col leading-none ml-0.5">
                      <span className="text-xs font-bold text-purple-800">xAI Grok</span>
                      <span className="text-[9px] text-purple-600/80">X 社群 / 網友目擊</span>
                    </div>
                 </div>
            </div>

            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
              <MapIcon size={12}/> 警戒等級說明
            </div>
            <div className="space-y-3 text-sm font-medium">
              <div className="flex items-center gap-3 p-1 rounded-lg hover:bg-red-50 transition-colors">
                <span className="w-4 h-4 rounded-full bg-red-500 animate-pulse ring-4 ring-red-100"></span>
                <span className="text-slate-700">高度危險 (7天內)</span>
              </div>
              <div className="flex items-center gap-3 p-1 rounded-lg hover:bg-yellow-50 transition-colors">
                <span className="w-4 h-4 rounded-full bg-yellow-500 ring-4 ring-yellow-100"></span>
                <span className="text-slate-700">警戒注意 (8-14天)</span>
              </div>
              <div className="flex items-center gap-3 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                <span className="text-slate-500">歷史紀錄 (14天以上)</span>
              </div>
            </div>
            {lastUpdated && (
              <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-mono text-center">
                {lastUpdated}
              </div>
            )}
        </div>
      </div>
      
      {/* Loading Overlay (Increased Z-Index to 500 to be above Legend which is 400) */}
      {loading && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-[500] flex items-center justify-center p-4">
           <div className="bg-white/95 backdrop-blur-xl text-slate-800 px-6 py-8 rounded-3xl shadow-2xl flex flex-col items-center border border-white/50 max-w-sm w-full max-h-full overflow-y-auto">
              <div className="relative mb-4 shrink-0">
                <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20"></div>
                <Radio className="animate-pulse text-blue-600 relative z-10" size={48} />
              </div>
              
              <div className="font-bold text-xl mb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 text-center shrink-0">
                AI 正在掃描全日本...
              </div>
              <p className="text-slate-500 text-xs mb-6 text-center shrink-0">
                 AI 正在深入分析...<br/>(約需 10-20 秒，請稍候)
              </p>

              <div className="flex flex-col gap-1 text-xs text-slate-400 font-medium mb-6 w-full px-4 shrink-0">
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <Circle size={8} className="fill-blue-500 text-blue-500" /> 
                      <span>Gemini 搜尋官方新聞中...</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <Square size={8} className="fill-purple-500 text-purple-500 rotate-45" /> 
                      <span>Grok 分析 X 社群貼文中...</span>
                  </div>
              </div>

              {/* Suggestions while waiting - Jump Buttons */}
              <div className="w-full pt-4 border-t border-slate-100 flex flex-col gap-3 shrink-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-1">等待時推薦行動</div>
                  <button 
                    onClick={() => scrollToSection('gear-section')}
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-sm transition-all group active:scale-95"
                  >
                     <div className="p-1.5 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                        <Backpack size={16} />
                     </div>
                     <span>先檢查防熊裝備</span>
                     <ArrowDown size={14} className="ml-auto opacity-50" />
                  </button>
                  <button 
                     onClick={() => scrollToSection('quiz-section')}
                     className="flex items-center gap-3 w-full p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-sm transition-all group active:scale-95"
                  >
                     <div className="p-1.5 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                        <BookOpen size={16} />
                     </div>
                     <span>進行遭遇情境模擬</span>
                     <ArrowDown size={14} className="ml-auto opacity-50" />
                  </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default BearMap;