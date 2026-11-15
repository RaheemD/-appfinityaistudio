// Uptime checks for the studio's sites, used by the watchdog (alerts on changes) and the bot's
// /status command and daily digest.

export const SITES = [
  { name: "Appfinity AI Studio", url: "https://appfinityaistudio.com/" },
  { name: "FitnessMate", url: "https://fitnessmate.netlify.app/" },
  { name: "Next Frame Casting", url: "https://nextframecasting.netlify.app/" },
  { name: "FairOrigin Global", url: "https://fairoriginglobal.com/" },
  { name: "WorldLens", url: "https://worldailens.netlify.app/" },
  { name: "Ascend CRM", url: "https://ascend-aicrm.netlify.app/" },
];

const CHECK_TIMEOUT_MS = 10_000;
// A site must fail this many checks in a row before the owner is alerted (ignores one-off blips).
export const FAILURES_BEFORE_ALERT = 2;

export type SiteCheck = { name: string; url: string; ok: boolean; status: number; ms: number };

export const checkSite = async (site: { name: string; url: string }): Promise<SiteCheck> => {
  const started = Date.now();
  try {
    const response = await fetch(site.url, {
      redirect: "follow",
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      headers: { "User-Agent": "AppfinityWatchdog/1.0 (+https://appfinityaistudio.com)" },
    });
    await response.body?.cancel().catch(() => {});
    return { ...site, ok: response.status < 400, status: response.status, ms: Date.now() - started };
  } catch {
    return { ...site, ok: false, status: 0, ms: Date.now() - started };
  }
};

export const checkSites = () => Promise.all(SITES.map(checkSite));

export type SiteState = { failures: number; downSince?: string; alerted?: boolean };
export type WatchState = Record<string, SiteState>;

const minutesBetween = (from: string, to: Date) => Math.max(1, Math.round((to.getTime() - new Date(from).getTime()) / 60_000));

// Pure: given the previous state and fresh checks, returns the next state and the alerts to send.
// Alerts once when a site has been down FAILURES_BEFORE_ALERT checks in a row, and once when it recovers.
export const evaluateChecks = (previous: WatchState, checks: SiteCheck[], now = new Date()) => {
  const next: WatchState = {};
  const alerts: string[] = [];

  for (const check of checks) {
    const before = previous[check.url] ?? { failures: 0 };
    if (check.ok) {
      if (before.alerted && before.downSince) {
        alerts.push(`🟢 <b>${check.name} is back up</b>\nIt was down for about ${minutesBetween(before.downSince, now)} min.\n${check.url}`);
      }
      next[check.url] = { failures: 0 };
      continue;
    }

    const state: SiteState = {
      failures: before.failures + 1,
      downSince: before.downSince ?? now.toISOString(),
      alerted: before.alerted,
    };
    if (state.failures >= FAILURES_BEFORE_ALERT && !state.alerted) {
      state.alerted = true;
      const reason = check.status ? `HTTP ${check.status}` : "no response (timeout or connection error)";
      alerts.push(`🔴 <b>${check.name} is DOWN</b>\n${reason}\n${check.url}`);
    }
    next[check.url] = state;
  }

  return { next, alerts };
};

export const statusLines = (checks: SiteCheck[]) =>
  checks.map((check) => (check.ok ? `✅ ${check.name} · ${check.ms} ms` : `🔴 ${check.name} · ${check.status ? `HTTP ${check.status}` : "no response"}`));
