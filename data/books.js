// The catalog. One entry per book. Text comes from the Kids books project docs
// (a2-books/bookNN-*.md, *-kdp-listing.md, *-translations.json); don't write new book copy here.
//
// status:  'live'   = on Amazon now (buy buttons)
//          'soon'   = finished, going up on Amazon shortly ("notify me")
//          'coming' = in production (shown under Coming soon)
// amazon:  per store, the book's Amazon address once it's live, e.g. { ca: 'https://www.amazon.ca/dp/XXXXXXXXXX' }.
//          Missing stores fall back to an Amazon search for the title.
// languages: editions that exist (or will exist) for this book.
// Covers: put a 900 px wide JPG at public/images/books/<slug>/cover.jpg (and spread.jpg for a wide picture).

const FIVE = ['en', 'fr', 'es', 'de', 'it'];

const books = [
  { n: 1, slug: 'secret-hero', title: { en: 'Secret Hero' }, value: 'kindness', moments: ['kindness'], status: 'live', languages: ['en'], color: '#FFB3B3' },
  { n: 2, slug: 'becoming-a-tree', title: { en: 'Becoming a Tree' }, value: 'patience', moments: ['patience'], status: 'live', languages: ['en'], color: '#A8DDA8' },
  { n: 3, slug: 'friendship-bridge', title: { en: 'Friendship Bridge' }, value: 'teamwork', moments: ['friendship'], status: 'live', languages: ['en'], color: '#9FD3F0' },
  { n: 4, slug: 'the-fox-mistake', title: { en: 'The Fox Mistake' }, value: 'forgiveness', moments: ['sorry', 'friendship'], status: 'live', languages: ['en'], color: '#FFC59E' },
  { n: 5, slug: 'rainy-day-shiny-things', title: { en: 'Rainy Day, Shiny Things' }, value: 'gratitude', moments: ['thankful'], status: 'live', languages: ['en'], color: '#CDB8F2' },
  { n: 6, slug: 'the-desert-buzz', title: { en: 'The Desert Buzz' }, value: 'anger', moments: ['big-feelings'], status: 'live', languages: ['en'], color: '#FFE08A' },
  { n: 7, slug: 'the-honest-little-raccoon', title: { en: 'The Honest Little Raccoon' }, value: 'truth', moments: ['honesty'], status: 'live', languages: ['en'], color: '#9FD3F0' },
  { n: 8, slug: 'finn-and-coral', title: { en: 'Finn & Coral' }, value: 'trust', moments: ['friendship'], status: 'live', languages: ['en'], color: '#A8DDA8' },
  {
    n: 9, slug: 'pip-the-brave-parrot',
    title: { en: 'Pip the Brave Parrot' },
    subtitle: { en: 'A Story About Courage and Finding Your Voice' },
    value: 'courage', moments: ['brave'], status: 'live', languages: FIVE, color: '#A8DDA8',
    hero: { en: 'Pip, a young parrot with a very small voice' },
    blurb: { en: 'Pip hums softly in the trees but never sings when others are around. Then a baby bird falls from its nest, and the only way to bring help is to call out, loud and clear.' },
    themeLine: { en: 'Your voice doesn\'t have to be loud to be strong. It just has to be truly yours.' }
  },
  {
    n: 10, slug: 'the-spring-that-wanted-to-stay',
    title: { en: 'The Spring That Wanted to Stay', fr: 'La source qui voulait rester' },
    subtitle: { en: 'A Story About Generosity and the Gifts We Pass On' },
    value: 'generosity', moments: ['sharing', 'nature'], status: 'soon', languages: FIVE, color: '#9FD3F0',
    hero: { en: 'Nura, a tiny mountain spring, and Willo the willow' },
    blurb: { en: 'Nura is afraid she will spread thin and disappear, so when a storm blocks her stream she keeps all of herself. But the longer she holds on, the quieter she becomes, and the valley below begins to dry.' },
    themeLine: { en: 'Water that is held grows still. Water that is shared stays alive.' }
  },
  {
    n: 11, slug: 'the-light-that-grows',
    title: { en: 'The Light That Grows', fr: 'La lumière qui grandit' },
    subtitle: { en: 'A Story About Kindness and the Gifts That Grow When We Share Them' },
    value: 'kindness', moments: ['kindness', 'sharing', 'brave'], status: 'soon', languages: FIVE, color: '#FFE08A',
    hero: { en: 'Lumi, the smallest firefly in the meadow' },
    blurb: { en: 'Lumi hides her glow under a leaf to save it. Then comes the Night of No Moon, and her best friend Moss is lost in the brambles. To help him, Lumi must go out and shine.' },
    themeLine: { en: 'Some gifts grow bigger every time you give them away.' }
  },
  {
    n: 12, slug: 'the-pebbles-inside',
    title: { en: 'The Pebbles Inside', fr: 'Les cailloux de Tavi' },
    subtitle: { en: 'A Story About Sharing Our Feelings and the Friends Who Listen', fr: 'Une histoire sur le partage de nos émotions et les amis qui écoutent' },
    value: 'feelings', moments: ['big-feelings', 'friendship'], status: 'soon', languages: FIVE, color: '#FFB3B3',
    hero: { en: 'Tavi, a little turtle with a big, quiet heart' },
    blurb: { en: 'Tavi says "I\'m fine" and tucks each hurt inside like a little pebble. Pebble by pebble her shell grows heavy, until her best friend Fern sits down beside her and simply stays.' },
    themeLine: { en: 'Feelings kept inside grow heavy. Feelings we share become a path.' }
  },
  {
    n: 13, slug: 'the-snug',
    title: { en: 'The Snug', fr: 'Le Cocon' },
    subtitle: { en: 'A Story About Belonging and Making Room for Everyone', fr: 'Une histoire sur l\'appartenance et la place pour chacun' },
    value: 'belonging', moments: ['left-out', 'friendship'], status: 'soon', languages: FIVE, color: '#A8DDA8',
    hero: { en: 'Quilla the porcupine and Bodie the badger' },
    refrain: { en: 'Scoop, loop, snug!', fr: 'Creuse, boucle, cocon !' },
    blurb: { en: 'Quilla doesn\'t wait to be let in. With Bodie, she scoops, loops and pins together a warm little hut of their own. When the first snow falls, she has one big decision to make: who is it for?' },
    themeLine: { en: 'If there\'s no room for you, build a place with room for everyone.' }
  },
  {
    n: 14, slug: 'the-view-from-down-low',
    title: { en: 'The View From Down Low' },
    subtitle: { en: 'A Story About Empathy and Seeing Through a Friend\'s Eyes' },
    value: 'empathy', moments: ['friendship', 'kindness'], status: 'soon', languages: FIVE, color: '#FFC59E',
    culture: 'southern-africa', cultureIdea: { en: 'Ubuntu: "a person is a person through other people"' },
    hero: { en: 'Langa the giraffe and Themba the meerkat' },
    refrain: { en: 'Clomp, clomp, clomp!' },
    blurb: { en: 'From way up high, Langa sees the whole golden sky, but not his friend Themba sneezing in the dust by his hooves. So he spreads his legs wide, bends his long neck all the way down, and says, "Show me."' },
    themeLine: { en: 'When we truly see each other, we all grow taller.' }
  },
  {
    n: 15, slug: 'eight-times-up',
    title: { en: 'Eight Times Up', fr: 'Huit fois debout' },
    subtitle: { en: 'A Story About Falling Down and Getting Up Again', fr: 'Une histoire sur les chutes et sur se relever' },
    value: 'resilience', moments: ['trying-again'], status: 'soon', languages: FIVE, color: '#CDB8F2',
    culture: 'japan', cultureIdea: { en: 'Nana korobi ya oki: "fall seven times, get up eight"' },
    hero: { en: 'Yuki the mountain goat and Taro the snow monkey' },
    refrain: { en: 'Wobble, wobble... POP!', fr: 'Dodo, dodo... POP !' },
    blurb: { en: 'Yuki dreams of climbing to Cloud Rock to watch the sunrise. On her very first try, down she tumbles. Then Taro\'s little red roly-poly toy pops back up, and Yuki starts to wonder what that fall taught her.' },
    themeLine: { en: 'Fall seven times, get up eight.', fr: 'Tombe sept fois, relève-toi huit.' }
  },
  {
    n: 16, slug: 'the-littlest-guardian',
    title: { en: 'The Littlest Guardian', fr: 'Le Plus Petit Gardien' },
    subtitle: { en: 'A Story About Looking After the Place You Love', fr: 'Une histoire sur le soin que l\'on prend de l\'endroit qu\'on aime' },
    value: 'guardianship', moments: ['nature'], status: 'soon', languages: FIVE, color: '#9FD3F0',
    culture: 'aotearoa', cultureIdea: { en: 'Kaitiakitanga: guardianship of the land and the sea' },
    hero: { en: 'Tama, the littlest blue penguin, and Aroha the kiwi' },
    refrain: { en: 'Pitter-pat, pitter-pat', fr: 'Tapi-tapa, tapi-tapa' },
    blurb: { en: 'After a storm, the penguins\' path home is covered in seaweed and sticks. "It\'s not my mess," says Tama. But when a tiny chick gets stuck, he thinks about everyone who has walked this path, and everyone who will. "Then I\'ll start little."' },
    themeLine: { en: 'Look after the world, the way it looks after you.' }
  },
  {
    n: 17, slug: 'the-old-path-song',
    title: { en: 'The Old Path Song', fr: 'Le Chant du vieux chemin' },
    subtitle: { en: 'A Story About Learning From Those Who Came Before', fr: 'Une histoire sur ce que nous apprennent ceux qui sont venus avant nous' },
    value: 'elders', moments: ['family'], status: 'soon', languages: FIVE, color: '#FFC59E',
    culture: 'ghana', cultureIdea: { en: 'Sankofa: the bird that walks forward while looking back' },
    hero: { en: 'Ama the tree pangolin, Kwesi the bushbaby and Nana' },
    refrain: { en: 'Ka-tum, ka-tum' },
    blurb: { en: '"Old songs are boring, Nana!" says Ama, and runs off to find something new. Then the dry, dusty wind comes, the fruit is gone, and somewhere in that old song is a secret she never really listened to.' },
    themeLine: { en: 'It\'s never too late to go back for what you left behind.' }
  },
  {
    n: 18, slug: 'the-circle-of-paws',
    title: { en: 'The Circle of Paws' },
    subtitle: { en: 'A Story About Asking for Help and Letting Others Give' },
    value: 'giving', moments: ['asking-help', 'friendship'], status: 'coming', languages: FIVE, color: '#FFE08A',
    culture: 'andes', cultureIdea: { en: 'Ayni: today I help you, tomorrow you help me' },
    hero: { en: 'Killa the chinchilla and Sami the vicuña' }
  },
  {
    n: 19, slug: 'the-beetle-who-knew-the-stars',
    title: { en: 'The Beetle Who Knew the Stars' },
    subtitle: { en: 'A Story About Asking Instead of Telling' },
    value: 'asking', moments: ['friendship'], status: 'coming', languages: FIVE, color: '#CDB8F2',
    culture: 'egypt', cultureIdea: { en: 'The Maxims of Ptahhotep: ask others, because wisdom can be found anywhere' },
    hero: { en: 'Kemi the hoopoe and Sabu the dung beetle' }
  },
  {
    n: 20, slug: 'knot-by-knot',
    title: { en: 'Knot by Knot' },
    subtitle: { en: 'A Story About Doing Things Well and Getting Them Done' },
    value: 'craft', moments: ['trying-again'], status: 'coming', languages: FIVE, color: '#A8DDA8',
    culture: 'oman', cultureIdea: { en: 'Itqan: doing your work with care, all the way to the end' },
    hero: { en: 'Zayn the weaver bird and Hana the chameleon' }
  }
];

