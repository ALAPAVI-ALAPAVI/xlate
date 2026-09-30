// Vercel serverless function: free translation via the MyMemory API (no key needed).
// Optional env var MYMEMORY_EMAIL raises MyMemory's free daily limit.
const LANGS = {english:'en',spanish:'es',french:'fr',german:'de',italian:'it',portuguese:'pt',dutch:'nl',russian:'ru',chinese:'zh-CN',japanese:'ja',korean:'ko',arabic:'ar',hindi:'hi',turkish:'tr',polish:'pl',swedish:'sv',greek:'el',hebrew:'he',vietnamese:'vi',thai:'th',indonesian:'id',ukrainian:'uk',czech:'cs',romanian:'ro',hungarian:'hu',finnish:'fi',danish:'da',norwegian:'no',catalan:'ca',tagalog:'tl'};
const MAX = 450, LIMIT = 30, WINDOW = 60000;
const hits = new Map(); // best-effort per-instance rate limit

function resolve(v) {
  const n = String(v || '').toLowerCase().replace(/\(.*?\)/g, '').trim();
  if (n === 'auto' || n === 'auto-detect') return 'Autodetect';
  if (LANGS[n]) return LANGS[n];
  if (/^[a-z]{2}(-[a-z]{2})?$/i.test(n)) return n;
  return null;
}
const decode = t => t.replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c)).replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || 'x', now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW);
  if (recent.length >= LIMIT) return res.status(429).json({ error: 'too many requests, wait a minute' });
  recent.push(now); hits.set(ip, recent);

  const { text, from, to } = req.body || {};
  if (typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: 'empty text' });
  if (text.length > MAX) return res.status(400).json({ error: `text too long (max ${MAX} characters)` });
  const src = resolve(from), tgt = resolve(to);
  if (!src || !tgt || tgt === 'Autodetect') return res.status(400).json({ error: 'unknown language. try /help' });

  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', `${src}|${tgt}`);
  if (process.env.MYMEMORY_EMAIL) url.searchParams.set('de', process.env.MYMEMORY_EMAIL);
  try {
    const r = await fetch(url);
    const j = await r.json();
    const out = j?.responseData?.translatedText || '';
    if (/MYMEMORY WARNING/i.test(out)) return res.status(429).json({ error: 'daily free limit reached, try again tomorrow' });
    if (Number(j.responseStatus) !== 200 || !out) return res.status(502).json({ error: j.responseDetails || 'translation failed' });
    res.status(200).json({ text: decode(out), detected: src === 'Autodetect' ? j.responseData.detectedLanguage : undefined });
  } catch (e) {
    res.status(502).json({ error: 'translation service unavailable' });
  }
}
