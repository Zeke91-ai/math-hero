// Uji ketukan di Balap Hitung MH2 (layar 393x851):  node tests/mh2_balap_tap.js
// Laporan penguji: memilih "=" pada soal "36 ? 36" malah dianggap salah. Penyebab: ketukan di layar hanya menggeser lajur
// kiri/kanan menurut separuh layar, jadi mengetuk papan jawaban yang di tengah bisa memindahkan kart ke lajur sebelah.
// Sekarang mengetuk papan jawaban = pindah ke lajur papan itu.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'public');
const srv = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json' }[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});
const ok = (c, m) => { if (!c) { console.error('GAGAL: ' + m); process.exitCode = 1; } else console.log('ok: ' + m); };
(async () => {
  await new Promise((r) => srv.listen(0, r));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 393, height: 851 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto(`http://localhost:${srv.address().port}/mh2/?level=${process.env.LEVEL || '2-5'}`);
  await pg.waitForFunction(() => window.MH2 && MH2.playState && MH2.playState(), null, { timeout: 20000 });
  for (let i = 0; i < 20; i++) { await pg.waitForTimeout(300); if (await pg.evaluate(() => MH2.playState().state) === 'play') break; await pg.keyboard.press('Enter'); }
  ok(await pg.evaluate(() => MH2.playState().state) === 'play', 'level balap mulai');
  const cases = [];
  for (let trial = 0; trial < 30; trial++) {
    // Letakkan kart di lajur acak, jarak ke gerbang 450, lalu ketuk papan jawaban di lajur tertentu.
    const r = await pg.evaluate(({ startLane, want }) => {
      const S = MH2.playState(), R = S.inst.R, M = MH2, gt = R.gates.find((g) => !g.done);
      R.lane = startLane; R.laneX = startLane; R.pos = gt.z - 450; R.speed = 0;
      const d = gt.z - R.pos, p = 160 / Math.max(160, d), hor = Math.round(M.VH * 0.36), bot = M.VH - 150;
      const y = hor + p * (bot - hor), cx = M.VW / 2 + R.curve * Math.pow(1 - p, 2) * 120 - R.laneX * 110 * p;
      return { x: cx + want * 100 * p, y: y - 54 * p / 2 - 46 * p, answerLane: gt.q.choices.indexOf(gt.q.answer) - 1, label: gt.q.label, choices: gt.q.choices };
    }, { startLane: trial % 3 - 1, want: Math.floor(trial / 3) % 3 - 1 });
    const want = Math.floor(trial / 3) % 3 - 1;
    const s = await pg.evaluate(() => MH2.scale);
    await pg.touchscreen.tap(r.x * s, r.y * s);
    await pg.waitForTimeout(40);
    const lane = await pg.evaluate(() => MH2.playState().inst.R.lane);
    cases.push(lane === want);
    if (lane !== want) console.error('  ketuk papan', want, 'tapi lajur', lane, JSON.stringify(r));
  }
  ok(cases.every(Boolean), `mengetuk papan jawaban memindahkan kart ke lajur papan itu (${cases.filter(Boolean).length}/${cases.length})`);
  ok(errs.length === 0, 'tanpa galat JS ' + errs.join('|'));
  await b.close(); srv.close();
})();
