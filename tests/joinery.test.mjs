import { test } from "node:test";
import assert from "node:assert/strict";
import { calcDovetail, calcMortiseTenon, calcBoxJoint, calcMitre } from "../js/joinery.js";

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test("dovetail layout adds up to the board width", () => {
  const d = calcDovetail({ width: 150, pinBoardThickness: 16, tailBoardThickness: 18, ratio: 8, tails: 4, pinWidth: 6, halfPinWidth: 8 });
  close(d.angle, 7.125016348901798);
  close(d.spread, 2);
  close(d.tailWide, (150 - 16 - 18) / 4);
  close(d.tailNarrow, d.tailWide - 4);
  close(d.pinWide, 10);
  const total = 2 * d.halfPinNarrow + 4 * d.tailWide + 3 * d.pinNarrow;
  close(total, 150);
  close(d.tipEdges[3][1], 150 - 8);
  close(d.baseEdges[0][0], 10);
  assert.equal(d.pins, 5);
  assert.equal(d.warnings.length, 0);
});

test("dovetail warns when tails vanish", () => {
  const d = calcDovetail({ width: 50, pinBoardThickness: 40, tailBoardThickness: 18, ratio: 5, tails: 4, pinWidth: 6, halfPinWidth: 6 });
  assert.ok(d.warnings.length > 0);
});

test("mortise and tenon rules of thumb", () => {
  const m = calcMortiseTenon({ railThickness: 21, railWidth: 70, stileWidth: 70, edgeShoulder: 10 });
  assert.equal(m.thickness, 6); // 21/3 = 7 -> nearest chisel (6 and 8 tie; first wins)
  close(m.cheek, 7.5);
  close(m.length, 70 * 2 / 3);
  close(m.mortiseDepth, 70 * 2 / 3 + 2);
  close(m.width, 50);
  const t = calcMortiseTenon({ railThickness: 0.75, railWidth: 3, stileWidth: 2, through: true, unit: "in" });
  assert.equal(t.thickness, 1 / 4);
  close(t.length, 2);
});

test("box joint uses an odd number of fingers", () => {
  const b = calcBoxJoint({ width: 100, targetFinger: 10, thickness: 12 });
  assert.equal(b.count % 2, 1);
  close(b.finger * b.count, 100);
  assert.equal(b.boardA, (b.count + 1) / 2);
});

test("compound mitre: known 4-sided 45 degree hopper is 35.26 / 30", () => {
  const m = calcMitre({ sides: 4, slopeDeg: 45 });
  close(m.mitre, 35.264389682754654);
  close(m.bevel, 30, 1e-9);
  const flat = calcMitre({ sides: 4, slopeDeg: 0 });
  close(flat.mitre, 45);
  close(flat.bevel, 0);
  const upright = calcMitre({ sides: 6, slopeDeg: 90 });
  close(upright.mitre, 0, 1e-9);
  close(upright.bevel, 30, 1e-9);
});
