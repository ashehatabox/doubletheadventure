// Social proof. Only real items, with permission. Nothing here is shown until it exists:
// - quotes: the homepage strip appears once there are 3 or more.
// - press and awards: the badge row appears once there is at least one.
// - culturalReviewers: a credit line on the book page, per book slug, only with the reader's agreement.
// Never write an invented quote, review, outlet or award.
module.exports = {
  // { text: { en, fr }, name: 'First name or role', role: { en, fr }, place: 'Kingston, ON', book: 'the-snug', permission: '2026-11-20 by email' }
  quotes: [],
  // { outlet: 'Kingston Whig-Standard', title: 'Headline', url: 'https://...', date: '2026-12-01' }
  press: [],
  // { name: 'CCBC Best Books for Kids & Teens', year: '2027', url: 'https://...' }
  awards: [],
  // 'the-view-from-down-low': { from: { en: 'Southern Africa', fr: 'Afrique australe' }, name: '' }  (name only if they agree)
  culturalReviewers: {}
};
