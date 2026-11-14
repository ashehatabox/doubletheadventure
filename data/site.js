// Site-wide settings. Change these without touching the pages.
module.exports = {
  email(kind) { return (this.emails && this.emails[kind]) || this.emails.hello; },
  name: 'A² Publishing',
  series: 'Double the Adventure',
  authors: ['Amr Mohamed', 'Abdallah Shehata'],
  contactEmail: 'hello@doubleadventure.ca',
  // One address per audience. null = not set up yet: the page shows hello@ instead (see the "still needed" list).
  emails: { hello: 'hello@doubleadventure.ca', press: null, orders: null, rights: null },
  location: { en: 'Made in Kingston, Ontario, Canada', fr: 'Fait à Kingston, en Ontario, au Canada' },
  // Google Analytics 4 measurement ID (G-XXXXXXX). Set GA4_ID on the server; empty = no analytics at all.
  ga4Id: process.env.GA4_ID || '',
  ages: '3–7',
  languages: ['en', 'fr', 'es', 'de', 'it'],
  // Prices shown on the site (same as Amazon, same for every book).
  prices: { paperback: '11.99', kindle: '4.99', digital: '4.99' },
  // The book shown in the "New book" band on the home page.
  featured: 'the-snug',
  // Kickstarter for the books. Leave empty until the campaign page exists; /ks then goes to the catalog.
  kickstarterUrl: ''
};
