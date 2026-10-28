// Uji asap Kejar tanpa batas di layar sentuh 393x851:  node tests/mh3_endless_ui.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'public');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});
const ok = (c, m) => { if (!c) { console.error('GAGAL: ' + m); process.exitCode = 1; } else console.log('ok: ' + m); };
(async () => {
  await new Promise((r) => srv.listen(0, r));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 393, height: 851 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && !/ERR_|Failed to load resource/.test(m.text()) && errs.push(m.text()));
  await pg.goto(`http://localhost:${srv.address().port}/mh3/index.html`);
  await pg.waitForFunction(() => window.MH2 && MH2.sceneName === 'title', null, { timeout: 20000 });
  await pg.evaluate(() => {
    window.__sent = [];
    window.Scores.submit = (...a) => { window.__sent.push(a); return Promise.resolve(true); };
    MH2.save.create(0, 'UJI'); MH2.go('map', {});
  });
  await pg.waitForTimeout(500);
  const s = await pg.evaluate(() => MH2.scale);
  const tap = async (x, y) => { await pg.touchscreen.tap(x * s, y * s); await pg.waitForTimeout(400); };
  const st = () => pg.evaluate(() => { const S = MH3.plat.state(); return { scene: MH2.sceneName, state: S && S.state, round: S && S.endless && S.endless.round, hearts: S && S.g.hearts, total: S && S.endless && S.endless.total, phase: S && S.g.phase }; });
  await tap(8 + 75, 84 + 18);                       // tombol "Kejar Tanpa Batas"
  let a = await st();
  ok(a.scene === 'plat' && a.round === 1 && a.hearts === 5, 'tombol peta membuka putaran 1 dengan 5 hati');
  // Menang: taruh hero di pintu tujuan.
  await pg.evaluate(() => { const g = MH3.plat.state().g; g.p.x = g.L.goal.x; g.p.y = g.L.goal.y; });
  await pg.waitForTimeout(500);
  a = await st();
  ok(a.state === 'end' && a.total > 0, 'sampai tujuan: layar akhir putaran, skor ' + a.total);
  const VH = await pg.evaluate(() => MH2.VH), py = VH * 0.2;
  await tap(30 + 30 + 100, py + 204 + 26);          // "Putaran 2"
  a = await st();
  ok(a.scene === 'plat' && a.round === 2 && a.hearts === 5 && a.total > 0, 'putaran 2 membawa hati dan skor');
  // Salah jawab memotong hati lewat Sim; hati habis = layar akhir + skor terkirim.
  await pg.evaluate(() => { const S = MH3.plat.state(); S.g.invuln = 0; MH3.platSim.hurt(S.g, 'musuh'); });
  a = await st(); ok(a.hearts === 4, 'terkena musuh: hati 4, tidak pulih');
  await pg.evaluate(() => { MH3.platSim.loseHearts(MH3.plat.state().g, 4); });
  await pg.waitForTimeout(500);
  a = await st();
  const sent = await pg.evaluate(() => window.__sent);
  ok(a.state === 'over' && a.hearts === 0, 'hati habis: layar akhir');
  ok(sent.length === 1 && sent[0][1] === 'mh3-kejar' && sent[0][2] === 'UJI' && sent[0][3] > 0 && sent[0][4].level === 2 && sent[0][4].seed > 0, 'skor terkirim ke papan mh3-kejar: ' + JSON.stringify(sent[0]));
  await tap(30 + 30 + 100, VH * 0.18 + 224 + 23);   // "Papan Juara Kejar"
  ok((await st()).scene === 'juarakejar', 'tombol membuka Juara Kejar');
  ok(errs.length === 0, 'tanpa galat konsol ' + errs.join('|'));
  await b.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
