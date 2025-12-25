import { useParams, Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, Tag } from "lucide-react";
import { useEffect } from "react";

// Mock content database
const blogContent: Record<string, {
    title: string;
    category: string;
    date: string;
    readTime: string;
    content: React.ReactNode;
}> = {
    "building-ai-fitness-apps": {
        title: "Building AI-Powered Fitness Applications",
        category: "Product Development",
        date: "2024-12-20",
        readTime: "5 min read",
        content: (
            <>
                <p className="lead text-xl text-muted-foreground mb-8">
                    The fitness industry is undergoing a massive transformation driven by artificial intelligence. At Appfinity AI Studio, we've seen firsthand how AI can personalize wellness journeys. Here's a deep dive into our experience building FitnessMate.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4">The Personalization Challenge</h2>
                <p className="mb-6">
                    Generic workout plans fail because they don't adapt. Users have different goals, physical limitations, and equipment availability. Our goal was to build a system that acts like a real personal trainer—observing performance and adjusting the plan in real-time.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4">Integrating AI Models</h2>
                <p className="mb-6">
                    We utilized machine learning models to analyze user feedback. By tracking metrics like perceived exertion and completion rates, our algorithms can predict when a user is ready to increase weight or when they need a deload week. This dynamic adjustment keeps users in the "flow state"—challenged but not overwhelmed.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4">Key Lessons Learned</h2>
                <ul className="list-disc pl-6 mb-6 space-y-2">
                    <li><strong>Data is King:</strong> The quality of the AI's suggestions is directly tied to the quality of the input data. We focused heavily on designing an intuitive UI for data entry.</li>
                    <li><strong>Latency Matters:</strong> Users expect instant feedback. Optimizing model inference times on mobile devices was a critical engineering hurdle.</li>
                    <li><strong>Trust & Transparency:</strong> Users need to know <em>why</em> a plan changed. We added "Insight Cards" to explain the AI's reasoning.</li>
                </ul>
            </>
        )
    },
    "modern-web-tech-stack": {
        title: "Our Modern Web Technology Stack",
        category: "Engineering",
        date: "2024-12-15",
        readTime: "4 min read",
        content: (
            <>
                <p className="lead text-xl text-muted-foreground mb-8">
                    Choosing the right technology stack is crucial for long-term project success. Here is a look at the technologies we bet on at Appfinity AI Studio and why they work for us.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4">The Core: React & TypeScript</h2>
                <p className="mb-6">
                    We use React for its vast ecosystem and component-based architecture. TypeScript is non-negotiable for us; the type safety it provides prevents entire classes of bugs and makes refactoring reliable and safe.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4">Styling: Tailwind CSS</h2>
                <p className="mb-6">
                    Tailwind CSS has improved our development speed significantly. The utility-first approach allows us to build custom designs without fighting the framework. We combine it with Radix UI for accessible, unstyled primitives to ensure our apps are usable by everyone.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4">State & Data Fetching</h2>
                <p className="mb-6">
                    For server state, we rely on TanStack Query. It handles caching, deduplication, and background updates out of the box. This separation of server state from client state keeps our global stores clean and our apps snappy.
                </p>
            </>
        )
    },
    "automation-business-efficiency": {
        title: "Automation Tools for Business Efficiency",
        category: "Insights",
        date: "2024-12-10",
        readTime: "3 min read",
        content: (
            <>
                <p className="lead text-xl text-muted-foreground mb-8">
                    "If you do it more than three times, automate it." This mantra drives our internal operations and the solutions we build for clients. Automation isn't just about saving time; it's about reducing error and cognitive load.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4">Identifying Automation Opportunities</h2>
                <p className="mb-6">
                    The first step is auditing workflows. We look for high-volume, repetitive tasks that require low variance. Data entry, report generation, and social media scheduling are prime candidates.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4">Tools of the Trade</h2>
                <p className="mb-6">
                    We leverage platforms like n8n and Zapier to connect disparate systems. For example, a new lead form submission can automatically populate a CRM, notify the sales team via Slack, and schedule an email follow-up sequence—all without human intervention.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4">The Impact</h2>
                <p className="mb-6">
                    By automating these routine tasks, teams can focus on strategic work that requires creativity and empathy. Our clients often report a 30-40% reduction in administrative overhead after implementing our recommended automation pipelines.
                </p>
            </>
        )
    }
};

const BlogPost = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const post = id ? blogContent[id] : null;

    useEffect(() => {
        if (!post) {
            // Ideally redirect or show 404, but for now we render a "Not Found" state
        }
    }, [post, id]);

    if (!post) {
        return (
            <Layout>
                <div className="container py-32 text-center">
                    <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
                    <Button onClick={() => navigate("/blog")}>Back to Blog</Button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <article className="py-20 md:py-28">
                <div className="container max-w-3xl">
                    <Button variant="ghost" className="mb-8 pl-0 hover:pl-0 hover:bg-transparent text-muted-foreground hover:text-primary transition-colors" asChild>
                        <Link to="/blog" className="flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Blog
                        </Link>
                    </Button>

                    <div className="flex items-center gap-2 mb-6">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                            <Tag className="w-3.5 h-3.5" />
                            {post.category}
                        </span>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
                        {post.title}
                    </h1>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground mb-12 pb-8 border-b border-border">
                        <span className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {post.readTime}
                        </span>
                    </div>

                    <div className="prose prose-slate max-w-none dark:prose-invert">
                        {post.content}
                    </div>

                    {/* Keep the CTA at the bottom? Optional, but good for engagement */}
                    <div className="mt-16 pt-8 border-t border-border">
                        <h3 className="text-xl font-bold mb-4">Enjoyed this article?</h3>
                        <p className="text-muted-foreground mb-6">
                            Have a project in mind that involves {post.category}? We'd love to help.
                        </p>
                        <Button asChild>
                            <Link to="/contact">Contact Appfinity AI Studio</Link>
                        </Button>
                    </div>
                </div>
            </article>
        </Layout>
    );
};

export default BlogPost;