// The values, moments and cultures the catalog is sorted by (labels per language).
const values = {
  kindness: { en: 'Kindness', fr: 'Gentillesse' },
  patience: { en: 'Patience', fr: 'Patience' },
  teamwork: { en: 'Teamwork', fr: 'Esprit d\'équipe' },
  forgiveness: { en: 'Forgiveness', fr: 'Pardon' },
  gratitude: { en: 'Gratitude', fr: 'Gratitude' },
  anger: { en: 'Managing anger', fr: 'Gérer la colère' },
  truth: { en: 'Honesty', fr: 'Honnêteté' },
  trust: { en: 'Trust', fr: 'Confiance' },
  courage: { en: 'Courage', fr: 'Courage' },
  generosity: { en: 'Generosity', fr: 'Générosité' },
  feelings: { en: 'Sharing feelings', fr: 'Partager ses émotions' },
  belonging: { en: 'Belonging', fr: 'Appartenance' },
  empathy: { en: 'Empathy', fr: 'Empathie' },
  resilience: { en: 'Resilience', fr: 'Résilience' },
  guardianship: { en: 'Guardianship', fr: 'Prendre soin' },
  elders: { en: 'Learning from elders', fr: 'La sagesse des anciens' },
  giving: { en: 'Giving and receiving', fr: 'Donner et recevoir' },
  asking: { en: 'Asking and listening', fr: 'Demander et écouter' },
  craft: { en: 'Doing it well', fr: 'Le travail bien fait' }
};

