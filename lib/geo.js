// Places a latitude/longitude on public/images/map/world.svg (Natural Earth projection, same numbers as scripts/make-map.mjs).
// Returns [left %, top %] of the map image.
const K = 159.59049144792579, TX = 500, TY = 235; // geoNaturalEarth1().fitExtent([[8, 8], [992, 462]], sphere)
const X0 = 62, Y0 = 8, W = 875, H = 388;          // the svg's viewBox (land crop)
const R = Math.PI / 180;
function raw(lambda, phi) {
  const p2 = phi * phi, p4 = p2 * p2;
  return [
    lambda * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4))),
    phi * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)))
  ];
}
function toMap(lat, lon) {
  const [x, y] = raw(lon * R, lat * R);
  const px = TX + K * x, py = TY - K * y;
  return [+((px - X0) / W * 100).toFixed(2), +((py - Y0) / H * 100).toFixed(2)];
}
module.exports = { toMap };
