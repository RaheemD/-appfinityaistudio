import { useRef, useEffect, useState, type ReactNode } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, ArrowRight, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

// Generated server-side (netlify/functions/daily-insight.mts) via OpenRouter and cached once per day.
// Variant 0 is the day's featured model; the refresh button steps through the other variants.
const INSIGHT_ENDPOINT = "/.netlify/functions/daily-insight";
const INSIGHT_STORAGE_KEY = "appfinity:daily-insight";
const INSIGHT_TIMEOUT_MS = 65_000;

type DailyInsight = {
  date: string;
  variant?: number;
  variants?: number;
  topic: string;
  content: string;
  generatedAt: string;
};

const todayUtc = () => new Date().toISOString().slice(0, 10);

const isDailyInsight = (value: unknown): value is DailyInsight => {
  const v = value as DailyInsight;
  return (
    !!v &&
    typeof v.date === "string" &&
    typeof v.topic === "string" &&
    typeof v.content === "string" &&
    v.content.trim().length > 0 &&
    typeof v.generatedAt === "string"
  );
};

const readCachedInsight = (): DailyInsight | null => {
  try {
    const parsed = JSON.parse(localStorage.getItem(INSIGHT_STORAGE_KEY) ?? "null");
    return isDailyInsight(parsed) && parsed.date === todayUtc() ? parsed : null;
  } catch {
    return null;
  }
};

const writeCachedInsight = (insight: DailyInsight) => {
  try {
    localStorage.setItem(INSIGHT_STORAGE_KEY, JSON.stringify(insight));
  } catch {
    // Storage unavailable (private mode, quota) - caching is optional.
  }
};

const fetchInsight = async (variant: number, signal: AbortSignal): Promise<DailyInsight> => {
  const url = variant > 0 ? `${INSIGHT_ENDPOINT}?v=${variant}` : INSIGHT_ENDPOINT;
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  // Without the function deployed, the SPA fallback returns index.html, so check the type too.
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(`Insight request failed (${response.status})`);
  }
  const data = await response.json();
  if (!isDailyInsight(data)) throw new Error("Insight response was malformed");
  return data;
};

// Minimal, safe Markdown rendering (headings, bullets, **bold**) without injecting HTML.
const renderInline = (text: string): ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part
    ),
  );

