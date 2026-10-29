// Makes public/images/map/world.svg and data/map-points.json (run once; needs: npm i world-atlas@2 topojson-client@3 d3-geo@3 in a scratch folder).
import fs from 'fs';
import { feature, merge } from 'topojson-client';
import { geoPath } from 'd3-geo';
import { geoNaturalEarth1 } from 'd3-geo';
const topo = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-110m.json'));
const geoms = topo.objects.countries.geometries.filter(g => g.id !== '010');
const land = merge(topo, geoms);
const W = 1000, H = 470;
const proj = geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], { type: 'Sphere' });
// crop: sphere includes Antarctica band; fit then move.
const path = geoPath(proj).digits(1);
const d = path(land);
const points = {
  'southern-africa': [26, -29], japan: [138.5, 36.5], aotearoa: [174.5, -40.5], ghana: [-1.2, 7.5],
  andes: [-70, -15], egypt: [31.2, 26.5], oman: [57.5, 21.5]
};
const out = {};
for (const [k, ll] of Object.entries(points)) { const [x, y] = proj(ll); out[k] = [Math.round(x), Math.round(y)]; }
const sph = path({ type: 'Sphere' });
fs.writeFileSync('map.json', JSON.stringify({ width: W, height: H, land: d, sphere: sph, points: out }));
console.log(d.length, out);
const b = path.bounds(land); // [[x0,y0],[x1,y1]]
const x0 = Math.floor(b[0][0]) - 6, y0 = Math.floor(b[0][1]) - 6, w = Math.ceil(b[1][0] - b[0][0]) + 12, h = Math.ceil(b[1][1] - b[0][1]) + 12;
const pts = {}; for (const [k, [x, y]] of Object.entries(out)) pts[k] = [+((x - x0) / w * 100).toFixed(2), +((y - y0) / h * 100).toFixed(2)];
fs.writeFileSync('world.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${h}"><path d="${d}" fill="#FFF9EE" stroke="#0E7C7B" stroke-opacity=".35" stroke-width="1" stroke-linejoin="round"/></svg>`);
fs.writeFileSync('points.json', JSON.stringify({ aspect: +(w / h).toFixed(4), points: pts }, null, 1));
console.log(x0, y0, w, h, pts);
