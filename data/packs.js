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
    // Page by page, in the PDF's order (generator: a2-books/activity-and-sel-pack-plan.md). Tokens: {hero} {friends} {value} {activity} {words}.
    pages: [
      { name: { en: 'Cover', fr: 'Couverture' }, text: { en: 'The book’s art, its title and the value it carries: {value}.', fr: 'L’illustration du livre, son titre et la valeur qu’il porte : {value}.' } },
      { name: { en: 'For grown-ups', fr: 'Pour les grands' }, text: { en: 'How to use the pack, the big idea in one line to say together, and the five story words ({words}), each with a gesture.', fr: 'Comment utiliser la trousse, la grande idée à dire ensemble, et les cinq mots de l’histoire ({words}), chacun avec un geste.' } },
      { name: { en: 'Meet the friends', fr: 'Les amis' }, text: { en: 'A card for each character: {friends}. Cut them out and tape a craft stick on the back to make puppets.', fr: 'Une carte par personnage : {friends}. À découper et coller sur un bâton pour faire des marionnettes.' } },
      { name: { en: 'How did they feel?', fr: 'Comment se sentaient-ils ?' }, text: { en: 'Three moments from the story. Your child draws the character’s face and circles a feeling word.', fr: 'Trois moments de l’histoire. L’enfant dessine le visage du personnage et entoure un mot d’émotion.' } },
      { name: { en: 'Story in order', fr: 'L’histoire dans l’ordre' }, text: { en: 'Three scenes from the start, middle and end of the book to color, number 1 to 3, cut out and retell.', fr: 'Trois scènes du début, du milieu et de la fin à colorier, numéroter de 1 à 3, découper et raconter.' } },
      { name: { en: 'Trace the words', fr: 'Tracer les mots' }, text: { en: 'Trace the story words and {hero}’s name, then write them alone and add your own name.', fr: 'Tracer les mots de l’histoire et le nom de {hero}, puis les écrire seul et ajouter son propre nom.' } },
      { name: { en: 'Draw your own story', fr: 'Dessine ton histoire' }, text: { en: 'A page to draw a time your child showed {value}, with three questions to talk about after.', fr: 'Une page pour dessiner un moment où l’enfant a montré la valeur du livre ({value}), avec trois questions pour en parler.' } },
      { name: { en: 'Make and do', fr: 'Bricolage et jeux' }, text: { en: '{activity}, straight from the story, plus three quick ideas to try at home.', fr: '{activity}, tiré de l’histoire, et trois petites idées à essayer à la maison.' } },
      { name: { en: 'The real animals', fr: 'Les vrais animaux' }, text: { en: 'A true, checked fact about each animal in the book, and what the story changed.', fr: 'Un fait vrai et vérifié sur chaque animal du livre, et ce que l’histoire a changé.' } },
      { name: { en: 'Color the story', fr: 'Colorie l’histoire' }, text: { en: 'A full-page scene from the book, drawn as line art to color.', fr: 'Une scène du livre en pleine page, en dessin au trait à colorier.' } },
      { name: { en: 'Talk together cards', fr: 'Cartes pour discuter' }, text: { en: 'Question cards to cut out and keep in a jar for dinner, the car or bedtime.', fr: 'Des cartes de questions à découper et garder dans un bocal pour le souper, l’auto ou le coucher.' } },
      { name: { en: 'Hero certificate', fr: 'Certificat de héros' }, text: { en: 'A hero certificate for {value}, to fill in, sign and hang up.', fr: 'Un certificat de héros pour la valeur {value}, à remplir, signer et afficher.' } }
    ],
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
    // The classroom PDF's own pages; the home pack follows from page 17.
    pages: [
      { name: { en: 'Cover and licence', fr: 'Couverture et licence' }, text: { en: 'What the week covers, and the classroom licence.', fr: 'Ce que couvre la semaine, et la licence de classe.' } },
      { name: { en: 'The week at a glance', fr: 'La semaine en un coup d’œil' }, text: { en: 'Five sessions of 20 to 30 minutes, with what to print for each day.', fr: 'Cinq séances de 20 à 30 minutes, avec ce qu’il faut imprimer chaque jour.' } },
      { name: { en: 'Day 1: the read-aloud', fr: 'Jour 1 : la lecture à voix haute' }, text: { en: 'What to ask before reading, where to pause, what to ask at each pause and what to listen for.', fr: 'Quoi demander avant la lecture, où faire une pause, quoi demander et quoi écouter.' } },
      { name: { en: 'Word wall cards', fr: 'Cartes pour le mur de mots' }, text: { en: 'The story words ({words}) with what they mean and a gesture for each.', fr: 'Les mots de l’histoire ({words}) avec leur sens et un geste pour chacun.' } },
      { name: { en: 'Classroom poster', fr: 'Affiche pour la classe' }, text: { en: 'The book’s message set big for the wall.', fr: 'Le message du livre en grand pour le mur.' } },
      { name: { en: 'Feelings chart', fr: 'Tableau des émotions' }, text: { en: 'A circle-time check-in: children clip a peg with their name on a feeling.', fr: 'Un tableau pour le cercle : chaque enfant pince son nom sur une émotion.' } },
      { name: { en: 'Sequencing cards', fr: 'Cartes de séquence' }, text: { en: 'Four scenes from the book to mix up, put back in order and retell, with the answer key.', fr: 'Quatre scènes du livre à mélanger, remettre dans l’ordre et raconter, avec le corrigé.' } },
      { name: { en: 'Activity cards', fr: 'Cartes d’activités' }, text: { en: 'Group activities from the story, each with its time, group size and materials.', fr: 'Des activités de groupe tirées de l’histoire, avec durée, taille du groupe et matériel.' } },
      { name: { en: 'Talk together', fr: 'Discuter ensemble' }, text: { en: 'Five questions, each with what to listen for in children’s answers.', fr: 'Cinq questions, chacune avec ce qu’il faut écouter dans les réponses.' } },
      { name: { en: 'Promise cards', fr: 'Cartes de promesse' }, text: { en: 'Each child writes or draws one way to show {value} this week, then you check back on Friday.', fr: 'Chaque enfant écrit ou dessine une façon de montrer la valeur ({value}) cette semaine, et on fait le point vendredi.' } },
      { name: { en: 'What to look for', fr: 'Quoi observer' }, text: { en: 'An observation grid with a column for each of the four Ontario kindergarten frames.', fr: 'Une grille d’observation avec une colonne pour chacun des quatre cadres de la maternelle de l’Ontario.' } },
      { name: { en: 'Science and place corner', fr: 'Coin sciences et lieux' }, text: { en: 'Real-animal facts and the real place the story could be set{place}.', fr: 'Des faits sur les vrais animaux et le vrai lieu où l’histoire pourrait se passer{place}.' } },
      { name: { en: 'For every child', fr: 'Pour chaque enfant' }, text: { en: 'Ideas for language learners, children who need more support and mixed ages, and what to handle with care.', fr: 'Des idées pour les élèves en apprentissage de la langue, ceux qui ont besoin de plus de soutien et les groupes multiâges, et ce qu’il faut aborder avec soin.' } },
      { name: { en: 'Family letters', fr: 'Lettres aux familles' }, text: { en: 'A short note home about the story, in English, French and Spanish, to cut apart.', fr: 'Un petit mot pour la maison sur l’histoire, en anglais, en français et en espagnol, à découper.' } },
      { name: { en: 'Family letters, continued', fr: 'Lettres aux familles, suite' }, text: { en: 'The same note in German and Italian.', fr: 'Le même mot en allemand et en italien.' } },
      { name: { en: 'Exit tickets', fr: 'Billets de sortie' }, text: { en: 'Four tickets per page: children tick what they can do and circle a face.', fr: 'Quatre billets par page : l’enfant coche ce qu’il sait faire et entoure un visage.' } }
    ],
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
// Book-specific details read from the PDFs by scripts/make-pack-previews.py (five words, activities, the week).
const DETAILS = (() => { try { return require('./pack-details.json'); } catch (e) { return {}; } })();
const details = (slug) => DETAILS[slug] || null;
// Page previews (low-res WebP) for one pack, in order.
const pageImages = (slug, kind) => {
  const d = DETAILS[slug]; const n = d ? (kind === 'home' ? d.homePages : d.classroomPages) : 0;
  return Array.from({ length: n || 0 }, (_, i) => `/images/packs/pages/${slug}-${kind}-${String(i + 1).padStart(2, '0')}.webp`);
};
const preview = (slug, kind) => fs.existsSync(path.join(__dirname, '..', 'public', 'images', 'packs', `${slug}-${kind}.jpg`)) ? `/images/packs/${slug}-${kind}.jpg` : '';

module.exports = { kinds, slugs, products, filePath, preview, details, pageImages, DAYS, HOME_PAGES: 12 };
