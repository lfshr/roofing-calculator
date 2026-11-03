// SVG diagrams for every calculator. Each function takes a result object
// from roofing.js / joinery.js plus the unit, and returns an SVG string.

import { Plot } from "./svg.js";
import { fmtLenShort as L, fmtAng as A } from "./units.js";
import { toRad } from "./roofing.js";

// ---------------------------------------------------------------- roofing

/** Side elevation of one common rafter: plate, birdsmouth, ridge, overhang. */
export function commonRafterDiagram(r, unit) {
  const { pitchDeg, run: R, overhang: O = 0, ridgeThickness: rt = 0 } = r.input;
  const p = toRad(pitchDeg);
  const tan = Math.tan(p);
  const cos = Math.cos(p);
  const D = r.input.rafterDepth > 0 ? r.input.rafterDepth : R * 0.05;
  const S = r.input.seatLength > 0 ? r.input.seatLength : 0;
  const rise = r.common.rise;
  const plateW = S > 0 ? S : D * 0.7;
  const plateH = D * 0.35;
  const bottom = (x) => (x - S) * tan; // underside of the rafter
  const top = (x) => bottom(x) + D / cos;
  const xr = R - rt / 2; // ridge-side plumb cut
  const ridgeW = Math.max(rt, R * 0.008);

  const minX = -O - R * 0.04;
  const maxX = R + ridgeW / 2 + R * 0.04;
  const minY = Math.min(bottom(-O), -plateH * 4);
  const maxY = top(xr) + D * 0.3;
  const plot = new Plot({ bounds: [minX, minY, maxX, maxY], pad: [56, 70, 70, 56], title: "Common rafter side elevation" });

  // wall & plate
  plot.rect(0, -plateH * 4, plateW, -plateH, "d-wall");
  plot.rect(0, -plateH, plateW, 0, "d-wood2");
  // ridge board
  plot.rect(R - ridgeW / 2, top(xr) - D / cos - D * 0.4, R + ridgeW / 2, top(xr), "d-wood2");
  // rafter
  const pts = [
    [-O, bottom(-O)],
    [-O, top(-O)],
    [xr, top(xr)],
    [xr, bottom(xr)],
  ];
  if (S > 0) pts.push([S, 0], [0, 0], [0, bottom(0)]);
  plot.poly(pts, "d-wood");
  // measuring line (through the birdsmouth heel)
  plot.line([-O, -O * tan], [R, rise], "d-measure");
  plot.line([R, -plateH * 4], [R, top(xr) + D * 0.3], "d-centre");
  plot.line([0, 0], [R, 0], "d-measure");

  // dimensions
  const yb = -plateH * 4;
  plot.dim([0, yb], [R, yb], `run ${L(R, unit)}`, -22);
  if (O > 0) plot.dim([-O, yb], [0, yb], `overhang ${L(O, unit)}`, -22);
  plot.dim([R, 0], [R, rise], `rise ${L(rise, unit)}`, -40);
  plot.dim([0, 0], [R, rise], `line length ${L(r.common.lineLength, unit)}`, -16, { textOff: 12 });
  plot.dim([-O, top(-O)], [xr, top(xr)], `rafter length ${L(r.common.rafterLength, unit)}`, 26);
  // angles
  plot.angle([0, 0], 0, pitchDeg, 70, A(pitchDeg), { labelR: 90 });
  plot.angle([xr, top(xr)], 180 + pitchDeg, 270, 34, `plumb ${A(r.common.plumbCutToEdge)}`, { labelR: 48, anchor: "end" });
  plot.note([R, top(xr) - D * 0.6 / cos], "ridge", 22, -10);
  if (O > 0) plot.note([-O, (bottom(-O) + top(-O)) / 2], "tail plumb cut", -6, -34, "middle");
  plot.note([plateW / 2, -plateH * 2.5], "wall plate", 30, 6);
  return plot.toString();
}

