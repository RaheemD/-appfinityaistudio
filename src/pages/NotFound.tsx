import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";

const NotFound = () => {
  return (
    <Layout>
      <section className="py-20 md:py-32 relative overflow-hidden min-h-[80vh] flex items-center">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-soft" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: "1s" }} />
        </div>

        <div className="container relative">
          <div className="max-w-2xl mx-auto text-center">
            {/* 404 number with gradient */}
            <div className="mb-8 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <h1 className="text-9xl md:text-[12rem] font-bold text-gradient leading-none">
                404
              </h1>
            </div>

            {/* Icon */}
            <div
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center opacity-0 animate-scale-in"
              style={{ animationDelay: "0.3s" }}
            >
              <Search className="w-10 h-10 text-primary" />
            </div>

            {/* Message */}
            <div
              className="opacity-0 animate-fade-in"
              style={{ animationDelay: "0.4s" }}
            >
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Page Not Found
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
                The page you're looking for doesn't exist or has been moved. Let's get you back on track.
              </p>
            </div>

            {/* Action buttons */}
            <div
              className="flex flex-col sm:flex-row gap-4 justify-center opacity-0 animate-fade-in"
              style={{ animationDelay: "0.5s" }}
            >
              <Button asChild variant="hero" size="lg" className="group">
                <Link to="/">
                  <Home className="w-4 h-4" />
                  Back to Home
                </Link>
              </Button>
              <Button asChild variant="hero-outline" size="lg" className="group">
                <button onClick={() => window.history.back()}>
                  <ArrowLeft className="w-4 h-4" />
                  Go Back
                </button>
              </Button>
            </div>

            {/* Helpful links */}
            <div
              className="mt-12 opacity-0 animate-fade-in"
              style={{ animationDelay: "0.6s" }}
            >
              <p className="text-sm text-muted-foreground mb-4">Quick links:</p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/products" className="text-sm text-primary hover:underline">Products</Link>
                <Link to="/services" className="text-sm text-primary hover:underline">Services</Link>
                <Link to="/about" className="text-sm text-primary hover:underline">About</Link>
                <Link to="/contact" className="text-sm text-primary hover:underline">Contact</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default NotFound;
