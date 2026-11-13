// Digital packs: printable PDFs made from each book (generator lives in the Kids books project, a2-books/activity-and-sel-pack-plan.md).
// Files are private, in content/packs/<slug>-home.pdf and <slug>-classroom.pdf, and are only served after a paid Stripe checkout.
// A book gets packs automatically when its two PDFs are in content/packs/. Preview strips: public/images/packs/<slug>-<kind>.jpg.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'content', 'packs');
const DAYS = 30; // download links work for this many days after payment

const kinds = {
  home: {
    priceCents: 399,
    pages: 12,
    title: { en: 'Home activity pack', fr: 'Trousse d’activités maison' },
    text: {
      en: '12 printable pages: stick puppets, feelings, story order, tracing, a craft, real-animal facts, coloring, talk cards and a certificate. Instant PDF download.',
      fr: '12 pages à imprimer : marionnettes, émotions, ordre de l’histoire, traçage, bricolage, vrais animaux, coloriage, cartes pour discuter et certificat. PDF à télécharger tout de suite.'
    },
    licence: { en: 'For use in your own home.', fr: 'Pour un usage à la maison.' }
  },
  classroom: {
    priceCents: 699,
    pages: 28,
    title: { en: 'Classroom SEL pack', fr: 'Trousse SEL pour la classe' },
    text: {
      en: 'A five-day plan with word cards, a poster, a feelings chart, sequencing cards, an observation grid, exit tickets and family letters in five languages, plus the home pack. Instant PDF download.',
      fr: 'Un plan de cinq jours avec cartes de mots, affiche, tableau des émotions, cartes de séquence, grille d’observation, billets de sortie et lettres aux familles en cinq langues, plus la trousse maison. PDF à télécharger tout de suite.'
    },
    licence: { en: 'Classroom licence: copy for your own class and its families.', fr: 'Licence de classe : copies pour votre classe et ses familles.' }
  }
};

const slugs = fs.existsSync(DIR)
  ? [...new Set(fs.readdirSync(DIR).map((f) => (f.match(/^(.+)-home\.pdf$/) || [])[1]).filter(Boolean))]
      .filter((s) => fs.existsSync(path.join(DIR, `${s}-classroom.pdf`)))
  : [];

const products = slugs.flatMap((slug) => Object.entries(kinds).map(([kind, k]) => ({
  id: `pack-${kind}-${slug}`,
  digital: true,
  pack: kind,
  book: slug,
  file: `${slug}-${kind}.pdf`,
  title: k.title,
  text: k.text,
  priceCents: k.priceCents
})));

const filePath = (p) => path.join(DIR, p.file);
const preview = (slug, kind) => fs.existsSync(path.join(__dirname, '..', 'public', 'images', 'packs', `${slug}-${kind}.jpg`)) ? `/images/packs/${slug}-${kind}.jpg` : '';

module.exports = { kinds, slugs, products, filePath, preview, DAYS };
