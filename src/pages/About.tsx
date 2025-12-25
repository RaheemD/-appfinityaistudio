import { Layout } from "@/components/layout/Layout";
import { Target, Award, Heart, Lightbulb, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import aboutHeroSvg from "@/assets/about-hero.svg";

const About = () => {
  const values = [
    {
      icon: Target,
      title: "Innovation First",
      description: "We stay ahead of the curve, constantly exploring new technologies and methodologies.",
    },
    {
      icon: Award,
      title: "Quality Driven",
      description: "Excellence is not an act, but a habit. We maintain the highest standards in everything we do.",
    },
    {
      icon: Heart,
      title: "Client-Centric",
      description: "Your success is our success. We build lasting partnerships through trust and transparency.",
    },
    {
      icon: Lightbulb,
      title: "Creative Solutions",
      description: "We think outside the box to solve complex problems with elegant, innovative solutions.",
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
              About <span className="text-primary">Appfinity AI Studio</span>
            </h1>
            <p className="text-lg text-muted-foreground opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              Transforming ideas into intelligent digital solutions
            </p>
          </div>

          {/* Who We Are Section */}
          <div className="mb-20 opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold">Who We Are</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    Appfinity AI Studio is a forward-thinking technology company specializing in AI-powered solutions and modern software development. We're passionate about leveraging cutting-edge technology to create products that make a real difference.
                  </p>
                  <p>
                    Founded with a vision to bridge the gap between complex technology and user-friendly applications, we've grown into a team of dedicated professionals who live and breathe innovation.
                  </p>
                  <p>
                    Our expertise spans across AI & Intelligent Automation, Mobile & Web Development, Cloud Solutions, and UI/UX Design. We don't just build software—we craft experiences that delight users and drive business growth.
                  </p>
                </div>
              </div>

              <div className="relative">
                <img
                  src={aboutHeroSvg}
                  alt="About Appfinity AI Studio"
                  className="w-full h-auto rounded-2xl"
                />
              </div>
            </div>
          </div>

          {/* Our Values */}
          <div className="mb-20 opacity-0 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Core Values</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                The principles that guide everything we do
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition-all duration-300 opacity-0 animate-fade-in card-hover group"
                  style={{ animationDelay: `${0.4 + index * 0.1}s` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    <value.icon className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                  <p className="text-muted-foreground text-sm">{value.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Our Journey */}
          <div className="mb-20 opacity-0 animate-fade-in" style={{ animationDelay: "0.8s" }}>
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">Our Journey</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Since our inception, we've been on a mission to democratize AI and make sophisticated technology accessible to businesses of all sizes. With over 2 years of dedicated work, we've successfully delivered 10+ projects and launched 2 live products that are making an impact in their respective markets.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Every project is an opportunity to learn, innovate, and push the boundaries of what's possible. We're proud of what we've accomplished, but we're even more excited about what's ahead.
              </p>
            </div>
          </div>

          <div className="text-center opacity-0 animate-fade-in" style={{ animationDelay: "1s" }}>
            <div className="max-w-2xl mx-auto p-12 rounded-3xl border border-border bg-card hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <h3 className="text-3xl font-bold mb-4">Want to work together?</h3>
              <p className="text-lg text-muted-foreground mb-8">
                We're open to new projects and collaborations — let's discuss how we can help.
              </p>
              <Link to="/contact">
                <Button size="lg" className="group">
                  Get in Touch
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

export default About;
