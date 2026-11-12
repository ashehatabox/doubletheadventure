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
    en: {youtube: 'xadUnTLixnY'},
    fr: {youtube: '0XSckdBJT2E'},
    de: {youtube: 'ajVwcUWakBw'}
  },
  'friendship-bridge': {
    en: {youtube: 'j3evdgvamzc'},
    fr: {youtube: 'InR92gZ5vBk'}
  },
  'pip-the-brave-parrot': {
    en: {youtube: 'RP43uvUM4TI'},
    es: {youtube: 'rL7BoSEUbEE'}
  },
  'rainy-day-shiny-things': {
    en: {youtube: 'vy6pq0-x0mc'},
    fr: {youtube: 'etoZrKWer9w'}
  },
  'secret-hero': {
    en: {youtube: 'DZhiIBMMgFU'},
    fr: {youtube: 'Eh2zaZZxMaA'},
    de: {youtube: 'UEy6qwnYDys'}
  },
  'the-beetle-who-knew-the-stars': {
    en: {youtube: 'KGDQuZFm_5Y'}
  },
  'the-circle-of-paws': {
    en: {youtube: 'D4MO6CECcSk'}
  },
  'the-desert-buzz': {
    en: {youtube: 's5z-1rc1oCo'},
    fr: {youtube: '878PV--pkh0'}
  },
  'the-fox-mistake': {
    en: {youtube: '48wrY-wemZ0'},
    fr: {youtube: 'ZnsIgBljmWc'}
  },
  'the-honest-little-raccoon': {
    en: {youtube: 'IJW7g_8FvxQ'},
    fr: {youtube: 'my7yz7EX1uo'}
  },
  'the-pebbles-inside': {
    en: {youtube: 'HP49IqXq0oQ'},
    fr: {youtube: 'X4DVc_CCTGY'}
  },
  'the-snug': {
    en: {youtube: 'F8sxzOwsr4g'},
    fr: {youtube: 'rL5-IvX86RA'}
  }
};
