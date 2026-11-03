// Joinery maths. Pure functions, unit-agnostic lengths, angles in degrees.

import { toDeg, toRad } from "./roofing.js";

/**
 * Through dovetail layout.
 *
 *  width               width of the boards (along the joint)
 *  pinBoardThickness   thickness of the pin board = length of the tails
 *  tailBoardThickness  thickness of the tail board = length of the pins
 *  ratio               slope as 1:n (n = 6 softwood, 8 hardwood, 7 in between)
 *  tails               number of whole tails
 *  pinWidth            width of each full pin at its narrow end
 *  halfPinWidth        width of each half pin at its narrow end
 *
 * The narrow end of a pin sits at the end of the tail board (the tail tips),
 * where the tails are widest. Positions are measured from one edge.
 */
export function calcDovetail(input) {
  const { width, pinBoardThickness, tailBoardThickness, ratio, tails, pinWidth, halfPinWidth } = input;
  if (!(width > 0)) throw new RangeError("Board width must be greater than 0.");
  if (!(ratio > 0)) throw new RangeError("Slope ratio must be greater than 0.");
  if (!(tails >= 1) || !Number.isInteger(tails)) throw new RangeError("Number of tails must be a whole number of 1 or more.");
  if (!(pinBoardThickness > 0)) throw new RangeError("Pin board thickness must be greater than 0.");

  const warnings = [];
  const angle = toDeg(Math.atan(1 / ratio));
  const L = pinBoardThickness; // tail length
  const spread = L / ratio; // each side of a tail moves in by this much from tip to baseline

  const tailWide = (width - 2 * halfPinWidth - (tails - 1) * pinWidth) / tails;
  const tailNarrow = tailWide - 2 * spread;
  const pinWide = pinWidth + 2 * spread;
  const halfPinWide = halfPinWidth + spread;

  if (tailWide <= 0) {
    warnings.push("The pins take up the whole board. Use fewer tails or narrower pins.");
  } else if (tailNarrow <= 0) {
    warnings.push("The tails come to a point before the baseline. Use fewer tails, narrower pins, or a steeper ratio.");
  }
  if (ratio < 5 || ratio > 9) {
    warnings.push("Ratios outside 1:5 to 1:9 are unusual. Steep slopes chip easily, shallow ones hold poorly.");
  }
  if (pinWidth < 0 || halfPinWidth < 0) warnings.push("Pin widths cannot be negative.");

  // Edge positions along the width, at the tail tips and at the baseline.
  const tipEdges = [];
  const baseEdges = [];
  let x = halfPinWidth;
  for (let i = 0; i < tails; i++) {
    tipEdges.push([x, x + tailWide]);
    baseEdges.push([x + spread, x + tailWide - spread]);
    x += tailWide + pinWidth;
  }

  return {
    input: { ...input },
    angle,
    spread,
    tailLength: L,
    pinLength: tailBoardThickness,
    tailWide,
    tailNarrow,
    pinNarrow: pinWidth,
    pinWide,
    halfPinNarrow: halfPinWidth,
    halfPinWide,
    pins: tails + 1,
    tipEdges,
    baseEdges,
    warnings,
  };
}

/** Common chisel sizes, used to round the tenon thickness to something you can cut. */
export const CHISELS_MM = [3, 4, 5, 6, 8, 10, 12, 13, 15, 16, 18, 19, 20, 22, 25, 32];
export const CHISELS_IN = [1 / 8, 3 / 16, 1 / 4, 5 / 16, 3 / 8, 7 / 16, 1 / 2, 5 / 8, 3 / 4, 7 / 8, 1, 1.25];

function nearest(list, v) {
  return list.reduce((best, c) => (Math.abs(c - v) < Math.abs(best - v) ? c : best), list[0]);
}

/**
 * Mortise and tenon, by the usual rules of thumb:
 *  - tenon thickness about 1/3 of the rail thickness, rounded to a chisel size
 *  - stopped tenon about 2/3 of the way into the mortised piece; through = all the way
 *  - mortise a little deeper than the tenon is long, for glue and debris
 *  - a tenon wider than about 5x its thickness should be split in two
 */
