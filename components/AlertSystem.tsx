import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Navigation, ShieldOff, Calendar, MapPin, Sun, Moon, CloudSnow, Leaf, ThermometerSun, Wind, CloudRain, CloudFog, Cloud, Droplets, Compass, PawPrint, ExternalLink, Map } from 'lucide-react';
import { CRITICAL_DISTANCE_KM } from '../constants';
import { calculateDistanceKm, getRegionBearInfo, RegionBearInfo } from '../utils/geo';
import { BearHotspot, AlertLevel } from '../types';

interface AlertSystemProps {
  hotspots: BearHotspot[];
}

interface WeatherData {
  temp: number;
  isDay: boolean;
  precipitation: number;
  windSpeed: number;
  windDirection: number; // Degrees
  humidity: number;
  code: number; // WMO Weather code
}

interface EnvironmentalRisk {
  season: {
    name: string;
    risk: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
    desc: string;
    icon: React.ElementType;
    color: string;
  };
  weather?: {
    condition: string;
    riskModifier: 'LOWER' | 'NEUTRAL' | 'HIGHER';
    desc: string;
    icon: React.ElementType;
    dataDisplay: string;
    windInfo?: string; // New field for bear spray context
  };
}

// Helper to convert degrees to cardinal direction
const getWindDirection = (deg: number) => {
  const directions = ['北風 (N)', '東北風 (NE)', '東風 (E)', '東南風 (SE)', '南風 (S)', '西南風 (SW)', '西風 (W)', '西北風 (NW)'];
  return directions[Math.round(deg / 45) % 8];
};