/** Close-up of the birdsmouth on the wall plate. */
export function birdsmouthDiagram(r, unit) {
  const { pitchDeg } = r.input;
  const p = toRad(pitchDeg);
  const tan = Math.tan(p);
  const cos = Math.cos(p);
  const sin = Math.sin(p);
  const D = r.input.rafterDepth;
  const S = r.input.seatLength;
  if (!(D > 0 && S > 0)) {
    return `<p class="diagram-empty">Enter a rafter depth and seat length to see the birdsmouth.</p>`;
  }
  const bottom = (x) => (x - S) * tan;
  const top = (x) => bottom(x) + D / cos;
  const plateH = D * 0.45;
  const x0 = -D * 0.5;
  const x1 = S + D * 1.1;
  const y0 = -plateH * 1.8;
  const y1 = top(S) + D * 0.15;
  const plot = new Plot({ bounds: [x0, y0, x1, y1], width: 460, pad: [20, 20, 40, 120], clip: true, maxHeight: 420, title: "Birdsmouth detail" });

  plot.rect(0, y0 - D, S, -plateH, "d-wall");
  plot.rect(0, -plateH, S, 0, "d-wood2");
  plot.poly(
    [
      [x0 - D, bottom(x0 - D)],
      [x0 - D, top(x0 - D)],
      [x1 + D, top(x1 + D)],
      [x1 + D, bottom(x1 + D)],
      [S, 0],
      [0, 0],
      [0, bottom(0)],
    ],
    "d-wood"
  );
  // notch outline highlight
  plot.path([[0, bottom(0)], [0, 0], [S, 0]], "d-cut");

  const hap = r.birdsmouth.heightAbovePlate;
  plot.dim([0, y0], [S, y0], `seat ${L(S, unit)}`, -16, { ext: false });
  plot.line([0, 0], [0, y0], "d-ext", true);
  plot.line([S, 0], [S, y0], "d-ext", true);
  plot.dim([0, bottom(0)], [0, 0], `plumb ${L(r.birdsmouth.plumbHeight, unit)}`, 24);
  plot.dim([0, 0], [0, hap], `HAP ${L(hap, unit)}`, 70);
  // notch depth, square to the rafter
  const foot = [S - S * cos * cos, -S * cos * sin];
  plot.line(foot, [0, 0], "d-measure", true);
  plot.note([(foot[0]) / 2, foot[1] / 2], `notch ${L(r.birdsmouth.depth, unit)} (max ${L(r.birdsmouth.maxDepth, unit)})`, 30, 40, "start");
  // rafter depth
  const xm = S + D * 0.55;
  const bpt = [xm, bottom(xm)];
  const tpt = [xm - D * sin, bottom(xm) + D * cos];
  plot.dim(bpt, tpt, `depth ${L(D, unit)}`, -18);
  plot.line([S, 0], [S + D * 0.45, 0], "d-ext", true);
  plot.angle([S, 0], 0, pitchDeg, 44, `seat ${A(r.common.seatCutToEdge)}`, { labelR: 52, anchor: "start" });
  plot.text([S / 2, -plateH * 1.4], "plate", { cls: "d-label" });
  return plot.toString();
}

