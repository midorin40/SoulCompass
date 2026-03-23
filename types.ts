export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  type?: 'text' | 'image' | 'audio' | 'sandbox_result';
  imageUrl?: string;
}

export interface BigFiveScore {
  score: number; // 0-100
  evidence: string;
  label: string;
}

export interface MotivationScore {
  score: number; // 0-100
  evidence: string;
  label: string;
}

export interface GuardianArchetype {
  id: string;
  nameJa: string;
  nameEn: string;
  description: string;
  luckyColor: string;
  luckyItem: string;
  currentTheme: string;
}

export interface AnalysisProfile {
  language: 'ja' | 'en';
  bigFive: {
    extraversion: BigFiveScore;     // 外向性
    agreeableness: BigFiveScore;    // 協調性
    conscientiousness: BigFiveScore;// 誠実性
    neuroticism: BigFiveScore;      // 情緒安定性
    openness: BigFiveScore;         // 開放性
  };
  motivation: {
    achievement: MotivationScore;   // 達成・成長
    affiliation: MotivationScore;   // 親和・つながり
    security: MotivationScore;      // 安定・安全
    change: MotivationScore;        // 変化・探求
  };
  archetype?: GuardianArchetype;
  summary: string;
  suggestedActions: string[];
  infographicPrompt?: string; // Prompt for generating data visualization
  visualPrompt?: string;      // Prompt for generating artistic representation
  generatedImage?: string;    // Base64 string of the generated image
}

export type TabView = 'chat' | 'dashboard' | 'sandbox' | 'images' | 'settings';

export interface SandboxItem {
  id: string;
  type: string; // 'tree', 'house', 'water', 'stone', 'animal'
  x: number;
  y: number;
}

export interface SandboxState {
  background: 'forest' | 'city' | 'beach' | 'space';
  items: SandboxItem[];
}

export const INITIAL_PROFILE: AnalysisProfile = {
  language: 'ja',
  bigFive: {
    extraversion: { score: 50, evidence: "分析待ち...", label: "外向性" },
    agreeableness: { score: 50, evidence: "分析待ち...", label: "協調性" },
    conscientiousness: { score: 50, evidence: "分析待ち...", label: "誠実性" },
    neuroticism: { score: 50, evidence: "分析待ち...", label: "情緒安定性" },
    openness: { score: 50, evidence: "分析待ち...", label: "開放性" },
  },
  motivation: {
    achievement: { score: 50, evidence: "分析待ち...", label: "達成・成長" },
    affiliation: { score: 50, evidence: "分析待ち...", label: "親和・つながり" },
    security: { score: 50, evidence: "分析待ち...", label: "安定・安全" },
    change: { score: 50, evidence: "分析待ち...", label: "変化・探求" },
  },
  summary: "データ収集中です。チャット、画像、声、箱庭ゲームを通じてあなたを分析し、守護アーキタイプを見つけ出します。",
  suggestedActions: ["まずはチャットで今の気分を話してみましょう。", "箱庭ゲームで理想の世界を作ってみましょう。"]
};