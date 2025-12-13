import React, { useState, useRef } from 'react';
import { Camera, MapPin, X, Upload, CheckCircle, AlertOctagon, Loader2, Image as ImageIcon, ShieldAlert, CheckSquare, Square, History, BrainCircuit } from 'lucide-react';
import { verifyImageContent } from '../utils/aiService';
import { BearHotspot } from '../types';

interface ReportModalProps {
  onClose: () => void;
  onSubmit: (report: BearHotspot) => void;
  userLocation?: { lat: number; lng: number };
  xaiKey?: string; // New prop for dual voting
}

const ReportModal: React.FC<ReportModalProps> = ({ onClose, onSubmit, userLocation, xaiKey }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Input, 2: Verifying, 3: Result
  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSafe, setIsSafe] = useState(false); 
  const [isPhotoCurrent, setIsPhotoCurrent] = useState(true);
  
  const [verificationResult, setVerificationResult] = useState<{
    isBearSign: boolean;
    explanation: string;
    confidence: number;
    voters?: { gemini: boolean, secondary: boolean, method: 'GROK' | 'GEMINI_REFLECTION' }
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // --- TIME CHECK: Prevent old photos (> 1 hour) ---
      // Note: This relies on file system metadata which isn't always available or accurate, 
      // but serves as a basic client-side guard alongside 'capture' attribute.
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      
      // If lastModified is very old (and not just 'now' due to copy), warn user
      // We give a small buffer, but primarily trust capture="environment" to force new photo on mobile
      if (file.lastModified && (now - file.lastModified > oneHour)) {
         alert("偵測到這可能是一張舊照片。\n\n為了即時安全，請務必使用相機「當下拍攝」真實狀況。");
         setIsPhotoCurrent(false);
         // We don't block fully because some file systems update modified time on copy, 
         // but we set a flag or clear it if strict. Let's clear it to be strict.
         e.target.value = ''; 
         setImage(null);
         return;
      }
      setIsPhotoCurrent(true);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!isSafe) {
        alert("請先確認您處於安全環境。");
        return;
    }
    if (!image) {
        alert("為了確保真實性，請務必上傳照片證據。");
        return;
    }
    if (!userLocation) {
        alert("需要取得您的 GPS 位置才能回報。");
        return;
    }

    setStep(2); // Loading

    // 1. Dual AI Verify (Pass xAI key if available)
    const aiResult = await verifyImageContent(image, xaiKey);
    setVerificationResult(aiResult);

    // 2. Prepare Data
    if (aiResult.isBearSign) {
        const newReport: BearHotspot = {
            id: `user-${Date.now()}`,
            title: `[用戶回報] 發現熊蹤跡`,
            lat: userLocation.lat,
            lng: userLocation.lng,
            desc: description || aiResult.explanation,
            count: 1,
            source: aiResult.explanation, // Contains consensus details
            date: new Date().toISOString().split('T')[0],
            provider: 'user',
            verificationStatus: 'VERIFIED',
            confidence: aiResult.confidence
        };
        setTimeout(() => {
            onSubmit(newReport);
            setStep(3);
        }, 2000); // Slightly longer delay to read the verification
    } else {
        setStep(3); 
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 relative">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Camera size={20} className="text-red-500" /> 
                {step === 1 ? '回報目擊情報' : 'AI 雙重驗證中心'}
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>

        {/* Content */}
        <div className="p-6">
            
            {/* STEP 1: Input Form */}
            {step === 1 && (
                <div className="space-y-4">
                    {/* CRITICAL SAFETY WARNING */}
                    <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex gap-3 items-start">
                        <ShieldAlert className="text-red-600 shrink-0 mt-0.5" size={20} />
                        <div>
                            <h4 className="font-bold text-red-700 text-sm">嚴禁近距離拍攝</h4>
                            <p className="text-xs text-red-600/90 leading-snug mt-1">
                                若目擊活體熊，請優先<strong>安靜撤離</strong>。請僅在上傳「足跡」、「排遺」或「車內/室內拍攝」的安全照片。
                            </p>
                        </div>
                    </div>

                    <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-xl border border-blue-100 flex gap-2">
                        <MapPin size={16} className="shrink-0 mt-0.5" />
                        <div>
                            回報地點將鎖定為您的目前位置。<br/>
                            <span className="font-bold opacity-70">
                                {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : "偵測中..."}
                            </span>
                        </div>
                    </div>

                    {/* Safety Checkbox */}
                    <div 
                        onClick={() => setIsSafe(!isSafe)}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                        <div className={`${isSafe ? 'text-green-600' : 'text-slate-300'}`}>
                            {isSafe ? <CheckSquare size={24} /> : <Square size={24} />}
                        </div>
                        <span className={`text-sm font-bold ${isSafe ? 'text-slate-800' : 'text-slate-400'}`}>
                            我確認目前處於安全位置
                        </span>
                    </div>

                    <div 
                        onClick={() => {
                            if (!isSafe) {
                                alert("請先勾選「我確認目前處於安全位置」才能啟用相機。");
                                return;
                            }
                            fileInputRef.current?.click();
                        }}
                        className={`border-2 border-dashed rounded-xl h-40 flex flex-col items-center justify-center transition-all relative overflow-hidden ${
                            !isSafe 
                                ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                                : image 
                                    ? 'border-blue-500 bg-slate-50 cursor-pointer' 
                                    : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50 cursor-pointer'
                        }`}
                    >
                        {image ? (
                            <div className="relative w-full h-full p-2">
                                <img src={image} className="w-full h-full object-contain rounded-lg" alt="Preview" />
                                <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                    <ImageIcon size={12} /> 點擊更換
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-4">
                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400 relative">
                                    <Camera size={24} />
                                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border border-slate-100">
                                       <History size={12} className="text-red-400" />
                                    </div>
                                </div>
                                <h4 className="font-bold text-slate-700 text-sm">
                                    {isSafe ? "啟動相機拍攝" : "請先確認安全"}
                                </h4>
                                <p className="text-slate-400 text-xs mt-1">
                                    系統拒絕舊照片，請當下拍攝
                                </p>
                            </div>
                        )}
                        <input 
                            ref={fileInputRef} 
                            type="file" 
                            accept="image/*" 
                            capture="environment" // Force rear camera on mobile
                            className="hidden" 
                            onChange={handleFileChange}
                            disabled={!isSafe}
                        />
                    </div>

                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="請簡述狀況（例：在步道泥地上發現新鮮腳印...）"
                        className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                    />

                    <button 
                        onClick={handleSubmit}
                        disabled={!image || !userLocation || !isSafe}
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                            !image || !userLocation || !isSafe
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                    >
                       <BrainCircuit size={18} />
                       啟動雙重 AI 驗證
                    </button>
                    <div className="text-[10px] text-center text-slate-400">
                       將由 Gemini {xaiKey ? '+ xAI Grok' : '+ 二次查核'} 共同審核
                    </div>
                </div>
            )}

            {/* STEP 2: Analyzing */}
            {step === 2 && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="relative">
                        <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                             <div className="text-2xl">🐻</div>
                        </div>
                    </div>
                    <div className="space-y-2 w-full max-w-[200px]">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                           <span>Gemini Vision</span>
                           <span className="text-blue-500 animate-pulse">分析中...</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                           <div className="h-full bg-blue-500 w-2/3 animate-[shimmer_2s_infinite]"></div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mt-2">
                           <span>{xaiKey ? 'xAI Grok' : '複查機制'}</span>
                           <span className="text-orange-500 animate-pulse delay-75">等待中...</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                           <div className="h-full bg-orange-400 w-1/3 animate-[shimmer_2s_infinite_reverse]"></div>
                        </div>
                    </div>
                    <p className="text-slate-400 text-xs">正在進行多模型共識決策...</p>
                </div>
            )}

            {/* STEP 3: Result */}
            {step === 3 && verificationResult && (
                <div className="text-center space-y-6 py-4">
                    {verificationResult.isBearSign ? (
                        <>
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 animate-in zoom-in">
                                <CheckCircle size={40} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800">雙重驗證通過</h3>
                                <div className="flex justify-center gap-2 mt-2">
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">Gemini: Yes</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${xaiKey ? 'bg-slate-800 text-white' : 'bg-orange-100 text-orange-700'}`}>
                                       {xaiKey ? 'Grok' : 'Review'}: Yes
                                    </span>
                                </div>
                                <p className="text-green-700 font-bold mt-2">共識信心指數: {verificationResult.confidence}%</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600">
                                您的回報已標記在地圖上，感謝您為社群安全的貢獻！
                            </div>
                            <button onClick={onClose} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">
                                關閉
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 animate-in zoom-in">
                                <AlertOctagon size={40} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">回報被駁回</h3>
                                <p className="text-red-600 font-bold mt-2">AI 未達成一致共識</p>
                                
                                <div className="bg-slate-100 p-3 rounded-xl mt-3 text-xs text-left space-y-1 mx-auto max-w-[280px]">
                                   <div className="flex justify-between">
                                      <span>Gemini 判定:</span>
                                      <span className={verificationResult.voters?.gemini ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
                                         {verificationResult.voters?.gemini ? 'YES' : 'NO'}
                                      </span>
                                   </div>
                                   <div className="flex justify-between">
                                      <span>{xaiKey ? 'xAI Grok' : '二次查核'} 判定:</span>
                                      <span className={verificationResult.voters?.secondary ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
                                         {verificationResult.voters?.secondary ? 'YES' : 'NO'}
                                      </span>
                                   </div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400">
                                系統採用嚴格的「雙盲測試」，需兩個模型同時認定為熊蹤跡才會放行。
                            </p>
                            <button onClick={() => setStep(1)} className="w-full py-3 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl font-bold">
                                重新拍攝
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ReportModal;