const els = {
  canvas: document.getElementById("clock"),
  legend: document.getElementById("legend"),
  loadBtn: document.getElementById("load"),
  icsInput: document.getElementById("ics-url"),
  twelveCheck: document.getElementById("twelve"),
};

const ctx = els.canvas.getContext("2d");

const COLORS = [
  "#7c9cff", "#5eead4", "#f472b6", "#facc15",
  "#fb923c", "#60a5fa", "#34d399", "#f87171"
];

let state = {
  events: [],
  twelveHour: false
};

const R = 280; // base radius
let cx = 0, cy = 0;

function scaleCanvas(cnv, ctx) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const w = cnv.clientWidth;
  const h = cnv.clientHeight;
  if (!w || !h) return;
  cnv.width = Math.round(w * dpr);
  cnv.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx = w / 2;
  cy = h / 2;
}
scaleCanvas(els.canvas, ctx);
window.addEventListener("resize", () => { scaleCanvas(els.canvas, ctx); render(); });

function deg2rad(deg) {
  return deg * Math.PI / 180;
}

function timeToAngle(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return ((hours % 12) * 30 + minutes / 2) * Math.PI / 180;
}

function drawFace() {
  ctx.clearRect(0, 0, els.canvas.clientWidth, els.canvas.clientHeight);

  ctx.save();
  ctx.translate(cx, cy);

  // Outer background
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fillStyle = "#13151c";
  ctx.fill();

  // Ticks
  for (let i = 0; i < 60; i++) {
    ctx.save();
    ctx.rotate(deg2rad(i * 6));
    ctx.beginPath();
    ctx.moveTo(0, -R);
    ctx.lineTo(0, i % 5 === 0 ? -R + 20 : -R + 10);
    ctx.strokeStyle = i % 5 === 0 ? "#e7eaf3" : "rgba(135,145,170,0.7)";
    ctx.lineWidth = i % 5 === 0 ? 3 : 1;
    ctx.stroke();
    ctx.restore();
  }

  // Roman numerals
  const numerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]   ;
  ctx.fillStyle = "#e7eaf3";
  ctx.font = "28px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  numerals.forEach((num, i) => {
    const angle = deg2rad(i * 30 - 60);
    const x = Math.cos(angle) * (R - 50);
    const y = Math.sin(angle) * (R - 50);
    ctx.fillText(num, x, y);
  });

  ctx.restore();
}

function drawEvents() {
  const ringOuter = R - 8;
  const ringThick = 18;

  ctx.save();
  ctx.translate(cx, cy);

  state.events.forEach((ev, i) => {
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    const a0 = timeToAngle(start) - Math.PI / 2;
    const a1 = timeToAngle(end) - Math.PI / 2;

    ctx.save();
    ctx.shadowColor = "rgba(124,156,255,0.45)";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, ringOuter, a0, a1);
    ctx.lineWidth = ringThick;
    ctx.strokeStyle = COLORS[i % COLORS.length];
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
  });

  ctx.restore();
}

function lineFromCenter(angle, length, width, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle - Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -length);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

function drawHands() {
  const now = new Date();
  const ha = ((now.getHours() % 12) * 30 + now.getMinutes() / 2) * Math.PI / 180;
  const ma = now.getMinutes() * 6 * Math.PI / 180;

  lineFromCenter(ha, R * 0.48, 8, "#e7eaf3"); // hour
  lineFromCenter(ma, R * 0.78, 5, "#e7eaf3"); // minute

  // Hub
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#e7eaf3";
  ctx.fill();
}

function renderLegend() {
  const now = new Date();
  const events = state.events.slice()
    .sort((a, b) => new Date(a.start) - new Date(b.start));

  let current = null, next = null;
  for (const ev of events) {
    const s = new Date(ev.start), e = new Date(ev.end);
    if (!current && s <= now && e > now) current = ev;
    if (!next && s > now) { next = ev; break; }
  }

  const fmt = (d) =>
    new Date(d).toLocaleTimeString([], {
      hour: "2-digit", minute: "2-digit", hour12: state.twelveHour
    });

  const mins = (ms) => Math.max(0, Math.round(ms / 60000));

  if (current) {
    const left = mins(new Date(current.end) - now);
    els.legend.innerHTML = `
      <div class="card">
        <div class="eyebrow">Now<span class="badge">${left} min left</span></div>
        <div class="title">${current.summary || "(busy)"}</div>
        <div class="meta">${fmt(current.start)} – ${fmt(current.end)}</div>
      </div>`;
    return;
  }

  if (next) {
    const until = mins(new Date(next.start) - now);
    els.legend.innerHTML = `
      <div class="card">
        <div class="eyebrow">Next event<span class="badge">in ${until} min</span></div>
        <div class="title">${next.summary || "(busy)"}</div>
        <div class="meta">Starts ${fmt(next.start)}</div>
      </div>`;
    return;
  }

  els.legend.innerHTML = ""; // triggers the :empty placeholder
}



function render() {
  drawFace();
  drawEvents();
  drawHands();
}

async function loadEvents() {
  const url = els.icsInput.value.trim();
  if (!url) return;
  try {
    const res = await fetch(`/api/events?url=${encodeURIComponent(url)}`);
    const data = await res.json();          // backend returns an array
    state.events = Array.isArray(data) ? data : (data.events || []);
    renderLegend();
  } catch (err) {
    console.error("Failed to load events", err);
  }
}


els.loadBtn.addEventListener("click", async () => {
  state.twelveHour = els.twelveCheck.checked;
  await loadEvents();
});

setInterval(render, 1000);
render();
