// Deploys as /api/lead on Vercel. This is a placeholder right now, it just
// confirms it received the submission. Step 4 in the guide replaces the
// inside of this function with a real write to a Google Sheet.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email, answers, bucket } = req.body || {};
  if (!email) {
    res.status(400).json({ error: 'Missing email' });
    return;
  }

  // TODO: replace this console.log with a real write, see the guide, Phase 3a.
  console.log('New lead:', { email, bucket, answers, at: new Date().toISOString() });

  res.status(200).json({ ok: true });
}
