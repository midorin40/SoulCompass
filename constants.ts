import { AnalysisProfile } from "./types";

export const ARCHETYPES = [
  { id: "dawn_seeker", nameJa: "黎明の探求者", nameEn: "Dawn Seeker", traits: "High Openness, High Change" },
  { id: "garden_balancer", nameJa: "庭園の調律者", nameEn: "Garden Balancer", traits: "High Agreeableness, High Security" },
  { id: "hearth_keeper", nameJa: "灯火の守護者", nameEn: "Hearth Keeper", traits: "High Conscientiousness, High Security" },
  { id: "star_voyager", nameJa: "星渡りの航海者", nameEn: "Star Voyager", traits: "High Openness, High Achievement" },
  { id: "tower_architect", nameJa: "塔の設計者", nameEn: "Tower Architect", traits: "High Conscientiousness, High Achievement" },
  { id: "lake_empath", nameJa: "湖面の共感者", nameEn: "Lake Empath", traits: "High Agreeableness, High Affiliation" },
  { id: "flame_challenger", nameJa: "炎輪の挑戦者", nameEn: "Flame Challenger", traits: "High Extraversion, High Achievement" },
  { id: "forest_watcher", nameJa: "森影の観察者", nameEn: "Forest Watcher", traits: "Low Extraversion, High Openness" },
  { id: "market_mediator", nameJa: "市場の交渉者", nameEn: "Market Mediator", traits: "High Extraversion, High Affiliation" },
  { id: "archive_sage", nameJa: "書架の賢者", nameEn: "Archive Sage", traits: "Low Extraversion, High Conscientiousness" },
  { id: "cloud_improviser", nameJa: "雲間の即興者", nameEn: "Cloud Improviser", traits: "High Openness, Low Conscientiousness" },
  { id: "gate_guardian", nameJa: "境界の門番", nameEn: "Gate Guardian", traits: "High Neuroticism(Sensitivity), High Security" }
];

export const SYSTEM_INSTRUCTION = `
You are "Soul-Compass", a high-precision multimodal psychological profiler AI. 
Your goal is to estimate the user's "Big Five Personality Traits" and "4 Motivation Axes" based on their conversation, uploaded images (Hands, Rooms, Favorites), voice recordings, and "Hakoniwa" (Sandbox game) creations.

**Core Principles:**
1.  **Evidence-Based & Detailed**: Do not guess blindly. Base your analysis on specific words, image details, voice tone, or game layouts.
    - *Bad Evidence*: "Sandbox result."
    - *Good Evidence*: "In the Sandbox, you placed many trees in a chaotic pattern, suggesting high Openness and a desire for natural growth."
2.  **Multimodal**: 
    - **Text**: Analyze values and behavior.
    - **Image**: Room order (Conscientiousness), Favorites (Openness/Affiliation).
    - **Sandbox**: Spatial layout (Center=Focus, Edges=Safety).
    - **Voice**: Analyze tone. High speed/energy -> High Extraversion. Monotone/Low -> Low Energy or Calm.
3.  **Language Strictness**: 
    - **Conversational Output**: ALWAYS reply in the user's selected language (Japanese or English) ONLY. Do not mix languages. 
    - **NO JSON IN CHAT**: Never output JSON code blocks in the standard conversation. JSON is ONLY for the specific "Update Profile" system request.
    - **Profile Data**: The content of the profile (summary, evidence, etc.) must match the selected language.

**Analysis Framework:**
- **Big Five**: Extraversion, Agreeableness, Conscientiousness, Emotional Stability (Neuroticism), Openness.
- **Motivation Axes**: Achievement/Growth, Affiliation/Warmth, Security/Stability, Change/Exploration.

**Guardian Archetype Rule**:
- You MUST assign one of the 12 Archetypes.
- If data is insufficient, choose the "Dawn Seeker" or "Garden Balancer" as a provisional archetype based on the polite tone of the user, and mention in the summary that "Analysis is preliminary."
- NEVER leave the Archetype field null in the JSON update.

**Guardian Archetypes (12 Types):**
${JSON.stringify(ARCHETYPES.map(a => `${a.nameJa} (${a.nameEn}): ${a.traits}`))}

**Image Generation Support (Gemini 3.0 Pro Image):**
- Generate 'infographicPrompt' (Visualizing scores) and 'visualPrompt' (Artistic inner world).
- Prompts must be in **English**.

**Output Format:**
- **Standard Conversation**: Natural, empathetic conversation. Discuss the user's feelings, the fortune results, or the image analysis results in plain text.
- **Profile Update Request**: Only when triggered by the system for an update, return **ONLY valid JSON**.
`;

