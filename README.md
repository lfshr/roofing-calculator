# Roof & Joinery Calculator

A browser calculator for roofing and woodworking joints, with a diagram for every calculation. Works in millimetres or inches.

**Live site:** https://lfshr.github.io/roofing-calculator/

## What it calculates

**Roofing** — give it a pitch (degrees, rise-in-12 or percent) and a run:

- Pitch in every format, pitch factor for roof area
- Rise, common rafter line length, ridge allowance, overhang, total rafter length
- Plumb and seat cut angles
- Birdsmouth: plumb (heel) height, notch depth with the 1/3 rule, height above plate (HAP)
- Hips and valleys (regular roof, 45° in plan): hip run, hip pitch, length, cuts, backing angle, or hip drop
- Jack rafters: common difference, cheek cuts, and a table of every jack length

**Joinery**

- Through dovetails: angle from slope ratio, tail and pin widths, marking-out positions at the end and at the baseline
- Mortise and tenon: tenon thickness rounded to a chisel size, length, mortise depth, warnings
- Box (finger) joints: odd finger count fitted exactly to the board
- Mitres and compound mitres: saw mitre and bevel for any number of sides and any splay

## Running it

It's a static site with no build step. Open `index.html` through any web server, for example:

```sh
npm start        # python3 -m http.server 8000
npm test         # checks the maths (Node 20+)
```

## Deploying

`.github/workflows/pages.yml` runs the tests and publishes the site to GitHub Pages on every push to `main`.
One-time setup: in the repository go to **Settings → Pages** and set **Source** to **GitHub Actions**.

## Layout

- `js/roofing.js`, `js/joinery.js` – the maths (pure functions, unit-agnostic)
- `js/diagrams.js`, `js/svg.js` – SVG diagrams
- `js/app.js` – the page
- `tests/` – `node --test` checks against known values (3-4-5 roof, 30° backing on a 45° roof, 35.26°/30° compound mitre, …)

Always check figures against your drawings and local building regulations before cutting.
