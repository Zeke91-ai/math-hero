"""Alat bantu KB Markdown untuk Math Hero. KB ada di folder kb/ (BUKAN lagi kb.sqlite).
Pemakaian (dari folder project):
  python scripts/kb.py log <tahap> "<aktivitas>" <status> "<catatan>"   -> catat aktivitas ke kb/log.md
  python scripts/kb.py logjson <berkas.json>                            -> sama, teks panjang lewat JSON {"tahap","aktivitas","status","catatan"}
  python scripts/kb.py tahap <id> <status>                              -> ubah status tahap (belum/proses/selesai)
  python scripts/kb.py tahap baru <id> "<nama>"                         -> tambah tahap
  python scripts/kb.py kendala tambah <tahap> "<judul>" "<deskripsi>"   -> catat hal yang belum ada
  python scripts/kb.py kendala selesai <id> "<catatan resolusi>"        -> tandai resolved
  python scripts/kb.py kendala daftar                                   -> daftar kendala
  python scripts/kb.py handoff                                          -> tampilkan kb/RINGKASAN.md
Identitas agent: variabel lingkungan KB_AGENT (default zeke). Waktu dicatat otomatis (waktu lokal).
Kamu juga boleh mengedit berkas di kb/ langsung; format tiap berkas dijelaskan di bagian atasnya.
"""
import json
import os
import re
import sys
from datetime import datetime

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KB = os.path.join(BASE, 'kb')
F_TAHAP = os.path.join(KB, 'tahap.md')
F_KENDALA = os.path.join(KB, 'kendala.md')
F_LOG = os.path.join(KB, 'log.md')
F_RINGKAS = os.path.join(KB, 'RINGKASAN.md')
AGENT = os.environ.get('KB_AGENT', 'zeke')

H_TAHAP = """# Tahap pekerjaan

Tabel tahap. Ubah status lewat `python scripts/kb.py tahap <id> <status>` (belum/proses/selesai).

| ID | Nama | Status | Diupdate |
|---|---|---|---|
"""
H_KENDALA = """# Kendala dan hal yang belum ada

Satu bagian per kendala, format judul: `## #<id> [TERBUKA|RESOLVED] <tahap> | <judul>`.
Tambah/selesaikan lewat `python scripts/kb.py kendala ...`. Jangan ubah nomor id.

"""
H_LOG = """# Log kerja (urut waktu, terbaru di bawah)

Format tiap entri: `## [#<id>] <waktu> | <agent> | <tahap> | <status>` lalu **Aktivitas** dan **Catatan**.
Tambah entri lewat `python scripts/kb.py log ...` (waktu dan identitas agent dicatat otomatis).

"""


def now():
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')


def read(p, default=''):
    if not os.path.exists(p):
        return default
    with open(p, encoding='utf-8-sig') as f:
        return f.read().replace('\r\n', '\n')


def write(p, text):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)


def one(s):
    """Satu baris (untuk sel tabel dan judul)."""
    return re.sub(r'\s+', ' ', str(s or '')).replace('|', '/').strip() or '-'


# ---------- tahap ----------
def parse_tahap():
    rows = []
    for ln in read(F_TAHAP).splitlines():
        m = re.match(r'^\| (\S+) \| (.*) \| (\S+) \| (.*) \|$', ln)
        if m and m.group(1) != 'ID':
            rows.append(list(m.groups()))
    return rows


def write_tahap(rows):
    write(F_TAHAP, H_TAHAP + ''.join(f'| {a} | {one(b)} | {c} | {d} |\n' for a, b, c, d in rows))


def set_tahap(tid, status):
    rows = parse_tahap()
    hit = [r for r in rows if r[0] == tid]
    if not hit:
        print('tahap', tid, 'TIDAK DITEMUKAN')
        return
    hit[0][2], hit[0][3] = status, now()
    write_tahap(rows)
    regen()
    print('tahap', tid, '->', status)


def tahap_baru(tid, nama):
    rows = parse_tahap()
    if any(r[0] == tid for r in rows):
        print('tahap', tid, 'sudah ada')
        return
    rows.append([tid, nama, 'belum', now()])
    write_tahap(rows)
    regen()
    print('tahap baru', tid)


# ---------- log ----------
def fmt_log(i, waktu, agent, tahap, aktivitas, status, catatan):
    return (f"## [#{i}] {waktu} | {agent} | {one(tahap)} | {one(status)}\n\n"
            f"**Aktivitas:** {str(aktivitas).strip()}\n\n"
            + (f"**Catatan:** {str(catatan).strip()}\n\n" if str(catatan or '').strip() else ''))


def log_entries():
    text = read(F_LOG)
    parts = re.split(r'(?m)^(?=## \[#\d+\] )', text)
    return [p for p in parts[1:]]


def log(tahap, aktivitas, status='selesai', catatan=''):
    ents = log_entries()
    ids = [int(re.match(r'## \[#(\d+)\]', e).group(1)) for e in ents]
    nid = (max(ids) if ids else 0) + 1
    base = read(F_LOG) or H_LOG
    if not base.endswith('\n'):
        base += '\n'
    write(F_LOG, base + fmt_log(nid, now(), AGENT, tahap, aktivitas, status, catatan))
    regen()
    print('tercatat: #%d' % nid, now(), AGENT, tahap, status)


