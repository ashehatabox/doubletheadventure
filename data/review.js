// The reviewer area (/review): what the reviewer sees first. See lib/review.js.
// `priorities`: short questions Abdallah wants answered before anything else. Each one gets its own answer box
// on the reviewer's home page; answers arrive in /admin/review like any other comment.
module.exports = {
  priorities: [
    { id: 'refrain-10', slug: 'the-spring-that-wanted-to-stay', book: 10, label: 'Livre 10, la ritournelle', en: 'Drip… drip… drip.', text: 'Plic… plic… plic.', question: "Est-ce le son de l'eau qu'un enfant français connaît ?" },
    { id: 'refrain-11', slug: 'the-light-that-grows', book: 11, label: 'Livre 11, la ritournelle', en: 'Blink! Blink! Blink!', text: 'Clignote ! Clignote ! Clignote !', question: 'Le mot sonne-t-il bien à voix haute ?' },
    { id: 'refrain-12', slug: 'the-pebbles-inside', book: 12, label: 'Livre 12, la ritournelle', en: '‘I’m fine.’ Click.', text: '« Ça va. » Clic.', question: "Garde-t-on le rythme de l'anglais ?" }
  ]
};
