# Strava sync — setup (one time, ~10 minutes)

This Cloudflare Worker holds your Strava credentials and returns your recent
activities to the app. The app maps **runs** into its log (deduping so the same
run is never added twice). **The app works fully without this** — it's optional.

## 1. Create a Strava API application

1. Go to <https://www.strava.com/settings/api> and create an app (any name/website).
2. Set **Authorization Callback Domain** to `localhost`.
3. Note your **Client ID** and **Client Secret**.

## 2. Authorize once to get a refresh token

Open this URL in your browser (replace `YOUR_CLIENT_ID`):

```
https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost/exchange_token&approval_prompt=force&scope=activity:read_all
```

Click **Authorize**. The browser redirects to `http://localhost/exchange_token?...&code=THE_CODE&...`
(the page won't load — that's fine). Copy the **`code`** value from the address bar, then run
(PowerShell):

```powershell
curl --% -X POST https://www.strava.com/oauth/token -d client_id=YOUR_CLIENT_ID -d client_secret=YOUR_CLIENT_SECRET -d code=THE_CODE -d grant_type=authorization_code
```

From the JSON response, copy the **`refresh_token`** (long-lived — this is what you store).

## 3. Deploy the Worker

From this `workers/strava` folder:

```powershell
# create the KV namespace and paste the printed id into wrangler.jsonc (kv_namespaces[0].id)
npx wrangler kv namespace create TOKENS

# store your secrets (paste each value when prompted)
npx wrangler secret put STRAVA_CLIENT_ID
npx wrangler secret put STRAVA_CLIENT_SECRET
npx wrangler secret put STRAVA_REFRESH_TOKEN

# deploy
npx wrangler deploy
```

`wrangler deploy` prints your Worker URL, e.g. `https://activities-lab-strava.<you>.workers.dev`.

> If your app isn't at `https://activities-lab.pages.dev`, edit `ALLOW_ORIGIN` in
> `wrangler.jsonc` to your exact PWA origin and redeploy (this is the CORS allow-list).

## 4. Connect the app

In the app: **Lab → Strava** → paste the Worker URL → **Save** → tap **Sync now**.
Your runs appear in **Progress → Weekly mileage**. Re-sync any time; duplicates are skipped.

### Notes
- Scope `activity:read_all` includes private/"Only You" runs so nothing is missed.
- Rate limits (200 req/15 min, 2000/day) are far beyond a personal sync.
- The Worker stores only the rotating refresh token in KV; your secrets stay as Worker secrets.
