// Math Hero 3: penyimpanan progres di localStorage (per HP/browser). Tiga slot pemain.
// Disimpan: nama panggilan (1-6 huruf A-Z), pahlawan, kelas, bintang dan skor tiap level, pasukan yang diselamatkan,
// upgrade, Kunci Kristal, pilihan 4 pasukan, dan Buku PR. Tidak ada data pribadi dan tidak ada yang dikirim ke mana pun.
// Aturannya ada di progress.js (murni logika); mesin penyimpanan (skema berversi, cadangan) ada di shared/js/save.js.
(function () {
  const M = window.MH2;
  const P = window.MH3.progress;

  const S = M.save = window.MHKit.save.create(M, {
    key: 'mathHero3.save.v1',
    version: 2,
    slots: 3,
    newPlayer: (nama) => P.blank(nama),
    normPlayer: (p) => P.norm(p),
  });
  const act = S.act;
  const cur = () => S.active || P.blank('X');

  Object.assign(S, {
    setGrade(g) { act((p) => { p.grade = Math.max(2, Math.min(5, g | 0)); }); },
    // Tingkat soal PR untuk dunia `base`, disesuaikan dengan 6 PR terakhir (lihat progress.js adaptTier).
    adaptTier: (base) => P.adaptTier(cur(), base),

    // Level dan bintang.
    record(id, stars, score) { return act((p) => P.record(p, id, stars, score), { first: false, more: 0 }); },
    starsOf: (id) => P.starsOf(cur(), id),
    totalStars: (p) => P.totalStars(p || cur()),
    totalScore: (p) => P.totalScore(p || cur()),
    crystals: (p) => P.crystals(p || cur()),
    current: () => P.current(cur()),
    bonusStars: (index) => P.bonusStars(cur(), index),
    // ?buka=1 membuka semua level (untuk guru/orang tua yang ingin langsung ke materi tertentu).
    unlocked: (index) => P.unlocked(cur(), index, /[?&]buka=1(&|$)/.test(location.search)),

    // Pasukan, Kunci, upgrade.
    owned: () => P.owned(cur()),
    rescue(id) { return act((p) => P.rescue(p, id), false); },
    unitLevel: (id) => P.unitLevel(cur(), id),
    upgradeCost: (id) => P.upgradeCost(cur(), id),
    upgrade(id) { return act((p) => P.upgrade(p, id), { ok: false, why: 'belum' }); },
    keys: () => cur().keys,
    addKeys(n) { return act((p) => P.addKeys(p, n), 0); },
    loadout: () => P.loadout(cur()),
    toggleLoadout(id) { return act((p) => P.toggleLoadout(p, id), 'belum'); },

    // Buku PR.
    logPR(r, title) { return act((p) => P.logPR(p, r, title), null); },
    finishLater(entry, r) { return act((p) => P.finishLater(p, entry, r), { keys: 0 }); },
    book: () => cur().book,
    weekCount: () => P.weekCount(cur()),
  });
})();
