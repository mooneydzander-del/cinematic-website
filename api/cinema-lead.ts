import type { VercelRequest, VercelResponse } from '@vercel/node';

// Deduplicate rapid duplicate POSTs (multiple JS handlers firing on the same submit)
const seen = new Map<string, number>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body ?? {};

  const dedupeKey = `${String(body.email ?? '')}|${String(body.submitted_at ?? body.submission_time ?? '')}`;
  const now = Date.now();
  if (seen.has(dedupeKey) && now - (seen.get(dedupeKey) as number) < 6000) {
    return res.status(200).json({ success: true });
  }
  seen.set(dedupeKey, now);
  if (seen.size > 500) seen.delete([...seen.keys()][0]);

  return res.status(200).json({ success: true });
}
