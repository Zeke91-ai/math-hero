// Uji bonus waktu dan Papan Juara MH2/MH3 di browser 393x851:  node tests/bonus_ui.js
// Memeriksa: jam bonus jalan saat main, berhenti saat jeda, kartu PR, dan tab tersembunyi (blur); layar Papan Juara (lokal dan online palsu).
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
  const base = `http://localhost:${srv.address().port}`;
  for (const game of ['mh3', 'mh2']) {
    const ctx = await b.newContext({ viewport: { width: 393, height: 851 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const pg = await ctx.newPage();
    const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await pg.goto(`${base}/${game}/index.html?debug=1`);
    await pg.waitForFunction(() => window.MH2 && MH2.sceneName === 'title', null, { timeout: 20000 });
    await pg.waitForTimeout(400);
    await pg.evaluate(() => { MH2.save.create(0, 'ANA'); MH2.save.use(0); });

    // ---- Papan Juara: skor lokal (Firebase belum dikonfigurasi di uji) ----
    await pg.evaluate(() => { const p = MH2.save.active; p.best = { a: 1200, b: 800 }; p.stars = { a: 3, b: 2 }; });
    await pg.evaluate(() => MH2.go('juara'));
    await pg.waitForTimeout(900);
    ok(await pg.evaluate(() => MH2.sceneName) === 'juara', `${game}: layar Papan Juara terbuka`);
    await pg.screenshot({ path: `tests/shots/${game}_juara_lokal.png` });
    // Papan online palsu: urut skor, satu baris per nama.
    await pg.evaluate((game2) => {
      const rows = [['ZEKE', 5400, 'owi', 31], ['ANA', 2000, 'pinki', 5], ['BIMA', 1900, 'dudu', 9], ['CICI', 1500, 'hero2', 4], ['DODO', 900, 'hero1', 2]];
      Scores._setBackend({ add: async () => {}, query: async () => rows.map((r, i) => ({ appId: 'math-hero', board: game2, name: r[0], score: r[1], meta: { hero: r[2], stars: r[3] }, createdAt: i + 1 })) });
      MH2.go('title');
    }, game);
    await pg.waitForTimeout(600);
    await pg.evaluate(() => MH2.go('juara'));
    await pg.waitForTimeout(1200);
    await pg.screenshot({ path: `tests/shots/${game}_juara_online.png` });
    ok(await pg.evaluate(() => MHJuara.fromShared([{ name: 'A', score: 1, meta: { hero: 'owi', stars: 2 } }])[0].hero) === 'owi', `${game}: baris online membawa pahlawan`);

    // ---- Jam bonus ----
    const clock = game === 'mh3'
      ? { open: () => pg.evaluate(() => { MH2.go('plat', { level: 1 }); }), st: () => MH3.plat.state() }
      : { open: () => pg.evaluate(() => { MH2.go('play', { level: MH2.ALL_LEVELS[0] }); }), st: null };
    await clock.open();
    await pg.waitForTimeout(900);
    if (game === 'mh2') { // lewati kartu intro lalu mulai
      const sc = await pg.evaluate(() => MH2.scale), [vw, vh] = await pg.evaluate(() => [MH2.VW, MH2.VH]);
      const h = Math.min(vh - 60, 470);
      await pg.touchscreen.tap((vw / 2) * sc, (vh / 2 + h / 2 - 40) * sc);
      await pg.waitForTimeout(800);
    }
    const secs = () => pg.evaluate((g) => (g === 'mh3' ? MH3.plat.state().bonus : MH2.playState().bonus).seconds(), game);
    const t0 = await secs();
    await pg.waitForTimeout(1500);
    const t1 = await secs();
    ok(t1 - t0 > 1 && t1 - t0 < 2, `${game}: jam bonus jalan saat main (+${(t1 - t0).toFixed(2)} dtk)`);
    await pg.screenshot({ path: `tests/shots/${game}_hud_bonus.png` });
    // Tab tersembunyi / kehilangan fokus -> jeda -> jam berhenti.
    await pg.evaluate(() => MH2.scene.blur && MH2.scene.blur());
    await pg.waitForTimeout(300);
    const p0 = await secs();
    await pg.waitForTimeout(1200);
    const p1 = await secs();
    ok(Math.abs(p1 - p0) < 0.001, `${game}: jam berhenti saat jeda/blur (${(p1 - p0).toFixed(3)})`);
    if (game === 'mh3') { // kartu PR terbuka: adegan beku, jam tidak jalan (kartu sengaja tanpa batas waktu)
      await pg.evaluate(() => { MH3.plat.state().state = 'play'; MH3.homework.open({ grade: 2, tier: 0, title: 'Peti Kekuatan' }, () => {}); });
      await pg.waitForTimeout(400);
      const c0 = await secs();
      await pg.waitForTimeout(1500);
      const c1 = await secs();
      ok(Math.abs(c1 - c0) < 0.001, `mh3: jam berhenti saat kartu PR terbuka (${(c1 - c0).toFixed(3)})`);
    }
    const real = errs.filter((e) => !/ERR_TUNNEL|ERR_NAME|ERR_INTERNET|Failed to load resource/.test(e)); // jaringan sandbox
    ok(real.length === 0, `${game}: tanpa galat konsol ${real.join('|')}`);
    await ctx.close();
  }
  // ---- MH1: bonus level menyusut, berhenti saat jeda ----
  {
    const ctx = await b.newContext({ viewport: { width: 393, height: 851 }, hasTouch: true, isMobile: true });
    const pg = await ctx.newPage();
    const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.goto(`${base}/mh1/index.html`);
    await pg.waitForFunction(() => window.__mathHero && __mathHero.ready && document.body.classList.contains('loaded'), null, { timeout: 20000 });
    await pg.evaluate(() => __mathHero.startGame(0, 0, 1));
    await pg.waitForTimeout(800);
    const sec = () => pg.evaluate(() => __mathHero.world.bonus.seconds());
    const a = await sec(); await pg.waitForTimeout(1500); const c = await sec();
    ok(c - a > 1 && c - a < 2, `mh1: jam bonus jalan saat main (+${(c - a).toFixed(2)} dtk)`);
    await pg.screenshot({ path: 'tests/shots/mh1_hud_bonus.png' });
    await pg.evaluate(() => { __mathHero.state.paused = true; });
    await pg.waitForTimeout(200); const p0 = await sec(); await pg.waitForTimeout(1200); const p1 = await sec();
    ok(Math.abs(p1 - p0) < 0.001, `mh1: jam berhenti saat jeda (${(p1 - p0).toFixed(3)})`);
    await pg.evaluate(() => { __mathHero.state.paused = false; __mathHero.world.crates.forEach((x) => { x.done = true; }); });
    // Selesai level: bonus yang ditambahkan = bonus tersisa (bukan 200 tetap), tak pernah negatif.
    const r = await pg.evaluate(() => { const w = __mathHero.world, g = __mathHero.game; w.bonus.tick(0.9); w.bonus.tick(0.9); const want = w.bonus.value(), before = g.score; __mathHero.clearLevel(); return { want, got: g.score - before, text: document.getElementById('clear-lines').textContent }; });
    ok(r.got === r.want && r.want <= 200 && r.want >= 0, `mh1: skor bertambah sebesar bonus tersisa (${r.got})`);
    ok(/Bonus level: \+\d+ \(waktu \d+:\d\d\)/.test(r.text), 'mh1: layar hasil menampilkan bonus dan waktu');
    ok(errs.length === 0, 'mh1: tanpa galat ' + errs.join('|'));
    await ctx.close();
  }
  await b.close(); srv.close();
})();
