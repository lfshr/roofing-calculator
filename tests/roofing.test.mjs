import { test } from "node:test";
import assert from "node:assert/strict";
import { calcRoof, pitchToDegrees, pitchForms } from "../js/roofing.js";

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test("pitch conversions", () => {
  close(pitchToDegrees(12, "in12"), 45);
  close(pitchToDegrees(100, "percent"), 45);
  close(pitchToDegrees(6, "in12"), 26.56505117707799);
  const f = pitchForms(45);
  close(f.in12, 12);
  close(f.percent, 100);
  close(f.oneIn, 1);
});

test("45 degree common rafter", () => {
  const r = calcRoof({ pitchDeg: 45, run: 1000 });
  close(r.common.rise, 1000);
  close(r.common.lineLength, 1000 * Math.SQRT2);
  close(r.common.pitchFactor, Math.SQRT2);
  close(r.common.plumbCutToEdge, 45);
});

test("3-4-5 roof: run 4000, rise 3000", () => {
  const pitch = (Math.atan(3 / 4) * 180) / Math.PI; // 36.87 degrees
  const r = calcRoof({ pitchDeg: pitch, run: 4000, overhang: 400, ridgeThickness: 50 });
  close(r.common.rise, 3000);
  close(r.common.lineLength, 5000);
  close(r.common.ridgeReduction, 25 / 0.8);
  close(r.common.overhangLength, 500);
  close(r.common.rafterLength, 5000 - 31.25 + 500);
});

test("birdsmouth", () => {
  const pitch = (Math.atan(3 / 4) * 180) / Math.PI;
  const r = calcRoof({ pitchDeg: pitch, run: 4000, rafterDepth: 200, seatLength: 80 });
  close(r.birdsmouth.plumbHeight, 60);
  close(r.birdsmouth.depth, 48); // 80 * 0.6
  close(r.birdsmouth.verticalDepth, 250);
  close(r.birdsmouth.heightAbovePlate, 190);
  close(r.birdsmouth.ridgeTopHeight, 3190);
  assert.equal(r.warnings.length, 0);
  const deep = calcRoof({ pitchDeg: pitch, run: 4000, rafterDepth: 100, seatLength: 80 });
  assert.ok(deep.warnings.some((w) => w.includes("1/3")));
});

test("regular hip at 45 degree pitch: known 35.26 hip pitch, 30 degree backing", () => {
  const r = calcRoof({ pitchDeg: 45, run: 1000, hipThickness: 50 });
  close(r.hip.run, 1000 * Math.SQRT2);
  close(r.hip.pitch, 35.264389682754654);
  close(r.hip.lineLength, Math.sqrt(3) * 1000);
  close(r.hip.backingAngle, 30, 1e-9);
  close(r.hip.drop, 25 * Math.tan(Math.atan(1 / Math.SQRT2)));
});

test("jack rafters", () => {
  const pitch = (Math.atan(3 / 4) * 180) / Math.PI;
  const r = calcRoof({ pitchDeg: pitch, run: 2000, jackSpacing: 400 });
  close(r.jack.difference, 500);
  assert.equal(r.jack.list.length, 4);
  close(r.jack.list[0].lineLength, 500);
  close(r.jack.list[3].lineLength, 2000);
});

test("rejects bad input", () => {
  assert.throws(() => calcRoof({ pitchDeg: 0, run: 100 }));
  assert.throws(() => calcRoof({ pitchDeg: 90, run: 100 }));
  assert.throws(() => calcRoof({ pitchDeg: 30, run: 0 }));
});