const moments = {
  'left-out': { en: 'Feeling left out', fr: 'Se sentir exclu' },
  'big-feelings': { en: 'Big feelings', fr: 'Grandes émotions' },
  'trying-again': { en: 'Trying again', fr: 'Réessayer' },
  sharing: { en: 'Sharing', fr: 'Partager' },
  brave: { en: 'Being brave', fr: 'Être courageux' },
  kindness: { en: 'Being kind', fr: 'Être gentil' },
  friendship: { en: 'Friendship', fr: 'Amitié' },
  nature: { en: 'Caring for nature', fr: 'Prendre soin de la nature' },
  family: { en: 'Grandparents and family', fr: 'Grands-parents et famille' },
  sorry: { en: 'Saying sorry', fr: 'Demander pardon' },
  honesty: { en: 'Telling the truth', fr: 'Dire la vérité' },
  patience: { en: 'Waiting', fr: 'Savoir attendre' },
  thankful: { en: 'Being thankful', fr: 'Dire merci' },
  'asking-help': { en: 'Asking for help', fr: 'Demander de l\'aide' }
};

const cultures = {
  'southern-africa': { en: 'Southern Africa', fr: 'Afrique australe' },
  japan: { en: 'Japan', fr: 'Japon' },
  aotearoa: { en: 'Aotearoa New Zealand', fr: 'Aotearoa Nouvelle-Zélande' },
  ghana: { en: 'Ghana (Akan)', fr: 'Ghana (Akan)' },
  andes: { en: 'The Andes (Quechua and Aymara)', fr: 'Les Andes (Quechua et Aymara)' },
  egypt: { en: 'Ancient Egypt', fr: 'Égypte ancienne' },
  oman: { en: 'Oman', fr: 'Oman' }
};

const languageNames = {
  en: { en: 'English', fr: 'anglais' },
  fr: { en: 'French', fr: 'français' },
  es: { en: 'Spanish', fr: 'espagnol' },
  de: { en: 'German', fr: 'allemand' },
  it: { en: 'Italian', fr: 'italien' }
};

const bySlug = Object.fromEntries(books.map((b) => [b.slug, b]));

module.exports = {
  books,
  values,
  moments,
  cultures,
  languageNames,
  get: (slug) => bySlug[slug],
  live: () => books.filter((b) => b.status !== 'coming'),
  coming: () => books.filter((b) => b.status === 'coming')
};
