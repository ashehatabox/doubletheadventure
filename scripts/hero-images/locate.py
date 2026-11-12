# Find where each small hero picture was cropped from, in high-res page exports.
# usage: locate.py <src_dir> <old_img_dir> -> prints JSON {file: [page, x, y, w, h, score]} in src pixel coords
import cv2, glob, json, os, sys, numpy as np
src_dir, old_dir = sys.argv[1], sys.argv[2]
W = 800  # search width
pages = {}
for f in sorted(glob.glob(os.path.join(src_dir, '*.jpg'))):
    im = cv2.imread(f, cv2.IMREAD_GRAYSCALE); s = W / im.shape[1]
    pages[os.path.basename(f)] = (cv2.resize(im, (W, int(im.shape[0] * s)), interpolation=cv2.INTER_AREA), s)
out = {}
for f in sorted(glob.glob(os.path.join(old_dir, '*.jpg'))):
    t0 = cv2.imread(f, cv2.IMREAD_GRAYSCALE); best = None
    first = {k: v for k, v in pages.items() if k == 'p01.jpg'}
    for group in (first, pages):
      if best is not None and best[0] >= 0.85: break
      for name, (pg, s) in group.items():
        for tw in range(int(os.environ.get("TWMIN", 60)), 801, 8):  # template width in search pixels
              th = round(t0.shape[0] * tw / t0.shape[1])
              if th > pg.shape[0] or tw > pg.shape[1]: continue
              t = cv2.resize(t0, (tw, th), interpolation=cv2.INTER_AREA)
              r = cv2.matchTemplate(pg, t, cv2.TM_CCOEFF_NORMED); _, mv, _, ml = cv2.minMaxLoc(r)
              if best is None or mv > best[0]: best = (mv, name, ml, tw, th, s)
    mv, name, (x, y), tw, th, s = best
    out[os.path.basename(f)] = [name, round(x / s), round(y / s), round(tw / s), round(th / s), round(float(mv), 3)]
    print(os.path.basename(f), out[os.path.basename(f)], flush=True)
json.dump(out, open(os.path.join(src_dir, 'crops.json'), 'w'), indent=1)
