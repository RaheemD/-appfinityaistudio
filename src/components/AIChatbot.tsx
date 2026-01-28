import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

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

const BASE_QUICK_ACTIONS = ["Tell me about your services", "View products", "Get pricing info", "Schedule a call"];

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

export const AIChatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "👋 Hi! I'm the AI assistant for Appfinity AI Studio. I can help you learn about our services, products, or answer any questions. How can I assist you today?",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [conversation, setConversation] = useState<ConversationState>({ stage: "default" });
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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

    const getAIResponse = async (userMessage: string, currentConversation: ConversationState): Promise<AIResponse> => {
        await new Promise((resolve) => setTimeout(resolve, 1000));

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
                    `Perfect — here’s what I captured:\n${summary}\n\nNext step: share this with our team and we’ll propose the best approach.\n\n📧 appfinity.ai.studio@gmail.com\n📞 +91 93213 64060`,
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
                    "We've built some exciting products:\n\n🏋️ FitnessMate - AI-powered workout and nutrition platform\n🎬 Next Frame Casting - Talent coordination and casting platform\n🌍 WorldLens - AI-powered PWA travel companion\n📈 Ascend CRM - AI-first CRM platform\n\nWant to explore one of these?",
            };
        }

        if (/\b(price|cost|pricing|budget|quote)\b/.test(normalized)) {
            return {
                content:
                    "Pricing depends on scope, timeline, and complexity. We offer:\n\n• Fixed-price projects\n• Hourly consulting\n• Retainer agreements\n\nIf you share your goal + timeline + budget range, I can guide you on the best fit. What are you building?",
                nextConversation: { ...currentConversation, stage: "choose_goal" },
            };
        }

        if (/\b(contact|schedule|call|meeting|consultation)\b/.test(normalized)) {
            return {
                content:
                    "Great! You can reach us at:\n\n📧 appfinity.ai.studio@gmail.com\n📞 +91 93213 64060\n\nOr visit our Contact page to send us a message directly. We typically respond within 1-2 business days.",
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
                    "Appfinity AI Studio is a technology studio with 2+ years of experience building intelligent digital products. We've delivered 10+ projects including web platforms, mobile apps, and AI solutions. We're passionate about creating technology that solves real problems!",
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

        // Default intelligent response
        return {
            content:
                "That's a great question! While I can provide information about our services, products, and general inquiries, I'd recommend reaching out to our team directly for more specific discussions.\n\nYou can:\n• Email us at appfinity.ai.studio@gmail.com\n• Call +91 93213 64060\n• Use our contact form\n\nIs there anything else I can help you with?",
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: Message = {
            role: "user",
            content: input,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsTyping(true);

        const response = await getAIResponse(input, conversation);

        const assistantMessage: Message = {
            role: "assistant",
            content: response.content,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);

        if (response.nextConversation) {
            setConversation(response.nextConversation);
        }

        if (response.closeChat) {
            window.setTimeout(() => setIsOpen(false), 1200);
        }
    };

    const handleQuickAction = (action: string) => {
        setInput(action);
    };

    return (
        <>
            {/* Chat Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-primary to-accent text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group ${isOpen ? "scale-0" : "scale-100"
                    }`}
                aria-label="Open chat"
            >
                <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </button>

            {/* Chat Window */}
            <div
                className={`fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[380px] h-[100dvh] sm:h-[600px] sm:max-h-[80vh] bg-card border-0 sm:border border-border sm:rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ${isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0"
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5 sm:rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">AI Assistant</h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                Online now
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-foreground"
                                    }`}
                            >
                                <p className="text-sm whitespace-pre-line leading-relaxed">{message.content}</p>
                                <p className="text-xs opacity-60 mt-1">
                                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </p>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm text-muted-foreground">Thinking...</span>
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
                                onClick={() => handleQuickAction(action)}
                                className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
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
                            placeholder="Type your message..."
                            className="flex-1 rounded-xl"
                            disabled={isTyping}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            className="rounded-xl shrink-0"
                            disabled={isTyping || !input.trim()}
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
};