/** Plan of a hipped end: hips, ridge, commons and jack rafters. */
export function hipPlanDiagram(r, unit) {
  const R = r.input.run;
  const O = r.input.overhang || 0;
  const s = r.input.jackSpacing || 0;
  const W = 2 * R;
  const Lp = W + R * 1.4;
  const plot = new Plot({ bounds: [-O, -O, Lp, W + O], width: 460, pad: [30, 20, 40, 70], maxHeight: 420, title: "Hipped roof plan" });

  plot.rect(-O, -O, Lp, W + O, "d-eaves");
  plot.rect(0, 0, Lp, W, "d-plan");
  // jacks
  if (s > 0 && R / s <= 40) {
    for (const j of r.jack.list) {
      const k = j.position;
      plot.line([k, 0], [k, k], "d-jack");
      plot.line([k, W], [k, W - k], "d-jack");
      plot.line([0, k], [k, k], "d-jack");
      plot.line([0, W - k], [k, W - k], "d-jack");
    }
    // side commons
    for (let x = R + s; x < Lp - 1e-6; x += s) {
      plot.line([x, 0], [x, R], "d-jack");
      plot.line([x, W], [x, R], "d-jack");
    }
  }
  plot.line([0, R], [R, R], "d-common");
  plot.line([R, 0], [R, W], "d-common");
  plot.line([0, 0], [R, R], "d-hip");
  plot.line([0, W], [R, R], "d-hip");
  plot.line([R, R], [Lp, R], "d-ridge");
  plot.line([Lp, -O], [Lp, W + O], "d-break");

  plot.dim([0, 0], [0, W], `span ${L(W, unit)}`, 40);
  plot.dim([0, R], [R, R], `run ${L(R, unit)}`, 12);
  plot.dim([0, 0], [R, R], `hip run ${L(r.hip.run, unit)}`, -14);
  if (s > 0 && r.jack.list.length) plot.dim([0, 0], [s, 0], `${L(s, unit)}`, -16);
  plot.note([R * 0.7, R * 0.7], "hip", 30, 18);
  plot.note([R * 0.7, W - R * 0.7], "hip", 30, -18);
  plot.note([R + (Lp - R) * 0.6, R], "ridge", 0, -24, "middle");
  if (s > 0 && r.jack.list.length) plot.note([r.jack.list[0].position, r.jack.list[0].position * 0.5], "jack", 28, 10);
  plot.note([R, W * 0.15], "common", 26, 0);
  return plot.toString();
}

/** True length of the hip: plan run vs rise. */
export function hipElevationDiagram(r, unit) {
  const hr = r.hip.run;
  const rise = r.hip.rise;
  const plot = new Plot({ bounds: [0, 0, hr, rise], width: 460, pad: [40, 60, 50, 20], maxHeight: 320, title: "Hip rafter true length" });
  plot.poly([[0, 0], [hr, 0], [hr, rise]], "d-tri");
  plot.dim([0, 0], [hr, 0], `hip run ${L(hr, unit)}`, -22);
  plot.dim([hr, 0], [hr, rise], `rise ${L(rise, unit)}`, -24);
  plot.dim([0, 0], [hr, rise], `hip line length ${L(r.hip.lineLength, unit)}`, 20);
  plot.angle([0, 0], 0, r.hip.pitch, 60, `hip pitch ${A(r.hip.pitch)}`, { labelR: 74, anchor: "start" });
  plot.angle([hr, rise], 180 + r.hip.pitch, 270, 32, `plumb ${A(r.hip.plumbCutToEdge)}`, { labelR: 46, anchor: "end" });
  return plot.toString();
}

/** Cross-section of the hip showing the backing bevels. */
export function backingDiagram(r, unit) {
  const t = r.input.hipThickness > 0 ? r.input.hipThickness : 50;
  const depth = (r.input.rafterDepth > 0 ? r.input.rafterDepth : t * 3) * 1.15;
  const b = toRad(r.hip.backingAngle);
  const h = (t / 2) * Math.tan(b); // height of the bevel at the edges
  const plot = new Plot({ bounds: [-t * 1.6, -depth * 0.25, t * 1.6, depth + t * 0.6], width: 460, pad: [30, 110, 30, 110], maxHeight: 260, title: "Hip backing section" });
  plot.poly([[-t / 2, 0], [t / 2, 0], [t / 2, depth - h], [0, depth], [-t / 2, depth - h]], "d-wood");
  plot.path([[-t / 2, depth], [t / 2, depth]], "d-measure", true);
  plot.line([0, depth], [-t * 1.6, depth - t * 1.6 * Math.tan(b)], "d-plane");
  plot.line([0, depth], [t * 1.6, depth - t * 1.6 * Math.tan(b)], "d-plane");
  plot.angle([0, depth], 180 + 0, 180 + r.hip.backingAngle, 40, `backing ${A(r.hip.backingAngle)}`, { labelR: 60, anchor: "end" });
  plot.dim([-t / 2, 0], [t / 2, 0], `${L(t, unit)}`, -16);
  plot.text([t * 1.15, depth - t * 0.9], "roof planes", { cls: "d-label", anchor: "start" });
  return plot.toString();
}

