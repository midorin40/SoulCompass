import React, { useRef, useState } from 'react';
import { UI_LABELS } from '../constants';
import { Camera, Upload, Image as ImageIcon, Hand, Armchair, Heart } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (base64: string, category: string) => void;
  lang: 'ja' | 'en';
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, lang }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('hand');
  const labels = UI_LABELS[lang];

  const categories = [
    { id: 'hand', label: labels.catHand, icon: Hand, desc: labels.catDescHand },
    { id: 'room', label: labels.catRoom, icon: Armchair, desc: labels.catDescRoom },
    { id: 'favorite', label: labels.catFav, icon: Heart, desc: labels.catDescFav },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        onImageSelected(base64Data, selectedCategory);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-6 h-full flex flex-col text-slate-200">
      <h3 className="text-xl font-bold mb-6 font-zen flex items-center gap-2">
        <Camera className="w-6 h-6 text-pink-400" />
        {labels.imageUploadTitle}
      </h3>
      
      <div className="grid grid-cols-1 gap-4 mb-6">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group ${
              selectedCategory === cat.id
                ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500/50 shadow-lg'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${selectedCategory === cat.id ? 'bg-pink-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                <cat.icon size={20} />
              </div>
              <span className={`font-bold ${selectedCategory === cat.id ? 'text-pink-200' : 'text-slate-300'}`}>
                {cat.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 pl-1">{cat.desc}</p>
            {selectedCategory === cat.id && (
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-pink-500" />
            )}
          </button>
        ))}
      </div>

      <div className="mt-auto">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-blue-500/20 font-bold flex items-center justify-center gap-3 transition-transform active:scale-95"
        >
          <Upload size={20} />
          {categories.find(c => c.id === selectedCategory)?.label}
        </button>
        <p className="text-center text-xs text-slate-500 mt-4">
            {labels.imageNote}
        </p>
      </div>
    </div>
  );
};

export default ImageUploader;