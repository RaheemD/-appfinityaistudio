import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  Bot,
  Check,
  Clock,
  Copy,
  Database,
  Flame,
  Gift,
  Lightbulb,
  Mail,
  MessageCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  Snowflake,
  Sparkles,
  ThermometerSun,
  UserCheck,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { BorderBeam } from "@/components/BorderBeam";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import whatsappIcon from "@/assets/WA.png";
import ascendLogo from "@/assets/ascend.png";

// Free AI tools for visitors. Generated server-side by netlify/functions/lab.mts (GLM 5.3 Flash via
// OpenRouter). Results go to WhatsApp through click-to-chat links - no WhatsApp API needed.

const LAB_ENDPOINT = "/api/lab";
const STUDIO_WHATSAPP = "919321364060";
const STUDIO_EMAIL = "info@appfinityaistudio.com";
const REQUEST_TIMEOUT_MS = 60_000;

type Stage = { at: number; label: string };

const BLUEPRINT_STAGES: Stage[] = [
  { at: 0, label: "Reading your idea" },
  { at: 1500, label: "Thinking" },
  { at: 4000, label: "Shaping the MVP" },
  { at: 7000, label: "Choosing the tech stack" },
  { at: 10000, label: "Mapping the roadmap" },
  { at: 14000, label: "Polishing the blueprint" },
  { at: 19000, label: "Almost there" },
];

const COACH_STAGES: Stage[] = [
  { at: 0, label: "Reading the message" },
  { at: 1500, label: "Scoring the lead" },
  { at: 4000, label: "Writing replies" },
  { at: 8000, label: "Polishing the tone" },
  { at: 13000, label: "Almost there" },
];

const IDEA_EXAMPLES = [
  "An app for local gyms to manage members, track attendance and send WhatsApp payment reminders",
  "A marketplace connecting parents with verified home tutors in their neighbourhood",
  "An AI tool that turns a restaurant's Google reviews into weekly improvement tips",
];

const MESSAGE_EXAMPLES = [
  "Hi, is the blue kurta available in M size? What's the price and how fast can you deliver to Pune?",
  "Bhaiya ye sofa ka last price kya hoga? Delivery free hai kya?",
  "I ordered 5 days ago and still haven't received anything. This is really disappointing.",
];

const PLATFORM_OPTIONS = [
  { value: "web", label: "Web" },
  { value: "mobile", label: "Mobile" },
  { value: "both", label: "Both" },
  { value: "unsure", label: "Not sure" },
];

const LANGUAGE_OPTIONS = [
  { value: "english", label: "English" },
  { value: "hinglish", label: "Hinglish" },
  { value: "hindi", label: "हिंदी" },
];

class LabError extends Error {}

const truncate = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value);

const errorMessage = async (response: Response) => {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") return data.error;
  } catch {
    // Not JSON (e.g. Netlify's own rate-limit page).
  }
  return response.status === 429
    ? "You're going a little fast - please wait a minute and try again."
    : "The AI Lab is busy right now. Please try again.";
};

const postLab = (body: Record<string, unknown>, signal: AbortSignal) =>
  fetch(LAB_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

// Milliseconds since `active` became true (drives the rolling status messages).
const useElapsed = (active: boolean) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    if (!active) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - started), 250);
    return () => clearInterval(timer);
  }, [active]);
  return elapsed;
};

// Same rolling "thinking" pill as the Blog's daily insight.
const StatusPill = ({ stages, elapsed }: { stages: Stage[]; elapsed: number }) => {
  const stage = [...stages].reverse().find((s) => elapsed >= s.at) ?? stages[0];
  return (
    <div role="status" aria-live="polite" className="inline-flex items-center gap-2 overflow-hidden rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
      <Sparkles className="w-4 h-4 shrink-0 animate-pulse" />
      <span key={stage.label} className="motion-safe:animate-slide-up">
        {stage.label}
      </span>
      <span className="flex items-end gap-1 pb-0.5" aria-hidden="true">
        {[0, 150, 300].map((delay) => (
          <span key={delay} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </span>
    </div>
  );
};

const ChipButton = ({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={cn(
      "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors active:scale-[0.97]",
      selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground",
    )}
  >
    {children}
  </button>
);

const useCopy = () => {
  const { toast } = useToast();
  return async (value: string, what = "Copied") => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: what, description: "Ready to paste." });
    } catch {
      toast({ title: "Couldn't copy", description: "Please select the text and copy it manually.", variant: "destructive" });
    }
  };
};

