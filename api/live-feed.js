// Cascade Air Transport - Live Feed Read
// ------------------------------------------
// The webpage polls this every few seconds to display the latest radio
// calls and positions. Read-only, no secret needed to view it.

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const FEED_KEY = "live_feed:current";

export default async function handler(req, res) {
  try {
    const feed = await redis.get(FEED_KEY);
    res.setHeader("Cache-Control", "s-maxage=2, stale-while-revalidate=5");
    return res.status(200).json(Array.isArray(feed) ? feed : []);
  } catch (err) {
    return res.status(502).json({ error: "Could not read the feed.", detail: String(err) });
  }
}
