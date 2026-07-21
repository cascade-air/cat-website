// Cascade Air Transport - Live Route Feed (Vercel serverless function)
// ----------------------------------------------------------------------
// This runs on Vercel's servers, never in the visitor's browser. It holds
// your FlightLinq API key safely (as an environment variable, set in the
// Vercel dashboard - never typed into this file) and hands back the
// current route list as JSON.
//
// The webpage calls this at:  /api/routes

export default async function handler(req, res) {
  const apiKey = process.env.FLIGHTLINQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "FLIGHTLINQ_API_KEY is not set. Add it in Vercel > Project > Settings > Environment Variables."
    });
  }

  try {
    const flResponse = await fetch(
      "https://api.flightlinq.com/api/v1/external/routes/map",
      { headers: { "x-api-key": apiKey } }
    );

    if (!flResponse.ok) {
      const detail = await flResponse.text();
      return res.status(flResponse.status).json({
        error: "FlightLinq returned an error.",
        detail,
      });
    }

    const routes = await flResponse.json();

    // Cache at the edge for 5 minutes - route lists don't change minute
    // to minute, and this keeps us well within FlightLinq's rate limits.
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
    return res.status(200).json(routes);
  } catch (err) {
    return res.status(502).json({
      error: "Could not reach FlightLinq.",
      detail: String(err),
    });
  }
}
