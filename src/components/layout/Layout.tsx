import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { AIChatbot } from "@/components/AIChatbot";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <AIChatbot />
      <ScrollToTopButton />
    </div>
  );
}
