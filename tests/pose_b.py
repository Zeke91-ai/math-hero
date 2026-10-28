"""Tes tombol B dan pose gaya: label B, pose muncul saat tidak ada sasaran, sasaran (peti) tetap membuka soal,
pose berhenti saat bergerak/melompat, tiga jenis pose bisa digambar tanpa error."""
import os, subprocess, sys, tempfile, time
from playwright.sync_api import sync_playwright
import _tanpa_skor  # noqa: F401  (mematikan papan skor online selama tes)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8097
SHOTS = os.path.join(ROOT, 'tests', 'shots')
os.makedirs(SHOTS, exist_ok=True)
hasil = []


def cek(nama, ok, info=''):
    hasil.append(ok)
    print(('LULUS ' if ok else 'GAGAL ') + nama + (' | ' + str(info).encode('ascii', 'replace').decode() if info != '' else ''))


def start_server(db):
    env = dict(os.environ, PORT=str(PORT), MATHHERO_DATA_DIR=db)
    proc = subprocess.Popen(["node", "server.js"], cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    deadline = time.time() + 10
    while time.time() < deadline:
        if "berjalan" in proc.stdout.readline():
            return proc
    proc.kill()
    raise RuntimeError("server tidak start")


def tekan_b(page, ms=120):
    page.locator('#btn-action').dispatch_event('pointerdown')
    page.wait_for_timeout(ms)
    page.locator('#btn-action').dispatch_event('pointerup')


def main():
    server = start_server(tempfile.mkdtemp())
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_context(**p.devices["Pixel 5"]).new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.goto(f"http://127.0.0.1:{PORT}/mh1/")
            page.wait_for_function("document.body.classList.contains('loaded')", timeout=15000)
            page.evaluate("window.__mathHero.startGame(0, 0, 2)")
            page.wait_for_timeout(2200)  # tunggu animasi muncul selesai
            cek('label tombol adalah B', page.inner_text('#btn-action').strip() == 'B')
            cek('tidak ada teks Aksi di layar', 'Aksi' not in page.inner_text('#controls') and 'AKSI' not in page.inner_text('#controls'))
            page.evaluate("window.__mathHero.player.x = 200")  # jauh dari peti
            page.wait_for_timeout(500)
            cek('awalnya tidak ada pose', page.evaluate("window.__mathHero.player.pose") is None)
            tekan_b(page)
            page.wait_for_timeout(150)
            pose = page.evaluate("window.__mathHero.player.pose")
            cek('B tanpa sasaran memulai pose', pose is not None, pose)
            page.wait_for_timeout(1500)
            cek('pose selesai sendiri', page.evaluate("window.__mathHero.player.pose") is None)
            # Tiga jenis pose dipicu paksa, diambil gambarnya.
            for kind in ['salto', 'joget', 'tada']:
                page.wait_for_timeout(300)
                ok = page.evaluate(f"window.__mathHero.startPose('{kind}')")
                page.wait_for_timeout(330)
                page.screenshot(path=os.path.join(SHOTS, f'pose_{kind}.png'))
                cek(f'pose {kind} berjalan', ok and page.evaluate("window.__mathHero.player.pose.kind") == kind)
                page.wait_for_timeout(1300)
            # Bergerak membatalkan pose.
            page.evaluate("window.__mathHero.startPose('joget')")
            page.wait_for_timeout(200)
            page.evaluate("window.Input.joy.x = 1")
            page.wait_for_timeout(200)
            page.evaluate("window.Input.joy.x = 0")
            cek('bergerak membatalkan pose', page.evaluate("window.__mathHero.player.pose") is None)
            # Dekat peti: B membuka soal, bukan pose.
            petix = page.evaluate("window.__mathHero.world.crates[0].x")
            page.evaluate(f"window.__mathHero.player.x = {petix} - 14")
            page.wait_for_timeout(700)
            tekan_b(page)
            page.wait_for_timeout(400)
            cek('B dekat peti membuka soal', page.evaluate("window.Quiz.isOpen()") is True)
            cek('dan tidak memulai pose', page.evaluate("window.__mathHero.player.pose") is None)
            cek('tanpa error', errors == [], errors)
            browser.close()
    finally:
        server.kill()
    print('HASIL:', 'LULUS' if all(hasil) else 'GAGAL', f'({sum(hasil)}/{len(hasil)})')
    sys.exit(0 if all(hasil) else 1)


main()