// ---------------------------------------------------------------- joinery

/** Face of the tail board, with the tails marked out. */
export function dovetailTailDiagram(d, unit) {
  const W = d.input.width;
  const Lt = d.tailLength;
  const below = Math.max(Lt * 1.4, W * 0.18);
  const plot = new Plot({ bounds: [0, -below, W, Lt], pad: [70, 90, 30, 40], maxHeight: 400, title: "Tail board layout" });
  plot.rect(0, -below, W, Lt, "d-wood");
  // waste between tails (pin sockets) and half-pin sockets at the edges
  const tips = d.tipEdges;
  const bases = d.baseEdges;
  const waste = [];
  waste.push([[0, Lt], [tips[0][0], Lt], [bases[0][0], 0], [0, 0]]);
  for (let i = 0; i < tips.length - 1; i++) {
    waste.push([[tips[i][1], Lt], [tips[i + 1][0], Lt], [bases[i + 1][0], 0], [bases[i][1], 0]]);
  }
  const n = tips.length - 1;
  waste.push([[tips[n][1], Lt], [W, Lt], [W, 0], [bases[n][1], 0]]);
  for (const w of waste) plot.poly(w, "d-waste");
  plot.line([0, 0], [W, 0], "d-baseline");
  for (let i = 0; i < tips.length; i++) {
    plot.line([tips[i][0], Lt], [bases[i][0], 0], "d-cutline");
    plot.line([tips[i][1], Lt], [bases[i][1], 0], "d-cutline");
  }

  plot.dim([0, Lt], [W, Lt], `board width ${L(W, unit)}`, 40);
  plot.dim([tips[0][0], Lt], [tips[0][1], Lt], L(d.tailWide, unit), 14, { textOff: 9 });
  plot.dim([0, Lt], [tips[0][0], Lt], L(d.halfPinNarrow, unit), 14, { textOff: 9 });
  if (tips.length > 1) plot.dim([tips[0][1], Lt], [tips[1][0], Lt], L(d.pinNarrow, unit), 14, { textOff: 9 });
  plot.dim([bases[0][0], 0], [bases[0][1], 0], L(d.tailNarrow, unit), -18, { textOff: 9 });
  plot.dim([W, 0], [W, Lt], `tail length ${L(Lt, unit)}`, -24);
  // slope angle on the first tail's left side, measured from the board edge direction (vertical)
  // slope angle on the last tail's right side, measured from the board edge direction
  plot.line([tips[n][1], Lt], [tips[n][1], -Lt * 0.9], "d-ext", true);
  plot.angle([tips[n][1], Lt], 270 - d.angle, 270, 60, `1:${d.input.ratio} = ${A(d.angle, 2)}`, { labelR: 72, anchor: "end" });
  plot.text([W / 2, -below * 0.55], "tail board (face)", { cls: "d-label" });
  return plot.toString();
}

/** End grain of the pin board, with the pins marked out. */
export function dovetailPinDiagram(d, unit) {
  const W = d.input.width;
  const T = d.tailLength; // pin board thickness
  const plot = new Plot({ bounds: [0, 0, W, T], pad: [40, 90, 50, 40], maxHeight: 220, title: "Pin board end grain" });
  plot.rect(0, 0, W, T, "d-wood");
  const tips = d.tipEdges;
  const bases = d.baseEdges;
  // Sockets (where tails go) are waste on the pin board. Narrow face of the pins on top.
  for (let i = 0; i < tips.length; i++) {
    plot.poly([[tips[i][0], T], [tips[i][1], T], [bases[i][1], 0], [bases[i][0], 0]], "d-waste");
  }
  plot.dim([0, T], [tips[0][0], T], L(d.halfPinNarrow, unit), 14, { textOff: 9 });
  if (tips.length > 1) plot.dim([tips[0][1], T], [tips[1][0], T], `${L(d.pinNarrow, unit)} narrow`, 14, { textOff: 9 });
  if (tips.length > 1) plot.dim([bases[0][1], 0], [bases[1][0], 0], `${L(d.pinWide, unit)} wide`, -16, { textOff: 9 });
  plot.dim([W, 0], [W, T], `${L(T, unit)}`, -24);
  return plot.toString();
}

