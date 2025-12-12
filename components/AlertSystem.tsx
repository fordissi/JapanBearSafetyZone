import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Navigation, ShieldOff, Calendar, MapPin } from 'lucide-react';
import { CRITICAL_DISTANCE_KM } from '../constants';
import { calculateDistanceKm } from '../utils/geo';
import { BearHotspot, AlertLevel } from '../types';

interface AlertSystemProps {
  hotspots: BearHotspot[];
}

const AlertSystem: React.FC<AlertSystemProps> = ({ hotspots }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nearestSpot, setNearestSpot] = useState<BearHotspot | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [alertLevel, setAlertLevel] = useState<AlertLevel>(AlertLevel.NONE);

  const handleGetLocation = () => {
    setLoading(true);
    setError(null);

    if (hotspots.length === 0) {
      setError('請先在上方地圖點擊「啟動 AI 掃描」取得最新資料。');
      setLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      setError('您的瀏覽器不支援地理位置功能。');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        // Find nearest hotspot from the live data
        let minDistance = Infinity;
        let closest: BearHotspot | null = null;

        hotspots.forEach((spot) => {
          const d = calculateDistanceKm(userLat, userLng, spot.lat, spot.lng);
          if (d < minDistance) {
            minDistance = d;
            closest = spot;
          }
        });

        if (closest) {
            setDistance(minDistance);
            setNearestSpot(closest);

            if (minDistance <= CRITICAL_DISTANCE_KM) {
                setAlertLevel(AlertLevel.DANGER);
            } else {
                setAlertLevel(AlertLevel.WARNING); 
            }
        } else {
             setError("無法判定風險。");
        }

        setLoading(false);
      },
      (err) => {
        setError('無法取得您的位置，請確認是否有開啟 GPS 權限。');
        setLoading(false);
      }
    );
  };

  return (
    <div className="h-full w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg border border-white/60 p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
               <AlertTriangle size={20} />
            </div>
            位置風險預警
          </h2>
          <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded-full text-slate-500 uppercase tracking-wide">Live Beta</span>
        </div>

        {alertLevel !== AlertLevel.NONE && nearestSpot && distance !== null ? (
          <div className={`rounded-2xl p-5 border animate-in slide-in-from-bottom-2 duration-500 ${
            alertLevel === AlertLevel.DANGER 
              ? 'bg-red-50/80 border-red-200' 
              : 'bg-green-50/80 border-green-200'
          }`}>
            <div className="flex items-start gap-4">
              {alertLevel === AlertLevel.DANGER ? (
                <div className="p-3 bg-red-100 rounded-full text-red-600 animate-pulse shadow-sm">
                  <AlertTriangle size={28} />
                </div>
              ) : (
                <div className="p-3 bg-green-100 rounded-full text-green-600 shadow-sm">
                  <CheckCircle size={28} />
                </div>
              )}
              <div className="flex-1">
                <h3 className={`font-bold text-lg mb-1 ${
                  alertLevel === AlertLevel.DANGER ? 'text-red-800' : 'text-green-800'
                }`}>
                  {alertLevel === AlertLevel.DANGER ? '極度危險區域' : '暫無立即威脅'}
                </h3>
                <p className="text-slate-700 font-medium text-sm flex items-center gap-1.5">
                  <MapPin size={14} className="text-slate-400"/>
                  最近出沒點：<span className="font-bold">{nearestSpot.title}</span>
                </p>
                <div className="flex items-center gap-3 mt-2 text-sm text-slate-600">
                   <span className="bg-white/50 px-2 py-1 rounded border border-slate-200/50">
                      距離 <span className="font-mono font-bold">{distance.toFixed(1)} km</span>
                   </span>
                   {nearestSpot.date && (
                      <span className="flex items-center gap-1 bg-white/50 px-2 py-1 rounded border border-slate-200/50 text-xs">
                          <Calendar size={12}/> {nearestSpot.date}
                      </span>
                   )}
                </div>
                
                {alertLevel === AlertLevel.DANGER && (
                  <div className="mt-4 p-3 bg-white/80 rounded-xl text-sm text-red-800 border border-red-100 shadow-sm leading-relaxed">
                    <strong>⚠️ 警告：</strong> 附近有近期目擊紀錄 ({nearestSpot.desc})。請務必攜帶熊鈴，結伴同行，並保持高度警戒。
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-400 py-8 text-sm bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
             <div className="mb-2 mx-auto w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
               <MapPin size={20} />
             </div>
             我們將比對您的 GPS 位置與 AI 搜尋到的出沒熱點<br/>來評估您目前的風險等級。
          </div>
        )}
      </div>

      <div className="mt-6">
        {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100 animate-in fade-in slide-in-from-bottom-1">
                <ShieldOff size={16} className="shrink-0"/> {error}
            </div>
        )}
        
        <button
          onClick={handleGetLocation}
          disabled={loading}
          className={`w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 ${
            loading
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
          }`}
        >
          {loading ? (
            '定位中...'
          ) : (
            <>
              <Navigation size={20} />
              檢查我的位置風險
            </>
          )}
        </button>
        {hotspots.length === 0 && !error && (
            <p className="text-orange-500 text-xs mt-3 text-center font-medium">⚠ 請先掃描地圖以取得數據</p>
        )}
      </div>
    </div>
  );
};

export default AlertSystem;