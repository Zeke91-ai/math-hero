// Mode "Lompat Bilangan": platformer di atas batu-batu bernomor (garis bilangan) di sungai.
// Konsep: tambah = maju, kurang = mundur, perkalian = lompatan sama besar, puluhan = lompatan +10, pecahan = 1 bagian.
// Joystick kiri/kanan melompat satu batu (atau satu lompatan), A = lompat +10 (mode puluhan), B = "Di sini!".
// Setiap lompatan meninggalkan busur berlabel (+1, +10, -1) sehingga anak melihat proses hitungnya.
(function () {
  const M = window.MH2, C = window.MH2Concepts;
  const SP = 44;           // jarak antar batu (piksel logis)
  const HOP = 0.24;        // lama satu lompatan (detik)

  // Gambar garis bilangan mini untuk kartu konsep dan penjelasan: busur lompatan muncul bergantian.
  function miniLine(g, t, x, y, w, h, o) {
    const n = o.max - o.min, sp = (w - 30) / n, base = y + h * 0.7;
    const px = (v) => x + 15 + (v - o.min) * sp;
    g.fillStyle = '#2b1d52'; g.fillRect(x + 8, base, w - 16, 3);
    for (let v = o.min; v <= o.max; v++) {
      const big = !o.den || v % o.den === 0;
      g.fillRect(Math.round(px(v)) - 1, base - (big ? 6 : 3), 2, big ? 12 : 7);
      if (big || n <= 12) M.text(g, o.den ? C.fracLabel(v, o.den) : String(v), px(v), base + 16, { size: n > 14 && !big ? 8 : 11, align: 'center', color: '#2b1d52', outline: false });
    }
    const hops = o.hops, per = 0.55, cyc = (hops.length + 2) * per;
    const k = (t % cyc) / per;
    let pos = o.start;
    for (let i = 0; i < hops.length; i++) {
      const d = hops[i], to = pos + d;
      const u = M.clamp(k - i, 0, 1);
      if (u > 0) {
        g.strokeStyle = d > 0 ? '#d65f82' : '#2d6fc4'; g.lineWidth = 2; g.beginPath();
        const a = px(pos), b = px(to), mid = (a + b) / 2, hh = Math.min(28, Math.abs(b - a) * 0.6 + 8);
        for (let s = 0; s <= u; s += 0.05) { const xx = M.lerp(a, b, s), yy = base - 4 - Math.sin(Math.PI * s) * hh; if (s === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy); }
        g.stroke();
        if (u >= 1) M.text(g, (d > 0 ? '+' : '') + (o.den ? `${d}/${o.den}` : d), mid, base - hh - 10, { size: 10, align: 'center', color: d > 0 ? '#d65f82' : '#2d6fc4', outline: false });
      }
      if (u >= 1) pos = to;
      else if (u > 0) { pos = M.lerp(pos, to, u); break; } else break;
    }
    const heroX = px(Math.min(Math.max(pos, o.min), o.max));
    M.hero(g, M.save.active ? M.save.active.hero : 'pinki', 'idle', t, heroX, base - 4, { scale: 1 });
    if (k >= hops.length) {
      M.box(g, px(o.start + hops.reduce((a, b) => a + b, 0)) - 14, y + 6, 28, 22, '#ffd54a', { line: '#2b1d52', shade: false });
      M.text(g, o.den ? C.fracLabel(o.start + hops.reduce((a, b) => a + b, 0), o.den) : String(o.start + hops.reduce((a, b) => a + b, 0)), px(o.start + hops.reduce((a, b) => a + b, 0)), y + 17, { size: 12, align: 'center', color: '#2b1d52', outline: false });
    }
  }

  function hopList(task) {
    if (task.kind === 'tens') {
      const b = task.target - task.start;
      return [...Array(Math.floor(b / 10)).fill(10), ...Array(b % 10).fill(1)];
    }
    return Array(task.hops).fill(task.dir * task.step);
  }

  const CONCEPTS = {
    add: { judul: 'Tambah = maju di garis bilangan', baris: ['Mulai dari angka pertama.', 'Lompat MAJU sebanyak angka kedua.', 'Tekan B saat sampai di jawaban!'], demo: { min: 0, max: 10, start: 3, hops: [1, 1, 1, 1] } },
    sub: { judul: 'Kurang = mundur di garis bilangan', baris: ['Mulai dari angka pertama.', 'Lompat MUNDUR sebanyak angka kedua.', 'Tekan B saat sampai di jawaban!'], demo: { min: 0, max: 10, start: 8, hops: [-1, -1, -1] } },
    missing: { judul: 'Berapa langkah lagi?', baris: ['Lompat dari angka awal ke angka tujuan.', 'Banyaknya lompatan adalah jawabannya.', 'Tekan B di angka tujuan.'], demo: { min: 0, max: 10, start: 4, hops: [1, 1, 1] } },
    skip: { judul: 'Perkalian = lompatan sama besar', baris: ['3 x 4 artinya lompat 3-3 sebanyak 4 kali.', 'Lompatan selalu sama besar.', 'Tekan B di tempat mendarat terakhir!'], demo: { min: 0, max: 12, start: 0, hops: [3, 3, 3, 3] } },
    tens: { judul: 'Lompat puluhan dulu, lalu satuan', baris: ['Tombol A = lompat +10. Joystick = lompat +1.', '24 + 13: dari 24 lompat +10, lalu +1 tiga kali.', 'Tekan B di jawaban!'], demo: { min: 20, max: 40, start: 24, hops: [10, 1, 1, 1] } },
    frac: { judul: 'Pecahan di garis bilangan', baris: ['Jarak 0 ke 1 dibagi bagian SAMA BESAR.', 'Satu lompatan = satu bagian (misalnya 1/4).', 'Tekan B di jawaban!'], demo: { min: 0, max: 8, start: 1, hops: [1, 1, 1], den: 4 } },
  };

  M.Modes.numline = {
    nama: 'Lompat Bilangan',
    concept(cfg) {
      const c = CONCEPTS[cfg.kind];
      return { judul: c.judul, baris: c.baris, demo: (g, t, x, y, w, h) => miniLine(g, t, x, y, w, h, c.demo) };
    },
    controls(cfg) { return { joy: true, a: cfg.kind === 'tens' ? '+10' : null, b: 'Di sini!' }; },
    create(P) {
      const R = {
        task: null, pos: 0, from: 0, hopT: 0, hopping: false, hopCount: 0, trail: [], camX: 0, wait: 0,
        lock: false, holdT: 0, gems: [], celebrate: 0, wrongShow: 0,
      };
      const groundY = () => Math.round(M.VH * 0.6);
      const xOf = (v) => (v - R.task.min) * SP + SP;

      function newTask() {
        R.task = C.numline(P.cfg);
        R.pos = R.task.start; R.from = R.pos; R.hopping = false; R.hopCount = 0; R.trail = []; R.celebrate = 0;
        // Permata bonus di beberapa batu (tidak harus diambil).
        R.gems = [];
        for (let v = R.task.min + 1; v < R.task.max; v++) if (Math.random() < 0.15 && v !== R.task.start) R.gems.push({ v, got: false });
        R.camX = xOf(R.pos) - M.VW / 2;
        M.fx.burst(xOf(R.pos) - R.camX, groundY() - 20, { n: 10, color: ['#fff', '#b8f4ff'], speed: 80 });
      }
      newTask();

      function hop(d) {
        const to = R.pos + d;
        if (to < R.task.min || to > R.task.max) { M.toast('Ujung garis bilangan!'); return; }
        R.from = R.pos; R.pos = to; R.hopping = true; R.hopT = 0;
        R.hopCount++;
        R.trail.push({ a: R.from, b: to, d });
        M.sfx('hop');
      }

      function answer() {
        const T = R.task;
        if (R.pos === T.target) {
          const x = xOf(R.pos) - R.camX, y = groundY() - 60;
          const eq = T.ask === 'hops' ? T.label.replace('?', String(R.hopCount === T.hops ? T.hops : Math.abs(T.target - T.start))) : T.label.replace('?', T.fmt(T.target));
          P.correct({ x, y, pts: 100, say: eq });
          R.celebrate = 1.4; R.lock = true;
          setTimeout(() => { P.taskDone(); if (P.done < P.tasks) newTask(); R.lock = false; }, 1300);
        } else {
          const visual = (g, t, x, y, w, h) => miniLine(g, t, x, y, w, h, { min: T.min, max: T.max, start: T.start, hops: hopList(T), den: T.den });
          const lines = [`Kamu berhenti di ${T.fmt(R.pos)}.`].concat(T.explain);
          P.mistake(lines, { x: xOf(R.pos) - R.camX, y: groundY() - 60, visual, btn: 'Coba lagi', after: () => { R.pos = T.start; R.hopCount = 0; R.trail = []; } });
        }
      }

      return {
        R,
        // Untuk uji otomatis: jawab soal sekarang dengan benar (atau salah).
        solve(wrong) { if (R.lock) return; R.pos = wrong ? R.task.target + 1 : R.task.target; R.hopCount = R.task.hops; answer(); },
        update(dt) {
          const I = M.input;
          if (R.hopping) { R.hopT += dt; if (R.hopT >= HOP) { R.hopping = false; const gm = R.gems.find((q) => q.v === R.pos && !q.got); if (gm) { gm.got = true; P.addScore(20, xOf(R.pos) - R.camX, groundY() - 70); M.sfx('ambil'); } } }
          if (R.celebrate > 0) R.celebrate -= dt;
          if (!R.lock && !R.hopping) {
            // Tahan joystick = lompat berulang dengan jeda.
            const dir = I.x > 0.5 ? 1 : I.x < -0.5 ? -1 : 0;
            if (dir) {
              if (R.holdT <= 0) { hop(dir * (R.task.kind === 'skip' ? R.task.step : 1)); R.holdT = 0.32; }
              R.holdT -= dt;
            } else R.holdT = 0;
            if (I.aHit && R.task.kind === 'tens') hop(I.x < -0.3 ? -10 : 10);
            if (I.bHit) answer();
          }
          const want = xOf(R.pos) - M.VW / 2;
          R.camX += (want - R.camX) * Math.min(1, dt * 6);
        },
        tap(x, y) {
          // Ketuk batu di dekat pahlawan juga bisa melompat (kanan/kiri).
          if (R.lock || R.hopping || y < M.HUD_H + 70) return;
          const hx = xOf(R.pos) - R.camX;
          if (Math.abs(x - hx) < 24 && Math.abs(y - (groundY() - 30)) < 60) { answer(); return; }
          if (y > groundY() - 120 && y < groundY() + 60) hop((x > hx ? 1 : -1) * (R.task.kind === 'skip' ? R.task.step : 1));
        },
        draw(g) {
          const T = R.task, gy = groundY(), cam = Math.round(R.camX);
          M.drawBg(g, P.theme, cam, 0);
          // Sungai.
          const water = P.theme === 'gua' ? '#3b6fb0' : P.theme === 'kota' ? '#5aa0e0' : '#4fa8f0';
          g.fillStyle = water; g.fillRect(0, gy + 6, M.VW, M.VH - gy);
          g.fillStyle = 'rgba(255,255,255,0.35)';
          for (let i = 0; i < 18; i++) { const wx = ((i * 73 - cam * 0.8 + M.t * 20) % (M.VW + 40) + M.VW + 40) % (M.VW + 40) - 20; g.fillRect(Math.round(wx), gy + 20 + (i * 37) % (M.VH - gy - 30), 10, 2); }
          // Batu bernomor.
          const vmin = Math.max(T.min, Math.floor(T.min + (cam - SP) / SP)), vmax = Math.min(T.max, Math.ceil(T.min + (cam + M.VW) / SP));
          for (let v = vmin; v <= vmax; v++) {
            const x = Math.round(xOf(v) - cam);
            const big = T.den ? v % T.den === 0 : T.kind === 'tens' ? v % 10 === 0 : T.kind === 'skip' ? v % T.step === 0 : true;
            const bob = Math.round(Math.sin(M.t * 2 + v) * 1.5);
            M.tile1(g, 0, 0, x - 16, gy - 16 + bob, 32);
            M.tile1(g, 0, 2, x - 16, gy + 16 + bob, 32);
            // Papan angka di bawah batu.
            const lbl = T.den ? C.fracLabel(v, T.den) : String(v);
            const isStart = v === T.start;
            M.box(g, x - 19, gy + 52, 38, 26, isStart ? '#ffd54a' : big ? '#fff6dc' : '#d9d2ee', { line: '#2b1d52', border: 2 });
            M.text(g, lbl, x, gy + 65, { size: lbl.length > 3 ? 12 : big ? 17 : 14, align: 'center', color: '#2b1d52', outline: false });
            const gm = R.gems.find((q) => q.v === v && !q.got);
            if (gm) M.spr1(g, 'gem3', M.t * 8, x, gy - 50 + Math.sin(M.t * 3 + v) * 3, { scale: 1.5, anchor: 'center' });
          }
          // Busur lompatan (jejak hitungan).
          R.trail.forEach((tr, i) => {
            const a = xOf(tr.a) - cam, b = xOf(tr.b) - cam, mid = (a + b) / 2, hh = Math.min(70, Math.abs(b - a) * 0.5 + 18);
            const last = i === R.trail.length - 1 && R.hopping, u = last ? M.clamp(R.hopT / HOP, 0, 1) : 1;
            g.strokeStyle = tr.d > 0 ? '#ff5d73' : '#2d6fc4'; g.lineWidth = 3;
            g.beginPath();
            for (let s = 0; s <= u + 0.001; s += 0.05) { const xx = M.lerp(a, b, s), yy = gy - 70 - Math.sin(Math.PI * s) * hh; if (s === 0) g.moveTo(xx, yy); else g.lineTo(xx, yy); }
            g.stroke();
            if (u >= 1) M.text(g, (tr.d > 0 ? '+' : '') + (T.den ? `${tr.d}/${T.den}` : tr.d), mid, gy - 82 - hh, { size: 13, align: 'center', color: tr.d > 0 ? '#ff5d73' : '#4b9cff' });
          });
          // Pahlawan.
          let hx = xOf(R.pos), hy = gy - 16;
          if (R.hopping) { const u = R.hopT / HOP; hx = M.lerp(xOf(R.from), xOf(R.pos), u); hy -= Math.sin(Math.PI * u) * 40; }
          const face = R.trail.length ? R.trail[R.trail.length - 1].d < 0 : false;
          const anim = R.hopping ? 'jump' : R.celebrate > 0 ? 'throw' : 'idle';
          M.hero(g, M.save.active ? M.save.active.hero : 'pinki', anim, M.t, hx - cam, hy, { scale: 2, flip: face });
          // Penghitung lompatan di atas pahlawan.
          if (R.hopCount) M.text(g, `${R.hopCount} lompatan`, hx - cam, hy - 84, { size: 13, align: 'center', color: '#fff3c4' });
          if (R.celebrate > 0) M.text(g, T.fmt(T.target), hx - cam, hy - 110 - (1.4 - R.celebrate) * 20, { size: 30, align: 'center', color: '#ffd54a' });
          // Soal.
          P.questionBox(g, T.label, T.say);
          // Petunjuk arah.
          if (R.pos === T.start && !R.hopCount) {
            const dx = T.dir > 0 ? 1 : -1, ax = M.VW / 2 + dx * (50 + Math.sin(M.t * 6) * 6);
            M.icon(g, dx > 0 ? 'right' : 'left', ax - 12, gy - 140, 24, '#ffd54a');
          }
        },
      };
    },
  };
  M.miniLine = miniLine;
})();
