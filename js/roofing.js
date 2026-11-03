// Roofing maths. Pure functions, unit-agnostic: every length comes back in
// whatever unit the lengths went in as (mm or inches). Angles are degrees.

export const toRad = (d) => (d * Math.PI) / 180;
export const toDeg = (r) => (r * 180) / Math.PI;

/**
 * Convert a pitch entered in one of several common forms to degrees.
 *  - "degrees": the angle itself
 *  - "in12":    rise in inches per 12 inches of run (US style, e.g. 6 = 6/12)
 *  - "percent": rise / run x 100
 */
export function pitchToDegrees(value, mode) {
  const v = Number(value);
  switch (mode) {
    case "degrees":
      return v;
    case "in12":
      return toDeg(Math.atan(v / 12));
    case "percent":
      return toDeg(Math.atan(v / 100));
    default:
      throw new Error(`Unknown pitch mode: ${mode}`);
  }
}

/** The same pitch, expressed every common way. */
export function pitchForms(pitchDeg) {
  const t = Math.tan(toRad(pitchDeg));
  return {
    degrees: pitchDeg,
    in12: t * 12,
    percent: t * 100,
    oneIn: t === 0 ? Infinity : 1 / t, // "1 in n" (run per unit of rise)
    risePerUnit: t, // rise per 1 unit of run (x1000 = mm per metre)
  };
}

/**
 * Full set of common-rafter, birdsmouth, hip/valley and jack figures for a
 * regular roof (all slopes at the same pitch, hips at 45 degrees in plan).
 *
 * Inputs (lengths all in the same unit):
 *  pitchDeg        roof pitch in degrees (0 < pitch < 90)
 *  run             horizontal run: outside of wall plate to ridge centre line
 *  overhang        horizontal eaves overhang beyond the outside of the plate
 *  ridgeThickness  ridge board thickness (rafter is shortened by half of it)
 *  rafterDepth     depth (width) of the rafter timber
 *  seatLength      horizontal bearing of the birdsmouth seat on the plate
 *  hipThickness    hip board thickness (for backing / drop)
 *  jackSpacing     rafter centres along the wall plate (for jack rafters)
 */
