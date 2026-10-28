// Math Hero 2: konfigurasi grafis seri. Mesin gambarnya ada di shared/js/gfx.js; di sini hanya data MH2.
(function () {
  window.MHKit.gfx.install(window.MH2, {
    heroes: [
      { key: 'pinki', nama: 'Pinki', desc: 'Si pemberani merah muda', need: 0, set: 'mh2' },
      { key: 'owi', nama: 'Owi', desc: 'Burung hantu pintar', need: 0, set: 'mh2' },
      { key: 'hero1', nama: 'Anak Berani', desc: 'Pahlawan Math Hero 1', need: 0, set: 'mh1' },
      { key: 'dudu', nama: 'Dudu', desc: 'Si biru yang lincah', need: 12, set: 'mh2' },
      { key: 'hero2', nama: 'Robo Kuning', desc: 'Robot dari Math Hero 1', need: 30, set: 'mh1' },
      { key: 'hero3', nama: 'Rubah Lincah', desc: 'Rubah dari Math Hero 1', need: 50, set: 'mh1' },
    ],
  });
})();
