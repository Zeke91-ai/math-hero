// Uji templat seri baru:  node tests/template.test.js
// Membuat seri uji dari templat, memastikan semua berkas yang dirujuk index.html ada, skripnya sintaks benar,
// dan pembuat seri menolak id buruk atau folder yang sudah ada. Folder uji dihapus di akhir.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { buat } = require('../scripts/buat_seri.js');
const PUBLIC = path.join(__dirname, '..', 'public');
const ID = 'mh-uji-templat';
const dir = path.join(PUBLIC, ID);
let n = 0;
const ok = (c, m) => { n++; assert.ok(c, 'GAGAL: ' + m); console.log('ok: ' + m); };
fs.rmSync(dir, { recursive: true, force: true });
try {
  buat(ID, "Seri 'Uji' <b>&</b>");
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  ok(!/__JUDUL__|__ID__/.test(html) && html.includes('<title>Seri Uji b/b</title>'), 'placeholder terganti dan judul dibersihkan dari tanda HTML');
  const refs = [...html.matchAll(/(?:src|href)="([^"#:]+?)"/g)].map((m) => m[1]).filter((r) => !r.startsWith('data'));
  ok(refs.length >= 10, `index.html merujuk ${refs.length} berkas`);
  for (const r of refs) ok(fs.existsSync(path.join(dir, r)), 'berkas rujukan ada: ' + r);
  const scenes = fs.readFileSync(path.join(dir, 'js', 'scenes.js'), 'utf8');
  ok(!/__JUDUL__|__ID__/.test(scenes), 'scenes.js bebas placeholder');
  for (const f of ['js/scenes.js', 'js/gfx.js']) execFileSync(process.execPath, ['--check', path.join(dir, f)]);
  ok(true, 'scenes.js dan gfx.js lulus pemeriksaan sintaks');
  ok(fs.existsSync(path.join(dir, 'assets', 'sprites.png')) && fs.existsSync(path.join(dir, 'assets', 'sprites.json')), 'atlas sprite disalin');
  assert.throws(() => buat(ID, 'x'), /sudah ada/); ok(true, 'folder yang ada tidak ditimpa');
  assert.throws(() => buat('Bad Id', 'x'), /id seri/); ok(true, 'id buruk ditolak');
  assert.throws(() => buat('mh-uji-lain', '  '), /judul/); ok(true, 'judul kosong ditolak');
  ok(!fs.existsSync(path.join(PUBLIC, 'mh-uji-lain')), 'tidak ada folder tersisa dari percobaan gagal');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(`semua uji templat lulus (${n} cek)`);
