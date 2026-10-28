"""Tes alur permainan nyata lewat Playwright (emulasi HP): peti soal, pintu, jembatan, bos, level selesai, game over.
Pemain dipindahkan lewat window.__mathHero, tombol Aksi ditekan lewat Input.action, jawaban dibaca dari soal di layar."""
import os, re, subprocess, sys, time
from playwright.sync_api import sync_playwright
import _tanpa_skor  # noqa: F401  (mematikan papan skor online selama tes)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8093
hasil = []


def cek(nama, ok, info=''):
    hasil.append(ok)
    print(('LULUS ' if ok else 'GAGAL ') + nama + (' | ' + str(info) if info != '' else ''))


def start_server():
    env = dict(os.environ, PORT=str(PORT), MATHHERO_DATA_DIR=__import__('tempfile').mkdtemp())  # DB sementara, bukan data asli
    proc = subprocess.Popen(["node", "server.js"], cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    deadline = time.time() + 10
    while time.time() < deadline:
        if "berjalan" in proc.stdout.readline():
            return proc
    proc.kill()
    raise RuntimeError("server tidak start")


def jawab(page, benar=True):
    """Baca soal di layar, hitung jawabannya, lalu klik pilihan benar (atau salah)."""
    page.wait_for_selector('#quiz:not(.hidden)', timeout=3000)
    expr = page.inner_text('#quiz-expr')
    m = re.match(r'\s*(\d+)\s*([+x×÷:])\s*(\d+)', expr)
    a, op, b = int(m.group(1)), m.group(2), int(m.group(3))
    ans = a + b if op == '+' else a * b if op in 'x×' else a // b
    pilihan = page.locator('#quiz-choices .choice')
    teks = [pilihan.nth(i).inner_text().strip() for i in range(pilihan.count())]
    target = str(ans) if benar else next(t for t in teks if t != str(ans))
    pilihan.nth(teks.index(target)).click()
    if not benar:
        page.wait_for_timeout(1700)  # soal terkunci 1,5 detik setelah jawaban salah
    return ans


def tutup_quiz(page):
    page.wait_for_function("document.getElementById('quiz').classList.contains('hidden')", timeout=9000)
    page.wait_for_timeout(250)


def aksi(page):
    page.evaluate("window.Input.action = true")
    page.wait_for_timeout(120)
    page.evaluate("window.Input.action = false")
    page.wait_for_timeout(200)


def pindah(page, c, k=0, ke_tanah=True):
    page.evaluate(f"""() => {{
      const h = window.__mathHero, W = h.world, P = h.player;
      P.x = {c} * 32; P.y = (W.L.R - {k}) * 32 - P.h - 2; P.vx = 0; P.vy = 0; P.inv = 5; P.hurt = 0;
      W.cam.x = P.x - 150;
    }}""")
    page.wait_for_timeout(250)


def main():
    server = start_server()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_context(**p.devices["Pixel 5"]).new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append("PAGEERROR " + str(e)))
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.goto(f"http://127.0.0.1:{PORT}/mh1/")
            page.wait_for_function("window.__mathHero && window.__mathHero.ready && document.body.classList.contains('loaded')", timeout=15000)

            # ---- Peti soal level 1 ----
            page.evaluate("window.__mathHero.startGame(0, 0, 1)")
            page.wait_for_timeout(300)
            pindah(page, 22)
            aksi(page)
            jawab(page, benar=False)
            page.wait_for_timeout(300)
            cek('jawaban salah tidak membuka peti', page.evaluate("window.__mathHero.world.crates[0].done") is False)
            jawab(page, benar=True)
            page.wait_for_timeout(600)
            tutup_quiz(page)
            sc = page.evaluate("window.__mathHero.game.score")
            cek('peti terbuka dan skor naik (jawab setelah salah = setengah)', page.evaluate("window.__mathHero.world.crates[0].done") and sc == 25, f'skor {sc}')

            # ---- Pintu tumpukan peti ----
            pindah(page, 66)
            aksi(page)
            jawab(page, True)
            page.wait_for_timeout(600)
            tutup_quiz(page)
            cek('tumpukan peti terbuka', page.evaluate("window.__mathHero.world.gates[0].open") is True)

            # ---- Trofi terkunci sebelum semua peti terjawab ----
            pindah(page, 101)
            page.wait_for_timeout(500)
            cek('trofi terkunci saat peti belum semua dijawab', page.evaluate("window.__mathHero.world.goal.won") is False)

            # ---- Level selesai ----
            page.evaluate("window.__mathHero.world.crates.forEach(c => c.done = true)")
            pindah(page, 101)
            page.wait_for_timeout(2200)
            cek('layar level selesai muncul', page.locator('#clear').is_visible())
            page.click('#btn-next')
            page.wait_for_timeout(600)
            cek('lanjut ke level 2', page.evaluate("window.__mathHero.world.levelIndex") == 1)

            # ---- Musuh: menginjak dan terkena ----
            page.evaluate("window.__mathHero.startGame(0, 0, 1)")
            page.wait_for_timeout(300)
            pos = page.evaluate("""() => { const e = window.__mathHero.world.enemies[0]; return [e.b.x, e.b.y]; }""")
            page.evaluate(f"""() => {{ const P = window.__mathHero.player; P.x = {pos[0]}; P.y = {pos[1]} - 120; P.vy = 200; P.vx = 0; P.inv = 0; }}""")
            page.wait_for_timeout(500)
            cek('menginjak musuh mengalahkannya', page.evaluate("window.__mathHero.world.enemies.length === 0 || window.__mathHero.world.enemies[0].dead"))
            page.evaluate("window.__mathHero.player.inv = 0; window.__mathHero.damagePlayer(15, 0)")
            cek('terkena musuh mengurangi health', page.evaluate("window.__mathHero.game.health") == 85)

            # ---- Jembatan level 2 ----
            page.evaluate("window.__mathHero.startGame(1, 0, 2)")
            page.wait_for_timeout(300)
            for i in range(3):
                pindah(page, 78 + int(i * 3.3))
                aksi(page)
                jawab(page, True)
                page.wait_for_timeout(500)
                tutup_quiz(page)
            cek('jembatan terpasang penuh setelah tiga jawaban', page.evaluate("window.__mathHero.world.bridges[0].built") == 3)

            # ---- Bos level 2 ----
            pindah(page, 125)
            page.wait_for_timeout(2200)
            st = page.evaluate("window.__mathHero.world.boss.state")
            cek('bos aktif saat pemain masuk arena', st in ('intro', 'move', 'tele', 'atk'), st)
            for hit in range(3):
                page.evaluate("""() => { const h = window.__mathHero, B = h.world.boss, P = h.player;
                  B.state = 'stun'; B.t = 0; B.b.vx = 0; P.x = B.b.x - 70; P.y = B.b.y + B.b.h - P.h; P.inv = 9; P.vy = 0; }""")
                page.wait_for_timeout(150)
                aksi(page)
                jawab(page, True)
                page.wait_for_timeout(500)
                tutup_quiz(page)
            page.wait_for_timeout(2600)
            cek('bos kalah setelah tiga serangan', page.evaluate("window.__mathHero.world.boss.defeated") is True)

            # ---- Game over ----
            page.evaluate("window.__mathHero.startGame(0, 0, 3)")
            page.wait_for_timeout(300)
            for _ in range(3):
                page.evaluate("const h = window.__mathHero; h.player.inv = 0; h.damagePlayer(500, 0)")
                page.wait_for_timeout(100)
            cek('game over setelah nyawa habis', page.locator('#over').is_visible())

            cek('tanpa error console', errors == [], errors)
            browser.close()
    finally:
        server.kill()
    print('HASIL:', 'LULUS' if all(hasil) else 'GAGAL', f'({sum(hasil)}/{len(hasil)})')
    sys.exit(0 if all(hasil) else 1)


main()