const whatsappLink = (message: string, phone = "") => `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

// ---------------------------------------------------------------------------------------------
// Idea -> App Blueprint
// ---------------------------------------------------------------------------------------------

// Bullet points under a "## Heading" of the blueprint.
const sectionBullets = (markdown: string, heading: string) => {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => /^#{1,6}\s/.test(line.trim()) && line.toLowerCase().includes(heading.toLowerCase()));
  if (start < 0) return [];
  const bullets: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();
    if (/^#{1,6}\s/.test(trimmed)) break;
    const match = trimmed.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (match) bullets.push(match[1].replace(/\*\*/g, ""));
  }
  return bullets;
};

const toPlainText = (markdown: string) => markdown.replace(/^#{1,6}\s+/gm, "").replace(/\*\*/g, "").trim();

const blueprintSummary = (idea: string, markdown: string) => {
  const features = sectionBullets(markdown, "MVP Features").slice(0, 5);
  const lines = [
    "Hi Appfinity! I made an app blueprint in your AI Lab and would like to discuss building it.",
    "",
    `My idea: ${truncate(idea, 300)}`,
  ];
  // Just the feature names ("WhatsApp order capture — a shareable link…" -> "WhatsApp order capture").
  const names = features.map((feature) => feature.split(/\s+[—–-]\s+|:\s+/)[0]);
  if (names.length) lines.push("", "MVP features:", ...names.map((name) => `• ${truncate(name, 90)}`));
  return lines.join("\n");
};

const BlueprintTool = () => {
  const [idea, setIdea] = useState("");
  const [audience, setAudience] = useState("");
  const [platform, setPlatform] = useState("unsure");
  const [status, setStatus] = useState<"idle" | "loading" | "streaming" | "done" | "error">("idle");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [submittedIdea, setSubmittedIdea] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const elapsed = useElapsed(status === "loading");
  const copy = useCopy();

  useEffect(() => () => requestRef.current?.abort(), []);

  const busy = status === "loading" || status === "streaming";

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = idea.trim();
    if (trimmed.length < 15 || busy) return;

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    setSubmittedIdea(trimmed);
    setOutput("");
    setError("");
    setStatus("loading");
    window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

    let text = "";
    try {
      const response = await postLab({ tool: "blueprint", idea: trimmed, audience: audience.trim(), platform }, controller.signal);
      if (!response.ok || !response.body || !response.headers.get("content-type")?.startsWith("text/plain")) {
        throw new LabError(await errorMessage(response));
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        if (text.trim()) {
          setStatus("streaming");
          setOutput(text);
        }
      }
      text += decoder.decode();
      if (!text.trim()) throw new LabError("The AI Lab is busy right now. Please try again.");
      setOutput(text);
      setStatus("done");
    } catch (err) {
      if (requestRef.current !== controller) return;
      if (text.trim()) {
        setOutput(`${text}\n\n(Sorry, the blueprint was cut off. Please try again.)`);
        setStatus("done");
      } else {
        setError(err instanceof LabError ? err.message : "Couldn't reach the AI Lab. Check your connection and try again.");
        setStatus("error");
      }
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const reset = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setStatus("idle");
    setOutput("");
    setError("");
  };

  const summary = blueprintSummary(submittedIdea, output);
  const emailBody = `${summary}\n\n---\n${truncate(toPlainText(output), 1500)}`;

  return (
    <div className="space-y-8">
      <form onSubmit={generate} className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="idea" className="text-base font-semibold">Describe your app idea</Label>
          <Textarea
            id="idea"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            maxLength={1500}
            rows={4}
            placeholder="e.g. An app where small clinics can book patient appointments and send reminders on WhatsApp"
            className="rounded-xl resize-none text-base"
          />
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Try an example:</span>
            {IDEA_EXAMPLES.map((example, i) => (
              <button
                key={example}
                type="button"
                onClick={() => setIdea(example)}
                className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-primary/20 transition-colors"
              >
                {["Gym app", "Tutor marketplace", "Review insights"][i]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="audience">Who is it for? <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input
              id="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              maxLength={200}
              placeholder="e.g. Clinic owners in tier-2 cities"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium leading-none">Platform</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Platform">
              {PLATFORM_OPTIONS.map((option) => (
                <ChipButton key={option.value} selected={platform === option.value} onClick={() => setPlatform(option.value)}>
                  {option.label}
                </ChipButton>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button type="submit" size="lg" className="group" disabled={busy || idea.trim().length < 15}>
            <Sparkles className="mr-1 h-4 w-4" />
            {busy ? "Creating your blueprint…" : "Create my blueprint"}
          </Button>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            Free, no sign-up. Your idea isn't saved - it's only used to write your blueprint.
          </p>
        </div>
      </form>

      <div ref={resultRef} className="scroll-mt-24">
        {status !== "idle" && (
          <div className="relative rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-6 md:p-8">
            {busy && <BorderBeam duration={6} size={160} />}
            {status === "loading" && (
              <div className="space-y-5">
                <StatusPill stages={BLUEPRINT_STAGES} elapsed={elapsed} />
                <div className="space-y-3" aria-hidden="true">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-4 w-40 mt-5" />
                  {["w-11/12", "w-4/5", "w-3/4", "w-2/3"].map((width) => (
                    <div key={width} className="flex items-center gap-2">
                      <Skeleton className="h-1.5 w-1.5 rounded-full shrink-0" />
                      <Skeleton className={`h-3 ${width}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(status === "streaming" || status === "done") && (
              <div className="[&_p.font-semibold]:mt-5 [&_p.font-semibold]:text-base [&_p.font-semibold]:text-primary [&_p.font-semibold:first-child]:mt-0">
                <ChatMarkdown content={output} />
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-start gap-4">
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" onClick={generate}>
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Try again
                </Button>
              </div>
            )}

            {status === "done" && (
              <div className="mt-8 border-t border-border pt-6 space-y-4">
                <p className="font-semibold">Like it? Let's build it together.</p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                  <Button size="lg" className="bg-green-600 text-white hover:bg-green-700" asChild>
                    <a href={whatsappLink(summary, STUDIO_WHATSAPP)} target="_blank" rel="noopener noreferrer">
                      <img src={whatsappIcon} alt="" className="h-5 w-5" />
                      Send to Appfinity on WhatsApp
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <a href={`mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent("App blueprint from your AI Lab")}&body=${encodeURIComponent(emailBody)}`}>
                      <Mail className="h-4 w-4" />
                      Email it to us
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => copy(toPlainText(output), "Blueprint copied")}>
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                  <Button size="lg" variant="ghost" onClick={reset}>
                    <RotateCcw className="h-4 w-4" />
                    Start over
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  WhatsApp opens with a short summary already typed - just press send. AI-generated: treat it as a starting point, not a quote.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// WhatsApp Reply Coach
// ---------------------------------------------------------------------------------------------

type CoachResult = {
  lead: { temperature: "hot" | "warm" | "cold"; reason: string };
  intent: string;
  replies: { label: string; text: string }[];
};

const LEAD_STYLES = {
  hot: { label: "Hot lead", icon: Flame, className: "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400" },
  warm: { label: "Warm lead", icon: ThermometerSun, className: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  cold: { label: "Cold lead", icon: Snowflake, className: "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400" },
};

const isCoachResult = (value: unknown): value is CoachResult => {
  const v = value as CoachResult;
  return !!v && !!LEAD_STYLES[v.lead?.temperature] && Array.isArray(v.replies) && v.replies.length > 0;
};

const ReplyCoachTool = () => {
  const [message, setMessage] = useState("");
  const [business, setBusiness] = useState("");
  const [language, setLanguage] = useState("english");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<CoachResult | null>(null);
  const [error, setError] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const elapsed = useElapsed(status === "loading");
  const copy = useCopy();

  useEffect(() => () => requestRef.current?.abort(), []);

  const run = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < 2 || status === "loading") return;

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    setResult(null);
    setError("");
    setStatus("loading");
    window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

    try {
      const response = await postLab({ tool: "reply", message: trimmed, business: business.trim(), language }, controller.signal);
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
        throw new LabError(await errorMessage(response));
      }
      const data = await response.json();
      if (!isCoachResult(data)) throw new LabError("The AI Lab is busy right now. Please try again.");
      setResult(data);
      setStatus("done");
    } catch (err) {
      if (requestRef.current !== controller) return;
      setError(err instanceof LabError ? err.message : "Couldn't reach the AI Lab. Check your connection and try again.");
      setStatus("error");
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const lead = result ? LEAD_STYLES[result.lead.temperature] : null;

  return (
    <div className="space-y-8">
      <form onSubmit={run} className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="customer-message" className="text-base font-semibold">Paste your customer's message</Label>
          <Textarea
            id="customer-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1500}
            rows={4}
            placeholder="e.g. Hi, do you have this in stock? What's the price with delivery?"
            className="rounded-xl resize-none text-base"
          />
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Try an example:</span>
            {MESSAGE_EXAMPLES.map((example, i) => (
              <button
                key={example}
                type="button"
                onClick={() => setMessage(example)}
                className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-primary/20 transition-colors"
              >
                {["Price & delivery", "Hinglish bargain", "Late order"][i]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="business">Your business <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input
              id="business"
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              maxLength={200}
              placeholder="e.g. Clothing store in Pune, ships across India"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium leading-none">Reply language</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Reply language">
              {LANGUAGE_OPTIONS.map((option) => (
                <ChipButton key={option.value} selected={language === option.value} onClick={() => setLanguage(option.value)}>
                  {option.label}
                </ChipButton>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button type="submit" size="lg" disabled={status === "loading" || message.trim().length < 2}>
            <MessageCircle className="mr-1 h-4 w-4" />
            {status === "loading" ? "Writing replies…" : "Write my replies"}
          </Button>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            We don't save what you paste - it's only used to write your replies.
          </p>
        </div>
      </form>

      <div ref={resultRef} className="scroll-mt-24 space-y-4">
        {status === "loading" && (
          <div className="relative rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-6 md:p-8 space-y-5">
            <BorderBeam duration={6} size={160} />
            <StatusPill stages={COACH_STAGES} elapsed={elapsed} />
            <div className="grid gap-3" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-3xl border border-border bg-card p-6 md:p-8 flex flex-col items-start gap-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={run}>
              <RotateCcw className="mr-1 h-4 w-4" />
              Try again
            </Button>
          </div>
        )}

        {status === "done" && result && lead && (
          <>
            <div className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold", lead.className)}>
                  <lead.icon className="h-4 w-4" />
                  {lead.label}
                </span>
                {result.intent && <span className="text-sm text-muted-foreground">Wants: <span className="font-medium text-foreground">{result.intent}</span></span>}
              </div>
              {result.lead.reason && <p className="text-sm text-muted-foreground">{result.lead.reason}</p>}
            </div>

            {result.replies.map((reply) => (
              <div key={reply.label} className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{reply.label}</p>
                <p className="whitespace-pre-line leading-relaxed">{reply.text}</p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" size="sm" onClick={() => copy(reply.text, "Reply copied")}>
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" className="border-green-600 text-green-700 dark:text-green-500 hover:bg-green-600 hover:text-white" asChild>
                    <a href={whatsappLink(reply.text)} target="_blank" rel="noopener noreferrer">
                      <img src={whatsappIcon} alt="" className="h-4 w-4" />
                      Send on WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground px-2">"Send on WhatsApp" opens WhatsApp with the reply ready - pick your customer's chat and press send.</p>
          </>
        )}

        <a
          href="https://ascend-aicrm.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between gap-4 rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-5 md:p-6 transition-colors hover:bg-primary/10"
        >
          <div>
            <p className="font-semibold">Want this for every WhatsApp lead, automatically?</p>
            <p className="text-sm text-muted-foreground">Ascend CRM, our AI CRM in development, scores leads and drafts follow-ups from WhatsApp and Gmail.</p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
        </a>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Automation X-Ray
// ---------------------------------------------------------------------------------------------

type XrayStep = { title: string; detail: string; tool: string; kind: "action" | "ai" | "notify" | "store" };
type XrayResult =
  | { ok: false; message: string }
  | {
      ok: true;
      title: string;
      trigger: { title: string; tool: string };
      steps: XrayStep[];
      outcome: string;
      keepHuman: string[];
      automatableShare: number;
      complexity: "quick_win" | "moderate" | "custom";
    };

const XRAY_STAGES: Stage[] = [
  { at: 0, label: "Reading your task" },
  { at: 1500, label: "Thinking" },
  { at: 4000, label: "Mapping the workflow" },
  { at: 7000, label: "Picking the right tools" },
  { at: 10000, label: "Estimating time saved" },
  { at: 14000, label: "Almost there" },
];

const TASK_EXAMPLES = [
  { label: "Leads to Excel", text: "Every morning I copy new enquiries from Gmail and our website form into an Excel sheet, then WhatsApp each lead to say we'll call them" },
  { label: "Payment reminders", text: "Every week we check unpaid invoices in Tally and send reminder messages to each customer one by one" },
  { label: "Weekly report", text: "Every Monday I pull sales numbers from Shopify and Google Sheets and write a summary email for the team" },
];

const FREQUENCY_OPTIONS = [
  { value: "day", label: "a day", perMonth: 22 }, // working days
  { value: "week", label: "a week", perMonth: 4.33 },
  { value: "month", label: "a month", perMonth: 1 },
];

const STEP_KINDS = {
  action: { icon: Zap, label: "Action" },
  ai: { icon: Bot, label: "AI step" },
  notify: { icon: Bell, label: "Notify" },
  store: { icon: Database, label: "Save" },
};

const COMPLEXITY = {
  quick_win: { label: "Quick win", className: "border-green-500/25 bg-green-500/10 text-green-700 dark:text-green-400" },
  moderate: { label: "Moderate", className: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  custom: { label: "Custom build", className: "border-primary/25 bg-primary/10 text-primary" },
};

const isXrayResult = (value: unknown): value is XrayResult => {
  const v = value as XrayResult;
  if (!v || typeof v.ok !== "boolean") return false;
  return v.ok ? !!v.trigger?.title && Array.isArray(v.steps) && v.steps.length > 0 : typeof (v as { message?: unknown }).message === "string";
};

const formatHours = (hours: number) => (hours >= 10 ? Math.round(hours) : Math.round(hours * 10) / 10).toString();

const AutomationXrayTool = () => {
  const [task, setTask] = useState("");
  const [tools, setTools] = useState("");
  const [times, setTimes] = useState("");
  const [frequency, setFrequency] = useState("day");
  const [minutes, setMinutes] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<XrayResult | null>(null);
  const [submittedTask, setSubmittedTask] = useState("");
  const [error, setError] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const elapsed = useElapsed(status === "loading");
  const copy = useCopy();

  useEffect(() => () => requestRef.current?.abort(), []);

  const run = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = task.trim();
    if (trimmed.length < 15 || status === "loading") return;

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    setSubmittedTask(trimmed);
    setResult(null);
    setError("");
    setStatus("loading");
    window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

    try {
      const response = await postLab({ tool: "xray", task: trimmed, tools: tools.trim() }, controller.signal);
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
        throw new LabError(await errorMessage(response));
      }
      const data = await response.json();
      if (!isXrayResult(data)) throw new LabError("The AI Lab is busy right now. Please try again.");
      setResult(data);
      setStatus("done");
    } catch (err) {
      if (requestRef.current !== controller) return;
      setError(err instanceof LabError ? err.message : "Couldn't reach the AI Lab. Check your connection and try again.");
      setStatus("error");
    } finally {
      window.clearTimeout(timeout);
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const reset = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setStatus("idle");
    setResult(null);
    setError("");
  };

  // Time maths uses only the visitor's own numbers; the AI only estimates the automatable share.
  const perMonth = FREQUENCY_OPTIONS.find((option) => option.value === frequency)?.perMonth ?? 0;
  const monthlyHours = Number(times) > 0 && Number(minutes) > 0 ? (Number(times) * perMonth * Number(minutes)) / 60 : null;
  const plan = result?.ok ? result : null;
  const hoursBack = plan && monthlyHours !== null ? (monthlyHours * plan.automatableShare) / 100 : null;

  const summary = plan
    ? [
        "Hi Appfinity! I ran an Automation X-Ray in your AI Lab and would like help automating this.",
        "",
        `Task: ${truncate(submittedTask, 250)}`,
        `Automation: ${plan.title}`,
        `Flow: ${[plan.trigger.title, ...plan.steps.map((step) => step.title)].join(" → ")}`,
        ...(hoursBack !== null ? [`Estimated time back: ~${formatHours(hoursBack)} hours/month`] : []),
      ].join("\n")
    : "";
  const planText = plan
    ? [
        plan.title,
        `When: ${plan.trigger.title}${plan.trigger.tool ? ` (${plan.trigger.tool})` : ""}`,
        ...plan.steps.map((step, i) => `${i + 1}. ${step.title} - ${step.detail}${step.tool ? ` (${step.tool})` : ""}`),
        `Result: ${plan.outcome}`,
        ...(plan.keepHuman.length ? [`Keep a person on: ${plan.keepHuman.join("; ")}`] : []),
        `Rough estimate: ~${plan.automatableShare}% of the manual work automated`,
      ].join("\n")
    : "";

  return (
    <div className="space-y-8">
      <form onSubmit={run} className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="task" className="text-base font-semibold">What task do you or your team repeat?</Label>
          <Textarea
            id="task"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            maxLength={1200}
            rows={4}
            placeholder="e.g. Every evening I copy today's orders from WhatsApp into a Google Sheet and message each customer their delivery time"
            className="rounded-xl resize-none text-base"
          />
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Try an example:</span>
            {TASK_EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => setTask(example.text)}
                className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-primary/20 transition-colors"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tools">Tools you use today <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Input
            id="tools"
            value={tools}
            onChange={(e) => setTools(e.target.value)}
            maxLength={200}
            placeholder="e.g. Gmail, Excel, WhatsApp, Tally"
            className="rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium leading-none">
            How often, and how long it takes <span className="font-normal text-muted-foreground">(optional - to estimate hours saved)</span>
          </span>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              value={times}
              onChange={(e) => setTimes(e.target.value)}
              aria-label="How many times"
              placeholder="5"
              className="h-10 w-20 rounded-xl"
            />
            <span className="text-muted-foreground">times</span>
            <div className="flex gap-1.5" role="group" aria-label="How often">
              {FREQUENCY_OPTIONS.map((option) => (
                <ChipButton key={option.value} selected={frequency === option.value} onClick={() => setFrequency(option.value)}>
                  {option.label}
                </ChipButton>
              ))}
            </div>
            <span className="text-muted-foreground">,</span>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={600}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              aria-label="Minutes each time"
              placeholder="15"
              className="h-10 w-20 rounded-xl"
            />
            <span className="text-muted-foreground">minutes each time</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button type="submit" size="lg" disabled={status === "loading" || task.trim().length < 15}>
            <Workflow className="mr-1 h-4 w-4" />
            {status === "loading" ? "X-raying your task…" : "X-ray my task"}
          </Button>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            Free, no sign-up. Your task isn't saved - it's only used to design the automation.
          </p>
        </div>
      </form>

      <div ref={resultRef} className="scroll-mt-24 space-y-4">
        {status === "loading" && (
          <div className="relative rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-6 md:p-8 space-y-5">
            <BorderBeam duration={6} size={160} />
            <StatusPill stages={XRAY_STAGES} elapsed={elapsed} />
            <div className="space-y-3" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-2xl" />
                </div>
              ))}
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-3xl border border-border bg-card p-6 md:p-8 flex flex-col items-start gap-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={run}>
              <RotateCcw className="mr-1 h-4 w-4" />
              Try again
            </Button>
          </div>
        )}

        {status === "done" && result && !result.ok && (
          <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
            <p className="text-muted-foreground">{(result as { message: string }).message}</p>
          </div>
        )}

        {status === "done" && plan && (
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-6 md:p-8 space-y-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-2xl font-bold">{plan.title}</h3>
                <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", COMPLEXITY[plan.complexity].className)}>
                  {COMPLEXITY[plan.complexity].label}
                </span>
              </div>
              {plan.outcome && <p className="text-muted-foreground">{plan.outcome}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/60 p-5">
                <p className="text-3xl font-bold text-primary">~{plan.automatableShare}%</p>
                <p className="text-sm text-muted-foreground">of the manual work automated (rough AI estimate)</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-5">
                {hoursBack !== null && monthlyHours !== null ? (
                  <>
                    <p className="text-3xl font-bold text-primary">~{formatHours(hoursBack)} h</p>
                    <p className="text-sm text-muted-foreground">
                      back every month, of the ~{formatHours(monthlyHours)} h you spend on this today
                    </p>
                  </>
                ) : (
                  <p className="flex h-full items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 shrink-0" />
                    Add how often and how long it takes (above) to see the hours you'd get back.
                  </p>
                )}
              </div>
            </div>

            <ol className="relative space-y-3 before:absolute before:left-5 before:top-5 before:bottom-5 before:w-px before:bg-primary/25">
              <li className="relative flex gap-4">
                <span className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Play className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 rounded-2xl border border-border bg-background/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">When</p>
                  <p className="font-medium">{plan.trigger.title}</p>
                  {plan.trigger.tool && <ToolTag>{plan.trigger.tool}</ToolTag>}
                </div>
              </li>
              {plan.steps.map((step, i) => {
                const kind = STEP_KINDS[step.kind] ?? STEP_KINDS.action;
                return (
                  <li key={`${i}-${step.title}`} className="relative flex gap-4">
                    <span className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-card text-primary">
                      <kind.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1 rounded-2xl border border-border bg-background/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Step {i + 1} · {kind.label}
                      </p>
                      <p className="font-medium">{step.title}</p>
                      {step.detail && <p className="text-sm text-muted-foreground">{step.detail}</p>}
                      {step.tool && <ToolTag>{step.tool}</ToolTag>}
                    </div>
                  </li>
                );
              })}
              <li className="relative flex gap-4">
                <span className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white">
                  <Check className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 rounded-2xl border border-green-500/25 bg-green-500/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">Result</p>
                  <p className="font-medium">{plan.outcome || "Done automatically"}</p>
                </div>
              </li>
            </ol>

            {plan.keepHuman.length > 0 && (
              <div className="rounded-2xl border border-border bg-background/60 p-5">
                <p className="mb-2 flex items-center gap-2 font-semibold">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Keep a person on
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {plan.keepHuman.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-t border-border pt-6 space-y-4">
              <p className="font-semibold">Want this running for real? We build automations and AI integrations.</p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <Button size="lg" className="bg-green-600 text-white hover:bg-green-700" asChild>
                  <a href={whatsappLink(summary, STUDIO_WHATSAPP)} target="_blank" rel="noopener noreferrer">
                    <img src={whatsappIcon} alt="" className="h-5 w-5" />
                    Send to Appfinity on WhatsApp
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href={`mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent("Automation X-Ray from your AI Lab")}&body=${encodeURIComponent(`${summary}\n\n---\n${truncate(planText, 1400)}`)}`}>
                    <Mail className="h-4 w-4" />
                    Email it to us
                  </a>
                </Button>
                <Button size="lg" variant="outline" onClick={() => copy(planText, "Plan copied")}>
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                <Button size="lg" variant="ghost" onClick={reset}>
                  <RotateCcw className="h-4 w-4" />
                  Start over
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                AI-generated plan and rough estimate - our team will confirm the right setup for your business.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ToolTag = ({ children }: { children: React.ReactNode }) => (
  <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{children}</span>
);

// ---------------------------------------------------------------------------------------------

// Spells out who each tool is for and where it leads, so its purpose is clear at a glance.
const ToolIntro = ({ who, get, next }: { who: string; get: string; next: string }) => (
  <div className="mb-6 grid divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
    {[
      { icon: Users, label: "Who it's for", text: who },
      { icon: Gift, label: "What you get", text: get },
      { icon: ArrowRight, label: "What happens next", text: next },
    ].map(({ icon: Icon, label, text }) => (
      <div key={label} className="p-4">
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
      </div>
    ))}
  </div>
);

const TOOLS = ["blueprint", "xray", "reply"] as const;

const Lab = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tool");
  const tool = TOOLS.includes(requested as (typeof TOOLS)[number]) ? (requested as string) : "blueprint";

  useEffect(() => {
    const previous = document.title;
    document.title = "AI Lab — Free AI tools by Appfinity AI Studio";
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <Layout>
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div aria-hidden="true" className="hero-dots pointer-events-none absolute inset-x-0 top-0 h-[420px]" />
        <div className="container relative max-w-4xl">
          <div className="text-center mb-10 md:mb-12 space-y-4 opacity-0 animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/60 px-4 py-1.5 text-xs sm:text-sm font-medium backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span className="text-shiny">Free · No sign-up · Powered by our AI</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">
              AI <span className="text-primary">Lab</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three free AI tools by Appfinity AI Studio - each solves a real business problem in under a minute.
            </p>
          </div>

          <Tabs
            value={tool}
            onValueChange={(value) => setSearchParams({ tool: value }, { replace: true })}
            className="opacity-0 animate-fade-in"
            style={{ animationDelay: "0.15s" }}
          >
            <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl p-1.5 mb-8">
              <TabsTrigger value="blueprint" className="rounded-xl py-2.5 gap-1.5 sm:gap-2 text-sm md:text-base">
                <Lightbulb className="h-4 w-4 shrink-0" />
                <span className="md:hidden">Blueprint</span>
                <span className="hidden md:inline">App Blueprint</span>
              </TabsTrigger>
              <TabsTrigger value="xray" className="rounded-xl py-2.5 gap-1.5 sm:gap-2 text-sm md:text-base">
                <Workflow className="h-4 w-4 shrink-0" />
                <span className="md:hidden">Automate</span>
                <span className="hidden md:inline">Automation X-Ray</span>
              </TabsTrigger>
              <TabsTrigger value="reply" className="rounded-xl py-2.5 gap-1.5 sm:gap-2 text-sm md:text-base">
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span className="md:hidden">Replies</span>
                <span className="hidden md:inline">WhatsApp Reply Coach</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="blueprint" forceMount className="mt-0 data-[state=inactive]:hidden">
              <ToolIntro
                who="Founders and businesses with an app or SaaS idea."
                get="A one-page plan: MVP features, key screens, tech stack, where AI fits and a build roadmap."
                next="Send it to our team on WhatsApp in one tap - we design and build apps like this."
              />
              <BlueprintTool />
            </TabsContent>
            <TabsContent value="xray" forceMount className="mt-0 data-[state=inactive]:hidden">
              <ToolIntro
                who="Businesses that repeat the same task every day or week - data entry, follow-ups, reports."
                get="An automation flow for your task, the right tool for each step, and the hours you could get back."
                next="Send the plan to our team - we build automations and AI integrations."
              />
              <AutomationXrayTool />
            </TabsContent>
            <TabsContent value="reply" forceMount className="mt-0 data-[state=inactive]:hidden">
              <a
                href="https://ascend-aicrm.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="group mb-4 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm transition-colors hover:bg-primary/10"
              >
                <img src={ascendLogo} alt="" className="h-8 w-8 shrink-0 rounded-lg" />
                <span>
                  <span className="font-semibold">A free preview of Ascend CRM</span>
                  <span className="text-muted-foreground"> - our AI CRM (in development) that does this for every WhatsApp and Gmail lead.</span>
                </span>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
              </a>
              <ToolIntro
                who="Shops and sellers who get customer enquiries on WhatsApp."
                get="A hot / warm / cold lead score and 3 ready replies in English, Hinglish or Hindi."
                next="Copy or send a reply in one tap. Want it automatic for every lead? That's Ascend CRM."
              />
              <ReplyCoachTool />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </Layout>
  );
};

export default Lab;
