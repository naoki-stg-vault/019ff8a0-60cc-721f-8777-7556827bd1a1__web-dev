"use client";

import Link from "next/link";
import { useLang } from "@/components/LanguageProvider";
import type { Lang } from "@/lib/content";
import { useState, useEffect } from "react";

export function Header() {
  const { t, lang, setLang } = useLang();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    if (isMenuOpen) {
      document.addEventListener("keydown", handleEscape);
    } else {
      document.removeEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  const btn = (l: Lang) => (
    <button
      key={l}
      type="button"
      onClick={() => setLang(l)}
      aria-pressed={lang === l}
      aria-label={l === "en" ? "Switch to English" : "Cambiar a español"}
      className={`px-3 py-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.2em] transition-colors duration-200 ${
        lang === l ? "bg-flame text-ink" : "text-dim hover:text-cream"
      }`}
    >
      {l}
    </button>
  );

  const navLinks = t.nav.map((item) => (
    <li key={item.href}>
      {item.href.startsWith("#") ? (
        <a
          href={item.href}
          className="font-sans text-[11px] uppercase tracking-[0.25em] text-dim transition-colors hover:text-flame"
          onClick={closeMenu}
        >
          {item.label}
        </a>
      ) : (
        <Link
          href={item.href}
          className="font-sans text-[11px] uppercase tracking-[0.25em] text-dim transition-colors hover:text-flame"
          onClick={closeMenu}
        >
          {item.label}
        </Link>
      )}
    </li>
  ));

  return (
    <header className="sticky top-0 z-50 border-b border-cream/10 bg-ink/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 md:px-8 lg:px-14">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-display text-lg tracking-tight"
        >
          <span
            className="inline-block h-2 w-2 rounded-full bg-flame transition-transform duration-300 group-hover:scale-150"
            aria-hidden
          />
          {t.brand}
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <nav>
            <ul className="flex gap-6">
              {navLinks}
            </ul>
          </nav>
          <div className="flex items-stretch overflow-hidden border border-cream/20">
            {btn("en")}
            {btn("es")}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-6">
          <div className="flex items-stretch overflow-hidden border border-cream/20">
            {btn("en")}
            {btn("es")}
          </div>
          <button
            type="button"
            onClick={toggleMenu}
            className="text-cream hover:text-flame transition-colors duration-200"
            aria-expanded={isMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {isMenuOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            )}
          </button>

          {isMenuOpen && (
            <div className="absolute left-0 right-0 top-16 border-b border-cream/10 bg-ink/90 backdrop-blur-md pb-4">
              <nav>
                <ul className="flex flex-col items-center gap-4 pt-4">
                  {navLinks}
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
