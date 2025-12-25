import { Layout } from "@/components/layout/Layout";
import { Cpu, Globe, Smartphone, Zap, Lightbulb, Palette, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Services = () => {
  const services = [
    {
      icon: Cpu,
      title: "AI-Powered Application Development",
      description: "We build intelligent apps that use AI to deliver personalised experiences and data-driven insights.",
    },
    {
      icon: Globe,
      title: "Web & SaaS Development",
      description: "We create modern web platforms and SaaS products with scalable architectures and strong security.",
    },
    {
      icon: Smartphone,
      title: "Mobile App Development",
      description: "We deliver native-like mobile apps for Android and iOS with a focus on performance and UX.",
    },
    {
      icon: Zap,
      title: "Automation & AI Integrations",
      description: "We automate workflows and integrate AI into existing systems to boost efficiency and capability.",
    },
    {
      icon: Lightbulb,
      title: "Custom Digital Solutions",
      description: "We design tailored software solutions to solve specific business challenges and drive growth.",
    },
    {
      icon: Palette,
      title: "UI/UX Design & Prototyping",
      description: "User-centered design that combines aesthetics with functionality for exceptional digital experiences.",
    },
  ];

  return (
    <Layout>
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="container relative">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold opacity-0 animate-fade-in">
              Our <span className="text-primary">Services</span>
            </h1>
            <p className="text-lg text-muted-foreground opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              Comprehensive technology solutions tailored to your unique needs. From concept to deployment, we've got you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="group relative p-8 rounded-2xl border border-border bg-card hover:shadow-xl transition-all duration-300 opacity-0 animate-fade-in card-hover"
                style={{ animationDelay: `${0.2 + index * 0.1}s` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    <service.icon className="w-7 h-7 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 opacity-0 animate-fade-in" style={{ animationDelay: "0.8s" }}>
            <div className="max-w-3xl mx-auto text-center p-12 rounded-3xl border border-border bg-card hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
              <h3 className="text-3xl font-bold mb-4">Have a project in mind?</h3>
              <p className="text-lg text-muted-foreground mb-8">
                Let's discuss how we can bring your ideas to life.
              </p>
              <Link to="/contact">
                <Button size="lg" className="group">
                  Contact Us
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Services;
