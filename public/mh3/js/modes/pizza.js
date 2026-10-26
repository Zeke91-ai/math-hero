// Mode "Pizza Pecahan": dapur pizza. Konsep pecahan sebagai bagian yang SAMA BESAR dari satu benda utuh.
//   make    potong pizza jadi d bagian sama besar (penyebut), lalu ambil n bagian (pembilang).
//   compare bandingkan dua pecahan dengan melihat luas yang diambil.
//   equiv   tunjukkan pecahan yang sama dengan potongan lebih kecil (1/2 = 2/4 = 4/8).
// Bos Koki Kacau: pesanan datang beruntun dengan batas waktu yang longgar.
(function () {
  const M = window.MH2, C = window.MH2Concepts;
  const START = -Math.PI / 2;

  // Pizza berpiksel: dirender di canvas kecil lalu digambar apa adanya. sel = Set indeks potongan yang diambil.
  function drawPizza(g, cx, cy, r, den, sel, o) {
    o = o || {};
    const key = `pz${r}:${den}:${[...(sel || [])].sort().join(',')}:${o.plain ? 1 : 0}`;
    const c = M.lowres(key, r * 2 + 8, r * 2 + 8, (x) => {
      const m = r + 4;
      x.fillStyle = '#2b1d52'; x.beginPath(); x.arc(m, m, r + 2, 0, 7); x.fill();
      x.fillStyle = '#e0a453'; x.beginPath(); x.arc(m, m, r, 0, 7); x.fill();
      x.fillStyle = '#ffe08a'; x.beginPath(); x.arc(m, m, r - 6, 0, 7); x.fill();
      for (let i = 0; i < den; i++) {
        if (!(sel && sel.has(i)) || o.plain) continue;
        const a0 = START + i * Math.PI * 2 / den, a1 = a0 + Math.PI * 2 / den;
        x.fillStyle = '#ff7a4d'; x.beginPath(); x.moveTo(m, m); x.arc(m, m, r - 6, a0, a1); x.closePath(); x.fill();
        // Topping di potongan yang diambil.
        for (let k = 0; k < 3; k++) {
          const a = a0 + (a1 - a0) * (0.25 + 0.25 * k), d = (r - 6) * (0.45 + 0.2 * (k % 2));
          x.fillStyle = '#c9414a'; x.beginPath(); x.arc(m + Math.cos(a) * d, m + Math.sin(a) * d, Math.max(2, r / 12), 0, 7); x.fill();
        }
      }
      if (den > 1) {
        x.strokeStyle = '#2b1d52'; x.lineWidth = 2;
        for (let i = 0; i < den; i++) { const a = START + i * Math.PI * 2 / den; x.beginPath(); x.moveTo(m, m); x.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r); x.stroke(); }
      }
    });
    g.drawImage(c, Math.round(cx - r - 4), Math.round(cy - r - 4));
  }
  function sliceAt(cx, cy, r, den, x, y) {
    if (Math.hypot(x - cx, y - cy) > r + 6) return -1;
    let a = Math.atan2(y - cy, x - cx) - START;
    while (a < 0) a += Math.PI * 2;
    return Math.floor(a / (Math.PI * 2 / den)) % den;
  }
  const fracText = (n, d) => `${n}/${d}`;

  const CONCEPTS = {
    make: { judul: 'Pecahan = bagian SAMA BESAR', baris: ['Penyebut (bawah) = jumlah potongan sama besar.', 'Pembilang (atas) = potongan yang diambil.', 'Atur potongan, lalu ketuk potongan pizza.'] },
    compare: { judul: 'Bandingkan luasnya', baris: ['Potongan makin banyak = tiap potongan makin kecil.', '1/2 lebih besar dari 1/4!', 'Lihat bagian berwarna, mana yang lebih luas?'] },
    equiv: { judul: 'Pecahan senilai', baris: ['1/2 pizza = 2/4 pizza = 4/8 pizza.', 'Potongan lebih kecil, jumlahnya lebih banyak.', 'Ketuk potongan sampai luasnya sama.'] },
    mix: { judul: 'Pesanan kilat!', baris: ['Koki Kacau mengacak pesanan.', 'Kerjakan tiap pesanan sebelum waktunya habis.', 'Ingat: pecahan = bagian sama besar.'] },
  };

  M.Modes.pizza = {
    nama: 'Pizza Pecahan',
    concept(cfg) {
      const c = CONCEPTS[cfg.kind];
      return {
        judul: c.judul, baris: c.baris,
        demo(g, t, x, y, w, h) {
          const k = Math.floor(t % 5);
          if (cfg.kind === 'compare') {
            drawPizza(g, x + w * 0.28, y + h / 2, 52, 2, new Set([0]));
            drawPizza(g, x + w * 0.72, y + h / 2, 52, 4, new Set([0]));
            M.text(g, '1/2', x + w * 0.28, y + h - 12, { size: 16, align: 'center', color: '#2b1d52', outline: false });
            M.text(g, '1/4', x + w * 0.72, y + h - 12, { size: 16, align: 'center', color: '#2b1d52', outline: false });
            M.text(g, '>', x + w / 2, y + h / 2, { size: 30, align: 'center', color: '#d65f82' });
          } else if (cfg.kind === 'equiv') {
            drawPizza(g, x + w * 0.28, y + h / 2, 52, 2, new Set([0]));
            const sel = new Set([0, 1, 2, 3].slice(0, Math.min(4, k + 1)));
            drawPizza(g, x + w * 0.72, y + h / 2, 52, 8, sel);
            M.text(g, `1/2 = ${sel.size}/8`, x + w / 2, y + 14, { size: 16, align: 'center', color: '#2b1d52', outline: false });
          } else {
            const den = Math.min(4, k + 1), sel = new Set(k >= 4 ? [0, 1, 2] : []);
            drawPizza(g, x + w / 2, y + h / 2, 62, den, sel);
            M.text(g, k >= 4 ? '3/4' : `${den} potong`, x + w / 2, y + 14, { size: 16, align: 'center', color: '#2b1d52', outline: false });
          }
        },
      };
    },
    controls() { return null; },
    create(P) {
      const cfg = P.cfg, boss = !!cfg.boss;
      const R = { task: null, phase: 'cut', den: 1, sel: new Set(), lock: false, timer: 0, tmax: cfg.timer || 0, bossHurt: 0, chef: 0 };
      function newTask() {
        R.task = C.pizza(cfg);
        R.phase = R.task.kind === 'make' ? 'cut' : 'pick';
        R.den = R.task.kind === 'equiv' ? R.task.den2 : 1;
        R.sel = new Set(); R.lock = false; R.timer = R.tmax;
      }
      newTask();
      const pc = () => ({ x: M.VW / 2, y: Math.round(M.VH * 0.42), r: 92 });

      function done(say) {
        R.lock = true;
        if (boss) { R.bossHurt = 0.6; M.sfx('bos'); }
        P.correct({ x: M.VW / 2, y: pc().y - 60, pts: 120, say });
        setTimeout(() => { P.taskDone(); if (P.done < P.tasks) newTask(); }, 1300);
      }
      function cut() {
        const T = R.task;
        if (R.den === T.den) { R.phase = 'pick'; M.sfx('potong'); M.toast(`${T.den} bagian sama besar. Sekarang ambil ${T.num}!`, 1800, '#d8ffd4'); return; }
        P.mistake([`Pizzamu ${R.den} potong. Pesanan: ${fracText(T.num, T.den)}.`, `Penyebut ${T.den} artinya ${T.den} potongan SAMA BESAR.`], { x: M.VW / 2, y: pc().y,
          visual: (g, t, x, y, w, h) => { drawPizza(g, x + w / 2, y + h / 2, 52, T.den, new Set()); } });
      }
      function serve() {
        if (R.lock) return;
        const T = R.task, n = R.sel.size;
        if (T.kind === 'make') {
          if (n === T.num) done(`${fracText(T.num, T.den)} = ${T.num} dari ${T.den} potong. Lezat!`);
          else P.mistake([`Kamu ambil ${n} potong: ${fracText(n, T.den)}.`, `Pesanan ${fracText(T.num, T.den)}: ambil ${T.num} potong.`].concat(T.explain.slice(2)), { x: M.VW / 2, y: pc().y,
            visual: (g, t, x, y, w, h) => drawPizza(g, x + w / 2, y + h / 2, 52, T.den, new Set([...Array(T.num).keys()])) });
        } else if (T.kind === 'equiv') {
          if (n === T.answer) done(`${fracText(T.num, T.den)} = ${fracText(n, T.den2)}. Sama banyak!`);
          else P.mistake([`${fracText(n, T.den2)} ${n * T.den > T.num * T.den2 ? 'lebih banyak' : 'lebih sedikit'} dari ${fracText(T.num, T.den)}.`].concat(T.explain), { x: M.VW / 2, y: pc().y,
            visual: (g, t, x, y, w, h) => { drawPizza(g, x + w * 0.3, y + h / 2, 50, T.den, new Set([...Array(T.num).keys()])); drawPizza(g, x + w * 0.72, y + h / 2, 50, T.den2, new Set([...Array(T.answer).keys()])); } });
        }
      }
      function choose(which) {
        if (R.lock) return;
        const T = R.task;
        if (which === T.answer) done(T.answer === 'sama' ? `${fracText(...T.a)} = ${fracText(...T.b)}` : `${fracText(...(T.answer === 'a' ? T.a : T.b))} lebih banyak!`);
        else P.mistake(T.explain, { x: M.VW / 2, y: pc().y,
          visual: (g, t, x, y, w, h) => { drawPizza(g, x + w * 0.3, y + h / 2, 50, T.a[1], new Set([...Array(T.a[0]).keys()])); drawPizza(g, x + w * 0.72, y + h / 2, 50, T.b[1], new Set([...Array(T.b[0]).keys()])); } });
      }

      return {
        R,
        solve(wrong) {
          const T = R.task;
          if (T.kind === 'compare') { choose(wrong ? (T.answer === 'a' ? 'b' : 'a') : T.answer); return; }
          if (T.kind === 'make') { R.den = T.den; cut(); R.sel = new Set([...Array(T.num + (wrong ? 1 : 0)).keys()]); }
          else R.sel = new Set([...Array(T.answer + (wrong ? 1 : 0)).keys()]);
          serve();
        },
        update(dt) {
          if (R.bossHurt > 0) R.bossHurt -= dt;
          R.chef += dt;
          if (R.tmax && !R.lock && P.done < P.tasks) {
            R.timer -= dt;
            if (R.timer <= 0) {
              // Waktu habis: pesanan batal, hati berkurang, pesanan baru.
              P.hurt(1, M.VW / 2, 140);
              M.toast('Waktunya habis! Pesanan berikutnya.', 1600, '#ffe1e6');
              if (P.hearts > 0) newTask();
            }
          }
        },
        tap(x, y) {
          const T = R.task, p = pc();
          if (R.lock || R.phase !== 'pick' || T.kind === 'compare') return;
          const i = sliceAt(p.x, p.y, p.r, R.den, x, y);
          if (i < 0) return;
          if (R.sel.has(i)) R.sel.delete(i); else R.sel.add(i);
          M.sfx('pop');
        },
        draw(g) {
          const T = R.task, p = pc(), VW = M.VW;
          M.drawBg(g, P.theme, 0, 0);
          // Dapur: dinding ubin dan meja.
          g.fillStyle = 'rgba(255,246,220,0.85)'; g.fillRect(0, M.HUD_H, VW, M.VH);
          for (let y = M.HUD_H; y < M.VH; y += 20) for (let x = (y / 20) % 2 ? 0 : 10; x < VW; x += 20) { g.fillStyle = 'rgba(214,95,130,0.08)'; g.fillRect(x, y, 10, 10); }
          M.box(g, 0, p.y + p.r - 10, VW, M.VH, '#c98a4b', { line: '#2b1d52', shade: false });
          let sub = '';
          if (T.kind === 'make') sub = R.phase === 'cut' ? `Langkah 1: potong jadi ${T.den} bagian sama besar` : `Langkah 2: ambil ${T.num} potong (ketuk pizza)`;
          else if (T.kind === 'equiv') sub = `Ketuk potongan. Diambil: ${R.sel.size}/${T.den2}`;
          else sub = 'Ketuk Kiri, Sama, atau Kanan';
          const bossOff = boss ? 44 : 0;
          if (boss) {
            M.drawBoss(g, 'slime2', 46, M.HUD_H + 54 + Math.sin(R.chef * 3) * 3, 2.4, M.t, { hurt: R.bossHurt });
            M.text(g, 'Cepat! Pesanan kacau!', 92, M.HUD_H + 24, { size: 13, color: '#fff3c4' });
            if (R.tmax) {
              g.fillStyle = '#2b1d52'; g.fillRect(92, M.HUD_H + 36, VW - 106, 10);
              g.fillStyle = R.timer < 8 ? '#ff5d73' : '#5fd068'; g.fillRect(94, M.HUD_H + 38, Math.round((VW - 110) * M.clamp(R.timer / R.tmax, 0, 1)), 6);
            }
          }
          P.questionBox(g, T.kind === 'compare' ? T.label : T.label.replace(/^Buat pizza /, 'Pesanan: pizza '), sub, { size: 18, y: M.HUD_H + 8 + bossOff });
          if (T.kind === 'compare') {
            [['a', T.a, VW * 0.27], ['b', T.b, VW * 0.73]].forEach(([k, f, x]) => {
              drawPizza(g, x, p.y, 70, f[1], new Set([...Array(f[0]).keys()]));
              M.box(g, x - 30, p.y + 84, 60, 34, '#fff6dc', { line: '#2b1d52' });
              M.text(g, fracText(f[0], f[1]), x, p.y + 101, { size: 20, align: 'center', color: '#2b1d52', outline: false });
            });
            const by = M.VH - 150;
            M.button(g, { id: 'kiri', x: 14, y: by, w: 104, h: 56, label: 'Kiri', color: 'blue', disabled: R.lock, onTap: () => choose('a') });
            M.button(g, { id: 'sama', x: VW / 2 - 50, y: by, w: 100, h: 56, label: 'Sama', color: 'purple', disabled: R.lock, onTap: () => choose('sama') });
            M.button(g, { id: 'kanan', x: VW - 118, y: by, w: 104, h: 56, label: 'Kanan', color: 'blue', disabled: R.lock, onTap: () => choose('b') });
            return;
          }
          drawPizza(g, p.x, p.y, p.r, R.den, R.sel);
          if (T.kind === 'equiv') {
            drawPizza(g, 52, p.y - p.r + 20, 36, T.den, new Set([...Array(T.num).keys()]));
            M.text(g, `${fracText(T.num, T.den)}`, 52, p.y - p.r + 68, { size: 16, align: 'center', color: '#2b1d52', outline: false });
          }
          M.box(g, VW - 86, p.y - p.r, 74, 40, '#fff6dc', { line: '#2b1d52' });
          M.text(g, R.phase === 'cut' ? `${R.den} ptg` : fracText(R.sel.size, R.den), VW - 49, p.y - p.r + 20, { size: 20, align: 'center', color: '#2b1d52', outline: false });
          const by = M.VH - 150;
          if (R.phase === 'cut') {
            M.button(g, { id: 'kurang', x: 20, y: by, w: 60, h: 56, label: '-', size: 30, color: 'orange', disabled: R.den <= 1, onTap: () => { R.den--; M.sfx('potong'); } });
            M.button(g, { id: 'tambah', x: 90, y: by, w: 60, h: 56, label: '+', size: 30, color: 'green', disabled: R.den >= 12, onTap: () => { R.den++; M.sfx('potong'); } });
            M.button(g, { id: 'potong', x: VW - 180, y: by, w: 160, h: 56, label: 'Potong!', color: 'pink', onTap: cut });
          } else {
            M.button(g, { id: 'sajikan', x: VW / 2 - 90, y: by, w: 180, h: 56, label: 'Sajikan!', color: 'pink', disabled: R.lock, onTap: serve });
          }
        },
      };
    },
  };
  M.drawPizza = drawPizza;
})();
