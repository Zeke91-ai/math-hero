// Kit: penyimpanan progres anak di localStorage (per HP/browser), dipakai semua seri.
// Kode bersama; model data tiap seri (bentuk pemain, aturan bintang, dst.) dikirim lewat konfigurasi:
//   const S = MHKit.save.create(M, {
//     key: 'mathHero2.save.v1',        // kunci localStorage (JANGAN diganti: progres anak ada di sini)
//     version: 2,                       // versi skema saat ini
//     slots: 3,
//     newPlayer: (nama) => ({...}),     // bentuk pemain baru
//     normPlayer: (p) => p,             // opsional: lengkapi bidang yang belum ada pada pemain lama
//     migrations: { 1: (data) => data }, // opsional: langkah dari versi N ke N+1 (mengubah data utuh)
//   });
// Skema berversi: data lama tanpa bidang `v` dianggap versi 1 (bentuk yang dipakai sebelum kit).
// Sebelum data lama dimigrasi, salinan mentahnya disimpan di `<key>.cadangan`; data rusak disimpan di
// `<key>.rusak` sebelum ditimpa. Data dari versi yang lebih BARU daripada kode ini tidak diturunkan versinya.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.MHKit = root.MHKit || {}).save = api;
})(typeof window !== 'undefined' ? window : this, function () {
  // Nama yang tidak pantas untuk anak ditolak (pencocokan persis). Sama dengan daftar Math Hero 1.
  const BLOCKED = new Set(['ANJING', 'BABI', 'BAJING', 'BANGSAT', 'KONTOL', 'MEMEK', 'PANTEK', 'PUKI', 'TOLOL', 'GOBLOK', 'BEGO',
    'JANCOK', 'JANCUK', 'NGENTO', 'TETEK', 'SEX', 'FUCK', 'SHIT', 'BITCH', 'DICK', 'PUSSY', 'COCK', 'CUNT', 'NAZI', 'RAPE', 'PORN', 'PORNO']);

  function checkName(nama) {
    nama = String(nama || '').toUpperCase();
    if (!/^[A-Z]{1,6}$/.test(nama)) return 'Nama harus 1 sampai 6 huruf.';
    if (BLOCKED.has(nama)) return 'Nama itu tidak bisa dipakai. Coba nama lain, ya!';
    return null;
  }

  // Terima data mentah (string) dan kembalikan { data, migrated } atau null bila bukan data simpanan yang sah.
  function upgrade(raw, cfg) {
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.slots)) return null;
    const from = typeof d.v === 'number' ? d.v : 1;
    let migrated = false;
    for (let v = from; v < cfg.version; v++) {
      const step = cfg.migrations && cfg.migrations[v];
      if (step) { const r = step(d); if (r && r !== d) Object.assign(d, r); }
      migrated = true;
    }
    if (from < cfg.version) d.v = cfg.version; // data dari versi lebih baru dibiarkan apa adanya
    d.slots = d.slots.slice(0, cfg.slots).map((p) => (p && cfg.normPlayer ? cfg.normPlayer(p) : p || null));
    while (d.slots.length < cfg.slots) d.slots.push(null);
    return { data: d, migrated };
  }

  function create(M, cfg) {
    cfg = Object.assign({ slots: 3, version: 2 }, cfg);
    const blank = () => ({ v: cfg.version, slots: Array(cfg.slots).fill(null), active: -1 });
    let data = null, memory = null;

    function put(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } }
    function load() {
      let raw = null;
      try { raw = localStorage.getItem(cfg.key); } catch (e) { /* ditolak */ }
      if (raw) {
        try {
          const r = upgrade(raw, cfg);
          if (r) {
            if (r.migrated) {
              let had = null;
              try { had = localStorage.getItem(cfg.key + '.cadangan'); } catch (e) { /* abaikan */ }
              if (!had) put(cfg.key + '.cadangan', raw);
            }
            return r.data;
          }
        } catch (e) { /* rusak: jatuh ke bawah */ }
        let had = null;
        try { had = localStorage.getItem(cfg.key + '.rusak'); } catch (e) { /* abaikan */ }
        if (!had) put(cfg.key + '.rusak', raw);
      }
      return memory || blank();
    }
    function persist() {
      memory = data;
      try { localStorage.setItem(cfg.key, JSON.stringify(data)); } catch (e) { /* tetap jalan dari memori */ }
    }
    data = load();

    const S = {
      slots: () => data.slots,
      get active() { return data.active >= 0 ? data.slots[data.active] : null; },
      checkName,
      create(i, nama) {
        data.slots[i] = cfg.newPlayer(nama);
        data.active = i; persist();
        return data.slots[i];
      },
      use(i) { if (data.slots[i]) { data.active = i; persist(); } },
      remove(i) { data.slots[i] = null; if (data.active === i) data.active = -1; persist(); },
      // Jalankan fungsi pada pemain aktif lalu simpan. Tanpa pemain aktif: tidak melakukan apa-apa.
      act(fn, fallback) {
        const p = S.active;
        if (!p) return fallback;
        const r = fn(p);
        persist();
        return r;
      },
      setHero(key) { S.act((p) => { p.hero = key; }); },
      markSeen(key) { S.act((p) => { p.seen[key] = true; }); },
      seen(key) { return !!(S.active && S.active.seen[key]); },
      heroUnlocked: (h) => S.totalStars() >= h.need,
      // Muat ulang dari penyimpanan (dipakai tes untuk meniru buka-tutup aplikasi).
      reload() { data = load(); },
      persist,
      version: cfg.version,
    };
    return S;
  }

  return { create, checkName, upgrade, BLOCKED };
});