export function calcRoof(input) {
  const {
    pitchDeg,
    run,
    overhang = 0,
    ridgeThickness = 0,
    rafterDepth = 0,
    seatLength = 0,
    hipThickness = 0,
    jackSpacing = 0,
  } = input;

  const warnings = [];
  if (!(pitchDeg > 0 && pitchDeg < 90)) {
    throw new RangeError("Pitch must be between 0 and 90 degrees.");
  }
  if (!(run > 0)) throw new RangeError("Run must be greater than 0.");

  const a = toRad(pitchDeg);
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const tan = Math.tan(a);

  // ---- Common rafter ----------------------------------------------------
  const rise = run * tan;
  const lineLength = run / cos; // plate to ridge centre, along the slope
  const ridgeReduction = ridgeThickness / 2 / cos; // along the slope
  const overhangLength = overhang / cos; // along the slope
  const rafterLength = lineLength - ridgeReduction + overhangLength; // plumb cut to plumb cut
  const pitchFactor = 1 / cos; // slope length per unit of plan
  const span = run * 2;

  // Cut angles. Measured against the rafter's long edge.
  const plumbCutToEdge = 90 - pitchDeg;
  const seatCutToEdge = pitchDeg;

  // ---- Birdsmouth -------------------------------------------------------
  const verticalDepth = rafterDepth / cos; // rafter depth measured plumb
  const birdsmouthPlumbHeight = seatLength * tan; // height of the plumb (heel) cut
  const birdsmouthDepth = seatLength * sin; // notch depth square to the rafter edge
  const heightAbovePlate = verticalDepth - birdsmouthPlumbHeight; // "HAP"
  const ridgeTopHeight = rise + heightAbovePlate; // top of rafter at ridge centre, above plate
  if (rafterDepth > 0 && seatLength > 0 && birdsmouthDepth > rafterDepth / 3 + 1e-9) {
    warnings.push(
      "Birdsmouth notch is deeper than 1/3 of the rafter depth. Shorten the seat or use a deeper rafter."
    );
  }
  if (rafterDepth > 0 && heightAbovePlate <= 0) {
    warnings.push("The birdsmouth cuts right through the rafter. Reduce the seat length.");
  }

  // ---- Hip / valley (regular, 45 degrees in plan) -----------------------
  const hipRun = run * Math.SQRT2;
  const hipPitchRad = Math.atan(rise / hipRun);
  const hipPitch = toDeg(hipPitchRad);
  const hipCos = Math.cos(hipPitchRad);
  const hipLineLength = Math.hypot(hipRun, rise);
  // Hip framed against the end of a ridge board: its plan centre line is
  // shortened by half the ridge thickness x sqrt(2).
  const hipRidgeReduction = ((ridgeThickness / 2) * Math.SQRT2) / hipCos;
  const hipOverhangLength = (overhang * Math.SQRT2) / hipCos;
  const hipLength = hipLineLength - hipRidgeReduction + hipOverhangLength;
  const hipFactor = hipLineLength / run;
  // Backing (bevel planed on the hip's top so it lies in both roof planes).
  const backingAngle = toDeg(Math.atan(Math.sin(hipPitchRad)));
  // Alternatively drop the hip (lower the birdsmouth) by this much.
  const hipDrop = (hipThickness / 2) * Math.tan(hipPitchRad);

  // ---- Jack rafters -----------------------------------------------------
  const jackDifference = jackSpacing > 0 ? jackSpacing / cos : 0; // each jack is this much shorter
  // Cheek cut against the hip: mark a plumb line at the pitch angle and cut
  // with the saw bevelled to 45 degrees. On the top edge that cut shows as a
  // line at this angle to the rafter's long edge:
  const jackTopEdgeAngle = toDeg(Math.atan(cos));
  const hipTopEdgeAngle = toDeg(Math.atan(hipCos));

  // Jack lengths, plate-line to hip centre line, for jacks at
  // spacing, 2*spacing ... measured from the corner along the plate.
  const jacks = [];
  if (jackSpacing > 0) {
    for (let k = 1; k * jackSpacing < run - 1e-9 && jacks.length < 60; k++) {
      const jRun = k * jackSpacing; // a jack this far from the corner has this run
      jacks.push({
        position: jRun,
        run: jRun,
        lineLength: jRun / cos,
        // shortened by half the hip thickness measured square across the hip,
        // which is (t/2)*sqrt(2) along the plate, then along the slope:
        length: Math.max(0, (jRun - (hipThickness / 2) * Math.SQRT2) / cos + overhangLength),
      });
    }
  }

  return {
    input: { ...input },
    pitch: pitchForms(pitchDeg),
    common: {
      span,
      run,
      rise,
      lineLength,
      ridgeReduction,
      overhangLength,
      rafterLength,
      pitchFactor,
      plumbCutToEdge,
      seatCutToEdge,
      plumbCutSquareSetting: pitchDeg,
    },
    birdsmouth: {
      seatLength,
      plumbHeight: birdsmouthPlumbHeight,
      depth: birdsmouthDepth,
      verticalDepth,
      heightAbovePlate,
      ridgeTopHeight,
      maxDepth: rafterDepth / 3,
    },
    hip: {
      run: hipRun,
      rise,
      pitch: hipPitch,
      lineLength: hipLineLength,
      ridgeReduction: hipRidgeReduction,
      overhangLength: hipOverhangLength,
      length: hipLength,
      factor: hipFactor,
      plumbCutToEdge: 90 - hipPitch,
      seatCutToEdge: hipPitch,
      backingAngle,
      drop: hipDrop,
      topEdgeAngle: hipTopEdgeAngle,
      cheekBevel: 45,
    },
    jack: {
      spacing: jackSpacing,
      difference: jackDifference,
      topEdgeAngle: jackTopEdgeAngle,
      cheekBevel: 45,
      list: jacks,
    },
    warnings,
  };
}
