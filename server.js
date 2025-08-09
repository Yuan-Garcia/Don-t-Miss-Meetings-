import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = 8080;

// Serve frontend files
app.use(express.static("public")); // replace with your frontend folder name

// Proxy route to fetch ICS file
app.get("/calendar-proxy", async (req, res) => {
  const calendarUrl = req.query.url;
  if (!calendarUrl) {
    return res.status(400).send("Missing 'url' parameter");
  }

  try {
    const response = await fetch(calendarUrl);
    if (!response.ok) {
      throw new Error(`Calendar fetch failed: ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    res.setHeader("Content-Type", "text/calendar");
    res.send(text);
  } catch (err) {
    console.error("[Proxy Error]", err);
    res.status(500).send(err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
