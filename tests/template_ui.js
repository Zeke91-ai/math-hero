// Uji UI templat seri baru (Playwright):  node tests/template_ui.js
// Membuat seri uji dari templat, membukanya di ukuran HP, memainkan lima soal sampai layar hasil, tanpa galat konsol.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net');
const { buat } = require('../scripts/buat_seri.js');
const ID = 'mh-uji-templat-ui';
const dir = path.join(__dirname, '..', 'public', ID);
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('GAGAL: ' + m); } else console.log('ok: ' + m); };
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });

(async () => {
  fs.rmSync(dir, { recursive: true, force: true });
  buat(ID, 'Seri Uji UI');
  const port = await freePort();
  const server = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env: Object.assign({}, process.env, { PORT: String(port), MATHHERO_DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'mh-tpl-')) }) });
  await new Promise((r) => setTimeout(r, 1500));
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 393, height: 851 }, hasTouch: true, isMobile: true });
    const pg = await ctx.newPage();
    const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message));
    pg.on('response', (r) => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
    pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await pg.goto(`http://127.0.0.1:${port}/${ID}/`);
    await pg.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 20000 });
    ok(await pg.evaluate(() => !!window.MH2.scene), 'seri baru termuat dan adegan judul berjalan');
    const scene = () => pg.evaluate(() => Object.keys(window.MH2.scenes).find((k) => window.MH2.scenes[k] === window.MH2.scene));
    ok((await scene()) === 'title', 'mulai di layar judul');
    // Ketuk tombol Mulai di tengah layar (koordinat logis -> layar).
    const pos = await pg.evaluate(() => { const M = window.MH2, r = document.getElementById('screen').getBoundingClientRect(); return { x: r.left + M.VW / 2 * M.scale, y: r.top + (M.VH * 0.55 + 28) * M.scale }; });
    await pg.touchscreen.tap(pos.x, pos.y);
    await pg.waitForTimeout(800);
    ok((await scene()) === 'soal', 'ketuk Mulai membuka adegan soal');
    for (let i = 0; i < 5; i++) {
      if (i === 0) {
        const salah = await pg.evaluate(() => { const s = window.MH2.scene, q = window.__seri.run.soal; return s.jawab(q.pilihan.find((v) => v !== q.jawaban)); });
        ok(salah === false, 'jawaban salah ditolak tanpa maju');
      }
      await pg.evaluate(() => { const M = window.MH2; M.scene.jawab(window.__seri.run.soal.jawaban); });
      await pg.waitForTimeout(450);
    }
    ok((await scene()) === 'hasil', 'lima soal selesai membuka layar hasil');
    ok(await pg.evaluate(() => window.__seri.run.n === 5 && window.__seri.run.benar === 4), 'skor: 4 benar pada percobaan pertama (soal pertama sengaja dijawab salah dulu)');
    ok(errs.length === 0, 'tanpa galat konsol atau 404 ' + errs.join(' | '));
  } finally {
    await b.close(); server.kill();
    fs.rmSync(dir, { recursive: true, force: true });
  }
  if (fails) { console.error(fails + ' pemeriksaan GAGAL'); process.exit(1); }
  console.log('semua uji UI templat lulus');
})().catch((e) => { fs.rmSync(dir, { recursive: true, force: true }); console.error(e); process.exit(1); });
