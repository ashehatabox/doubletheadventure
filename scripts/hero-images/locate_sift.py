# Robust locate for one image via SIFT + homography. usage: locate_sift.py <src_dir> <img>  -> prints [page,x,y,w,h,inliers]
import cv2, glob, os, sys, numpy as np, json
src, imgp = sys.argv[1], sys.argv[2]
sift = cv2.SIFT_create(4000)
t = cv2.imread(imgp, cv2.IMREAD_GRAYSCALE); kt, dt = sift.detectAndCompute(t, None)
best = None
for f in sorted(glob.glob(os.path.join(src, 'p[0-9][0-9].jpg'))):
    im = cv2.imread(f, cv2.IMREAD_GRAYSCALE); s = 1200 / im.shape[1]; im = cv2.resize(im, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
    kp, dp = sift.detectAndCompute(im, None)
    if dp is None: continue
    m = cv2.BFMatcher().knnMatch(dt, dp, k=2); good = [a for a, b in (x for x in m if len(x) == 2) if a.distance < 0.7 * b.distance]
    if len(good) < 12: continue
    H, mask = cv2.findHomography(np.float32([kt[g.queryIdx].pt for g in good]), np.float32([kp[g.trainIdx].pt for g in good]), cv2.RANSAC, 5.0)
    if H is None: continue
    n = int(mask.sum())
    if best is None or n > best[0]:
        c = cv2.perspectiveTransform(np.float32([[0, 0], [t.shape[1], 0], [t.shape[1], t.shape[0]], [0, t.shape[0]]])[None], H)[0] / s
        x0, y0 = c.min(0); x1, y1 = c.max(0); best = (n, os.path.basename(f), int(x0), int(y0), int(x1 - x0), int(y1 - y0))
n, page, x, y, w, h = best
print(json.dumps([page, max(0, x), max(0, y), w, h, n]))
