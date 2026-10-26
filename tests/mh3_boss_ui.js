// Uji asap bos Bertahan MH3 di layar sentuh 393x851:  node tests/mh3_boss_ui.js
// Semua pasukan tergambar, bos berperisai menahan serangan, ketuk "Pecahkan Perisai!", jawab soal, bos terluka.
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
  const cardOpen = () => pg.evaluate(() => !!MH3.homework.active);
  // Level uji: semua pasukan, bos Kapten Slime ditambah satu monster tiap jenis baru.
  await pg.evaluate(() => {
    const def = { id: 99, nama: 'Uji Bos', tema: 'padang', startStars: 3000, skyEvery: 99, skyValue: 25, restTime: 1, tier: 0, loadout: ['pemanah', 'penyihir', 'meriam', 'robo'],
      upg: { pemanah: 3 }, waves: [[{ m: 'bos1', n: 1, start: 1, gap: 1 }]] };
    MH2.go('defense', { def, onEnd: () => {} });
  });
  await pg.waitForFunction(() => MH2.sceneName === 'defense' && MH3.defense.state(), null, { timeout: 5000 });
  const L = await pg.evaluate(() => MH3.defense.layout());
  await pg.evaluate(() => {
    const g = MH3.defense.state().g, S = MH3.defenseSim;
    ['pemanah', 'penyihir', 'meriam', 'robo', 'rubah', 'anak'].forEach((k, i) => { g.cards = {}; S.place(g, k, i % 5, 5 + (i > 4 ? 1 : 0)); });
    g.restT = 0;
    const D = MH3.defenseData, mk = (kind, col, y) => g.monsters.push({ id: g.nextId++, kind, col, y, hp: D.MONSTERS[kind].hp, max: D.MONSTERS[kind].hp, hurt: 0, atk: null, slow: 0, shield: false, openT: 0, healT: 1, jumped: false });
    mk('lompat', 0, 0.8); mk('raksasa', 1, 0.6); mk('pecah', 3, 0.9); mk('tabib', 4, 0.7);
  });
  await pg.waitForFunction(() => MH3.defense.state().g.monsters.some((m) => m.kind === 'bos1'), null, { timeout: 8000 });
  await pg.evaluate(() => { const g = MH3.defense.state().g; g.monsters = g.monsters.filter((m) => m.kind === 'bos1'); g.monsters[0].y = 2.5; });
  await pg.waitForTimeout(1500);
  await pg.screenshot({ path: 'tests/shots/mh3_boss_1.png' });
  const boss = () => pg.evaluate(() => { const m = MH3.defense.state().g.monsters.find((q) => q.kind === 'bos1'); return m && { hp: m.hp, max: m.max, shield: m.shield }; });
  let bs = await boss();
  ok(bs && bs.shield && bs.hp === bs.max, 'bos berperisai dan tidak terluka oleh pasukan (hp ' + bs.hp + ')');
  // Ketuk tombol Pecahkan Perisai! (tengah, di atas Benteng).
  await tap(196, L.castleY + 15);
  await pg.waitForFunction(() => MH3.homework.active, null, { timeout: 4000 }).catch(() => {});
  ok(await cardOpen(), 'kartu PR terbuka dari tombol perisai');
  const t0 = await pg.evaluate(() => MH3.defense.state().g.t); await pg.waitForTimeout(500);
  ok(await pg.evaluate(() => MH3.defense.state().g.t) === t0, 'papan berhenti selama kartu terbuka');
  const right = await pg.evaluate(() => { const v = MH3.homework.pending(); const p = MH3Homework.generate(v.id, v.seed, v.tier); return p.form === 'int' ? String(p.answer) : null; });
  await pg.keyboard.type(right); await pg.keyboard.press('Enter'); await pg.waitForTimeout(600);
  for (let y = 300; y < 760 && await cardOpen(); y += 28) { await tap(180, y); await pg.waitForTimeout(80); }
  await pg.waitForFunction(() => !MH3.homework.active, null, { timeout: 6000 });
  bs = await boss(); ok(bs && !bs.shield, 'perisai pecah setelah jawaban benar');
  await pg.waitForTimeout(2500);
  await pg.screenshot({ path: 'tests/shots/mh3_boss_2.png' });
  bs = await boss(); ok(!bs || bs.hp < bs.max, 'bos terluka setelah perisai pecah (hp ' + (bs ? bs.hp : 'mati') + ')');
  ok(errs.length === 0, 'tanpa galat konsol ' + errs.join(' | '));
  await b.close(); srv.close();
})();
