// Activities Lab — Strava proxy Worker.
// Holds your Strava credentials as secrets, refreshes the 6-hour access token on
// each call, and returns your recent activities as JSON. The PWA maps runs into
// its local runLogs. Nothing is stored except the (rotating) refresh token in KV.

interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
}

interface Env {
  STRAVA_CLIENT_ID: string
  STRAVA_CLIENT_SECRET: string
  STRAVA_REFRESH_TOKEN: string // seed value; the live one is kept in KV
  TOKENS: KVNamespace
  ALLOW_ORIGIN?: string // your PWA origin, e.g. https://activities-lab.pages.dev
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_at: number
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const cors: Record<string, string> = {
      'access-control-allow-origin': env.ALLOW_ORIGIN || '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type',
    }
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

    try {
      // 1) Refresh the short-lived access token. Strava may rotate the refresh
      //    token, so persist the newest one in KV.
      const refresh = (await env.TOKENS.get('refresh')) ?? env.STRAVA_REFRESH_TOKEN
      const tok = (await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          client_id: env.STRAVA_CLIENT_ID,
          client_secret: env.STRAVA_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: refresh,
        }),
      }).then((r) => r.json())) as TokenResponse

      if (!tok.access_token) {
        return new Response(JSON.stringify({ error: 'token refresh failed', detail: tok }), {
          status: 502,
          headers: { ...cors, 'content-type': 'application/json' },
        })
      }
      if (tok.refresh_token && tok.refresh_token !== refresh) {
        await env.TOKENS.put('refresh', tok.refresh_token)
      }

      // 2) Fetch recent activities.
      const url = new URL(req.url)
      const perPage = url.searchParams.get('per_page') ?? '30'
      const actRes = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?per_page=${encodeURIComponent(perPage)}`,
        { headers: { authorization: `Bearer ${tok.access_token}` } },
      )
      if (!actRes.ok) {
        // Surface the real upstream status (e.g. 429 rate limit) instead of a 200
        // error object that would look like a bad Worker URL to the app.
        return new Response(
          JSON.stringify({ error: 'strava activities failed', status: actRes.status, detail: await actRes.text() }),
          { status: 502, headers: { ...cors, 'content-type': 'application/json' } },
        )
      }
      const activities = await actRes.json()

      return new Response(JSON.stringify(activities), {
        headers: { ...cors, 'content-type': 'application/json' },
      })
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), {
        status: 502,
        headers: { ...cors, 'content-type': 'application/json' },
      })
    }
  },
}
