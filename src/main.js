import renderClock from "./ui/clock.js";
import { getTodayEvents } from "./data/calendar.js";

const els = {
  clock: document.querySelector("#clock"),
  legend: document.querySelector("#legend"),
  twelve: document.querySelector("#twelve"),
  refresh: document.querySelector("#refresh"),
  icsUrl: document.querySelector("#ics-url"),
};

let state = { twelve: false, events: [], icsUrl: "" };

async function load() {
  if (!state.icsUrl) {
    state.events = [];
    return;
  }
  const apiEvents = await getTodayEvents(state.icsUrl);
  state.events = apiEvents; // always replace, even if empty
}

function render() {
  renderClock({ mount: els.clock, events: state.events, twelve: state.twelve, now: new Date() });

  if (!state.events.length) {
    els.legend.innerHTML = "<div>No events today.</div>";
    return;
  }

  els.legend.innerHTML = state.events
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .map(
      (e, i) =>
        `<div class="row"><span class="swatch" style="background: hsl(${(i * 47) % 360} 70% 50%)"></span>${fmt(e.start)}–${fmt(e.end)} — ${e.summary ?? "(busy)"}</div>`
    )
    .join("");
}

const fmt = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

els.twelve.addEventListener("change", (e) => {
  state.twelve = e.target.checked;
  render();
});

els.refresh.addEventListener("click", async () => {
  state.icsUrl = els.icsUrl.value.trim();
  await load();
  render();
});

// Start with empty clock
render();

// Keep updating clock hand
setInterval(render, 60_000);
