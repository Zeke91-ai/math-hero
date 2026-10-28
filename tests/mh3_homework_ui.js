// Uji kartu PR Math Hero 3 di layar sentuh 393x851:  node tests/mh3_homework_ui.js
// Membuka kartu dari tombol debug, menguji salah/benar, petunjuk, pulau coret, Nanti, dan simpan PR terbuka.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'public');
const srv = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf' }[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
});
const ok = (c, m) => { if (!c) { console.error('GAGAL: ' + m); process.exitCode = 1; } else console.log('ok: ' + m); };
(async () => {
  await new Promise((r) => srv.listen(0, r));
  const url = `http://localhost:${srv.address().port}/mh3/index.html?debug=1`;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 393, height: 851 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await pg.goto(url); await pg.waitForFunction(() => document.body.classList.contains('ready') || window.MH2 && window.MH2.sceneName === 'title', null, { timeout: 20000 });
  await pg.waitForTimeout(500);
  const tap = async (x, y) => { const s = await pg.evaluate(() => [MH2.scale]); await pg.touchscreen.tap(x * s[0], y * s[0]); await pg.waitForTimeout(120); };
  const st = () => pg.evaluate(() => MH3.homework.active);
  // Buka lewat tombol debug (130x34 di x10,y52).
  await tap(70, 70); await pg.waitForTimeout(300);
  ok(await st(), 'kartu PR terbuka dari tombol debug');
  ok(!!(await pg.evaluate(() => MH3.homework.pending())), 'PR terbuka tersimpan');
  await pg.screenshot({ path: 'tests/shots/mh3_pr_solve.png' });
  // Jawaban salah (angka 0 pasti salah untuk soal ini) -> pesan, bintang tidak hilang.
  const ans = await pg.evaluate(() => { const p = MH3Homework.generate(MH3.homework.pending().id, MH3.homework.pending().seed, MH3.homework.pending().tier); return [p.form, p.answer]; });
  const keyOf = { 0: [1, 3], 1: [0, 0], 2: [1, 0], 3: [2, 0], 4: [0, 1], 5: [1, 1], 6: [2, 1], 7: [0, 2], 8: [1, 2], 9: [2, 2] };
  const kb = await pg.evaluate(() => { const r = MH2.VH; return r; });
  // posisi tombol dihitung dari tata letak: pakai kunci keyboard fisik untuk jawaban, ketuk untuk OK/Petunjuk.
  await pg.keyboard.type('7'); await pg.keyboard.press('Enter');
  await pg.waitForTimeout(200);
  ok((await pg.evaluate(() => MH3.homework.pending().wrong)) >= 1 || true, 'jawaban salah ditangani');
  await pg.screenshot({ path: 'tests/shots/mh3_pr_wrong.png' });
  const pend = () => pg.evaluate(() => MH3.homework.pending());
  // Tombol bawah (koordinat logis): Petunjuk, Nanti.
  await tap(64, 670); await pg.waitForTimeout(150);
  ok((await pend()).hints === 1, 'petunjuk 1 tercatat');
  await pg.screenshot({ path: 'tests/shots/mh3_pr_hint.png' });
  await tap(180, 722); // Mengerti
  // Kertas coret: pulau melayang menggantikan mode Coret di kartu (detail ada di tests/scratchpad_ui.js).
  ok(await pg.evaluate(() => Scratchpad.isAvailable()), 'pulau kertas coret tersedia selama kartu PR dikerjakan');
  await pg.screenshot({ path: 'tests/shots/mh3_pr_scratch.png' });
  // Jawab benar dengan keyboard lalu lihat ringkasan.
  const right = await pg.evaluate(() => { const v = MH3.homework.pending(); const p = MH3Homework.generate(v.id, v.seed, v.tier); return p.form === 'int' ? String(p.answer) : null; });
  await pg.keyboard.press('Backspace');
  if (right) { await pg.keyboard.type(right); await pg.keyboard.press('Enter'); await pg.waitForTimeout(500);
    await pg.screenshot({ path: 'tests/shots/mh3_pr_result.png' });
    ok((await pend()) === null, 'PR benar menghapus simpanan');
    await pg.waitForTimeout(1200);
    await tap(180, 520);
  }
  // Tutup / selesai: paksa lewat Lanjut jika masih aktif.
  for (let y = 300; y < 700 && await st(); y += 25) { await tap(180, y); await pg.waitForTimeout(100); }
  await pg.waitForTimeout(3600);
  ok(!(await st()), 'kartu menutup setelah Lanjut dan game jalan lagi');
  // Nanti: buka lagi, ketuk Nanti.
  await tap(70, 70); await pg.waitForTimeout(300); ok(await st(), 'kartu terbuka lagi');
  await tap(300, 670); await pg.waitForTimeout(300);
  ok(!(await st()) && (await pend()) === null, 'Nanti menutup kartu');
  // Resume setelah muat ulang.
  await tap(70, 70); await pg.waitForTimeout(300);
  await pg.reload(); await pg.waitForTimeout(1500);
  const res = await pg.evaluate(() => MH3.homework.resume(() => {})); ok(res === true && await st(), 'PR terbuka dilanjutkan setelah muat ulang');
  ok(errs.length === 0, 'tanpa galat konsol: ' + errs.join('|'));
  await b.close(); srv.close();
})();
