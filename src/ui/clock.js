import { DAY_MIN, minsToAngle, toMinutes } from "../lib/time.js";

const COLORS = ["#4f46e5","#22c55e","#ef4444","#06b6d4","#f59e0b","#a855f7","#10b981","#f97316"];
const RADIUS = 160, THICK = 34, PAD = 8, TICK_MIN = 30;

const polar = (cx, cy, r, angDeg) => {
  const a = (Math.PI / 180) * angDeg;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

const ringSlice = (cx, cy, rOuter, thickness, a0, a1) => {
  const rInner = rOuter - thickness;
  const [x0, y0] = polar(cx, cy, rOuter, a0);
  const [x1, y1] = polar(cx, cy, rOuter, a1);
  const [x2, y2] = polar(cx, cy, rInner, a1);
  const [x3, y3] = polar(cx, cy, rInner, a0);
  const large = (Math.abs(a1 - a0) % 360) > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${rOuter} ${rOuter} 0 ${large} 1 ${x1} ${y1}
          L ${x2} ${y2} A ${rInner} ${rInner} 0 ${large} 0 ${x3} ${y3} Z`;
};

export default function renderClock({ mount, events, twelve = false, now = new Date() }) {
  const cycle = twelve ? 12 * 60 : DAY_MIN;
  const size = (RADIUS + THICK + PAD) * 2;
  const cx = size / 2, cy = size / 2;

  const ticks = [];
  for (let m = 0; m < cycle; m += TICK_MIN) {
    const a = minsToAngle(m, cycle);
    const [x0, y0] = polar(cx, cy, RADIUS + PAD + THICK + 2, a);
    const [x1, y1] = polar(cx, cy, RADIUS + PAD + THICK + 10, a);
    ticks.push(`<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="currentColor" stroke-width="1" opacity=".35" />`);
  }

  const paths = events.map((ev, i) => {
    const sm = twelve ? (toMinutes(new Date(ev.start)) % cycle + cycle) % cycle : toMinutes(new Date(ev.start));
    const em = twelve ? (toMinutes(new Date(ev.end)) % cycle + cycle) % cycle : toMinutes(new Date(ev.end));
    const a0 = minsToAngle(sm, cycle);
    let a1 = minsToAngle(em, cycle);
    while (a1 <= a0) a1 += 360;
    const color = COLORS[i % COLORS.length];
    return `<path d="${ringSlice(cx, cy, RADIUS + PAD + THICK, THICK, a0, a1)}" fill="${color}" fill-opacity=".65" />`;
  }).join("");

  const nowM = twelve ? (toMinutes(now) % cycle + cycle) % cycle : toMinutes(now);
  const aNow = minsToAngle(nowM, cycle);
  const [nx0,ny0] = polar(cx, cy, RADIUS + PAD + THICK + 12, aNow);
  const [nx1,ny1] = polar(cx, cy, RADIUS - THICK - 6, aNow);
  const hand = `<line x1="${nx0}" y1="${ny0}" x2="${nx1}" y2="${ny1}" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />`;

  mount.innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Calendar clock">
      ${ticks.join("")}
      <circle cx="${cx}" cy="${cy}" r="${RADIUS}" fill="none" stroke="currentColor" stroke-opacity=".15" stroke-width="1.5"/>
      ${paths}
      ${hand}
    </svg>
  `;
}
