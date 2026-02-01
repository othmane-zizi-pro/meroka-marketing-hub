// LLM Council Lambda
// Generates posts using multiple LLMs and picks the best one

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROK_API_KEY = process.env.GROK_API_KEY;

export const handler = async (event) => {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event;
    const { inspiration, platform, fewShotExamples = [] } = body;

    if (!inspiration) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'inspiration is required' }),
      };
    }

    const platformName = platform === 'linkedin' ? 'LinkedIn' : 'X/Twitter';
    const charLimit = platform === 'linkedin' ? '200-600 characters' : 'under 280 characters';

    // Build few-shot examples section if available
    let fewShotSection = '';
    if (fewShotExamples && fewShotExamples.length > 0) {
      fewShotSection = `
Here are examples of our published posts that performed well. Study what makes them resonate—the directness, the specificity, the irreverent edge:

${fewShotExamples.map((ex, i) => `--- EXAMPLE POST ${i + 1} ---
${ex.content}
`).join('\n')}
`;
    }

    // Company context for mission-aligned content
    const companyContext = `
## MEROKA'S MISSION
"Saving independence in medicine" - We're building a collective of independent physician practice owners to fight back against consolidation by private equity, health systems, and insurance companies.

## VOICE & TONE
- IRREVERENT, not corporate. Think Dr. Glaucomflecken, not McKinsey.
- Direct and punchy. Call out the villains by name: PE vultures, insurance bureaucracy, admin bloat.
- Use "hot takes," "unpopular opinions," contrarian framing.
- Specific over vague: real numbers, concrete examples, not platitudes.
- Authentic emotion: frustration, determination, dark humor about the absurdity.
- Balance idealism with pragmatism: "That's not idealism—that's strategy."

## HERO/VILLAIN FRAMING
- HEROES: Independent physicians, care teams, front-line clinicians fighting the good fight
- VILLAINS: The System—PE consolidation, prior auth nightmares, insurance denials, admin bloat, 7-minute corporate visits

## TOPICS THAT RESONATE
- Prior authorization absurdity
- Insurance denials and appeals
- EMR/charting burden (Epic, note bloat)
- Private equity destroying practices
- Physician burnout and moral injury
- The myth that you "can't compete" alone
- Succession challenges for retiring docs
- Collective power without losing control
`;

    const prompt = `You are writing social media content for Meroka, a healthcare company on a mission to save independent medicine from consolidation.

${companyContext}
${fewShotSection}
---

Create a new ${platformName} post inspired by the content below.

The post MUST:
- Be IRREVERENT and PUNCHY, not corporate or sanitized
- Take a clear stance—we're pro-independence, anti-consolidation
- ${platform === 'linkedin' ? 'Be thought-provoking, maybe start with a hot take or contrarian observation' : 'Be sharp and quotable, the kind of thing physicians screenshot and share'}
- Use specific details when possible, not vague inspiration-speak
- Be ${charLimit}
- Sound like a real person who's lived this, not a marketing department
- NO hashtags, NO emojis unless absolutely natural

Inspiration content:
"${inspiration}"

Generate ONLY the post. No explanations, no quotes around it, no meta-commentary.`;

    console.log('Generating posts from council...');

    const modelsUsed = ['GPT-5.2', 'Gemini 3 Pro', 'Grok 4.1 Fast'];

    // Call all 3 LLMs in parallel
    const [openaiResult, geminiResult, grokResult] = await Promise.allSettled([
      callOpenAI(prompt),
      callGemini(prompt),
      callGrok(prompt),
    ]);

    const candidates = [];

    if (openaiResult.status === 'fulfilled' && openaiResult.value) {
      candidates.push({ source: 'OpenAI GPT-4', content: openaiResult.value });
    } else {
      console.error('OpenAI failed:', openaiResult.reason);
    }

    if (geminiResult.status === 'fulfilled' && geminiResult.value) {
      candidates.push({ source: 'Google Gemini', content: geminiResult.value });
    } else {
      console.error('Gemini failed:', geminiResult.reason);
    }

    if (grokResult.status === 'fulfilled' && grokResult.value) {
      candidates.push({ source: 'xAI Grok', content: grokResult.value });
    } else {
      console.error('Grok failed:', grokResult.reason);
    }

    if (candidates.length === 0) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'All LLMs failed to generate content' }),
      };
    }

    // If only one candidate, return it
    if (candidates.length === 1) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          content: candidates[0].content,
          source: candidates[0].source,
          reason: 'Only one model succeeded',
          candidates: candidates,
          prompt: prompt,
          judge_prompt: null,
          models_used: modelsUsed,
        }),
      };
    }

    // Have the judge pick the best one
    console.log(`Judging ${candidates.length} candidates...`);
    const { winner, judgePrompt } = await judgeContent(candidates, platform);

    return {
      statusCode: 200,
      body: JSON.stringify({
        content: winner.content,
        source: winner.source,
        reason: winner.reason,
        candidates: candidates,
        prompt: prompt,
        judge_prompt: judgePrompt,
        models_used: modelsUsed,
      }),
    };
  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

