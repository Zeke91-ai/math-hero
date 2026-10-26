// Mode "Kebun Kotak": menyusun bibit dalam baris yang sama panjang (array).
// Konsep: perkalian = baris x isi tiap baris = penjumlahan berulang; pembagian = menyusun total ke sejumlah baris;
// faktor = cara-cara menyusun persegi panjang; sifat tukar (3 x 4 = 4 x 3).
// Ketuk tombol + / - untuk mengatur Baris dan Isi, lalu "Tanam!".
(function () {
  const M = window.MH2, C = window.MH2Concepts;
  const MAXR = 6, MAXC = 8, CELL = 34;
  const X = C.X, BAGI = C.BAGI;

  function drawPlot(g, x, y, rows, cols, o) {
    o = o || {};
    const cell = o.cell || CELL;
    const w = MAXC * cell, h = MAXR * cell;
    if (!o.noSoil) {
      M.box(g, x - 6, y - 6, w + 12, h + 12, '#7a4a2a', { line: '#2b1d52' });
      for (let r = 0; r < MAXR; r++) for (let c = 0; c < MAXC; c++) { g.fillStyle = (r + c) % 2 ? '#8a5a34' : '#94633a'; g.fillRect(x + c * cell, y + r * cell, cell, cell); }
    }
    const grow = o.grow === undefined ? 1 : o.grow;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cx = x + c * cell + cell / 2, cy = y + r * cell + cell - 4;
      const k = M.clamp(grow * (rows * cols) - (r * cols + c) * 0.6, 0, 1);
      const art = o.bloom ? ['bunga1', 'bunga2', 'bunga3'][r % 3] : k >= 1 && o.sprout ? 'tunas' : 'benih';
      M.art(g, art, cx, cy, cell / 12, { anchor: 'feet' });
    }
    // Garis baris menonjolkan "kelompok sama banyak".
    if (o.rowLabels) for (let r = 0; r < rows; r++) {
      const lh = Math.max(12, cell - 8), lw = Math.max(18, Math.round(cell * 0.9));
      M.box(g, x + w + 8, y + r * cell + (cell - lh) / 2, lw, lh, '#fff6dc', { line: '#2b1d52', border: 2, shade: false });
      M.text(g, String(cols), x + w + 8 + lw / 2, y + r * cell + cell / 2 + 1, { size: Math.min(14, Math.round(cell * 0.6)), align: 'center', color: '#2b1d52', outline: false });
    }
  }

  const CONCEPTS = {
    total: { judul: 'Perkalian = baris yang sama panjang', baris: ['3 baris, tiap baris 4 bibit.', '4 + 4 + 4 = 3 × 4 = 12.', 'Atur Baris dan Isi, lalu tekan Tanam!'] },
    rows: { judul: 'Pembagian = menyusun ke baris', baris: ['12 bibit dalam 3 baris sama panjang.', 'Coba-coba isi tiap baris sampai pas 12.', 'Jawabannya: 12 : 3 = 4.'] },
    factors: { judul: 'Satu bilangan, banyak susunan', baris: ['12 bisa disusun 2 × 6, 3 × 4, 4 × 3, 6 × 2.', 'Cari beberapa cara yang berbeda!', '3 × 4 dan 4 × 3 hasilnya sama.'] },
  };

  M.Modes.garden = {
    nama: 'Kebun Kotak',
    concept(cfg) {
      const c = CONCEPTS[cfg.kind];
      return {
        judul: c.judul, baris: c.baris,
        demo(g, t, x, y, w, h) {
          const k = (t % 4) / 4;
          const rows = cfg.kind === 'factors' ? (k < 0.5 ? 3 : 4) : 3, cols = cfg.kind === 'factors' ? (k < 0.5 ? 4 : 3) : 4;
          const n = Math.min(rows, Math.floor(k * 6) + 1);
          drawPlot(g, x + 20, y + 14, n, cols, { cell: 18, noSoil: false, rowLabels: true });
          M.text(g, Array(n).fill(cols).join(' + ') + (n === rows ? ` = ${rows * cols}` : ''), x + w - 10, y + h - 14, { size: 14, align: 'right', color: '#2b1d52', outline: false });
        },
      };
    },
    controls() { return null; },
    create(P) {
      const cfg = P.cfg;
      const R = { task: null, rows: 1, cols: 1, phase: 'build', grow: 0, found: [], choice: null, lock: false, bloom: 0 };
      function newTask() {
        R.task = C.garden(cfg);
        R.rows = cfg.kind === 'rows' ? R.task.rows : 1; R.cols = 1;
        R.phase = 'build'; R.grow = 0; R.found = []; R.lock = false; R.bloom = 0;
      }
      newTask();
      const plotX = () => Math.round((M.VW - MAXC * CELL) / 2) - (cfg.kind === 'total' ? 18 : 0);
      const plotY = () => M.HUD_H + 92;

      function finish(say) {
        R.bloom = 0.01; R.lock = true;
        P.correct({ x: M.VW / 2, y: plotY() + 80, pts: 120, sfx: 'tumbuh', say });
        setTimeout(() => { P.taskDone(); if (P.done < P.tasks) newTask(); }, 1600);
      }

      function plant() {
        if (R.lock) return;
        const T = R.task;
        M.sfx('tumbuh');
        if (cfg.kind === 'total') {
          if (R.rows !== T.rows || R.cols !== T.cols) {
            M.toast(`Susun ${T.rows} baris, tiap baris ${T.cols} bibit.`, 2200, '#fff3c4');
            return;
          }
          R.phase = 'ask'; R.grow = 0;
        } else if (cfg.kind === 'rows') {
          const n = R.rows * R.cols;
          if (n === T.total) finish(`${T.total} ${BAGI} ${T.rows} = ${R.cols}. Tiap baris ${R.cols} bibit!`);
          else P.mistake([`${R.rows} baris × ${R.cols} = ${n} bibit.`, n > T.total ? `Kebanyakan ${n - T.total}. Kurangi isi tiap baris.` : `Masih kurang ${T.total - n}. Tambah isi tiap baris.`].concat(T.explain.slice(1)), {
            x: M.VW / 2, y: plotY() + 60, visual: (g, t, x, y, w, h) => drawPlot(g, x + 6, y + 4, T.rows, T.answer, { cell: 15, rowLabels: true }) });
        } else {
          const n = R.rows * R.cols;
          if (n !== T.total) {
            P.mistake([`${R.rows} × ${R.cols} = ${n}, bukan ${T.total}.`, `Cari dua bilangan yang dikali hasilnya ${T.total}.`], { soft: true, x: M.VW / 2, y: plotY() + 60 });
            return;
          }
          if (R.rows === 1 || R.cols === 1) { M.toast('Satu baris panjang itu benar, tapi coba bentuk persegi panjang!', 2200, '#fff3c4'); return; }
          if (R.found.some(([a, b]) => a === R.rows && b === R.cols)) { M.toast('Cara ini sudah ditemukan. Coba yang lain!', 1800, '#fff3c4'); return; }
          const swapped = R.found.some(([a, b]) => a === R.cols && b === R.rows);
          R.found.push([R.rows, R.cols]);
          M.fx.float(`${R.rows} × ${R.cols} = ${T.total}`, M.VW / 2, plotY() + 100, '#ffd54a', 22);
          if (swapped) M.toast(`${R.cols} × ${R.rows} dan ${R.rows} × ${R.cols} sama-sama ${T.total}. Ditukar tetap sama!`, 2600, '#d8ffd4');
          M.sfx('benar');
          if (R.found.length >= T.need) finish(`Hebat! ${R.found.length} cara menyusun ${T.total}.`);
        }
      }
      function answer(v) {
        if (R.lock) return;
        const T = R.task;
        if (v === T.answer) finish(`${T.rows} × ${T.cols} = ${T.answer}`);
        else P.mistake([`Kamu pilih ${v}. Yuk hitung lagi.`].concat(T.explain), {
          x: M.VW / 2, y: plotY() + 60, visual: (g, t, x, y, w, h) => drawPlot(g, x + 6, y + 4, T.rows, T.cols, { cell: 15, rowLabels: true, grow: t }) });
      }

      function stepper(g, id, label, x, y, val, min, max, set, locked) {
        M.text(g, label, x + 70, y - 12, { size: 14, align: 'center', color: '#fff' });
        M.button(g, { id: id + '-', x, y, w: 44, h: 44, label: '-', size: 26, color: 'orange', disabled: locked || val <= min, sfx: 'pop', onTap: () => set(val - 1) });
        M.box(g, x + 48, y, 44, 44, '#fff6dc', { line: '#2b1d52' });
        M.text(g, String(val), x + 70, y + 22, { size: 24, align: 'center', color: '#2b1d52', outline: false });
        M.button(g, { id: id + '+', x: x + 96, y, w: 44, h: 44, label: '+', size: 26, color: 'green', disabled: locked || val >= max, sfx: 'pop', onTap: () => set(val + 1) });
      }

      return {
        R,
        solve(wrong) {
          const T = R.task;
          if (cfg.kind === 'total') { R.rows = T.rows; R.cols = T.cols; plant(); answer(wrong ? T.answer + 1 : T.answer); }
          else if (cfg.kind === 'rows') { R.cols = wrong ? T.answer + 1 : T.answer; plant(); }
          else { for (const [a, b] of T.pairs) { if (R.lock) break; R.rows = a; R.cols = b; plant(); } }
        },
        update(dt) {
          if (R.phase === 'ask' && R.grow < 1) R.grow = Math.min(1, R.grow + dt * 0.8);
          if (R.bloom > 0) R.bloom += dt;
        },
        draw(g) {
          const T = R.task, px = plotX(), py = plotY();
          M.drawBg(g, P.theme, 0, 0);
          P.questionBox(g, T.label, R.phase === 'ask' ? T.ask : cfg.kind === 'factors' ? `${T.ask} (${R.found.length}/${T.need})` : T.ask, { size: 17 });
          drawPlot(g, px, py, R.rows, R.cols, { grow: R.phase === 'ask' ? R.grow : 1, sprout: R.phase === 'ask', bloom: R.bloom > 0, rowLabels: cfg.kind === 'total' || R.phase === 'ask' });
          // Lebah lucu terbang di atas kebun.
          M.svg(g, 'bee', px + (Math.sin(M.t * 0.7) * 0.5 + 0.5) * MAXC * CELL - 12, py - 20 + Math.sin(M.t * 4) * 6, 24);
          const by = py + MAXR * CELL + 22;
          if (cfg.kind === 'rows') {
            // Kantong bibit: sisa yang belum ditanam.
            const left = T.total - R.rows * R.cols;
            M.box(g, 14, by - 4, M.VW - 28, 30, left === 0 ? '#d8ffd4' : left < 0 ? '#ffe1e6' : '#fff6dc', { line: '#2b1d52', border: 2 });
            M.text(g, left === 0 ? `Pas! ${R.rows} × ${R.cols} = ${T.total}` : left > 0 ? `Sisa bibit di kantong: ${left}` : `Bibit kurang ${-left}! Kurangi isi.`, M.VW / 2, by + 11, { size: 15, align: 'center', color: '#2b1d52', outline: false });
          } else if (cfg.kind === 'factors') {
            M.text(g, `${R.rows} × ${R.cols} = ${R.rows * R.cols}`, M.VW / 2, by + 10, { size: 18, align: 'center', color: R.rows * R.cols === T.total ? '#5fd068' : '#fff' });
            R.found.forEach(([a, b], i) => {
              const fx = 20 + i * 84;
              M.box(g, fx, by + 26, 76, 26, '#d8ffd4', { line: '#2b1d52', border: 2, shade: false });
              M.text(g, `${a} × ${b}`, fx + 38, by + 39, { size: 14, align: 'center', color: '#2b1d52', outline: false });
            });
          } else if (R.phase === 'ask') {
            M.text(g, `${Array(T.rows).fill(T.cols).join(' + ')} = ${T.rows} × ${T.cols} = ?`, M.VW / 2, by + 10, { size: 17, align: 'center', color: '#fff', maxW: M.VW - 20 });
          }
          const cy = M.VH - 150;
          if (R.phase === 'ask') {
            T.choices.forEach((v, i) => M.button(g, { id: 'c' + i, x: 30 + i * ((M.VW - 60) / 3), y: cy + 20, w: (M.VW - 60) / 3 - 12, h: 64, label: String(v), size: 28, color: 'blue', disabled: R.lock, onTap: () => answer(v) }));
          } else {
            if (cfg.kind !== 'rows') stepper(g, 'r', 'Baris', 18, cy, R.rows, 1, MAXR, (v) => { R.rows = v; }, R.lock);
            stepper(g, 'c', 'Isi tiap baris', cfg.kind === 'rows' ? M.VW / 2 - 70 - 70 : M.VW - 158, cy, R.cols, 1, MAXC, (v) => { R.cols = v; }, R.lock);
            if (cfg.kind === 'rows') M.text(g, `Baris: ${R.rows} (tetap)`, M.VW - 90, cy + 22, { size: 14, align: 'center', color: '#fff' });
            M.button(g, { id: 'tanam', x: M.VW / 2 - 80, y: cy + 62, w: 160, h: 54, label: 'Tanam!', size: 22, color: 'pink', disabled: R.lock, onTap: plant });
          }
        },
      };
    },
  };
})();
