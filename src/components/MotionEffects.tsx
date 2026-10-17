import { useEffect } from "react";

// Site-wide motion helpers, mounted once in App.
//
// 1. Scroll reveal: elements with `animate-fade-in` stay paused (index.css, `.reveal-on`) until
//    they scroll into view, so visitors - especially on phones - actually see them animate in.
//    `reveal-on` is set in main.tsx before the first paint, and only when motion is welcome.
// 2. Card spotlight: feeds the mouse position to `.card-hover` cards (--mouse-x / --mouse-y).

const REVEAL_SELECTOR = ".animate-fade-in";
// Seen within this long of being observed = part of the page's entrance, keeps its stagger.
const ENTRANCE_WINDOW_MS = 250;
// Revealed later by scrolling: keep the stagger between siblings, but never wait longer than this.
const MAX_SCROLL_DELAY_S = 0.3;

const parseSeconds = (value: string) => {
  const first = value.split(",")[0].trim();
  return (first.endsWith("ms") ? parseFloat(first) / 1000 : parseFloat(first)) || 0;
};

export const MotionEffects = () => {
  useEffect(() => {
    if (!document.documentElement.classList.contains("reveal-on")) return;

    const observedAt = new WeakMap<Element, number>();

    const io = new IntersectionObserver(
      (entries) => {
        const now = performance.now();
        const visible = entries.filter((entry) => entry.isIntersecting);
        const scrolledIn = visible.filter((entry) => now - (observedAt.get(entry.target) ?? 0) > ENTRANCE_WINDOW_MS);

        if (scrolledIn.length > 0) {
          const delays = scrolledIn.map((entry) => parseSeconds(getComputedStyle(entry.target).animationDelay));
          const earliest = Math.min(...delays);
          scrolledIn.forEach((entry, i) => {
            (entry.target as HTMLElement).style.animationDelay = `${Math.min(delays[i] - earliest, MAX_SCROLL_DELAY_S)}s`;
          });
        }

        visible.forEach((entry) => {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -40px 0px" },
    );

    const observe = (el: Element) => {
      if (observedAt.has(el) || el.classList.contains("in-view")) return;
      observedAt.set(el, performance.now());
      io.observe(el);
    };

    document.querySelectorAll(REVEAL_SELECTOR).forEach(observe);

    // Pages render new sections on navigation (and after data loads), so watch for them.
    const mo = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(REVEAL_SELECTOR)) observe(node);
          node.querySelectorAll(REVEAL_SELECTOR).forEach(observe);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    let last: PointerEvent | null = null;

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      last = event;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const card = (last?.target as Element | null)?.closest?.(".card-hover") as HTMLElement | null;
        if (!card || !last) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mouse-x", `${last.clientX - rect.left}px`);
        card.style.setProperty("--mouse-y", `${last.clientY - rect.top}px`);
      });
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
};
