const seen = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body ?? {};

  const dedupeKey = `${String(body.email ?? '')}|${String(body.submitted_at ?? body.submission_time ?? '')}`;
  const now = Date.now();
  if (seen.has(dedupeKey) && now - seen.get(dedupeKey) < 6000) {
    return res.status(200).json({ success: true });
  }
  seen.set(dedupeKey, now);
  if (seen.size > 500) seen.delete([...seen.keys()][0]);

  return res.status(200).json({ success: true });
}
