export interface GenerationCandidate {
  source: string; // 'OpenAI GPT-4' | 'Google Gemini' | 'xAI Grok'
  content: string;
}

export interface GenerationMetadata {
  prompt: string;
  platform: string;
  inspiration_content: string;
  models_used: string[];
  candidates: GenerationCandidate[];
  winner: {
    source: string;
    content: string;
    reason: string;
  };
  judge: {
    model: string;
    prompt: string;
  };
  generated_at: string;
}

export interface LLMCouncilResponse {
  content: string;
  source: string;
  reason?: string;
  candidates: GenerationCandidate[];
  prompt: string;
  judge_prompt: string;
  models_used: string[];
}
