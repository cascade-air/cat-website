// Cascade Air Transport - Live Feed Intake
// -------------------------------------------
// Your console app POSTs new radio calls here while you fly. Protected
// by a shared secret so nobody else can push fake data onto the site.
//
// Expects a POST body like:
// {
//   "secret": "your-secret-here",
//   "callsign": "N14904",
//   "calls": [
//     {
//       "stamp_zulu": "2026-07-21T20:14:00Z",
//       "station_name": "Spokane Tower",
//       "outgoing_message": "Spokane Tower, N14904 ready for departure",
//       "incoming_message": "N14904, Spokane Tower, runway 21, cleared for takeoff",
//       "lat": 47.6199,
//       "lon": -117.5335
//     }
//   ]
// }

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const FEED_KEY = "live_feed:current";
const MAX_ENTRIES = 20;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST." });
  }

  const { secret, callsign, calls } = req.body || {};

  if (!process.env.LIVE_FEED_SECRET) {
    return res.status(500).json({
      error: "LIVE_FEED_SECRET is not set on the server. Add it in Vercel > Settings > Environment Variables.",
    });
  }

  if (secret !== process.env.LIVE_FEED_SECRET) {
    return res.status(401).json({ error: "Invalid secret." });
  }

  if (!Array.isArray(calls) || calls.length === 0) {
    return res.status(400).json({ error: "No calls provided." });
  }

  try {
    const existingRaw = await redis.get(FEED_KEY);
    const existing = Array.isArray(existingRaw) ? existingRaw : [];

    const combined = [...existing, ...calls.map((c) => ({ ...c, callsign: callsign || "" }))];

    // Keep only the most recent entries so the feed doesn't grow forever.
    const trimmed = combined.slice(-MAX_ENTRIES);

    await redis.set(FEED_KEY, trimmed);

    return res.status(200).json({ ok: true, stored: trimmed.length });
  } catch (err) {
    return res.status(502).json({ error: "Could not store the feed.", detail: String(err) });
  }
}
