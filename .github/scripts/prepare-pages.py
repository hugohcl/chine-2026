"""Validate and stage only the generic private-access shell for GitHub Pages."""
from pathlib import Path
import shutil
import sys

PUBLIC_FILES = [
    'index.html', 'access.js', 'access.css', 'config.js', 'crypto.js',
    'offline-sw.js', 'sw.js', 'sw-push.js', 'po.png', 'oogway.png',
    'vendor/supabase-2.105.0.js', 'vendor/leaflet.js', 'vendor/leaflet.css',
    'vendor/pdfjs/pdf.min.mjs', 'vendor/pdfjs/pdf.worker.min.mjs',
    'vendor/pdfjs/LICENSE', 'vendor/pdfjs/version.json',
]

def prepare(root, output):
    html = (root / 'index.html').read_text(encoding='utf-8')
    assert 'Un espace pour nous deux.' in html, 'Private-access shell required'
    assert 'id="trip"' in html and 'src="access.js"' in html, 'Access bridge missing'
    assert 'Content-Security-Policy' in html and 'CSP_BUILD' not in html, 'Built CSP required'
    assert 'staticrypt' not in html.lower(), 'Legacy encrypted page cannot be deployed'
    worker = (root / 'offline-sw.js').read_bytes()
    for name in ['sw.js', 'sw-push.js']:
        assert (root / name).read_bytes() == worker, 'Legacy worker migration missing'
    for name in PUBLIC_FILES:
        path = root / name
        assert path.is_file() and not path.is_symlink(), 'Missing regular public asset: ' + name
        if path.suffix in ['.html', '.js', '.mjs', '.css']:
            content = path.read_text(encoding='utf-8')
            assert not any(marker in content for marker in [
                'CHINE_CLE', 'HOT_WISH_GALLERIES', 'SUPABASE_SERVICE_ROLE_KEY',
                'gzip:H4sI', 'staticryptEncrypted',
            ]), 'Non-public application content in ' + name
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)
    (output / '.nojekyll').write_text('', encoding='utf-8')
    print('Validated private-access shell and staged public assets only')

if __name__ == '__main__':
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else root / '_site'
    prepare(root, output)
