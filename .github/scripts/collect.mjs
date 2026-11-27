// Hintergrund-Sammler für Fib Chart (läuft per GitHub Actions alle 15 Minuten).
// 1) Wal-Trades: große Market-Orders auf Binance Spot (öffentliche aggTrades, kein Key nötig)
// 2) Wirtschaftskalender: wichtige US-Termine dieser Woche (High Impact)
// Ergebnis: whales.json, calendar.json, state.json im Ordner, der in den Branch "data" geschrieben wird.
import fs from 'node:fs';
const OUT = process.argv[2] || 'out';
fs.mkdirSync(OUT, { recursive: true });
const rd = (f, d) => { try { return JSON.parse(fs.readFileSync(`${OUT}/${f}`, 'utf8')); } catch { return d; } };
const wr = (f, o) => fs.writeFileSync(`${OUT}/${f}`, JSON.stringify(o));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const HOSTS = ['https://data-api.binance.vision', 'https://api.binance.com', 'https://api1.binance.com'];
// Ab welchem Gegenwert (USD) ein Trade gespeichert wird
const PAIRS = { BTCUSDT: 1e6, ETHUSDT: 1e6, SOLUSDT: 5e5 };
const KEEP_DAYS = 30, MAX_PER = 4000, MAX_PAGES = 400;

async function get(path) {
  let last;
  for (const h of HOSTS) {
    try {
      const r = await fetch(h + path, { headers: { 'User-Agent': 'fib-chart-collector' } });
      if (r.ok) return await r.json();
      last = new Error(`${h} HTTP ${r.status}`);
    } catch (e) { last = e; }
  }
  throw last;
}

const state = rd('state.json', { lastId: {}, calAt: 0 });
const whales = rd('whales.json', { updatedAt: 0, data: {} });
const now = Date.now();
let added = 0;

for (const [sym, min] of Object.entries(PAIRS)) {
  const base = sym.replace('USDT', '');
  const list = whales.data[base] || (whales.data[base] = []);
  try {
    let fromId = state.lastId[sym];
    let page = 0, done = false;
    if (fromId == null) {
      // Erster Lauf: die letzten 15 Minuten
      const a = await get(`/api/v3/aggTrades?symbol=${sym}&startTime=${now - 15 * 60e3}&limit=1`);
      fromId = a.length ? a[0].a : null;
      if (fromId == null) continue;
    } else fromId += 1;
    // Eine Market-Order, die mehrere Preisstufen durchläuft, kommt als mehrere aggTrades mit gleicher Zeit und Seite –
    // die fassen wir wieder zu einer Order zusammen.
    let g = null;
    const flush = () => { if (g && g.usd >= min) { list.push({ t: Math.round(g.T / 1000), p: +(g.usd / g.q).toFixed(2), q: +g.q.toFixed(4), usd: Math.round(g.usd), side: g.m ? 'sell' : 'buy' }); added++; } g = null; };
    while (!done && page < MAX_PAGES) {
      const a = await get(`/api/v3/aggTrades?symbol=${sym}&fromId=${fromId}&limit=1000`);
      page++;
      for (const t of a) {
        const p = +t.p, q = +t.q;
        if (g && (g.T !== t.T || g.m !== t.m)) flush();
        if (!g) g = { T: t.T, m: t.m, q: 0, usd: 0 };
        g.q += q; g.usd += p * q;
        state.lastId[sym] = t.a;
      }
      if (a.length < 1000) done = true; else fromId = a[a.length - 1].a + 1;
      await sleep(120);
    }
    flush();
    console.log(`${sym}: ${page} Seiten gelesen, Stand ${state.lastId[sym]}`);
  } catch (e) { console.log(`${sym}: Fehler ${e.message}`); }
  const cut = now / 1000 - KEEP_DAYS * 86400;
  whales.data[base] = list.filter(x => x.t >= cut).sort((x, y) => x.t - y.t).slice(-MAX_PER);
}
whales.updatedAt = Math.round(now / 1000);
wr('whales.json', whales);
console.log(`Neue Wal-Trades: ${added}`);

// Wirtschaftskalender (alle 6 Stunden reicht)
if (now - (state.calAt || 0) > 6 * 3600e3) {
  try {
    const r = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', { headers: { 'User-Agent': 'fib-chart-collector' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    let a = await r.json();
    // nächste Woche, falls angeboten
    try { const r2 = await fetch('https://nfs.faireconomy.media/ff_calendar_nextweek.json', { headers: { 'User-Agent': 'fib-chart-collector' } }); if (r2.ok) a = a.concat(await r2.json()); } catch {}
    const ev = a.filter(e => e.country === 'USD' && e.impact === 'High')
      .map(e => ({ t: Math.round(Date.parse(e.date) / 1000), n: e.title, f: e.forecast || '', pv: e.previous || '' }))
      .filter(e => isFinite(e.t));
    const old = rd('calendar.json', { data: [] }).data.filter(e => e.t > now / 1000 - 14 * 86400);
    const seen = new Set(ev.map(e => e.t + e.n));
    wr('calendar.json', { updatedAt: Math.round(now / 1000), data: [...old.filter(e => !seen.has(e.t + e.n)), ...ev].sort((x, y) => x.t - y.t) });
    state.calAt = now;
    console.log(`Kalender: ${ev.length} wichtige US-Termine`);
  } catch (e) { console.log('Kalender: Fehler ' + e.message); }
}
wr('state.json', state);
