const N8N_WEBHOOK = 'https://n8n.srv1295800.hstgr.cloud/webhook/website-lead';

const seen = new Map();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};

  const dedupeKey = (body.email || '') + '|' + (body.submission_time || '');
  const now = Date.now();
  if (seen.has(dedupeKey) && now - seen.get(dedupeKey) < 6000) {
    return res.status(200).json({ success: true });
  }
  seen.set(dedupeKey, now);
  if (seen.size > 500) seen.delete([...seen.keys()][0]);

  function str(v) { return String(v || '').trim(); }
  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(v)); }
  function isPhone(v) { return /^[\d\s\-+()]{7,}$/.test(str(v)); }

  var payload = {
    full_name:         str(body.full_name         || body.name),
    email:             str(body.email             || (isEmail(body.contact) ? body.contact : '')),
    phone:             str(body.phone             || (isPhone(body.contact) ? body.contact : '')),
    business_name:     str(body.business_name     || body.business || body.businessName),
    website_url:       str(body.website_url       || body.website),
    industry:          str(body.industry),
    offer:             str(body.offer),
    traffic_source:    str(body.traffic_source    || body.trafficSource),
    running_ads:       str(body.running_ads       || body.runningAds),
    landing_page_goal: str(body.landing_page_goal || body.goal),
    budget:            str(body.budget),
    timeline:          str(body.timeline),
    message:           str(body.message           || body.notes),
    source_page:       str(body.source_page       || body.source),
    submission_time:   str(body.submission_time   || body.submittedAt) || new Date().toISOString(),
  };

  try {
    var response = await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('n8n webhook returned', response.status);
      return res.status(502).json({ error: 'Upstream error' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('cinema-lead error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
