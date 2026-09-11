// Activities Lab — push notification Worker.
// Stores the user's push subscription + reminder schedule (uploaded by the PWA),
// and a Cron Trigger sends due reminders + one rotating motivation line on schedule.
// Uses the standard `web-push` library via the nodejs_compat flag.
import webpush from 'web-push'

interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}
interface Env {
  SUBS: KVNamespace
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
  VAPID_SUBJECT: string // e.g. mailto:you@example.com
  ALLOW_ORIGIN?: string
}

type PushSub = { endpoint: string; keys: { p256dh: string; auth: string } }
interface PushConfig {
  subscription: PushSub | null
  reminders: { id: number; time: string; message: string }[]
  motivation: string[]
  timeZone?: string // IANA zone (preferred — tracks DST)
  tzOffsetMinutes: number // fallback: Date.getTimezoneOffset()
}

const MOTIVATION_HOUR = 9 // local hour for the daily motivation line
const WINDOW = 5 // minutes; must match the cron interval
const pad = (n: number) => String(n).padStart(2, '0')

function cors(env: Env): Record<string, string> {
  return {
    'access-control-allow-origin': env.ALLOW_ORIGIN || '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  }
}

type SendResult = 'ok' | 'gone' | 'fail'
async function send(env: Env, sub: PushSub, title: string, body: string, tag: string): Promise<SendResult> {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)
  try {
    await webpush.sendNotification(sub, JSON.stringify({ title, body, tag }))
    return 'ok'
  } catch (e: unknown) {
    const code = (e as { statusCode?: number }).statusCode
    return code === 404 || code === 410 ? 'gone' : 'fail'
  }
}

/** Current local minute-of-day, date key, and day-of-year — DST-correct via IANA zone. */
function localNow(cfg: PushConfig): { minOfDay: number; dateKey: string; doy: number } {
  const now = new Date()
  if (cfg.timeZone) {
    try {
      const p = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
          timeZone: cfg.timeZone,
          hourCycle: 'h23',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
          .formatToParts(now)
          .map((x) => [x.type, x.value]),
      ) as Record<string, string>
      const y = Number(p.year)
      const doy = Math.floor((Date.UTC(y, Number(p.month) - 1, Number(p.day)) - Date.UTC(y, 0, 0)) / 86_400_000)
      return { minOfDay: Number(p.hour) * 60 + Number(p.minute), dateKey: `${p.year}-${p.month}-${p.day}`, doy }
    } catch {
      // fall through to offset
    }
  }
  const local = new Date(now.getTime() - (cfg.tzOffsetMinutes || 0) * 60_000)
  const y = local.getUTCFullYear()
  const doy = Math.floor((local.getTime() - Date.UTC(y, 0, 0)) / 86_400_000)
  return {
    minOfDay: local.getUTCHours() * 60 + local.getUTCMinutes(),
    dateKey: `${y}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    doy,
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const headers = { ...cors(env), 'content-type': 'application/json' }
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(env) })

    const url = new URL(req.url)
    if (req.method === 'POST' && url.pathname === '/config') {
      let cfg: PushConfig
      try {
        cfg = (await req.json()) as PushConfig
      } catch {
        return new Response(JSON.stringify({ error: 'invalid JSON body' }), { status: 400, headers })
      }
      await env.SUBS.put('config', JSON.stringify(cfg))
      return new Response(JSON.stringify({ ok: true }), { headers })
    }
    if (req.method === 'POST' && url.pathname === '/test') {
      const cfg = JSON.parse((await env.SUBS.get('config')) || 'null') as PushConfig | null
      if (!cfg?.subscription) return new Response(JSON.stringify({ error: 'no subscription' }), { status: 400, headers })
      const r = await send(env, cfg.subscription, 'Activities Lab', 'Test notification — you are all set.', 'test')
      return new Response(JSON.stringify({ result: r }), { headers })
    }
    return new Response(JSON.stringify({ up: true }), { headers })
  },

  // Runs every 5 minutes (see wrangler crons).
  async scheduled(_event: unknown, env: Env): Promise<void> {
    const cfg = JSON.parse((await env.SUBS.get('config')) || 'null') as PushConfig | null
    if (!cfg?.subscription) return

    const { minOfDay, dateKey, doy } = localNow(cfg)
    let dead = false

    // Fire once per day per marker; only record the marker on a confirmed send.
    const fire = async (suffix: string, body: string, tag: string) => {
      const marker = `sent:${dateKey}:${suffix}`
      if (await env.SUBS.get(marker)) return
      const r = await send(env, cfg.subscription!, 'Activities Lab', body, tag)
      if (r === 'gone') dead = true
      else if (r === 'ok') await env.SUBS.put(marker, '1', { expirationTtl: 90_000 })
      // 'fail' (transient) → leave the marker unset so it can still be retried
    }

    for (const rem of cfg.reminders) {
      if (dead) break
      const [h, m] = rem.time.split(':').map(Number)
      const rm = h * 60 + m
      if (minOfDay >= rm && minOfDay < rm + WINDOW) await fire(String(rem.id), rem.message, `reminder-${rem.id}`)
    }

    const motMin = MOTIVATION_HOUR * 60
    if (!dead && cfg.motivation.length && minOfDay >= motMin && minOfDay < motMin + WINDOW) {
      await fire('motivation', cfg.motivation[doy % cfg.motivation.length], `motivation-${dateKey}`)
    }

    // Subscription expired → clear ONLY the subscription, keep the schedule.
    if (dead) {
      cfg.subscription = null
      await env.SUBS.put('config', JSON.stringify(cfg))
    }
  },
}
