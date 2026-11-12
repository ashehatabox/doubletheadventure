// Draws the "where is it?" map for a hero guide: the continent, the place's countries shaded, and
// writes the pin position (percent) back into the guide's place.map.pin.
//   Run once per book, from a scratch folder that has: npm i world-atlas@2 topojson-client@3 d3-geo@3
//   node /path/to/repo/scripts/make-hero-map.mjs /path/to/repo <book-slug>
// The guide needs place.map: { lat, lon, region: [west, south, east, north], highlight: [ISO numeric country ids] }.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const [repo, slug] = process.argv.slice(2);
const require = createRequire(path.join(process.cwd(), 'x.js'));
const { feature, mesh } = require('topojson-client');
const { geoPath, geoMercator } = require('d3-geo');
const topo = require('world-atlas/countries-50m.json');
const file = path.join(repo, 'data', 'heroes', slug + '.json');
const guide = JSON.parse(fs.readFileSync(file, 'utf8'));
const m = guide.place.map;
const [west, south, east, north] = m.region;

const W = 800;
const box = { type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[west, south], [east, north]] } };
const proj = geoMercator().fitWidth(W, box);
const [[, y0], [, y1]] = geoPath(proj).bounds(box);
const H = Math.round(y1 - y0);
proj.translate([proj.translate()[0], proj.translate()[1] - y0]);
proj.clipExtent([[-4, -4], [W + 4, H + 4]]);
const p = geoPath(proj).digits(0);

const countries = feature(topo, topo.objects.countries).features;
const hi = new Set((m.highlight || []).map((n) => String(n).padStart(3, '0')));
const land = countries.filter((c) => !hi.has(c.id)).map((c) => p(c)).join('');
const shaded = countries.filter((c) => hi.has(c.id)).map((c) => p(c)).join('');
const borders = p(mesh(topo, topo.objects.countries, (a, b) => a !== b));

// Colours match the site's tokens (cream land, teal coast, sky sea, sun for the story's countries).
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
  `<rect width="${W}" height="${H}" fill="#DDF1FC"/>` +
  `<path d="${land}" fill="#FFF9EE" stroke="#0E7C7B" stroke-opacity=".45" stroke-width="1"/>` +
  `<path d="${shaded}" fill="#FFE08A" stroke="#0E7C7B" stroke-opacity=".55" stroke-width="1"/>` +
  `<path d="${borders}" fill="none" stroke="#4A3426" stroke-opacity=".22" stroke-width=".8"/></svg>`;
fs.writeFileSync(path.join(repo, 'public', 'images', 'heroes', slug, 'map.svg'), svg);

const [x, y] = proj([m.lon, m.lat]);
m.pin = [+(x / W * 100).toFixed(2), +(y / H * 100).toFixed(2)];
m.aspect = +(W / H).toFixed(4);
fs.writeFileSync(file, JSON.stringify(guide, null, 2) + '\n');
console.log(slug, 'map', W + 'x' + H, 'pin', m.pin);
