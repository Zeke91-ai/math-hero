// Uji sentuh Peti PR kedua genre MH3 di layar 393x851:  node tests/mh3_chests_ui.js
// Bertahan: Peti Kekuatan (setelah gelombang 1) -> kartu PR -> kekuatan super; menang -> Peti Harta -> Kunci Kristal.
// Kejar: Peti Kekuatan -> kartu PR (Nanti dulu, peti kembali) -> kekuatan platformer; Peti Kristal -> Kunci Kristal.
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
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.goto(`http://localhost:${srv.address().port}/mh3/index.html?debug=1`);
  await pg.waitForFunction(() => window.MH2 && MH2.sceneName === 'title', null, { timeout: 20000 });
  await pg.waitForTimeout(400);
  const tap = async (x, y) => { const s = await pg.evaluate(() => MH2.scale); await pg.touchscreen.tap(x * s, y * s); await pg.waitForTimeout(120); };
  const VH = await pg.evaluate(() => MH2.VH);
  const cardOpen = () => pg.evaluate(() => !!MH3.homework.active);
  const keys = () => pg.evaluate(() => MH3.defense.keys());
  // Jawab benar lewat papan ketik, lalu ketuk lewat layar hasil sampai kartu menutup.
  async function solveCard() {
    ok(await cardOpen(), 'kartu PR terbuka');
    const right = await pg.evaluate(() => { const v = MH3.homework.pending(); const p = MH3Homework.generate(v.id, v.seed, v.tier); return p.form === 'int' ? String(p.answer) : null; });
    ok(right !== null, 'soal kelas 2 berbentuk bilangan bulat');
    await pg.keyboard.type(right); await pg.keyboard.press('Enter'); await pg.waitForTimeout(600);
    for (let y = 300; y < 760 && await cardOpen(); y += 28) { await tap(180, y); await pg.waitForTimeout(80); }
    await pg.waitForFunction(() => !MH3.homework.active, null, { timeout: 6000 });
  }

  // ---------- Bertahan ----------
  await tap(70, 111); await pg.waitForTimeout(700);
  ok(await pg.evaluate(() => MH2.sceneName) === 'defense', 'Bertahan 1 terbuka');
  const L = await pg.evaluate(() => MH3.defense.layout());
  await pg.evaluate(() => { const g = MH3.defense.state().g; g.restT = 0; });
  await pg.waitForFunction(() => MH3.defense.state().g.phase === 'wave', null, { timeout: 5000 });
  await pg.evaluate(() => { const g = MH3.defense.state().g; g.spawns = []; g.monsters = []; });
  await pg.waitForFunction(() => MH3.defense.state().g.chest, null, { timeout: 5000 });
  await tap(L.gx + 60, L.gy + L.ch / 2);
  await pg.waitForTimeout(300);
  await solveCard();
  ok(await pg.evaluate(() => MH3.defense.state().state) === 'power', 'Bertahan: PR benar membuka pilihan kekuatan');
  await tap(180, VH * 0.22 + 28 + 40);
  ok(await pg.evaluate(() => !!MH3.defense.state().g.power && MH3.defense.state().state === 'play'), 'Bertahan: kekuatan super terpilih');
  for (let i = 0; i < 3; i++) {
    await pg.evaluate(() => { const g = MH3.defense.state().g; if (g.phase === 'rest') g.restT = 0; });
    await pg.waitForTimeout(250);
    await pg.evaluate(() => { const g = MH3.defense.state().g; g.spawns = []; g.monsters = []; });
    await pg.waitForTimeout(250);
  }
  await pg.waitForFunction(() => MH3.defense.state().state === 'end', null, { timeout: 8000 });
  await pg.waitForTimeout(900);
  const k0 = await keys();
  await tap(180, VH * 0.2 + 140 + 28); // Buka Peti Harta
  await pg.waitForTimeout(300);
  await solveCard();
  const k1 = await keys();
  ok(k1 > k0 && k1 - k0 <= 3, `Bertahan: Peti Harta memberi Kunci Kristal (${k0} -> ${k1})`);
  await pg.screenshot({ path: 'tests/shots/mh3_chests_def_end.png' });

  // ---------- Kejar ----------
  await tap(180, VH * 0.2 + 278 + 24); // Ke judul
  await pg.waitForFunction(() => MH2.sceneName === 'title', null, { timeout: 5000 });
  await pg.waitForTimeout(400);
  await tap(70, 151); await pg.waitForTimeout(700);
  ok(await pg.evaluate(() => MH2.sceneName) === 'plat', 'Kejar 1 terbuka');
  const toChest = (kind) => pg.evaluate((kind) => { const g = MH3.plat.state().g, ch = g.L.chests.find((c) => c.kind === kind); g.p.x = ch.x + 4; g.p.y = ch.y - 4; g.p.vx = g.p.vy = 0; return ch.id; }, kind);
  await toChest('power');
  await pg.waitForFunction(() => MH3.homework.active, null, { timeout: 4000 });
  ok(await pg.evaluate(() => MH3.plat.state().state) === 'card', 'Kejar: menyentuh Peti Kekuatan membuka kartu PR');
  await pg.screenshot({ path: 'tests/shots/mh3_chests_plat_card.png' });
  await tap(300, 670); await pg.waitForTimeout(400); // Nanti
  ok(!(await cardOpen()) && await pg.evaluate(() => MH3.plat.state().state) === 'play', 'Kejar: Nanti menutup kartu, game lanjut');
  ok(await pg.evaluate(() => !MH3.plat.state().g.L.chests[0].got), 'Kejar: peti yang ditunda tetap ada');
  await pg.evaluate(() => { const g = MH3.plat.state().g; g.p.x -= 200; });
  await pg.waitForTimeout(500);
  await toChest('power');
  await pg.waitForFunction(() => MH3.homework.active, null, { timeout: 4000 });
  await solveCard();
  ok(await pg.evaluate(() => MH3.plat.state().state) === 'power', 'Kejar: PR benar membuka pilihan kekuatan');
  await pg.screenshot({ path: 'tests/shots/mh3_chests_plat_power.png' });
  await tap(180, VH * 0.22 + 28 + 92 + 40); // Magnet bintang
  ok(await pg.evaluate(() => MH3.plat.state().g.power) === 'magnet' && await pg.evaluate(() => MH3.plat.state().state) === 'play', 'Kejar: kekuatan platformer terpilih (magnet)');
  const k2 = await keys();
  await toChest('crystal');
  await pg.waitForFunction(() => MH3.homework.active, null, { timeout: 4000 });
  await solveCard();
  const k3 = await keys();
  ok(k3 > k2 && k3 - k2 <= 3 && await pg.evaluate(() => MH3.plat.state().keys) === k3 - k2, `Kejar: Peti Kristal memberi Kunci Kristal (${k2} -> ${k3})`);
  ok(errs.length === 0, 'tanpa galat konsol' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
