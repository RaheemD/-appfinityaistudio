// Small persistent store for the owner bot (Netlify Blobs): lead/activity events and bits of state
// (site watchdog, spend alerts). Every call swallows its own errors and returns a safe fallback, and
// the Blobs client is loaded lazily, so a storage problem can never break the website's features.
//
// Events live for EVENT_RETENTION_DAYS and are keyed events/<IST day>/<timestamp>-<type>-<random>,
// so counting a day's activity only needs a key listing.

export const EVENT_RETENTION_DAYS = 30;

export type EventType = "blueprint" | "xray" | "contact" | "chat";
export type OpsEvent = { type: EventType; title: string; detail: string; at: string };

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Calendar day in India (the owner's timezone), e.g. "2026-11-15".
export const istDay = (date = new Date()) => new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

export const istTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true });

const store = async () => {
  const { getStore } = await import("@netlify/blobs");
  return getStore("owner-ops");
};

const safely = async <T,>(label: string, fallback: T, work: () => Promise<T>): Promise<T> => {
  try {
    return await work();
  } catch (error) {
    console.error(`[ops-store] ${label} failed:`, error instanceof Error ? error.message : error);
    return fallback;
  }
};

export const recordEvent = (event: Omit<OpsEvent, "at">) =>
  safely("recordEvent", false, async () => {
    const now = new Date();
    const key = `events/${istDay(now)}/${now.getTime()}-${event.type}-${Math.random().toString(36).slice(2, 8)}`;
    await (await store()).setJSON(key, { ...event, at: now.toISOString() } satisfies OpsEvent);
    return true;
  });

const eventKeys = (prefix: string) =>
  safely("list", [] as string[], async () => {
    const { blobs } = await (await store()).list({ prefix });
    return blobs.map((blob) => blob.key).sort();
  });

const typeOfKey = (key: string) => key.split("/").pop()?.split("-")[1] as EventType | undefined;

// How many events of each type happened on an IST day.
export const countEvents = async (day: string) => {
  const counts: Record<EventType, number> = { blueprint: 0, xray: 0, contact: 0, chat: 0 };
  for (const key of await eventKeys(`events/${day}/`)) {
    const type = typeOfKey(key);
    if (type && type in counts) counts[type] += 1;
  }
  return counts;
};

const loadEvents = (keys: string[]) =>
  safely("loadEvents", [] as OpsEvent[], async () => {
    const blobs = await store();
    const events = await Promise.all(keys.map((key) => blobs.get(key, { type: "json" }) as Promise<OpsEvent | null>));
    return events.filter((event): event is OpsEvent => !!event?.at);
  });

// Newest first. `day` limits it to one IST day.
export const latestEvents = async (limit: number, day?: string) => {
  const keys = await eventKeys(day ? `events/${day}/` : "events/");
  return loadEvents(keys.slice(-limit).reverse());
};

export const pruneOldEvents = () =>
  safely("prune", 0, async () => {
    const cutoff = istDay(new Date(Date.now() - EVENT_RETENTION_DAYS * 86_400_000));
    const old = (await eventKeys("events/")).filter((key) => key.split("/")[1] < cutoff);
    const blobs = await store();
    await Promise.all(old.map((key) => blobs.delete(key)));
    return old.length;
  });

export const getState = <T,>(name: string, fallback: T) =>
  safely(`getState(${name})`, fallback, async () => ((await (await store()).get(`state/${name}`, { type: "json" })) as T | null) ?? fallback);

export const setState = (name: string, value: unknown) =>
  safely(`setState(${name})`, false, async () => {
    await (await store()).setJSON(`state/${name}`, value);
    return true;
  });
