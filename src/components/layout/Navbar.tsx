import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "@/assets/logo.svg";

const navLinks = [
    { href: "/", label: "Home" },
    { href: "/products", label: "Products" },
    { href: "/services", label: "Services" },
    { href: "/blog", label: "Blog" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
];

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="relative">
                        <img
                            src={logo}
                            alt="Appfinity AI Studio"
                            className="h-9 w-9 object-contain transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <span className="text-lg font-semibold text-foreground hidden sm:block">
                        Appfinity AI Studio
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex md:items-center md:gap-1">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            to={link.href}
                            className={cn(
                                "relative px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg group",
                                location.pathname === link.href
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {link.label}
                            <span
                                className={cn(
                                    "absolute bottom-1 left-4 right-4 h-0.5 bg-primary rounded-full transition-transform duration-200 origin-left",
                                    location.pathname === link.href
                                        ? "scale-x-100"
                                        : "scale-x-0 group-hover:scale-x-100"
                                )}
                            />
                        </Link>
                    ))}
                    <ThemeToggle />
                </nav>

                {/* Mobile Menu Button */}
                <div className="flex items-center gap-2 md:hidden">
                    <ThemeToggle />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label="Toggle menu"
                    >
                        <span className={cn(
                            "transition-transform duration-200",
                            isOpen ? "rotate-90" : "rotate-0"
                        )}>
                            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </span>
                    </Button>
                </div>
            </div>

            {/* Mobile Navigation */}
            <div
                className={cn(
                    "overflow-hidden transition-all duration-300 ease-out md:hidden",
                    isOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
                )}
            >
                <nav className="border-t border-border bg-background">
                    <div className="container py-4 space-y-1">
                        {navLinks.map((link, index) => (
                            <Link
                                key={link.href}
                                to={link.href}
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                    "block px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg",
                                    location.pathname === link.href
                                        ? "text-primary bg-primary/5"
                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                                )}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </nav>
            </div>
        </header>
    );
}
