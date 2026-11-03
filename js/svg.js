// Tiny SVG drawing helper. Model coordinates are y-up (like a drawing on
// paper); Plot maps them to screen pixels and draws text, arrows and
// dimension lines at a constant on-screen size, whatever the model scale.

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

let uid = 0;

export class Plot {
  /**
   * @param {object} o
   * @param {number[]} o.bounds [minX, minY, maxX, maxY] in model units
   * @param {number} [o.width] screen width in px (viewBox units)
   * @param {number} [o.maxHeight] cap on screen height
   * @param {number|number[]} [o.pad] padding [top, right, bottom, left]
   * @param {boolean} [o.clip] clip drawing to the bounds (for detail views)
   * @param {string} o.title accessible title
   */
  constructor({ bounds, width = 640, maxHeight = 520, pad = 48, clip = false, title = "Diagram" }) {
    const [minX, minY, maxX, maxY] = bounds;
    const p = Array.isArray(pad) ? pad : [pad, pad, pad, pad];
    this.pad = p;
    const dx = Math.max(maxX - minX, 1e-9);
    const dy = Math.max(maxY - minY, 1e-9);
    let s = (width - p[1] - p[3]) / dx;
    if (dy * s + p[0] + p[2] > maxHeight) s = (maxHeight - p[0] - p[2]) / dy;
    this.s = s;
    this.minX = minX;
    this.maxY = maxY;
    this.width = width;
    this.height = Math.round(dy * s + p[0] + p[2]);
    // centre horizontally if height-limited
    this.ox = p[3] + (width - p[1] - p[3] - dx * s) / 2;
    this.oy = p[0];
    this.title = title;
    this.clip = clip ? { x: this.ox, y: this.oy, w: dx * s, h: dy * s } : null;
    this.body = [];
    this.top = []; // drawn above clipped content (dimensions, labels)
    this.id = `d${++uid}`;
  }

  X(x) {
    return this.ox + (x - this.minX) * this.s;
  }
  Y(y) {
    return this.oy + (this.maxY - y) * this.s;
  }
  P([x, y]) {
    return [this.X(x), this.Y(y)];
  }

  _push(el, onTop) {
    (onTop ? this.top : this.body).push(el);
    return this;
  }

  line(a, b, cls = "d-line", onTop = false) {
    const [x1, y1] = this.P(a);
    const [x2, y2] = this.P(b);
    return this._push(`<line class="${cls}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`, onTop);
  }

  poly(points, cls = "d-wood", onTop = false) {
    const pts = points.map((pt) => this.P(pt).map(f).join(",")).join(" ");
    const fill = cls.includes("d-waste") ? ` fill="url(#${this.id}-h)"` : "";
    return this._push(`<polygon class="${cls}"${fill} points="${pts}"/>`, onTop);
  }

  path(points, cls = "d-line", onTop = false) {
    const d = points.map((pt, i) => `${i ? "L" : "M"}${this.P(pt).map(f).join(" ")}`).join(" ");
    return this._push(`<path class="${cls}" d="${d}"/>`, onTop);
  }

