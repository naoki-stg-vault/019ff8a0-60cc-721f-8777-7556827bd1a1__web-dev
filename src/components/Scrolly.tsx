"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/components/LanguageProvider";
import type { Copy, Lang } from "@/lib/content";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const Arrow = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block h-[0.7em] w-[0.7em] translate-y-[-0.08em] ${className}`}
  >
    <path d="M7 17l9.2-9.2M17 17V7H7" />
  </svg>
);

const UI = {
  en: { processHead: "One clear thread, from first call to launch." },
  es: { processHead: "Un solo hilo, de la primera llamada al lanzamiento." },
} as const;

const SECTION_IDS = [
  "top",
  "positioning",
  "build",
  "process",
  "projects",
  "fit",
  "investment",
  "contact",
];

const RAIL_LABELS: Record<string, { en: string; es: string }> = {
  top: { en: "Intro", es: "Portada" },
  positioning: { en: "Positioning", es: "Posicionamiento" },
  build: { en: "What I build", es: "Lo que construyo" },
  process: { en: "Process", es: "Proceso" },
  projects: { en: "Selected work", es: "Trabajo seleccionado" },
  fit: { en: "A good fit", es: "Un buen encaje" },
  investment: { en: "Investment", es: "Inversión" },
  contact: { en: "Contact", es: "Contacto" },
};

function Eyebrow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`font-sans text-[11px] uppercase tracking-[0.3em] text-flame ${className}`}
    >
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Reveal: subtle fade + rise when a block enters the viewport        */
/* ------------------------------------------------------------------ */

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVis(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVis(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.05 } // Adjusted for earlier trigger on mobile
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  const translateY = isMobile ? "16px" : "18px";
  const duration = isMobile ? "0.65s" : "0.55s"; // Adjusted for smoother mobile transition

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? "none" : `translateY(${translateY})`,
        transition: `opacity ${duration} cubic-bezier(0.22, 1, 0.36, 1) ${delay}s, transform ${duration} cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scroll pin hook: reports 0..1 progress through a runway            */
/* ------------------------------------------------------------------ */

function usePin<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const cb = useRef<(p: number) => void>(() => {});

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = r.height - vh;
      cb.current(total > 0 ? clamp01(-r.top / total) : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return {
    ref,
    on: (fn: (p: number) => void) => {
      cb.current = fn;
    },
  };
}

/* ------------------------------------------------------------------ */
/* Runway: tall scroll container with a sticky full-screen stage      */
/* ------------------------------------------------------------------ */

