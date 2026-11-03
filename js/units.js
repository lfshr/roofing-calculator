// Formatting for lengths and angles in metric (mm) or imperial (inches).

export const UNITS = {
  mm: { label: "mm", short: "mm" },
  in: { label: "inches", short: "in" },
};

/** Nearest 1/16" as a mixed fraction, e.g. 3.4375 -> "3 7/16". */
export function inchFraction(v, denom = 16) {
  const sign = v < 0 ? "-" : "";
  let n = Math.round(Math.abs(v) * denom);
  const whole = Math.floor(n / denom);
  let num = n - whole * denom;
  let den = denom;
  while (num && num % 2 === 0) {
    num /= 2;
    den /= 2;
  }
  if (!num) return `${sign}${whole}`;
  return whole ? `${sign}${whole} ${num}/${den}` : `${sign}${num}/${den}`;
}

/** Feet and inches to the nearest 1/16", e.g. 63.44 -> 5' 3 7/16". */
export function feetInches(v) {
  const sign = v < 0 ? "-" : "";
  const sixteenths = Math.round(Math.abs(v) * 16);
  const ft = Math.floor(sixteenths / (12 * 16));
  const inches = (sixteenths - ft * 12 * 16) / 16;
  const frac = inchFraction(inches);
  return `${sign}${ft}' ${frac.includes("/") && !frac.includes(" ") ? `0 ${frac}` : frac}"`;
}

/** A length in the current unit, readable on site. */
export function fmtLen(v, unit) {
  if (!Number.isFinite(v)) return "–";
  if (unit === "in") {
    const frac = Math.abs(v) >= 24 ? feetInches(v) : `${inchFraction(v)}"`;
    return `${frac} (${v.toFixed(2)}")`;
  }
  const digits = Math.abs(v) < 100 ? 1 : 0;
  return `${trim(v.toFixed(digits))} mm`;
}

/** A shorter length string for diagram labels. */
export function fmtLenShort(v, unit) {
  if (!Number.isFinite(v)) return "–";
  if (unit === "in") return Math.abs(v) >= 24 ? feetInches(v) : `${inchFraction(v)}"`;
  const digits = Math.abs(v) < 100 ? 1 : 0;
  return `${trim(v.toFixed(digits))}`;
}

export function fmtAng(v, digits = 1) {
  if (!Number.isFinite(v)) return "–";
  return `${trim(v.toFixed(digits))}°`;
}

export function fmtNum(v, digits = 2) {
  if (!Number.isFinite(v)) return "–";
  return trim(v.toFixed(digits));
}

const trim = (s) => (s.includes(".") ? s.replace(/\.?0+$/, "") : s);