  rect(x0, y0, x1, y1, cls = "d-wood", onTop = false) {
    return this.poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], cls, onTop);
  }

  /** Text at a model point, nudged by (dx, dy) screen px. */
  text(pt, str, { cls = "d-text", anchor = "middle", dx = 0, dy = 0, rotate = 0, onTop = true } = {}) {
    const [x, y] = this.P(pt);
    const tx = x + dx;
    const ty = y + dy;
    const rot = rotate ? ` transform="rotate(${f(rotate)} ${f(tx)} ${f(ty)})"` : "";
    return this._push(
      `<text class="${cls}" x="${f(tx)}" y="${f(ty)}" text-anchor="${anchor}" dominant-baseline="middle"${rot}>${esc(str)}</text>`,
      onTop
    );
  }

  /**
   * Dimension line between model points a and b, pushed sideways by `off`
   * screen px (positive = to the left of a->b as seen on screen).
   */
  dim(a, b, label, off = 24, { cls = "d-dim", ext = true, textOff = 11 } = {}) {
    const [ax, ay] = this.P(a);
    const [bx, by] = this.P(b);
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const ux = (bx - ax) / len;
    const uy = (by - ay) / len;
    // screen-left normal of a->b
    const nx = uy;
    const ny = -ux;
    const a2 = [ax + nx * off, ay + ny * off];
    const b2 = [bx + nx * off, by + ny * off];
    const out = [];
    if (ext && off !== 0) {
      const g = Math.sign(off) * 4;
      out.push(`<line class="d-ext" x1="${f(ax + nx * g)}" y1="${f(ay + ny * g)}" x2="${f(a2[0] + nx * g)}" y2="${f(a2[1] + ny * g)}"/>`);
      out.push(`<line class="d-ext" x1="${f(bx + nx * g)}" y1="${f(by + ny * g)}" x2="${f(b2[0] + nx * g)}" y2="${f(b2[1] + ny * g)}"/>`);
    }
    out.push(
      `<line class="${cls}" x1="${f(a2[0])}" y1="${f(a2[1])}" x2="${f(b2[0])}" y2="${f(b2[1])}" marker-start="url(#${this.id}-a)" marker-end="url(#${this.id}-a)"/>`
    );
    let ang = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
    if (ang > 90) ang -= 180;
    if (ang <= -90) ang += 180;
    // put the label on the outer side of the dimension line
    const side = off >= 0 ? 1 : -1;
    const mx = (a2[0] + b2[0]) / 2 + nx * textOff * side;
    const my = (a2[1] + b2[1]) / 2 + ny * textOff * side;
    out.push(
      `<text class="d-dimtext" x="${f(mx)}" y="${f(my)}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${f(ang)} ${f(mx)} ${f(my)})">${esc(label)}</text>`
    );
    this.top.push(...out);
    return this;
  }

  /**
   * Angle arc centred on a model point, from angle a1 to a2 (degrees,
   * counter-clockwise from +x in model space), radius r in screen px.
   */
  angle(center, a1, a2, r, label, { cls = "d-angle", labelR = r + 14, anchor = "middle" } = {}) {
    const [cx, cy] = this.P(center);
    const pt = (deg, rad) => [cx + rad * Math.cos((deg * Math.PI) / 180), cy - rad * Math.sin((deg * Math.PI) / 180)];
    const [x1, y1] = pt(a1, r);
    const [x2, y2] = pt(a2, r);
    const large = Math.abs(a2 - a1) > 180 ? 1 : 0;
    const sweep = a2 > a1 ? 0 : 1;
    this.top.push(`<path class="${cls}" d="M${f(x1)} ${f(y1)} A${f(r)} ${f(r)} 0 ${large} ${sweep} ${f(x2)} ${f(y2)}"/>`);
    if (label) {
      const [lx, ly] = pt((a1 + a2) / 2, labelR);
      this.top.push(`<text class="d-angletext" x="${f(lx)}" y="${f(ly)}" text-anchor="${anchor}" dominant-baseline="middle">${esc(label)}</text>`);
    }
    return this;
  }

  /** A short leader line from a model point to a label offset in screen px. */
  note(pt, str, dx, dy, anchor = dx >= 0 ? "start" : "end") {
    const [x, y] = this.P(pt);
    this.top.push(`<line class="d-leader" x1="${f(x)}" y1="${f(y)}" x2="${f(x + dx)}" y2="${f(y + dy)}"/>`);
    this.top.push(`<circle class="d-dot" cx="${f(x)}" cy="${f(y)}" r="2.5"/>`);
    this.top.push(
      `<text class="d-note" x="${f(x + dx + (anchor === "start" ? 4 : anchor === "end" ? -4 : 0))}" y="${f(y + dy)}" text-anchor="${anchor}" dominant-baseline="middle">${esc(str)}</text>`
    );
    return this;
  }

  toString() {
    const defs = `<defs>
  <marker id="${this.id}-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="d-arrow" d="M0,1 L10,5 L0,9 z"/></marker>
  <pattern id="${this.id}-h" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line class="d-hatchline" x1="0" y1="0" x2="0" y2="8"/></pattern>
  ${this.clip ? `<clipPath id="${this.id}-c"><rect x="${f(this.clip.x)}" y="${f(this.clip.y)}" width="${f(this.clip.w)}" height="${f(this.clip.h)}"/></clipPath>` : ""}
</defs>`;
    const body = this.body.join("");
    const g = this.clip ? `<g clip-path="url(#${this.id}-c)">${body}</g>` : body;
    return `<svg class="diagram" viewBox="0 0 ${this.width} ${this.height}" role="img" aria-label="${esc(this.title)}" xmlns="http://www.w3.org/2000/svg"><title>${esc(this.title)}</title>${defs}${g}${this.top.join("")}</svg>`;
  }
}

const f = (n) => (Math.round(n * 10) / 10).toString();
