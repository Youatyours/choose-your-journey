// Deploys as /api/quiz on Vercel. The Anthropic API key lives here, server-side,
// in an environment variable. It is never exposed to the browser.

const VOICE_GUIDE = `Brand voice for You at Yours, a London boudoir and body confidence photography brand run by a photographer named Merv.

Tone: grounded, cheeky, direct. Second person, plain verbs, short sentences. No hedging, no jargon. Warm humour that disarms, never solemn.

Words to reach for when natural: return, reclaim, remember, witness, softness, presence, truth, belonging, ease, becoming.

Words to never use: sexy, goddess, boss, glow-up, fearless, empowered, flawless, journey.

Formatting rule: never use an em dash character in the output. Use a comma, a period, or a colon instead.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { action, answers } = req.body || {};
  if (!action || !answers) {
    res.status(400).json({ error: 'Missing action or answers' });
    return;
  }

  let prompt;

  if (action === 'dynamic_question') {
    prompt = `${VOICE_GUIDE}

You are writing ONE quiz question, live, for a visitor partway through the Choose Your Journey quiz.

They've answered so far:
- Why they're here: "${answers.motive}"
- How they describe themselves: "${answers.body}"
- What's held them back: "${answers.block}"

Write a short, specific follow up question (max 14 words) that genuinely builds on their last answer, not a generic one. Then write exactly 4 short closed choice options (max 8 words each). No open text.

Respond ONLY with valid JSON, no markdown fences, no preamble, in exactly this shape:
{"question": "...", "options": ["...", "...", "...", "..."]}`;
  } else if (action === 'reflection') {
    prompt = `${VOICE_GUIDE}

A visitor just finished the Choose Your Journey quiz. Their answers:
- Why they're here: "${answers.motive}"
- How they describe themselves: "${answers.body}"
- What's held them back: "${answers.block}"
- Their personalised answer: "${answers.dynamic}"
- What would feel like ease at the end: "${answers.win}"

Write exactly ONE sentence, max 20 words, second person, that shows we understood their specific answers, not generic encouragement. No exclamation points. No sales language, no mention of booking or pricing. Plain text only, no markdown, no quotes.`;
  } else {
    res.status(400).json({ error: 'Unknown action' });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY. Add it in Vercel, Settings, Environment Variables.' });
    return;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(502).json({ error: 'Anthropic API error', detail: errText });
      return;
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === 'text');
    const text = textBlock ? textBlock.text.trim() : '';
    res.status(200).json({ text });
  } catch (err) {
    res.status(500).json({ error: 'Generation failed', detail: String(err) });
  }
}
