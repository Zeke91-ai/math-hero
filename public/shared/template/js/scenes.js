// __JUDUL__: adegan awal dari templat kit. Judul -> lima soal dari bank soal bersama -> hasil -> judul.
// Ganti isi adegan ini dengan permainan seri barumu; semua yang lain (mesin, input, tombol, audio, bank soal) sudah siap.
// Paling bawah: memuat aset lalu memulai di layar judul.
(function () {
  const M = window.MH2;
  const Bank = window.MHKit.bank;
  // Pasang pembuat soal lama ke katalog bank. Tambah Bank.useHomework(...) dll. bila skrip pembuatnya dimuat.
  Bank.useConcepts(window.MH2Concepts);

  const SKILL = 'garis.tambah', TINGKAT = 1, JUMLAH = 5;
  const COLORS = ['pink', 'blue', 'green', 'orange'];
  const run = { n: 0, benar: 0, soal: null };

  function soalBaru() {
    run.soal = Bank.soal(SKILL, TINGKAT, Bank.rng((Date.now() + run.n * 7919) >>> 0));
    run.salah = false;
  }

  M.register('title', {
    enter() { M.audio.music('title'); this.t = 0; },
    update(dt) { this.t += dt; if (M.input.aHit || M.input.bHit) this.mulai(); },
    mulai() { run.n = 0; run.benar = 0; soalBaru(); M.go('soal'); },
    draw(g) {
      M.drawBg(g, 'padang', this.t * 30, 0);
      M.text(g, '__JUDUL__', M.VW / 2, M.VH * 0.3, { size: 28, align: 'center', color: '#ffd54a', ow: 6, maxW: M.VW - 30 });
      M.button(g, { id: 'mulai', x: M.VW / 2 - 80, y: M.VH * 0.55, w: 160, h: 56, label: 'Mulai', color: 'green', onTap: () => this.mulai() });
    },
  });

  M.register('soal', {
    enter() { this.t = 0; },
    update(dt) { this.t += dt; },
    // Dipanggil tombol pilihan (dan tes): benar -> soal berikutnya atau hasil; salah -> coba lagi, tidak pernah dipaksa.
    jawab(nilai) {
      if (nilai === run.soal.jawaban) {
        if (!run.salah) run.benar++;
        run.n++;
        if (run.n >= JUMLAH) { M.go('hasil'); return true; }
        soalBaru();
        return true;
      }
      run.salah = true;
      M.flash('#ff6b6b', 0.25);
      return false;
    },
    draw(g) {
      const q = run.soal;
      M.drawBg(g, 'langit', this.t * 15, 0);
      M.text(g, `Soal ${run.n + 1} dari ${JUMLAH}`, M.VW / 2, 50, { size: 16, align: 'center', color: '#fff' });
      M.box(g, 16, 70, M.VW - 32, 110, '#fff6dc', { line: '#2b1d52', shade: false });
      M.text(g, q.teks, M.VW / 2, 125, { size: 26, align: 'center', color: '#2b1d52', outline: false, maxW: M.VW - 56 });
      q.pilihan.forEach((v, i) => {
        M.button(g, { id: 'p' + i, x: 24 + (i % 2) * ((M.VW - 56) / 2 + 8), y: 220 + Math.floor(i / 2) * 76, w: (M.VW - 56) / 2, h: 64, label: String(v), size: 26, color: COLORS[i % 4], onTap: () => this.jawab(v) });
      });
      if (run.salah) M.text(g, 'Coba lagi, pelan-pelan saja.', M.VW / 2, 400, { size: 16, align: 'center', color: '#fff' });
    },
  });

  M.register('hasil', {
    enter() { this.t = 0; M.audio.music('title'); },
    update(dt) { this.t += dt; if (this.t > 0.6 && (M.input.aHit || M.input.bHit)) M.go('title'); },
    draw(g) {
      M.drawBg(g, 'padang', this.t * 30, 0);
      M.text(g, 'Selesai!', M.VW / 2, M.VH * 0.3, { size: 30, align: 'center', color: '#ffd54a', ow: 6 });
      M.text(g, `${run.benar} dari ${JUMLAH} benar pada percobaan pertama`, M.VW / 2, M.VH * 0.42, { size: 16, align: 'center', color: '#fff', maxW: M.VW - 40 });
      M.button(g, { id: 'lagi', x: M.VW / 2 - 80, y: M.VH * 0.55, w: 160, h: 56, label: 'Main lagi', color: 'purple', onTap: () => M.go('title') });
    },
  });

  // ---------- Mulai ----------
  const bar = document.getElementById('load-bar');
  M.load((k) => { bar.style.width = Math.round(k * 100) + '%'; }).then(() => {
    document.body.classList.add('ready');
    M.start('title');
  });

  window.__seri = { run };
})();
