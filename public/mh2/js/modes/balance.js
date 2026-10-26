// Mode "Timbangan Ajaib": teka-teki keseimbangan. Tanda "=" artinya kedua sisi SAMA BERAT.
// Ketuk beban di baki bawah untuk mengisi kotak misteri (?). Timbangan miring ke sisi yang lebih berat,
// jadi anak melihat sendiri kenapa jawabannya benar atau salah. Semua kotak '?' bernilai sama
// (dasar aljabar: 3 kotak sama = 12, berarti tiap kotak 4).
(function () {
  const M = window.MH2, C = window.MH2Concepts;

  // Gambar timbangan. left/right = daftar beban (angka atau '?'); fill = nilai yang dicoba untuk '?' (atau null).
  function drawScale(g, cx, cy, len, ang, left, right, fill, o) {
    o = o || {};
    const s = o.s || 1;
    // Tiang dan alas.
    g.fillStyle = '#7a4a2a'; g.fillRect(cx - 6 * s, cy, 12 * s, 120 * s);
    M.box(g, cx - 50 * s, cy + 116 * s, 100 * s, 18 * s, '#a8683a', { line: '#2b1d52', border: Math.max(1, 3 * s) });
    // Lengan.
    const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
    g.save(); g.translate(cx, cy); g.rotate(ang);
    M.box(g, -len - 6 * s, -6 * s, len * 2 + 12 * s, 12 * s, '#ffd54a', { line: '#2b1d52', border: Math.max(1, 3 * s), shade: false });
    g.restore();
    M.box(g, cx - 12 * s, cy - 12 * s, 24 * s, 24 * s, '#ff8fab', { line: '#2b1d52', border: Math.max(1, 3 * s), shade: false });
    const pans = [[cx - dx, cy - dy, left], [cx + dx, cy + dy, right]];
    pans.forEach(([px, py, items], side) => {
      g.fillStyle = '#2b1d52';
      g.fillRect(Math.round(px - 1), Math.round(py), 2, Math.round(50 * s));
      const panY = py + 50 * s, pw = 116 * s;
      M.box(g, px - pw / 2, panY, pw, 12 * s, '#9aa0b4', { line: '#2b1d52', border: Math.max(1, 3 * s), shade: false });
      // Beban di atas piring, berjajar lalu bertumpuk.
      const bw = 34 * s, bh = 30 * s, per = Math.max(1, Math.floor(pw / (bw + 2)));
      items.forEach((v, i) => {
        const row = Math.floor(i / per), col = i % per, n = Math.min(per, items.length - row * per);
        const bx = px - (n * (bw + 2)) / 2 + col * (bw + 2), by = panY - bh - row * (bh + 2);
        const mystery = v === '?';
        const val = mystery ? (fill === null || fill === undefined ? '?' : fill) : v;
        M.box(g, bx, by, bw, bh, mystery ? (fill === null || fill === undefined ? '#8b5cf6' : '#b38cff') : '#fff6dc', { line: '#2b1d52', border: Math.max(1, 2 * s) });
        M.text(g, String(val), bx + bw / 2, by + bh / 2, { size: Math.max(9, (String(val).length > 2 ? 14 : 18) * s), align: 'center', color: mystery ? '#fff' : '#2b1d52', outline: false });
      });
      if (o.totals) {
        const sum = C.sideSum(items, fill === null || fill === undefined ? 0 : fill);
        M.box(g, px - 34 * s, panY + 18 * s, 68 * s, 24 * s, side ? '#d8ecff' : '#ffe1e6', { line: '#2b1d52', border: 2, shade: false });
        M.text(g, `= ${sum}`, px, panY + 30 * s, { size: 15 * s, align: 'center', color: '#2b1d52', outline: false });
      }
    });
  }
  function tiltFor(left, right, fill) {
    const L = C.sideSum(left, fill || 0), Rr = C.sideSum(right, fill || 0);
    const m = Math.max(L, Rr, 1);
    return M.clamp((Rr - L) / m * 0.45, -0.32, 0.32);
  }

  const CONCEPTS = {
    simple: { judul: '"=" artinya sama berat', baris: ['Timbangan seimbang jika kiri dan kanan sama.', 'Ketuk beban di bawah untuk mengisi kotak ?', 'Lihat timbangannya miring ke mana!'] },
    sum: { judul: '"=" artinya sama berat', baris: ['5 + 3 = 6 + ?  →  kiri 8, jadi kanan juga 8.', '6 + 2 = 8, jadi ? = 2.', 'Ketuk beban untuk mengisi kotak ?'] },
    tens: { judul: 'Seimbangkan puluhan', baris: ['Hitung berat kiri: puluhan + satuan.', 'Kanan harus sama beratnya.', 'Pakai tombol Bantu kalau perlu.'] },
    groups: { judul: 'Kotak misteri yang sama berat', baris: ['Semua kotak ? beratnya SAMA.', '3 kotak = 12, berarti 3 × ? = 12.', 'Tiap kotak = 12 : 3 = 4.'] },
    twostep: { judul: 'Dua langkah', baris: ['Ambil angka yang sama dari dua sisi: tetap seimbang!', 'Sisa kotak-kotak ? = angka sisanya.', 'Lalu bagi rata ke tiap kotak.'] },
  };

  M.Modes.balance = {
    nama: 'Timbangan Ajaib',
    concept(cfg) {
      const c = CONCEPTS[cfg.kind];
      return {
        judul: c.judul, baris: c.baris,
        demo(g, t, x, y, w, h) {
          const k = t % 4;
          const left = cfg.kind === 'groups' ? ['?', '?', '?'] : [5, 3], right = cfg.kind === 'groups' ? [12] : [6, '?'];
          const fill = k < 1.5 ? null : k < 2.5 ? (cfg.kind === 'groups' ? 3 : 1) : (cfg.kind === 'groups' ? 4 : 2);
          const ang = tiltFor(left, right, fill);
          drawScale(g, x + w / 2, y + 40, 80, ang, left, right, fill, { s: 0.62, totals: k > 1.5 });
          if (k > 2.5) M.text(g, 'Seimbang!', x + w / 2, y + 16, { size: 18, align: 'center', color: '#2f9a43', outline: '#fff' });
        },
      };
    },
    controls() { return null; },
    create(P) {
      const R = { task: null, ang: 0, angV: 0, fill: null, showTotals: false, lock: false, ok: 0 };
      function newTask() { R.task = C.balance(P.cfg); R.fill = null; R.showTotals = false; R.ang = 0.2; R.ok = 0; }
      newTask();
      const cy = () => Math.round(M.VH * 0.36);

      function tryValue(v) {
        if (R.lock) return;
        R.fill = v;
        M.sfx('timbang');
        R.lock = true;
        const T = R.task;
        setTimeout(() => {
          const L = C.sideSum(T.left, v), Rr = C.sideSum(T.right, v);
          if (L === Rr) {
            R.ok = 1; R.showTotals = true;
            P.correct({ x: M.VW / 2, y: cy() - 40, pts: 100, say: `Seimbang! ${T.label.replace(/\?/g, String(v))}` });
            setTimeout(() => { P.taskDone(); if (P.done < P.tasks) newTask(); R.lock = false; }, 1500);
          } else {
            R.showTotals = true;
            const heavy = L > Rr ? 'Kiri' : 'Kanan';
            P.mistake([`Kalau ? = ${v}: kiri ${L}, kanan ${Rr}.`, `${heavy} lebih berat ${Math.abs(L - Rr)}.`].concat(T.explain), {
              x: M.VW / 2, y: cy() - 40, text: 'Miring!', btn: 'Coba lagi',
              visual: (g, t, x, y, w, h) => drawScale(g, x + w / 2, y + 26, 70, tiltFor(T.left, T.right, v), T.left, T.right, v, { s: 0.55, totals: true }),
              after: () => { R.fill = null; R.showTotals = false; R.lock = false; },
            });
          }
        }, 900);
      }

      return {
        R,
        solve(wrong) { tryValue(wrong ? R.task.tray.find((v) => v !== R.task.answer) : R.task.answer); },
        update(dt) {
          // Lengan timbangan bergerak seperti pegas.
          const target = tiltFor(R.task.left, R.task.right, R.fill);
          R.angV += (target - R.ang) * 40 * dt; R.angV *= Math.pow(0.02, dt); R.ang += R.angV * dt;
          if (R.ok > 0) R.ok += dt;
        },
        draw(g) {
          const T = R.task;
          M.drawBg(g, P.theme, 0, 0);
          g.fillStyle = 'rgba(255,246,220,0.25)'; g.fillRect(0, M.HUD_H, M.VW, M.VH);
          P.questionBox(g, T.label, 'Buat timbangan SEIMBANG!');
          drawScale(g, M.VW / 2, cy() + 40, 120, R.ang, T.left, T.right, R.fill, { totals: R.showTotals });
          if (R.ok > 0) {
            M.text(g, 'SEIMBANG!', M.VW / 2, cy() - 20, { size: 30, align: 'center', color: '#5fd068' });
            if (R.ok < 0.1) M.fx.burst(M.VW / 2, cy(), { n: 20, color: ['#5fd068', '#ffd54a', '#fff'] });
          }
          // Baki beban.
          const ty = M.VH - 170;
          M.box(g, 10, ty - 30, M.VW - 20, 160, '#c98a4b', { line: '#2b1d52' });
          M.text(g, 'Ketuk beban untuk mengisi ?', M.VW / 2, ty - 14, { size: 14, align: 'center', color: '#fff6dc' });
          const n = T.tray.length, bw = Math.min(62, (M.VW - 40) / n - 6);
          T.tray.forEach((v, i) => {
            const x = M.VW / 2 - (n * (bw + 6)) / 2 + i * (bw + 6) + 3;
            M.button(g, { id: 'w' + i, x, y: ty + 4, w: bw, h: 56, label: String(v), color: 'blue', size: 22, disabled: R.lock, sfx: 'pop', onTap: () => tryValue(v) });
          });
          M.button(g, { id: 'bantu', x: M.VW / 2 - 70, y: ty + 74, w: 140, h: 40, label: R.showTotals ? 'Sembunyikan' : 'Bantu hitung', size: 14, color: 'yellow', textColor: '#2b1d52', onTap: () => { R.showTotals = !R.showTotals; } });
        },
      };
    },
  };
  M.drawScale = drawScale;
})();
