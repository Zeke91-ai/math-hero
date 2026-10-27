// Konfigurasi Firebase untuk papan skor bersama (js/scores.js).
// Nilai di bawah ini BUKAN rahasia (memang dirancang publik untuk aplikasi web), tetapi tetap isi dari konsol Firebase milikmu sendiri:
// Project settings > General > Your apps > Web app > SDK setup and configuration > Config.
// Selama masih berisi "ISI_...", papan skor online mati dan game memakai skor lokal di HP/browser. Lihat README bagian "Papan skor bersama".
// JANGAN pernah menaruh kunci akun layanan (service account) atau rahasia lain di file ini.
window.SCORES_CONFIG = {
  apiKey: 'ISI_API_KEY',
  authDomain: 'ISI_PROJECT_ID.firebaseapp.com',
  projectId: 'ISI_PROJECT_ID',
  appId: 'ISI_APP_ID_FIREBASE',
};
