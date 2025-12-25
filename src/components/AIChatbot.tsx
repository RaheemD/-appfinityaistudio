import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

const QUICK_ACTIONS = [
    "Tell me about your services",
    "View products",
    "Get pricing info",
    "Schedule a call",
];

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
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const getAIResponse = async (userMessage: string): Promise<string> => {
        // Simulate AI processing
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const lowerMessage = userMessage.toLowerCase();

        // Context-aware responses based on your business
        if (lowerMessage.includes("service") || lowerMessage.includes("what do you do")) {
            return "We offer 6 core services:\n\n• AI-Powered Application Development\n• Web & SaaS Development\n• Mobile App Development (Android & iOS)\n• Automation & AI Integrations\n• Custom Digital Solutions\n• UI/UX Design & Prototyping\n\nWhich area interests you most?";
        }

        if (lowerMessage.includes("product") || lowerMessage.includes("portfolio")) {
            return "We've built some exciting products:\n\n🏋️ FitnessMate - AI-powered workout and nutrition platform\n🎬 Next Frame Casting - Talent coordination and casting platform\n\nWould you like to learn more about either of these?";
        }

        if (lowerMessage.includes("price") || lowerMessage.includes("cost") || lowerMessage.includes("pricing")) {
            return "Our pricing varies based on project scope and requirements. We offer:\n\n• Fixed-price projects\n• Hourly consulting\n• Retainer agreements\n\nI'd recommend scheduling a free consultation to discuss your specific needs. Would you like me to direct you to our contact page?";
        }

        if (lowerMessage.includes("contact") || lowerMessage.includes("schedule") || lowerMessage.includes("call")) {
            return "Great! You can reach us at:\n\n📧 appfinity.ai.studio@gmail.com\n📞 +91 93213 64060\n\nOr visit our Contact page to send us a message directly. We typically respond within 1-2 business days.";
        }

        if (lowerMessage.includes("ai") || lowerMessage.includes("artificial intelligence")) {
            return "AI is at the core of what we do! We specialize in:\n\n✨ Building AI-powered applications\n🤖 Integrating AI into existing systems\n🧠 Creating intelligent automation\n📊 Delivering data-driven insights\n\nWe use cutting-edge AI technologies to solve real business problems. What's your AI use case?";
        }

        if (lowerMessage.includes("mobile") || lowerMessage.includes("app")) {
            return "We build high-performance native mobile apps for both Android and iOS! Our apps focus on:\n\n• Performance & UX\n• Offline capabilities\n• Platform-specific features\n• Seamless integrations\n\nCheck out FitnessMate on the Google Play Store as an example of our work!";
        }

        if (lowerMessage.includes("web") || lowerMessage.includes("website")) {
            return "We create modern web platforms and SaaS products with:\n\n🚀 Scalable architectures\n🔒 Strong security\n⚡ Fast performance\n📱 Responsive design\n\nWe use React, TypeScript, and modern tools to build production-ready applications.";
        }

        if (lowerMessage.includes("experience") || lowerMessage.includes("who are you")) {
            return "Appfinity AI Studio is a technology studio with 2+ years of experience building intelligent digital products. We've delivered 10+ projects including web platforms, mobile apps, and AI solutions. We're passionate about creating technology that solves real problems!";
        }

        if (lowerMessage.includes("hello") || lowerMessage.includes("hi") || lowerMessage.includes("hey")) {
            return "Hello! 👋 How can I help you today? Feel free to ask about our services, products, or anything else!";
        }

        if (lowerMessage.includes("thank") || lowerMessage.includes("thanks")) {
            return "You're very welcome! Feel free to reach out anytime. Is there anything else I can help you with?";
        }

        // Default intelligent response
        return "That's a great question! While I can provide information about our services, products, and general inquiries, I'd recommend reaching out to our team directly for more specific discussions.\n\nYou can:\n• Email us at appfinity.ai.studio@gmail.com\n• Call +91 93213 64060\n• Use our contact form\n\nIs there anything else I can help you with?";
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

        const response = await getAIResponse(input);

        const assistantMessage: Message = {
            role: "assistant",
            content: response,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
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
                {messages.length <= 2 && (
                    <div className="px-4 py-2 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Quick actions:</p>
                        <div className="flex flex-wrap gap-2">
                            {QUICK_ACTIONS.map((action, index) => (
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
                )}

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
