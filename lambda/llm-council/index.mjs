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
    const charLimit = platform === 'linkedin' ? '100-500 characters' : 'under 280 characters';

    // Build few-shot examples section if available
    let fewShotSection = '';
    if (fewShotExamples && fewShotExamples.length > 0) {
      fewShotSection = `
Here are examples of our top-performing posts that received the most engagement. Use these as inspiration for tone, style, and what resonates with our audience:

${fewShotExamples.map((ex, i) => `--- TOP POST ${i + 1} (${ex.likes_count} likes) ---
${ex.content}
`).join('\n')}
Study what makes these posts successful and incorporate similar qualities into your new post.

`;
    }

    const prompt = `Create a new ${platformName} post inspired by the following content.
${fewShotSection}
The new post should:
- Cover a similar topic or theme but with a fresh, unique perspective
- Match the tone appropriate for ${platformName} (${platform === 'linkedin' ? 'professional, insightful, thought-provoking' : 'concise, engaging, punchy'})
- Be completely original, not a rephrasing of the inspiration
- Be ${charLimit}
- Be ready to post as-is (no hashtags unless natural, no emojis unless fitting)

Inspiration content:
"${inspiration}"

Generate ONLY the post content. No explanations, no quotes around it, no meta-commentary.`;

    console.log('Generating posts from council...');

    const modelsUsed = ['GPT-4o', 'Gemini 1.5 Flash', 'Grok 2'];

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
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim();
}

async function callGemini(prompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 500,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
}

async function callGrok(prompt) {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-2-latest',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    throw new Error(`Grok API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim();
}

async function judgeContent(candidates, platform) {
  const platformName = platform === 'linkedin' ? 'LinkedIn' : 'X/Twitter';

  const judgePrompt = `You are a social media expert judging ${platformName} posts for maximum impact.

Evaluate these ${candidates.length} candidate posts and pick the BEST one.

Consider:
- Engagement potential (will people like, comment, share?)
- Authenticity and originality
- Appropriate tone for ${platformName}
- Clarity and punch
- Professional quality

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
      model: 'gpt-4o',
      messages: [{ role: 'user', content: judgePrompt }],
      max_tokens: 200,
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
