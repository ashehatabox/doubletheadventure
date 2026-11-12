# Sharp hero pictures (portraits 960×960, place up to 1800 wide)

The old portraits were 480 px, cut from 1600 px Kindle page exports, and looked soft when shown large.
These scripts cut them again from a high-resolution export of the book.

1. In Canva, export the book's **English Kindle eBook** design as **PDF, pro quality** and save it as
   `/home/claude/hires/<slug>/book.pdf` (one file, no per-page links to handle).
2. `scripts/hero-images/book.sh <slug>`: renders the pages at 3200 px wide, finds where each current
   portrait in `public/images/heroes/<slug>/` was cut from (template match, cover first), cuts it again at
   960×960, and cuts `place.jpg` at full size from the original spread art (SIFT match, `place.sh`).
   It writes `out/` and a `sheet.jpg` (old above, new below) to check every match by eye.
3. Look at `sheet.jpg`, then copy `out/*.jpg` into `public/images/heroes/<slug>/`.

Paths in the scripts point at /home/claude/hires; change them if you run them elsewhere.
Needs python3 with opencv, numpy, Pillow, and poppler (pdftoppm, pdfimages).
For a brand-new guide: cut a rough 480 portrait first (any size works as the search pattern), then run this.
Don't use an AI upscaler here: it flattens the watercolour and changes faces.