/** Mortise and tenon: side elevation plus the end of the rail. */
export function mortiseTenonDiagram(m, unit) {
  const { railThickness: T, railWidth: Wr, stileWidth: Ws } = m.input;
  const es = m.input.edgeShoulder || 0;
  const railLen = Math.max(Ws * 1.8, Wr * 1.6);
  const stileH = Wr * 2.4;
  const gap = Math.max(Ws, Wr) * 0.9;
  // end view of the rail sits to the right
  const ex = Ws + railLen + gap;
  const plot = new Plot({ bounds: [0, 0, ex + T, stileH], pad: [50, 60, 50, 50], maxHeight: 420, title: "Mortise and tenon" });
  const y0 = (stileH - Wr) / 2;
  // stile
  plot.rect(0, 0, Ws, stileH, "d-wood2");
  // rail
  plot.rect(Ws, y0, Ws + railLen, y0 + Wr, "d-wood");
  // tenon (hidden, inside the stile)
  plot.rect(Ws - m.length, y0 + es, Ws, y0 + Wr - es, "d-hiddenfill");
  // mortise depth line
  plot.line([Ws - m.mortiseDepth, y0 + es], [Ws - m.mortiseDepth, y0 + Wr - es], "d-hidden");
  plot.dim([Ws - m.length, y0], [Ws, y0], `tenon ${L(m.length, unit)}`, -22);
  plot.dim([Ws, y0 + es], [Ws, y0 + Wr - es], `width ${L(m.width, unit)}`, 0, { ext: false, textOff: -14 });
  plot.dim([0, 0], [Ws, 0], `stile ${L(Ws, unit)}`, -18);
  plot.dim([Ws + railLen, y0], [Ws + railLen, y0 + Wr], `rail ${L(Wr, unit)}`, -22);
  plot.text([Ws / 2, stileH * 0.93], "stile", { cls: "d-label" });
  plot.text([Ws + railLen * 0.6, y0 + Wr / 2], "rail", { cls: "d-label" });

  // end view of the rail: thickness x width with the tenon in the middle
  plot.rect(ex, y0, ex + T, y0 + Wr, "d-wood");
  const c = (T - m.thickness) / 2;
  plot.rect(ex + c, y0 + es, ex + c + m.thickness, y0 + Wr - es, "d-tenon");
  plot.dim([ex + c, y0 + Wr], [ex + c + m.thickness, y0 + Wr], L(m.thickness, unit), 18, { textOff: 9 });
  plot.dim([ex, y0], [ex + T, y0], `${L(T, unit)}`, -18, { textOff: 9 });
  if (es > 0) plot.dim([ex + T, y0 + Wr - es], [ex + T, y0 + Wr], L(es, unit), -14, { textOff: 10 });
  plot.text([ex + T / 2, y0 - Wr * 0.35], "rail end", { cls: "d-label" });
  return plot.toString();
}

