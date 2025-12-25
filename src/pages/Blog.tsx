import { useRef, useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, ArrowRight, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

// Use Pollinations.ai for free text generation without API key
const generateArticle = async (seed: string) => {
  try {
    const prompt = `Write a tech spotlight review on the AI model '${seed}' as if it is today's featured tool.
    
    Structure the response clearly with these headers:
    1. **What is it?**: A 1-sentence technical definition.
    2. **Key Features**: Bullets of its top 3 technical capabilities.
    3. **Best Work Use Cases**: Exactly what tasks professionals should use it for (e.g., coding, creative writing, data analysis).
    
    Tone: Professional, educational, and specific (like a tech YouTuber). Max 250 words.`;

    // Pollinations Text API (Free, no key)
    const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
    const text = await response.text();
    return text;
  } catch (error) {
    console.error("Error generating article:", error);
    return "Failed to generate AI insight. Please try again later.";
  }
};

const Blog = () => {
  const [dailyArticle, setDailyArticle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchDailyInsight = async () => {
    setLoading(true);
    // Specific trending AI models/tools
    const topics = [
      "OpenAI GPT-4o",
      "Google Gemini 1.5 Pro",
      "Anthropic Claude 3.5 Sonnet",
      "Meta Llama 3.1",
      "Midjourney v6",
      "OpenAI Sora",
      "GitHub Copilot Workspace",
      "Mistral Large 2",
      "Perplexity Pro",
      "Stable Diffusion 3 Medium"
    ];
    // Get random topic
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];

    const content = await generateArticle(randomTopic);
    setDailyArticle(content);
    setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setLoading(false);
  };

  useEffect(() => {
    fetchDailyInsight();
  }, []);

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
                    onClick={fetchDailyInsight}
                    disabled={loading}
                    className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2 hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Regenerate insight"
                    title="Regenerate insight"
                  >
                    <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  <h2 className="text-2xl font-bold">Today's Featured Model</h2>
                  <p className="text-muted-foreground">
                    Deep dive into the latest AI tools, their features, and real-world applications.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{date.toLocaleDateString()}</span>
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
                  ) : (
                    <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                      <div className="whitespace-pre-line leading-relaxed">
                        {dailyArticle ? (
                          dailyArticle.replace(/^"/, '').replace(/"$/, '') // Remove quotes if present
                        ) : (
                          "Unable to generate insight today. Check back tomorrow!"
                        )}
                      </div>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-border flex justify-end items-center text-xs text-muted-foreground">
                    <span>Updated: {lastUpdated}</span>
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
