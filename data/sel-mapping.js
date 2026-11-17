// Curriculum / SEL mapping sheet (credibility Asset 5). One row per book.
// Activities and questions come from each book's teacher guide (/educators/guides/<slug>).
// strand: Ontario Kindergarten Curriculum (2026) strand the book builds most (C = Self-Regulation and Well-Being,
// D = Belonging and Contributing, B = Problem Solving and Innovating, A = Foundations of Language and Mathematics).
// hpe: Ontario Health and Physical Education, grades 1–2 (2019), social-emotional learning skill A1.x.
// casel: CASEL 5 competencies. These are Claude's matches, to be checked by an Ontario kindergarten teacher
// (the "teacher check" rows below). Say "aligned with", never "approved".
const STRANDS = {
  A: { en: 'Strand A, Foundations of Language and Mathematics', fr: 'Volet A, Fondements de la langue et des mathématiques' },
  B: { en: 'Strand B, Problem Solving and Innovating', fr: 'Volet B, Résolution de problèmes et innovation' },
  C: { en: 'Strand C, Self-Regulation and Well-Being', fr: 'Volet C, Autorégulation et bien-être' },
  D: { en: 'Strand D, Belonging and Contributing', fr: 'Volet D, Appartenance et contribution' }
};
const HPE = {
  'A1.1': { en: 'A1.1 identify and manage emotions', fr: 'A1.1 reconnaître et gérer ses émotions' },
  'A1.2': { en: 'A1.2 cope with stress and seek help', fr: 'A1.2 gérer le stress et demander de l\'aide' },
  'A1.3': { en: 'A1.3 positive motivation and perseverance', fr: 'A1.3 motivation positive et persévérance' },
  'A1.4': { en: 'A1.4 relationships, empathy and communication', fr: 'A1.4 relations, empathie et communication' },
  'A1.5': { en: 'A1.5 self-awareness and sense of identity', fr: 'A1.5 conscience de soi et sentiment d\'identité' },
  'A1.6': { en: 'A1.6 critical and creative thinking', fr: 'A1.6 pensée critique et créative' }
};
const CASEL = {
  sa: { en: 'Self-awareness', fr: 'Conscience de soi' },
  sm: { en: 'Self-management', fr: 'Gestion de soi' },
  so: { en: 'Social awareness', fr: 'Conscience sociale' },
  rs: { en: 'Relationship skills', fr: 'Habiletés relationnelles' },
  rd: { en: 'Responsible decision-making', fr: 'Prise de décision responsable' }
};
const R = (slug, casel, strand, hpe, activity, question) => ({ slug, casel, strand, hpe, activity, question });
const rows = [
  R('secret-hero', ['so', 'rs'], 'D', 'A1.4', 'Who did this? (10 min, whole class)', 'What small, quiet thing could you do tomorrow to brighten someone\'s day?'),
  R('becoming-a-tree', ['sm'], 'C', 'A1.3', 'Growing chart (10 min, whole class)', 'What advice would you give a tiny seed that wants to grow up quickly?'),
  R('friendship-bridge', ['rs'], 'B', 'A1.4', 'Good idea spotting (10 min, whole class)', 'What could you build with someone else this week?'),
  R('the-fox-mistake', ['rs', 'rd'], 'D', 'A1.4', 'The sorry steps (10 min, pairs)', 'What can you say or do when you have made a mistake with a friend?'),
  R('rainy-day-shiny-things', ['sa', 'so'], 'C', 'A1.3', 'Thank-you without words (10 min, pairs)', 'Who looks after you? How could you show them thanks?'),
  R('the-desert-buzz', ['sm'], 'C', 'A1.1', 'Anger thermometer (10 min, whole class)', 'What helps you when you feel a big angry feeling?'),
  R('the-honest-little-raccoon', ['rd', 'sa'], 'D', 'A1.6', 'The bakery choice (10 min, small groups)', 'Can you remember a time when telling the truth was hard?'),
  R('finn-and-coral', ['rs'], 'D', 'A1.4', 'Stick with me (10 min, pairs)', 'What is a promise you can keep for someone this week?'),
  R('pip-the-brave-parrot', ['sa', 'rs'], 'C', 'A1.2', 'Call for help (10 min, whole class)', 'When is it important to use your voice, even if you feel shy?'),
  R('the-spring-that-wanted-to-stay', ['so'], 'D', 'A1.4', 'Stuck pond, flowing stream (10 min, small groups)', 'What is something you have that you could share? How might it come back to you?'),
  R('the-light-that-grows', ['so', 'sm'], 'D', 'A1.4', 'Pass the light (10 min, whole class)', 'What is a "light" you have that you could share with someone?'),
  R('the-pebbles-inside', ['sa'], 'C', 'A1.1', 'Listener practice (10 min, pairs)', 'Who could you tell when you have a "pebble" inside?'),
  R('the-snug', ['so', 'rs'], 'D', 'A1.5', 'Freeze frame (small groups)', 'Is there someone who might like you to sit with them?'),
  R('the-view-from-down-low', ['so'], 'D', 'A1.4', 'Down-low walk (10 min, whole class)', 'When could you "bend down" to see how a friend feels?'),
  R('eight-times-up', ['sm'], 'C', 'A1.3', 'What did the fall teach me? (10 min, whole class)', 'What is something you are learning that makes you fall sometimes?'),
  R('the-littlest-guardian', ['rd'], 'D', 'A1.3', 'Our classroom path (10 min, whole class)', 'What place do you love that you could look after?'),
  R('the-old-path-song', ['so', 'rs'], 'D', 'A1.5', 'Ask an elder (at home, then 10 min in class)', 'What would you like to ask a grandparent or an older friend?'),
  R('the-circle-of-paws', ['rs'], 'D', 'A1.2', 'Yarn circle (10 min, whole class)', 'When is it hard for you to ask for help?'),
  R('the-beetle-who-knew-the-stars', ['rs', 'sm'], 'D', 'A1.4', 'Ask first circle (10 min, pairs)', 'What question could you ask a friend today?'),
  R('knot-by-knot', ['sm', 'rd'], 'C', 'A1.3', 'Done or done well? (10 min, small groups)', 'What is something you can do well and finish this week?'),
  R('tumble-and-the-honey-glow', ['sa', 'sm'], 'C', 'A1.1', 'Body check-in (5 min, whole class, then daily)', 'Was resting brave? Why?')
];
// Rows an Ontario kindergarten teacher checks first (they cover all 5 CASEL competencies and 5 HPE skills).
const teacherCheck = ['the-desert-buzz', 'the-honest-little-raccoon', 'pip-the-brave-parrot', 'the-snug', 'knot-by-knot'];
const checked = []; // slugs a teacher has confirmed, with their permission to say so
module.exports = { STRANDS, HPE, CASEL, rows, teacherCheck, checked };
