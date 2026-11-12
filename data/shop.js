// What the shop can sell. A product goes on sale only when it has a price (priceCents) AND the shop is switched on (SHOP_OPEN=1 plus STRIPE_SECRET_KEY).
// Prices are in cents, Canadian dollars, shipping included (Canada and US). Worked out in data/pricing.js:
// print cost + author-copy shipping + Stripe fee + profit. `books` = how many paperbacks the order ships; `choose` asks which books at checkout.
// Check the margins with: node scripts/price-check.js
module.exports = {
  currency: 'cad',
  allowedCountries: ['CA', 'US'],
  products: [
    {
      id: 'set-three-books',
      physical: true,
      title: { en: 'Three-book set', fr: 'Ensemble de trois livres' },
      text: { en: 'Three paperbacks around one value, shipped together. Shipping included.', fr: 'Trois livres brochés sur une même valeur, expédiés ensemble. Livraison incluse.' },
      books: 3, choose: true,
      priceCents: 4699
    },
    {
      id: 'signed-copy',
      physical: true,
      dedication: true,
      title: { en: 'Signed copy with a dedication', fr: 'Exemplaire dédicacé' },
      text: { en: 'A paperback signed by the authors, with your message or your child\'s name. Shipping included.', fr: 'Un livre broché signé par les auteurs, avec votre message ou le prénom de votre enfant. Livraison incluse.' },
      books: 1, choose: true, signed: true,
      priceCents: 3999
    },
    {
      id: 'bilingual-set',
      physical: true,
      title: { en: 'English and French set', fr: 'Ensemble anglais et français' },
      text: { en: 'The same story in English and in French. Shipping included.', fr: 'La même histoire en anglais et en français. Livraison incluse.' },
      books: 2, choose: true,
      priceCents: 3499
    },
    {
      id: 'classroom-set-5',
      physical: true,
      educator: true,
      title: { en: 'Classroom set: 5 books', fr: 'Ensemble de classe : 5 livres' },
      text: { en: 'Five paperbacks you choose (by value or by language), with the SEL pack for each book and a classroom licence. Shipping included.', fr: 'Cinq livres brochés au choix (par valeur ou par langue), avec la trousse SEL de chaque livre et une licence de classe. Livraison incluse.' },
      books: 5, choose: true,
      priceCents: 7499
    },
    {
      id: 'classroom-set-10',
      physical: true,
      educator: true,
      title: { en: 'Classroom set: 10 books', fr: 'Ensemble de classe : 10 livres' },
      text: { en: 'Ten paperbacks you choose, with the SEL pack for each book and a classroom licence. Shipping included.', fr: 'Dix livres brochés au choix, avec la trousse SEL de chaque livre et une licence de classe. Livraison incluse.' },
      books: 10, choose: true,
      priceCents: 13999
    },
    {
      id: 'full-library',
      physical: true,
      educator: true,
      title: { en: 'The whole library: 21 books', fr: 'Toute la collection : 21 livres' },
      text: { en: 'All 21 books in one language, all the SEL packs and a classroom licence. Shipping included.', fr: 'Les 21 livres dans une langue, toutes les trousses SEL et une licence de classe. Livraison incluse.' },
      books: 21, choose: true,
      priceCents: 27999
    }
  ]
};
