# Daily article engine

Every day, one long article for the Parents section (`/parents/articles`). Each one looks at one book from one angle, goes deep, and gives parents and teachers things to share with the child. The engine works like the guides in Pulse: Markdown files, published by committing them to this repo. A scheduled Claude run does the writing; nothing else needs to be set up.

## Files
- `content/engine/queue.json`: every book × every angle (20 books × 8 angles = 160 articles), in writing order. Rebuild with `node scripts/make-article-queue.js` after adding a book (it keeps what's done).
- `content/engine/values-library.json`: rows from the A² Values Library for each book (key = book number): the book's own value ("Book NN") and the same value in other traditions ("close to Book NN"), with sources, reliability notes and care flags. Use it for origin articles.
- `content/engine/books/<slug>.md`: the brief for each book: story in our own words, characters, the real animals, the setting, the value and where it comes from, questions. **Write only from the brief and from checked sources.** A book without a brief is skipped.
- `content/articles/en/<slug>.md`: the articles (format: top of `lib/articles.js`).
- `scripts/engine-next.js`: prints the next item and its book. `--done <id> <article-slug>` marks it written.
- `scripts/check-articles.js`: checks every article (runs in `npm run check`).

## One run, step by step
1. `git pull`. Run `node scripts/engine-next.js`. If it says nothing is left, stop.
2. Read the brief it names, and the articles already written for that book (listed in its output) so today's one says something new.
3. Research what the brief doesn't settle, with web search: facts about the real animal or place, the tradition or saying. Prefer encyclopedias, museums, universities, zoos, national parks, government and education sites. Never invent a fact, a statistic, a study or a quote.
4. Write the article (rules below) to `content/articles/en/<article-slug>.md`.
5. `npm run check` must pass. Fix and re-run until it does.
6. `node scripts/engine-next.js --done <item id> <article-slug>`.
7. Commit both files (`Article: <title>`) and push to `main`. The site deploys itself.

## The angles
| angle | topic | what the article does |
|---|---|---|
| value | values | The value at the heart of the book: what it means for a 3–7 year old, why it matters at that age, how the story shows it (described, not quoted), and how to practise it at home. |
| animals | animals | The real animals behind the heroes: where they live, what they eat, how they behave, surprising facts children love, how the book's character draws on (or playfully bends) the real animal. Endangered or protected status if relevant. |
| origin | cultures | Where the value comes from: the tradition and saying (books 14–20: the culture named in the brief), its history, how families there live it, why it speaks to children everywhere. Books 1–13 have no single culture: show how several traditions put the same value into words (use the brief's sources). |
| moment | feelings | When your child goes through what the hero goes through (feeling left out, falling and trying again, big feelings...): what's happening for the child, what helps, what to say and not say, how the book opens the conversation. |
| environment | nature | The place the story happens: the habitat, climate and season, the plants and other animals there, how to explore something like it near home, and how families can look after it. |
| classroom | classroom | A guide for kindergarten and early-years educators: a circle-time plan (before, during, after reading), discussion questions, two or three activities (art, movement, sensory, outdoor), and links to learning goals (Ontario Kindergarten Program: belonging and contributing, self-regulation and well-being, demonstrating literacy behaviours, problem solving and innovating). |
| activities | activities | Things to do at home after reading: crafts, pretend play, kitchen or outdoor activities, a simple game, and our coloring page, jigsaw or memory game for the book on `/play` when there is one. Materials list and steps for each. |
| reading | reading | Reading it together: a dialogic-reading guide for this book: what to ask before, during and after, how to use the refrain, how to adapt for a 3-year-old vs a 7-year-old, bilingual reading tips (EN/FR). |

## Writing rules
- **Length:** 1,600–2,400 words. Opening paragraph with no heading that tells the reader what they'll get. Then 5–8 `##` sections, `###` inside where useful.
- **Always include** a section of things to share with the child (`## Share it with your child`, or practical tips in the angle's own words), a `## Questions parents ask` section with 3–5 `###` questions and short answers (this becomes the FAQ in Google), and a short `## Sources` list of the outside pages used (markdown links).
- **Search phrase:** pick one phrase a parent or teacher would type (e.g. "what do porcupines eat", "teaching resilience to preschoolers", "ubuntu meaning for kids"). Put it in the title, the description, the first paragraph and one `##` heading. Write for people first.
- **Header:** `title` (under 70 characters), `description` (120–160 characters), `date` (today), `topic` (from the table), `books` (the book's slug, plus another of our books only if it truly fits), no `draft` line (published), unless the rule below says draft.
- **Slug:** lowercase words with hyphens, from the search phrase (e.g. `what-do-porcupines-eat-the-snug`). Must not exist yet.
- **Links:** the book page `/books/<slug>` (1–2 times), another of our articles if one fits, `/values-map` for origin articles, `/play` or `/play/color/<slug>` for activities when that game exists. No other site paths. Outside links only in Sources.
- **KDP Select:** never copy the book's text. Only the title, the refrain and the theme line from the brief may be quoted. Describe the story in your own words; don't give away the ending in more than a sentence.
- **Secular:** no religious content and no religious sources (scripture, hadith, sermons), even where a value has a religious parallel. The books are animals learning a life lesson.
- **Cultures:** name the real source of a saying, don't present a sacred idea as ours, keep stories secular (animals learning a life lesson). If the brief's `care_flag` is not `none`, the **origin** article for that book gets `draft: true` so the owner can have it checked by a reader from that culture first; other angles may name the value and its source (as the book's note does) but don't explain the cultural or sacred idea beyond the brief.
- **Safety:** no medical, therapy or diagnosis advice. For real worries (behaviour, development, anxiety), suggest talking to the child's doctor or educator. Activities must be safe for 3–7 year olds with a grown-up (no small parts for under-3s, no sharp tools, no unsafe foods or allergens without a note).
- **Voice:** warm, practical, plain words, a parent talking to a parent. "We" means A² Publishing. Short paragraphs. No hype, no "in today's fast-paced world", no emojis.
- **One article per run.** If something fails (check won't pass, no sources found), don't commit a half article: leave the item as todo and explain in the run summary.
