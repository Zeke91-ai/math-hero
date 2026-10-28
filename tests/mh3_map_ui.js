// Uji sentuh alur peta MH3 di layar 393x851:  node tests/mh3_map_ui.js
// Profil baru -> cerita -> peta -> Bertahan 1-1 -> Kejar 1-2 (penduduk bergabung) -> Barak (upgrade) -> tutup-buka -> Buku PR.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'public');
const shots = path.join(__dirname, 'shots');
fs.mkdirSync(shots, { recursive: true });
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
  const url = `http://localhost:${srv.address().port}/mh3/index.html`;
  const boot = async () => { await pg.goto(url); await pg.waitForFunction(() => window.MH2 && MH2.sceneName === 'title', null, { timeout: 20000 }); await pg.waitForTimeout(400); };
  const scene = () => pg.evaluate(() => MH2.sceneName);
  const waitScene = (n) => pg.waitForFunction((x) => MH2.sceneName === x, n, { timeout: 8000 }).then(() => pg.waitForTimeout(500));
  const tap = async (x, y) => { const s = await pg.evaluate(() => MH2.scale); await pg.touchscreen.tap(x * s, y * s); await pg.waitForTimeout(150); };
  const VW = 393, VH = await (async () => { await boot(); return pg.evaluate(() => MH2.VH); })();
  const save = () => pg.evaluate(() => MH2.save.active);
  // Ketuk layar cerita sampai selesai (maks 40 ketukan) dan berhenti saat adegan bukan cerita/penyelamatan.
  async function skipStories() {
    await pg.waitForTimeout(700); // transisi gelap singkat antar adegan
    for (let i = 0; i < 40; i++) {
      const sc = await scene();
      if (sc === 'story') { if (process.env.DBG) console.log('story', await pg.evaluate(() => MH2.scene.i + '/' + MH2.scene.lines.length + ' t=' + MH2.scene.t.toFixed(1))); await tap(200, 400); }
      else if (sc === 'rescue') { await pg.waitForTimeout(900); await tap(VW / 2, (VH - 400) / 2 + 400 - 45); }
      else break;
      await pg.waitForTimeout(120);
    }
    await pg.waitForTimeout(500);
  }
  const nodeXY = (i) => { const N = [[0.26, 0.9], [0.7, 0.74], [0.3, 0.58], [0.7, 0.42], [0.42, 0.22]]; return [N[i][0] * VW, 150 + N[i][1] * (VH - 230)]; };

  // ---------- Profil baru ----------
  await tap(VW / 2, VH - 260 + 32); await waitScene('slots');
  await tap(VW / 2, 110 + 67); await waitScene('name');
  await pg.keyboard.type('dina'); await pg.keyboard.press('Enter'); await waitScene('heroes');
  await tap(15 + 90, 104 + 75); // Pinki
  await waitScene('story'); ok(true, 'cerita pembuka tampil');
  await skipStories();
  ok(await scene() === 'map', 'setelah cerita pembuka: peta');
  ok(await pg.evaluate(() => MH2.scene.world) === 1, 'peta membuka Dunia 1');
  await pg.screenshot({ path: path.join(shots, 'mh3_map.png') });

  // ---------- Level terkunci ----------
  let [x, y] = nodeXY(1); await tap(x, y);
  ok(await scene() === 'map', 'level 1-2 terkunci sebelum 1-1 selesai');

  // ---------- 1-1 Bertahan ----------
  [x, y] = nodeXY(0); await tap(x, y);
  await skipStories();
  ok(await scene() === 'barak', 'node Bertahan membuka Barak sebelum bertarung');
  await pg.screenshot({ path: path.join(shots, 'mh3_barak.png') });
  await tap(VW / 2, VH - 62 + 27); await waitScene('defense');
  ok(await pg.evaluate(() => MH3.defense.state().level.loadout.join()) === 'pemanah,menara,tembok', 'Bertahan memakai 4 pasukan pilihan (3 awal)');
  ok(await pg.evaluate(() => MH3.defense.state().level.nama) === 'Gerbang Padang', 'nama level dari peta');
  await pg.evaluate(() => { const g = MH3.defense.state().g; g.phase = 'won'; g.hearts = 5; });
  await pg.waitForFunction(() => MH3.defense.state().state === 'end', null, { timeout: 5000 });
  await pg.waitForTimeout(900);
  await tap(VW / 2, VH * 0.2 + 302 + 24); // Lanjut
  await skipStories();
  ok(await scene() === 'map', 'selesai Bertahan: kembali ke peta');
  ok(await pg.evaluate(() => MH2.save.starsOf('1-1')) === 3, 'bintang 1-1 tersimpan (3)');
  ok(await pg.evaluate(() => MH2.save.unlocked(1)), 'level 1-2 terbuka');

  // ---------- 1-2 Kejar + penyelamatan ----------
  [x, y] = nodeXY(1); await tap(x, y);
  await skipStories();
  ok(await scene() === 'plat', 'node Kejar membuka platformer');
  await pg.evaluate(() => { MH3.plat.state().g.phase = 'won'; });
  await pg.waitForFunction(() => MH3.plat.state().state === 'end', null, { timeout: 5000 });
  await pg.waitForTimeout(900);
  await tap(VW / 2, VH * 0.2 + 280 + 26); // Lanjut
  for (let i = 0; i < 30 && (await scene()) !== 'rescue'; i++) { if ((await scene()) === 'story') await tap(200, 400); await pg.waitForTimeout(150); }
  ok(await scene() === 'rescue', 'penduduk diselamatkan: layar bergabung tampil');
  await pg.waitForTimeout(1000);
  await pg.screenshot({ path: path.join(shots, 'mh3_rescue.png') });
  await skipStories();
  ok(await scene() === 'map', 'kembali ke peta');
  ok(await pg.evaluate(() => MH2.save.owned().includes('penyihir')), 'Penyihir Es bergabung jadi pasukan');
  ok(await pg.evaluate(() => MH2.save.active.stars['1-2'] > 0), 'bintang 1-2 tersimpan');

  // ---------- 1-3 Bertahan: bonus kristal dan pasukan baru ----------
  [x, y] = nodeXY(2); await tap(x, y); await skipStories();
  ok(await scene() === 'barak', 'Barak sebelum 1-3');
  await tap(VW / 2, VH - 62 + 27); await waitScene('defense');
  ok(await pg.evaluate(() => MH3.defense.state().g.stars) === 200, 'kristal direbut memberi +50 Bintang awal (150 + 50)');
  await pg.evaluate(() => MH2.go('map', {}, true)); await pg.waitForTimeout(400);

  // ---------- Barak: upgrade dengan Kunci ----------
  await pg.evaluate(() => MH2.save.addKeys(5));
  await tap(VW - 182 + 42, 8 + 22); await waitScene('barak');
  const ys = 84 + 4 * 72, hs = VH - 76 - ys;
  await tap(VW - 24 - 75, ys + hs - 52 + 22);
  ok(await pg.evaluate(() => MH2.save.unitLevel('pemanah')) === 2 && await pg.evaluate(() => MH2.save.keys()) === 3, 'upgrade Pemanah ke Lv 2 memakai 2 Kunci');
  await tap(12 + 188 + 90, 84 + 72 + 32); // kartu Penyihir Es (urutan ke-4): terpasang? (bawaan 4 pertama) -> lepas
  ok(await pg.evaluate(() => !MH2.save.loadout().includes('penyihir')), 'ketuk kartu melepas pasukan dari pilihan');
  await pg.screenshot({ path: path.join(shots, 'mh3_barak2.png') });
  await tap(VW / 2, VH - 62 + 27); await waitScene('map');

  // ---------- Tutup-buka ----------
  const before = JSON.stringify(await save());
  await boot();
  ok(JSON.stringify(await save()) === before, 'progres sama persis setelah muat ulang halaman');
  await tap(VW / 2, VH - 260 + 32); await waitScene('slots');
  await tap(VW / 2, 110 + 67);
  await waitScene('map');
  ok(await pg.evaluate(() => MH2.scene.world) === 1, 'lanjut dari slot: langsung ke peta (cerita pembuka tidak diulang)');

  // ---------- Buku PR ----------
  await pg.evaluate(() => { const p = MH3Homework.pick(2, 0, 5); MH2.save.logPR({ status: 'later', id: p.id, seed: p.seed, tier: 0, grade: 2 }, 'Peti Kristal'); });
  await tap(VW - 92 + 42, 8 + 22); await waitScene('buku');
  ok(await pg.evaluate(() => MH2.scene.tab) === 'later' && await pg.evaluate(() => MH2.save.book().later.length) === 1, 'Buku PR menampilkan PR yang ditunda');
  await pg.screenshot({ path: path.join(shots, 'mh3_buku.png') });
  const k0 = await pg.evaluate(() => MH2.save.keys());
  await tap(VW - 100 + 40, 166 + 11 + 22); // Kerjakan
  await pg.waitForFunction(() => MH3.homework.active, null, { timeout: 3000 });
  const right = await pg.evaluate(() => { const v = MH3.homework.pending(); const p = MH3Homework.generate(v.id, v.seed, v.tier); return p.form === 'int' ? String(p.answer) : null; });
  ok(right !== null, 'PR tertunda terbuka sebagai kartu');
  await pg.keyboard.type(right); await pg.keyboard.press('Enter'); await pg.waitForTimeout(600);
  for (let yy = 300; yy < 760 && await pg.evaluate(() => MH3.homework.active); yy += 28) { await tap(180, yy); await pg.waitForTimeout(80); }
  await pg.waitForFunction(() => !MH3.homework.active, null, { timeout: 6000 });
  ok(await pg.evaluate(() => MH2.save.book().later.length) === 0 && await pg.evaluate(() => MH2.save.book().done.length) >= 1, 'PR selesai pindah dari Tertunda ke Selesai');
  ok(await pg.evaluate(() => MH2.save.keys()) > k0, 'PR Peti Kristal yang ditunda memberi Kunci setelah dikerjakan di Buku PR');
  ok(await pg.evaluate(() => MH2.save.weekCount()) >= 1, 'hitungan PR minggu ini bertambah');

  ok(errs.length === 0, 'tanpa galat di konsol' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
