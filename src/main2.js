import renderClock from "./ui/clock.js";
import { getTodayEvents } from "./data/calendar.js";

alert("main.js loaded");
console.log("✅ main.js loaded");


const els = {
  clock: document.querySelector("#clock"),
  legend: document.querySelector("#legend"),
  twelve: document.querySelector("#twelve"),
  refresh: document.querySelector("#refresh"),
  icsUrl: document.querySelector("#ics-url"),
};

let state = { twelve: false, events: [], icsUrl: "" };

async function load() {
  console.log("[load] Called with state.icsUrl =", state.icsUrl);

  if (!state.icsUrl) {
    console.warn("[load] No ICS URL set → clearing events");
    state.events = [];
    return;
  }

  console.log("[load] Calling getTodayEvents()...");
  const apiEvents = await getTodayEvents(state.icsUrl);
  console.log("[load] getTodayEvents returned", apiEvents.length, "events");
  console.table(apiEvents);
  state.events = apiEvents; // always replace
}

function render() {
  console.log("[render] Rendering", state.events.length, "events");
  renderClock({ mount: els.clock, events: state.events, twelve: state.twelve, now: new Date() });

  if (!state.events.length) {
    els.legend.innerHTML = "<div>No events today.</div>";
    return;
  }

  els.legend.innerHTML = state.events
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .map(
      (e, i) =>
        `<div class="row">
          <span class="swatch" style="background: hsl(${(i * 47) % 360} 70% 50%)"></span>
          ${fmt(e.start)}–${fmt(e.end)} — ${e.summary ?? "(busy)"}
        </div>`
    )
    .join("");
}

const fmt = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

els.twelve.addEventListener("change", (e) => {
  console.log("[twelve change] New value =", e.target.checked);
  state.twelve = e.target.checked;
  render();
});

els.refresh.addEventListener("click", async () => {
  console.log("[refresh click] Fired");
  console.log("[refresh click] Current ICS URL input value =", els.icsUrl?.value);

  state.icsUrl = els.icsUrl?.value?.trim();
  console.log("[refresh click] Trimmed ICS URL =", state.icsUrl);

  await load();
  console.log("[refresh click] State after load =", state);
  render();
});

// Initial blank render
console.log("[init] Starting empty render");
render();

// Keep updating clock hand every minute
setInterval(() => {
  console.log("[interval] Updating clock hand only");
  render();
}, 60_000);
