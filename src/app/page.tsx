import { LanguageProvider } from "@/components/LanguageProvider";
import { Header } from "@/components/Header";
import { Scrolly } from "@/components/Scrolly";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <LanguageProvider>
      <div className="bg-[#FAF6F0] border-b border-[#2B2B2B]/10 py-2.5 px-4 text-center text-xs font-inter text-[#2B2B2B] flex flex-wrap items-center justify-center gap-2 relative z-50">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#E66C7D]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Proyecto: Nails Pink Palace</span>
        </span>
        <span className="hidden sm:inline text-[#2B2B2B]/40">·</span>
        <Link
          href="/nails-pink-palace"
          className="font-bold underline text-[#2B2B2B] hover:text-[#E66C7D] transition-colors inline-flex items-center gap-1"
        >
          <span>Ver sitio web, reservas y mapa de Nails Pink Palace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <Header />
      <main>
        <Scrolly />
      </main>
      <Footer />
    </LanguageProvider>
  );
}
