// Bonus level yang menyusut menurut waktu main, supaya papan juara menghargai kecepatan.
// Bonus mulai dari `base` poin dan berkurang 1 poin tiap `secPerPoint` detik waktu main aktif, paling rendah 0.
// Bonus hanya tambahan: skor dasar tidak pernah berkurang karena lambat, jadi anak yang berpikir tenang tidak dihukum.
// Hanya waktu main aktif yang dihitung. Pemanggil cukup memanggil tick(dt) ketika permainan benar-benar berjalan (bukan saat
// jeda, kartu PR, cerita, atau layar hasil); tab yang tersembunyi tidak ikut dihitung.
//
// Ubah kecepatan susut tiap game di tabel GAMES di bawah ini (satu tempat, satu angka).
(function (root) {
  const GAMES = {
    mh1: { base: 200, secPerPoint: 5 },
    mh2: { base: 200, secPerPoint: 5 },
    mh3: { base: 200, secPerPoint: 5 },
  };

  // Bonus tersisa setelah `seconds` detik main aktif.
  function value(base, secPerPoint, seconds) {
    const s = Number(seconds);
    const lost = isFinite(s) && s > 0 ? Math.floor(s / secPerPoint) : 0;
    return Math.max(0, Math.floor(base) - lost);
  }

  function create(cfg) {
    const base = Math.max(0, Math.floor(cfg.base)), sec = cfg.secPerPoint > 0 ? cfg.secPerPoint : 5;
    let t = 0;
    return {
      base, secPerPoint: sec,
      // Tambah waktu main aktif. dt yang tidak masuk akal (negatif, bukan angka, lebih dari 1 detik) diabaikan.
      tick(dt) {
        if (root.document && root.document.hidden) return;
        if (isFinite(dt) && dt > 0 && dt <= 1) t += dt;
      },
      value: () => value(base, sec, t),
      seconds: () => t,
      reset() { t = 0; },
    };
  }

  const forGame = (id) => create(GAMES[id]);
  // 83 detik -> "1:23"
  const clock = (sec) => { const s = Math.max(0, Math.floor(sec)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  const api = { GAMES, value, create, forGame, clock };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TimeBonus = api;
})(typeof window !== 'undefined' ? window : globalThis);