# ---------- kendala ----------
def kendala_sections():
    text = read(F_KENDALA)
    return re.split(r'(?m)^(?=## #\d+ \[)', text)  # [0] = kepala berkas


def fmt_kendala(i, status, tahap, judul, dibuat, oleh, deskripsi, resolved_at='', resolved_by='', catatan=''):
    s = f"## #{i} [{status}] {one(tahap)} | {one(judul)}\n- dibuat: {dibuat} oleh {oleh}\n"
    if str(deskripsi or '').strip():
        s += f"- deskripsi: {str(deskripsi).strip()}\n"
    if status == 'RESOLVED':
        s += f"- selesai: {resolved_at} oleh {resolved_by}\n"
        if str(catatan or '').strip():
            s += f"- catatan resolusi: {str(catatan).strip()}\n"
    return s + "\n"


def kendala_tambah(tahap, judul, deskripsi=''):
    secs = kendala_sections()
    ids = [int(re.match(r'## #(\d+)', s).group(1)) for s in secs[1:]]
    nid = (max(ids) if ids else 0) + 1
    base = read(F_KENDALA) or H_KENDALA
    if not base.endswith('\n'):
        base += '\n'
    write(F_KENDALA, base + fmt_kendala(nid, 'TERBUKA', tahap, judul, now(), AGENT, deskripsi))
    regen()
    print('kendala baru id =', nid)


def kendala_selesai(kid, catatan=''):
    secs = kendala_sections()
    for n, s in enumerate(secs):
        if n and re.match(rf'## #{kid} \[', s):
            if '[RESOLVED]' in s.split('\n', 1)[0]:
                print('kendala', kid, 'sudah resolved')
                return
            head, _, rest = s.partition('\n')
            head = head.replace('[TERBUKA]', '[RESOLVED]', 1)
            rest = rest.rstrip('\n') + f"\n- selesai: {now()} oleh {AGENT}\n"
            if str(catatan or '').strip():
                rest += f"- catatan resolusi: {str(catatan).strip()}\n"
            secs[n] = head + '\n' + rest + '\n'
            write(F_KENDALA, ''.join(secs))
            regen()
            print('kendala', kid, 'resolved')
            return
    print('kendala', kid, 'TIDAK DITEMUKAN')


def kendala_list():
    out = []
    for s in kendala_sections()[1:]:
        m = re.match(r'## #(\d+) \[(\w+)\] (.*?) \| (.*)', s.split('\n', 1)[0])
        if m:
            out.append(m.groups())  # id, status, tahap, judul
    return out


def kendala_daftar():
    for i, st, th, ju in kendala_list():
        print(f'#{i} [{st}] tahap={th} | {ju}')


# ---------- ringkasan untuk agent berikutnya ----------
def regen():
    ents = log_entries()[-5:]
    t = ["# RINGKASAN (dibuat otomatis oleh scripts/kb.py; jangan diedit tangan)", "",
         "Baca ini dulu, lalu detail di `tahap.md`, `kendala.md`, `log.md`. Catat kerjamu lewat `python scripts/kb.py` (identitas dari `KB_AGENT`).", "",
         "## Tahap", ""]
    t += [f"- {a} [{c}] {b} (diupdate {d})" for a, b, c, d in parse_tahap()]
    t += ["", "## Kendala terbuka", ""]
    buka = [k for k in kendala_list() if k[1] == 'TERBUKA']
    t += [f"- #{i} (tahap {th}) {ju}" for i, st, th, ju in buka] or ["- (tidak ada)"]
    t += ["", "## 5 entri log terakhir (ringkas; lengkapnya di log.md)", ""]
    for e in ents:
        head, _, body = e.partition('\n')
        akt = re.search(r'\*\*Aktivitas:\*\* (.*?)(?=\n\n\*\*Catatan|\n*$)', body, re.S)
        txt = (akt.group(1) if akt else body).strip().replace('\n', ' ')
        t.append(f"- {head[3:]}: {txt[:300]}{'...' if len(txt) > 300 else ''}")
    write(F_RINGKAS, '\n'.join(t) + '\n')


def handoff():
    regen()
    print(read(F_RINGKAS))


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a:
        print(__doc__)
    elif a[0] == 'log':
        log(*a[1:5])
    elif a[0] == 'logjson':
        d = json.load(open(a[1], encoding='utf-8-sig'))
        log(d['tahap'], d['aktivitas'], d.get('status', 'selesai'), d.get('catatan', ''))
    elif a[0] == 'tahap' and len(a) > 3 and a[1] == 'baru':
        tahap_baru(a[2], a[3])
    elif a[0] == 'tahap' and len(a) > 2:
        set_tahap(a[1], a[2])
    elif a[0] == 'kendala' and len(a) > 4 and a[1] == 'tambah':
        kendala_tambah(*a[2:5])
    elif a[0] == 'kendala' and len(a) > 2 and a[1] == 'selesai':
        kendala_selesai(a[2], a[3] if len(a) > 3 else '')
    elif a[0] == 'kendala' and len(a) > 1 and a[1] == 'daftar':
        kendala_daftar()
    elif a[0] == 'handoff':
        handoff()
    else:
        print(__doc__)
