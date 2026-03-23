import React, { useState, useEffect, useRef } from 'react';
import { Message, AnalysisProfile, INITIAL_PROFILE, TabView } from './types';
import { initializeGemini, sendMessageToGemini, requestAnalysisUpdate, playTextAsAudio } from './services/geminiService';
import { Dashboard } from './components/Dashboard';
import SandboxGame from './components/SandboxGame';
import ImageUploader from './components/ImageUploader';
import VoiceRecorder from './components/VoiceRecorder';
import { MessageSquare, LayoutDashboard, Box, Image as ImageIcon, Send, Sparkles, RefreshCw, Globe, Volume2, Loader2, Settings } from 'lucide-react';
import { UI_LABELS } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabView>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: UI_LABELS.ja.welcomeMessage, // Default content, but will be overridden in render
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [profile, setProfile] = useState<AnalysisProfile>(INITIAL_PROFILE);
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('soul_compass_api_key') || '');
  const [imageModel, setImageModel] = useState<string>(() => localStorage.getItem('soul_compass_image_model') || 'gemini-3.1-flash-image-preview');
  const [chatModel, setChatModel] = useState<string>(() => localStorage.getItem('soul_compass_chat_model') || 'gemini-3.1-flash-lite-preview');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const uiLabels = UI_LABELS[profile.language];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Gemini on mount and when apiKey/chatModel changes
  useEffect(() => {
    initializeGemini(apiKey, chatModel);
  }, [apiKey, chatModel]);

  const handleSendMessage = async (
      text: string, 
      mediaBase64?: string, 
      mediaMimeType?: string,
      systemNote?: string
  ) => {
    if (!text && !systemNote && !mediaBase64) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text || (mediaMimeType?.startsWith('audio') ? (profile.language === 'en' ? "Voice Message" : "音声メッセージ") : "メディア送信"),
      timestamp: Date.now(),
      type: mediaMimeType?.startsWith('image') ? 'image' : mediaMimeType?.startsWith('audio') ? 'audio' : 'text',
      imageUrl: mediaMimeType?.startsWith('image') && mediaBase64 ? `data:${mediaMimeType};base64,${mediaBase64}` : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setInputText('');

    try {
      // 1. Send conversation to Gemini
      const langNote = `[Current Language: ${profile.language}]`;
      const fullPrompt = systemNote 
        ? `${langNote} ${systemNote}\n\nUser Message: ${text}` 
        : `${langNote} ${text}`;

      const responseText = await sendMessageToGemini(fullPrompt, mediaBase64, mediaMimeType);
      
      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, modelMsg]);

      // 2. Trigger Analysis Update
      // Use the LATEST messages including the one just added
      const currentHistory = [...messages, userMsg, modelMsg];
      
      if (mediaBase64 || systemNote || messages.length % 3 === 0) {
        // Run asynchronously, passing history explicitly
        setTimeout(() => updateAnalysis(profile.language, currentHistory), 100);
      }

    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'model',
          content: profile.language === 'en' ? "Sorry, an error occurred." : "申し訳ありません。エラーが発生しました。",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateAnalysis = async (forcedLanguage?: 'ja' | 'en', historyOverride?: Message[]) => {
      if (isAnalysisLoading) return;
      
      console.log("Updating analysis...");
      setIsAnalysisLoading(true);
      try {
        const langToUse = forcedLanguage || profile.language;
        const profileToUpdate = { ...profile, language: langToUse };
        const historyToUse = historyOverride || messages;
        
        // Pass history explicitly to keep the analysis prompt stateless
        const newProfile = await requestAnalysisUpdate(profileToUpdate, historyToUse, chatModel);
        if (newProfile) {
            setProfile(newProfile);
        }
      } catch (error) {
          console.error("Failed to update analysis", error);
      } finally {
          setIsAnalysisLoading(false);
      }
  };

  const toggleLanguage = () => {
    const newLang = profile.language === 'ja' ? 'en' : 'ja';
    setProfile(prev => ({ ...prev, language: newLang }));
    
    const switchMsg = newLang === 'en' ? "Switched to English mode." : "日本語モードに切り替えました。";
    const newMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        content: switchMsg,
        timestamp: Date.now()
    };
    setMessages(prev => [...prev, newMsg]);
    updateAnalysis(newLang, [...messages, newMsg]);
  };

  const playMessageAudio = async (msg: Message) => {
      if (playingMessageId === msg.id) return;
      setPlayingMessageId(msg.id);
      try {
          // If it's the welcome message, play the localized version
          const textToPlay = msg.id === 'welcome' ? uiLabels.welcomeMessage : msg.content;
          await playTextAsAudio(textToPlay, profile.language);
      } catch (e) {
          console.error(e);
      } finally {
          setPlayingMessageId(null);
      }
  };

  const handleSandboxFinish = (description: string) => {
    setActiveTab('chat');
    const systemPrompt = `[System: User completed Sandbox Game. Description: ${description}. INSTRUCTION: Respond naturally. DO NOT output JSON.]`;

    handleSendMessage(
        profile.language === 'en' ? "I finished the Sandbox game." : "箱庭を作成しました。", 
        undefined, 
        undefined, 
        systemPrompt
    );
  };

  const handleImageUpload = (base64: string, category: string) => {
    setActiveTab('chat');
    const text = profile.language === 'en' 
        ? `I uploaded an image (Category: ${category}). What does this reveal?`
        : `画像をアップロードしました（カテゴリ: ${category}）。この画像から何がわかりますか？`;

    handleSendMessage(
        text, 
        base64, 
        'image/jpeg',
        `[System: Image uploaded. Analyze visual cues. Respond naturally. Do NOT output JSON.]`
    );
  };
  
  const handleVoiceUpload = (base64: string, mimeType: string) => {
    const prompt = profile.language === 'en'
        ? "[INSTRUCTION: Listen CAREFULLY. Transcribe VERBATIM. Answer naturally. NO JSON.]"
        : "[指示：音声を注意深く聞き、一字一句正確に書き起こして応答してください。JSONは出力しないでください。]";

    handleSendMessage(
        profile.language === 'en' ? "Sent voice message." : "音声を送信しました。", 
        base64, 
        mimeType,
        prompt
    );
  };

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-zen">
      {/* Sidebar Navigation */}
      <nav className="w-16 md:w-20 bg-slate-900 border-r border-white/5 flex flex-col items-center py-6 gap-6 z-20">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
          <Sparkles className="text-white w-6 h-6" />
        </div>
        
        {[
          { id: 'chat', icon: MessageSquare, label: 'Chat' },
          { id: 'dashboard', icon: LayoutDashboard, label: 'Profile' },
          { id: 'sandbox', icon: Box, label: 'Game' },
          { id: 'images', icon: ImageIcon, label: 'Images' },
          { id: 'settings', icon: Settings, label: 'Settings' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as TabView)}
            className={`p-3 rounded-xl transition-all duration-300 relative group ${
              activeTab === item.id 
                ? 'bg-white/10 text-white shadow-inner' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            <item.icon className="w-6 h-6" />
            <span className="absolute left-14 bg-slate-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 z-50">
                {item.label}
            </span>
          </button>
        ))}

        <div className="mt-auto flex flex-col gap-4">
            <button
                onClick={toggleLanguage}
                className="p-3 rounded-xl text-slate-500 hover:text-indigo-400 hover:bg-white/5 transition-all duration-300 relative group"
            >
                <Globe className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center">
                    <span className="text-[8px] font-bold text-white bg-indigo-500 rounded-full w-full h-full flex items-center justify-center">
                        {profile.language.toUpperCase()}
                    </span>
                </span>
            </button>

            <button
                onClick={() => updateAnalysis(undefined, messages)}
                disabled={isAnalysisLoading}
                className={`p-3 rounded-xl transition-all duration-300 relative group ${
                    isAnalysisLoading ? 'text-indigo-400 bg-white/5' : 'text-slate-500 hover:text-indigo-400 hover:bg-white/5'
                }`}
            >
                <RefreshCw className={`w-6 h-6 ${isAnalysisLoading ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {!apiKey && (
            <div className="bg-amber-600/90 text-white text-sm py-2 px-4 flex justify-between items-center z-50 shadow-md flex-shrink-0">
                <span>{(uiLabels as any).missingApiKey}</span>
                <button 
                    onClick={() => setActiveTab('settings')} 
                    className="text-white underline font-bold px-3 py-1 bg-black/20 hover:bg-black/40 rounded transition-colors whitespace-nowrap ml-4"
                >
                    {(uiLabels as any).goToSettings}
                </button>
            </div>
        )}
        <div className="flex-1 flex overflow-hidden relative">
        
        {/* Chat Area */}
        <div className={`flex-1 flex flex-col min-w-0 bg-[#0f172a] transition-all duration-500 absolute inset-0 z-10 md:static ${activeTab !== 'chat' ? 'translate-x-full md:translate-x-0 opacity-0 md:opacity-100 pointer-events-none md:pointer-events-auto' : 'translate-x-0 opacity-100'}`}>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-md relative group ${
                            msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-sm' 
                                : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-white/5'
                        }`}>
                            {msg.type === 'image' && msg.imageUrl && (
                                <img src={msg.imageUrl} alt="Uploaded" className="max-w-full h-auto rounded-lg mb-2 border border-white/10" />
                            )}
                            {msg.type === 'audio' && (
                                <div className="text-xs opacity-70 mb-1 flex items-center gap-1">
                                    <Sparkles size={12} /> {profile.language === 'en' ? 'Voice Message' : '音声メッセージ'}
                                </div>
                            )}
                            {/* Dynamic Welcome Message Rendering */}
                            <p className="whitespace-pre-wrap leading-relaxed">
                                {msg.id === 'welcome' ? uiLabels.welcomeMessage : msg.content}
                            </p>

                            {/* TTS Button for Model Messages: Always visible, unified style */}
                            {msg.role === 'model' && (
                                <div className="mt-2 flex items-center justify-end">
                                    <button
                                        onClick={() => playMessageAudio(msg)}
                                        disabled={playingMessageId === msg.id}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                            playingMessageId === msg.id 
                                                ? 'bg-indigo-600 text-white' 
                                                : 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white'
                                        }`}
                                    >
                                        {playingMessageId === msg.id ? <Loader2 size={12} className="animate-spin" /> : <Volume2 size={12} />}
                                        {playingMessageId === msg.id ? uiLabels.podcastPlaying : uiLabels.podcastBtn}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800 rounded-2xl p-4 rounded-tl-sm border border-white/5 flex gap-2 items-center">
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                            <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100" />
                            <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce delay-200" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-900 border-t border-white/5">
                <div className="flex gap-2 relative">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSendMessage(inputText)}
                        placeholder={profile.language === 'en' ? "Type a message..." : "メッセージを入力..."}
                        className="flex-1 bg-slate-800 border-none rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-500"
                        disabled={isLoading}
                    />
                    <button 
                        onClick={() => handleSendMessage(inputText)}
                        disabled={isLoading || !inputText.trim()}
                        className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        <Send size={20} />
                    </button>
                    
                    <VoiceRecorder 
                        onRecordingComplete={handleVoiceUpload} 
                        disabled={isLoading} 
                        lang={profile.language}
                    />
                </div>
            </div>
        </div>

        {/* Side Panel */}
        <div className={`absolute inset-0 md:static md:w-[450px] lg:w-[600px] bg-slate-900/95 backdrop-blur-xl border-l border-white/5 transition-transform duration-300 z-20 ${
            activeTab === 'chat' ? 'translate-x-full md:translate-x-0 hidden md:flex' : 'translate-x-0 flex'
        } flex-col`}>
            
            <div className="md:hidden p-4 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-lg font-bold text-white capitalize">{activeTab}</h2>
                <button onClick={() => setActiveTab('chat')} className="text-slate-400 hover:text-white">
                    {uiLabels.close}
                </button>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'dashboard' && <Dashboard profile={profile} imageModel={imageModel} />}
                {activeTab === 'sandbox' && <SandboxGame onFinish={handleSandboxFinish} lang={profile.language} />}
                {activeTab === 'images' && <ImageUploader onImageSelected={handleImageUpload} lang={profile.language} />}
                {activeTab === 'settings' && (
                    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 text-slate-200">
                        <header className="mb-6">
                            <h2 className="text-2xl font-bold text-white mb-2 font-zen">
                                {(uiLabels as any).settingsTitle || 'Settings'}
                            </h2>
                        </header>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">{(uiLabels as any).apiKeyLabel || 'API Key'}</label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => {
                                        setApiKey(e.target.value);
                                        localStorage.setItem('soul_compass_api_key', e.target.value);
                                    }}
                                    placeholder={(uiLabels as any).apiKeyPlaceholder || 'Enter API Key'}
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">{(uiLabels as any).imageModelLabel || 'Image Model'}</label>
                                <select
                                    value={imageModel}
                                    onChange={(e) => {
                                        setImageModel(e.target.value);
                                        localStorage.setItem('soul_compass_image_model', e.target.value);
                                    }}
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none mb-4"
                                >
                                    <option value="gemini-3.1-flash-image-preview">{(uiLabels as any).nanobanana2 || 'Nanobanana2'}</option>
                                    <option value="gemini-3-pro-image-preview">{(uiLabels as any).gemini3Pro || 'Gemini 3.1 Pro Image'}</option>
                                </select>
                                
                                <label className="block text-sm font-medium text-slate-300 mb-2">{(uiLabels as any).chatModelLabel || 'Chat Model'}</label>
                                <select
                                    value={chatModel}
                                    onChange={(e) => {
                                        setChatModel(e.target.value);
                                        localStorage.setItem('soul_compass_chat_model', e.target.value);
                                    }}
                                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none"
                                >
                                    <option value="gemini-3.1-flash-lite-preview">{(uiLabels as any).gemini31FlashLiteChat || 'Gemini 3.1 Flash-Lite'}</option>
                                    <option value="gemini-3-flash">{(uiLabels as any).gemini3FlashChat || 'Gemini 3 Flash'}</option>
                                    <option value="gemini-3.1-pro-preview">{(uiLabels as any).gemini31ProChat || 'Gemini 3.1 Pro'}</option>
                                </select>
                            </div>
                            <div className="pt-4">
                                <button
                                    onClick={() => alert((uiLabels as any).savedMessage || 'Saved')}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 font-bold transition-all"
                                >
                                    {(uiLabels as any).saveBtn || 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'chat' && (
                    <div className="hidden md:flex flex-col h-full">
                         <Dashboard profile={profile} imageModel={imageModel} />
                    </div>
                )}
            </div>
        </div>

        </div>
      </main>
    </div>
  );
};

export default App;