import { calcRoof, pitchToDegrees } from "./roofing.js";
import { calcDovetail, calcMortiseTenon, calcBoxJoint, calcMitre } from "./joinery.js";
import * as D from "./diagrams.js";
import { fmtLen, fmtAng, fmtNum } from "./units.js";

const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* private mode etc. */
    }
  },
};

let unit = store.get("unit") === "in" ? "in" : "mm";

// ------------------------------------------------------------ html helpers
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const row = (label, value, opts = {}) =>
  `<div class="row${opts.hl ? " hl" : ""}"><dt>${esc(label)}${opts.sub ? `<small>${esc(opts.sub)}</small>` : ""}</dt><dd>${esc(value)}</dd></div>`;
const group = (title, rows, note = "") =>
  `<section class="card"><h3>${esc(title)}</h3><dl>${rows.join("")}</dl>${note ? `<p class="note">${note}</p>` : ""}</section>`;
const figure = (svg, caption) => `<figure class="fig">${svg}<figcaption>${caption}</figcaption></figure>`;
const warnings = (list) =>
  list.length ? `<div class="warnings" role="alert">${list.map((w) => `<p>⚠ ${esc(w)}</p>`).join("")}</div>` : "";
const len = (v) => fmtLen(v, unit);
const unitNote = () => (unit === "mm" ? "Dimensions in mm." : "Dimensions in inches.");

// ------------------------------------------------------------ form reading
function readForm(form) {
  const out = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === "checkbox") out[el.name] = el.checked;
    else if (el.type === "number") out[el.name] = el.value === "" ? 0 : Number(el.value);
    else out[el.name] = el.value;
  }
  return out;
}

