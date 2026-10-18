// Shared plumbing for the AI functions that talk to OpenRouter on behalf of website visitors
// (chat.mts, lab.mts): request guards, the OpenRouter call, and SSE -> plain-text streaming.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_MODEL = "z-ai/glm-5.3-flash";

export const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

// Only the website itself may call these endpoints from a browser.
export const isSameOrigin = (req: Request) => {
  const origin = req.headers.get("origin");
  try {
    return !!origin && new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
};

export const clientIp = (req: Request, context?: { ip?: string }) =>
  context?.ip || req.headers.get("x-nf-client-connection-ip") || "unknown";

// Best-effort per-instance daily cap per visitor IP (Netlify's rateLimit config handles bursts).
export const createDailyLimiter = (limit: number) => {
  const usage = { day: "", counts: new Map<string, number>() };
  return (ip: string) => {
    const today = new Date().toISOString().slice(0, 10);
    if (usage.day !== today || usage.counts.size > 10_000) {
      usage.day = today;
      usage.counts.clear();
    }
    const count = (usage.counts.get(ip) ?? 0) + 1;
    usage.counts.set(ip, count);
    return count > limit;
  };
};

// POSTs a chat completion. Throws on network errors/timeouts; the caller checks response.ok.
export const requestOpenRouter = (apiKey: string, body: Record<string, unknown>, timeoutMs: number) =>
  fetch(OPENROUTER_URL, {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://appfinityaistudio.com",
      "X-Title": "Appfinity AI Studio",
    },
    body: JSON.stringify(body),
  });

export const textStreamResponse = (stream: ReadableStream<Uint8Array>) =>
  new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

// Turns OpenRouter's SSE stream into a plain-text stream of the reply.
export const toTextStream = (upstream: ReadableStream<Uint8Array>, label: string) => {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = upstream.getReader();
  let buffer = "";
  let sentAny = false;

  return new ReadableStream<Uint8Array>({
    // Visitor closed the page / navigated away: stop paying for tokens nobody will read.
    cancel(reason) {
      reader.cancel(reason).catch(() => {});
    },
    async start(controller) {
      const handleLine = (line: string) => {
        if (!line.startsWith("data:")) return; // ignores ": OPENROUTER PROCESSING" keep-alives
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") return;
        let chunk: { error?: unknown; choices?: { delta?: { content?: string } }[] };
        try {
          chunk = JSON.parse(payload);
        } catch {
          return;
        }
        if (chunk.error) throw new Error(`OpenRouter stream error: ${JSON.stringify(chunk.error).slice(0, 300)}`);
        const text = chunk.choices?.[0]?.delta?.content;
        if (text) {
          sentAny = true;
          controller.enqueue(encoder.encode(text));
        }
      };

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) handleLine(line.trim());
        }
        buffer += decoder.decode();
        if (buffer.trim()) handleLine(buffer.trim());
      } catch (error) {
        console.error(`[${label}] stream failed:`, error);
        try {
          if (sentAny) controller.enqueue(encoder.encode("\n\n(Sorry, my reply was cut off. Please ask again.)"));
        } catch {
          // Stream already cancelled by the client.
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed or cancelled.
        }
      }
    },
  });
};
