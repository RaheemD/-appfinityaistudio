import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import fitnessmateLogo from "@/assets/fitnessmate-icon.png";
import nextframeLogo from "@/assets/nextframe-icon.png";

const Products = () => {
    const products = [
        {
            id: 1,
            name: "FitnessMate",
            tagline: "Your AI-Powered Fitness Companion",
            description: "Transform your fitness journey with personalized workout plans, nutrition tracking, and AI-driven insights. FitnessMate adapts to your goals and progress.",
            features: [
                "Personalized workout plans",
                "Nutrition tracking & meal plans",
                "Progress analytics & insights",
                "Community challenges",
            ],
            status: "Live on Play Store",
            statusColor: "bg-green-500/10 text-green-600 border-green-500/20",
            logo: fitnessmateLogo,
            url: "https://play.google.com/store/apps/details?id=app.netlify.fitnessmate.twa",
            buttonText: "View on Play Store",
        },
        {
            id: 2,
            name: "Next Frame Casting",
            tagline: "Casting Made Simple",
            description: "A revolutionary platform connecting talent with opportunities. Streamline your casting process with advanced search, portfolio management, and seamless communication.",
            features: [
                "Advanced talent search",
                "Digital portfolio management",
                "Audition scheduling",
                "Real-time collaboration tools",
            ],
            status: "Coming Soon",
            statusColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
            logo: nextframeLogo,
            url: "https://nextframecasting.netlify.app/",
            buttonText: "Visit Website",
        },
    ];

    return (
        <Layout>
            <section className="py-16 md:py-24 relative overflow-hidden">
                <div className="container relative">
                    <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                        <h1 className="text-4xl md:text-5xl font-bold opacity-0 animate-fade-in">
                            Our <span className="text-primary">Products</span>
                        </h1>
                        <p className="text-lg text-muted-foreground opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
                            Innovative solutions designed to solve real-world problems and deliver exceptional user experiences.
                        </p>
                    </div>

                    <div className="grid gap-12 max-w-5xl mx-auto">
                        {products.map((product, index) => (
                            <div
                                key={product.id}
                                className="group relative rounded-3xl border border-border bg-card overflow-hidden hover:shadow-2xl transition-all duration-500 opacity-0 animate-fade-in"
                                style={{ animationDelay: `${0.2 + index * 0.1}s` }}
                            >
                                <div className="relative p-8 md:p-12">
                                    <div className="flex flex-col md:flex-row gap-8">
                                        {/* Logo */}
                                        <div className="flex-shrink-0">
                                            <img
                                                src={product.logo}
                                                alt={`${product.name} logo`}
                                                className="w-24 h-24 rounded-3xl object-cover shadow-lg"
                                            />
                                        </div>

                                        <div className="flex-1 space-y-6">
                                            <div>
                                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                    <h2 className="text-3xl font-bold">{product.name}</h2>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${product.statusColor}`}>
                                                        {product.status}
                                                    </span>
                                                </div>
                                                <p className="text-primary font-medium text-lg">{product.tagline}</p>
                                            </div>

                                            <p className="text-muted-foreground text-lg leading-relaxed">
                                                {product.description}
                                            </p>

                                            <div className="grid sm:grid-cols-2 gap-3">
                                                {product.features.map((feature, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                                        <span className="text-sm">{feature}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="pt-4">
                                                <Button
                                                    size="lg"
                                                    className="group/btn"
                                                    onClick={() => window.open(product.url, '_blank')}
                                                >
                                                    {product.buttonText}
                                                    <ExternalLink className="ml-2 h-4 w-4 transition-all group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* More Products Card */}
                    <div className="max-w-5xl mx-auto mt-12 opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
                        <a
                            href="https://github.com/RaheemD"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                        >
                            <div className="relative rounded-2xl border border-border bg-card p-8 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                            <ArrowRight className="w-5 h-5 text-muted-foreground rotate-45" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold mb-2">More products in development</h3>
                                            <p className="text-muted-foreground">
                                                We're actively building new AI products — check out our GitHub for updates.
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="lg" asChild>
                                        <span>View on GitHub</span>
                                    </Button>
                                </div>
                            </div>
                        </a>
                    </div>
                </div>
            </section>
        </Layout>
    );
};

export default Products;
