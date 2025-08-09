// src/data/calendar.js

/**
 * Fetch today's events from a Google Calendar ICS URL
 * using the backend proxy to bypass CORS.
 * @param {string} icsUrl - The public ICS link for the calendar
 * @returns {Promise<Array>} - Array of event objects
 */
export async function getTodayEvents(icsUrl) {
  console.log("[getTodayEvents] Called with ICS URL:", icsUrl);

  if (!icsUrl || typeof icsUrl !== "string") {
    console.error("[getTodayEvents] ERROR: Invalid ICS URL");
    return [];
  }

  // Use proxy to bypass CORS
  const proxyUrl = `/calendar-proxy?url=${encodeURIComponent(icsUrl)}`;
  console.log("[getTodayEvents] Fetching via proxy:", proxyUrl);

  try {
    const r = await fetch(proxyUrl);
    if (!r.ok) {
      throw new Error(`Failed to fetch calendar: HTTP ${r.status}`);
    }

    const icsText = await r.text();
    console.log("[getTodayEvents] ICS file length:", icsText.length);

    const events = parseICSEvents(icsText);
    console.log(`[getTodayEvents] Parsed ${events.length} events:`, events);

    return filterTodayEvents(events);

  } catch (err) {
    console.error("[getTodayEvents] ERROR:", err);
    return [];
  }
}

/**
 * Parse raw ICS data into event objects.
 * @param {string} icsText - The raw ICS file text
 * @returns {Array} events
 */
function parseICSEvents(icsText) {
  console.log("[parseICSEvents] Parsing ICS text...");
  const events = [];
  const lines = icsText.split(/\r?\n/);

  let event = null;

  for (let line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      event = {};
    } else if (line.startsWith("END:VEVENT")) {
      if (event) events.push(event);
      event = null;
    } else if (event) {
      if (line.startsWith("SUMMARY:")) {
        event.summary = line.replace("SUMMARY:", "").trim();
      } else if (line.startsWith("DTSTART")) {
        event.start = parseICSDate(line);
      } else if (line.startsWith("DTEND")) {
        event.end = parseICSDate(line);
      }
    }
  }

  return events;
}

/**
 * Parse ICS date string to JS Date
 */
function parseICSDate(line) {
  const dateStr = line.split(":")[1].trim();
  // Handle YYYYMMDD or YYYYMMDDTHHMMSSZ formats
  const year = parseInt(dateStr.slice(0, 4), 10);
  const month = parseInt(dateStr.slice(4, 6), 10) - 1;
  const day = parseInt(dateStr.slice(6, 8), 10);
  if (dateStr.length > 8) {
    const hour = parseInt(dateStr.slice(9, 11), 10);
    const min = parseInt(dateStr.slice(11, 13), 10);
    return new Date(Date.UTC(year, month, day, hour, min));
  }
  return new Date(year, month, day);
}

/**
 * Filter events to only those occurring today.
 */
function filterTodayEvents(events) {
  console.log("[filterTodayEvents] Filtering events for today...");
  const today = new Date();
  return events.filter(evt => {
    return evt.start.toDateString() === today.toDateString();
  });
}
