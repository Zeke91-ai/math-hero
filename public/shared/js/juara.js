// Layar Papan Juara untuk Math Hero 2 dan 3 (bergaya Papan Juara Math Hero 1).
// Dipasang dari scenes.js tiap game: MHJuara.install(M, { board: 'mh2', back: 'title' }) menambah adegan 'juara'.
// Sumber data: papan bersama (Scores.top). Jika offline atau belum dikonfigurasi, dipakai skor para petualang di HP ini.
(function (root) {
  const APP_ID = 'math-hero';
  const TOP_N = 10;

  // Satu baris papan: { name, score, hero, stars }.
  let cfgNote = false;   // papan yang menyimpan `level` di meta (Kejar tanpa batas) menampilkan "Putaran N"
  function fromShared(rows) {
    return rows.map((r) => {
      const row = { name: r.name, score: r.score, hero: r.meta && r.meta.hero, stars: r.meta && r.meta.stars };
      if (cfgNote && r.meta && typeof r.meta.level === 'number') row.note = 'Putaran ' + r.meta.level;
      return row;
    });
  }
  function fromLocal(M) {
    const slots = (M.save && M.save.slots()) || [];
    return slots.filter(Boolean)
      .map((p) => ({ name: p.nama, score: M.save.totalScore(p), hero: p.hero, stars: M.save.totalStars(p) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_N);
  }
  // Tanpa data pahlawan (skor lama), pilih pahlawan tetap berdasarkan nama supaya tampilannya konsisten.
  function heroFor(M, row) {
    if (row.hero && M.HEROES.some((h) => h.key === row.hero)) return row.hero;
    let h = 0;
    for (const c of String(row.name)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return M.HEROES[h % M.HEROES.length].key;
  }

  function install(M, cfg) {
    const board = cfg.board, back = cfg.back || 'title', scene = cfg.scene || 'juara', heading = cfg.title || 'Papan Juara';
    const local = cfg.local || fromLocal, note = !!cfg.note;
    const RANK = ['#ffd54a', '#d5dbe6', '#e8a56b'];
    M.register(scene, {
      enter() {
        M.audio.music('title');
        this.rows = local(M);
        this.state = 'loading';          // loading | online | offline | local
        const tok = this.tok = {};
        const sc = root.Scores;
        if (!sc || !sc.enabled()) { this.state = 'local'; return; }
        sc.top(APP_ID, board, TOP_N).then((rows) => {
          if (this.tok !== tok) return;   // sudah pindah layar
          if (rows) { cfgNote = note; this.rows = fromShared(rows); this.state = 'online'; } else this.state = 'offline';
        });
      },
      exit() { this.tok = null; },
      update() { if (M.input.pause) M.go(back); },
      draw(g) {
        const VW = M.VW, VH = M.VH;
        M.drawBg(g, 'langit', M.t * 15, 0);
        M.button(g, { id: 'kembali', x: 8, y: 8, w: 44, h: 38, color: 'purple', icon: 'left', onTap: () => M.go(back) });
        M.text(g, heading, VW / 2, 70, { size: 28, align: 'center', color: '#ffd54a', ow: 6 });
        const sub = this.state === 'online' ? 'Skor terbaik tiap pemain' : this.state === 'loading' ? 'Memuat papan...'
          : this.state === 'offline' ? 'Tidak terhubung. Menampilkan skor di HP ini.' : 'Skor para petualang di HP ini';
        M.text(g, sub, VW / 2, 96, { size: 13, align: 'center', color: '#fff', maxW: VW - 30 });
        const x = 12, w = VW - 24, rh = 40, step = 43, y0 = 112;
        const me = M.save.active ? M.save.active.nama : null;
        if (!this.rows.length) {
          M.text(g, this.state === 'loading' ? '' : 'Belum ada juara. Ayo jadi yang pertama!', VW / 2, y0 + 60, { size: 16, align: 'center', color: '#fff', maxW: VW - 40 });
        }
        this.rows.forEach((r, i) => {
          const y = y0 + i * step, mine = me && r.name === me;
          M.box(g, x, y, w, rh, mine ? '#fff3c4' : '#fff6dc', { line: mine ? '#d65f82' : '#2b1d52', shade: false });
          const bc = RANK[i] || '#b9a8e6';
          M.box(g, x + 6, y + 6, 28, 28, bc, { line: '#2b1d52', shade: false });
          M.text(g, String(i + 1), x + 20, y + 20, { size: 16, align: 'center', color: '#2b1d52', outline: false });
          M.hero(g, heroFor(M, r), i === 0 ? 'run' : 'idle', M.t + i * 0.37, x + 54, y + rh - 2, { scale: 1.1 });
          M.text(g, String(r.name).toUpperCase(), x + 78, y + 20, { size: 18, color: '#2b1d52', outline: false, maxW: w - 78 - 120 });
          M.text(g, M.fmt(r.score), x + w - 10, y + 15, { size: 18, align: 'right', color: '#d65f82', outline: false, font: M.NUMFONT });
          if (r.note) M.text(g, r.note, x + w - 10, y + 32, { size: 11, align: 'right', color: '#6b4fa8', outline: false });
          else if (typeof r.stars === 'number') M.text(g, `${r.stars} bintang`, x + w - 10, y + 32, { size: 11, align: 'right', color: '#6b4fa8', outline: false });
        });
        M.text(g, 'Bonus waktu: makin cepat, makin tinggi!', VW / 2, VH - 18, { size: 12, align: 'center', color: '#fff', maxW: VW - 24 });
      },
    });
  }

  const api = { install, fromLocal, fromShared, heroFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MHJuara = api;
  (root.MHKit = root.MHKit || {}).juara = api;
})(typeof window !== 'undefined' ? window : globalThis);