const renderInsight = (content: string): ReactNode[] => {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc pl-5 space-y-1 my-2">
        {bullets.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    const bullet = line.match(/^(?:[-*•]|\d+\.)\s+(.*)$/);
    const heading = line.match(/^#{1,6}\s+(.*)$/);

    if (bullet) {
      bullets.push(bullet[1]);
      continue;
    }
    flushBullets();
    if (!line) continue;
    if (heading) {
      blocks.push(
        <h4 key={`h-${blocks.length}`} className="text-base font-semibold text-foreground mt-4 mb-1 first:mt-0">
          {renderInline(heading[1].replace(/\*\*/g, ""))}
        </h4>,
      );
    } else {
      blocks.push(
        <p key={`p-${blocks.length}`} className="my-2">
          {renderInline(line)}
        </p>,
      );
    }
  }
  flushBullets();
  return blocks;
};

const Blog = () => {
  const [initialInsight] = useState(readCachedInsight);
  const [insight, setInsight] = useState<DailyInsight | null>(initialInsight);
  const [loading, setLoading] = useState(!initialInsight);
  const [failed, setFailed] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  const loadInsight = async (variant = 0) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), INSIGHT_TIMEOUT_MS);

    setLoading(true);
    setFailed(false);
    try {
      const data = await fetchInsight(variant, controller.signal);
      if (requestRef.current !== controller) return;
      setInsight(data);
      writeCachedInsight(data);
    } catch (error) {
      if (requestRef.current !== controller) return;
      console.error("Error loading daily insight:", error);
      setFailed(true);
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!initialInsight) loadInsight();
    return () => {
      const pending = requestRef.current;
      requestRef.current = null;
      pending?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [requestedVariant, setRequestedVariant] = useState(initialInsight?.variant ?? 0);

  const loadVariant = (variant: number) => {
    setRequestedVariant(variant);
    loadInsight(variant);
  };

  // Show the next model; if nothing has loaded yet, just retry the current one.
  const showNextInsight = () => {
    const total = insight?.variants ?? 0;
    loadVariant(insight && total > 1 ? ((insight.variant ?? 0) + 1) % total : requestedVariant);
  };

  const insightDate = insight ? new Date(`${insight.date}T12:00:00Z`) : new Date();
  const lastUpdated = insight
    ? new Date(insight.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  const featuredPosts = [
    {
      id: "building-ai-fitness-apps",
      title: "Building AI-Powered Fitness Applications",
      excerpt: "The fitness industry is undergoing a massive transformation driven by artificial intelligence.",
      date: "December 20, 2024",
      readTime: "5 min read",
      category: "Product Development",
      image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=800",
    },
    {
      id: "modern-web-tech-stack",
      title: "Our Modern Web Technology Stack",
      excerpt: "Choosing the right technology stack is crucial for long-term project success.",
      date: "December 15, 2024",
      readTime: "4 min read",
      category: "Engineering",
      image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=800",
    },
    {
      id: "automation-business-efficiency",
      title: "Automation Tools for Business Efficiency",
      excerpt: "If you do it more than three times, automate it. This mantra drives our internal operations.",
      date: "December 10, 2024",
      readTime: "3 min read",
      category: "Insights",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
    },
  ];

  return (
    <Layout>
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="container relative">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 opacity-0 animate-fade-in">
              Insights & <span className="text-primary">Innovation</span>
            </h1>
            <p className="text-lg text-muted-foreground opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              Exploring the frontiers of AI, technology, and digital transformation.
            </p>
          </div>

          {/* Daily AI Insight Section - The "Smart" Feature */}
          <div className="mb-20 opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="bg-gradient-to-br from-primary/5 via-card to-card border border-primary/20 rounded-3xl p-8 md:p-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                DAILY AI GENERATED INSIGHT
              </div>

              <div className="grid md:grid-cols-3 gap-8 items-start">
                <div className="md:col-span-1 space-y-4">
                  <button
                    onClick={showNextInsight}
                    disabled={loading}
                    className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2 hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Show another AI model"
                    title="Show another AI model"
                  >
                    <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  <h2 className="text-2xl font-bold">Today's Featured Model</h2>
                  {insight && <p className="text-lg font-semibold text-primary">{insight.topic}</p>}
                  <p className="text-muted-foreground">
                    Deep dive into the latest AI tools, their features, and real-world applications.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{insightDate.toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="md:col-span-2">
                  {loading ? (
                    <div className="h-48 flex items-center justify-center border border-dashed border-border rounded-xl bg-muted/30">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Generating today's featured tool review...</p>
                      </div>
                    </div>
                  ) : insight ? (
                    <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none leading-relaxed">
                      {renderInsight(insight.content)}
                    </div>
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center gap-3 border border-dashed border-border rounded-xl bg-muted/30 text-center px-6">
                      <p className="text-sm text-muted-foreground">
                        Today's insight is taking a little longer than usual. Please check back shortly.
                      </p>
                      <Button variant="outline" size="sm" onClick={() => loadVariant(requestedVariant)}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try again
                      </Button>
                    </div>
                  )}
                  {failed && insight && !loading && (
                    <p className="mt-3 text-xs text-muted-foreground">Couldn't refresh right now - showing the latest available insight.</p>
                  )}
                  <div className="mt-4 pt-4 border-t border-border flex justify-end items-center text-xs text-muted-foreground">
                    {lastUpdated && <span>Updated: {lastUpdated}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Standard Blog Grid */}
          <h3 className="text-2xl font-bold mb-8">Latest Articles</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredPosts.map((post, index) => (
              <Card key={post.id} className="group card-hover overflow-hidden border-border opacity-0 animate-fade-in" style={{ animationDelay: `${0.3 + index * 0.1}s` }}>
                <div className="aspect-video w-full overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <CardHeader>
                  <div className="flex items-center gap-2 text-xs font-medium text-primary mb-2">
                    <span className="bg-primary/10 px-2 py-1 rounded-full">{post.category}</span>
                  </div>
                  <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                    <Link to={`/blog/${post.id}`}>{post.title}</Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-3">
                    {post.excerpt}
                  </CardDescription>
                </CardContent>
                <CardFooter className="flex justify-between items-center text-sm text-muted-foreground border-t border-border pt-4 mt-auto">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {post.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {post.readTime}
                    </span>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Blog;
