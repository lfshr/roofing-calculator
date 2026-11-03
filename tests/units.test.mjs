import { test } from "node:test";
import assert from "node:assert/strict";
import { inchFraction, feetInches, fmtLen } from "../js/units.js";

test("inch fractions", () => {
  assert.equal(inchFraction(3.4375), "3 7/16");
  assert.equal(inchFraction(0.5), "1/2");
  assert.equal(inchFraction(2), "2");
  assert.equal(feetInches(63.4375), `5' 3 7/16"`);
  assert.equal(feetInches(144.1875), `12' 0 3/16"`);
  assert.equal(fmtLen(1234.4, "mm"), "1234 mm");
  assert.equal(fmtLen(52.5, "mm"), "52.5 mm");
});
