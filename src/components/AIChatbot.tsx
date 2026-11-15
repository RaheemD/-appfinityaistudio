import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Sparkles, Loader2, RotateCcw, UserRound, BellRing, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMarkdown } from "@/components/ChatMarkdown";

// "team" = a reply from the Appfinity team sent from Telegram (live chat takeover).
// "note" = a small status line in the chat; never sent to the AI.
interface Message {
    role: "user" | "assistant" | "team" | "note";
    content: string;
    timestamp: Date;
    liveId?: string; // team messages: id from /api/chat-live
    sentToTeam?: boolean; // user messages delivered to the team instead of the AI
}

const MESSAGE_ROLES = new Set(["user", "assistant", "team", "note"]);

type AIResponse = {
    content: string;
    closeChat?: boolean;
    nextConversation?: ConversationState;
};

type ConversationGoal = "ai_app" | "web_saas" | "mobile_app" | "automation";

type ConversationStage =
    | "default"
    | "choose_goal"
    | "collect_industry"
    | "collect_timeline"
    | "collect_budget";

type ConversationState = {
    stage: ConversationStage;
    goal?: ConversationGoal;
    industry?: string;
    timeline?: string;
    budget?: string;
};

// Replies come from the AI assistant (netlify/functions/chat.mts, GLM 5.3 Flash via OpenRouter),
// streamed as plain text. If it can't be reached, the rule-based replies below take over.
const CHAT_ENDPOINT = "/api/chat";
const CHAT_TIMEOUT_MS = 60_000;
const CHAT_HISTORY_LIMIT = 12;
const MAX_INPUT_CHARS = 2000;
const CHAT_STORAGE_KEY = "appfinity:chat:v1";

// Live chat takeover (netlify/lib/live-chat.mts): once a visitor asks about pricing or hiring, the
// team is alerted on Telegram and can reply; the widget checks /api/chat-live for those replies.
const LIVE_ENDPOINT = "/api/chat-live";
const LIVE_STORAGE_KEY = "appfinity:chat-live:v1";
const LIVE_IDLE_MS = 30 * 60 * 1000; // stop checking after this long without activity
const LIVE_FAST_POLL_MS = 5_000; // chat open and recently active
const LIVE_SLOW_POLL_MS = 15_000;
const LIVE_RECENT_MS = 3 * 60 * 1000;
const TEAM_NOTICE = "🔔 Our team has been notified and may join this chat to help you personally.";

type LiveState = {
    id: string; // conversation id (UUID)
    watched: boolean; // the server is sharing this chat with the team
    activeAt: number; // last activity (ms); checking stops after LIVE_IDLE_MS
    cursor: string; // id of the last team message received
};

const newConversationId = () => {
    try {
        if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    } catch {
        return "";
    }
};

const freshLiveState = (): LiveState => ({ id: newConversationId(), watched: false, activeAt: 0, cursor: "" });

const loadLiveState = (): LiveState => {
    try {
        const saved = JSON.parse(sessionStorage.getItem(LIVE_STORAGE_KEY) ?? "null");
        if (typeof saved?.id === "string" && /^[0-9a-f-]{36}$/.test(saved.id)) {
            return {
                id: saved.id,
                watched: saved.watched === true,
                activeAt: typeof saved.activeAt === "number" ? saved.activeAt : 0,
                cursor: typeof saved.cursor === "string" ? saved.cursor : "",
            };
        }
    } catch {
        // Storage unavailable or corrupt - start fresh.
    }
    return freshLiveState();
};

const saveLiveState = (state: LiveState) => {
    try {
        sessionStorage.setItem(LIVE_STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Storage unavailable - live replies just won't survive a reload.
    }
};

const isLiveActive = (state: LiveState, now = Date.now()) => state.watched && now - state.activeAt < LIVE_IDLE_MS;

type LivePoll = { messages: { id: string; text: string; at: string }[]; human: boolean; watching: boolean };

const pollLive = async (state: LiveState, signal: AbortSignal): Promise<LivePoll | null> => {
    const response = await fetch(LIVE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ c: state.id, after: state.cursor }),
        signal,
    });
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return null;
    const data = await response.json();
    if (!Array.isArray(data?.messages)) return null;
    return {
        messages: data.messages.filter((m: unknown) => typeof (m as { id?: unknown })?.id === "string" && typeof (m as { text?: unknown })?.text === "string"),
        human: data.human === true,
        watching: data.watching !== false,
    };
};