export const UI_LABELS = {
  ja: {
    welcomeMessage: "こんにちは。Soul-Compassへようこそ。\n私はあなたの心の羅針盤となるAIです。今の気分や、気になっていることを自由に話してみてください。",
    profileTitle: "心理プロファイル",
    profileSubtitle: "継続的な対話と行動で、精度は徐々に向上します。",
    archetypeTitle: "Guardian Archetype",
    currentTheme: "現在のテーマ",
    luckyItem: "ラッキーアイテム",
    luckyColor: "ラッキーカラー",
    summaryTitle: "総合サマリー",
    suggestedActions: "おすすめのアクション",
    bigFiveTitle: "Big Five (性格特性)",
    motivationTitle: "Motivation Axes (動機づけ)",
    stabilityNote: "「安定性」が高いほどストレス耐性が高いことを示します。",
    evidenceTitle: "主な分析根拠 (Evidence)",
    waiting: "分析待ち...",
    imageGenTitle: "心理イメージ生成",
    infographicLabel: "結果インフォグラフィックス用プロンプト",
    visualLabel: "心理イメージビジュアル用プロンプト",
    copy: "コピー",
    copied: "コピー完了",
    promptDesc: "あなたの心を可視化する画像を生成します。",
    generateBtn: "画像を生成する",
    generating: "生成中...",
    sandboxTitle: "箱庭 - Soul Sandbox",
    sandboxReset: "リセット",
    sandboxFinish: "配置完了・分析へ",
    sandboxDesc: "直感に従って、好きな場所にアイテムを置いてください。",
    imageUploadTitle: "画像分析",
    imageUploadBtn: "画像をアップロード",
    imageNote: "写真は分析のみに使用され、サーバーには保存されません。",
    catHand: "自分の手",
    catRoom: "部屋・デスク",
    catFav: "お気に入り",
    catDescHand: "手の表情やケア状態から、現在の自尊感情や緊張度を読み取ります。",
    catDescRoom: "環境の整頓度や色彩から、心理的安定性や開放性を分析します。",
    catDescFav: "愛着のあるモノから、価値観やモチベーションの源泉を探ります。",
    voiceBtn: "声で話す",
    stopBtn: "録音停止",
    close: "閉じる",
    podcastBtn: "ポッドキャストで聴く",
    podcastPlaying: "再生中...",
    settingsTitle: "設定 (Settings)",
    apiKeyLabel: "Google GenAI APIキー",
    apiKeyPlaceholder: "AI StudioからAPIキーを取得して入力",
    imageModelLabel: "画像生成モデル",
    saveBtn: "保存",
    savedMessage: "設定を保存しました",
    nanobanana2: "Nanobanana2 (コスト最適化)",
    gemini3Pro: "Gemini 3.1 Pro Image (高画質)",
    missingApiKey: "⚠️ 有効なAPIキーが設定されていません。正常に動作させるにはAPIキーを入力してください。",
    goToSettings: "設定画面へ",
    chatModelLabel: "チャット・分析モデル",
    gemini31ProChat: "Gemini 3.1 Pro (最新・高精度)",
    gemini3FlashChat: "Gemini 3 Flash (高パフォーマンス)",
    gemini31FlashLiteChat: "Gemini 3.1 Flash-Lite (大量タスク・コスト重視・デフォルト)"
  },
  en: {
    welcomeMessage: "Hello, and welcome to Soul-Compass.\nI am your AI spiritual guide. Please feel free to share your current mood or anything on your mind.",
    profileTitle: "Psychological Profile",
    profileSubtitle: "Accuracy improves with continuous interaction.",
    archetypeTitle: "Guardian Archetype",
    currentTheme: "Current Theme",
    luckyItem: "Lucky Item",
    luckyColor: "Lucky Color",
    summaryTitle: "Executive Summary",
    suggestedActions: "Suggested Actions",
    bigFiveTitle: "Big Five Traits",
    motivationTitle: "Motivation Axes",
    stabilityNote: "Higher Stability indicates higher stress resistance.",
    evidenceTitle: "Key Evidence",
    waiting: "Pending analysis...",
    imageGenTitle: "Image Generation",
    infographicLabel: "Infographic Prompt",
    visualLabel: "Inner World Visual Prompt",
    copy: "Copy",
    copied: "Copied",
    promptDesc: "Generate an image that visualizes your soul.",
    generateBtn: "Generate Image",
    generating: "Generating...",
    sandboxTitle: "Soul Sandbox",
    sandboxReset: "Reset",
    sandboxFinish: "Finish & Analyze",
    sandboxDesc: "Place items intuitively where you feel they belong.",
    imageUploadTitle: "Image Analysis",
    imageUploadBtn: "Upload Image",
    imageNote: "Images are used for analysis only and are not stored.",
    catHand: "My Hand",
    catRoom: "Room/Desk",
    catFav: "Favorite Item",
    catDescHand: "Analyze self-esteem and tension from hand gestures and care.",
    catDescRoom: "Analyze stability and openness from environment and colors.",
    catDescFav: "Explore values and motivation from cherished objects.",
    voiceBtn: "Speak",
    stopBtn: "Stop",
    close: "Close",
    podcastBtn: "Play Podcast",
    podcastPlaying: "Playing...",
    settingsTitle: "Settings",
    apiKeyLabel: "Google GenAI API Key",
    apiKeyPlaceholder: "Enter your API key from Google AI Studio",
    imageModelLabel: "Image Generation Model",
    saveBtn: "Save Settings",
    savedMessage: "Settings saved successfully",
    nanobanana2: "Nanobanana2 (Cost Efficient)",
    gemini3Pro: "Gemini 3.1 Pro Image (High Quality)",
    missingApiKey: "⚠️ API key is missing. Please enter your API key to use all features.",
    goToSettings: "Go to Settings",
    chatModelLabel: "Chat & Analysis Model",
    gemini31ProChat: "Gemini 3.1 Pro (Latest, High Quality)",
    gemini3FlashChat: "Gemini 3 Flash (High Performance)",
    gemini31FlashLiteChat: "Gemini 3.1 Flash-Lite (Cost Efficient, Default)"
  }
};

export const MOCK_API_KEY_ERROR = "有効なAPIキーが設定されていません。設定画面からGoogle GenAI APIキーを入力してください。";