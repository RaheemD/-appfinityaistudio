import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Play, Volume2, VolumeX, X } from "lucide-react";

// Small floating advert (picture-in-picture style) in the bottom-left corner.
// The clip lives in public/media so it is fetched only when this box appears.
const VIDEO_SRC = "/media/fitnessmate-ad.mp4";
const POSTER_SRC = "/media/fitnessmate-ad-poster.jpg";
const APP_URL = "https://play.google.com/store/apps/details?id=app.netlify.fitnessmate.twa";

const DISMISS_KEY = "appfinity:promo-video:v1";
const DISMISS_MS = 24 * 60 * 60 * 1000; // closed = stays away for a day
const SHOW_DELAY_MS = 2500; // let the page itself load first
const HIDDEN_ON = ["/privacy", "/terms"];

function wasDismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < DISMISS_MS;
  } catch {
    return false;
  }
}

function prefersLightweight(): boolean {
  try {
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    return Boolean(saveData) || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function PromoVideo() {
  const { pathname } = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [autoplay] = useState(() => !prefersLightweight());

  const hiddenHere = HIDDEN_ON.includes(pathname);
  const visible = mounted && !dismissed && !hiddenHere;

  // Appear a moment after the first page load, unless it was closed recently.
  useEffect(() => {
    if (wasDismissedRecently()) {
      setDismissed(true);
      return;
    }
    const timer = window.setTimeout(() => setMounted(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // Slide in, and start playing silently (browsers only allow muted autoplay).
  useEffect(() => {
    if (!visible) {
      setEntered(false);
      setPlaying(false);
      return;
    }
    const frame = window.requestAnimationFrame(() => setEntered(true));
    const video = videoRef.current;
    if (video && autoplay) {
      video.muted = true;
      setMuted(true);
      video.play().catch(() => setPlaying(false));
    }
    return () => window.cancelAnimationFrame(frame);
  }, [visible, autoplay]);

  // Don't keep playing in a background tab.
  useEffect(() => {
    if (!visible) return;
    let resume = false;
    const onVisibility = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden) {
        resume = !video.paused;
        video.pause();
      } else if (resume) {
        video.play().catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [visible]);

  if (!visible) return null;

  const setSound = (on: boolean) => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !on;
    setMuted(!on);
    if (!on) return;
    // Some browsers stop a silently-autoplaying clip when sound is switched on.
    // Keep it running; if sound is refused, carry on silently rather than freeze.
    const staySilent = () => {
      video.muted = true;
      setMuted(true);
      video.play().catch(() => undefined);
    };
    video.play().catch(staySilent);
    window.setTimeout(() => {
      if (videoRef.current === video && video.paused && !video.muted && !document.hidden) staySilent();
    }, 250);
  };

  const close = () => {
    videoRef.current?.pause();
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Private mode: it simply comes back on the next visit.
    }
    setDismissed(true);
  };

  // Tap the clip: start it if it isn't running, otherwise grow (with sound) or shrink (silent).
  const onVideoClick = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => undefined);
      return;
    }
    const next = !expanded;
    setExpanded(next);
    setSound(next);
  };

  const controlClass =
    "flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur-sm transition-colors hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

  return (
    <aside
      aria-label="FitnessMate app video"
      className={`fixed bottom-20 left-4 z-40 overflow-hidden rounded-2xl border border-border bg-black shadow-2xl transition-all duration-500 ease-out ${
        entered ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
      style={{
        width: expanded ? "min(70vw, 270px, calc((100dvh - 190px) * 0.5625))" : "clamp(128px, 34vw, 168px)",
      }}
    >
      <div className="relative aspect-[9/16] w-full">
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          poster={POSTER_SRC}
          muted={muted}
          loop
          playsInline
          preload={autoplay ? "auto" : "none"}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onClick={onVideoClick}
          className="h-full w-full cursor-pointer object-cover"
          aria-label="FitnessMate advert. Tap to enlarge and turn on sound."
        />

        {!playing && (
          <button
            type="button"
            onClick={onVideoClick}
            aria-label="Play video"
            className="absolute inset-0 flex items-center justify-center bg-black/30"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
              <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />
            </span>
          </button>
        )}

        <button type="button" onClick={close} aria-label="Close video" className={`absolute right-1.5 top-1.5 ${controlClass}`}>
          <X className="h-4 w-4" />
        </button>

        {playing && (
          <button
            type="button"
            onClick={() => setSound(muted)}
            aria-label={muted ? "Turn sound on" : "Turn sound off"}
            className={`absolute bottom-1.5 right-1.5 ${controlClass}`}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        )}
      </div>

      <a
        href={APP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-gradient-to-r from-primary to-accent px-2 py-2 text-center text-xs font-semibold text-white transition-opacity hover:opacity-90"
        aria-label="Get FitnessMate on Google Play (opens in a new tab)"
      >
        Get FitnessMate
      </a>
    </aside>
  );
}