// What the AI sees: team replies are labelled, notes are left out.
const toApiHistory = (history: Message[]) =>
    history
        .filter((m) => m.role !== "note")
        .slice(-CHAT_HISTORY_LIMIT)
        .map(({ role, content }) =>
            role === "team" ? { role: "assistant", content: `[Appfinity team] ${content}` } : { role, content },
        );

const GREETING =
    "👋 Hi! I'm the AI assistant for Appfinity AI Studio. Ask me about our services, products or your project idea — or anything about AI and technology. How can I help?";

const BASE_QUICK_ACTIONS = ["What services do you offer?", "Show me your products", "How much does a project cost?", "Talk to the team"];

const stageQuickActions = (state: ConversationState): string[] => {
    switch (state.stage) {
        case "choose_goal":
            return ["AI-powered app", "Website / SaaS product", "Mobile app", "Automations & AI integrations"];
        case "collect_industry":
            return ["Ecommerce", "Healthcare", "Education", "Fintech"];
        case "collect_timeline":
            return ["ASAP", "2 weeks", "1 month"];
        case "collect_budget":
            return ["Not sure", "$5k–$10k", "$10k–$25k"];
        default:
            return BASE_QUICK_ACTIONS;
    }
};

const greetingMessage = (): Message => ({ role: "assistant", content: GREETING, timestamp: new Date() });

// The conversation survives page reloads within the same browser tab.
const loadSavedMessages = (): Message[] => {
    try {
        const saved = JSON.parse(sessionStorage.getItem(CHAT_STORAGE_KEY) ?? "null");
        if (Array.isArray(saved) && saved.length > 0) {
            const messages: Message[] = saved
                .filter((m) => MESSAGE_ROLES.has(m?.role) && typeof m?.content === "string" && m.content)
                .map((m) => {
                    const timestamp = new Date(m.timestamp);
                    return {
                        role: m.role,
                        content: m.content,
                        timestamp: isNaN(timestamp.getTime()) ? new Date() : timestamp,
                        ...(typeof m.liveId === "string" ? { liveId: m.liveId } : {}),
                        ...(m.sentToTeam === true ? { sentToTeam: true } : {}),
                    };
                });
            if (messages.length > 0) return messages;
        }
    } catch {
        // Storage unavailable or corrupt - start fresh.
    }
    return [greetingMessage()];
};

const saveMessages = (messages: Message[]) => {
    try {
        sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
        // Storage unavailable - the chat still works, it just won't survive a reload.
    }
};

class ChatRequestError extends Error {
    constructor(readonly status: number) {
        super(`Chat request failed (${status})`);
    }
}

// Streams the assistant's reply, calling onText with the full text received so far.
// `live` is the server's X-Chat-Live header: "watch" (the team can join) or "human" (the message
// went to the team member who is answering; there is no AI reply).
const streamAIReply = async (
    history: Message[],
    live: LiveState,
    signal: AbortSignal,
    onText: (text: string) => void,
): Promise<{ text: string; live: string }> => {
    const response = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            messages: toApiHistory(history),
            ...(live.id ? { conversationId: live.id } : {}),
            ...(live.watched ? { live: true } : {}),
        }),
        signal,
    });
    // Without the function deployed, the SPA fallback answers with HTML, so check the type too.
    if (!response.ok || !response.headers.get("content-type")?.startsWith("text/plain")) {
        throw new ChatRequestError(response.status);
    }
    const liveHeader = response.headers.get("x-chat-live") ?? "";
    if (liveHeader === "human") return { text: "", live: liveHeader };
    if (!response.body) throw new ChatRequestError(response.status);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        onText(text);
    }
    text += decoder.decode();
    onText(text);
    return { text: text.trim(), live: liveHeader };
};

// ---- Rule-based fallback (used only when the AI assistant is unavailable) ----

