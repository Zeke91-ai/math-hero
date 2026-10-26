"""Tes T13: halaman awal Math Hero (logo, tiga karakter, tombol, Kredit, tanpa info debug). DB sementara, port 8105."""
import os, subprocess, sys, tempfile
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8105
fails = []


def cek(nama, ok):
    print(('LULUS ' if ok else 'GAGAL  ') + nama)
    if not ok:
        fails.append(nama)


env = dict(os.environ, PORT=str(PORT), MATHHERO_DATA_DIR=tempfile.mkdtemp())
proc = subprocess.Popen(["node", "server.js"], cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
for line in proc.stdout:
    if "berjalan" in line:
        break
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        for nama, vp in (("potret", (393, 727)), ("lanskap", (727, 393)), ("kecil", (360, 640))):
            ctx = b.new_context(**dict(p.devices["Pixel 5"], viewport={"width": vp[0], "height": vp[1]}))
            page = ctx.new_page()
            errs = []
            page.on("pageerror", lambda e: errs.append(str(e)))
            page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
            page.goto(f"http://127.0.0.1:{PORT}/")
            page.wait_for_function("document.body.classList.contains('loaded')", timeout=15000)
            page.wait_for_timeout(500)
            cek(f"[{nama}] judul Math Hero", page.locator('#splash h1').inner_text().replace('\n', ' ').strip() == 'Math Hero')
            cek(f"[{nama}] info debug (fps) tersembunyi", page.locator('#status').is_hidden())
            cek(f"[{nama}] joystick tidak tampil di menu", page.evaluate("getComputedStyle(document.getElementById('controls')).display") == 'none')
            cek(f"[{nama}] tanpa gulir samping dan semua muat", page.evaluate("(() => { const s = document.getElementById('splash'); return s.scrollWidth <= s.clientWidth + 1 && s.scrollHeight <= s.clientHeight + 1; })()"))
            for i in ('btn-start', 'btn-continue', 'btn-highscore', 'btn-credit'):
                bb = page.locator('#' + i).bounding_box()
                cek(f"[{nama}] tombol {i} terlihat dan >= 44 px", bb is not None and bb['height'] >= 44 and bb['width'] >= 44 and bb['y'] + bb['height'] <= vp[1])
            cek(f"[{nama}] pil pesan kosong tidak tampil", page.locator('#menu-msg').is_hidden())
            if nama != "lanskap":
                n = page.evaluate("""() => [...document.querySelectorAll('#hero-trio canvas')].map(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let k = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) k++; return k; })""")
                cek(f"[{nama}] tiga karakter tergambar", len(n) == 3 and all(x > 50 for x in n))
            # Kredit
            page.click('#btn-credit')
            cek(f"[{nama}] panel Kredit tampil dengan atribusi", page.locator('#menu-credit').is_visible() and 'CraftPix' in page.locator('#menu-credit').inner_text() and page.locator('#menu-main').is_hidden())
            page.click('#credit-back')
            cek(f"[{nama}] Kembali dari Kredit ke menu utama", page.locator('#menu-main').is_visible() and page.locator('#menu-credit').is_hidden())
            # alur mulai tetap jalan
            page.click('#btn-start')
            cek(f"[{nama}] Mulai Baru membuka isi nama", page.locator('#menu-name').is_visible())
            cek(f"[{nama}] tanpa error console", not errs)
            ctx.close()
        b.close()
finally:
    proc.kill()
print("\nGAGAL:" if fails else "\nSEMUA LULUS", fails or "")
sys.exit(1 if fails else 0)