// ------------------------------------------------------------ calculators
const renderers = {
  roof(v) {
    const pitchDeg = pitchToDegrees(v.pitch, v.pitchMode);
    const r = calcRoof({ ...v, pitchDeg });
    const c = r.common;
    const b = r.birdsmouth;
    const h = r.hip;
    const j = r.jack;
    const hasDepth = v.rafterDepth > 0;
    const hasSeat = v.seatLength > 0;

    const pitchRows = [
      row("Degrees", fmtAng(r.pitch.degrees, 2), { hl: true }),
      row("Rise per 12", `${fmtNum(r.pitch.in12, 2)} in 12`),
      row("Percent", `${fmtNum(r.pitch.percent, 1)} %`),
      row("Ratio", `1 in ${fmtNum(r.pitch.oneIn, 2)}`, { sub: "run per unit of rise" }),
      unit === "mm"
        ? row("Rise per metre of run", `${fmtNum(r.pitch.risePerUnit * 1000, 0)} mm`)
        : row("Rise per foot of run", `${fmtNum(r.pitch.in12, 2)}"`),
      row("Pitch factor", fmtNum(c.pitchFactor, 4), { sub: "slope length ÷ plan length (use for roof area)" }),
    ];

    const commonRows = [
      row("Span", len(c.span)),
      row("Run", len(c.run)),
      row("Rise", len(c.rise), { hl: true, sub: "plate to ridge centre, on the measuring line" }),
      row("Line length", len(c.lineLength), { sub: "plate to ridge centre, along the slope" }),
      row("Less half the ridge", `− ${len(c.ridgeReduction)}`),
      row("Plus overhang (along slope)", `+ ${len(c.overhangLength)}`),
      row("Rafter length", len(c.rafterLength), { hl: true, sub: "tail plumb cut to ridge plumb cut" }),
      row("Plumb cut", fmtAng(c.plumbCutToEdge), { sub: `to the rafter edge (set square / bevel at ${fmtAng(c.plumbCutSquareSetting)})` }),
      row("Seat cut", fmtAng(c.seatCutToEdge), { sub: "to the rafter edge" }),
    ];

    const birdRows = hasDepth || hasSeat
      ? [
          row("Seat (level)", len(b.seatLength)),
          row("Plumb (heel) cut height", len(b.plumbHeight)),
          row("Notch depth, square to rafter", len(b.depth), { sub: hasDepth ? `keep under 1/3 depth: ${len(b.maxDepth)}` : "" }),
          ...(hasDepth
            ? [
                row("Rafter depth measured plumb", len(b.verticalDepth)),
                row("Height above plate (HAP)", len(b.heightAbovePlate), { hl: true, sub: "plate top to rafter top, at the outside of the plate" }),
                row("Rafter top at ridge, above plate", len(b.ridgeTopHeight), { sub: "rise + HAP" }),
              ]
            : []),
        ]
      : [row("Birdsmouth", "enter rafter depth and seat length")];

    const hipRows = [
      row("Hip run (plan)", len(h.run)),
      row("Hip pitch", fmtAng(h.pitch, 2), { hl: true }),
      row("Hip line length", len(h.lineLength), { sub: "plate corner to ridge centre" }),
      row("Less ridge allowance", `− ${len(h.ridgeReduction)}`),
      row("Plus overhang (along hip)", `+ ${len(h.overhangLength)}`),
      row("Hip length", len(h.length), { hl: true }),
      row("Plumb cut", fmtAng(h.plumbCutToEdge), { sub: `to the edge (square at ${fmtAng(h.pitch)})` }),
      row("Seat cut", fmtAng(h.seatCutToEdge), { sub: "to the edge" }),
      row("Cheek cuts", `plumb line, saw at ${fmtAng(h.cheekBevel, 0)}`, { sub: `shows as ${fmtAng(h.topEdgeAngle)} to the edge on the top` }),
      row("Backing angle", fmtAng(h.backingAngle), { sub: "bevel each side of the top so it sits in both roof planes" }),
      row("…or drop the hip by", len(h.drop), { sub: "instead of backing: deepen the birdsmouth this much" }),
      row("Hip factor", fmtNum(h.factor, 4), { sub: "hip line length ÷ common run" }),
    ];

    const jackRows = v.jackSpacing > 0
      ? [
          row("Common difference", len(j.difference), { hl: true, sub: "each jack is this much shorter than the last" }),
          row("Cheek cut", `plumb line, saw at ${fmtAng(j.cheekBevel, 0)}`, { sub: `shows as ${fmtAng(j.topEdgeAngle)} to the edge on the top` }),
        ]
      : [row("Jack rafters", "enter a rafter spacing")];

    const jackTable = j.list.length
      ? `<section class="card"><h3>Jack rafter lengths</h3><p class="note">Measured from the corner along the wall plate. Lengths include the overhang and take off half the hip thickness. Same for valley jacks, measured from the valley.</p>
         <table><thead><tr><th>#</th><th>From corner</th><th>Line length</th><th>Cut length</th></tr></thead><tbody>
         ${j.list.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(len(x.position))}</td><td>${esc(len(x.lineLength))}</td><td>${esc(len(x.length))}</td></tr>`).join("")}
         </tbody></table></section>`
      : "";

    return `
      ${warnings(r.warnings)}
      <div class="cards">
        ${group("Pitch", pitchRows)}
        ${group("Common rafter", commonRows)}
      </div>
      ${figure(D.commonRafterDiagram(r, unit), `Common rafter. The dashed measuring line runs through the heel of the birdsmouth. ${unitNote()}`)}
      <div class="cards">
        ${group("Birdsmouth", birdRows)}
        ${figure(D.birdsmouthDiagram(r, unit), `Birdsmouth on the wall plate. ${unitNote()}`)}
      </div>
      <div class="cards">
        ${group("Hip & valley rafters", hipRows, "For a regular roof: every slope at the same pitch, hips and valleys at 45° in plan. A valley rafter uses the same lengths and angles.")}
        ${group("Jack rafters", jackRows)}
      </div>
      <div class="cards">
        ${figure(D.hipPlanDiagram(r, unit), `Plan of a hipped end. Dashed outline is the eaves overhang. ${unitNote()}`)}
        ${figure(D.hipElevationDiagram(r, unit), `Hip rafter true length. ${unitNote()}`)}
      </div>
      <div class="cards">
        ${figure(D.backingDiagram(r, unit), "Section through the hip, showing the backing bevels.")}
        ${jackTable}
      </div>`;
  },

  dovetail(v) {
    const d = calcDovetail({ ...v, ratio: Number(v.ratio), tails: Math.round(v.tails) });
    const positions = d.tipEdges
      .map(
        (e, i) =>
          `<tr><td>${i + 1}</td><td>${esc(len(e[0]))} – ${esc(len(e[1]))}</td><td>${esc(len(d.baseEdges[i][0]))} – ${esc(len(d.baseEdges[i][1]))}</td></tr>`
      )
      .join("");
    const ok = d.tailWide > 0 && d.tailNarrow > 0;
    return `
      ${warnings(d.warnings)}
      <div class="cards">
        ${group("Dovetail", [
          row("Slope", `1:${d.input.ratio}`),
          row("Angle", fmtAng(d.angle, 2), { hl: true, sub: "from square; set your bevel gauge to this" }),
          row("Offset per side", len(d.spread), { sub: "tail side moves this much over the tail length" }),
          row("Tail width at the end", len(d.tailWide), { hl: true }),
          row("Tail width at baseline", len(d.tailNarrow)),
          row("Pin width, narrow / wide", `${len(d.pinNarrow)} / ${len(d.pinWide)}`),
          row("Half pin, narrow / wide", `${len(d.halfPinNarrow)} / ${len(d.halfPinWide)}`),
          row("Tails / pins", `${d.input.tails} tails, ${d.input.tails - 1} pins + 2 half pins`),
          row("Tail length (baseline on tail board)", len(d.tailLength), { sub: "= pin board thickness" }),
          row("Pin length (baseline on pin board)", len(d.pinLength), { sub: "= tail board thickness" }),
        ])}
        <section class="card"><h3>Marking out the tails</h3>
          <p class="note">Distances from the left edge of the tail board. Mark the end positions on the end of the board, then square the baseline positions across at the tail length, and join them.</p>
          <table><thead><tr><th>Tail</th><th>At the end</th><th>At the baseline</th></tr></thead><tbody>${positions}</tbody></table>
        </section>
      </div>
      ${ok ? figure(D.dovetailTailDiagram(d, unit), `Tail board face. Hatched areas are waste. ${unitNote()}`) : ""}
      ${ok ? figure(D.dovetailPinDiagram(d, unit), `Pin board end grain: pins left solid, sockets for the tails hatched. Transfer these from the cut tails. ${unitNote()}`) : ""}`;
  },

  mortise(v) {
    const m = calcMortiseTenon({ ...v, unit });
    return `
      ${warnings(m.warnings)}
      <div class="cards">
        ${group("Tenon", [
          row("Ideal thickness (⅓ rail)", len(m.idealThickness)),
          row("Tenon thickness", len(m.thickness), { hl: true, sub: "rounded to the nearest chisel size" }),
          row("Cheek (each side)", len(m.cheek)),
          row("Tenon width", len(m.width)),
          row("Tenon length", len(m.length), { hl: true, sub: v.through ? "through: full stile width" : "stopped: about ⅔ of the stile width" }),
        ])}
        ${group("Mortise", [
          row("Mortise width", len(m.mortiseWidth), { sub: "chisel size" }),
          row("Mortise length", len(m.mortiseLength)),
          row("Mortise depth", len(m.mortiseDepth), { hl: true, sub: v.through ? "through" : "a little deeper than the tenon, for glue" }),
        ])}
      </div>
      ${figure(D.mortiseTenonDiagram(m, unit), `Left: rail and stile, tenon shown dashed inside the stile. Right: end of the rail. ${unitNote()}`)}`;
  },

  box(v) {
    const b = calcBoxJoint(v);
    const rows = b.positions.map((p, i) => `<tr><td>${i + 1}</td><td>${i % 2 ? "B" : "A"}</td><td>${esc(len(p[0]))} – ${esc(len(p[1]))}</td></tr>`).join("");
    return `
      <div class="cards">
        ${group("Box joint", [
          row("Number of fingers", String(b.count), { hl: true, sub: "odd, so both edges are on board A" }),
          row("Finger width", len(b.finger), { hl: true }),
          row("Finger depth", len(b.depth), { sub: "= board thickness (add a hair to sand flush)" }),
          row("Board A / board B", `${b.boardA} / ${b.boardB} fingers`),
        ])}
        <section class="card"><h3>Finger positions</h3><table><thead><tr><th>#</th><th>Board</th><th>From the edge</th></tr></thead><tbody>${rows}</tbody></table></section>
      </div>
      ${figure(D.boxJointDiagram(b, unit), `The two boards pulled apart. ${unitNote()}`)}`;
  },

  mitre(v) {
    const m = calcMitre({ ...v, sides: Math.round(v.sides) });
    return `
      <div class="cards">
        ${group("Saw settings", [
          row("Mitre (saw table)", fmtAng(m.mitre, 2), { hl: true, sub: "from square across the board" }),
          row("Bevel (blade tilt)", fmtAng(m.bevel, 2), { hl: true, sub: "from upright" }),
          row("Flat frame mitre", fmtAng(m.flatMitre, 2), { sub: "for comparison, sides lying flat" }),
          row("Corner angle in plan", fmtAng(m.cornerAngle, 2)),
          row("Side tilt from upright", fmtAng(m.tilt, 2)),
        ], "Board flat on the saw table, cut with the face down. Check on scrap first: saws differ in which way they read.")}
      </div>
      ${figure(D.mitreDiagram(m), "Left: the frame in plan. Right: the cut seen from above (mitre) and from the end (bevel).")}`;
  },
};

// ------------------------------------------------------------ wiring
function update(section) {
  const form = section.querySelector("form");
  const out = section.querySelector(".output");
  try {
    out.innerHTML = renderers[section.dataset.calc](readForm(form));
  } catch (e) {
    out.innerHTML = `<div class="warnings" role="alert"><p>⚠ ${esc(e.message)}</p></div>`;
  }
}

function setUnitLabels() {
  document.querySelectorAll(".u").forEach((el) => (el.textContent = `(${unit === "mm" ? "mm" : "in"})`));
}

function convertInputs(from, to) {
  if (from === to) return;
  document.querySelectorAll("input[data-len]").forEach((el) => {
    if (el.value === "") return;
    // untouched defaults switch to the other unit's sensible default
    if (el.value === el.dataset[from]) {
      el.value = el.dataset[to];
      return;
    }
    const v = Number(el.value);
    el.value = to === "in" ? String(Math.round((v / 25.4) * 16) / 16) : String(Math.round(v * 25.4));
  });
}

const sections = [...document.querySelectorAll(".calc")];

function showTab() {
  const id = (location.hash || "#roof").slice(1);
  const target = sections.find((s) => s.dataset.calc === id) ? id : "roof";
  sections.forEach((s) => (s.hidden = s.dataset.calc !== target));
  document.querySelectorAll(".tabs a").forEach((a) => a.setAttribute("aria-current", a.dataset.tab === target ? "page" : "false"));
}

for (const s of sections) {
  const form = s.querySelector("form");
  form.addEventListener("input", () => update(s));
  form.addEventListener("submit", (e) => e.preventDefault());
}

document.querySelectorAll('input[name="unit"]').forEach((el) => {
  el.checked = el.value === unit;
  el.addEventListener("change", () => {
    const next = el.value;
    convertInputs(unit, next);
    unit = next;
    store.set("unit", unit);
    setUnitLabels();
    sections.forEach(update);
  });
});

if (unit === "in") convertInputs("mm", "in");
setUnitLabels();
window.addEventListener("hashchange", showTab);
showTab();
sections.forEach(update);
