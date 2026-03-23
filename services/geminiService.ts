import { GoogleGenAI, GenerateContentResponse, Chat, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION, ARCHETYPES } from "../constants";
import { AnalysisProfile, Message } from "../types";

let client: GoogleGenAI | null = null;
let chatSession: Chat | null = null;
// Singleton AudioContext to reduce latency
let audioContext: AudioContext | null = null;

// Initialize the Gemini Client
export const initializeGemini = (apiKey?: string, chatModel: string = 'gemini-3.1-flash-lite-preview') => {
  const key = apiKey || process.env.API_KEY;
  if (!key) return;
  
  client = new GoogleGenAI({ apiKey: key });
  
  // Chat Session: Uses selected model (default: gemini-3.1-flash) for interaction
  chatSession = client.chats.create({
    model: chatModel, 
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
  });
};

// Send Message to Chat (Conversation Only)
export const sendMessageToGemini = async (
  message: string, 
  mediaBase64?: string, 
  mediaMimeType?: string
): Promise<string> => {
  if (!client) initializeGemini();
  if (!chatSession) throw new Error("Gemini AI is not initialized.");

  try {
    let result: GenerateContentResponse;

    if (mediaBase64 && mediaMimeType) {
      result = await chatSession.sendMessage({
        message: [
            { text: message },
            {
              inlineData: {
                data: mediaBase64,
                mimeType: mediaMimeType,
              },
            },
          ]
      });
    } else {
      result = await chatSession.sendMessage({
        message: message
      });
    }

    return result.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * Programmatically constructs the prompt for the Infographic Image.
 * This ensures strict consistency between the JSON scores and the visual representation,
 * and enforces the presence of text explanations.
 */
const constructInfographicPrompt = (profile: AnalysisProfile): string => {
  const isJa = profile.language === 'ja';
  
  const bf = profile.bigFive;
  const mot = profile.motivation;
  
  // Format Data Strings (e.g. "外向性: 80, 協調性: 60...")
  const bigFiveData = Object.values(bf)
    .map(v => `${v.label}: ${v.score}`)
    .join(', ');
    
  const motivationData = Object.values(mot)
    .map(v => `${v.label}: ${v.score}`)
    .join(', ');

  const archetypeName = isJa ? profile.archetype?.nameJa : profile.archetype?.nameEn;
  const title = isJa ? "心理プロファイル" : "Soul Profile";
  
  // Extract details
  const theme = profile.archetype?.currentTheme || "";
  const luckyItem = profile.archetype?.luckyItem || "";
  const luckyColor = profile.archetype?.luckyColor || "";
  
  // Clean summary for prompt (limit length)
  // Relaxed limit to 70 chars to give model more context, but still prevent huge blocks
  const cleanSummary = profile.summary.replace(/[\r\n]+/g, ' ').trim();
  const summaryText = cleanSummary.length > 70 
    ? cleanSummary.substring(0, 70) + "..." 
    : cleanSummary;

  // Suggested Action (First one, truncated)
  const actionRaw = profile.suggestedActions?.[0] || "";
  const actionText = actionRaw.length > 60 ? actionRaw.substring(0, 60) + "..." : actionRaw;

  // Key Evidence (Highest Big Five Score trait)
  let maxScore = -1;
  let evidenceRaw = "";
  Object.values(bf).forEach(v => {
      if (v.score > maxScore) {
          maxScore = v.score;
          evidenceRaw = v.evidence;
      }
  });
  const evidenceText = evidenceRaw.length > 60 
      ? evidenceRaw.substring(0, 60) + "..." 
      : evidenceRaw;

  if (isJa) {
    return `
      詳細なUIデザイン・インフォグラフィック画像を生成してください。
      
      【構図：3分割レイアウト】
      ・アスペクト比 16:9。
      ・左側 (40%): グラフデータ。
      ・中央 (20%): キャラクター。
      ・右側 (40%): テキスト情報パネル。

      【左側：データエリア】
      1. レーダーチャート (Big Five): 
         - **重要：必ず正五角形（5軸）で描画してください。** 六角形は不可です。
         - データ: ${bigFiveData}
         - デザイン: サイバーパンク調のネオンライン。
      2. 棒グラフ (Motivation):
         - データ: ${motivationData}

      【中央：キャラクターエリア】
      ・「${archetypeName}」のちびキャラを描画。
      ・ラッキーカラー「${luckyColor}」をアクセントに使用。

      【右側：情報パネルエリア】
      以下の情報を近未来的なウィンドウに表示（日本語テキスト）：
      **重要: テキストが長すぎて枠に入りきらない場合は、意味を保ったまま短く「要約」して配置してください。**

      ・タイトル: 「${title}」
      ・現在のテーマ: 「${theme}」
      ・ラッキーアイテム: 「${luckyItem}」
      ・要約: 「${summaryText}」
      ・推奨アクション: 「${actionText}」
      ・主な根拠: 「${evidenceText}」

      【スタイル】
      ・背景: 深層心理を表すダークブルー、幾何学模様。
      ・UI: グラスモーフィズム、高精細な文字表示。
    `.trim();
  } else {
    return `
      Create a detailed Infographic UI image.
      
      [LAYOUT: 3 Columns]
      - Aspect Ratio 16:9.
      - Left (Charts), Center (Character), Right (Info Panel).

      [LEFT: DATA AREA]
      1. Radar Chart (Big Five):
         - **MUST be a Pentagon (5 axes).** Do NOT use a hexagon.
         - Data: ${bigFiveData}
         - Style: Cyberpunk neon lines.
      2. Bar Chart (Motivation):
         - Data: ${motivationData}

      [CENTER: CHARACTER]
      - Chibi mascot of "${archetypeName}".
      - Accent Color: ${luckyColor}.

      [RIGHT: INFO PANEL]
      Display the following text clearly in a holographic window:
      **IMPORTANT: If the text is too long for the panel, SUMMARIZE it to fit.**

      - Title: "${title}"
      - Theme: "${theme}"
      - Lucky Item: "${luckyItem}"
      - Summary: "${summaryText}"
      - Action: "${actionText}"
      - Evidence: "${evidenceText}"

      [STYLE]
      - Background: Dark blue, deep psychology theme.
      - UI: Glassmorphism, 4K resolution.
    `.trim();
  }
};

/**
 * Programmatically constructs the prompt for the Artistic Visual (Inner World).
 * Matches traits to visual elements to ensure a cohesive masterpiece.
 */
const constructVisualPrompt = (profile: AnalysisProfile): string => {
  // Always use English for the image generator description to get best artistic results.
  const archetypeEn = profile.archetype?.nameEn || "Soul Guardian";
  const luckyItem = profile.archetype?.luckyItem || "Mystical Artifact";
  const luckyColor = profile.archetype?.luckyColor || "Prismatic";
  
  // Analyze scores to build environment description
  const bf = profile.bigFive;
  const traits: string[] = [];
  
  // Openness (Imagination / Range of Interests)
  if (bf.openness.score >= 70) traits.push("surreal floating islands, endless starry galaxy sky, vast horizon");
  else if (bf.openness.score <= 40) traits.push("cozy enclosed antique study room, warm candlelight, detailed texture, grounded earth");
  
  // Conscientiousness (Order / Structure)
  if (bf.conscientiousness.score >= 70) traits.push("perfectly symmetrical crystal architecture, complex clockwork mechanisms, geometric fractals");
  else if (bf.conscientiousness.score <= 40) traits.push("abstract flowing paint, whimsical overgrown ancient ruins, chaotic artistic studio");
  
  // Extraversion (Energy / Social)
  if (bf.extraversion.score >= 70) traits.push("bright radiating sunlight, vibrant festival lights, dynamic energy beams");
  else if (bf.extraversion.score <= 40) traits.push("quiet moonlit deep forest, solitary bioluminescent sanctuary, peaceful silence");
  
  // Agreeableness (Compassion / Harmony)
  if (bf.agreeableness.score >= 70) traits.push("gentle healing water springs, soft blooming flowers, warm pink and green aura");
  
  // Neuroticism (Sensitivity / Instability) 
  // High score = High Sensitivity/Instability. Low score = High Stability.
  if (bf.neuroticism.score >= 70) traits.push("dramatic swirling storm clouds, intense lightning, emotional expressionism, protective barriers");
  else if (bf.neuroticism.score <= 40) traits.push("perfectly still mirror lake, clear blue sky, zen garden, absolute serenity");

  const envString = traits.length > 0 ? traits.join(" combined with ") : "a mystical sanctuary representing the inner mind";

  return `
    High-quality digital art, cinematic composition, masterpiece, 16:9 Widescreen.
    
    SUBJECT: The "Guardian of ${archetypeEn}". A symbolic spiritual figure or avatar.
    ACTION: The guardian is holding or interacting with a "${luckyItem}" which glows with magic.
    
    SETTING: The scene takes place in a world characterized by ${envString}.
    
    COLOR PALETTE: Dominant colors are ${luckyColor} blended with deep indigo and dreamlike hues.
    
    STYLE: Ethereal, Spiritual, Anime-realism hybrid (Makoto Shinkai style landscapes), highly detailed, 8k resolution, soft volumetric lighting, ray tracing. Wide angle lens, panoramic view.
    
    (NO TEXT, NO UI, pure art).
  `.trim();
};

// Request Profile Analysis (STATELESS - Does NOT pollute chat history)
// We pass the conversation history explicitly to a separate model instance.
export const requestAnalysisUpdate = async (
    currentProfile: AnalysisProfile, 
    messageHistory: Message[],
    chatModel: string = 'gemini-3.1-flash-lite-preview'
): Promise<AnalysisProfile | null> => {
  if (!client) initializeGemini();
  if (!client) return null;

  const isJapanese = currentProfile.language === 'ja';
  const targetLang = isJapanese ? 'Japanese' : 'English';

  // Format history for the analyzer
  const historyText = messageHistory
    .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
    .join('\n');

  // Strongly formatted prompt to ensure JSON output.
  // Note: We do NOT ask the LLM to generate 'infographicPrompt' or 'visualPrompt'. 
  // We generate them programmatically after receiving the JSON to ensure consistency.
  const prompt = `
    [SYSTEM_TRIGGER_ANALYSIS_UPDATE]
    You are an expert psychological profiler. Analyze the provided conversation history and current profile to generate an updated JSON profile.
    
    CRITICAL INSTRUCTIONS:
    1. Return ONLY a valid JSON object. NO markdown, NO code blocks.
    2. **Language**: ALL content ('summary', 'evidence', 'suggestedActions', 'archetype') MUST be in **${targetLang}**.
    
    3. **ARCHETYPE ASSIGNMENT**:
       - Select one: ${JSON.stringify(ARCHETYPES.map(a => a.id + ": " + a.nameJa))}
       - Fill ALL fields (id, nameJa, nameEn, description, luckyColor, luckyItem, currentTheme).
       - Infer values if data is missing. Do not leave empty.

    4. **EVIDENCE**:
       - Update 'evidence' with specific observations from the conversation.
       - Do not leave empty.
    
    5. **IMAGE PROMPTS**:
       - **DO NOT** generate 'visualPrompt' or 'infographicPrompt' in the JSON. Leave them as empty strings or omit them. I will generate them programmatically using the score data.
    
    Current Profile Schema:
    ${JSON.stringify(currentProfile)}

    Conversation History to Analyze:
    ${historyText}
  `;

  try {
    const result = await client.models.generateContent({
        model: chatModel, // Use configured chat model for analysis
        contents: prompt,
        config: {
            responseMimeType: "application/json" // Force JSON mode
        }
    });
    
    let text = result.text || "";
    // Clean up just in case
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Parse JSON
    try {
        const parsed = JSON.parse(text) as AnalysisProfile;
        
        // CRITICAL FIX: Programmatically construct BOTH prompts
        // This ensures the scores in the prompts MATCH the scores in the JSON exactly,
        // and provides a consistently high-quality visual composition.
        if (parsed && parsed.bigFive && parsed.motivation) {
            parsed.infographicPrompt = constructInfographicPrompt(parsed);
            parsed.visualPrompt = constructVisualPrompt(parsed);
        }
        
        return parsed;
    } catch (e) {
        // Fallback regex match if strict JSON mode fails slightly
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as AnalysisProfile;
             if (parsed && parsed.bigFive && parsed.motivation) {
                parsed.infographicPrompt = constructInfographicPrompt(parsed);
                parsed.visualPrompt = constructVisualPrompt(parsed);
            }
            return parsed;
        }
        return null;
    }
  } catch (error) {
    console.error("Analysis Parse Error:", error);
    return null;
  }
};

// Generate Image
export const generateImageFromPrompt = async (
    prompt: string,
    options: { aspectRatio?: string; imageSize?: string } = {},
    model: string = 'gemini-3.1-flash-image-preview'
): Promise<string | null> => {
    if (!client) initializeGemini();
    if (!client) return null;

    const aspectRatio = options.aspectRatio || "1:1";
    const imageSize = options.imageSize || "1K";

    try {
        const response = await client.models.generateContent({
            model: model,
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio,
                    imageSize: imageSize
                }
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        return null;
    } catch (error) {
        console.error("Image Generation Error:", error);
        throw error;
    }
};

// --- AUDIO GENERATION (TTS) ---

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Unified Audio Player function
export const playTextAsAudio = async (text: string, lang: 'ja' | 'en'): Promise<void> => {
    if (!client) initializeGemini();
    if (!client) return;

    // Use Gemini 2.5 Flash TTS for reliable audio generation
    const model = "gemini-2.5-flash-preview-tts"; 

    try {
        const response = await client.models.generateContent({
            model: model,
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio data returned");

        // Reuse AudioContext if available to reduce latency
        if (!audioContext) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioContext = new AudioContextClass({ sampleRate: 24000 });
        }
        
        // Resume context if suspended (browser policy)
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        const audioBytes = decode(base64Audio);
        const audioBuffer = await decodeAudioData(audioBytes, audioContext);
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();

    } catch (error) {
        console.error("Audio Generation Error:", error);
        throw error;
    }
};

// Kept for backward compatibility, routes to playTextAsAudio
export const generatePodcastAudio = async (text: string, lang: 'ja' | 'en'): Promise<void> => {
    const intro = lang === 'en' ? "Here is your Soul Compass summary." : "ソウル・コンパスによる分析サマリーをお伝えします。";
    await playTextAsAudio(`${intro} ${text}`, lang);
};