# Push notifications — setup (one time, ~10 minutes)

A Cloudflare Worker holds your VAPID keys and your push subscription; a Cron Trigger
sends your enabled reminders + one rotating motivation line on schedule. **Optional** —
the app works fully without it, and shows the same nudges in-app.

> **iPhone:** Web Push only works for an **installed** PWA on **iOS 16.4+**. Add the app to
> your Home Screen and open it from that icon before enabling notifications.

## 1. Generate VAPID keys (one time)

```powershell
npx web-push generate-vapid-keys --json
```

Copy the `publicKey` and `privateKey` from the output.

## 2. Deploy the Worker

From this `workers/push` folder:

```powershell
npm install

# create the KV namespace and paste the printed id into wrangler.jsonc (kv_namespaces[0].id)
npx wrangler kv namespace create SUBS

# secrets (paste each value when prompted)
npx wrangler secret put VAPID_PUBLIC_KEY      # the publicKey from step 1
npx wrangler secret put VAPID_PRIVATE_KEY     # the privateKey from step 1
npx wrangler secret put VAPID_SUBJECT         # e.g. mailto:you@example.com

npx wrangler deploy
```

`wrangler deploy` prints your Worker URL, e.g. `https://activities-lab-push.<you>.workers.dev`.

> If your app isn't at `https://activities-lab.pages.dev`, edit `ALLOW_ORIGIN` in
> `wrangler.jsonc` to your exact PWA origin and redeploy.

## 3. Connect the app (on your iPhone, from the Home Screen app)

1. **Lab → Notifications** → paste the **Worker URL** and the **VAPID public key** → **Enable notifications**.
2. Allow the permission prompt.
3. Edit your **Reminders** (toggle / time / text) and **Motivation lines** — changes re-sync to the Worker automatically.

### Test it
```powershell
curl -X POST https://activities-lab-push.<you>.workers.dev/test
```
You should get a "Test notification" on your phone within a few seconds.

### Notes
- The cron runs every 5 minutes and sends reminders due in that window (so any reminder time works).
- The daily motivation line is sent at 09:00 local time (change `MOTIVATION_HOUR` in `src/index.ts`).
- Free tier covers this easily (100k requests/day, up to 5 cron triggers).
- The Worker stores only your subscription + schedule in KV; VAPID keys stay as Worker secrets.
