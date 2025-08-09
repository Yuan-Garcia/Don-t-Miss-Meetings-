import renderClock from "./ui/clock.js";
import { getTodayEvents } from "./data/calendar.js";

const els = {
  clock: document.querySelector("#clock"),
  legend: document.querySelector("#legend"),
  twelve: document.querySelector("#twelve"),
  refresh: document.querySelector("#refresh"),
  signin: document.querySelector("#signin"),
  signout: document.querySelector("#signout"),
};

let state = { twelve: false, events: getTodayEvents };

function render() {
  renderClock({ mount: els.clock, events: state.events, twelve: state.twelve, now: new Date() });
  els.legend.innerHTML = state.events
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .map((e, i) => `<div class="row"><span class="swatch" style="background: hsl(${(i*47)%360} 70% 50%)"></span>${fmt(e.start)}–${fmt(e.end)} — ${e.summary ?? "(busy)"}</div>`)
    .join("") || "<div>No events today.</div>";
}

const fmt = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

els.twelve.addEventListener("change", (e) => { state.twelve = e.target.checked; render(); });
els.refresh.addEventListener("click", async () => { await load(); render(); });

async function load() {
  const api = await getTodayEvents();
  if (api.length) state.events = api;
}

render();
setInterval(render, 60_000);
