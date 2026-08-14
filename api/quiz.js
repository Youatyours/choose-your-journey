// Deploys as /api/quiz on Vercel. The Anthropic API key lives here, server-side,
// in an environment variable. It is never exposed to the browser.

const VOICE_GUIDE = `Brand voice for You at Yours, a London boudoir and body confidence photography brand run by a photographer named Merv.

Tone: grounded, cheeky, direct. Second person, plain verbs, short sentences. No hedging, no jargon. Warm humour that disarms, never solemn.

Words to reach for when natural: return, reclaim, remember, witness, softness, presence, truth, belonging, ease, becoming.

Words to never use: sexy, goddess, boss, glow-up, fearless, empowered, flawless, journey.

Formatting rule: never use an em dash character in the output. Use a comma, a period, or a colon instead.

Content rule: sessions are one on one between the client and Merv. Never suggest or imply bringing a friend, partner, or anyone else along to the session.

Emotional rule, this is the most important one: always speak to a person's truth, never to their pain. Do not frame anything around what someone has been missing, carrying, avoiding, or what it has cost them to wait. That framing centres deficit and makes someone the subject of pity. Instead, speak to what is already true about them right now, and treat the session as simply witnessing that truth, not fixing or healing something broken. If in doubt, write the sentence as if speaking to someone who is already whole and simply ready to be seen, not someone who has been suffering.`;

function buildHistoryText(history) {
  return history.map((h, i) => `${i + 1}. Q: "${h.question}"  A: "${h.answer}"`).join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { action, history } = req.body || {};
  if (!action || !Array.isArray(history)) {
    res.status(400).json({ error: 'Missing action or history' });
    return;
  }

  let prompt;
  const historyText = buildHistoryText(history);

  if (action === 'next_question') {
    prompt = `${VOICE_GUIDE}

You are writing ONE quiz question, live, for a visitor partway through the Choose Your Journey quiz. Here is everything they have answered so far, in order:

${historyText}

Write a short, specific next question (max 14 words) that genuinely builds on their answers so far, going one layer deeper or somewhere new, never repeating ground already covered. Then write exactly 4 short closed choice options (max 8 words each). No open text.

Respond ONLY with valid JSON, no markdown fences, no preamble, in exactly this shape:
{"question": "...", "options": ["...", "...", "...", "..."]}`;
  } else if (action === 'reflection') {
    prompt = `${VOICE_GUIDE}

A visitor just finished the Choose Your Journey quiz. Here is their full path, in order:

${historyText}

Write exactly THREE sentences, max 65 words total, second person, that shows genuine understanding built from their whole path, not just the last answer. Remember the emotional rule above: speak to their truth, not their pain. The first sentence should name something true about them, not something they lack. The second should affirm that truth further. The third should gently open a door toward the session itself as a place that truth gets witnessed, without selling anything. No exclamation points. No sales language, no mention of booking or pricing. Plain text only, no markdown, no quotes.`;
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
