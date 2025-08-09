from flask import Flask, render_template, request, jsonify
import requests
from icalendar import Calendar

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.get("/api/events")
def api_events():
    url = (request.args.get("url") or "").strip()
    if not url:
        return jsonify({"error": "No URL provided"}), 400
    try:
        r = requests.get(url, headers={"User-Agent": "CalendarClock/1.0"}, timeout=15)
        r.raise_for_status()
        cal = Calendar.from_ical(r.text)
        events = []
        for c in cal.walk("VEVENT"):
            start = c.get("dtstart").dt
            end   = c.get("dtend").dt
            summary = str(c.get("summary"))
            events.append({
                "summary": summary,
                "start": start.isoformat(),
                "end": end.isoformat()
            })
        return jsonify(events)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
