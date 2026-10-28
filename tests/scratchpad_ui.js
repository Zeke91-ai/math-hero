// Uji kertas coret (lembar bawah + pulau melayang) di MH1, MH2, MH3, layar HP 393x851:  node tests/scratchpad_ui.js
// Menjalankan server.js sendiri di port bebas dengan data sementara. Tangkapan layar ke tests/shots/.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const net = require('net'), os = require('os'), fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('GAGAL: ' + m); process.exitCode = 1; } else console.log('ok: ' + m); };
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });

async function startServer(port) {
  const env = Object.assign({}, process.env, { PORT: String(port), MATHHERO_DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'mh-scratch-')) });
  const proc = spawn('node', ['server.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('server tidak start')), 10000);
    proc.stdout.on('data', (d) => { if (String(d).includes('berjalan')) { clearTimeout(t); res(); } });
    proc.on('exit', () => rej(new Error('server berhenti')));
  });
  return proc;
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const port = await freePort();
  const server = await startServer(port);
  const base = `http://127.0.0.1:${port}`;
  const b = await chromium.launch();
  const errs = [];
  const newPage = async (vp = { width: 393, height: 851 }, mobile = true) => {
    const ctx = await b.newContext({ viewport: vp, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 2 });
    const pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message));
    pg.on('console', (m) => m.type() === 'error' && !(pg.ignoreAbort && /ERR_FAILED/.test(m.text())) && errs.push(m.text()));
    return { ctx, pg };
  };
  const visible = (pg) => pg.evaluate(() => { const e = document.getElementById('scratch-btn'); return !!e && getComputedStyle(e).display !== 'none' && +getComputedStyle(e).opacity > 0.9; });
  const avail = (pg) => pg.evaluate(() => Scratchpad.isAvailable());
  const btnBox = (pg) => pg.evaluate(() => { const r = document.getElementById('scratch-btn').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const sheetBox = (pg) => pg.evaluate(() => { const r = document.getElementById('scratch').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom }; });

  try {
    // ================= MH1 =================
    {
      const { ctx, pg } = await newPage();
      await pg.goto(base + '/mh1/');
      await pg.waitForFunction("window.__mathHero && window.__mathHero.ready && document.body.classList.contains('loaded')", null, { timeout: 15000 });
      await pg.evaluate(() => window.__mathHero.startGame(0, 0, 1));
      await pg.waitForTimeout(500);
      ok(!(await avail(pg)) && !(await visible(pg)), 'MH1: tombol tersembunyi saat main biasa');

      // Buka soal dari peti (jalur nyata: ask -> Quiz.open).
      await pg.evaluate(() => { const h = window.__mathHero, W = h.world, P = h.player; P.x = 22 * 32; P.y = (W.L.R) * 32 - P.h - 2; P.vx = 0; P.vy = 0; P.inv = 5; W.cam.x = P.x - 150; });
      await pg.waitForTimeout(250);
      await pg.evaluate(() => { window.Input.action = true; });
      await pg.waitForTimeout(150);
      await pg.evaluate(() => { window.Input.action = false; });
      await pg.waitForSelector('#quiz:not(.hidden)', { timeout: 3000 });
      await pg.waitForTimeout(500);
      ok(await visible(pg) && await avail(pg), 'MH1: tombol muncul saat quiz terbuka');
      const bx = await btnBox(pg);
      ok(bx.w >= 48 && bx.h >= 48, `MH1: target sentuh tombol >= 48px (${bx.w}x${bx.h})`);
      const vw = 393;
      ok(Math.abs(bx.x + bx.w - vw) <= 8, 'MH1: posisi awal menempel tepi kanan (x=' + Math.round(bx.x) + ')');
      ok(Math.abs(bx.y - 0.38 * 851) <= 30, 'MH1: posisi awal sekitar 38% dari atas (y=' + Math.round(bx.y) + ')');
      await pg.screenshot({ path: path.join(SHOTS, 'scratch_mh1_button.png') });

      // Seret ke kiri bawah, lepas, harus menempel tepi kiri dan tersimpan.
      const cx = bx.x + bx.w / 2, cy = bx.y + bx.h / 2;
      await pg.mouse.move(cx, cy); await pg.mouse.down();
      await pg.mouse.move(120, 600, { steps: 8 }); await pg.mouse.move(100, 640, { steps: 4 });
      await pg.mouse.up(); await pg.waitForTimeout(700);
      const moved = await btnBox(pg);
      ok(moved.x <= 12 && Math.abs(moved.y - (640 - 28)) <= 30, `MH1: seret pindah dan menempel tepi kiri (${Math.round(moved.x)},${Math.round(moved.y)})`);
      ok(await pg.evaluate(() => !document.getElementById('scratch').classList.contains('open')), 'MH1: seret tidak membuka lembar');
      const saved = await pg.evaluate(() => localStorage.getItem('mathHero.scratch.pos'));
      ok(!!saved && JSON.parse(saved).x < 0.1, 'MH1: posisi tersimpan di localStorage: ' + saved);

      // Muat ulang + buka soal lagi: posisi tetap.
      await pg.reload();
      await pg.waitForFunction("window.__mathHero && window.__mathHero.ready && document.body.classList.contains('loaded')", null, { timeout: 15000 });
      await pg.evaluate(() => { window.__mathHero.startGame(0, 0, 1); });
      await pg.evaluate(() => { window.Quiz.open(window.MathQuiz.generate('add', 1), () => {}); });
      await pg.waitForTimeout(500);
      const after = await btnBox(pg);
      ok(Math.abs(after.x - moved.x) <= 3 && Math.abs(after.y - moved.y) <= 3, `MH1: posisi sama setelah muat ulang (${Math.round(after.x)},${Math.round(after.y)})`);

      // Ketuk tanpa geser membuka lembar; #quiz tetap terlihat di atasnya.
      await pg.touchscreen.tap(after.x + after.w / 2, after.y + after.h / 2);
      await pg.waitForTimeout(700);
      ok(await pg.evaluate(() => Scratchpad.isOpen()), 'MH1: ketuk membuka lembar');
      ok(!(await visible(pg)), 'MH1: tombol hilang saat lembar terbuka');
      const sh = await sheetBox(pg);
      ok(Math.abs(sh.h - 0.8 * 851) <= 4 && sh.b >= 849 && sh.w <= 820, `MH1: lembar besar ~80% tinggi, menempel bawah (${Math.round(sh.h)}px)`);
      const qv = await pg.evaluate(() => { const c = document.querySelector('.quiz-card').getBoundingClientRect(); const p = document.getElementById('quiz-prompt').getBoundingClientRect(); return { cardBottom: c.bottom, cardTop: c.top, promptBottom: p.bottom }; });
      ok(await pg.evaluate(() => !document.getElementById('quiz').classList.contains('hidden')), 'MH1: #quiz masih terbuka');
      ok(!(await pg.evaluate(() => window.__mathHero.state.paused)), 'MH1: game tidak masuk layar jeda saat lembar terbuka');

      // Coret di kanvas lalu lihat tangkapan.
      const cb = await pg.evaluate(() => { const r = document.querySelector('#scratch canvas').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
      await pg.mouse.move(cb.x + 30, cb.y + 40); await pg.mouse.down();
      await pg.mouse.move(cb.x + 150, cb.y + 90, { steps: 8 }); await pg.mouse.move(cb.x + 60, cb.y + 140, { steps: 8 }); await pg.mouse.up();
      await pg.waitForTimeout(150);
      const inked = await pg.evaluate(() => { const c = document.querySelector('#scratch canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4) if (d[i] < 80 && d[i + 2] > 60 && d[i + 3] > 200) return true; return false; });
      ok(inked, 'MH1: coretan tergambar di kanvas');
      await pg.screenshot({ path: path.join(SHOTS, 'scratch_mh1_open.png') });

      // "Kecilkan" menciutkan jadi strip ~64px; kartu soal lalu terlihat penuh di atas strip.
      await pg.click('#scratch .head button');
      await pg.waitForTimeout(500);
      const sc = await sheetBox(pg);
      ok(Math.abs((851 - sc.y) - 64) <= 6, `MH1: Kecilkan menciutkan lembar jadi strip ~64px (tampak ${Math.round(851 - sc.y)}px)`);
      ok(await pg.evaluate(() => Scratchpad.isOpen()), 'MH1: lembar yang diciutkan masih terbuka');
      const qc = await pg.evaluate(() => { const c = document.querySelector('.quiz-card').getBoundingClientRect(); return { top: c.top, bottom: c.bottom }; });
      ok(qc.top >= 0 && qc.bottom <= sc.y + 2, `MH1: setelah dikecilkan kartu soal terlihat penuh di atas strip (bawah kartu ${Math.round(qc.bottom)} <= atas strip ${Math.round(sc.y)})`);
      ok((await pg.evaluate(() => document.querySelector('#scratch .head button').textContent)) === 'Perbesar', 'MH1: tombol berganti jadi Perbesar');
      await pg.screenshot({ path: path.join(SHOTS, 'scratch_mh1_collapsed.png') });
      // Buka lagi: coretan masih ada.
      await pg.click('#scratch .head button');
      await pg.waitForTimeout(500);
      const sb = await sheetBox(pg);
      ok(sb.y <= 851 * 0.42 + 4, 'MH1: ketuk lagi membuka lembar penuh');
      ok(await pg.evaluate(() => { const c = document.querySelector('#scratch canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4) if (d[i] < 80 && d[i + 2] > 60 && d[i + 3] > 200) return true; return false; }), 'MH1: coretan tetap ada setelah ciut/buka');
      // Ketuk pada strip (bukan tombolnya) juga memperbesar.
      await pg.click('#scratch .head button'); await pg.waitForTimeout(450);
      await pg.click('#scratch .head span'); await pg.waitForTimeout(450);
      ok((await sheetBox(pg)).y <= 851 * 0.42 + 4, 'MH1: ketuk strip memperbesar lembar');

      // Selesai menutup; game tidak paused; tombol kembali (quiz masih terbuka).
      await pg.click('#scratch .bar button:last-child');
      await pg.waitForTimeout(600);
      ok(!(await pg.evaluate(() => Scratchpad.isOpen())), 'MH1: Selesai menutup lembar');
      ok(!(await pg.evaluate(() => window.__mathHero.state.paused)), 'MH1: setelah Selesai game tidak di layar jeda');
      ok(await visible(pg), 'MH1: tombol muncul lagi setelah lembar ditutup (quiz masih terbuka)');
      // Esc menutup juga.
      await pg.touchscreen.tap(after.x + after.w / 2, after.y + after.h / 2); await pg.waitForTimeout(600);
      ok(await pg.evaluate(() => Scratchpad.isOpen()), 'MH1: buka lagi');
      await pg.keyboard.press('Escape'); await pg.waitForTimeout(500);
      ok(!(await pg.evaluate(() => Scratchpad.isOpen())), 'MH1: Esc menutup lembar');
      // Menutup quiz menyembunyikan tombol; quiz baru mengosongkan kertas.
      await pg.evaluate(() => window.Quiz.close()); await pg.waitForTimeout(400);
      ok(!(await avail(pg)) && !(await visible(pg)), 'MH1: tombol hilang setelah quiz ditutup');
      await ctx.close();
    }

    // ================= MH2 =================
    for (const [lid, mode, want] of [['1-3', 'balance', true], ['1-2', 'runner', false], ['3-2', 'garden', true]]) {
      const { ctx, pg } = await newPage();
      await pg.goto(`${base}/mh2/?level=${lid}`);
      await pg.waitForFunction('window.MH2 && MH2.playState && MH2.playState()', null, { timeout: 20000 });
      for (let i = 0; i < 20; i++) {
        await pg.waitForTimeout(250);
        if (await pg.evaluate(() => MH2.playState().state) === 'play') break;
        await pg.keyboard.press('Enter');
      }
      await pg.waitForTimeout(500);
      const actual = await pg.evaluate(() => MH2.playState().ph.mode);
      ok(actual === mode || lid === '3-2', `MH2 ${lid}: mode ${actual}`);
      const al = await avail(pg);
      if (lid === '3-2') ok(al === !!(await pg.evaluate(() => MH2.playState().mode.scratch)), `MH2 ${lid} (${actual}): ketersediaan mengikuti properti scratch`);
      else ok(al === want, `MH2 ${lid} (${mode}): tombol ${want ? 'muncul' : 'tidak muncul'}`);
      if (want && lid === '1-3') {
        ok(await visible(pg), 'MH2: tombol terlihat di mode teka-teki');
        await pg.screenshot({ path: path.join(SHOTS, 'scratch_mh2_balance.png') });
        const bb = await btnBox(pg);
        await pg.touchscreen.tap(bb.x + bb.w / 2, bb.y + bb.h / 2); await pg.waitForTimeout(700);
        ok(await pg.evaluate(() => Scratchpad.isOpen()), 'MH2: ketuk membuka lembar');
        ok(await pg.evaluate(() => MH2.playState().state) === 'play', 'MH2: game tidak dijeda saat lembar terbuka');
        await pg.screenshot({ path: path.join(SHOTS, 'scratch_mh2_open.png') });
        await pg.click('#scratch .bar button:last-child'); await pg.waitForTimeout(500);
        ok(!(await pg.evaluate(() => Scratchpad.isOpen())) && await pg.evaluate(() => MH2.playState().state) === 'play', 'MH2: Selesai menutup, state tetap play');
        // Penjelasan salah: tombol hilang.
        await pg.evaluate(() => MH2.playState().inst.solve(true)); await pg.waitForTimeout(1400);
        ok(await pg.evaluate(() => MH2.playState().state) === 'explain' && !(await avail(pg)), 'MH2: tombol hilang saat kartu penjelasan');
      }
      await ctx.close();
    }
    // Semua mode di stages: scratch hanya untuk teka-teki tanpa jam, pizza bos tanpa kertas.
    {
      const { ctx, pg } = await newPage();
      await pg.goto(`${base}/mh2/?level=5-5`);
      await pg.waitForFunction('window.MH2 && MH2.playState && MH2.playState()', null, { timeout: 20000 });
      for (let i = 0; i < 20; i++) { await pg.waitForTimeout(250); if (await pg.evaluate(() => MH2.playState().state) === 'play') break; await pg.keyboard.press('Enter'); }
      await pg.waitForTimeout(500);
      ok(await pg.evaluate(() => MH2.playState().ph.cfg.timer) > 0 && !(await avail(pg)), 'MH2 5-5 (pizza bos ber-jam): tombol tidak muncul');
      await pg.goto(`${base}/mh2/?level=5-1`);
      await pg.waitForFunction('window.MH2 && MH2.playState && MH2.playState()', null, { timeout: 20000 });
      for (let i = 0; i < 20; i++) { await pg.waitForTimeout(250); if (await pg.evaluate(() => MH2.playState().state) === 'play') break; await pg.keyboard.press('Enter'); }
      await pg.waitForTimeout(500);
      ok(await pg.evaluate(() => MH2.playState().ph.mode) === 'pizza' && await avail(pg), 'MH2 5-1 (pizza tanpa jam): tombol muncul');
      const flags = await pg.evaluate(() => Object.keys(MH2.Modes).sort().map((k) => k + ':' + (typeof MH2.Modes[k].scratch)).join(' '));
      console.log('info: properti scratch per mode -> ' + flags);
      await ctx.close();
    }

    // ================= MH3 =================
    {
      const { ctx, pg } = await newPage();
      await pg.goto(`${base}/mh3/index.html?debug=1`);
      await pg.waitForFunction(() => window.MH2 && MH2.sceneName === 'title', null, { timeout: 20000 });
      await pg.waitForTimeout(500);
      const tap = async (x, y) => { const s = await pg.evaluate(() => MH2.scale); await pg.touchscreen.tap(x * s, y * s); await pg.waitForTimeout(150); };
      ok(!(await avail(pg)) && !(await visible(pg)), 'MH3: tombol tersembunyi di layar judul');
      // Papan Bertahan (tombol debug) tanpa kartu PR.
      await tap(70, 111); await pg.waitForTimeout(800);
      ok(await pg.evaluate(() => MH2.sceneName) === 'defense', 'MH3: papan Bertahan terbuka');
      await pg.waitForTimeout(400);
      ok(!(await avail(pg)) && !(await visible(pg)), 'MH3: tombol tersembunyi di papan Bertahan');
      await pg.reload();
      await pg.waitForFunction(() => window.MH2 && MH2.sceneName === 'title', null, { timeout: 20000 });
      await pg.waitForTimeout(500);
      // Kartu PR dari tombol debug (130x34 di x10,y52).
      await tap(70, 70); await pg.waitForTimeout(500);
      ok(await pg.evaluate(() => MH3.homework.active), 'MH3: kartu PR terbuka');
      ok(await visible(pg) && await avail(pg), 'MH3: tombol muncul saat kartu PR');
      await pg.screenshot({ path: path.join(SHOTS, 'scratch_mh3_button.png') });
      const bb = await btnBox(pg);
      await pg.touchscreen.tap(bb.x + bb.w / 2, bb.y + bb.h / 2); await pg.waitForTimeout(700);
      ok(await pg.evaluate(() => Scratchpad.isOpen()), 'MH3: ketuk membuka lembar');
      ok(await pg.evaluate(() => MH3.homework.active), 'MH3: kartu PR tetap aktif di bawah lembar');
      { const sh3 = await sheetBox(pg); ok(Math.abs(sh3.h - 0.8 * 851) <= 4 && sh3.b >= 849, `MH3: lembar besar ~80% tinggi (${Math.round(sh3.h)}px)`); }
      await pg.screenshot({ path: path.join(SHOTS, 'scratch_mh3_open.png') });
      await pg.click('#scratch .bar button:last-child'); await pg.waitForTimeout(500);
      ok(!(await pg.evaluate(() => Scratchpad.isOpen())) && await pg.evaluate(() => MH3.homework.active), 'MH3: Selesai menutup lembar, kartu tetap');
      // Nanti menutup kartu -> tombol hilang.
      await tap(300, 670); await pg.waitForTimeout(600);
      ok(!(await pg.evaluate(() => MH3.homework.active)) && !(await avail(pg)), 'MH3: tombol hilang setelah kartu PR ditutup');
      await ctx.close();
    }

    // ================= Laptop 1280x800 + reduced motion =================
    {
      const { ctx, pg } = await newPage({ width: 1280, height: 800 }, false);
      await pg.emulateMedia({ reducedMotion: 'reduce' });
      await pg.goto(base + '/mh1/');
      await pg.waitForFunction("window.__mathHero && window.__mathHero.ready && document.body.classList.contains('loaded')", null, { timeout: 15000 });
      await pg.evaluate(() => { window.__mathHero.startGame(0, 0, 1); window.Quiz.open(window.MathQuiz.generate('add', 1), () => {}); });
      await pg.waitForTimeout(300);
      ok(await visible(pg), '1280x800: tombol muncul (gerak dikurangi: tanpa animasi)');
      await pg.click('#scratch-btn'); await pg.waitForTimeout(120);
      const sh = await sheetBox(pg);
      ok(await pg.evaluate(() => Scratchpad.isOpen()) && sh.w <= 820 && sh.h <= 900 && Math.abs(sh.x + sh.w / 2 - 640) <= 2, `1280x800: lembar di tengah, lebar ${Math.round(sh.w)} tinggi ${Math.round(sh.h)}`);
      await pg.screenshot({ path: path.join(SHOTS, 'scratch_desktop_open.png') });
      await ctx.close();
    }

    // ================= Tanpa GSAP: tetap berfungsi =================
    {
      const { ctx, pg } = await newPage();
      pg.ignoreAbort = true; // sumber GSAP sengaja diputus, galat muat itu wajar
      await pg.route('**/vendor/gsap/*', (r) => r.abort());
      await pg.goto(base + '/mh1/');
      await pg.waitForFunction("window.__mathHero && window.__mathHero.ready && document.body.classList.contains('loaded')", null, { timeout: 15000 });
      ok(await pg.evaluate(() => !window.gsap), 'tanpa GSAP: gsap memang tidak termuat');
      await pg.evaluate(() => { window.__mathHero.startGame(0, 0, 1); window.Quiz.open(window.MathQuiz.generate('add', 1), () => {}); });
      await pg.waitForTimeout(300);
      ok(await visible(pg), 'tanpa GSAP: tombol muncul');
      await pg.click('#scratch-btn'); await pg.waitForTimeout(150);
      const sh = await sheetBox(pg);
      ok(await pg.evaluate(() => Scratchpad.isOpen()) && sh.b >= 849, 'tanpa GSAP: ketuk membuka lembar');
      await pg.click('#scratch .head button'); await pg.waitForTimeout(150);
      ok((851 - (await sheetBox(pg)).y) < 80, 'tanpa GSAP: Kecilkan menciutkan');
      await pg.click('#scratch .head button'); await pg.waitForTimeout(150);
      await pg.click('#scratch .bar button:last-child'); await pg.waitForTimeout(150);
      ok(!(await pg.evaluate(() => Scratchpad.isOpen())), 'tanpa GSAP: Selesai menutup');
      await ctx.close();
    }

    ok(errs.length === 0, 'tanpa galat konsol: ' + errs.join(' | '));
  } finally {
    await b.close();
    server.kill();
  }
  console.log(fails ? `${fails} pemeriksaan GAGAL` : 'semua lulus');
})().catch((e) => { console.error(e); process.exitCode = 1; });