export function calcMortiseTenon(input) {
  const { railThickness, railWidth, stileWidth, through = false, edgeShoulder = 0, unit = "mm" } = input;
  if (!(railThickness > 0 && railWidth > 0 && stileWidth > 0)) {
    throw new RangeError("Rail thickness, rail width and stile width must all be greater than 0.");
  }
  const warnings = [];
  const ideal = railThickness / 3;
  const chisels = unit === "in" ? CHISELS_IN : CHISELS_MM;
  const thickness = nearest(chisels.filter((c) => c < railThickness), ideal) ?? ideal;
  const cheek = (railThickness - thickness) / 2;
  const length = through ? stileWidth : (stileWidth * 2) / 3;
  const clearance = unit === "in" ? 1 / 16 : 2;
  const mortiseDepth = through ? stileWidth : Math.min(stileWidth, length + clearance);
  const width = railWidth - 2 * edgeShoulder;

  if (width <= 0) warnings.push("The edge shoulders are wider than the rail.");
  if (width > 5 * thickness) {
    warnings.push("The tenon is more than 5 times as wide as it is thick. Consider a twin (split) tenon so the mortise does not weaken the stile.");
  }
  if (!through && stileWidth - mortiseDepth < railThickness / 6) {
    warnings.push("Very little wood is left behind the mortise. Consider a through tenon.");
  }

  return {
    input: { ...input },
    idealThickness: ideal,
    thickness,
    cheek,
    length,
    width,
    mortiseDepth,
    mortiseLength: width,
    mortiseWidth: thickness,
    warnings,
  };
}

/**
 * Box (finger) joint. Picks an odd number of fingers so both edges get a
 * finger on the same board, and stretches the finger width to fit exactly.
 */
export function calcBoxJoint(input) {
  const { width, targetFinger, thickness } = input;
  if (!(width > 0 && targetFinger > 0)) throw new RangeError("Width and finger size must be greater than 0.");
  let count = Math.max(1, Math.round(width / targetFinger));
  if (count % 2 === 0) {
    // choose the odd neighbour whose finger width is closest to the target
    const lo = count - 1;
    const hi = count + 1;
    count = lo >= 1 && Math.abs(width / lo - targetFinger) <= Math.abs(width / hi - targetFinger) ? lo : hi;
  }
  const finger = width / count;
  const positions = [];
  for (let i = 0; i < count; i++) positions.push([i * finger, (i + 1) * finger]);
  return {
    input: { ...input },
    count,
    finger,
    depth: thickness,
    boardA: Math.ceil(count / 2),
    boardB: Math.floor(count / 2),
    positions,
    warnings: [],
  };
}

/**
 * Mitre and compound mitre for an n-sided frame or box.
 *  sides     number of sides (4 = square box)
 *  slopeDeg  angle of each side from horizontal (0 = flat picture frame,
 *            90 = upright box sides, 45 = splayed hopper)
 * Saw settings assume the board lies flat on the saw table, with the mitre
 * measured from square across the board and the bevel measured from upright.
 */
export function calcMitre(input) {
  const { sides, slopeDeg } = input;
  if (!(sides >= 3) || !Number.isInteger(sides)) throw new RangeError("A frame needs a whole number of sides, 3 or more.");
  if (!(slopeDeg >= 0 && slopeDeg <= 90)) throw new RangeError("Side angle must be between 0 and 90 degrees.");
  const half = 180 / sides; // half the corner turn in plan = flat-frame mitre angle
  const s = toRad(slopeDeg);
  const h = toRad(half);
  const mitre = toDeg(Math.atan(Math.cos(s) * Math.tan(h)));
  const bevel = toDeg(Math.asin(Math.sin(s) * Math.sin(h)));
  const cornerAngle = 180 - 360 / sides; // interior angle of the polygon in plan
  return {
    input: { ...input },
    flatMitre: half,
    mitre,
    bevel,
    cornerAngle,
    tilt: 90 - slopeDeg, // tilt of the side from upright
    warnings: [],
  };
}
