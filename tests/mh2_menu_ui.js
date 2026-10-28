// Uji alur menu MH2 yang memakai adegan kit bersama (layar 393x851):  node tests/mh2_menu_ui.js
// Judul -> slot -> isi nama -> pilih pahlawan -> cerita pembuka -> peta, lalu buka ulang: pemain tersimpan.
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
  const url = `http://localhost:${srv.address().port}/mh2/`;
  const scene = () => pg.evaluate(() => MH2.sceneName);
  const waitScene = (s) => pg.waitForFunction((x) => MH2.sceneName === x, s, { timeout: 15000 });
  await pg.goto(url);
  await pg.waitForFunction(() => window.MH2 && MH2.sceneName === 'title', null, { timeout: 20000 });
  await pg.keyboard.press('Enter'); await waitScene('slots'); ok(true, 'judul -> slot');
  await pg.evaluate(() => MH2.go('name', { slot: 0 })); await waitScene('name');
  await pg.keyboard.type('rani'); await pg.keyboard.press('Enter'); await waitScene('heroes'); ok(true, 'nama -> pilih pahlawan');
  ok(await pg.evaluate(() => MH2.HEROES.map((h) => h.need).join()) === '0,0,0,12,30,50', 'syarat bintang pahlawan MH2 12/30/50');
  await pg.evaluate(() => { MH2.save.setHero('owi'); MH2.go('story', MH2.save.active && { lines: MH2.OPENING, next: ['map', { stage: 1 }], seen: 'pembuka' }); });
  await waitScene('story');
  for (let i = 0; i < 12 && (await scene()) === 'story'; i++) { await pg.keyboard.press('Enter'); await pg.waitForTimeout(120); await pg.keyboard.press('Enter'); await pg.waitForTimeout(120); }
  await waitScene('map'); ok(true, 'cerita pembuka selesai -> peta');
  const raw = await pg.evaluate(() => localStorage.getItem('mathHero2.save.v1'));
  ok(JSON.parse(raw).v === 2 && JSON.parse(raw).slots[0].nama === 'RANI' && JSON.parse(raw).slots[0].hero === 'owi', 'simpanan: v=2, nama, pahlawan');
  await pg.reload(); await pg.waitForFunction(() => window.MH2 && MH2.sceneName === 'title', null, { timeout: 20000 });
  ok(await pg.evaluate(() => MH2.save.slots()[0].nama) === 'RANI', 'buka ulang: pemain masih ada');
  await pg.evaluate(() => MH2.go('credits', {})); await waitScene('credits'); await pg.waitForTimeout(500);
  ok(errs.length === 0, 'tanpa galat halaman ' + errs.join('|'));
  await b.close(); srv.close();
})();
