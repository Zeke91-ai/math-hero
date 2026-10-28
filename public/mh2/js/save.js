// Math Hero 2: penyimpanan progres di localStorage (per HP/browser). Tiga slot pemain.
// Disimpan hanya: nama panggilan (1-6 huruf A-Z), pahlawan pilihan, bintang dan skor terbaik tiap level.
// Tidak ada data pribadi dan tidak ada yang dikirim ke mana pun.
// Mesin penyimpanan (skema berversi, cadangan, filter nama) ada di shared/js/save.js; berkas ini hanya data seri.
(function () {
  const M = window.MH2;
  const S = M.save = window.MHKit.save.create(M, {
    key: 'mathHero2.save.v1',
    version: 2,
    slots: 3,
    newPlayer: (nama) => ({ nama: nama.toUpperCase(), hero: 'pinki', stars: {}, best: {}, seen: {}, dibuat: Date.now(), main: 0 }),
  });
  const persist = S.persist;

  Object.assign(S, {
    // Simpan hasil level: bintang dan skor terbaik yang pernah dicapai.
    record(levelId, stars, score) {
      const p = S.active;
      if (!p) return { newBest: false, more: 0 };
      const before = p.stars[levelId] || 0;
      p.stars[levelId] = Math.max(before, stars);
      const newBest = score > (p.best[levelId] || 0);
      if (newBest) p.best[levelId] = score;
      p.main = (p.main || 0) + 1;
      persist();
      return { newBest, more: Math.max(0, stars - before) };
    },
    totalStars(p) { p = p || S.active; return p ? Object.values(p.stars).reduce((a, b) => a + b, 0) : 0; },
    totalScore(p) { p = p || S.active; return p ? Object.values(p.best).reduce((a, b) => a + b, 0) : 0; },
    starsOf(levelId) { return (S.active && S.active.stars[levelId]) || 0; },
    // Level terbuka jika level sebelumnya (urutan global) sudah selesai minimal 1 bintang.
    unlocked(levelIndex) {
      // ?buka=1 membuka semua level (untuk guru/orang tua yang ingin langsung ke materi tertentu).
      if (/[?&]buka=1(&|$)/.test(location.search)) return true;
      if (levelIndex === 0) return true;
      const prev = M.ALL_LEVELS[levelIndex - 1];
      return S.starsOf(prev.id) > 0;
    },
  });
})();
