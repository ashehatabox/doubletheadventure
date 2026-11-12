// Read-aloud videos, per book and language. Each entry is either a YouTube video (preferred: free bandwidth,
// "made for kids" setting) or a video file hosted on the site:
//   'pip-the-brave-parrot': {
//     en: { youtube: 'VIDEO_ID', minutes: 4 },
//     es: { file: '/video/pip-the-brave-parrot-es.mp4', minutes: 4 }
//   }
// YouTube videos must be Public or Unlisted to play on the site (Private videos won't play).
// Nothing loads from YouTube until a visitor presses play (children's privacy).
module.exports = {
  'becoming-a-tree': {
    en: {youtube: 'xadUnTLixnY'}
  },
  'the-beetle-who-knew-the-stars': {
    en: {youtube: 'KGDQuZFm_5Y'}
  },
  'the-circle-of-paws': {
    en: {youtube: 'D4MO6CECcSk'}
  },
  'the-desert-buzz': {
    en: {youtube: 's5z-1rc1oCo'}
  }
};
