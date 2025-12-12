import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, RefreshCw, AlertCircle, ShieldCheck, Skull } from 'lucide-react';
import { QUIZ_DATA } from '../constants';

const Quiz: React.FC = () => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  
  // Image State
  const [displayedImage, setDisplayedImage] = useState<string>('');
  const [isImageLoading, setIsImageLoading] = useState(true);

  const question = QUIZ_DATA[currentQuestionIndex];
  const preloadRef = useRef<HTMLImageElement | null>(null);

  // Helper to get random image
  const getRandomImage = (images: string[]) => {
    if (!images || images.length === 0) return '';
    const randomIndex = Math.floor(Math.random() * images.length);
    return images[randomIndex];
  };

  // --- Robust Image Switching Logic ---
  const switchImage = (url: string) => {
    if (!url) return;
    if (url === displayedImage) return;

    setIsImageLoading(true);

    // Cancel previous preload if exists
    if (preloadRef.current) {
      preloadRef.current.onload = null;
      preloadRef.current = null;
    }

    const img = new Image();
    preloadRef.current = img;
    img.src = url;

    img.onload = () => {
      // Only update if this is still the requested image (though React closure handles this mostly)
      setDisplayedImage(url);
      setIsImageLoading(false);
    };

    img.onerror = () => {
      console.error("Failed to load image:", url);
      setIsImageLoading(false); // Just show whatever we have or fail gracefully
    };
  };

  // --- Initial Load & Question Change ---
  useEffect(() => {
    const scenarioImg = getRandomImage(question.scenarioImages);
    switchImage(scenarioImg);

    // Preload outcomes for THIS question in background
    question.successImages.forEach(src => { const i = new Image(); i.src = src; });
    question.failureImages.forEach(src => { const i = new Image(); i.src = src; });

    // Preload NEXT question scenario
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < QUIZ_DATA.length) {
       const nextQ = QUIZ_DATA[nextIndex];
       nextQ.scenarioImages.forEach(src => { const i = new Image(); i.src = src; });
    }

  }, [currentQuestionIndex, question]);

  const handleOptionClick = (optionId: string, isCorrect: boolean) => {
    if (isAnswered) return;
    setSelectedOption(optionId);
    setIsAnswered(true);
    
    // Determine result image
    const resultImg = isCorrect 
      ? getRandomImage(question.successImages) 
      : getRandomImage(question.failureImages);
      
    switchImage(resultImg);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < QUIZ_DATA.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      resetState();
    } else {
      // Restart
      setCurrentQuestionIndex(0);
      resetState();
    }
  };

  const resetState = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    // displayedImage will be updated by the useEffect when currentQuestionIndex changes
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 overflow-hidden flex flex-col md:flex-row min-h-[600px] transition-all">
      
      {/* Visual Section */}
      <div className="md:w-1/2 relative bg-slate-900 min-h-[300px] md:min-h-full overflow-hidden group">
        
        {/* We keep the image constantly rendered. When 'displayedImage' updates, it snaps to the new one. 
            Because we preloaded it in 'switchImage', it should be instant. 
        */}
        {displayedImage && (
          <img 
            src={displayedImage} 
            alt="Scenario Visual"
            className={`w-full h-full object-cover transition-transform duration-1000 ease-out ${isAnswered ? 'scale-110 brightness-50' : 'scale-100 brightness-100'}`}
          />
        )}

        {/* Loading Indicator - Subtle, Top Right. Only shows if network is truly dragging */}
        {isImageLoading && (
          <div className="absolute top-4 right-4 z-50 bg-black/40 backdrop-blur-md rounded-full p-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        )}

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-90 pointer-events-none"></div>

        {/* Scenario Text Overlay */}
        <div className={`absolute bottom-0 left-0 p-8 text-white z-20 w-full transition-all duration-500 ${isAnswered ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
          <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-widest text-blue-300">
             <BookOpen size={14} />
             情境模擬 {currentQuestionIndex + 1}
          </div>
          <h3 className="text-2xl md:text-3xl font-bold leading-snug shadow-sm">
            {question.scenario}
          </h3>
        </div>

        {/* Outcome Overlay (Success/Fail) */}
        {isAnswered && (
           <div className={`absolute inset-0 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 z-30`}>
              <div className={`transform scale-110 p-6 rounded-full shadow-2xl border-4 mb-4 ${selectedOption && question.options.find(o => o.id === selectedOption)?.isCorrect ? 'bg-green-600 border-white' : 'bg-red-600 border-white'}`}>
                 {selectedOption && question.options.find(o => o.id === selectedOption)?.isCorrect ? (
                    <ShieldCheck size={56} className="text-white" />
                 ) : (
                    <Skull size={56} className="text-white" />
                 )}
              </div>
              <div className="bg-black/50 backdrop-blur-md px-6 py-2 rounded-full text-white font-bold text-lg border border-white/20">
                {selectedOption && question.options.find(o => o.id === selectedOption)?.isCorrect ? '生存成功' : '遭受攻擊'}
              </div>
           </div>
        )}
      </div>

      {/* Interactive Section */}
      <div className="md:w-1/2 p-8 flex flex-col justify-center bg-slate-50/50">
        
        <div className="flex justify-between items-center mb-8">
           <h2 className="text-xl font-bold text-slate-800">遭遇生存指南</h2>
           <span className="text-xs font-mono font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">第 {currentQuestionIndex + 1} / {QUIZ_DATA.length} 題</span>
        </div>

        <div className="space-y-4">
          {question.options.map((option) => {
            const isSelected = isAnswered && option.id === selectedOption;
            const isCorrectOption = option.isCorrect;
            
            // Dynamic styling
            let containerClass = "w-full text-left p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group ";
            
            if (isAnswered) {
              if (isSelected) {
                containerClass += isCorrectOption 
                  ? "bg-green-50 border-green-500 shadow-lg scale-[1.02] ring-1 ring-green-500" 
                  : "bg-red-50 border-red-500 shadow-lg scale-[1.02] ring-1 ring-red-500";
              } else if (isCorrectOption) {
                 containerClass += "bg-green-50/50 border-green-200 opacity-70";
              } else {
                 containerClass += "bg-slate-50 border-slate-100 opacity-40 grayscale";
              }
            } else {
              containerClass += "bg-white border-slate-200 hover:border-blue-400 hover:shadow-lg hover:-translate-y-1 hover:bg-blue-50/30";
            }

            return (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option.id, option.isCorrect)}
                disabled={isAnswered}
                className={containerClass}
              >
                <div className="flex items-center gap-5 relative z-10">
                  <span className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                    isSelected 
                       ? (isCorrectOption ? 'bg-green-500 text-white' : 'bg-red-500 text-white')
                       : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-blue-600'
                  }`}>
                    {option.id}
                  </span>
                  <span className={`font-medium text-lg ${isSelected ? (isCorrectOption ? 'text-green-900' : 'text-red-900') : 'text-slate-700'}`}>
                    {option.text}
                  </span>
                </div>
                
                {isSelected && (
                   <div className={`mt-2 ml-14 text-sm font-medium ${isCorrectOption ? 'text-green-700' : 'text-red-700'} animate-in slide-in-from-left-2`}>
                     {option.feedback}
                   </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation & Next Button */}
        {isAnswered && (
          <div className="mt-8 pt-6 border-t border-slate-200 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-blue-50/80 p-5 rounded-2xl border border-blue-100 mb-6 flex gap-4">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg h-fit">
                <AlertCircle size={20} />
              </div>
              <div>
                <h4 className="font-bold text-blue-900 text-sm mb-1">專家建議</h4>
                <p className="text-blue-800 text-sm leading-relaxed">
                  {question.explanation}
                </p>
              </div>
            </div>
            
            <button 
              onClick={nextQuestion}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              <RefreshCw size={20} />
              {currentQuestionIndex < QUIZ_DATA.length - 1 ? '下一題情境' : '重新開始模擬'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;