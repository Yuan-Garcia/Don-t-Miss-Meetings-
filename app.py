from pathlib import Path
from datetime import datetime, timezone
import os, re, requests
from flask import Flask, render_template, request, jsonify, send_from_directory

# ----- Resolve absolute folders next to this file -----
BASE = Path(__file__).parent.resolve()
TPL  = BASE / "templates"
STC  = BASE / "static"

app = Flask(
    __name__,
    template_folder=str(TPL),
    static_folder=str(STC),
)

@app.route("/")
def index():
    # If render_template fails, fall back to sending the file directly so we
    # can prove the path is correct.
    try:
        return render_template("index.html")
    except Exception as e:
        print("render_template failed ->", repr(e))
        # Fallback: send the raw file so you can see whether the path is right.
        if (TPL / "index.html").exists():
            return send_from_directory(str(TPL), "index.html")
        raise

# Quick endpoint to return what paths Flask is using
@app.get("/_debug/where")
def where():
    return {
        "cwd": os.getcwd(),
        "BASE": str(BASE),
        "template_folder": app.template_folder,
        "static_folder": app.static_folder,
        "templates_exists": TPL.exists(),
        "index_exists": (TPL / "index.html").exists(),
        "templates_listing": [p.name for p in TPL.iterdir()],
    }

# --------- (unchanged) ICS -> today's events API ----------
@app.get("/api/events")
def api_events():
    ics_url = (request.args.get("url") or "").strip()
    if not ics_url:
        return jsonify({"error": "Missing ICS URL"}), 400
    try:
        r = requests.get(ics_url, headers={"User-Agent": "CalendarClock/1.0"}, timeout=15)
        r.raise_for_status()
        return jsonify(parse_ics_today(r.text))
    except Exception as e:
        app.logger.exception("ICS fetch/parse failed")
        return jsonify({"error": str(e)}), 500

def parse_ics_today(ics_text: str):
    now = datetime.now()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end   = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    events = []
    for blk in ics_text.split("BEGIN:VEVENT")[1:]:
        blk = blk.split("END:VEVENT", 1)[0]
        summary = _m(blk, r"^SUMMARY:(.*)$") or "(busy)"
        s_raw = _m(blk, r"^DTSTART[^:]*:(.+)$")
        e_raw = _m(blk, r"^DTEND[^:]*:(.+)$")
        if not s_raw or not e_raw: continue
        s_dt = _parse(s_raw); e_dt = _parse(e_raw)
        if not s_dt or not e_dt: continue
        if e_dt >= start and s_dt <= end:
            events.append({"summary": summary.strip(), "start": s_dt.isoformat(), "end": e_dt.isoformat(), "allDay": len(s_raw)==8})
    return events

def _m(text, pat):
    m = re.search(pat, text, re.MULTILINE); return m.group(1).strip() if m else None

def _parse(s: str):
    try:
        if len(s)==8 and s.isdigit(): return datetime.strptime(s, "%Y%m%d")
        if s.endswith("Z"):
            return datetime.strptime(s, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc).astimezone().replace(tzinfo=None)
        return datetime.strptime(s, "%Y%m%dT%H%M%S")
    except: return None

if __name__ == "__main__":
    # IMPORTANT: run from the folder that contains app.py
    #   python app.py
    app.run(host="0.0.0.0", port=8080, debug=True)
