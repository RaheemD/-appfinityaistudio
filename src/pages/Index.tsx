import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { TypingEffect } from "@/components/TypingEffect";
import { CountUp } from "@/components/CountUp";

const Index = () => {
  const services = [
    {
      icon: "📱",
      title: "AI-Powered Apps",
      description: "Custom mobile and web apps using AI to solve real problems and improve user experiences.",
    },
    {
      icon: "🌐",
      title: "Web Platforms",
      description: "Modern, scalable web and SaaS platforms built with best practices for reliability and growth.",
    },
    {
      icon: "⚡",
      title: "Automation Solutions",
      description: "Workflow and automation tools that reduce manual work and improve operational efficiency.",
    },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-background to-muted/20">
        <div className="container relative z-10 py-20 md:py-32">
          <div className="mx-auto max-w-4xl text-center space-y-8">
            <div className="space-y-4 opacity-0 animate-fade-in">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Building{" "}
                <TypingEffect
                  words={["AI-Powered"]}
                  typingSpeed={100}
                  deletingSpeed={50}
                  delayBetweenWords={3000}
                />
                <br />
                Apps & Digital Solutions
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
                We build intelligent web and mobile products and automation tools that help businesses scale.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <Link to="/products">
                <Button size="lg" className="group">
                  Explore Products
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline">
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 md:py-20 border-y border-border bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center space-y-2 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="text-4xl md:text-5xl font-bold text-primary">
                <CountUp end={10} suffix="+" duration={2000} />
              </div>
              <p className="text-sm md:text-base text-muted-foreground">Projects Delivered</p>
            </div>
            <div className="text-center space-y-2 opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="text-4xl md:text-5xl font-bold text-primary">
                <CountUp end={2} suffix="+" duration={2000} />
              </div>
              <p className="text-sm md:text-base text-muted-foreground">Years Experience</p>
            </div>
            <div className="text-center space-y-2 opacity-0 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <div className="text-4xl md:text-5xl font-bold text-primary">
                <CountUp end={2} duration={2000} />
              </div>
              <p className="text-sm md:text-base text-muted-foreground">Live Products</p>
            </div>
            <div className="text-center space-y-2 opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <div className="text-4xl md:text-5xl font-bold text-primary">
                <CountUp end={6} duration={2000} />
              </div>
              <p className="text-sm md:text-base text-muted-foreground">Services Offered</p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Build Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold opacity-0 animate-fade-in">
              What We Build
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              We focus on creating scalable digital products that make a real impact.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {services.map((service, index) => (
              <div
                key={index}
                className="group p-8 rounded-2xl border border-border bg-card hover:shadow-xl transition-all duration-300 opacity-0 animate-fade-in card-hover"
                style={{ animationDelay: `${0.2 + index * 0.1}s` }}
              >
                <div className="text-4xl mb-4">{service.icon}</div>
                <h3 className="text-xl font-semibold mb-3">{service.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold opacity-0 animate-fade-in">
              Ready to build something great?
            </h2>
            <p className="text-lg text-muted-foreground opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              Have a project or want to explore our products? We help teams ship high-quality software faster.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <Link to="/services">
                <Button size="lg" className="group">
                  Explore Services
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline">
                  Get in Touch
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
