# A² Publishing — Double the Adventure website

The publisher site for the *Double the Adventure* picture books (ages 3–7). A small Node.js (Express + EJS) site, the same setup as Everlore and Pulse: it runs on GoDaddy's Node.js hosting and pulls from this repo.

The plan behind it is the Claude doc "A² Publishing — Marketing Mix & Website Strategy".

## Pages

| Page | English | French |
|---|---|---|
| Home | `/` | `/fr/` |
| Catalog, filter by moment | `/books`, `/books?moment=left-out` | `/fr/books` |
| Book page | `/books/<slug>` | `/fr/books/<slug>` |
| Coming soon (waitlists) | `/books/coming` | |
| Review team | `/books/review-team` | |
| Shop (opens early 2027) | `/shop` | |
| Play area (coming) | `/play` | |
| Parent corner | `/parents` | |
| Educators: teachers, early years, libraries, newcomers | `/educators`, `/educators/<page>` | |
| Partners: press, stores, sponsors, rights | `/partners`, `/partners/<page>` | |
| Our story, contact, questions | `/about`, `/contact`, `/faq` | |
| Policies | `/policies/privacy`, `/policies/terms`, `/policies/shipping` | |
| SEO | `/sitemap.xml` (with EN/FR alternates), `/robots.txt`, structured data | |

Every English page has a French twin under `/fr`.

## Where things live

- **`data/books.js`**: the catalog. One entry per book: titles, value, culture, heroes, blurb, status, languages. Book copy comes from the Kids books project; don't write new book text here.
  - `status`: `'live'` (buy buttons), `'soon'` ("tell me when it's on Amazon"), `'coming'` (being illustrated).
  - `amazon`: add each store's address once a book is live, e.g. `amazon: { ca: 'https://www.amazon.ca/dp/XXXXXXXXXX', com: '...' }`. Until then the button opens an Amazon search for the title.
- **Covers**: `public/images/books/<slug>/cover.jpg` (900 px wide, from the Kindle cover) and optionally `spread.jpg` (a wide picture for the home page). Books without a cover show a coloured card with the title.
- **`data/site.js`**: featured book, prices, contact email, Kickstarter link.
- **`locales/en.js`, `locales/fr.js`**: every word on the site, in both languages. The French needs a native speaker's read.
- **`views/pages/`**: one file per page. **`public/css/site.css`**: the look (bright storybook palette).
- **`app.js`**: the server: pages, forms, sitemap.

## Sign-ups and enquiries (Supabase)

Forms save to the Supabase project **doubletheadventure** (region ca-central-1):

| Table | What goes in it |
|---|---|
| `subscribers` | Free coloring page and "tell me when" sign-ups (email, role, source, book, language, consent) |
| `waitlist` | "Notify me" for a specific book |
| `enquiries` | Contact, quotes, visits, press, stores, sponsors, rights, review team |

The site uses the **publishable** key. Row-level security lets it add rows but never read them, so the key is safe on the server. Read the rows in the Supabase dashboard (Table Editor). If Supabase is unreachable, rows are kept in `data/<table>.jsonl` on the server so nothing is lost.

To get a copy of each enquiry by email, set `STORE_EMAIL` plus Resend or SMTP (see `.env.example`).

## Run it on your computer

```bash
npm install
cp .env.example .env
npm start          # http://localhost:3000
npm run check      # checks every page and form
```

## Put it on GoDaddy (cPanel)

The same way as pulsetwins and Everlore.

1. **Domain:** cPanel → **Domains**: add `doubleadventure.ca`, document root `doubletheadventure`. Add `doubletheadventure.ca` too; the app sends it on to `doubleadventure.ca`.
2. **Get the code:** cPanel → **Git Version Control** → *Create* → clone `https://github.com/ashehatabox/doubletheadventure` into `doubletheadventure`.
3. **Create the app:** cPanel → **Setup Node.js App** → *Create Application*: Node.js 18 or newer, Production, application root `doubletheadventure`, URL `doubleadventure.ca`, startup file `app.js`.
4. **Settings:** add each line of `.env.example` as an environment variable (at least `SITE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`).
5. **Run NPM Install**, then **Restart**.
6. **HTTPS:** cPanel → **SSL/TLS Status** → run AutoSSL for both domains.

**Updates:** every push to `main` runs the checks on GitHub. Once the cPanel secrets are added to the repo (see `.github/workflows/deploy.yml`), GoDaddy pulls and restarts by itself. Without them: Git Version Control → *Manage* → *Pull*, then *Deploy HEAD Commit* (or Restart in Setup Node.js App). After a change to `package.json`, also click **Run NPM Install**.