const normalizeText = (text: string) =>
    text
        .toLowerCase()
        .replace(/[^a-z0-9\s']/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const pickGoal = (normalized: string): ConversationGoal | undefined => {
    if (/\b(automation|automate|integrat(e|ion)s?)\b/.test(normalized)) return "automation";
    if (/\bmobile\b/.test(normalized) || /\b(android|ios)\b/.test(normalized)) return "mobile_app";
    if (/\b(web|website|saas|dashboard|portal)\b/.test(normalized)) return "web_saas";
    if (/\bai\b/.test(normalized) || normalized.includes("artificial intelligence")) return "ai_app";
    if (/\b(app|apps)\b/.test(normalized)) return "web_saas";
    return undefined;
};

const pickTimeline = (normalized: string): string | undefined => {
    if (/\b(asap|urgent|immediately|now)\b/.test(normalized)) return "ASAP";
    const match = normalized.match(/\b(\d{1,2})\s*(day|days|week|weeks|month|months)\b/);
    if (match) return `${match[1]} ${match[2]}`;
    if (/\b(q1|q2|q3|q4)\b/.test(normalized)) return normalized.match(/\b(q1|q2|q3|q4)\b/)?.[1]?.toUpperCase();
    return undefined;
};

const pickBudget = (normalized: string): string | undefined => {
    if (/\b(not sure|unsure|don'?t know|no idea)\b/.test(normalized)) return "Not sure yet";
    const moneyMatch = normalized.match(/(₹|\$|usd|inr)\s?(\d[\d,]*(?:\.\d+)?)(k|m)?/i);
    if (moneyMatch) {
        const currency = moneyMatch[1].toUpperCase();
        const amount = moneyMatch[2];
        const suffix = moneyMatch[3]?.toUpperCase() ?? "";
        return `${currency} ${amount}${suffix}`;
    }
    const rangeMatch = normalized.match(/\b(\d[\d,]*)\s*(k|m)?\s*(to|-)\s*(\d[\d,]*)\s*(k|m)?\b/);
    if (rangeMatch) {
        const a = `${rangeMatch[1]}${(rangeMatch[2] ?? "").toUpperCase()}`;
        const b = `${rangeMatch[4]}${(rangeMatch[5] ?? "").toUpperCase()}`;
        return `${a} - ${b}`;
    }
    return undefined;
};

const goalLabel = (goal?: ConversationGoal) => {
    switch (goal) {
        case "ai_app":
            return "AI-powered app";
        case "web_saas":
            return "Website / SaaS product";
        case "mobile_app":
            return "Mobile app";
        case "automation":
            return "Automations & AI integrations";
        default:
            return "Project";
    }
};

const getFallbackResponse = (userMessage: string, currentConversation: ConversationState): AIResponse => {
    const normalized = normalizeText(userMessage);

    const isEndIntent =
        /^(nothing|no|nope|nah|done|all good|all set|close|exit|quit|bye|goodbye)$/.test(normalized) ||
        /^(no (thanks|thank you))$/.test(normalized) ||
        /^(that'?s all)$/.test(normalized) ||
        /^(no\s+(nothing|nothing else|nothing more))$/.test(normalized) ||
        /^(nothing\s+(else|more))$/.test(normalized) ||
        /\bno\b.*\bnothing\b/.test(normalized) ||
        /\bnothing\b.*\belse\b/.test(normalized);

    if (isEndIntent) {
        return {
            content: "Got it — thanks for chatting. If you need anything later, just open this chat again.",
            closeChat: true,
            nextConversation: { stage: "default" },
        };
    }

    if (normalized === "reset" || normalized === "start over" || normalized === "restart") {
        return {
            content: "Done — starting fresh. What would you like help with (AI app, website/SaaS, mobile app, or automations)?",
            nextConversation: { stage: "choose_goal" },
        };
    }

    if (/^(thanks|thank you|thx|ty|appreciate it)$/.test(normalized) || /\bthank(s| you)?\b/.test(normalized)) {
        return {
            content: "You're welcome! If anything comes up later, I’m here.",
        };
    }

    const isUncertainIntent =
        /^(not sure|unsure|i'?m not sure|don'?t know|do not know|no idea|not really|maybe|it depends)$/.test(normalized) ||
        normalized.includes("did not think about") ||
        normalized.includes("didn't think about") ||
        normalized.includes("havent thought about") ||
        normalized.includes("haven't thought about");

    if (isUncertainIntent) {
        return {
            content:
                "No problem — we can narrow it down quickly.\n\nWhich best matches what you want?\n• Build an AI-powered app\n• Website / SaaS product\n• Mobile app\n• Automations & AI integrations\n\nReply with one of these (or tell me your industry), and I’ll guide you from there.",
            nextConversation: { ...currentConversation, stage: "choose_goal" },
        };
    }

    if (currentConversation.stage === "choose_goal") {
        const goal = pickGoal(normalized);
        if (!goal) {
            return {
                content:
                    "Which one fits best?\n• Build an AI-powered app\n• Website / SaaS product\n• Mobile app\n• Automations & AI integrations",
                nextConversation: currentConversation,
            };
        }

        return {
            content: `Great — for your ${goalLabel(goal)}, what industry is it for (e.g., ecommerce, healthcare, education)?`,
            nextConversation: { ...currentConversation, goal, stage: "collect_industry" },
        };
    }

    if (currentConversation.stage === "collect_industry") {
        const industry = normalized.length >= 3 && normalized.length <= 60 ? userMessage.trim() : undefined;
        if (!industry) {
            return {
                content: "What industry is this for (e.g., ecommerce, healthcare, education)?",
                nextConversation: currentConversation,
            };
        }
        return {
            content: "Nice. What timeline are you aiming for (ASAP, 2 weeks, 1 month, etc.)?",
            nextConversation: { ...currentConversation, industry, stage: "collect_timeline" },
        };
    }

    if (currentConversation.stage === "collect_timeline") {
        const timeline = pickTimeline(normalized) ?? (normalized.length >= 2 && normalized.length <= 40 ? userMessage.trim() : undefined);
        if (!timeline) {
            return {
                content: "What timeline are you aiming for (ASAP, 2 weeks, 1 month, etc.)?",
                nextConversation: currentConversation,
            };
        }
        return {
            content: "Got it. Do you have a budget range in mind? (It’s okay to say “not sure”.)",
            nextConversation: { ...currentConversation, timeline, stage: "collect_budget" },
        };
    }

    if (currentConversation.stage === "collect_budget") {
        const budget = pickBudget(normalized) ?? (normalized.length >= 2 && normalized.length <= 40 ? userMessage.trim() : undefined);
        if (!budget) {
            return {
                content: "Do you have a budget range in mind? (It’s okay to say “not sure”.)",
                nextConversation: currentConversation,
            };
        }

        const summary = [
            `• Goal: ${goalLabel(currentConversation.goal)}`,
            currentConversation.industry ? `• Industry: ${currentConversation.industry}` : undefined,
            currentConversation.timeline ? `• Timeline: ${currentConversation.timeline}` : undefined,
            `• Budget: ${budget}`,
        ]
            .filter(Boolean)
            .join("\n");

        return {
            content:
                `Perfect — here’s what I captured:\n${summary}\n\nNext step: share this with our team and we’ll propose the best approach.\n\n📧 info@appfinityaistudio.com\n📞 +91 93213 64060`,
            nextConversation: { stage: "default" },
        };
    }

    // Context-aware responses based on your business
    if (/\b(help|what can you do|capabilities|options)\b/.test(normalized)) {
        return {
            content:
                "I can help with:\n\n• Understanding our services (AI, web/SaaS, mobile, automation, UI/UX)\n• Picking the right approach for your idea\n• Rough scoping questions (industry, timeline, budget)\n• How to contact us\n\nWhat are you trying to build?",
            nextConversation: { ...currentConversation, stage: "choose_goal" },
        };
    }

    if (/\b(service|services)\b/.test(normalized) || normalized.includes("what do you do") || normalized.includes("what you do")) {
        return {
            content:
                "We offer 6 core services:\n\n• AI-Powered Application Development\n• Web & SaaS Development\n• Mobile App Development (Android & iOS)\n• Automation & AI Integrations\n• Custom Digital Solutions\n• UI/UX Design & Prototyping\n\nWhich area interests you most?",
            nextConversation: { ...currentConversation, stage: "choose_goal" },
        };
    }

    if (/\b(product|products|portfolio|work|projects)\b/.test(normalized)) {
        return {
            content:
                "We've built some exciting products:\n\nLive now:\n🏋️ FitnessMate - AI-powered workout and nutrition platform (on Google Play)\n🎬 Next Frame Casting - Talent coordination and casting platform\n🌿 FairOrigin Global - Brand & trade platform for global sourcing and export\n\nIn development:\n🌍 WorldLens - AI-powered PWA travel companion\n📈 Ascend CRM - AI CRM that turns WhatsApp and Gmail into scored leads\n\nSee them all on our Products page (/products). Want to explore one of these?",
        };
    }

    if (/\b(price|cost|pricing|budget|quote)\b/.test(normalized)) {
        return {
            content:
                "Pricing depends on scope, timeline, and complexity. We offer:\n\n• Fixed-price projects\n• Hourly consulting\n• Retainer agreements\n\nIf you share your goal + timeline + budget range, I can guide you on the best fit. What are you building?",
            nextConversation: { ...currentConversation, stage: "choose_goal" },
        };
    }

    if (/\b(contact|schedule|call|meeting|consultation|team)\b/.test(normalized)) {
        return {
            content:
                "Great! You can reach us at:\n\n📧 info@appfinityaistudio.com\n📞 +91 93213 64060\n💬 WhatsApp: https://wa.me/919321364060\n\nOr visit our Contact page (/contact) to send us a message directly. We typically respond within 1-2 business days.",
        };
    }

    if (/\b(ui|ux|design|prototype|prototyping)\b/.test(normalized)) {
        return {
            content:
                "We do UI/UX design & prototyping too — including wireframes, clickable prototypes, and production-ready UI systems.\n\nAre you redesigning an existing product or starting from scratch?",
        };
    }

    if (/\b(automation|automate|integrat(e|ion)s?|workflow|zapier|make\.com)\b/.test(normalized)) {
        return {
            content:
                "We build automations and AI integrations (lead capture, support workflows, data pipelines, internal tools).\n\nWhat would you like to automate, and which tools are you using today?",
            nextConversation: { ...currentConversation, goal: "automation", stage: "collect_industry" },
        };
    }

    if (/\bai\b/.test(normalized) || normalized.includes("artificial intelligence")) {
        return {
            content:
                "AI is at the core of what we do! We specialize in:\n\n✨ Building AI-powered applications\n🤖 Integrating AI into existing systems\n🧠 Creating intelligent automation\n📊 Delivering data-driven insights\n\nWe use cutting-edge AI technologies to solve real business problems. What's your AI use case?",
            nextConversation: { ...currentConversation, goal: "ai_app", stage: "collect_industry" },
        };
    }

    if (/\bmobile\b/.test(normalized) || /\b(app|apps)\b/.test(normalized) || /\bandroid\b/.test(normalized) || /\bios\b/.test(normalized)) {
        return {
            content:
                "We build high-performance native mobile apps for both Android and iOS! Our apps focus on:\n\n• Performance & UX\n• Offline capabilities\n• Platform-specific features\n• Seamless integrations\n\nCheck out FitnessMate on the Google Play Store as an example of our work!",
            nextConversation: { ...currentConversation, goal: "mobile_app", stage: "collect_industry" },
        };
    }

    if (/\b(web|website|saas|dashboard|portal)\b/.test(normalized)) {
        return {
            content:
                "We create modern web platforms and SaaS products with:\n\n🚀 Scalable architectures\n🔒 Strong security\n⚡ Fast performance\n📱 Responsive design\n\nWe use React, TypeScript, and modern tools to build production-ready applications.",
            nextConversation: { ...currentConversation, goal: "web_saas", stage: "collect_industry" },
        };
    }

    if (normalized.includes("experience") || normalized.includes("who are you") || normalized.includes("about you") || normalized.includes("about appfinity")) {
        return {
            content:
                "Appfinity AI Studio is a technology studio with 2+ years of experience building intelligent digital products. We've launched 3 live products and have 10+ projects in progress across web platforms, mobile apps, and AI solutions. We're passionate about creating technology that solves real problems!",
        };
    }

    if (/\b(lab|blueprint|x ray|xray)\b/.test(normalized)) {
        return {
            content:
                "Try our free AI Lab (/lab):\n\n• App Blueprint - turn your app idea into a one-page plan (/lab?tool=blueprint)\n• Automation X-Ray - see how to automate a task you repeat (/lab?tool=xray)",
        };
    }

    if (/\b(privacy|terms)\b/.test(normalized)) {
        return {
            content:
                "You can find our legal pages here:\n\n• Privacy Policy: /privacy\n• Terms of Service: /terms",
        };
    }

    if (/\b(hello|hi|hey)\b/.test(normalized)) {
        return {
            content:
                "Hello! 👋 How can I help you today? Feel free to ask about our services, products, or anything else!",
        };
    }

    const directGoal = pickGoal(normalized);
    if (directGoal) {
        return {
            content: `Great — for your ${goalLabel(directGoal)}, what industry is it for (e.g., ecommerce, healthcare, education)?`,
            nextConversation: { ...currentConversation, goal: directGoal, stage: "collect_industry" },
        };
    }

    return {
        content:
            "That's a great question! While I can provide information about our services, products, and general inquiries, I'd recommend reaching out to our team directly for more specific discussions.\n\nYou can:\n• Email us at info@appfinityaistudio.com\n• Call +91 93213 64060\n• Use our contact form (/contact)\n\nIs there anything else I can help you with?",
    };
};

// ---- Chat widget ----

export const AIChatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>(loadSavedMessages);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [streaming, setStreaming] = useState(false);
    const [conversation, setConversation] = useState<ConversationState>({ stage: "default" });
    const [live, setLive] = useState<LiveState>(loadLiveState);
    const [teamHere, setTeamHere] = useState(false);
    const [unread, setUnread] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef(messages);
    const requestRef = useRef<AbortController | null>(null);
    const liveRef = useRef(live);
    const isOpenRef = useRef(isOpen);

    useEffect(() => {
        messagesRef.current = messages;
        if (!streaming) saveMessages(messages);
        messagesEndRef.current?.scrollIntoView({ behavior: streaming ? "auto" : "smooth", block: "end" });
    }, [messages, streaming]);

    useEffect(() => () => requestRef.current?.abort(), []);

    useEffect(() => {
        liveRef.current = live;
        saveLiveState(live);
    }, [live]);

    useEffect(() => {
        isOpenRef.current = isOpen;
        if (isOpen) setUnread(0);
    }, [isOpen]);

    // Checks for replies from the team while this chat is shared with them.
    useEffect(() => {
        if (!live.id || !live.watched) return;
        let stopped = false;
        let waitingForVisible = false;
        let timer: number | undefined;
        let controller: AbortController | null = null;

        const schedule = (delay?: number) => {
            if (stopped) return;
            const state = liveRef.current;
            const now = Date.now();
            if (!isLiveActive(state, now)) {
                setTeamHere(false);
                return;
            }
            const fast = isOpenRef.current && now - state.activeAt < LIVE_RECENT_MS;
            timer = window.setTimeout(tick, delay ?? (fast ? LIVE_FAST_POLL_MS : LIVE_SLOW_POLL_MS));
        };

        const tick = async () => {
            if (stopped) return;
            if (document.visibilityState === "hidden") {
                waitingForVisible = true;
                return;
            }
            // Never insert a team message while an AI reply is streaming into the last bubble.
            if (requestRef.current) return schedule();

            controller = new AbortController();
            const abortTimer = window.setTimeout(() => controller?.abort(), 10_000);
            try {
                const result = await pollLive(liveRef.current, controller.signal);
                if (stopped || !result) return;
                setTeamHere(result.human);
                const known = new Set(messagesRef.current.map((m) => m.liveId).filter(Boolean));
                const fresh = result.messages.filter((m) => !known.has(m.id));
                if (fresh.length > 0) {
                    setMessages((prev) => [
                        ...prev,
                        ...fresh.map((m): Message => {
                            const at = new Date(m.at);
                            return { role: "team", content: m.text, timestamp: isNaN(at.getTime()) ? new Date() : at, liveId: m.id };
                        }),
                    ]);
                    if (!isOpenRef.current) setUnread((count) => count + fresh.length);
                }
                const last = result.messages[result.messages.length - 1];
                const next: LiveState = {
                    ...liveRef.current,
                    cursor: last ? last.id : liveRef.current.cursor,
                    activeAt: fresh.length > 0 ? Date.now() : liveRef.current.activeAt,
                    watched: result.watching,
                };
                liveRef.current = next;
                setLive(next);
            } catch {
                // Network blip - try again on the next check.
            } finally {
                window.clearTimeout(abortTimer);
                controller = null;
                schedule();
            }
        };

        const onVisibility = () => {
            if (document.visibilityState === "visible" && waitingForVisible) {
                waitingForVisible = false;
                tick();
            }
        };
        document.addEventListener("visibilitychange", onVisibility);
        schedule(1_000);

        return () => {
            stopped = true;
            window.clearTimeout(timer);
            controller?.abort();
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [live.id, live.watched, live.activeAt, isOpen]);

    const markLiveActivity = useCallback(() => {
        const next = { ...liveRef.current, watched: true, activeAt: Date.now() };
        liveRef.current = next;
        setLive(next);
    }, []);

    const appendAssistant = (content: string) =>
        setMessages((prev) => [...prev, { role: "assistant", content, timestamp: new Date() }]);

    const appendNote = (content: string) => setMessages((prev) => [...prev, { role: "note", content, timestamp: new Date() }]);

    const sendMessage = async (raw: string) => {
        const text = raw.trim().slice(0, MAX_INPUT_CHARS);
        if (!text || isTyping) return;

        const userMessage: Message = { role: "user", content: text, timestamp: new Date() };
        const history = [...messagesRef.current, userMessage];
        setMessages(history);
        setInput("");
        setIsTyping(true);

        const controller = new AbortController();
        requestRef.current = controller;
        const timeout = window.setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);
        let started = false;
        let announceTeam = false;

        try {
            const { text: reply, live: liveMode } = await streamAIReply(history, liveRef.current, controller.signal, (partial) => {
                if (!partial.trim()) return;
                if (!started) {
                    started = true;
                    setStreaming(true);
                    setMessages((prev) => [...prev, { role: "assistant", content: partial, timestamp: new Date() }]);
                } else {
                    setMessages((prev) => [...prev.slice(0, -1), { ...prev[prev.length - 1], content: partial }]);
                }
            });
            if (liveMode === "human") {
                // A team member is answering: the message went to them, not the AI.
                setMessages((prev) => prev.map((m) => (m === userMessage ? { ...m, sentToTeam: true } : m)));
                setTeamHere(true);
                markLiveActivity();
                return;
            }
            if (liveMode === "watch") {
                announceTeam = !liveRef.current.watched;
                markLiveActivity();
            }
            if (!reply) throw new ChatRequestError(204);
            setConversation({ stage: "default" });
        } catch (error) {
            if (requestRef.current !== controller) return; // widget unmounted or superseded
            console.error("Chat assistant unavailable, using fallback replies:", error);
            if (started) {
                // Keep what already arrived; just note the interruption.
                setMessages((prev) => [
                    ...prev.slice(0, -1),
                    { ...prev[prev.length - 1], content: `${prev[prev.length - 1].content}\n\n(Sorry, my reply was cut off. Please ask again.)` },
                ]);
            } else if (error instanceof ChatRequestError && error.status === 429) {
                appendAssistant(
                    "You're sending messages a little fast — please wait a minute and try again. You can also reach the team on WhatsApp: https://wa.me/919321364060",
                );
            } else {
                const response = getFallbackResponse(text, conversation);
                appendAssistant(response.content);
                if (response.nextConversation) setConversation(response.nextConversation);
                if (response.closeChat) window.setTimeout(() => setIsOpen(false), 1200);
            }
        } finally {
            window.clearTimeout(timeout);
            if (requestRef.current === controller) {
                requestRef.current = null;
                setStreaming(false);
                setIsTyping(false);
                if (announceTeam) appendNote(TEAM_NOTICE);
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    const resetChat = () => {
        requestRef.current?.abort();
        requestRef.current = null;
        setStreaming(false);
        setIsTyping(false);
        setConversation({ stage: "default" });
        setMessages([greetingMessage()]);
        // A new chat is a new conversation: team replies to the old one won't appear here.
        const fresh = freshLiveState();
        liveRef.current = fresh;
        setLive(fresh);
        setTeamHere(false);
        setUnread(0);
    };

    return (
        <>
            {/* Chat Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-primary to-accent text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group ${isOpen ? "scale-0" : "scale-100"
                    }`}
                aria-label={unread > 0 ? `Open chat (${unread} new ${unread === 1 ? "message" : "messages"} from our team)` : "Open chat"}
            >
                <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                {unread > 0 ? (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold leading-5 text-center ring-2 ring-background">
                        {unread > 9 ? "9+" : unread}
                    </span>
                ) : (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                )}
            </button>

            {/* Chat Window */}
            <div
                className={`fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[380px] h-[100dvh] sm:h-[600px] sm:max-h-[80vh] bg-card border-0 sm:border border-border sm:rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ${isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
                    }`}
                aria-hidden={!isOpen}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5 sm:rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                            {teamHere ? <UserRound className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-white" />}
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">{teamHere ? "Appfinity team" : "AI Assistant"}</h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                {teamHere ? "A team member is chatting with you" : "Online now"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={resetChat}
                            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                            aria-label="Start a new chat"
                            title="Start a new chat"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                            aria-label="Close chat"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4" aria-live="polite">
                    {messages.map((message, index) =>
                        message.role === "note" ? (
                            <div key={index} className="flex justify-center">
                                <p className="max-w-[90%] text-xs text-muted-foreground text-center flex items-start gap-1.5 px-3 py-2 rounded-xl bg-muted/50">
                                    <BellRing className="w-3.5 h-3.5 mt-px shrink-0 text-primary" aria-hidden="true" />
                                    <span>{message.content.replace(/^🔔\s*/, "")}</span>
                                </p>
                            </div>
                        ) : (
                            <div
                                key={index}
                                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[85%] min-w-0 rounded-2xl px-4 py-3 ${message.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : message.role === "team"
                                            ? "bg-primary/10 text-foreground border border-primary/30"
                                            : "bg-muted text-foreground"
                                        }`}
                                >
                                    {message.role === "team" && (
                                        <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                                            <UserRound className="w-3.5 h-3.5" aria-hidden="true" />
                                            Appfinity team
                                        </p>
                                    )}
                                    {message.role === "user" ? (
                                        <p className="text-sm whitespace-pre-line leading-relaxed break-words">{message.content}</p>
                                    ) : (
                                        <ChatMarkdown content={message.content} />
                                    )}
                                    <p className="text-xs opacity-60 mt-1 flex items-center gap-1">
                                        {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        {message.sentToTeam && (
                                            <>
                                                <span aria-hidden="true">·</span>
                                                <Check className="w-3 h-3" aria-hidden="true" />
                                                Sent to the team
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>
                        ),
                    )}

                    {isTyping && !streaming && (
                        <div className="flex justify-start">
                            <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm text-muted-foreground">{teamHere ? "Sending..." : "Thinking..."}</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                <div className="px-4 py-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Quick actions:</p>
                    <div className="flex flex-wrap gap-2">
                        {stageQuickActions(conversation).map((action, index) => (
                            <button
                                key={index}
                                onClick={() => sendMessage(action)}
                                disabled={isTyping}
                                className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {action}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="p-4 border-t border-border">
                    <div className="flex gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask me anything..."
                            className="flex-1 rounded-xl"
                            maxLength={MAX_INPUT_CHARS}
                            disabled={isTyping}
                            aria-label="Message"
                        />
                        <Button
                            type="submit"
                            size="icon"
                            className="rounded-xl shrink-0"
                            disabled={isTyping || !input.trim()}
                            aria-label="Send message"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
};
