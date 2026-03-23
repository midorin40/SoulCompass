import React, { useState } from 'react';
import { SandboxState, SandboxItem } from '../types';
import { UI_LABELS } from '../constants';
import { TreeDeciduous, Home, Waves, Mountain, Gem, Save, RotateCcw } from 'lucide-react';

interface SandboxGameProps {
  onFinish: (resultDescription: string) => void;
  lang: 'ja' | 'en';
}

const SandboxGame: React.FC<SandboxGameProps> = ({ onFinish, lang }) => {
  const [background, setBackground] = useState<SandboxState['background']>('forest');
  const [items, setItems] = useState<SandboxItem[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('tree');
  const labels = UI_LABELS[lang];

  const backgrounds = {
    forest: 'bg-emerald-900',
    city: 'bg-slate-800',
    beach: 'bg-cyan-900',
    space: 'bg-indigo-950',
  };

  const tools = [
    { id: 'tree', icon: TreeDeciduous, label: lang === 'ja' ? '自然・木' : 'Nature' },
    { id: 'house', icon: Home, label: lang === 'ja' ? '住居・建物' : 'Building' },
    { id: 'water', icon: Waves, label: lang === 'ja' ? '水・流れ' : 'Water' },
    { id: 'stone', icon: Mountain, label: lang === 'ja' ? '岩・障害' : 'Stone' },
    { id: 'treasure', icon: Gem, label: lang === 'ja' ? '宝・目標' : 'Treasure' },
  ];

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newItem: SandboxItem = {
      id: Date.now().toString(),
      type: selectedTool,
      x,
      y,
    };

    setItems([...items, newItem]);
  };

  const handleFinish = () => {
    // Convert state to natural language description for Gemini
    const itemCounts = items.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const itemDesc = Object.entries(itemCounts)
      .map(([type, count]) => `${count} ${type}(s)`)
      .join(', ');

    // Simple spatial analysis
    const centerItems = items.filter(i => i.x > 30 && i.x < 70 && i.y > 30 && i.y < 70).length;
    
    const description = `
      User played the Sandbox Game.
      Background: ${background}.
      Placed Objects: ${itemDesc || 'None'}.
      Layout: ${items.length} total items, with ${centerItems} placed centrally.
      (Analyze this for signs of openness, security seeking, or chaos/order).
    `;
    
    onFinish(description);
  };

  const renderIcon = (type: string, className: string) => {
    const ToolIcon = tools.find(t => t.id === type)?.icon || TreeDeciduous;
    return <ToolIcon className={className} />;
  };

  return (
    <div className="h-full flex flex-col p-4 bg-slate-900/50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white font-zen">{labels.sandboxTitle}</h3>
        <div className="flex gap-2">
            <button 
                onClick={() => setItems([])}
                className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-200 rounded-lg transition-colors flex items-center gap-2 text-xs"
            >
                <RotateCcw size={14} /> {labels.sandboxReset}
            </button>
            <button 
                onClick={handleFinish}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-500/20"
            >
                <Save size={16} /> {labels.sandboxFinish}
            </button>
        </div>
      </div>

      {/* Background Selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {(Object.keys(backgrounds) as Array<keyof typeof backgrounds>).map((bg) => (
          <button
            key={bg}
            onClick={() => setBackground(bg)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
              background === bg ? 'bg-white text-slate-900' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {bg}
          </button>
        ))}
      </div>

      {/* Main Game Area */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Canvas */}
        <div 
            className={`flex-1 relative rounded-xl border-2 border-white/10 shadow-inner overflow-hidden cursor-crosshair transition-colors duration-500 ${backgrounds[background]}`}
            onClick={handleCanvasClick}
        >
          <div className="absolute inset-0 opacity-20 pointer-events-none grid grid-cols-4 grid-rows-4">
             {[...Array(16)].map((_, i) => <div key={i} className="border border-white/10"></div>)}
          </div>
          
          {items.map((item) => (
            <div
              key={item.id}
              className="absolute text-white filter drop-shadow-lg transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform"
              style={{ left: `${item.x}%`, top: `${item.y}%` }}
            >
              {renderIcon(item.type, "w-8 h-8 md:w-10 md:h-10 text-white/90")}
            </div>
          ))}
        </div>

        {/* Tools Palette */}
        <div className="w-16 flex flex-col gap-3 bg-slate-800/50 p-2 rounded-xl border border-white/5 overflow-y-auto">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                selectedTool === tool.id 
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              title={tool.label}
            >
              <tool.icon size={20} />
              <span className="text-[10px] hidden md:block">{tool.label.split('・')[0]}</span>
            </button>
          ))}
        </div>
      </div>
      
      <p className="mt-3 text-xs text-slate-400 text-center">
        {labels.sandboxDesc}
      </p>
    </div>
  );
};

export default SandboxGame;