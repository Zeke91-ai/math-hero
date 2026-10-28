// Kredit bersama untuk MH1, MH2, MH3. API global: window.MathHeroCredits.
// Bagian (section) = { head: 'JUDUL', lines: ['baris', ...] }; head boleh dikosongkan.
// Item gameEntries boleh berupa bagian milik game atau string kunci bagian bersama ('musik', 'animasi', 'font').
(function () {
  const SHARED = {
    font: { head: 'FONT', lines: ['Kleintenna (freeware)', 'Pixelzone (domain publik)'] },
    musik: { head: 'MUSIK DAN SUARA', lines: ['Disintesis langsung di browser'] },
    animasi: { head: 'PUSTAKA ANIMASI', lines: ['GSAP (GreenSock)'] },
  };
  const by = 'an edu-game by Hilmi Fuadi';
  const mail = 'hilmifuadi@gmail.com';
  const thanks = 'Terima kasih sudah belajar!';

  const resolve = (entries) => entries.map((e) => (typeof e === 'string' ? SHARED[e] : e)).filter(Boolean);

  // Array string untuk roll kanvas (MH2/MH3): judul huruf besar, bagian dipisah baris kosong.
  function lines(gameEntries) {
    const out = [];
    resolve(gameEntries || []).forEach((s) => {
      if (s.head) out.push(s.head);
      (s.lines || []).forEach((l) => out.push(l));
      out.push('');
    });
    out.push(thanks, '', by, mail);
    return out;
  }

  // Isi DOM roll MH1 (#credit-roll-inner): h3 + p per bagian, lalu penutup.
  function renderRoll(el, gameEntries) {
    if (!el) return;
    el.textContent = '';
    const add = (tag, text, cls) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (Array.isArray(text)) text.forEach((t, i) => { if (i) n.appendChild(document.createElement('br')); n.appendChild(document.createTextNode(t)); });
      else n.textContent = text;
      el.appendChild(n);
    };
    resolve(gameEntries || []).forEach((s) => {
      if (s.head) add('h3', s.head);
      if (s.lines && s.lines.length) add('p', s.lines);
    });
    add('p', thanks);
    add('p', by, 'credit-by');
    add('p', mail, 'credit-mail');
  }

  window.MathHeroCredits = { by, mail, thanks, shared: SHARED, lines, renderRoll };
})();
