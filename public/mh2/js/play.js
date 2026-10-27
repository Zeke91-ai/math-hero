// Math Hero 2: adegan bermain. Menjalankan satu level (atau beberapa babak untuk bos terakhir) dengan mode yang dipilih,
// lalu mengurus HUD, kartu konsep di awal, penjelasan saat salah, jeda, kalah, dan hitungan bintang.
//
// Antarmuka mode (lihat js/modes/*.js):
//   M.Modes[nama] = { nama, ikon, concept(cfg) -> {judul, baris[], demo(g, t, x, y, w, h)}, controls(cfg) -> {joy, a, b} | null,
//                    create(P) -> { update(dt), draw(g), tap?(x,y), pointerDown?, pointerMove?, pointerUp? } }
// P (objek level) dipakai mode untuk melapor: P.correct(), P.mistake(), P.hurt(), P.taskDone(), dll.
(function () {
  const M = window.MH2;
  const C = window.MH2Concepts;
  M.Modes = {};
  const HEARTS = 3;
  const HUD_H = 52;
  M.HUD_H = HUD_H;

  // Bintang: tanpa salah = 3, salah 1-2 kali = 2, lebih dari itu = 1. Selesai level selalu dapat minimal 1.
  M.starsFor = (mistakes) => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1);

  let S = null; // keadaan level yang sedang dimainkan
  M.playState = () => S; // untuk uji

  function phasesOf(L) { return L.phases || [L]; }

  function startPhase(i) {
    const L = S.level, ph = phasesOf(L)[i];
    S.phase = i;
    S.ph = ph;
    S.mode = M.Modes[ph.mode];
    // Berkas mode belum termuat (misalnya halaman lama di cache): jangan lanjut ke layar kosong.
    if (!S.mode) throw new Error(`Mode ${ph.mode} belum termuat`);
    S.done = 0;
    S.state = 'intro';
    S.introT = 0;
    S.inst = null;
    M.setControls(null);
    M.audio.music(null);
  }

  function begin() {
    const ph = S.ph;
    S.state = 'play';
    S.P = makeP(ph);
    S.inst = S.mode.create(S.P);
    M.setControls(S.mode.controls ? S.mode.controls(ph.cfg) : null);
    M.audio.jingle('mulai');
    setTimeout(() => { if (S && S.state === 'play') M.audio.music(S.level.boss ? (S.level.final ? 'final' : 'bos') : M.STAGES[S.level.stage - 1].musik); }, 500);
  }

  // ---------- Objek P untuk mode ----------
  function makeP(ph) {
    // Mode memakai setTimeout; laporan yang datang setelah level ditinggalkan diabaikan.
    const own = S;
    const alive = () => S === own && M.sceneName === 'play';
    const P = {
      cfg: ph.cfg, tasks: ph.tasks, theme: ph.tema || S.level.tema, level: S.level, boss: !!S.level.boss,
      C, get done() { return S.done; }, get hearts() { return S.hearts; }, get t() { return S.time; },
      top: HUD_H + 4,
      // Jawaban benar: tambah skor, bunyi, efek, dan pesan singkat (opsional).
      correct(o) {
        if (!alive()) return;
        o = o || {};
        const pts = o.pts !== undefined ? o.pts : 100;
        S.score += pts; S.correct++;
        M.sfx(o.sfx || 'benar');
        if (o.x !== undefined) {
          M.fx.float(o.text || `+${pts}`, o.x, o.y - 10, '#ffd54a', 20);
          M.fx.burst(o.x, o.y, { n: 14, color: ['#ffd54a', '#fff', '#64e3ff'], speed: 160 });
        }
        if (o.say) M.toast(o.say, 1600, '#d8ffd4');
      },
      // Jawaban salah: tidak menghukum keras. Tampilkan penjelasan konsep (lembut di mode aksi, kartu di mode teka-teki).
      mistake(lines, o) {
        if (!alive()) return;
        o = o || {};
        S.mistakes++;
        M.sfx('salah');
        if (o.x !== undefined) M.fx.float(o.text || 'Ups!', o.x, o.y - 10, '#ff8fab', 18);
        if (lines && lines.length) {
          if (o.soft) showHint(lines, o.ms || 3800, o.top);
          else openExplain(lines, o);
        }
      },
      hurt(n, x, y) {
        if (!alive() || S.state !== 'play') return;
        S.hearts = Math.max(0, S.hearts - (n || 1));
        S.mistakes++;
        S.shake = 0.35;
        M.sfx('hit');
        if (x !== undefined) M.fx.burst(x, y, { n: 10, color: ['#ff5d73', '#fff'], speed: 140 });
        if (S.hearts <= 0) setTimeout(fail, 700);
      },
      heal() { if (S.hearts < HEARTS) { S.hearts++; M.sfx('ambil'); } },
      addScore(n, x, y) { if (!alive()) return; S.score += n; if (x !== undefined) M.fx.float(`+${n}`, x, y, '#ffd54a', 16); },
      // Satu tugas selesai. Jika semua tugas babak ini selesai, lanjut babak berikut atau menang.
      taskDone() {
        if (!alive()) return;
        S.done++;
        if (S.done >= S.ph.tasks) {
          S.state = 'clear'; S.clearT = 0;
          M.setControls(null);
          M.audio.music(null);
          M.sfx('naik');
        }
      },
      say(text, ms, color) { M.toast(text, ms || 2000, color); },
      shake(t) { S.shake = Math.max(S.shake, t || 0.3); },
      paused: () => S.state !== 'play',
      questionBox(g, text, sub, o) { questionBox(g, text, sub, o); },
      bossBar(g, nama, hp, max, color) { bossBar(g, nama, hp, max, color); },
    };
    return P;
  }

  // ---------- Penjelasan ----------
  function openExplain(lines, o) {
    S.explain = { lines, title: o.title || 'Ayo pahami!', visual: o.visual || null, t: 0, btn: o.btn || 'Coba lagi', after: o.after || null };
    S.prevState = S.state;
    S.state = 'explain';
    M.setControls(null);
  }
  function closeExplain() {
    const after = S.explain && S.explain.after;
    S.explain = null;
    S.state = 'play';
    M.setControls(S.mode.controls ? S.mode.controls(S.ph.cfg) : null);
    if (after) after();
  }
  function showHint(lines, ms, top) { S.hint = { lines, until: S.time + ms / 1000, top: !!top }; }

  function fail() {
    if (!S || S.state === 'fail') return;
    S.state = 'fail'; S.failT = 0;
    M.setControls(null);
    M.audio.jingle('kalah');
  }

  function finishLevel() {
    const L = S.level;
    const stars = M.starsFor(S.mistakes);
    const bonus = S.bonus.value();
    const score = S.score + bonus + S.hearts * 50 + stars * 100;
    const firstClear = M.save.starsOf(L.id) === 0;
    const starsBefore = M.save.totalStars();
    const rec = M.save.record(L.id, stars, score);
    // Papan skor bersama (opsional): total skor terbaik semua level.
    if (rec.newBest && window.Scores && M.save.active) window.Scores.submit('math-hero', 'mh2', M.save.active.nama, M.save.totalScore(), { level: L.id, hero: M.save.active.hero, stars: M.save.totalStars() });
    // Pahlawan yang baru terbuka karena tambahan bintang ini.
    const unlocked = M.HEROES.filter((h) => h.need > starsBefore && h.need <= M.save.totalStars());
    M.go('result', { level: L, stars, score, bonus, seconds: S.bonus.seconds(), mistakes: S.mistakes, correct: S.correct, hearts: S.hearts, newBest: rec.newBest, firstClear, unlocked });
  }

  // ---------- HUD ----------
  function drawHud(g) {
    g.fillStyle = 'rgba(29,20,56,0.85)';
    g.fillRect(0, 0, M.VW, HUD_H);
    g.fillStyle = '#ffd54a'; g.fillRect(0, HUD_H - 3, M.VW, 3);
    M.button(g, { id: 'jeda', x: 6, y: 6, w: 38, h: 36, color: 'purple', icon: 'pause', onTap: openPause });
    M.hearts(g, 52, 15, S.hearts, HEARTS, 3);
    // Progres tugas: bulatan kecil.
    const n = S.ph.tasks, dw = Math.min(16, 120 / n), x0 = 152;
    for (let i = 0; i < n; i++) {
      const done = i < S.done;
      M.box(g, x0 + i * dw, 18, dw - 3, 14, done ? '#ffd54a' : '#4b3a7a', { border: 2, shade: false });
    }
    M.text(g, M.fmt(S.score), M.VW - 10, 25, { size: 18, align: 'right', color: '#ffd54a', font: M.NUMFONT });
    M.text(g, `Bonus ${S.bonus.value()}`, M.VW - 10, 44, { size: 11, align: 'right', color: '#cbbcff' });
    if (phasesOf(S.level).length > 1) M.text(g, `Babak ${S.phase + 1}/${phasesOf(S.level).length}`, x0, 44, { size: 11, color: '#cbbcff' });
  }

  // Kotak soal di bawah HUD.
  function questionBox(g, text, sub, o) {
    o = o || {};
    const y = o.y || HUD_H + 8, h = sub ? 58 : 40;
    // Teks dikecilkan sampai muat satu baris agar kotak soal tidak menutupi permainan.
    const fit = (str, size, min) => { while (size > min && M.measure(g, str, size) > M.VW - 36) size--; return size; };
    M.box(g, 10, y, M.VW - 20, h, o.fill || '#fff6dc', { line: '#2b1d52' });
    M.text(g, text, M.VW / 2, y + (sub ? 20 : h / 2), { size: fit(text, Math.round(o.size || 22), 12), align: 'center', color: '#2b1d52', outline: false });
    if (sub) M.text(g, sub, M.VW / 2, y + 42, { size: fit(sub, 13, 9), align: 'center', color: '#6b4fa8', outline: false });
  }
  function bossBar(g, nama, hp, max, color) {
    const y = HUD_H + 4;
    M.text(g, nama, 14, y + 10, { size: 13, color: '#fff' });
    const w = M.VW - 28;
    g.fillStyle = '#1d1438'; g.fillRect(14, y + 18, w, 10);
    g.fillStyle = color || '#ff5d73'; g.fillRect(16, y + 20, Math.round((w - 4) * Math.max(0, hp) / max), 6);
    for (let i = 1; i < max; i++) { g.fillStyle = '#1d1438'; g.fillRect(14 + Math.round(w * i / max), y + 18, 2, 10); }
  }

  // ---------- Jeda ----------
  function openPause() {
    if (S.state !== 'play') return;
    S.prevState = S.state; S.state = 'pause'; S.pauseAt = M.t;
    M.setControls(null);
    M.audio.setPaused(true);
  }
  function closePause() {
    S.state = 'play';
    M.audio.setPaused(false);
    M.setControls(S.mode.controls ? S.mode.controls(S.ph.cfg) : null);
  }

  // ---------- Kartu konsep (awal babak) ----------
  function drawIntro(g) {
    const L = S.level, ph = S.ph, mode = S.mode;
    M.drawBg(g, ph.tema || L.tema, M.t * 20, 0);
    g.fillStyle = 'rgba(29,20,56,0.55)'; g.fillRect(0, 0, M.VW, M.VH);
    const k = M.ease(S.introT * 3);
    const cy = M.VH / 2 + (1 - k) * 80;
    const con = mode.concept(ph.cfg, L);
    const w = M.VW - 28, h = Math.min(M.VH - 60, 470), x = 14, y = cy - h / 2;
    g.globalAlpha = k;
    M.panel(g, x, y, w, h, { title: L.boss ? (L.final ? 'BOS TERAKHIR' : 'BOS') : `Level ${L.id}`, titleFill: L.boss ? '#ff5d73' : '#7b4bd6' });
    M.text(g, ph.judul || L.nama, M.VW / 2, y + 34, { size: 24, align: 'center', color: '#2b1d52', outline: false });
    M.text(g, `${mode.nama}`, M.VW / 2, y + 58, { size: 14, align: 'center', color: '#7b4bd6', outline: false });
    if (L.boss) {
      const bos = M.STAGES[L.stage - 1].bos;
      M.drawBoss(g, bos.sprite, x + 34, y + 66, bos.sprite === 'prof' ? 1.6 : 1.4, S.introT);
      M.drawBoss(g, bos.sprite, x + w - 34, y + 66, bos.sprite === 'prof' ? 1.6 : 1.4, S.introT + 0.5, { flip: true, dir: 'r' });
    }
    // Kotak demo animasi konsep.
    const dx = x + 16, dy = y + 74, dw = w - 32, dh = 170;
    M.box(g, dx, dy, dw, dh, '#e9f6ff', { line: '#2b1d52', shade: false });
    g.save(); g.beginPath(); g.rect(dx + 3, dy + 3, dw - 6, dh - 6); g.clip();
    if (con.demo) con.demo(g, S.introT, dx + 3, dy + 3, dw - 6, dh - 6);
    g.restore();
    M.text(g, con.judul, M.VW / 2, dy + dh + 20, { size: 18, align: 'center', color: '#d65f82', outline: false, maxW: w - 30 });
    let ty = dy + dh + 44;
    con.baris.forEach((line) => { ty += M.text(g, line, M.VW / 2, ty, { size: 14, align: 'center', color: '#2b1d52', outline: false, maxW: w - 36, base: 'top' }) + 4; });
    const ctl = mode.controls ? mode.controls(ph.cfg) : null;
    const ctlText = ctl ? [ctl.joy ? 'Joystick: gerak' : null, ctl.a ? `A: ${ctl.a}` : null, ctl.b ? `B: ${ctl.b}` : null].filter(Boolean).join('  |  ') : 'Ketuk layar untuk bermain';
    M.text(g, ctlText, M.VW / 2, y + h - 82, { size: 12, align: 'center', color: '#6b4fa8', outline: false });
    M.button(g, { id: 'mulai', x: M.VW / 2 - 90, y: y + h - 64, w: 180, h: 48, label: 'Mulai!', color: 'pink', size: 22, onTap: begin });
    g.globalAlpha = 1;
    if (S.introT > 0.4 && (M.input.bHit || M.input.aHit)) begin();
  }

  function drawExplain(g) {
    const E = S.explain;
    g.fillStyle = 'rgba(29,20,56,0.6)'; g.fillRect(0, 0, M.VW, M.VH);
    const k = M.ease(E.t * 4);
    const hv = E.visual ? 140 : 0;
    g.font = `16px ${M.FONT}`;
    const nLines = E.lines.reduce((s, l) => s + M.wrap(g, l, M.VW - 90).length, 0);
    const h = 120 + hv + nLines * 22, w = M.VW - 28, x = 14, y = M.VH / 2 - h / 2 + (1 - k) * 60;
    g.globalAlpha = k;
    M.panel(g, x, y, w, h, { title: E.title, titleFill: '#ffb347' });
    M.art(g, 'peri', x + 12, y + 20, 3);
    let ty = y + 26;
    if (E.visual) {
      M.box(g, x + 58, ty, w - 72, hv - 8, '#e9f6ff', { line: '#2b1d52', shade: false });
      g.save(); g.beginPath(); g.rect(x + 61, ty + 3, w - 78, hv - 14); g.clip();
      E.visual(g, E.t, x + 61, ty + 3, w - 78, hv - 14);
      g.restore();
      ty += hv;
    }
    E.lines.forEach((l, i) => {
      // Baris muncul satu per satu agar anak membaca langkahnya berurutan.
      g.globalAlpha = k * M.clamp((E.t - i * 0.5) * 3, 0, 1);
      ty += M.text(g, l, x + 60, ty, { size: 16, color: '#2b1d52', outline: false, maxW: w - 76, base: 'top' }) + 4;
    });
    g.globalAlpha = k;
    const ready = E.t > Math.min(2.5, E.lines.length * 0.5);
    M.button(g, { id: 'ok', x: M.VW / 2 - 80, y: y + h - 58, w: 160, h: 44, label: E.btn, color: ready ? 'green' : 'gray', disabled: !ready, onTap: closeExplain });
    g.globalAlpha = 1;
    if (ready && M.input.bHit) closeExplain();
  }

  function drawHint(g) {
    const H = S.hint;
    if (!H || S.time > H.until) return;
    g.font = `14px ${M.FONT}`;
    const n = H.lines.reduce((s, l) => s + M.wrap(g, l, M.VW - 80).length, 0);
    const h = 18 + n * 18, y = H.top ? M.HUD_H + 100 : M.VH - 190 - h;
    const a = Math.min(1, (H.until - S.time) * 2);
    g.globalAlpha = a;
    M.box(g, 10, y, M.VW - 20, h, '#fff3c4', { line: '#2b1d52' });
    M.art(g, 'peri', 16, y + 6, 2);
    let ty = y + 10;
    H.lines.forEach((l) => { ty += M.text(g, l, 50, ty, { size: 14, color: '#2b1d52', outline: false, maxW: M.VW - 76, base: 'top', lh: 18 }); });
    g.globalAlpha = 1;
  }

  function drawPause(g) {
    g.fillStyle = 'rgba(29,20,56,0.7)'; g.fillRect(0, 0, M.VW, M.VH);
    const w = 260, h = 330, x = M.VW / 2 - w / 2, y = M.VH / 2 - h / 2;
    M.panel(g, x, y, w, h, { title: 'Jeda' });
    const pr = M.audio.prefs;
    M.button(g, { id: 'lanjut', x: x + 30, y: y + 36, w: w - 60, h: 46, label: 'Lanjut', color: 'green', onTap: closePause });
    M.button(g, { id: 'ulang', x: x + 30, y: y + 94, w: w - 60, h: 46, label: 'Ulangi level', color: 'orange', onTap: () => { M.audio.setPaused(false); M.go('play', { level: S.level }); } });
    M.button(g, { id: 'peta', x: x + 30, y: y + 152, w: w - 60, h: 46, label: 'Ke peta', color: 'blue', onTap: () => { M.audio.setPaused(false); M.go('map', { stage: S.level.stage }); } });
    M.button(g, { id: 'musik', x: x + 30, y: y + 214, w: (w - 70) / 2, h: 42, label: pr.music ? 'Musik ON' : 'Musik OFF', size: 14, color: pr.music ? 'purple' : 'gray', onTap: () => M.audio.setMusicOn(!pr.music) });
    M.button(g, { id: 'efek', x: x + 40 + (w - 70) / 2, y: y + 214, w: (w - 70) / 2, h: 42, label: pr.sfx ? 'Efek ON' : 'Efek OFF', size: 14, color: pr.sfx ? 'purple' : 'gray', onTap: () => M.audio.setSfxOn(!pr.sfx) });
    M.text(g, `Level ${S.level.id}: ${S.level.nama}`, M.VW / 2, y + h - 30, { size: 13, align: 'center', color: '#6b4fa8', outline: false });
    if (M.input.pause && M.t - S.pauseAt > 0.2) closePause();
  }

  function drawFail(g) {
    g.fillStyle = 'rgba(29,20,56,0.75)'; g.fillRect(0, 0, M.VW, M.VH);
    const k = M.ease(S.failT * 3);
    const w = 280, h = 260, x = M.VW / 2 - w / 2, y = M.VH / 2 - h / 2 + (1 - k) * 50;
    g.globalAlpha = k;
    M.panel(g, x, y, w, h, { title: 'Hati habis!', titleFill: '#ff5d73' });
    M.hero(g, M.save.active ? M.save.active.hero : 'pinki', 'hurt', M.t, M.VW / 2, y + 100, { scale: 2.5 });
    M.text(g, 'Tidak apa-apa! Pahlawan juga\nbelajar dari jatuh. Coba lagi?', M.VW / 2, y + 128, { size: 15, align: 'center', color: '#2b1d52', outline: false });
    M.button(g, { id: 'coba', x: x + 24, y: y + 176, w: 130, h: 46, label: 'Coba lagi', color: 'green', onTap: () => M.go('play', { level: S.level }) });
    M.button(g, { id: 'kepeta', x: x + 164, y: y + 176, w: 92, h: 46, label: 'Peta', color: 'blue', onTap: () => M.go('map', { stage: S.level.stage }) });
    g.globalAlpha = 1;
  }

  function drawClear(g) {
    const k = M.ease(S.clearT * 2);
    g.fillStyle = `rgba(255,246,220,${0.25 * k})`; g.fillRect(0, 0, M.VW, M.VH);
    const last = S.phase + 1 >= phasesOf(S.level).length;
    M.text(g, last ? 'BERHASIL!' : 'Babak selesai!', M.VW / 2, M.VH * 0.42, { size: 40 * (0.6 + 0.4 * k), align: 'center', color: '#ffd54a', ow: 7 });
    if (S.clearT > 0.2 && S.clearT < 0.3) M.fx.confetti();
  }

  // ---------- Adegan ----------
  M.register('play', {
    enter(p) {
      S = { level: p.level, hearts: HEARTS, score: 0, mistakes: 0, correct: 0, time: 0, shake: 0, hint: null, bonus: window.TimeBonus.forGame('mh2') };
      startPhase(0);
    },
    exit() { M.audio.setPaused(false); },
    blur() { if (S && S.state === 'play') openPause(); },
    update(dt) {
      if (!S) return;
      if (S.state === 'intro') { S.introT += dt; return; }
      if (S.state === 'explain') { S.explain.t += dt; return; }
      if (S.state === 'pause' || S.state === 'fail') { if (S.state === 'fail') S.failT += dt; return; }
      if (S.state === 'clear') {
        S.clearT += dt;
        if (S.inst && S.inst.update) S.inst.update(dt * 0.3);
        if (S.clearT > 1.6) {
          if (S.phase + 1 < phasesOf(S.level).length) startPhase(S.phase + 1);
          else { S.state = 'done'; finishLevel(); }
        }
        return;
      }
      if (S.state !== 'play') return;
      if (M.input.pause) { openPause(); return; }
      S.time += dt;
      S.bonus.tick(dt); // hanya saat state 'play': intro, penjelasan, jeda, dan layar hasil tidak menghitung
      S.shake = Math.max(0, S.shake - dt);
      if (S.inst && S.inst.update) S.inst.update(dt);
    },
    draw(g) {
      if (!S) return;
      if (S.state === 'intro') { drawIntro(g); return; }
      g.save();
      if (S.shake > 0) g.translate(Math.round((Math.random() - 0.5) * 8 * S.shake / 0.35), Math.round((Math.random() - 0.5) * 6 * S.shake / 0.35));
      if (S.inst) S.inst.draw(g);
      M.fx.draw(g);
      g.restore();
      drawHud(g);
      drawHint(g);
      M.drawToast(g, HUD_H + 70);
      if (S.state === 'clear') drawClear(g);
      if (S.state === 'explain') drawExplain(g);
      if (S.state === 'pause') drawPause(g);
      if (S.state === 'fail') drawFail(g);
    },
    tap(x, y) { if (S && S.state === 'play' && S.inst && S.inst.tap) S.inst.tap(x, y); },
    pointerDown(x, y) { if (S && S.state === 'play' && S.inst && S.inst.pointerDown) S.inst.pointerDown(x, y); },
    pointerMove(x, y) { if (S && S.state === 'play' && S.inst && S.inst.pointerMove) S.inst.pointerMove(x, y); },
    pointerUp(x, y) { if (S && S.state === 'play' && S.inst && S.inst.pointerUp) S.inst.pointerUp(x, y); },
  });

  // Untuk tes otomatis dan debugging (?debug=1).
  M.playState = () => S;
})();
