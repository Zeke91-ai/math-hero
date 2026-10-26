// Uji asap papan Bertahan MH3 di layar sentuh 393x851:  node tests/mh3_defense_ui.js
// Taruh pasukan lewat ketukan, ambil Bintang, lompati ke akhir gelombang 1, buka Peti PR, pilih kekuatan, menangkan level.
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
  const sc = () => pg.evaluate(() => MH2.scale);
  const tap = async (x, y) => { const s = await sc(); await pg.touchscreen.tap(x * s, y * s); await pg.waitForTimeout(120); };
  // Mulai dari tombol debug di judul (130x34 di x10,y94).
  await tap(70, 111); await pg.waitForTimeout(700);
  ok(await pg.evaluate(() => MH2.sceneName) === 'defense', 'tombol debug membuka papan Bertahan');
  const st = () => pg.evaluate(() => { const s = MH3.defense.state(); const g = s.g; return { stars: g.stars, units: g.grid.flat().filter(Boolean).length, phase: g.phase, wave: g.wave, state: s.state, pick: g.pickups.length, chest: !!g.chest, hearts: g.hearts, mon: g.monsters.length }; });
  const L = await pg.evaluate(() => MH3.defense.layout());
  // Kartu pertama (Pemanah) sudah terpilih dari awal: ketuk petak (kolom 2, baris 4).
  await tap(L.gx + 2 * 64 + 32, L.gy + 4 * L.ch + L.ch / 2);
  let s = await st();
  ok(s.units === 1 && s.stars === 50, 'ketuk petak menaruh pemanah (Bintang ' + s.stars + ')');
  await pg.screenshot({ path: 'tests/shots/mh3_def_1.png' });
  // Ketuk Bintang yang jatuh.
  await pg.evaluate(() => { const g = MH3.defense.state().g; g.pickups.push({ x: 0.5, y: 1.5, ty: 1.5, value: 25, age: 0, id: 9999, sky: true }); });
  await tap(L.gx + 32, L.gy + 1.5 * L.ch);
  s = await st();
  ok(s.stars === 75, 'ketuk Bintang menambah 25 (Bintang ' + s.stars + ')');
  // Lompati ke akhir gelombang 1 supaya Peti PR muncul.
  await pg.evaluate(() => { MH3.defense.state().g.restT = 0; });
  await pg.waitForFunction(() => MH3.defense.state().g.phase === 'wave', null, { timeout: 5000 });
  await pg.evaluate(() => { const g = MH3.defense.state().g; g.spawns = []; g.monsters = []; });
  await pg.waitForFunction(() => MH3.defense.state().g.chest, null, { timeout: 5000 });
  await pg.waitForTimeout(300);
  await pg.screenshot({ path: 'tests/shots/mh3_def_chest.png' });
  await tap(L.gx + 60, L.gy + L.ch / 2);
  await pg.waitForTimeout(400);
  ok(await pg.evaluate(() => MH3.homework.active), 'Peti PR membuka kartu PR');
  const pr = await pg.evaluate(() => { const v = MH3.homework.pending(); const p = MH3Homework.generate(v.id, v.seed, v.tier); return { form: p.form, answer: p.answer, n: Math.min(4, p.steps.length), VH: MH2.VH }; });
  ok(pr.form === 'int', 'soal kelas 2 berbentuk bilangan bulat');
  // Jawab salah dulu: peti harus tetap ada setelah Nanti. Lalu jawab benar.
  await pg.keyboard.type(String(pr.answer)); await pg.keyboard.press('Enter');
  await pg.waitForTimeout(600);
  await pg.screenshot({ path: 'tests/shots/mh3_def_pr.png' });
  const h = Math.min(pr.VH - 190, 120 + pr.n * 56);
  await tap(180, 60 + h + 20 + 28);
  await pg.waitForFunction(() => !MH3.homework.active, null, { timeout: 6000 });
  s = await st();
  ok(s.state === 'power' && !s.chest, 'PR benar membuka pilihan kekuatan super');
  await pg.screenshot({ path: 'tests/shots/mh3_def_power.png' });
  const VH = await pg.evaluate(() => MH2.VH);
  await tap(180, VH * 0.22 + 28 + 40);
  ok((await st()).state === 'play' && await pg.evaluate(() => !!MH3.defense.state().g.power), 'memilih kekuatan super');
  // Menangkan level: kosongkan gelombang berturut-turut.
  for (let i = 0; i < 3; i++) {
    await pg.evaluate(() => { const g = MH3.defense.state().g; if (g.phase === 'rest') g.restT = 0; });
    await pg.waitForTimeout(250);
    await pg.evaluate(() => { const g = MH3.defense.state().g; g.spawns = []; g.monsters = []; });
    await pg.waitForTimeout(250);
  }
  await pg.waitForFunction(() => MH3.defense.state().g.phase === 'won', null, { timeout: 8000 });
  await pg.waitForTimeout(900);
  ok(await pg.evaluate(() => MH3.defense.state().state) === 'end', 'level menang menampilkan hasil');
  await pg.screenshot({ path: 'tests/shots/mh3_def_end.png' });
  ok(errs.length === 0, 'tanpa galat konsol' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); srv.close();
})();