function Runway({
  h = "300vh",
  id,
  ref,
  children,
}: {
  h?: string;
  id?: string;
  ref?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}) {
  return (
    <div ref={ref} id={id} data-slide className="relative" style={{ height: h }}>
      <div className="sticky top-0 h-svh overflow-hidden">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Words: progressive word-by-word text highlight                     */
/* ------------------------------------------------------------------ */

function Words({
  text,
  p,
  range = [0, 1],
  color = "var(--color-flame)",
}: {
  text: string;
  p: number;
  range?: [number, number];
  color?: string;
}) {
  const [a, b] = range;
  const span = Math.max(0.0001, b - a);
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => {
        const t = words.length > 1 ? i / (words.length - 1) : 1;
        const on = clamp01((p - a) / span) >= t;
        return (
          <span key={i}>
            <span
              className="transition-colors duration-300"
              style={{ color: on ? color : "inherit" }}
            >
              {w}
            </span>{" "}
          </span>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Progress bar + chapter rail (dots, active changes with scroll)     */
/* ------------------------------------------------------------------ */

function ProgressRail() {
  const { lang } = useLang();
  const [active, setActive] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        let idx = 0;
        for (let i = 0; i < SECTION_IDS.length; i++) {
          const el = document.getElementById(SECTION_IDS[i]);
          if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.55) {
            idx = i;
          }
        }
        setActive(idx);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <>
      <nav
        className="fixed right-5 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-center gap-1.5 lg:flex"
        aria-label="Chapters"
      >
        {SECTION_IDS.map((id, i) => {
          const label = RAIL_LABELS[id][lang];
          const isActive = i === active;
          return (
            <a
              key={id}
              href={`#${id}`}
              title={label}
              aria-label={label}
              aria-current={isActive ? "true" : undefined}
              className="flex h-8 w-8 items-center justify-center rounded-full"
            >
              <span
                aria-hidden
                className={`block h-2 w-2 rounded-full transition-all duration-300 ${
                  isActive ? "scale-125 bg-flame" : "bg-faint/60 hover:bg-cream"
                }`}
              />
            </a>
          );
        })}
      </nav>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 01 · HERO (normal flow, entrance on load)                          */
/* ------------------------------------------------------------------ */

function HeroAbstractBg() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden"
      aria-hidden="true"
    >
      {/* Ambient luminous glow orbs */}
      <div
        className="absolute -top-[12%] left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-gradient-to-br from-flame/30 via-[#F5A623]/20 to-transparent blur-[120px] md:h-[750px] md:w-[750px] animate-pulse"
        style={{ animationDuration: "7s" }}
      />
      <div
        className="absolute top-1/4 -left-[10%] h-[360px] w-[360px] rounded-full bg-gradient-to-tr from-flame/20 via-[#E4A358]/25 to-transparent blur-[100px] md:h-[500px] md:w-[500px]"
      />
      <div
        className="absolute bottom-10 -right-[8%] h-[340px] w-[340px] rounded-full bg-gradient-to-tl from-flame/20 via-[#DFB88F]/30 to-transparent blur-[90px] md:h-[460px] md:w-[460px]"
      />

      {/* Generative & architectural abstract SVG composition */}
      <svg
        className="absolute h-full w-full max-w-[1400px] opacity-80"
        viewBox="0 0 1200 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="heroGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-flame)" stopOpacity="0.55" />
            <stop offset="50%" stopColor="var(--color-flame)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--color-cream)" stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="heroGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--color-flame)" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#D97706" stopOpacity="0.25" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </linearGradient>
          <pattern id="heroDotGrid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.3" fill="var(--color-cream)" fillOpacity="0.14" />
          </pattern>
        </defs>

        {/* Minimal dot grids in opposite corners */}
        <rect x="50" y="80" width="260" height="180" fill="url(#heroDotGrid)" opacity="0.65" />
        <rect x="900" y="580" width="240" height="200" fill="url(#heroDotGrid)" opacity="0.65" />

        {/* Outer tilted abstract orbit */}
        <ellipse
          cx="600"
          cy="420"
          rx="520"
          ry="290"
          stroke="var(--color-cream)"
          strokeOpacity="0.08"
          strokeWidth="1"
          transform="rotate(16 600 420)"
        />

        {/* Intermediate dashed orbit in flame gradient */}
        <ellipse
          cx="600"
          cy="420"
          rx="450"
          ry="250"
          stroke="url(#heroGrad1)"
          strokeWidth="1.5"
          strokeDasharray="6 8"
          transform="rotate(-12 600 420)"
        />

        {/* Inner dynamic contour orbit */}
        <ellipse
          cx="600"
          cy="420"
          rx="320"
          ry="180"
          stroke="url(#heroGrad2)"
          strokeWidth="2"
          transform="rotate(-4 600 420)"
        />

        {/* Flowing abstract wave ribbon lines */}
        <path
          d="M-100 520 C 250 350, 420 620, 750 430 C 980 300, 1150 480, 1300 400"
          stroke="url(#heroGrad1)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M-50 450 C 300 280, 520 540, 850 380 C 1050 280, 1200 420, 1350 350"
          stroke="var(--color-flame)"
          strokeOpacity="0.3"
          strokeWidth="1.5"
          strokeDasharray="5 7"
        />
        <path
          d="M-120 590 C 200 480, 480 680, 780 490 C 1000 370, 1180 560, 1320 460"
          stroke="var(--color-cream)"
          strokeOpacity="0.08"
          strokeWidth="1"
        />

        {/* Aesthetic design ticks & coordinates */}
        <g opacity="0.75">
          <circle cx="280" cy="380" r="4.5" fill="var(--color-flame)" />
          <circle cx="280" cy="380" r="11" stroke="var(--color-flame)" strokeWidth="1" strokeOpacity="0.45" />
          <circle cx="930" cy="460" r="5" fill="var(--color-flame)" />
          <circle cx="930" cy="460" r="14" stroke="var(--color-flame)" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.5" />
          <line x1="600" y1="120" x2="600" y2="150" stroke="var(--color-flame)" strokeWidth="1.5" strokeOpacity="0.4" />
          <line x1="585" y1="135" x2="615" y2="135" stroke="var(--color-flame)" strokeWidth="1.5" strokeOpacity="0.4" />
        </g>
      </svg>
    </div>
  );
}

function Hero({ t, lang }: { t: Copy; lang: Lang }) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const enter = entered ? 1 : 0;
  const headline = lang === "en" ? "WEBSITES + WEBAPP MVPs,\nBUILT TO DO THEIR JOB." : "SITIOS WEB + MVPs DE WEBAPPS,\nCONSTRUIDOS PARA HACER SU TRABAJO.";
  const strip = t.hero.strip;

  return (
    <section
      id="top"
      className="relative flex min-h-svh w-full items-center justify-center overflow-hidden px-6 pt-safe-mobile md:px-14"
    >
      <HeroAbstractBg />
      <div className="mx-auto w-full max-w-6xl">
        <div
          className="text-center"
          style={{
            opacity: enter,
            transform: `translateY(${(1 - enter) * 44}px)`,
            filter: `blur(${(1 - enter) * 10}px)`,
            transition:
              "opacity 1s cubic-bezier(0.22, 1, 0.36, 1), transform 1s cubic-bezier(0.22, 1, 0.36, 1), filter 1s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <Eyebrow className="text-center">{t.hero.label}</Eyebrow>
          <h1 className="mx-auto mt-6 font-display text-[clamp(2.5rem,6vw,6rem)] leading-[1.02] tracking-[-0.02em] text-cream text-center">
            <span className="block">{headline.split('\n')[0]}</span>
            <span className="block text-flame italic">{headline.split('\n')[1]}</span>
          </h1>
        </div>

        <div
          className="mt-12 w-full flex flex-col items-center"
          style={{
            opacity: enter,
            transform: `translateY(${(1 - enter) * 30}px)`,
            transition:
              "opacity 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.15s, transform 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.15s",
          }}
        >
          <p className="max-w-md text-center font-serif text-xl leading-relaxed text-dim">
            {t.hero.body}
          </p>
          <a
            href={t.links.email}
            className="group inline-flex w-fit items-center gap-3 bg-flame px-7 py-4 font-sans text-[12px] font-semibold uppercase tracking-[0.22em] text-ink transition-colors duration-200 hover:bg-cream mt-8"
          >
            {t.hero.cta}
            <Arrow className="transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </a>

          <div className="marquee-fade mt-16 w-full overflow-hidden border-y border-cream/10 py-3">
            <div className="marquee-track font-sans text-[11px] uppercase tracking-[0.3em] text-faint">
              <span className="px-4">{strip}</span>
              <span className="px-4" aria-hidden>
                {strip}
              </span>
              <span className="px-4" aria-hidden>
                {strip}
              </span>
              <span className="px-4" aria-hidden>
                {strip}
              </span>
              <span className="px-4" aria-hidden>
                {strip}
              </span>
              <span className="px-4" aria-hidden>
                {strip}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 02 · POSITIONING (normal flow, subtle reveal)                      */
/* ------------------------------------------------------------------ */

function Positioning({ t, lang }: { t: Copy; lang: Lang }) {
  const last = lang === "en" ? "how to build it." : "cómo construirlo.";
  const main = t.positioning.title.replace(last, "");

  return (
    <section
      id="positioning"
      className="relative flex min-h-svh w-full items-center justify-center px-6 py-24 text-center md:px-14"
    >
      <div className="mx-auto w-full max-w-6xl">
        <Reveal>
          <Eyebrow className="text-center">{t.positioning.num}</Eyebrow>
          <h2 className="mx-auto mt-6 max-w-4xl font-display text-[clamp(2rem,4.6vw,4.2rem)] leading-[1.05] tracking-[-0.015em]">
            {main}
            <em className="text-flame">{last}</em>
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mx-auto mt-12 max-w-3xl font-serif text-[clamp(1.3rem,2.3vw,1.8rem)] leading-snug text-dim">
            {t.positioning.body}
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mx-auto mt-14 w-full max-w-xl border border-cream/10 bg-raised/30 text-left">
            <p className="border-b border-cream/10 px-6 py-3 font-sans text-[10px] uppercase tracking-[0.25em] text-faint">
              {t.glance.num}
            </p>
            <dl>
              {t.glance.items.map(([label, value], i) => (
                <div
                  key={label}
                  className={`flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-baseline sm:justify-between ${
                    i > 0 ? "border-t border-cream/10" : ""
                  }`}
                >
                  <dt className="shrink-0 font-sans text-[10px] uppercase tracking-[0.2em] text-faint">
                    {label}
                  </dt>
                  <dd className="text-right font-serif text-[15px] leading-snug text-cream">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 03 · ABOUT (normal flow, subtle reveal)                            */
/* ------------------------------------------------------------------ */

function About({ t }: { t: Copy }) {
  const a = t.about;

  return (
    <section
      id="about"
      className="relative flex min-h-svh w-full items-center justify-center px-6 py-24 text-center md:px-14"
    >
      <div className="mx-auto w-full max-w-6xl">
        <Reveal>
          <Eyebrow className="text-center">{a.num}</Eyebrow>
          <p className="mx-auto mt-10 max-w-5xl font-display text-[clamp(2rem,4.6vw,4.2rem)] leading-[1.05] tracking-[-0.015em]">
            <em className="text-cream">
              {a.quote}
            </em>
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mx-auto mt-14 w-fit font-serif text-lg leading-relaxed text-dim">
            <span className="text-flame">{a.attribution}</span>{" "}
            <span className="text-faint">({a.role})</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 04 · WHAT I BUILD (normal flow, subtle reveal)                     */
/* ------------------------------------------------------------------ */

function Build({ t }: { t: Copy }) {
  const b = t.build;

  return (
    <section
      id="build"
      className="relative flex min-h-svh w-full items-center justify-center px-6 py-24 md:px-14"
    >
      <div className="mx-auto w-full max-w-6xl">
        <Reveal className="text-center">
          <Eyebrow className="text-center">{b.num}</Eyebrow>
          <h2 className="mx-auto mt-6 max-w-4xl font-display text-[clamp(2rem,4.6vw,4.2rem)] leading-[1.05] tracking-[-0.015em]">
            {b.title}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl font-serif text-lg leading-relaxed text-dim">
            {b.intro}
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {b.services.map((service, i) => (
            <Reveal key={service.label} delay={0.1 + i * 0.12} className="h-full">
              <a href={service.link} className="flex h-full flex-col justify-between border border-cream/10 bg-raised/30 p-8 md:p-10 group">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-[11px] uppercase tracking-[0.25em] text-flame md:hidden">
                      {service.label}
                    </span>
                    <span className="hidden font-sans text-[11px] uppercase tracking-[0.25em] text-flame md:block">
                      {service.label} <Arrow className="inline-block" />
                    </span>
                    <Arrow className="hidden text-faint transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1 md:block" />
                  </div>
                  <h3 className="mt-6 font-display text-2xl leading-tight md:text-[1.7rem]">
                    {service.headline}
                  </h3>
                </div>
                <p className="mt-6 font-serif text-[15px] leading-relaxed text-dim">
                  {service.body}
                </p>
                <p className="mt-4 font-sans text-sm font-bold uppercase tracking-[0.08em] text-cream">
                  {service.price}
                </p>
                <span className="mt-6 inline-flex items-center gap-2 font-sans text-[12px] uppercase tracking-[0.2em] text-flame">
                  {service.cta}
                  <Arrow />
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 05 · PROCESS (pinned scrollytelling)                               */
/* ------------------------------------------------------------------ */

function PinProcess({ t, lang }: { t: Copy; lang: Lang }) {
  const { ref, on } = usePin<HTMLDivElement>();
  const [p, setP] = useState(0);
  useEffect(() => on(setP), [on]);

  const seg = (a: number, b: number) => clamp01((p - a) / (b - a));
  const ui = UI[lang];
  const steps = t.process.steps;
  const last = lang === "en" ? "to launch." : "al lanzamiento.";
  const main = t.process.title.replace(last, "");

  return (
    <Runway id="process" h="300vh" ref={ref}>
      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col justify-start px-6 pt-20 md:justify-center md:px-14 md:pt-0">
        <Eyebrow className="text-center">{t.process.num}</Eyebrow>
        <h2 className="mx-auto mt-6 max-w-4xl text-center font-display text-[clamp(2rem,4.6vw,4.1rem)] leading-[1.05] tracking-[-0.015em]">
          <Words text={main} p={p} range={[0.08, 0.4]} />
          <em className="text-flame">{last}</em>
        </h2>

        <div className="mt-10 grid gap-10 md:mt-16 md:grid-cols-4 md:gap-8">
          {steps.map((step, i) => {
            const o = seg(0.12 + i * 0.19, 0.3 + i * 0.19);
            const border =
              o > 0.55
                ? "2px solid var(--color-flame)"
                : "2px solid rgba(38,30,24,0.15)";
            return (
              <div
                key={step.title}
                className="pt-6"
                style={{
                  borderTop: border,
                  opacity: Math.min(1, o * 1.6),
                  transform: `translateY(${(1 - o) * 30}px)`,
                  transition: "border-color 0.3s",
                }}
              >
                <h3
                  className="font-sans text-sm font-bold uppercase tracking-[0.08em]"
                  style={{ color: o > 0.55 ? "var(--color-cream)" : "var(--color-dim)" }}
                >
                  {step.title}
                </h3>
                <p className="mt-3 font-serif text-[15px] leading-relaxed text-dim">
                  {step.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </Runway>
  );
}

/* ------------------------------------------------------------------ */
/* 06 · SELECTED WORK (pinned scrollytelling)                         */
/* ------------------------------------------------------------------ */

function PinProjects({ t, lang }: { t: Copy; lang: Lang }) {
  const w = t.work;
  const last = lang === "en" ? "Different solutions." : "Soluciones diferentes.";
  const main = w.title.replace(last, "");

  return (
    <section id="projects" className="relative py-24 md:py-32">
      <div className="mx-auto w-full max-w-6xl px-6 md:px-14">
        <div className="text-center">
          <Eyebrow className="text-center">{w.num}</Eyebrow>
          <h2 className="mx-auto mt-6 font-display text-[clamp(2rem,4.6vw,4.2rem)] leading-[1.05] tracking-[-0.015em] whitespace-nowrap">
            {main}
            <em className="text-flame">{last}</em>
          </h2>
          <p
            className="mx-auto mt-6 hidden max-w-4xl font-serif text-lg leading-relaxed text-dim md:block"
            style={{ textWrap: 'balance' }}
          >
            {w.intro}
          </p>
        </div>

        <div className="mt-10">
          <div className="grid md:grid-cols-2 gap-8">
            {w.projects.map((pr) => (
              <a
                key={pr.n}
                href={pr.url}
                target="_blank"
                rel="noreferrer"
                className="group block p-6 border border-cream/10 hover:border-cream/30"
              >
                <p className="font-sans text-[11px] uppercase tracking-[0.25em] text-faint mb-2">
                  {pr.cat}
                </p>
                <h3 className="font-display text-2xl mb-1">
                  {pr.name}
                </h3>
                <p className="font-sans text-sm text-cream/70 mb-4">
                  {pr.desc}
                </p>
                <p className="font-sans text-sm text-flame group-hover:underline">
                  {pr.link} <Arrow className="inline-block" />
                </p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 07 · A GOOD FIT (normal flow, subtle reveal)                       */
/* ------------------------------------------------------------------ */

function Fit({ t, lang }: { t: Copy; lang: Lang }) {
  const f = t.fit;
  const last = lang === "en" ? "build something properly." : "construir algo bien hecho.";
  const main = f.title.replace(last, "");

  return (
    <section
      id="fit"
      className="relative flex min-h-svh w-full items-center justify-center px-6 py-24 md:px-14"
    >
      <div className="mx-auto w-full max-w-6xl">
        <Reveal className="text-center">
          <Eyebrow className="text-center">{f.num}</Eyebrow>
          <h2 className="mx-auto mt-6 max-w-4xl font-display text-[clamp(2rem,4.6vw,4.2rem)] leading-[1.05] tracking-[-0.015em]">
            {main}
            <em className="text-flame">{last}</em>
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {f.items.map((item, i) => (
            <Reveal key={item.title} delay={0.08 + i * 0.1} className="h-full">
              <div className="h-full border border-cream/10 bg-raised/25 p-7 md:p-8">
                <h3 className="font-sans text-lg font-bold uppercase leading-snug tracking-[0.02em] text-cream">
                  {item.title}
                </h3>
                <p className="mt-3 font-serif text-[15px] leading-relaxed text-dim">
                  {item.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 08 · INVESTMENT (normal flow, subtle reveal)                       */
/* ------------------------------------------------------------------ */

function Investment({ t, lang }: { t: Copy; lang: Lang }) {
  const i = t.investment;
  const last = lang === "en" ? "Clear price." : "Precio claro.";
  const main = i.title.replace(last, "");

  return (
    <section
      id="investment"
      className="relative flex min-h-svh w-full items-center justify-center px-6 py-24 md:px-14"
    >
      <div className="mx-auto w-full max-w-6xl">
        <Reveal className="text-center">
          <Eyebrow className="text-center">{i.num}</Eyebrow>
          <h2 className="mx-auto mt-6 max-w-4xl font-display text-[clamp(2rem,4.6vw,4.2rem)] leading-[1.05] tracking-[-0.015em]">
            {main}
            <em className="text-flame">{last}</em>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {i.services.map((service, idx) => (
            <Reveal key={service.title} delay={0.1 + idx * 0.12} className="h-full">
              <a href={service.link} className="flex h-full flex-col justify-between border border-cream/10 bg-raised/30 p-8 md:p-10 group">
                <div>
                  <h3 className="font-display text-2xl leading-tight md:text-[1.7rem]">
                    {service.title}
                  </h3>
                  <p className="mt-2 font-sans text-sm font-bold uppercase tracking-[0.08em] text-cream">
                    {service.price}
                  </p>
                </div>
                <p className="mt-6 font-serif text-[15px] leading-relaxed text-dim">
                  {service.body}
                </p>
                <span className="mt-6 inline-flex items-center gap-2 font-sans text-[12px] uppercase tracking-[0.2em] text-flame">
                  {service.cta}
                  <Arrow />
                </span>
              </a>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.18}>
          <p className="mx-auto mt-12 max-w-2xl text-center font-serif text-lg leading-relaxed text-dim">
            {i.footnote}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 09 · CONTACT (normal flow, subtle reveal)                          */
/* ------------------------------------------------------------------ */

function Contact({ t, lang }: { t: Copy; lang: Lang }) {
  const c = t.contact;
  const last = lang === "en" ? "build?" : "construir?";
  const main = c.title.replace(last, "");

  return (
    <section
      id="contact"
      className="relative flex min-h-svh w-full items-center justify-center px-6 py-24 text-center md:px-14"
    >
      <div className="mx-auto w-full max-w-6xl">
        <Reveal>
          <Eyebrow className="text-center">{c.num}</Eyebrow>
          <h2 className="mx-auto mt-6 max-w-4xl font-display text-[clamp(2rem,4.8vw,4.4rem)] leading-[1.03] tracking-[-0.015em]">
            {main}
            <em className="text-flame">{last}</em>
          </h2>
          <p className="mx-auto mt-8 max-w-2xl font-serif text-lg leading-relaxed text-dim">
            {c.body}
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-12 flex flex-col items-center gap-10 md:flex-row md:items-end md:justify-center">
            <a
              href={t.links.email}
              className="group inline-flex w-fit items-center gap-3 bg-flame px-8 py-4 font-sans text-[12px] font-semibold uppercase tracking-[0.22em] text-ink transition-colors duration-200 hover:bg-cream"
            >
              {c.cta}
              <Arrow className="transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1" />
            </a>
            <div>
              <p className="font-sans text-[10px] uppercase tracking-[0.25em] text-faint">
                {c.bestWay}
              </p>
              <a
                href={t.links.email}
                className="mt-2 block break-all font-display text-xl text-cream underline decoration-flame decoration-2 underline-offset-8 transition-colors hover:text-flame md:text-2xl"
              >
                {t.links.email.replace("mailto:", "")}
              </a>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-faint">
              {c.online}
            </span>
            {[
              { label: c.linkedin, href: t.links.linkedin },
              { label: c.github, href: t.links.github },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                className="group inline-flex items-center gap-2 font-sans text-[12px] uppercase tracking-[0.2em] text-dim transition-colors hover:text-flame"
              >
                {s.label}
                <Arrow className="text-flame" />
              </a>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* COMPOSITION                                                         */
/* ------------------------------------------------------------------ */

export function Scrolly() {
  const { t, lang } = useLang();
  return (
    <>
      <ProgressRail />
      <Hero t={t} lang={lang} />
      <Positioning t={t} lang={lang} />
      <Build t={t} />
      <PinProcess t={t} lang={lang} />
      <PinProjects t={t} lang={lang} />
      <Fit t={t} lang={lang} />
      <Investment t={t} lang={lang} />
      <Contact t={t} lang={lang} />
    </>
  );
}
