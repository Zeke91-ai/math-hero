"""Impor berkas ini di tes Python yang membuka game: mematikan papan skor online (Firebase) selama tes.
Tanpa ini, konfigurasi nyata di public/js/firebase-config.js membuat tes memuat SDK dari internet dan mengirim skor
tes ke papan bersama sungguhan. Dengan ini game memakai skor lokal, sama seperti sebelum Firebase dipasang."""
from playwright.sync_api import Browser

_KONFIG_KOSONG = "window.SCORES_CONFIG = { apiKey: 'ISI_TES', projectId: 'ISI_TES' };"
_asli = Browser.new_context


def _new_context(self, *a, **k):
    ctx = _asli(self, *a, **k)
    ctx.route('**/js/firebase-config.js', lambda r: r.fulfill(status=200, content_type='text/javascript', body=_KONFIG_KOSONG))
    return ctx


Browser.new_context = _new_context
