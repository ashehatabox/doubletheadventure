"""Adds a book to the online reader from its English print PDF (Canva export).
   python3 -I scripts/add-reader-book.py <slug> <book.pdf> [lang]
Layout assumed: p1 dedication, p2 credits, then two-page spreads (3|4, 5|6 ...).
A page with only 'Publishing / Double the Adventure / Authors' is kept as an image but gets no read-aloud text."""
import json, os, re, subprocess, sys, tempfile, glob
from PIL import Image

slug, pdf = sys.argv[1], sys.argv[2]
lang = sys.argv[3] if len(sys.argv) > 3 else 'en'
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'content', 'reader', slug)
out = os.path.join(root, lang)
os.makedirs(out, exist_ok=True)
n = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout).group(1))

with tempfile.TemporaryDirectory() as tmp:
    subprocess.run(['pdftoppm', '-r', '135', '-png', pdf, os.path.join(tmp, 'p')], check=True)
    files = sorted(glob.glob(os.path.join(tmp, 'p-*.png')))
    for i, f in enumerate(files, 1):
        im = Image.open(f).convert('RGB')
        im = im.resize((1000, round(im.height * 1000 / im.width)), Image.LANCZOS)
        im.save(os.path.join(out, 'p%02d.webp' % i), 'WEBP', quality=78, method=6)

def page_text(i):
    t = subprocess.run(['pdftotext', '-f', str(i), '-l', str(i), pdf, '-'], capture_output=True, text=True).stdout
    t = re.sub(r'\s+', ' ', t).strip()
    if re.search(r'Authors?:|Illustration:', t) or t in ('Publishing Double the Adventure...', ''):
        return ''
    return t.replace(' Publishing Double the Adventure...', '').strip()

pages = ['p%02d' % i for i in range(1, n + 1)]
spreads = [['cover'], pages[0:2]] + [pages[i:i + 2] for i in range(2, n, 2)]
mf = os.path.join(root, 'manifest.json')
m = json.load(open(mf)) if os.path.exists(mf) else {}
m['spreads'] = spreads
m.setdefault('languages', {})[lang] = {'text': {p: page_text(int(p[1:])) for p in pages if page_text(int(p[1:]))}}
json.dump(m, open(mf, 'w'), indent=2, ensure_ascii=False)
print(slug, lang, n, 'pages,', len(spreads), 'spreads,', len(m['languages'][lang]['text']), 'pages with text')
