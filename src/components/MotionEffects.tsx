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
    const pending = new Set<Element>();

    const reveal = (targets: Element[]) => {
      if (targets.length === 0) return;
      const now = performance.now();
      const scrolledIn = targets.filter((el) => now - (observedAt.get(el) ?? 0) > ENTRANCE_WINDOW_MS);

      if (scrolledIn.length > 0) {
        const delays = scrolledIn.map((el) => parseSeconds(getComputedStyle(el).animationDelay));
        const earliest = Math.min(...delays);
        scrolledIn.forEach((el, i) => {
          (el as HTMLElement).style.animationDelay = `${Math.min(delays[i] - earliest, MAX_SCROLL_DELAY_S)}s`;
        });
      }

      targets.forEach((el) => {
        el.classList.add("in-view");
        pending.delete(el);
        io.unobserve(el);
      });
    };

    const io = new IntersectionObserver(
      (entries) => reveal(entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target)),
      { rootMargin: "0px 0px -40px 0px" },
    );

    // Safety net: a fast fling (or a slow device) can carry an element past the viewport between two
    // rendered frames, so the observer never sees it intersect. Reveal anything scrolled to or past.
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const limit = window.innerHeight - 40;
        reveal([...pending].filter((el) => el.getBoundingClientRect().top < limit));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const observe = (el: Element) => {
      if (observedAt.has(el) || el.classList.contains("in-view")) return;
      observedAt.set(el, performance.now());
      pending.add(el);
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
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
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
