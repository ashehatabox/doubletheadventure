// What the shop can sell. A product goes on sale only when it has a price (priceCents) AND the shop is switched on (SHOP_OPEN=1 plus STRIPE_SECRET_KEY).
// Prices are in cents, Canadian dollars. Leave priceCents as null until the product really exists and the price is decided.
module.exports = {
  currency: 'cad',
  allowedCountries: ['CA', 'US'],
  products: [
    {
      id: 'set-three-books',
      physical: true,
      title: { en: 'Three-book set', fr: 'Ensemble de trois livres' },
      text: { en: 'Three paperbacks around one value, shipped together.', fr: 'Trois livres brochés sur une même valeur, expédiés ensemble.' },
      priceCents: null
    },
    {
      id: 'signed-copy',
      physical: true,
      dedication: true,
      title: { en: 'Signed copy with a dedication', fr: 'Exemplaire dédicacé' },
      text: { en: 'A paperback signed by the authors, with your message or your child\'s name.', fr: 'Un livre broché signé par les auteurs, avec votre message ou le prénom de votre enfant.' },
      priceCents: null
    },
    {
      id: 'bilingual-set',
      physical: true,
      title: { en: 'English and French set', fr: 'Ensemble anglais et français' },
      text: { en: 'The same story in English and in French.', fr: 'La même histoire en anglais et en français.' },
      priceCents: null
    }
  ]
};
