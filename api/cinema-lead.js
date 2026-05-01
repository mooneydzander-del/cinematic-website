module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookUrl = process.env.N8N_CINEMA_LEAD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('N8N_CINEMA_LEAD_WEBHOOK_URL is not set');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const body = req.body || {};

  const str = (v) => String(v || '').trim();

  const payload = {
    full_name:         str(body.full_name),
    email:             str(body.email),
    phone:             str(body.phone),
    business_name:     str(body.business_name),
    website_url:       str(body.website_url),
    industry:          str(body.industry),
    offer:             str(body.offer),
    traffic_source:    str(body.traffic_source),
    running_ads:       str(body.running_ads),
    landing_page_goal: str(body.landing_page_goal),
    budget:            str(body.budget),
    timeline:          str(body.timeline),
    message:           str(body.message),
    source_page:       str(body.source_page),
    submission_time:   str(body.submission_time) || new Date().toISOString(),
  };

  try {
    const response = await fetch(webhookUrl, {
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
    console.error('cinema-lead fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
