import type { VercelRequest, VercelResponse } from '@vercel/node';

const N8N_WEBHOOK = 'https://n8n.srv1295800.hstgr.cloud/webhook/website-lead';

// Deduplicate rapid duplicate POSTs (multiple JS handlers firing on the same submit)
const seen = new Map<string, number>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body ?? {};

  const dedupeKey = `${String(body.email ?? '')}|${String(body.submission_time ?? '')}`;
  const now = Date.now();
  if (seen.has(dedupeKey) && now - (seen.get(dedupeKey) as number) < 6000) {
    return res.status(200).json({ success: true });
  }
  seen.set(dedupeKey, now);
  if (seen.size > 500) seen.delete([...seen.keys()][0]);

  const payload = {
    full_name:         String(body.full_name         || body.name     || '').trim(),
    email:             String(body.email             || (isEmail(body.contact) ? body.contact : '') || '').trim(),
    phone:             String(body.phone             || (isPhone(body.contact) ? body.contact : '') || '').trim(),
    business_name:     String(body.business_name     || body.business || '').trim(),
    website_url:       String(body.website_url       || '').trim(),
    industry:          String(body.industry          || '').trim(),
    offer:             String(body.offer             || '').trim(),
    traffic_source:    String(body.traffic_source    || '').trim(),
    running_ads:       String(body.running_ads       || body.goal     || '').trim(),
    landing_page_goal: String(body.landing_page_goal || '').trim(),
    budget:            String(body.budget            || '').trim(),
    timeline:          String(body.timeline          || '').trim(),
    message:           String(body.message           || body.notes    || '').trim(),
    source_page:       String(body.source_page       || '').trim(),
    submission_time:   String(body.submission_time   || new Date().toISOString()).trim(),
  };

  try {
    const response = await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let data: unknown = {};
    try { data = await response.json(); } catch { /* non-JSON response */ }

    if (!response.ok) {
      console.error('n8n webhook returned', response.status, data);
      return res.status(502).json({ error: 'Upstream error' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('cinema-lead fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function isEmail(value: unknown): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '').trim());
}

function isPhone(value: unknown): boolean {
  return /^[\d\s\-+()]{7,}$/.test(String(value ?? '').trim());
}
