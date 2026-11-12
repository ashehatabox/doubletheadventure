// The book reader (/books/<slug>/read): settings.
//
// KDP SELECT: a book enrolled in KDP Select may not be readable in full anywhere else, free or paid.
// Until READER_OPEN=1 is set (do that only once the books are OUT of KDP Select), every book runs in
// "sample" mode: the cover, the dedication page and the first story spread only (2 story pages of 22,
// under the 10% sample Amazon describes), no code box and no "unlock" button, just the Amazon buttons.
//
// With READER_OPEN=1 a book opens `freeSpreads` spreads for free and the rest unlocks with a book code
// or a payment. Books listed in `stillInSelect` stay in sample mode even then (for a book whose
// 90-day Select term hasn't ended yet).
//
// Book pages live in content/reader/<slug>/ (see manifest.json there), never in public/.
module.exports = {
  sampleSpreads: 3, // cover + dedication + first story spread
  freeSpreads: 4, // when open: cover + dedication + 2 story spreads (4 story pages)
  stillInSelect: [],
  // Last day of each book's KDP Select term (latest of its language editions; auto-renew turned off Nov 12, 2026).
  // Even with READER_OPEN=1 a book stays in sample mode until the day after this date.
  selectEnds: {
    'becoming-a-tree': '2026-12-17',
    'the-fox-mistake': '2026-12-31',
    'the-honest-little-raccoon': '2027-01-04',
    'the-snug': '2027-02-05',
    'the-pebbles-inside': '2027-02-05',
    'secret-hero': '2027-02-08'
  },
  priceCents: 499, // unlock one book to read online, CAD (same as Kindle)
  currency: 'cad',
  // Code prefix printed on book codes, per book. Codes look like SNUG-0042-K7QX3M.
  // FAMILY codes unlock every book (Kickstarter rewards, gifts to schools).
  codePrefix: {
    'secret-hero': 'HERO', 'becoming-a-tree': 'TREE', 'friendship-bridge': 'BRIDGE', 'the-fox-mistake': 'FOX',
    'rainy-day-shiny-things': 'RAINY', 'the-desert-buzz': 'BUZZ', 'the-honest-little-raccoon': 'RACCOON',
    'finn-and-coral': 'CORAL', 'pip-the-brave-parrot': 'PIP', 'the-spring-that-wanted-to-stay': 'SPRING',
    'the-light-that-grows': 'LIGHT', 'the-pebbles-inside': 'PEBBLES', 'the-snug': 'SNUG',
    'the-view-from-down-low': 'VIEW', 'eight-times-up': 'EIGHT', 'the-littlest-guardian': 'GUARDIAN',
    'the-old-path-song': 'PATH', 'the-circle-of-paws': 'PAWS', 'the-beetle-who-knew-the-stars': 'BEETLE',
    'knot-by-knot': 'KNOT', 'tumble-and-the-honey-glow': 'HONEY'
  },
  // Demo codes (any case): open EVERY book in full on that device, even in sample mode / during KDP Select.
  // For private presentations only. Anyone who has the code can read the full books, so change or remove it
  // after a demo while books are still in KDP Select.
  demoCodes: ['A2NOW'],
  // Codes to switch off (lost or shared too widely), e.g. 'SNUG-0042-K7QX3M'.
  revoked: []
};