const AlertSystem: React.FC<AlertSystemProps> = ({ hotspots }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nearestSpot, setNearestSpot] = useState<BearHotspot | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [alertLevel, setAlertLevel] = useState<AlertLevel>(AlertLevel.NONE);
  const [envRisk, setEnvRisk] = useState<EnvironmentalRisk | null>(null);
  const [speciesInfo, setSpeciesInfo] = useState<RegionBearInfo | null>(null);

  // --- 1. Initial Season Logic (Static) ---
  useEffect(() => {
    calculateSeasonRisk();
  }, []);

  const calculateSeasonRisk = () => {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12

    let seasonData: EnvironmentalRisk['season'];

    if (month >= 9 && month <= 11) {
      seasonData = {
        name: '秋季 (食慾旺盛期)',
        risk: 'EXTREME',
        desc: '熊為冬眠準備，進入「過食期」，全天候覓食，攻擊性極強。',
        icon: Wind,
        color: 'text-orange-700 bg-orange-50 border-orange-200'
      };
    } else if (month >= 4 && month <= 6) {
      seasonData = {
        name: '春季 (甦醒/育幼期)',
        risk: 'HIGH',
        desc: '冬眠結束飢餓，且母熊帶小熊保護慾強，請高度警戒。',
        icon: Leaf,
        color: 'text-green-700 bg-green-50 border-green-200'
      };
    } else if (month >= 7 && month <= 8) {
      seasonData = {
        name: '夏季 (繁殖/避暑期)',
        risk: 'MODERATE',
        desc: '草叢茂密視線差。亦是農作物成熟期，小心農田周邊。',
        icon: ThermometerSun,
        color: 'text-yellow-700 bg-yellow-50 border-yellow-200'
      };
    } else {
      seasonData = {
        name: '冬季 (冬眠期)',
        risk: 'LOW',
        desc: '多數熊冬眠中，但暖冬可能導致部分熊提早甦醒。',
        icon: CloudSnow,
        color: 'text-blue-700 bg-blue-50 border-blue-200'
      };
    }

    setEnvRisk(prev => ({ ...prev, season: seasonData, weather: prev?.weather } as EnvironmentalRisk));
  };

  // --- 2. Weather Logic (Dynamic API) ---
  const analyzeWeatherRisk = (w: WeatherData): EnvironmentalRisk['weather'] => {
    // WMO Codes: 0=Clear, 1-3=Cloudy, 51-67=Rain, 71-77=Snow, 95+=Storm
    const isRaining = w.precipitation > 0.5 || (w.code >= 50 && w.code <= 99);
    const isWindy = w.windSpeed > 15; // km/h
    const isHot = w.temp > 25;

    const windDirStr = getWindDirection(w.windDirection);
    // Logic: Strong wind makes bear spray dangerous to user if facing wind
    const windWarning = w.windSpeed > 10
      ? `目前吹${windDirStr}，使用噴霧請務必位於上風處。`
      : `微風 (${windDirStr})，利於噴霧使用。`;

    let result: EnvironmentalRisk['weather'] = {
      condition: '天氣良好',
      riskModifier: 'NEUTRAL',
      desc: '視野清晰。但請隨時保持對周遭聲音的警覺。',
      icon: w.isDay ? Sun : Moon,
      dataDisplay: `${w.temp}°C`,
      windInfo: windWarning
    };

    if (isRaining || isWindy) {
      result = {
        condition: isRaining ? '雨天/視線不佳' : '強風警報',
        riskModifier: 'HIGHER',
        desc: '危險！雨聲與風聲會掩蓋你的腳步與熊鈴聲，易發生「驚嚇相遇」。',
        icon: isRaining ? CloudRain : Wind,
        dataDisplay: `${w.temp}°C | 雨 ${w.precipitation}mm`,
        windInfo: isWindy ? `強風 (${w.windSpeed}km/h)！噴霧極易吹回傷及自身。` : windWarning
      };
    } else if (isHot && w.isDay) {
      result = {
        condition: '高溫炎熱',
        riskModifier: 'LOWER',
        desc: '氣溫高，熊傾向在樹蔭深處或水源休息，日間活動力稍降。',
        icon: ThermometerSun,
        dataDisplay: `${w.temp}°C (酷熱)`,
        windInfo: windWarning
      };
    } else if (w.code >= 40 && w.code <= 49) {
      result = {
        condition: '濃霧',
        riskModifier: 'HIGHER',
        desc: '視線極差，請務必頻繁發出聲音（Hello~）避免轉角遇到熊。',
        icon: CloudFog,
        dataDisplay: `${w.temp}°C`,
        windInfo: windWarning
      };
    } else if (!w.isDay) {
      result = {
        condition: '夜間時段',
        riskModifier: 'HIGHER',
        desc: '部分熊會利用夜間靠近人類居住區覓食，請避免外出。',
        icon: Moon,
        dataDisplay: `${w.temp}°C`,
        windInfo: windWarning
      };
    }

    return result;
  };

  const fetchWeather = async (lat: number, lng: number) => {
    try {
      // Open-Meteo API (Free, No Key required)
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,is_day,precipitation,rain,showers,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m&timezone=auto`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.current) {
        const w: WeatherData = {
          temp: data.current.temperature_2m,
          isDay: data.current.is_day === 1,
          precipitation: (data.current.precipitation || 0) + (data.current.rain || 0) + (data.current.showers || 0),
          windSpeed: data.current.wind_speed_10m,
          windDirection: data.current.wind_direction_10m,
          humidity: data.current.relative_humidity_2m,
          code: data.current.weather_code
        };

        const weatherRisk = analyzeWeatherRisk(w);
        setEnvRisk(prev => prev ? ({ ...prev, weather: weatherRisk }) : null);
      }
    } catch (e) {
      console.error("Weather fetch failed", e);
    }
  };

  // --- 3. Main Action ---
  const handleGetLocation = () => {
    setLoading(true);
    setError(null);

    // ALLOW analysis even without hotspots (for Weather/Species/Season)
    // if (hotspots.length === 0) ... REMOVED

    if (!navigator.geolocation) {
      setError('您的瀏覽器不支援地理位置功能。');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        // 0. Determine Species (AI-First > Local Fallback)
        const fetchSpeciesRisk = async (lat: number, lng: number) => {
          try {
            // Try backend AI analysis first
            const res = await fetch('http://localhost:8080/api/analyze-species', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lat, lng })
            });
            if (res.ok) {
              const data = await res.json();
              // Normalize "NONE" type to handle safely or map to local types
              // But our frontend expects RegionBearInfo which is strict. 
              // Let's trust AI but ensure fallback if type is weird.
              if (data.name) return data;
            }
          } catch (e) {
            console.warn("AI Species Analysis failed, falling back to local rule.", e);
          }
          // Fallback to local hardcoded rule
          return getRegionBearInfo(lat);
        };

        const species = await fetchSpeciesRisk(userLat, userLng);
        setSpeciesInfo(species);

        // 1. Fetch Weather
        await fetchWeather(userLat, userLng);

        // 2. Calculate Distance (Only if hotspots exist)
        if (hotspots.length > 0) {
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
          }
        } else {
          // If no hotspots loaded, we just skip the distance alert part
          // But we do NOT error out effectively allowing "Environment Analysis" only
          setDistance(null);
          setNearestSpot(null);
          setAlertLevel(AlertLevel.NONE);
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
              <AlertTriangle size={20} />
            </div>
            環境與風險分析
          </h2>
          <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded-full text-slate-500 uppercase tracking-wide">Live Data</span>
        </div>

        {/* Environmental Risk Grid */}
        {envRisk && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Season Card */}
            <div className={`p-4 rounded-2xl border ${envRisk.season.color} flex flex-col gap-1 shadow-sm`}>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <envRisk.season.icon size={16} />
                  {envRisk.season.name}
                </div>
              </div>
              <p className="text-[11px] opacity-90 leading-snug font-medium">
                {envRisk.season.desc}
              </p>
            </div>

            {/* Weather Card (Dynamic) */}
            {envRisk.weather ? (
              <div className={`p-4 rounded-2xl border flex flex-col gap-1 shadow-sm transition-all duration-500 animate-in fade-in ${envRisk.weather.riskModifier === 'HIGHER'
                ? 'bg-slate-800 text-slate-100 border-slate-700'
                : 'bg-sky-50 text-sky-800 border-sky-100'
                }`}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <envRisk.weather.icon size={16} />
                    {envRisk.weather.condition}
                  </div>
                  <span className="text-[10px] font-mono bg-white/20 px-1.5 py-0.5 rounded">
                    {envRisk.weather.dataDisplay}
                  </span>
                </div>
                <p className="text-[11px] opacity-90 leading-snug">
                  {envRisk.weather.desc}
                </p>
                {/* Wind Info for Bear Spray Safety */}
                <div className={`mt-1 pt-1 border-t border-current/20 flex items-start gap-1 text-[10px] ${envRisk.weather.riskModifier === 'HIGHER' ? 'text-slate-300' : 'text-sky-600'}`}>
                  <Compass size={10} className="mt-0.5 shrink-0" />
                  {envRisk.weather.windInfo}
                </div>
              </div>
            ) : (
              // Placeholder before scan
              <div className="p-4 rounded-2xl border border-dashed border-slate-200 flex flex-col justify-center items-center text-slate-400 gap-1">
                <Cloud size={20} />
                <span className="text-[10px]">等待定位獲取天氣...</span>
              </div>
            )}

            {/* Bear Species Card (New) - Only shows after location is found */}
            {speciesInfo && (
              <div className={`col-span-1 md:col-span-2 p-4 rounded-2xl border flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-bottom-2 ${speciesInfo.type === 'BROWN'
                ? 'bg-amber-900/5 border-amber-900/10'
                : 'bg-stone-900/5 border-stone-900/10'
                }`}>
                <div className={`p-2 rounded-xl shrink-0 ${speciesInfo.type === 'BROWN' ? 'bg-amber-900 text-white' : 'bg-stone-800 text-white'
                  }`}>
                  <PawPrint size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-sm text-slate-900">該區優勢物種: {speciesInfo.name}</h4>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${speciesInfo.type === 'BROWN' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                      {speciesInfo.riskLevel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    <span className="font-semibold">特徵:</span> {speciesInfo.features}
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    <span className="font-semibold">對策:</span> {speciesInfo.advice}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Location Risk Result */}
        {alertLevel !== AlertLevel.NONE && nearestSpot && distance !== null ? (
          <div className={`rounded-2xl p-4 border animate-in slide-in-from-bottom-2 duration-500 ${alertLevel === AlertLevel.DANGER
            ? 'bg-red-50/90 border-red-200'
            : 'bg-white/80 border-slate-200'
            }`}>
            <div className="flex items-start gap-3">
              {alertLevel === AlertLevel.DANGER ? (
                <div className="p-2.5 bg-red-100 rounded-full text-red-600 animate-pulse shadow-sm shrink-0">
                  <AlertTriangle size={24} />
                </div>
              ) : (
                <div className="p-2.5 bg-green-100 rounded-full text-green-600 shadow-sm shrink-0">
                  <CheckCircle size={24} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className={`font-bold text-base mb-0.5 ${alertLevel === AlertLevel.DANGER ? 'text-red-800' : 'text-slate-800'
                  }`}>
                  {alertLevel === AlertLevel.DANGER ? '極度危險 (5km內)' : '周邊無立即威脅'}
                </h3>

                <div className="flex items-center gap-2 text-xs text-slate-600 mt-1 mb-2">
                  <span className="bg-white/60 px-2 py-0.5 rounded border border-slate-200/50 truncate max-w-[120px]">
                    最近: {nearestSpot.title}
                  </span>
                  <span className="font-mono font-bold bg-white/60 px-2 py-0.5 rounded border border-slate-200/50">
                    {distance.toFixed(1)} km
                  </span>
                </div>

                {alertLevel === AlertLevel.DANGER && (
                  <div className="text-xs text-red-700 leading-snug">
                    ⚠️ 位於熊熱點範圍。請攜帶熊鈴並提高警覺。
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-400 py-4 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex flex-col gap-2 items-center">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
              <Navigation size={16} />
            </div>
            <div>點擊下方按鈕以計算<br />位置距離、物種與天氣風險</div>
          </div>
        )}
      </div>

      <div className="mt-4">
        {error && (
          <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2 border border-red-100 animate-in fade-in slide-in-from-bottom-1">
            <ShieldOff size={14} className="shrink-0" /> {error}
          </div>
        )}

        <button
          onClick={handleGetLocation}
          disabled={loading}
          className={`w-full py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 text-sm ${loading
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
            }`}
        >
          {loading ? (
            '讀取 GPS 與分析中...'
          ) : (
            <>
              <Navigation size={18} />
              定位並分析綜合風險
            </>
          )}
        </button>

        {/* External Resources / Kumadas Link */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <ExternalLink size={10} /> 官方歷史數據參考
          </div>
          <a
            href="https://kumadas.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors group"
          >
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200 text-slate-600 group-hover:text-blue-600 transition-colors">
              <Map size={16} />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-slate-700 group-hover:text-blue-700">Kumadas (クマダス)</div>
              <div className="text-[10px] text-slate-500">
                提供東北地區詳細的歷史 GIS 目擊地圖
              </div>
            </div>
            <ExternalLink size={12} className="text-slate-300 group-hover:text-blue-400" />
          </a>
          <div className="text-[9px] text-slate-400 text-center px-2">
            *本 APP 專注於整合即時新聞與社群 AI 分析，歷史地理數據請參考上述官方網站。
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertSystem;