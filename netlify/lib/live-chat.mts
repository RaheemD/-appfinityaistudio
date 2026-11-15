// Live chat takeover: lets the owner answer a website chat visitor from Telegram.
//
// How it works:
//   1. A chat visitor asks about pricing/hiring -> the owner gets a Telegram alert and the
//      conversation is "watched" for WATCH_MS (the widget starts polling for replies).
//   2. The owner uses Telegram's Reply on that alert (or on any later message from the visitor).
//      The reply is stored here and the widget shows it as a message from the Appfinity team.
//   3. For HUMAN_MS after the owner's last reply the AI stays quiet and the visitor's messages go
//      to the owner instead. The owner can reply /end to hand the chat back to the AI.
//
// All state lives in Netlify Blobs as append-only keys, so nothing is ever read-modified-written
// (no lost updates between the chat function, the poll function and the Telegram webhook):
//   chats/<id>/c-<ts>             conversation is watched from <ts>
//   chats/<id>/m/<ts>-o-<rand>    owner message (JSON { text, at })
//   chats/<id>/m/<ts>-e-<rand>    owner ended the takeover
//   chats/<id>/v/<ts>-<rand>      a visitor message was forwarded to the owner
//   chats/<id>/s/<ts>             the visitor's widget polled around <ts>
//   tgmap/<telegram message id>-<ts>-<id>   which conversation a Telegram message belongs to
// One key listing per conversation gives its whole state. Every function fails safe.

export const WATCH_MS = 30 * 60 * 1000;
export const HUMAN_MS = 10 * 60 * 1000;
export const MAX_FORWARDED = 20;
const SEEN_EVERY_MS = 30 * 1000;
const RETENTION_DAYS = 30;

const STORE_NAME = "owner-ops";
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CURSOR_PATTERN = /^\d{13}-[oe]-[a-z0-9]+$/;

export const isConversationId = (value: unknown): value is string => typeof value === "string" && ID_PATTERN.test(value);
export const isCursor = (value: unknown): value is string => typeof value === "string" && CURSOR_PATTERN.test(value);

const rand = () => Math.random().toString(36).slice(2, 8);

// Replies must show up within seconds, so read with strong consistency (the default can lag up
// to a minute). Falls back to the default if the environment doesn't offer strong reads.
let strongUnavailable = false;

type Store = Awaited<ReturnType<typeof openStore>>;

const openStore = async () => {
  const { getStore } = await import("@netlify/blobs");
  return strongUnavailable ? getStore(STORE_NAME) : getStore({ name: STORE_NAME, consistency: "strong" });
};

const withStore = async <T,>(label: string, fallback: T, work: (store: Store) => Promise<T>): Promise<T> => {
  try {
    try {
      return await work(await openStore());
    } catch (error) {
      if ((error as Error)?.name !== "BlobsConsistencyError" || strongUnavailable) throw error;
      strongUnavailable = true;
      return await work(await openStore());
    }
  } catch (error) {
    console.error(`[live-chat] ${label} failed:`, error instanceof Error ? error.message : error);
    return fallback;
  }
};

const listKeys = (store: Store, prefix: string) => store.list({ prefix }).then(({ blobs }) => blobs.map((blob) => blob.key).sort());

export type ChatState = {
  watched: boolean; // an alert went out recently: forward the visitor's messages, widget polls
  human: boolean; // the owner is answering: the AI stays quiet
  forwarded: number; // visitor messages forwarded so far
  lastSeenAt: number; // when the visitor's widget last polled (0 = never)
  ownerMessages: number;
  messageKeys: string[]; // "<ts>-o|e-<rand>", oldest first
};

