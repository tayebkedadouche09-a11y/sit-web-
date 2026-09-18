import {
  ArrowDownRight,
  ArrowRight,
  Check,
  Compass,
  CreditCard,
  ExternalLink,
  Globe,
  KeyRound,
  Layers3,
  Lock,
  Package,
  Search,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import SkyCanvas from "@/components/SkyCanvas";
import SiteNav from "@/components/SiteNav";
import { trpc } from "@/lib/trpc";
import { useLocale } from "@/contexts/LocaleContext";

type MarketplaceEntry = {
  product: any;
  category: { name: string; slug: string } | null;
  techStack: Array<{ name: string }>;
};

function formatPrice(currency: string, price: string | number) {
  const n = Number(price);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "DZD",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

function ProductCard({ entry }: { entry: MarketplaceEntry }) {
  const { t } = useLocale();
  const product = entry.product;
  const categoryName = entry.category?.name ?? product.category;
  const hasDemo = Boolean(product.demoUrl);

  return (
    <article className="product-card glass group flex flex-col overflow-hidden rounded-[24px]">
      <div className="relative aspect-[16/10] overflow-hidden bg-[#091a2b]">
        <img
          src={product.heroImage}
          alt={`${product.name} preview`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#040b16]/95 via-[#040b16]/20 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/15 bg-[#040b16]/75 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white/80 backdrop-blur">
            {categoryName}
          </span>
          {hasDemo && (
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] uppercase tracking-wider text-emerald-300">
              {t("live_demo")}
            </span>
          )}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <p className="font-mono text-lg font-semibold text-white">
            {formatPrice(product.currency, product.price)}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5 md:p-6">
        <div>
          <h3 className="text-xl font-semibold tracking-[-0.03em] text-white md:text-2xl">{product.name}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/55">{product.tagline}</p>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <Link
            href={`/websites/${product.slug}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#3b8bff] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {t("inspect")}
            <ArrowRight size={15} className="rtl:rotate-180" />
          </Link>
          {hasDemo ? (
            <a
              href={product.demoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 px-3.5 py-2.5 text-sm text-white/75 transition-colors hover:border-white/30 hover:text-white"
            >
              <ExternalLink size={14} />
              {t("live_demo")}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const { t, dir } = useLocale();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const marketplace = trpc.marketplace.list.useQuery(
    { search: query || undefined, category: activeCategory || undefined },
    { staleTime: 60_000 },
  );

  const categoriesQuery = trpc.marketplace.categories.useQuery(undefined, { staleTime: 120_000 });

  const entries: MarketplaceEntry[] = marketplace.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const filtered = useMemo(() => entries, [entries]);

  return (
    <div className="numi-shell numi-shell--calm" dir={dir}>
      <div className="numi-content">
        <SiteNav />

        <SkyCanvas />

        {/* HERO — nature x space */}
        <section className="cosmic-hero relative mx-auto max-w-[1440px] px-5 pb-20 pt-10 md:px-10 md:pb-24 md:pt-16">
          <div className="cosmic-hero__aurora" aria-hidden="true" />
          <div className="cosmic-hero__orbit" aria-hidden="true">
            <div className="cosmic-hero__planet-ring" />
            <div className="cosmic-hero__planet">
              <span className="cosmic-hero__continent cosmic-hero__continent--1" />
              <span className="cosmic-hero__continent cosmic-hero__continent--2" />
              <span className="cosmic-hero__continent cosmic-hero__continent--3" />
              <span className="cosmic-hero__atmosphere" />
            </div>
            <span className="cosmic-hero__orbit-dot cosmic-hero__orbit-dot--1" />
            <span className="cosmic-hero__orbit-dot cosmic-hero__orbit-dot--2" />
          </div>

          <div className="relative z-10 grid items-center gap-12 lg:grid-cols-[1.02fr_.98fr] lg:gap-16">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/20 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/60 backdrop-blur-xl">
                <span className="pulse-dot h-1.5 w-1.5" />
                {t("brand_tag")}
              </div>
              <h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
                {t("hero_title_1")}{" "}
                <span className="cosmic-gradient-text">{t("hero_title_2")}</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-8 text-white/58 md:text-lg md:leading-8">
                {t("hero_sub")}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#collection" className="btn-primary">{t("explore_collection")}<ArrowDownRight size={16} /></a>
                <a href="#delivery" className="btn-ghost">{t("how_it_works")}</a>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                <span className="trust-pill"><Lock size={13} /> {t("trust_ownership")}</span>
                <span className="trust-pill"><Zap size={13} /> {t("trust_payment")}</span>
                <span className="trust-pill"><Globe size={13} /> {t("trust_instance")}</span>
              </div>
            </div>

            <div className="cosmic-window">
              <div className="cosmic-window__topline">
                <span>NUMI / 01</span>
                <span className="flex items-center gap-2"><span className="pulse-dot" /> LIVE SKY</span>
              </div>
              <div className="cosmic-window__scene">
                <div className="cosmic-window__starfield" />
                <div className="cosmic-window__moon" />
                <div className="cosmic-window__mountain cosmic-window__mountain--far" />
                <div className="cosmic-window__mountain cosmic-window__mountain--near" />
                <div className="cosmic-window__forest" />
                <div className="cosmic-window__caption">
                  <span>nature / orbit / night</span>
                  <strong>Quiet technology, wide horizons.</strong>
                </div>
              </div>
              <div className="cosmic-window__footer">
                <span>Moonlight Sonata · piano</span>
                <span className="font-mono text-[10px] text-white/35">01:00 / 05:42</span>
              </div>
            </div>
          </div>
        </section>

        {/* COLLECTION */}
        <section id="collection" className="mx-auto max-w-[1440px] px-5 py-12 md:px-10 md:py-16">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#83c2ff]/80">{t("collection")}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">{t("curated")}</h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-white/50">{t("curated_sub")}</p>
            </div>
            <div className="relative w-full max-w-sm">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 rtl:left-auto rtl:right-3.5" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search_placeholder")}
                className="w-full rounded-full border border-white/12 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#3b8bff]/50 rtl:pl-4 rtl:pr-10"
              />
            </div>
          </div>

          <div className="mb-8 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                !activeCategory ? "bg-white/15 text-white" : "bg-white/[0.04] text-white/50 hover:text-white/80"
              }`}
            >
              {t("all")}
            </button>
            {categories.map((cat: any) => (
              <button
                key={cat.slug}
                type="button"
                onClick={() => setActiveCategory(cat.slug)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  activeCategory === cat.slug
                    ? "bg-white/15 text-white"
                    : "bg-white/[0.04] text-white/50 hover:text-white/80"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {marketplace.isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="glass h-[380px] animate-pulse rounded-[24px]" />
              ))}
            </div>
          ) : filtered.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((entry) => (
                <ProductCard key={entry.product.id} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="glass rounded-[24px] px-8 py-14 text-center">
              <p className="text-white/55">{t("no_match")}</p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveCategory(null);
                }}
                className="mt-4 text-sm text-[#83c2ff]"
              >
                {t("clear_filters")}
              </button>
            </div>
          )}
        </section>

        {/* HOW IT WORKS */}
        <section id="delivery" className="mx-auto max-w-[1440px] px-5 py-14 md:px-10 md:py-20">
          <div className="mb-10 max-w-xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#f0a07a]/90">{t("delivery")}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">{t("delivery_title")}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Search, title: t("step_1"), body: t("step_1_body"), n: "01" },
              { icon: CreditCard, title: t("step_2"), body: t("step_2_body"), n: "02" },
              { icon: Package, title: t("step_3"), body: t("step_3_body"), n: "03" },
              { icon: KeyRound, title: t("step_4"), body: t("step_4_body"), n: "04" },
            ].map((s) => (
              <div key={s.n} className="glass relative rounded-[20px] p-5">
                <span className="font-mono text-[11px] text-white/30">{s.n}</span>
                <div className="mt-3 mb-3 grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] text-[#83c2ff]">
                  <s.icon size={16} />
                </div>
                <h3 className="text-base font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/50">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PRINCIPLES */}
        <section id="principles" className="mx-auto max-w-[1440px] px-5 py-14 md:px-10 md:py-16">
          <div className="mb-10 max-w-xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">{t("approach")}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">{t("approach_title")}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: Layers3, title: t("principle_1_title"), body: t("principle_1_body") },
              { icon: ShieldCheck, title: t("principle_2_title"), body: t("principle_2_body") },
              { icon: Compass, title: t("principle_3_title"), body: t("principle_3_body") },
            ].map((item) => (
              <div key={item.title} className="glass rounded-[20px] p-6 transition-colors hover:border-[#3b8bff]/25">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-white/[0.06] text-[#83c2ff]">
                  <item.icon size={18} />
                </div>
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/50">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-[1440px] px-5 py-12 md:px-10 md:py-16">
          <div className="glass relative overflow-hidden rounded-[28px] p-8 md:p-12">
            <div className="relative z-[1] max-w-xl">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">{t("quieter_title")}</h2>
              <p className="mt-4 text-sm leading-7 text-white/55 md:text-base">{t("quieter_body")}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {[t("guarantee"), t("trust_payment"), t("trust_ownership")].map((label) => (
                  <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs text-white/70">
                    <Check size={13} className="text-[#83c2ff]" /> {label}
                  </span>
                ))}
              </div>
              <div className="mt-8">
                <a href="#collection" className="btn-primary">
                  {t("browse_systems")}
                  <ArrowRight size={16} className="rtl:rotate-180" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-9 md:flex-row md:items-center md:justify-between md:px-10">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full border border-white/20 text-sm font-bold">N</span>
              <span className="font-mono text-sm tracking-[0.28em] text-white/75">NUMI</span>
            </div>
            <p className="max-w-md text-xs leading-5 text-white/35">{t("footer_line")}</p>
            <Link href="/account" className="flex items-center gap-2 text-xs text-white/50 transition-colors hover:text-white">
              {t("customer_access")} <ArrowRight size={14} className="rtl:rotate-180" />
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
