// A car seen from above, as a small drawing. It is drawn upright (front at the top) in a box 60 wide and 60 per cell long,
// then turned sideways for a car that goes left and right, and turned the other way round for some, so not every car looks
// to the same side. The red car (0) has a white roof and a flashing light bar; a car of three cells is a bus or a truck.
// Colours and the light bar's blink are set in rush-hour.css through the classes used here.
export function carSvg(c, i) {
  const L = 60 * c.len;
  const flip = i === 0 || i % 2 === 1;
  const r = (k) => Math.round(k * 10) / 10;
  const rect = (cls, x, y, w, h, rx) => `<rect class="${cls}" x="${x}" y="${r(y)}" width="${w}" height="${r(h)}" rx="${rx}"/>`;

  const shape = (body) => rect('sh', 10, 9, 46, L - 8, 16)
    + [0.18, 1 - 0.18 - 16 / L].map((k) => rect('wh', 3, L * k, 6, 16, 3) + rect('wh', 51, L * k, 6, 16, 3)).join('')
    + body;
  const lights = '<ellipse class="lt" cx="16" cy="9" rx="5" ry="3"/><ellipse class="lt" cx="44" cy="9" rx="5" ry="3"/>'
    + rect('tl', 11, L - 11, 9, 4, 2) + rect('tl', 40, L - 11, 9, 4, 2);
  const glass = (a) => `<path class="gl" d="M15 ${r(a)} Q30 ${r(a - 5)} 45 ${r(a)} L41 ${r(a + 15)} Q30 ${r(a + 12)} 19 ${r(a + 15)} Z"/>`
    + `<path class="gh" d="M19 ${r(a + 3)} L26 ${r(a + 3)} L24 ${r(a + 10)} L20 ${r(a + 10)} Z"/>`;
  const mirrors = (a) => rect('cb', 1, a - 2, 7, 9, 2.5) + rect('cb', 52, a - 2, 7, 9, 2.5);

  let art;
  if (c.len === 2) {
    const a = 0.3 * L;
    const roof = 0.17 * L;
    const b = a + 15 + roof;
    art = shape(rect('cb', 7, 4, 46, L - 8, 16) + mirrors(a) + glass(a)
      + (i === 0
        ? rect('pw', 16, a + 15, 28, roof + 4, 6) + rect('lb1', 19, a + 26, 11, 6, 2) + rect('lb2', 30, a + 26, 11, 6, 2)
        : rect('cr', 17, a + 15, 26, roof, 5))
      + `<path class="gl" d="M19 ${r(b + 4)} L41 ${r(b + 4)} L45 ${r(b + 16)} L15 ${r(b + 16)} Z"/>` + lights);
  } else if (i % 2 === 0) { // a bus: a long roof with windows along it
    const a = 0.08 * L;
    art = shape(rect('cb', 7, 4, 46, L - 8, 12) + glass(a) + mirrors(a + 2)
      + rect('cr', 13, a + 20, 34, L - a - 36, 6)
      + [0, 1, 2, 3].map((k) => rect('gh', 17, a + 26 + k * 30, 26, 14, 3)).join('') + lights);
  } else { // a truck: a cab at the front and a box behind it
    art = shape(rect('cb', 7, 4, 46, 62, 14) + glass(14) + mirrors(16)
      + rect('cr', 17, 29, 26, 14, 4)
      + rect('cg', 5, 70, 50, L - 76, 6)
      + [0, 1, 2].map((k) => `<path class="ln" d="M12 ${82 + k * 28} H48"/>`).join('') + lights);
  }
  const turned = flip ? `<g transform="rotate(180 30 ${L / 2})">${art}</g>` : art;
  return c.v
    ? `<svg class="cs" viewBox="0 0 60 ${L}" preserveAspectRatio="none" aria-hidden="true">${turned}</svg>`
    : `<svg class="cs" viewBox="0 0 ${L} 60" preserveAspectRatio="none" aria-hidden="true"><g transform="translate(0 60) rotate(-90)">${turned}</g></svg>`;
}
