"""Uji jalan Math Hero 2 di Chromium (Playwright), profil HP Pixel 5.

Yang diuji:
- halaman pemilih seri (/) tampil dan kedua tautan mengarah ke mh1/ dan mh2/,
- Math Hero 1 tetap bisa dimuat dari mh1/,
- ke-30 level Math Hero 2 bisa dimulai dan diselesaikan sampai layar hasil (jawaban benar diisi lewat kait solve()),
- jawaban salah memunculkan kartu penjelasan konsep di mode teka-teki,
- tidak ada galat JavaScript.

Server dijalankan sendiri di port khusus dengan folder data sementara.
Pakai:  python tests/mh2_playthrough.py
"""
import os
import subprocess
import sys
import tempfile
import time
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8197
BASE = f'http://127.0.0.1:{PORT}'


def wait_server():
    for _ in range(50):
        try:
            urllib.request.urlopen(BASE + '/', timeout=1)
            return
        except Exception:
            time.sleep(0.2)
    raise SystemExit('server tidak menyala')


def launch(p):
    # Chromium bawaan Playwright; jika belum diunduh, pakai Chrome atau Edge yang sudah terpasang.
    for channel in (None, 'chrome', 'msedge'):
        try:
            return p.chromium.launch(channel=channel) if channel else p.chromium.launch()
        except Exception:
            continue
    raise SystemExit('Browser tidak ditemukan. Jalankan: python -m playwright install chromium')


def play_level(page, lid, wrong_first=False):
    page.goto(f'{BASE}/mh2/?level={lid}')
    page.wait_for_function('window.MH2 && MH2.playState && MH2.playState()')
    # Kartu konsep di awal level: tekan B (Enter) sampai permainan mulai.
    for _ in range(20):
        page.wait_for_timeout(300)
        if page.evaluate("MH2.playState().state") == 'play':
            break
        page.keyboard.press('Enter')
    if wrong_first:
        page.evaluate('MH2.playState().inst.solve(true)')
        page.wait_for_timeout(1500)
        state = page.evaluate('MH2.playState().state')
        assert state == 'explain', f'{lid}: jawaban salah seharusnya membuka penjelasan, dapat {state}'
        page.evaluate("MH2.playState().explain.t = 9")
        page.keyboard.press('Enter')
        page.wait_for_timeout(400)
    for _ in range(150):
        scene = page.evaluate("""() => {
            if (MH2.sceneName !== 'play') return MH2.sceneName;
            const S = MH2.playState();
            if (S.state === 'intro') return 'intro';
            if (S.state === 'play' && S.inst && S.inst.solve) S.inst.solve();
            return S.state;
        }""")
        if scene == 'intro':
            page.keyboard.press('Enter')
        if scene == 'result':
            return page.evaluate('MH2.params.stars')
        page.wait_for_timeout(500)
    raise AssertionError(f'{lid}: tidak sampai layar hasil')


def main():
    data = tempfile.mkdtemp(prefix='mh2-')
    env = dict(os.environ, PORT=str(PORT), MATHHERO_DATA_DIR=data)
    srv = subprocess.Popen(['node', 'server.js'], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    errors = []
    try:
        wait_server()
        with sync_playwright() as p:
            browser = launch(p)
            ctx = browser.new_context(**p.devices['Pixel 5'])
            page = ctx.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))

            page.goto(BASE + '/')
            hrefs = page.eval_on_selector_all('a.play', 'els => els.map(e => e.getAttribute("href"))')
            assert hrefs == ['mh1/', 'mh2/'], hrefs
            print('pemilih seri: OK')

            page.goto(BASE + '/mh1')
            page.wait_for_function('window.__mathHero && window.__mathHero.ready', timeout=15000)
            assert page.url.endswith('/mh1/'), page.url
            print('Math Hero 1 di mh1/: OK')

            ids = [f'{s}-{l}' for s in range(1, 7) for l in range(1, 6)]
            puzzle_wrong = {'1-3', '3-1', '4-3', '2-2', '5-1', '1-1'}
            for lid in ids:
                stars = play_level(page, lid, wrong_first=lid in puzzle_wrong)
                expect = 2 if lid in puzzle_wrong else 3
                assert stars == expect, f'{lid}: bintang {stars}, seharusnya {expect}'
                print(f'level {lid}: selesai, {stars} bintang')
            browser.close()
    finally:
        srv.terminate()
    if errors:
        print('GALAT:', *errors, sep='\n  ')
        sys.exit(1)
    print('LULUS: semua level Math Hero 2 bisa diselesaikan tanpa galat')


if __name__ == '__main__':
    main()
