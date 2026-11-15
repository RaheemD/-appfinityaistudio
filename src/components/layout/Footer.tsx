import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.svg";

const footerLinks = {
  company: [
    { href: "/about", label: "About" },
    { href: "/products", label: "Products" },
    { href: "/services", label: "Services" },
    { href: "/lab", label: "AI Lab" },
    { href: "/blog", label: "Blog" },
    { href: "/contact", label: "Contact" },
  ],
  legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ],
};

// Public channel where the AI posts daily (netlify/lib/channel.mts).
const TELEGRAM_CHANNEL_URL = "https://t.me/appfinityai";

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="12" fill="#229ED9" />
    <path
      fill="#fff"
      d="M5.43 11.87l11.57-4.46c.54-.2 1.01.13.83.94l-1.97 9.28c-.15.66-.54.82-1.09.51l-3-2.21-1.45 1.39c-.16.16-.29.29-.6.29l.21-3.05 5.56-5.02c.24-.21-.05-.33-.38-.12l-6.87 4.33-2.96-.92c-.64-.2-.66-.64.15-.96z"
    />
  </svg>
);

const X_PROFILE_URL = "https://x.com/AppfinityDev";

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
);

export function Footer() {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();

  const handleNavigation = (href: string) => {
    window.scrollTo({ top: 0, behavior: "instant" });
    navigate(href);
  };

  return (
    <footer className="border-t border-border bg-surface-subtle">
      <div className="container pt-12 pb-24 md:pt-16 md:pb-16">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-4">
            <button
              onClick={() => handleNavigation("/")}
              className="flex items-center gap-3 group"
            >
              <div className="relative">
                <img
                  src={logo}
                  alt="Appfinity AI Studio"
                  className="h-10 w-10 object-contain transition-all duration-500 group-hover:scale-110 group-hover:rotate-6"
                />
                <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              <span className="text-lg font-semibold text-foreground">
                Appfinity AI Studio
              </span>
            </button>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              A technology studio focused on creating intelligent apps, web platforms, and automation-driven solutions.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={TELEGRAM_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition-colors duration-300 hover:border-[#229ED9]/60 hover:text-[#229ED9]"
                aria-label="Follow Appfinity AI Studio on Telegram (opens in a new tab)"
              >
                <TelegramIcon className="h-5 w-5 shrink-0" />
                Daily AI insights on Telegram
              </a>
              <a
                href={X_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-2 text-sm font-medium text-foreground transition-colors duration-300 hover:border-foreground/60"
                aria-label="Follow Appfinity AI Studio on X (opens in a new tab)"
              >
                <XIcon className="h-4 w-4 shrink-0" />
                Follow on X
              </a>
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <button
                    onClick={() => handleNavigation(link.href)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300 link-underline"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <button
                    onClick={() => handleNavigation(link.href)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300 link-underline"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Appfinity AI Studio — Intelligent apps.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="block sm:inline">MSME Registered | Govt. of India</span>
            <span className="block sm:inline"> Udyam Reg. No: UDYAM-MH-18-0507003</span>
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            GSTIN: 27AMDPD1089R1ZM
          </p>
        </div>
      </div>
    </footer>
  );
}
