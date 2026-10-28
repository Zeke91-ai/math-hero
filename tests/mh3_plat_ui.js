// Uji asap level Kejar MH3 di layar sentuh 393x851:  node tests/mh3_plat_ui.js
// Sentuhan nyata (CDP) untuk panah kanan dan Lompat, lalu bot pemain menamatkan level 1 sampai layar akhir muncul.
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
  const cdp = await ctx.newCDPSession(pg);
  await pg.goto(`http://localhost:${srv.address().port}/mh3/index.html?debug=1`);
  await pg.waitForFunction(() => window.MH2 && MH2.sceneName === 'title', null, { timeout: 20000 });
  await pg.waitForTimeout(400);
  const s = await pg.evaluate(() => MH2.scale);
  await pg.touchscreen.tap(70 * s, 151 * s); // tombol debug "Kejar 1"
  await pg.waitForTimeout(700);
  ok(await pg.evaluate(() => MH2.sceneName) === 'plat', 'tombol debug membuka level Kejar');
  const ctl = await pg.evaluate(() => { const c = (id) => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, vis: r.width > 0 }; }; return { kanan: c('btn-kanan'), kiri: c('btn-kiri'), a: c('btn-a') }; });
  ok(ctl.kanan.vis && ctl.kiri.vis && ctl.a.vis, 'panah kiri, kanan, dan Lompat tampil');
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const pt = (c, id) => ({ x: c.x, y: c.y, id });
  const pos = () => pg.evaluate(() => { const g = MH3.plat.state().g; return { x: Math.round(g.p.x), y: Math.round(g.p.y), ground: g.p.onGround }; });
  // 1) sentuhan nyata: tahan panah kanan, ketuk Lompat
  const p0 = await pos();
  await touch('touchStart', [pt(ctl.kanan, 1)]);
  await pg.waitForTimeout(700);
  await touch('touchStart', [pt(ctl.kanan, 1), pt(ctl.a, 2)]);
  await pg.waitForTimeout(120);
  const p1 = await pos();
  await touch('touchEnd', [pt(ctl.kanan, 1)]);
  await touch('touchEnd', []);
  ok(p1.x > p0.x + 40, 'panah kanan menggerakkan hero (x ' + p0.x + ' -> ' + p1.x + ')');
  ok(p1.y < p0.y - 8, 'tombol Lompat membuat hero melompat');
  // 2) sisa level dimainkan bot pemain (tests/lib/kejar_bot.js) lewat input yang sama dengan sentuhan.
  //    Soal pertama dari benda macet memakai kartu PR asli (ditutup dengan Nanti), sisanya dijawab otomatis.
  await pg.addScriptTag({ path: path.join(__dirname, 'lib', 'kejar_bot.js') });
  await pg.evaluate(() => {
    const Sim = MH3.platSim, upd = Sim.update, bot = KejarBot.make(), real = MH3.homework.open;
    window.__quiz = [];
    Sim.update = (g, dt) => upd(g, dt, bot.step(g));
    MH3.homework.open = (o, cb) => {
      if (!/macet/.test(o.title || '')) return real(o, cb);
      window.__quiz.push(o.title);
      if (window.__quiz.length === 1) return real(o, (r) => { window.__first = r.status; cb({ status: 'done', stars: 2, hints: 0, wrong: 0 }); });
      cb({ status: 'done', stars: 2, hints: 0, wrong: 0 });
    };
  });
  let last, shotQ = false, shot = false;
  for (let i = 0; i < 2000; i++) {
    last = await pg.evaluate(() => { const st = MH3.plat.state(); return { phase: st.g.phase, state: st.state, x: Math.round(st.g.p.x), stars: st.g.stars, hearts: st.g.hearts, deaths: st.g.deaths, hw: MH3.homework.active }; });
    if (last.hw) {
      if (!shotQ && await pg.evaluate(() => window.__quiz.length === 1)) { shotQ = true; await pg.screenshot({ path: 'tests/shots/mh3_plat_soal.png' }); }
      await pg.touchscreen.tap(300 * s, 670 * s); await pg.waitForTimeout(300); continue; // Nanti
    }
    if (last.state === 'end') break;
    if (!shot && last.x > 900) { shot = true; await pg.screenshot({ path: 'tests/shots/mh3_plat_1.png' }); }
    await pg.waitForTimeout(100);
  }
  const quiz = await pg.evaluate(() => ({ n: window.__quiz.length, first: window.__first }));
  ok(quiz.n >= 1 && quiz.first === 'later', 'benda macet membuka kartu soal (' + quiz.n + ' soal, kartu pertama ditutup lewat Nanti)');
  ok(last.state === 'end' && last.phase === 'won', 'level Kejar 1 ditamatkan (bintang ' + last.stars + ', hati ' + last.hearts + ', mati ' + last.deaths + ')');
  await pg.waitForTimeout(800);
  await pg.screenshot({ path: 'tests/shots/mh3_plat_end.png' });
  let got = null;
  await pg.evaluate(() => { window.__r = null; MH3.plat.state().params.onEnd = (r) => { window.__r = r; }; });
  await pg.touchscreen.tap(180 * s, (851 * 0 + (await pg.evaluate(() => MH2.VH)) * 0.2 + 280 + 26) * s);
  await pg.waitForTimeout(300);
  got = await pg.evaluate(() => window.__r);
  ok(got && got.win === true && got.stars >= 1, 'tombol Lanjut mengirim hasil (bintang ' + (got && got.stars) + ')');
  ok(errs.length === 0, 'tidak ada galat konsol' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
