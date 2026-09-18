import { ArrowUpRight, Menu, UserRound, X } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { useLocale, type Locale } from "@/contexts/LocaleContext";

const LOCALES: { id: Locale; label: string }[] = [
  { id: "ar", label: "ع" },
  { id: "fr", label: "FR" },
  { id: "en", label: "EN" },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { t, locale, setLocale } = useLocale();

  return (
    <header className="sticky top-0 z-50 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 md:px-10">
      <div className="absolute inset-0 -z-10 border-b border-white/8 bg-[#040b16]/80 backdrop-blur-xl" />

      <Link href="/" className="group flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-white/[0.05] text-sm font-bold transition-transform group-hover:scale-105">
          N
        </span>
        <span className="font-mono text-sm tracking-[0.28em] text-white/90">NUMI</span>
      </Link>

      <nav className="hidden items-center gap-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55 md:flex">
        <a href="/#collection" className="transition-colors hover:text-white">
          {t("nav_collection")}
        </a>
        <a href="/#delivery" className="transition-colors hover:text-white">
          {t("nav_handover")}
        </a>
        <a href="/#principles" className="transition-colors hover:text-white">
          {t("nav_approach")}
        </a>
      </nav>

      <div className="hidden items-center gap-3 md:flex">
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
          {LOCALES.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLocale(l.id)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                locale === l.id ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {isAuthenticated ? (
          <Link
            href={user?.role === "admin" ? "/admin" : "/account"}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white"
          >
            <UserRound size={14} />
            {user?.role === "admin" ? t("owner_space") : t("my_space")}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => startLogin()}
            className="flex items-center gap-2 rounded-full bg-[#3b8bff] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            {t("sign_in")}
            <ArrowUpRight size={14} />
          </button>
        )}
      </div>

      <button
        type="button"
        aria-label="Toggle navigation"
        className="rounded-full border border-white/15 p-2 md:hidden"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <div className="absolute left-4 right-4 top-[68px] rounded-2xl border border-white/12 bg-[#0a1628]/96 p-5 shadow-2xl backdrop-blur-xl md:hidden">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex gap-2">
            {LOCALES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLocale(l.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  locale === l.id ? "bg-white/15 text-white" : "text-white/50"
                }`}
              >
                {l.label}
              </button>
            ))}
            </div>
          </div>
          <div className="flex flex-col gap-4 text-sm text-white/75">
            <a href="/#collection" onClick={() => setOpen(false)}>
              {t("nav_collection")}
            </a>
            <a href="/#delivery" onClick={() => setOpen(false)}>
              {t("nav_handover")}
            </a>
            <a href="/#principles" onClick={() => setOpen(false)}>
              {t("nav_approach")}
            </a>
            {isAuthenticated ? (
              <Link href={user?.role === "admin" ? "/admin" : "/account"} onClick={() => setOpen(false)}>
                {user?.role === "admin" ? t("owner_space") : t("my_space")}
              </Link>
            ) : (
              <button type="button" className="text-left text-[#83c2ff]" onClick={() => startLogin()}>
                {t("sign_in")}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
