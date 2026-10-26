// Mode "Pasar Koin": warung. Anak menyusun uang yang PAS dengan mengetuk koin dan uang kertas.
// Konsep: nilai uang dan nilai tempat (ribuan, ratusan), menyusun jumlah, dan kembalian sebagai pengurangan
// (atau menghitung maju dari harga ke uang yang dibayar).
(function () {
  const M = window.MH2, C = window.MH2Concepts;
  const MONEY = {
    100: { kind: 'koin', fill: '#c9cdd8', r: 15 }, 200: { kind: 'koin', fill: '#dfe3ec', r: 17 }, 500: { kind: 'koin', fill: '#ffd54a', r: 19 },
    1000: { kind: 'koin', fill: '#e8c25a', r: 21, ring: '#c9cdd8' }, 2000: { kind: 'kertas', fill: '#9fb2c9' }, 5000: { kind: 'kertas', fill: '#c99a6b' },
    10000: { kind: 'kertas', fill: '#b38cff' },
  };
  const short = (v) => (v >= 1000 ? `${v / 1000}rb` : String(v));

  function drawMoney(g, v, x, y, s) {
    s = s || 1;
    const m = MONEY[v];
    if (m.kind === 'koin') {
      const r = m.r;
      const c = M.lowres('koin' + v, r * 2 + 2, r * 2 + 2, (cx) => {
        cx.fillStyle = '#2b1d52'; cx.beginPath(); cx.arc(r + 1, r + 1, r, 0, 7); cx.fill();
        cx.fillStyle = m.ring || m.fill; cx.beginPath(); cx.arc(r + 1, r + 1, r - 2, 0, 7); cx.fill();
        if (m.ring) { cx.fillStyle = m.fill; cx.beginPath(); cx.arc(r + 1, r + 1, r - 6, 0, 7); cx.fill(); }
        cx.fillStyle = 'rgba(255,255,255,0.6)'; cx.fillRect(r - 5, 5, 6, 2);
      });
      g.drawImage(c, Math.round(x - (r + 1) * s), Math.round(y - (r + 1) * s), c.width * s, c.height * s);
      M.text(g, String(v), x, y + 1, { size: Math.round((v >= 1000 ? 11 : 12) * s), align: 'center', color: '#2b1d52', outline: false });
    } else {
      const w = 58 * s, h = 30 * s;
      M.box(g, x - w / 2, y - h / 2, w, h, m.fill, { line: '#2b1d52', border: 2, shade: false });
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(Math.round(x - w / 2 + 6 * s), Math.round(y - h / 2 + 5 * s), Math.round(12 * s), Math.round(h - 10 * s));
      M.text(g, short(v), x + 6 * s, y + 1, { size: Math.round(14 * s), align: 'center', color: '#2b1d52', outline: false });
    }
  }

  const CONCEPTS = {
    pay: { judul: 'Uang pas = jumlahnya tepat', baris: ['Rp1.200 = 1 ribuan dan 2 ratusan.', 'Ketuk koin di laci untuk menaruhnya di nampan.', 'Ketuk uang di nampan untuk mengambilnya kembali.'] },
    change: { judul: 'Kembalian = bayar - harga', baris: ['Harga Rp3.200, dibayar Rp5.000.', 'Hitung maju: 3.200 → 4.000 (+800) → 5.000 (+1.000).', 'Kembaliannya Rp1.800.'] },
  };

  M.Modes.market = {
    nama: 'Pasar Koin',
    concept(cfg) {
      const c = CONCEPTS[cfg.kind];
      return {
        judul: c.judul, baris: c.baris,
        demo(g, t, x, y, w, h) {
          const seq = cfg.kind === 'change' ? [1000, 500, 200, 100] : [1000, 100, 100];
          const n = Math.min(seq.length, Math.floor((t % 4) / 0.7));
          M.svg(g, 'apple', x + 14, y + 10, 40);
          M.box(g, x + 60, y + 18, 110, 24, '#fff6dc', { line: '#2b1d52', border: 2, shade: false });
          M.text(g, cfg.kind === 'change' ? 'Kembali 1.800' : 'Harga 1.200', x + 115, y + 30, { size: 13, align: 'center', color: '#2b1d52', outline: false });
          let sum = 0;
          for (let i = 0; i < n; i++) { drawMoney(g, seq[i], x + 40 + i * 52, y + h - 50, 1); sum += seq[i]; }
          M.text(g, `Rp${M.fmt(sum)}`, x + w - 12, y + h - 18, { size: 16, align: 'right', color: '#2b1d52', outline: false });
        },
      };
    },
    controls() { return null; },
    create(P) {
      const cfg = P.cfg;
      const R = { task: null, tray: [], lock: false, cust: 'kelinci', happy: 0 };
      function newTask() { R.task = C.market(cfg); R.tray = []; R.lock = false; R.cust = M.pick(['kelinci', 'rubah', 'rusa', 'babi']); R.happy = 0; }
      newTask();
      const sum = () => R.tray.reduce((a, b) => a + b, 0);
      function pay() {
        if (R.lock || !R.tray.length) return;
        const T = R.task, s = sum();
        if (s === T.target) {
          R.lock = true; R.happy = 1.5;
          const hemat = R.tray.length <= T.best.length;
          P.correct({ x: M.VW / 2, y: 200, pts: hemat ? 150 : 100, text: hemat ? 'Hemat koin!' : 'Pas!', sfx: 'koin', say: `Pas ${C.fmtRp(T.target)}! ${hemat ? 'Pakai uang paling sedikit!' : ''}` });
          setTimeout(() => { P.taskDone(); if (P.done < P.tasks) newTask(); }, 1500);
        } else {
          const diff = s - T.target;
          P.mistake([`Uangmu ${C.fmtRp(s)}, seharusnya ${C.fmtRp(T.target)}.`, diff > 0 ? `Kelebihan ${C.fmtRp(diff)}. Ambil kembali sebagian.` : `Kurang ${C.fmtRp(-diff)}. Tambah lagi.`].concat(T.explain), { x: M.VW / 2, y: 200 });
        }
      }
      // Rincian nilai tempat dari isi nampan.
      function breakdown(s) {
        const rb = Math.floor(s / 1000), rt = Math.floor((s % 1000) / 100);
        return [rb ? `${rb} ribuan` : null, rt ? `${rt} ratusan` : null].filter(Boolean).join(' + ') || '0';
      }

      return {
        R,
        solve(wrong) { R.tray = R.task.best.slice(); if (wrong) R.tray.push(100); pay(); },
        update() { if (R.happy > 0) R.happy -= M.dt; },
        draw(g) {
          const T = R.task, VW = M.VW;
          M.drawBg(g, P.theme, 0, 0);
          // Warung: atap bergaris dan meja.
          const top = M.HUD_H + 6;
          for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#ff5d73' : '#fff6dc'; g.fillRect(i * 30, top, 30, 26); }
          g.fillStyle = '#2b1d52'; g.fillRect(0, top + 26, VW, 3);
          // Pembeli.
          const cy = top + 150, hop = R.happy > 0 ? Math.abs(Math.sin(R.happy * 10)) * 10 : 0;
          M.spr(g, `${R.cust}_idle_r`, M.at(`${R.cust}_idle_r`, M.t, 6), 70, cy - hop, { scale: 3 });
          // Balon kata pembeli.
          M.box(g, 120, top + 44, VW - 132, 76, '#fff', { line: '#2b1d52' });
          M.text(g, T.kind === 'change' ? `Aku beli ${T.item}. Ini uangku ${C.fmtRp(T.paid)}.` : `Aku jual ${T.item}. Harganya ${C.fmtRp(T.price)}.`, 130, top + 54, { size: 14, color: '#2b1d52', outline: false, maxW: VW - 152, base: 'top', lh: 18 });
          M.text(g, T.ask, 130, top + 100, { size: 13, color: '#d65f82', outline: false, base: 'top' });
          // Meja dan nampan.
          const ty = cy + 10;
          M.box(g, 0, ty, VW, 150, '#c98a4b', { line: '#2b1d52', shade: false });
          M.svg(g, T.icon, 16, ty + 12, 44);
          M.box(g, 12, ty + 58, 54, 22, '#fff6dc', { line: '#2b1d52', border: 2, shade: false });
          M.text(g, T.kind === 'change' ? short(T.price) : short(T.price), 39, ty + 69, { size: 13, align: 'center', color: '#2b1d52', outline: false });
          M.box(g, 74, ty + 8, VW - 86, 108, '#e9f6ff', { line: '#2b1d52' });
          M.text(g, T.kind === 'change' ? 'Kembalian:' : 'Nampan:', 82, ty + 20, { size: 12, color: '#6b4fa8', outline: false });
          R.tray.forEach((v, i) => {
            const per = 5, x = 104 + (i % per) * 50, y = ty + 48 + Math.floor(i / per) * 40;
            if (y > ty + 100) return;
            drawMoney(g, v, x, y, 0.85);
            M.hit('tray' + i, x - 24, y - 18, 48, 36, () => { if (!R.lock) { R.tray.splice(i, 1); M.sfx('klik'); } }, 'klik');
          });
          const s = sum(), good = s === T.target;
          M.box(g, 10, ty + 124, VW - 20, 40, good ? '#d8ffd4' : '#fff6dc', { line: '#2b1d52' });
          M.text(g, `${C.fmtRp(s)}  (${breakdown(s)})`, VW / 2, ty + 144, { size: 16, align: 'center', color: '#2b1d52', outline: false });
          // Laci uang.
          const dy = M.VH - 196, ds = T.denoms;
          M.text(g, 'Laci uang (ketuk untuk menaruh):', VW / 2, dy - 4, { size: 13, align: 'center' });
          const per = Math.min(4, ds.length), bw = (VW - 30) / per;
          ds.forEach((v, i) => {
            const x = 15 + (i % per) * bw, y = dy + 8 + Math.floor(i / per) * 62;
            M.button(g, { id: 'd' + v, x: x + 2, y, w: bw - 4, h: 54, color: 'white', label: '', sfx: 'koin', disabled: R.lock || R.tray.length >= 15, onTap: () => R.tray.push(v),
              draw: (gg, bx, by, bw2, bh) => drawMoney(gg, v, bx + bw2 / 2, by + bh / 2 - 2, 1) });
          });
          const rowsUsed = Math.ceil(ds.length / per);
          M.button(g, { id: 'bayar', x: VW / 2 - 90, y: dy + 10 + rowsUsed * 62, w: 180, h: 50, label: T.kind === 'change' ? 'Berikan!' : 'Bayar!', size: 22, color: 'pink', disabled: R.lock || !R.tray.length, onTap: pay });
          if (R.happy > 0) M.text(g, 'Terima kasih!', 70, cy - 120, { size: 16, align: 'center', color: '#ffd54a' });
        },
      };
    },
  };
})();
