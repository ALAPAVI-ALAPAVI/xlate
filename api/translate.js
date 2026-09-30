// Vercel serverless function: free translation via MyMemory (no key needed).
// MyMemory accepts ~500 bytes per request, so long text is split into small
// pieces, translated in parallel, and stitched back together (no length cap).
// Optional env var MYMEMORY_EMAIL raises MyMemory's free daily quota.
const LANGS = {english:'en',spanish:'es',french:'fr',german:'de',italian:'it',portuguese:'pt',dutch:'nl',russian:'ru',chinese:'zh-CN',japanese:'ja',korean:'ko',arabic:'ar',hindi:'hi',turkish:'tr',polish:'pl',swedish:'sv',greek:'el',hebrew:'he',vietnamese:'vi',thai:'th',indonesian:'id',ukrainian:'uk',czech:'cs',romanian:'ro',hungarian:'hu',finnish:'fi',danish:'da',norwegian:'no',catalan:'ca',tagalog:'tl'};
const LIMIT = 30, WINDOW = 60000, PAR = 4;
const hits = new Map(); // best-effort per-instance rate limit

function resolve(v) {
  const n = String(v || '').toLowerCase().replace(/\(.*?\)/g, '').trim();
  if (n === 'auto' || n === 'auto-detect') return 'Autodetect';
  if (LANGS[n]) return LANGS[n];
  if (/^[a-z]{2}(-[a-z]{2})?$/i.test(n)) return n;
  return null;
}
const decode = t => t.replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c)).replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function chunks(line) {
  const lim = Buffer.byteLength(line) > line.length ? 140 : 400; // stay under 500 bytes
  if (line.length <= lim) return [line];
  const parts = line.match(/[^.!?。！？]+[.!?。！？]*\s*/g) || [line];
  const out = []; let cur = '';
  for (let p of parts) {
    while (p.length > lim) {
      let cut = p.lastIndexOf(' ', lim); if (cut < 20) cut = lim;
      if (cur) { out.push(cur); cur = ''; }
      out.push(p.slice(0, cut)); p = p.slice(cut);
    }
    if ((cur + p).length > lim) { if (cur) out.push(cur); cur = p; } else cur += p;
  }
  if (cur) out.push(cur);
  return out;
}
async function pool(items, n, fn) {
  const res = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; res[k] = await fn(items[k]); }
  }));
  return res;
}
async function mm(q, src, tgt) {
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', q);
  url.searchParams.set('langpair', `${src}|${tgt}`);
  if (process.env.MYMEMORY_EMAIL) url.searchParams.set('de', process.env.MYMEMORY_EMAIL);
  const j = await (await fetch(url)).json();
  const t = j?.responseData?.translatedText || '';
  if (/MYMEMORY WARNING/i.test(t)) throw Object.assign(new Error('daily free limit reached, try again tomorrow'), { status: 429 });
  if (Number(j.responseStatus) !== 200 || !t) throw Object.assign(new Error(j.responseDetails || 'translation failed'), { status: 502 });
  return { text: decode(t), detected: j.responseData.detectedLanguage };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || 'x', now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW);
  if (recent.length >= LIMIT) return res.status(429).json({ error: 'too many requests, wait a minute' });
  recent.push(now); hits.set(ip, recent);

  const { text, from, to } = req.body || {};
  if (typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: 'empty text' });
  const src = resolve(from), tgt = resolve(to);
  if (!src || !tgt || tgt === 'Autodetect') return res.status(400).json({ error: 'unknown language' });

  try {
    const lines = text.split('\n'), tasks = [];
    lines.forEach((l, li) => { if (l.trim()) chunks(l).forEach(c => tasks.push({ li, c })); });
    const results = await pool(tasks, PAR, t => mm(t.c, src, tgt));
    const outLines = lines.map(() => []);
    results.forEach((r, k) => outLines[tasks[k].li].push(r.text.trim()));
    const detected = src === 'Autodetect' ? results[0]?.detected : undefined;
    res.status(200).json({ text: lines.map((l, i) => l.trim() ? outLines[i].join(' ') : l).join('\n'), detected });
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message || 'translation service unavailable' });
  }
}