async function callOpenAI(prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-5.2',
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 500,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`OpenAI API error ${response.status}:`, errorBody);
    throw new Error(`OpenAI API error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim();
}

async function callGemini(prompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 8000,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Gemini API error ${response.status}:`, errorBody);
    throw new Error(`Gemini API error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    console.error('Gemini returned empty response:', JSON.stringify(data));
    throw new Error(`Gemini returned no content (finishReason: ${data.candidates?.[0]?.finishReason})`);
  }
  return text;
}

async function callGrok(prompt) {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-4-1-fast-reasoning',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Grok API error ${response.status}:`, errorBody);
    throw new Error(`Grok API error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim();
}

async function judgeContent(candidates, platform) {
  const platformName = platform === 'linkedin' ? 'LinkedIn' : 'X/Twitter';

  const judgePrompt = `You are judging ${platformName} posts for Meroka, a healthcare company fighting to save independent medicine from PE consolidation.

Pick the BEST post from these ${candidates.length} candidates.

Prioritize (in order):
1. IRREVERENCE & PUNCH - Does it have edge? Would a burned-out physician share this?
2. SPECIFICITY - Concrete details beat vague platitudes
3. MISSION ALIGNMENT - Pro-independence, anti-consolidation stance clear?
4. SHAREABILITY - Would physicians screenshot this and send to colleagues?
5. AUTHENTICITY - Sounds like a real person, not a marketing department

AVOID posts that:
- Sound corporate or sanitized
- Use empty inspiration-speak
- Are too safe or hedged
- Could have been written by any healthcare company

${candidates.map((c, i) => `--- CANDIDATE ${i + 1} (${c.source}) ---
${c.content}
`).join('\n')}

Respond in this exact JSON format:
{"winner": <number 1-${candidates.length}>, "reason": "<brief explanation>"}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-5.2',
      messages: [{ role: 'user', content: judgePrompt }],
      max_completion_tokens: 200,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    // If judge fails, return first candidate
    console.error('Judge failed, returning first candidate');
    return {
      winner: { ...candidates[0], reason: 'Judge unavailable' },
      judgePrompt: judgePrompt,
    };
  }

  const data = await response.json();
  const judgeResponse = data.choices[0]?.message?.content?.trim();

  try {
    // Extract JSON from response
    const jsonMatch = judgeResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const winnerIndex = parsed.winner - 1;
      if (winnerIndex >= 0 && winnerIndex < candidates.length) {
        return {
          winner: {
            ...candidates[winnerIndex],
            reason: parsed.reason,
          },
          judgePrompt: judgePrompt,
        };
      }
    }
  } catch (e) {
    console.error('Failed to parse judge response:', judgeResponse);
  }

  // Default to first candidate
  return {
    winner: { ...candidates[0], reason: 'Judge parse error' },
    judgePrompt: judgePrompt,
  };
}
