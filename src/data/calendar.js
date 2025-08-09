// Replace with your private ICS URL from Google Calendar
// Google Calendar → Settings → Integrate calendar → "Secret address in iCal format"
const ICS_URL = "";

export async function getTodayEvents() {
  const res = await fetch(ICS_URL);
  if (!res.ok) throw new Error("Failed to fetch calendar");
  const icsText = await res.text();

  return parseICSToday(icsText);
}

function parseICSToday(ics) {
  const events = [];
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const blocks = ics.split("BEGIN:VEVENT").slice(1);
  for (const block of blocks) {
    const summaryMatch = block.match(/SUMMARY:(.+)/);
    const dtStartMatch = block.match(/DTSTART(?:;[^:]+)?:([0-9T]+)/);
    const dtEndMatch = block.match(/DTEND(?:;[^:]+)?:([0-9T]+)/);

    if (!dtStartMatch || !dtEndMatch) continue;

    const start = parseICSDate(dtStartMatch[1]);
    const end = parseICSDate(dtEndMatch[1]);

    // Filter to events that touch today
    if (end >= startOfDay && start <= endOfDay) {
      events.push({
        summary: summaryMatch ? summaryMatch[1] : "(busy)",
        start: start.toISOString(),
        end: end.toISOString(),
        allDay: dtStartMatch[1].length === 8 // YYYYMMDD
      });
    }
  }
  return events;
}

function parseICSDate(str) {
  // Handles YYYYMMDD or YYYYMMDDTHHmmssZ
  if (str.includes("T")) {
    const year = parseInt(str.slice(0, 4));
    const month = parseInt(str.slice(4, 6)) - 1;
    const day = parseInt(str.slice(6, 8));
    const hour = parseInt(str.slice(9, 11));
    const min = parseInt(str.slice(11, 13));
    const sec = parseInt(str.slice(13, 15));
    return new Date(Date.UTC(year, month, day, hour, min, sec));
  } else {
    // All-day event
    const year = parseInt(str.slice(0, 4));
    const month = parseInt(str.slice(4, 6)) - 1;
    const day = parseInt(str.slice(6, 8));
    return new Date(year, month, day);
  }
}
