import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { RefreshCw, Radio, Map as MapIcon, Calendar } from 'lucide-react';
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

// Red Marker (High Danger - Last 7 days)
const createDangerMarker = () => {
  return {
    radius: 14,
    fillColor: "#ef4444", // Red-500
    color: "#991b1b",     // Red-800
    weight: 2,
    opacity: 1,
    fillOpacity: 0.9,
    className: "animate-pulse"
  };
};

// Yellow Marker (Caution - 8 to 14 days)
const createCautionMarker = () => {
  return {
    radius: 12,
    fillColor: "#eab308", // Yellow-500
    color: "#854d0e",     // Yellow-800
    weight: 2,
    opacity: 1,
    fillOpacity: 0.8,
  };
};

interface BearMapProps {
  hotspots: BearHotspot[];
  onScan: () => void;
  loading: boolean;
  lastUpdated: string;
}

const BearMap: React.FC<BearMapProps> = ({ hotspots, onScan, loading, lastUpdated }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current).setView(MAP_CENTER_JAPAN, MAP_ZOOM_LEVEL);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);

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
        
        // Determine style based on recency
        let markerOptions;
        let badgeClass;
        let badgeText;

        if (daysAgo <= 7) {
          markerOptions = createDangerMarker();
          badgeClass = "bg-red-50 text-red-700 border-red-200 shadow-sm";
          badgeText = "危險 (7天內)";
        } else {
          markerOptions = createCautionMarker();
          badgeClass = "bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm";
          badgeText = "注意 (8-14天)";
        }

        L.circleMarker([spot.lat, spot.lng], markerOptions)
          .bindPopup(`
            <div class="p-2 font-sans min-w-[220px]">
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
            </div>
          `)
          .addTo(markersLayerRef.current!);
      });
    }
  }, [hotspots]);

  return (
    <div className="relative w-full h-[550px] rounded-2xl overflow-hidden z-0 group bg-slate-100">
      <div ref={mapContainerRef} className="w-full h-full outline-none" style={{ background: '#f8fafc' }} />
      
      {/* Control Panel Overlay */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        <button
          onClick={onScan}
          disabled={loading}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 border border-white/20 backdrop-blur-md ${
            loading 
              ? 'bg-slate-800/90 text-slate-400 cursor-wait' 
              : 'bg-white/90 text-blue-600 hover:bg-white hover:text-blue-700'
          }`}
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          {loading ? 'AI 正在掃描全網...' : (hotspots.length > 0 ? '刷新即時資訊' : '啟動 AI 掃描')}
        </button>
      </div>

      {/* Legend / Status Overlay */}
      <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md px-5 py-4 rounded-2xl shadow-xl z-[400] border border-white/50 ring-1 ring-slate-200 max-w-xs transition-all hover:bg-white">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
          <MapIcon size={12}/> 即時警戒等級
        </div>
        <div className="space-y-3 text-sm font-medium">
          <div className="flex items-center gap-3 p-1 rounded-lg hover:bg-red-50 transition-colors">
            <span className="w-4 h-4 rounded-full bg-red-500 animate-pulse ring-4 ring-red-100"></span>
            <span className="text-slate-700">高度危險 (7天內目擊)</span>
          </div>
          <div className="flex items-center gap-3 p-1 rounded-lg hover:bg-yellow-50 transition-colors">
            <span className="w-4 h-4 rounded-full bg-yellow-500 ring-4 ring-yellow-100"></span>
            <span className="text-slate-700">警戒注意 (8-14天內)</span>
          </div>
        </div>
        {lastUpdated && (
          <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-mono text-center">
            {lastUpdated}
          </div>
        )}
      </div>
      
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-[300] flex items-center justify-center">
           <div className="bg-white/95 backdrop-blur-xl text-slate-800 px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center animate-in fade-in zoom-in duration-300 border border-white/50">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20"></div>
                <Radio className="animate-pulse mb-3 text-blue-600 relative z-10" size={40} />
              </div>
              <div className="font-bold text-xl mb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                AI 正在搜尋日本新聞...
              </div>
              <div className="text-xs text-slate-500 font-medium">分析最近 14 天的目擊報告與座標定位</div>
           </div>
        </div>
      )}
    </div>
  );
};

export default BearMap;