#!/usr/bin/env python3
"""Pack previews + details for the pack pages (/shop/packs/<slug>/<kind>).

For every book with packs in content/packs/ (private PDFs):
  - renders each page to public/images/packs/pages/<slug>-<kind>-NN.webp (520 px wide, low-res preview only;
    the classroom pack's last 12 pages are the home pack, so only its own pages are rendered)
  - reads the book's five words and activities from the PDF text into data/pack-details.json
Run: python3 -I scripts/make-pack-previews.py [slug ...]   (needs pdftoppm, pdftotext, Pillow)
"""
import json, os, re, subprocess, sys, tempfile, glob
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACKS = os.path.join(ROOT, 'content', 'packs')
OUT = os.path.join(ROOT, 'public', 'images', 'packs', 'pages')
DATA = os.path.join(ROOT, 'data', 'pack-details.json')
HOME_PAGES = 12
WIDTH = 520

def pages(pdf):
    out = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout
    return int(re.search(r'Pages:\s+(\d+)', out).group(1))

def text(pdf, p, layout=False):
    args = ['pdftotext', '-f', str(p), '-l', str(p)] + (['-layout'] if layout else []) + [pdf, '-']
    return subprocess.run(args, capture_output=True, text=True).stdout

def lines(t):
    return [l.strip() for l in t.splitlines() if l.strip() and not l.strip().startswith('©') and not re.fullmatch(r'\d+', l.strip()) and 'Activity Pack' not in l and 'SEL Pack' not in l]

def render(pdf, slug, kind, last):
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['pdftoppm', '-r', '72', '-f', '1', '-l', str(last), '-png', pdf, os.path.join(tmp, 'p')], check=True)
        files = sorted(glob.glob(os.path.join(tmp, 'p-*.png')))
        for i, f in enumerate(files, 1):
            im = Image.open(f).convert('RGB')
            im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
            im.save(os.path.join(OUT, f'{slug}-{kind}-{i:02d}.webp'), 'WEBP', quality=64, method=6)
        return len(files)

def words(pdf):
    """Five words from the story (home p2), read from the table by column position (rows can wrap)."""
    t = text(pdf, 2, layout=True).splitlines()
    try:
        h = next(i for i, l in enumerate(t) if 'What it means' in l and 'Do it' in l)
    except StopIteration:
        return []
    do_col = t[h].index('Do it')
    rows, cur = [], []
    for l in t[h + 1:]:
        if 'A gentle note' in l or 'What you need' in l or '©' in l:
            break
        if not l.strip():
            if cur:
                rows.append(cur)
                cur = []
            continue
        cur.append(l)
    if cur:
        rows.append(cur)
    out = []
    for r in rows:
        left = ' '.join(l[:do_col - 1] for l in r).split()
        right = ' '.join(l[do_col - 1:] for l in r).split()
        if len(left) < 2 or not right:
            continue
        out.append({'word': left[0], 'means': ' '.join(left[1:]), 'do': ' '.join(right)})
    return out[:6]

def main_activity(pdf):
    """The story activity on 'Make and do' (home p8): title, what you need, what you do."""
    ls = lines(text(pdf, 8))
    try:
        i = next(k for k, l in enumerate(ls) if l.startswith('You need:'))
    except StopIteration:
        return None
    desc = []
    for l in ls[i + 1:]:
        if desc and desc[-1].endswith(('.', '!', '?')) and len(l.split()) <= 4 and not l.endswith('.'):
            break
        desc.append(l)
    return {'title': ls[i - 1], 'need': ls[i][len('You need:'):].strip(), 'text': ' '.join(desc)}

def week(pdf):
    """The week at a glance (classroom p2): five days, each with a title and what you do. Read by column."""
    t = text(pdf, 2, layout=True).splitlines()
    try:
        h = next(i for i, l in enumerate(t) if 'What you do' in l and 'Print' in l)
    except StopIteration:
        return [], ''
    c2, c3 = t[h].index('What you do'), t[h].index('Print')
    rows, cur, end = [], [], len(t)
    for i, l in enumerate(t[h + 1:], h + 1):
        if 'Ontario' in l or 'Materials' in l:
            end = i
            break
        if not l.strip():
            if cur:
                rows.append(cur)
                cur = []
            continue
        cur.append(l)
    if cur:
        rows.append(cur)
    days = []
    for r in rows:
        left = [l[:c2 - 1].strip() for l in r]
        if not left or not re.match(r'Day \d', left[0]):
            continue
        days.append({'title': ' '.join(x for x in left[1:] if x), 'text': ' '.join(' '.join(l[c2 - 1:c3 - 1].split()) for l in r).strip()})
    # Materials: the right-hand block under the plan
    mats = ''
    for i, l in enumerate(t[end:], end):
        if 'Materials' in l:
            col = l.index('Materials')
            m = []
            for l2 in t[i + 1:]:
                if not l2.strip():
                    break
                m.append(l2[col - 1:].strip() if len(l2) >= col else '')
            mats = ' '.join(x for x in m if x)
            break
    return days, mats

def class_activities(pdf):
    """Activity cards (classroom p8): title + '10 minutes, Small groups, Materials: …'."""
    ls = lines(text(pdf, 8))
    out = []
    for k, l in enumerate(ls):
        m = re.match(r'(\d+) minutes?, ([^,]+), Materials: (.+)$', l)
        if m and k > 0:
            out.append({'title': ls[k - 1], 'minutes': int(m.group(1)), 'group': m.group(2), 'materials': m.group(3)})
    return out

def main():
    slugs = sys.argv[1:] or sorted({re.sub(r'-home\.pdf$', '', f) for f in os.listdir(PACKS) if f.endswith('-home.pdf')})
    data = json.load(open(DATA)) if os.path.exists(DATA) else {}
    for slug in slugs:
        home = os.path.join(PACKS, f'{slug}-home.pdf')
        cls = os.path.join(PACKS, f'{slug}-classroom.pdf')
        if not (os.path.exists(home) and os.path.exists(cls)):
            continue
        nh = render(home, slug, 'home', pages(home))
        nc = render(cls, slug, 'classroom', pages(cls) - HOME_PAGES)
        days, mats = week(cls)
        data[slug] = {'homePages': nh, 'classroomPages': nc, 'words': words(home), 'activity': main_activity(home), 'classActivities': class_activities(cls), 'week': days, 'materials': mats}
        d = data[slug]
        print(f"{slug}: {nh}+{nc} pages, {len(d['words'])} words, activity={bool(d['activity'])}, {len(d['classActivities'])} class activities")
    fix = lambda v: re.sub(r'(\w)- (\w)', r'\1-\2', v) if isinstance(v, str) else ([fix(x) for x in v] if isinstance(v, list) else ({k: fix(x) for k, x in v.items()} if isinstance(v, dict) else v))
    json.dump(fix(data), open(DATA, 'w'), ensure_ascii=False, indent=1)

if __name__ == '__main__':
    main()