/** Box joint: the two boards pulled apart. */
export function boxJointDiagram(b, unit) {
  const W = b.input.width;
  const t = b.input.thickness > 0 ? b.input.thickness : W * 0.1;
  const gap = t * 1.2;
  const body = Math.max(t * 2, W * 0.25);
  const plot = new Plot({ bounds: [0, -body - t, W, gap + t + body], pad: [50, 40, 50, 40], maxHeight: 380, title: "Box joint" });
  // board A (top), fingers pointing down; board B (bottom), fingers pointing up
  const yA = gap + t; // A's shoulder line
  plot.rect(0, yA, W, yA + body, "d-wood");
  plot.rect(0, -t - body, W, -t, "d-wood2");
  for (let i = 0; i < b.count; i++) {
    const [a, c] = b.positions[i];
    if (i % 2 === 0) plot.rect(a, yA - t, c, yA, "d-wood");
    else plot.rect(a, -t, c, 0, "d-wood2");
  }
  plot.dim([0, yA + body], [W, yA + body], `width ${L(W, unit)}`, 18);
  plot.dim([b.positions[0][0], yA - t], [b.positions[0][1], yA - t], L(b.finger, unit), -16, { textOff: 9 });
  plot.dim([W, yA - t], [W, yA], `${L(t, unit)}`, -20);
  plot.text([W / 2, yA + body / 2], `board A: ${b.boardA} fingers`, { cls: "d-label" });
  plot.text([W / 2, -t - body / 2], `board B: ${b.boardB} fingers`, { cls: "d-label" });
  return plot.toString();
}

/** Mitre: the frame in plan, plus saw settings. */
export function mitreDiagram(m) {
  const n = m.input.sides;
  const Rr = 1;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 - Math.PI / n + (2 * Math.PI * i) / n;
    pts.push([Rr * Math.cos(a), Rr * Math.sin(a)]);
  }
  const inner = pts.map(([x, y]) => [x * 0.72, y * 0.72]);
  // saw views to the right
  const ox = 1.6;
  const plot = new Plot({ bounds: [-1.15, -1.15, ox + 2.6, 1.15], pad: [40, 30, 40, 30], maxHeight: 360, title: "Mitre settings" });
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    plot.poly([pts[i], pts[j], inner[j], inner[i]], i % 2 ? "d-wood2" : "d-wood");
  }
  // mitre angle at the bottom-left corner of the flat frame (between the
  // side and the mitre line)
  const c = pts[0];
  const along = (Math.atan2(pts[1][1] - c[1], pts[1][0] - c[0]) * 180) / Math.PI;
  const toInner = (Math.atan2(inner[0][1] - c[1], inner[0][0] - c[0]) * 180) / Math.PI;
  plot.angle(c, Math.min(along, toInner), Math.max(along, toInner), 30, A(90 - m.flatMitre), { labelR: 46 });
  plot.text([0, 0], `${n} sides`, { cls: "d-label" });

  // top view of the board on the saw: mitre angle from square
  const bx = ox;
  const bw = 0.5;
  const blen = 1.2;
  const ty = 0.25;
  const mt = Math.tan(toRad(m.mitre)) * bw;
  plot.poly([[bx, ty], [bx + blen, ty], [bx + blen + mt, ty + bw], [bx, ty + bw]], "d-wood");
  plot.line([bx + blen, ty], [bx + blen, ty + bw + 0.2], "d-ext");
  plot.line([bx + blen, ty], [bx + blen + mt * 1.4, ty + bw * 1.4], "d-cut");
  plot.angle([bx + blen, ty], 90 - m.mitre, 90, 40, `mitre ${A(m.mitre)}`, { labelR: 58, anchor: "start" });
  plot.text([bx + blen / 2, ty - 0.18], "top view", { cls: "d-label" });

  // end view: bevel (blade tilt) from upright
  const ex = ox + 1.75;
  const eh = 0.22;
  const ew = 0.7;
  const ey = -0.75;
  const bt = Math.tan(toRad(m.bevel)) * eh;
  plot.poly([[ex, ey], [ex + ew, ey], [ex + ew - bt, ey + eh], [ex, ey + eh]], "d-wood");
  plot.line([ex + ew, ey], [ex + ew, ey + eh + 0.5], "d-ext");
  plot.line([ex + ew, ey], [ex + ew - bt * 3.2, ey + eh * 3.2], "d-cut");
  plot.angle([ex + ew, ey], 90, 90 + m.bevel, 40, `bevel ${A(m.bevel)}`, { labelR: 56, anchor: "end" });
  plot.text([ex + ew / 2, ey - 0.16], "end view", { cls: "d-label" });
  return plot.toString();
}