// Returns null if the state can't be read (treat the chat as not live).
export const chatState = (id: string, now = Date.now()) =>
  withStore<ChatState | null>("chatState", null, async (store) => {
    const prefix = `chats/${id}/`;
    const keys = (await listKeys(store, prefix)).map((key) => key.slice(prefix.length));
    const timestamps = (start: string) => keys.filter((key) => key.startsWith(start)).map((key) => Number.parseInt(key.slice(start.length), 10) || 0);

    const messageKeys = keys.filter((key) => key.startsWith("m/")).map((key) => key.slice(2));
    const last = messageKeys[messageKeys.length - 1];
    const human = !!last && last.includes("-o-") && now - Number.parseInt(last, 10) < HUMAN_MS;
    const watchedSince = Math.max(0, ...timestamps("c-"));

    return {
      watched: human || now - watchedSince < WATCH_MS,
      human,
      forwarded: timestamps("v/").length,
      lastSeenAt: Math.max(0, ...timestamps("s/")),
      ownerMessages: messageKeys.filter((key) => key.includes("-o-")).length,
      messageKeys,
    };
  });

const put = (label: string, key: string, value: unknown = 1) =>
  withStore(label, false, async (store) => {
    await store.setJSON(key, value);
    return true;
  });

export const startWatching = (id: string) => put("startWatching", `chats/${id}/c-${Date.now()}`);
export const markForwarded = (id: string) => put("markForwarded", `chats/${id}/v/${Date.now()}-${rand()}`);
export const endTakeover = (id: string) => put("endTakeover", `chats/${id}/m/${Date.now()}-e-${rand()}`);

export const addOwnerMessage = (id: string, text: string) =>
  put("addOwnerMessage", `chats/${id}/m/${Date.now()}-o-${rand()}`, { text, at: new Date().toISOString() });

// Records that the visitor's widget is still open, at most every SEEN_EVERY_MS.
export const markSeen = (id: string, state: ChatState, now = Date.now()) =>
  now - state.lastSeenAt < SEEN_EVERY_MS ? Promise.resolve(true) : put("markSeen", `chats/${id}/s/${now}`);

export type OwnerMessage = { id: string; text: string; at: string };

// Owner messages newer than `cursor` (a message id), oldest first.
export const ownerMessagesAfter = (id: string, state: ChatState, cursor: string) =>
  withStore<OwnerMessage[]>("ownerMessagesAfter", [], async (store) => {
    const fresh = state.messageKeys.filter((key) => key.includes("-o-") && key > cursor).slice(-20);
    const loaded = await Promise.all(
      fresh.map(async (key) => {
        const value = (await store.get(`chats/${id}/m/${key}`, { type: "json" })) as { text?: unknown; at?: unknown } | null;
        return typeof value?.text === "string" ? { id: key, text: value.text, at: String(value.at ?? "") } : null;
      }),
    );
    return loaded.filter((message): message is OwnerMessage => !!message);
  });

export const linkTelegramMessage = (telegramMessageId: number, id: string) =>
  put("linkTelegramMessage", `tgmap/${telegramMessageId}-${Date.now()}-${id}`);

// Which conversation a Telegram message (alert, forwarded visitor message, ...) belongs to.
export const conversationForTelegramMessage = (telegramMessageId: number) =>
  withStore<string | null>("conversationForTelegramMessage", null, async (store) => {
    const keys = await listKeys(store, `tgmap/${telegramMessageId}-`);
    const id = keys[keys.length - 1]?.slice(-36);
    return isConversationId(id) ? id : null;
  });

// Deletes conversations (and their Telegram links) older than RETENTION_DAYS.
export const pruneOldChats = (now = Date.now()) =>
  withStore("pruneOldChats", 0, async (store) => {
    const cutoff = now - RETENTION_DAYS * 86_400_000;
    const timestampIn = (key: string) => Number.parseInt(key.match(/\d{13}/)?.[0] ?? "0", 10);

    const chatKeys = await listKeys(store, "chats/");
    const newestById = new Map<string, number>();
    for (const key of chatKeys) {
      const id = key.split("/")[1];
      newestById.set(id, Math.max(newestById.get(id) ?? 0, timestampIn(key.slice(`chats/${id}/`.length))));
    }
    const expired = new Set([...newestById].filter(([, newest]) => newest < cutoff).map(([id]) => id));

    const linkKeys = (await listKeys(store, "tgmap/")).filter((key) => timestampIn(key.slice(key.indexOf("-") + 1)) < cutoff);
    const doomed = [...chatKeys.filter((key) => expired.has(key.split("/")[1])), ...linkKeys].slice(0, 2_000);
    await Promise.all(doomed.map((key) => store.delete(key)));
    return doomed.length;
  });
