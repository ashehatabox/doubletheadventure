// Site-wide settings. Change these without touching the pages.
module.exports = {
  name: 'A² Publishing',
  series: 'Double the Adventure',
  authors: ['Amr Mohamed', 'Abdallah Shehata'],
  contactEmail: 'hello@doubleadventure.ca',
  ages: '3–7',
  languages: ['en', 'fr', 'es', 'de', 'it'],
  // Prices shown on the site (same as Amazon, same for every book).
  prices: { paperback: '11.99', kindle: '4.99', digital: '4.99' },
  // The book shown in the "New book" band on the home page.
  featured: 'the-snug',
  // Kickstarter for the books. Leave empty until the campaign page exists; /ks then goes to the catalog.
  kickstarterUrl: ''
};
