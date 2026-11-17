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
    licence: { en: 'For use in your own home.', fr: 'Pour un usage à la maison.' },
    who: { en: 'Parents and caregivers, ages 3 to 7', fr: 'Parents et familles, de 3 à 7 ans' },
    // Page by page, in order (matches the generator; see a2-books/activity-and-sel-pack-plan.md).
    inside: {
      en: ['Cover', 'For grown-ups: how to use the pack', 'Meet the friends: stick puppets to cut out', 'How did they feel? Feelings faces', 'Story in order: cut, order and retell', 'Trace the words', 'Draw your own story', 'Make and do: a craft from the book', 'The real animals: true facts', 'Color the story', 'Talk together cards', 'Hero certificate for the book’s value'],
      fr: ['Couverture', 'Pour les grands : comment utiliser la trousse', 'Les amis : marionnettes à découper', 'Comment se sentaient-ils ? Visages des émotions', 'L’histoire dans l’ordre : découper, ordonner, raconter', 'Tracer les mots', 'Dessine ton histoire', 'Bricolage tiré du livre', 'Les vrais animaux : faits vérifiés', 'Colorie l’histoire', 'Cartes pour discuter', 'Certificat de héros de la valeur du livre']
    }
  },
  classroom: {
    priceCents: 699,
    pages: 28,
    title: { en: 'Classroom SEL pack', fr: 'Trousse SEL pour la classe' },
    text: {
      en: 'A five-day plan with word cards, a poster, a feelings chart, sequencing cards, an observation grid, exit tickets and family letters in five languages, plus the home pack. Instant PDF download.',
      fr: 'Un plan de cinq jours avec cartes de mots, affiche, tableau des émotions, cartes de séquence, grille d’observation, billets de sortie et lettres aux familles en cinq langues, plus la trousse maison. PDF à télécharger tout de suite.'
    },
    licence: { en: 'Classroom licence: copy for your own class and its families.', fr: 'Licence de classe : copies pour votre classe et ses familles.' },
    who: { en: 'Teachers, early-years educators and libraries, ages 3 to 7', fr: 'Enseignants, éducatrices à la petite enfance et bibliothèques, de 3 à 7 ans' },
    inside: {
      en: ['Cover and classroom licence', 'Week at a glance: a five-day plan', 'Day 1: the read-aloud', 'Word wall cards', 'Classroom poster', 'Feelings chart', 'Sequencing cards', 'Activity cards and science corner', 'Talk together prompts', 'Promise cards', 'Observation grid (Ontario kindergarten frames)', 'Science and place corner', 'For every child: ways to adapt', 'Family letters in English, French, Spanish, German and Italian (2 pages)', 'Exit tickets', 'Plus all 12 pages of the home activity pack'],
      fr: ['Couverture et licence de classe', 'La semaine en un coup d’œil : plan de cinq jours', 'Jour 1 : la lecture à voix haute', 'Cartes pour le mur de mots', 'Affiche pour la classe', 'Tableau des émotions', 'Cartes de séquence', 'Cartes d’activités et coin sciences', 'Pistes pour discuter', 'Cartes de promesse', 'Grille d’observation (cadres de la maternelle de l’Ontario)', 'Coin sciences et lieux', 'Pour chaque enfant : adaptations', 'Lettres aux familles en anglais, français, espagnol, allemand et italien (2 pages)', 'Billets de sortie', 'Plus les 12 pages de la trousse maison']
    }
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
