import React, { useState } from 'react';
import { AnalysisProfile, BigFiveScore, MotivationScore } from '../types';
import { UI_LABELS } from '../constants';
import { generateImageFromPrompt, generatePodcastAudio, playTextAsAudio, initializeGemini } from '../services/geminiService';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Activity, Sparkles, Star, Copy, Check, ImageIcon, Loader2, Headphones, Volume2, Maximize2, Download, X } from 'lucide-react';

declare global {
    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }
    interface Window {
      aistudio?: AIStudio;
    }
}

interface DashboardProps {
  profile: AnalysisProfile;
  imageModel?: string;
}

// Custom Tooltip for Motivation Chart to match bar colors
const CustomMotivationTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-slate-800 border border-slate-600 p-3 rounded-lg shadow-xl text-xs">
        <p className="font-bold text-slate-200 mb-1">{data.payload.name}</p>
        <div className="flex items-center gap-2">
           <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.payload.color }}></span>
           <span style={{ color: data.payload.color, fontWeight: 'bold' }}>
             Score: {data.value}
           </span>
        </div>
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<DashboardProps> = ({ profile, imageModel = 'gemini-3.1-flash-image-preview' }) => {
  const lang = profile.language;
  const labels = UI_LABELS[lang];
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);
  const [isGeneratingInfo, setIsGeneratingInfo] = useState(false);
  const [isPlayingPodcast, setIsPlayingPodcast] = useState(false);
  const [isPlayingArchetype, setIsPlayingArchetype] = useState(false);
  const [isPlayingEvidence, setIsPlayingEvidence] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | undefined>(profile.generatedImage);
  const [generatedInfoImage, setGeneratedInfoImage] = useState<string | undefined>();
  
  // Image Modal State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Helper for copying text
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadImage = (base64: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${base64}`;
    link.download = `${filename}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateImage = async (type: 'visual' | 'info') => {
      if (window.aistudio) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          if (!hasKey) {
              await window.aistudio.openSelectKey();
          }
      }

      const prompt = type === 'visual' ? profile.visualPrompt : profile.infographicPrompt;
      if (!prompt) return;
      
      if (type === 'visual') setIsGeneratingVisual(true);
      else setIsGeneratingInfo(true);

      // Configure image options based on type
      // Infographics: 16:9, 4K (High quality for reading text/details)
      // Visuals: 16:9, 4K (Cinematic wide shot)
      const options = { aspectRatio: '16:9', imageSize: '4K' };

      try {
          const base64 = await generateImageFromPrompt(prompt, options, imageModel);
          if (base64) {
              if (type === 'visual') setGeneratedImage(base64);
              else setGeneratedInfoImage(base64);
          }
      } catch (error) {
          console.error("Generation failed", error);
          alert("画像の生成に失敗しました。APIキーが正しく設定されているか確認してください。");
      } finally {
          if (type === 'visual') setIsGeneratingVisual(false);
          else setIsGeneratingInfo(false);
      }
  };

  const handlePlayPodcast = async () => {
      if (!profile.summary || isPlayingPodcast) return;
      setIsPlayingPodcast(true);
      try {
          await generatePodcastAudio(profile.summary, lang);
      } catch (e) {
          alert("音声の生成に失敗しました。");
      } finally {
          setIsPlayingPodcast(false);
      }
  };

  const handlePlayArchetype = async () => {
      if (!profile.archetype || isPlayingArchetype) return;
      setIsPlayingArchetype(true);
      const name = lang === 'ja' ? profile.archetype.nameJa : profile.archetype.nameEn;
      const themeLabel = lang === 'ja' ? 'テーマ' : 'Theme';
      const itemLabel = lang === 'ja' ? 'ラッキーアイテム' : 'Lucky Item';
      
      const text = `${name}. ${profile.archetype.description}. ${themeLabel}: ${profile.archetype.currentTheme}. ${itemLabel}: ${profile.archetype.luckyItem}.`;
      
      try {
          await playTextAsAudio(text, lang);
      } catch (e) {
          console.error(e);
      } finally {
          setIsPlayingArchetype(false);
      }
  };

  const handlePlayEvidence = async () => {
      if (isPlayingEvidence) return;
      setIsPlayingEvidence(true);
      
      // Aggregate evidence text
      const evidenceList: string[] = [];
      (Object.values(profile.bigFive) as BigFiveScore[]).forEach(v => {
          if (v.evidence && v.evidence.length > 5) evidenceList.push(`${v.label}: ${v.evidence}`);
      });
      (Object.values(profile.motivation) as MotivationScore[]).forEach(v => {
          if (v.evidence && v.evidence.length > 5) evidenceList.push(`${v.label}: ${v.evidence}`);
      });

      const intro = lang === 'ja' ? "分析の根拠をお伝えします。" : "Here is the evidence for your analysis.";
      const text = `${intro} ${evidenceList.join(' ')}`;
      
      try {
          await playTextAsAudio(text, lang);
      } catch (e) {
          console.error(e);
      } finally {
          setIsPlayingEvidence(false);
      }
  };

  const radarData = [
    { subject: profile.bigFive.extraversion.label, A: profile.bigFive.extraversion.score, fullMark: 100 },
    { subject: profile.bigFive.agreeableness.label, A: profile.bigFive.agreeableness.score, fullMark: 100 },
    { subject: profile.bigFive.conscientiousness.label, A: profile.bigFive.conscientiousness.score, fullMark: 100 },
    { subject: profile.bigFive.neuroticism.label, A: profile.bigFive.neuroticism.score, fullMark: 100 },
    { subject: profile.bigFive.openness.label, A: profile.bigFive.openness.score, fullMark: 100 },
  ];

  const motivationData = [
    { name: profile.motivation.achievement.label, score: profile.motivation.achievement.score, color: '#facc15' },
    { name: profile.motivation.affiliation.label, score: profile.motivation.affiliation.score, color: '#f472b6' },
    { name: profile.motivation.security.label, score: profile.motivation.security.score, color: '#60a5fa' },
    { name: profile.motivation.change.label, score: profile.motivation.change.score, color: '#34d399' },
  ];

  return (
    <>
        <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 text-slate-200">
        <header className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2 font-zen">{labels.profileTitle}</h2>
            <p className="text-sm text-slate-400 flex items-center gap-2">
                <Activity size={14} className="text-indigo-400"/>
                {labels.profileSubtitle}
            </p>
        </header>
        
        {/* Archetype Card - Hero Section */}
        {profile.archetype && (
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-500/30 rounded-xl p-6 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Sparkles size={120} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-indigo-300">
                            <Star size={18} fill="currentColor" />
                            <span className="text-sm font-bold tracking-widest uppercase">{labels.archetypeTitle}</span>
                        </div>
                        {/* Unified Podcast Button Style */}
                        <button 
                            onClick={handlePlayArchetype}
                            disabled={isPlayingArchetype}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/50 rounded-full text-xs font-bold text-indigo-100 transition-all disabled:opacity-50"
                            title="Listen to Archetype"
                        >
                            {isPlayingArchetype ? <Loader2 size={14} className="animate-spin" /> : <Headphones size={14} />}
                            {isPlayingArchetype ? labels.podcastPlaying : labels.podcastBtn}
                        </button>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-1 font-zen">
                        {lang === 'ja' ? profile.archetype.nameJa : profile.archetype.nameEn}
                    </h3>
                    <p className="text-lg text-indigo-200 mb-4 font-serif italic">
                        {lang === 'ja' ? profile.archetype.nameEn : profile.archetype.nameJa}
                    </p>
                    <p className="text-slate-300 leading-relaxed mb-6 bg-black/20 p-4 rounded-lg backdrop-blur-sm">
                        {profile.archetype.description}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                            <span className="block text-xs text-slate-400 mb-1">{labels.currentTheme}</span>
                            <span className="text-sm font-bold text-white">{profile.archetype.currentTheme}</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                            <span className="block text-xs text-slate-400 mb-1">{labels.luckyItem}</span>
                            <span className="text-sm font-bold text-amber-300">{profile.archetype.luckyItem}</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                            <span className="block text-xs text-slate-400 mb-1">{labels.luckyColor}</span>
                            <span className="text-sm font-bold" style={{ color: 'white' }}>{profile.archetype.luckyColor}</span>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Summary Section with Podcast */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md shadow-xl relative">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-purple-200">{labels.summaryTitle}</h3>
                </div>
                <button 
                    onClick={handlePlayPodcast}
                    disabled={isPlayingPodcast}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-full text-xs font-bold text-white transition-all disabled:opacity-50"
                >
                    {isPlayingPodcast ? <Loader2 size={14} className="animate-spin" /> : <Headphones size={14} />}
                    {isPlayingPodcast ? labels.podcastPlaying : labels.podcastBtn}
                </button>
            </div>
            <p className="text-sm leading-relaxed text-slate-300">{profile.summary}</p>
            
            {profile.suggestedActions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{labels.suggestedActions}</h4>
                <ul className="space-y-2">
                {profile.suggestedActions.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-emerald-300">
                    <span className="mt-1 block w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    {action}
                    </li>
                ))}
                </ul>
            </div>
            )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Big Five Radar */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-md flex flex-col items-center">
            <h3 className="text-md font-semibold text-blue-200 mb-2 w-full text-left">{labels.bigFiveTitle}</h3>
            <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#475569" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                    name="Score"
                    dataKey="A"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="#8b5cf6"
                    fillOpacity={0.5}
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                        itemStyle={{ color: '#c4b5fd' }}
                    />
                </RadarChart>
                </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center italic">
                {labels.stabilityNote}
            </p>
            </div>

            {/* Motivation Bar Chart */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-md">
            <h3 className="text-md font-semibold text-amber-200 mb-2">{labels.motivationTitle}</h3>
            <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={motivationData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    {/* Use Custom Tooltip to fix visibility and color matching */}
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} content={<CustomMotivationTooltip />} />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                    {motivationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
                {motivationData.map((m, i) => (
                <div key={i} className="flex justify-between text-xs text-slate-400">
                    <span>{m.name}</span>
                    <span style={{ color: m.color }}>{profile.motivation[Object.keys(profile.motivation)[i] as keyof typeof profile.motivation].score}</span>
                </div>
                ))}
            </div>
            </div>
        </div>
        
        {/* Evidence Log (Moved UP) */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-semibold text-slate-300">{labels.evidenceTitle}</h3>
                {/* Unified Podcast Button Style */}
                <button 
                    onClick={handlePlayEvidence}
                    disabled={isPlayingEvidence}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-full text-xs font-bold text-white transition-all disabled:opacity-50"
                    title="Listen to Evidence"
                >
                    {isPlayingEvidence ? <Loader2 size={14} className="animate-spin" /> : <Headphones size={14} />}
                    {isPlayingEvidence ? labels.podcastPlaying : labels.podcastBtn}
                </button>
            </div>
            <div className="space-y-3">
                {Object.entries(profile.bigFive).map(([key, val]) => {
                    const score = val as BigFiveScore;
                    return (
                        score.evidence && score.evidence !== "分析待ち..." && score.evidence !== "Pending analysis..." ? (
                            <div key={key} className="text-sm">
                                <span className="text-blue-300 font-medium mr-2">[{score.label}]</span>
                                <span className="text-slate-400 leading-relaxed">{score.evidence}</span>
                            </div>
                        ) : null
                    );
                })}
                {Object.entries(profile.motivation).map(([key, val]) => {
                    const score = val as MotivationScore;
                    return (
                        score.evidence && score.evidence !== "分析待ち..." && score.evidence !== "Pending analysis..." ? (
                            <div key={key} className="text-sm">
                                <span className="text-amber-300 font-medium mr-2">[{score.label}]</span>
                                <span className="text-slate-400 leading-relaxed">{score.evidence}</span>
                            </div>
                        ) : null
                    );
                })}
            </div>
        </div>

        {/* Image Generation Section (Moved DOWN) */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4">
                <ImageIcon className="w-5 h-5 text-pink-400" />
                <h3 className="text-lg font-semibold text-pink-200">{labels.imageGenTitle}</h3>
            </div>
            <p className="text-sm text-slate-400 mb-4">{labels.promptDesc}</p>

            {generatedImage && (
                <div className="mb-6 rounded-lg overflow-hidden border border-white/20 shadow-lg relative group">
                    <img 
                        src={`data:image/png;base64,${generatedImage}`} 
                        alt="Generated Soul Visualization" 
                        className="w-full h-auto cursor-zoom-in"
                        onClick={() => setSelectedImage(generatedImage)}
                    />
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button
                            onClick={() => setSelectedImage(generatedImage)}
                            className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm"
                            title="Expand"
                         >
                             <Maximize2 size={16} />
                         </button>
                         <button
                            onClick={() => handleDownloadImage(generatedImage, 'soul-visual')}
                            className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm"
                            title="Download"
                         >
                             <Download size={16} />
                         </button>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {/* Visual Prompt & Generate Button */}
                <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">{labels.visualLabel}</span>
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                            <div className="flex-1 bg-black/20 rounded-lg p-3 text-xs text-slate-300 font-mono break-all border border-white/5">
                                {profile.visualPrompt || labels.waiting}
                            </div>
                            {profile.visualPrompt && (
                                <button 
                                    onClick={() => copyToClipboard(profile.visualPrompt!, 'visual')}
                                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors h-10 w-10 flex items-center justify-center"
                                    title={labels.copy}
                                >
                                    {copiedField === 'visual' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                </button>
                            )}
                        </div>
                        {profile.visualPrompt && (
                            <button 
                                onClick={() => handleGenerateImage('visual')}
                                disabled={isGeneratingVisual}
                                className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl shadow-lg shadow-pink-500/20 font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                                {isGeneratingVisual ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                                {isGeneratingVisual ? labels.generating : labels.generateBtn}
                            </button>
                        )}
                    </div>
                </div>

                {/* Infographic Prompt (with Image Generation) */}
                <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                    <span className="text-xs font-bold text-slate-500 uppercase">{labels.infographicLabel}</span>
                    
                    {generatedInfoImage && (
                        <div className="mb-2 rounded-lg overflow-hidden border border-white/20 shadow-lg relative group">
                            <img 
                                src={`data:image/png;base64,${generatedInfoImage}`} 
                                alt="Generated Infographic" 
                                className="w-full h-auto cursor-zoom-in"
                                onClick={() => setSelectedImage(generatedInfoImage)}
                            />
                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => setSelectedImage(generatedInfoImage)}
                                    className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm"
                                    title="Expand"
                                >
                                    <Maximize2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDownloadImage(generatedInfoImage, 'soul-infographic')}
                                    className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm"
                                    title="Download"
                                >
                                    <Download size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                            <div className="flex-1 bg-black/20 rounded-lg p-3 text-xs text-slate-300 font-mono break-all border border-white/5">
                                {profile.infographicPrompt || labels.waiting}
                            </div>
                            {profile.infographicPrompt && (
                                <button 
                                    onClick={() => copyToClipboard(profile.infographicPrompt!, 'info')}
                                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors h-10 w-10 flex items-center justify-center"
                                    title={labels.copy}
                                >
                                    {copiedField === 'info' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                </button>
                            )}
                        </div>
                        {profile.infographicPrompt && (
                            <button 
                                onClick={() => handleGenerateImage('info')}
                                disabled={isGeneratingInfo}
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl shadow-lg shadow-blue-500/20 font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                                {isGeneratingInfo ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                                {isGeneratingInfo ? labels.generating : labels.generateBtn}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    {/* Full Screen Image Modal */}
    {selectedImage && (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setSelectedImage(null)}
        >
            <div className="relative max-w-full max-h-full">
                <img 
                    src={`data:image/png;base64,${selectedImage}`} 
                    alt="Expanded View" 
                    className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()} 
                />
                <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadImage(selectedImage, 'soul-expanded');
                    }}
                    className="absolute -top-12 right-12 p-2 text-white/70 hover:text-white transition-colors flex items-center gap-2"
                >
                    <Download size={24} />
                </button>
            </div>
        </div>
    )}
    </>
  );
};