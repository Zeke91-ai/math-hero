// Uji asap level Kejar MH3 di layar sentuh 393x851:  node tests/mh3_plat_ui.js
// Menahan panah kanan dan mengetuk Lompat lewat sentuhan nyata (CDP), sampai kristal direbut dan layar akhir muncul.
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
  await touch('touchStart', [pt(ctl.kanan, 1)]);          // tahan panah kanan
  let held = [pt(ctl.kanan, 1)];
  const info = () => pg.evaluate(() => {
    const st = MH3.plat.state(), g = st.g, p = g.p, L = g.L, T = 32;
    const col = Math.floor((p.x + p.w / 2) / T), foot = Math.floor((p.y + p.h - 1) / T);
    const tile = (c, r) => (c < 0 || c >= L.cols ? 1 : r < 0 || r >= L.rows ? 0 : L.tiles[r * L.cols + c]);
    let jump = false;
    for (const n of [1, 2]) {
      if (p.onGround && tile(col + n, foot + 1) === 0 && tile(col + n, foot + 2) === 0) jump = true;
      if (tile(col + n, foot) === 1) jump = true;
      if (L.spikes.some((q) => Math.floor(q.x / T) === col + n)) jump = true;
    }
    for (const e of g.enemies) if (!e.dead && e.b.x > p.x && e.b.x - p.x < 70 && Math.abs(e.b.y - p.y) < 60) jump = true;
    return { jump: jump && p.onGround, phase: g.phase, state: st.state, x: Math.round(p.x), stars: g.stars, hearts: g.hearts };
  });
  let shot = false, i = 0, last;
  for (; i < 1500; i++) {
    last = await info();
    if (last.state === 'end') break;
    if (last.jump) { await touch('touchStart', [pt(ctl.a, 2)]); await pg.waitForTimeout(160); await touch('touchEnd', [pt(ctl.a, 2)]); }
    if (!shot && last.x > 900) { shot = true; await pg.screenshot({ path: 'tests/shots/mh3_plat_1.png' }); }
    await pg.waitForTimeout(40);
  }
  await touch('touchEnd', []);
  ok(last.x > 100, 'panah kanan menggerakkan hero (x=' + last.x + ')');
  ok(last.state === 'end' && last.phase === 'won', 'level Kejar 1 ditamatkan lewat sentuhan (bintang ' + last.stars + ', hati ' + last.hearts + ')');
  await pg.waitForTimeout(800);
  await pg.screenshot({ path: 'tests/shots/mh3_plat_end.png' });
  let got = null;
  await pg.evaluate(() => { window.__r = null; MH3.plat.state().params.onEnd = (r) => { window.__r = r; }; });
  await pg.touchscreen.tap(180 * s, (851 * 0 + (await pg.evaluate(() => MH2.VH)) * 0.2 + 236 + 26) * s);
  await pg.waitForTimeout(300);
  got = await pg.evaluate(() => window.__r);
  ok(got && got.win === true && got.stars >= 1, 'tombol Lanjut mengirim hasil (bintang ' + (got && got.stars) + ')');
  ok(errs.length === 0, 'tidak ada galat konsol' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
