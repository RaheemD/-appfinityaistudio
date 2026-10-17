import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Scroll reveal (components/MotionEffects.tsx): set before the first paint so sections below the
// fold wait to animate until they're scrolled into view. Skipped when the visitor prefers less motion.
if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.documentElement.classList.add("reveal-on");
}

createRoot(document.getElementById("root")!).render(<App />);
