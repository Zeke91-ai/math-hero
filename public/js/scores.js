// Papan skor bersama (Firebase Firestore) yang bisa dipakai banyak aplikasi: salin file ini + firebase-config.js ke aplikasi lain.
//   Scores.submit(appId, board, name, score, meta) -> Promise<boolean>   (tidak pernah melempar galat)
//   Scores.top(appId, board, n)                    -> Promise<array|null> (null = offline/belum dikonfigurasi: pakai skor lokal)
// appId = alias aplikasi (huruf kecil, angka, strip; contoh "math-hero"). board = papan di dalam aplikasi (contoh "mh1").
// Semua dokumen ada di satu koleksi "scores". SDK Firebase dimuat dari CDN resmi hanya saat pertama dipakai; tanpa konfigurasi atau jaringan,
// game tetap jalan seperti biasa. Catatan: skor dikirim dari browser sehingga orang teknis tetap bisa memalsukannya.
(function (root) {
  const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
  const COLLECTION = 'scores';
  const TIMEOUT_MS = 5000;
  const MAX_SCORE = 1000000;
  const APP_RE = /^[a-z][a-z0-9-]{1,31}$/;
  const BOARD_RE = /^[a-z0-9_.-]{1,32}$/;

  let backend = null;      // { add(doc), query(appId, board, limit) }
  let backendPromise = null;

  function configured() {
    const c = root.SCORES_CONFIG;
    return !!(c && c.apiKey && c.projectId && !/^ISI_/.test(c.apiKey) && !/^ISI_/.test(c.projectId));
  }

  async function firebaseBackend(cfg) {
    const [appMod, fs] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-firestore.js')]);
    const db = fs.getFirestore(appMod.initializeApp(cfg, 'scores'));
    const col = fs.collection(db, COLLECTION);
    return {
      add: (doc) => fs.addDoc(col, Object.assign({}, doc, { createdAt: fs.serverTimestamp() })),
      // Butuh indeks gabungan appId + board + score (menurun); konsol Firebase memberi tautan pembuatnya saat pertama dipanggil.
      query: async (appId, board, limit) => {
        const q = fs.query(col, fs.where('appId', '==', appId), fs.where('board', '==', board), fs.orderBy('score', 'desc'), fs.limit(limit));
        const snap = await fs.getDocs(q);
        return snap.docs.map((d) => {
          const x = d.data();
          return Object.assign({}, x, { createdAt: x.createdAt && x.createdAt.toMillis ? x.createdAt.toMillis() : null });
        });
      },
    };
  }

  function getBackend() {
    if (backend) return Promise.resolve(backend);
    if (!configured()) return Promise.resolve(null);
    if (!backendPromise) {
      backendPromise = firebaseBackend(root.SCORES_CONFIG).then((b) => { backend = b; return b; }, () => { backendPromise = null; return null; });
    }
    return backendPromise;
  }

  const timeout = (p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), TIMEOUT_MS))]);

  // Bersihkan meta: hanya nilai sederhana, paling banyak 8 kunci (sama dengan aturan Firestore di README).
  function cleanMeta(meta) {
    const out = {};
    if (!meta || typeof meta !== 'object') return out;
    for (const k of Object.keys(meta).slice(0, 8)) {
      const v = meta[k];
      if (typeof v === 'number' && isFinite(v)) out[k] = v;
      else if (typeof v === 'string') out[k] = v.slice(0, 40);
      else if (typeof v === 'boolean') out[k] = v;
    }
    return out;
  }

  function build(appId, board, name, score, meta) {
    const nm = String(name == null ? '' : name).trim().slice(0, 16);
    const sc = Math.floor(Number(score));
    if (!APP_RE.test(appId) || !BOARD_RE.test(board) || !nm || !(sc >= 0 && sc <= MAX_SCORE)) return null;
    const doc = { appId, board, name: nm, score: sc };
    const m = cleanMeta(meta);
    if (Object.keys(m).length) doc.meta = m;
    return doc;
  }

  async function submit(appId, board, name, score, meta) {
    try {
      const doc = build(appId, board, name, score, meta);
      if (!doc) return false;
      const b = await getBackend();
      if (!b) return false;
      await timeout(b.add(doc));
      return true;
    } catch (e) { return false; }
  }

  // Skor terbaik tiap nama, urut tertinggi dulu; yang lebih dulu mencapai skor sama menang.
  async function top(appId, board, n) {
    try {
      if (!APP_RE.test(appId) || !BOARD_RE.test(board)) return null;
      const b = await getBackend();
      if (!b) return null;
      const want = Math.max(1, Math.min(Math.floor(n) || 10, 50));
      const rows = await timeout(b.query(appId, board, Math.min(want * 5, 100)));
      const best = new Map();
      for (const r of rows) {
        if (!r || typeof r.name !== 'string' || typeof r.score !== 'number') continue;
        const cur = best.get(r.name);
        if (!cur || r.score > cur.score || (r.score === cur.score && (r.createdAt || 0) < (cur.createdAt || 0))) best.set(r.name, r);
      }
      return [...best.values()]
        .sort((a, b2) => b2.score - a.score || (a.createdAt || 0) - (b2.createdAt || 0))
        .slice(0, want)
        .map((r) => ({ name: r.name, score: r.score, meta: r.meta || {}, createdAt: r.createdAt || null }));
    } catch (e) { return null; }
  }

  const api = { submit, top, enabled: () => !!backend || configured(), _setBackend(b) { backend = b; backendPromise = null; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Scores = api;
})(typeof window !== 'undefined' ? window : globalThis);
