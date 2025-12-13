import React, { useState } from 'react';
import { CheckSquare, Square, Backpack, ShoppingBag, MapPin } from 'lucide-react';

interface GearItem {
  id: string;
  name: string;
  desc: string;
  recommended: boolean;
}

const GEAR_LIST: GearItem[] = [
  { id: '1', name: '熊鈴 (Bear Bell)', desc: '掛在背包上，走路時發出聲響警示熊。', recommended: true },
  { id: '2', name: '防熊噴霧 (Bear Spray)', desc: '遭遇攻擊時的最後防線，需掛在腰間隨手可取處。', recommended: true },
  { id: '3', name: '哨子 (Whistle)', desc: '在能見度低或緊急時發出尖銳聲響。', recommended: true },
  { id: '4', name: '收音機 (Portable Radio)', desc: '持續發出人聲或音樂，避免驚嚇相遇。', recommended: false },
  { id: '5', name: '密封食物罐 (Bear Canister)', desc: '露營必備，防止食物氣味外洩吸引野生動物。', recommended: true },
  { id: '6', name: '亮色衣物', desc: '讓自己更容易被辨識為人類，而非獵物。', recommended: false },
];

const GearChecklist: React.FC = () => {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedItems(newChecked);
  };

  const progress = Math.round((checkedItems.size / GEAR_LIST.length) * 100);

  return (
    <div className="h-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg border border-white/60 p-6 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
             <Backpack size={20} />
          </div>
          防熊裝備檢查
        </h2>
        <span className="text-xs font-bold text-slate-400">{checkedItems.size} / {GEAR_LIST.length}</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 mb-6 overflow-hidden">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
        {GEAR_LIST.map((item) => {
          const isChecked = checkedItems.has(item.id);
          return (
            <div 
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 group ${
                isChecked 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-sm'
              }`}
            >
              <div className={`mt-1 ${isChecked ? 'text-blue-600' : 'text-slate-300 group-hover:text-blue-400'}`}>
                {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
              </div>
              <div>
                <div className={`font-bold text-sm ${isChecked ? 'text-blue-900' : 'text-slate-700'}`}>
                  {item.name}
                  {item.recommended && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">必備</span>}
                </div>
                <div className={`text-xs mt-1 ${isChecked ? 'text-blue-700' : 'text-slate-500'}`}>
                  {item.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 text-center">
        <a 
          href="https://www.google.com/maps/search/登山用品店" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200"
        >
          <MapPin size={14} className="text-red-500" />
          <span className="font-bold">找不到裝備？</span>
          搜尋附近的登山用品店
          <ShoppingBag size={12} className="opacity-50"/>
        </a>
      </div>
    </div>
  );
};

export default GearChecklist;