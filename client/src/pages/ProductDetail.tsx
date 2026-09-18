import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ExternalLink,
  LockKeyhole,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import SiteNav from "@/components/SiteNav";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { useLocale } from "@/contexts/LocaleContext";

function parseFaq(raw: string | null | undefined) {
  if (!raw) return [];
  return raw
    .split(/\n\n+/)
    .map((block) => {
      const question = block.match(/^Q:\s*(.+)$/m)?.[1]?.trim();
      const answer = block.match(/^A:\s*([\s\S]+)$/m)?.[1]?.trim();
      return question && answer ? { question, answer } : null;
    })
    .filter((item): item is { question: string; answer: string } => Boolean(item));
}

export default function ProductDetail({ params }: { params: { slug: string } }) {
  const { t, dir } = useLocale();
  const { isAuthenticated } = useAuth();
  const [activeImage, setActiveImage] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const productQuery = trpc.marketplace.getBySlug.useQuery({ slug: params.slug });
  const paymentsQuery = trpc.platform.payments.useQuery(undefined, { staleTime: 60_000 });
  const payments = paymentsQuery.data ?? { stripe: false, chargily: false, paypal: false };
  const anyPayment = payments.stripe || payments.chargily || payments.paypal;
  const analyticsEvent = trpc.analytics.event.useMutation();
  const checkout = trpc.orders.checkout.useMutation({
    onSuccess: (session) => {
      if (session?.url) window.location.assign(session.url);
      else toast.error("Checkout session missing URL");
    },
    onError: (error) => toast.error("Checkout is not configured yet", { description: error.message }),
  });
  const [pendingProvider, setPendingProvider] = useState<"stripe" | "chargily" | "paypal">("stripe");
  const createOrder = trpc.orders.create.useMutation({
    onSuccess: (result) => {
      toast.success(`Order #${result.orderId} created`, { description: "Opening secure payment…" });
      checkout.mutate({ orderId: result.orderId, provider: pendingProvider });
    },
    onError: (error) => toast.error("We could not create the order", { description: error.message }),
  });

  const product = productQuery.data;
  const faq = useMemo(() => parseFaq(product?.faq), [product?.faq]);

  const gallery = useMemo(() => {
    if (!product) return [];
    const imgs = (product.images ?? []).map((img: any) => ({ url: img.url, alt: img.alt || product.name }));
    if (imgs.length === 0 && product.heroImage) {
      return [{ url: product.heroImage, alt: product.name }];
    }
    return imgs;
  }, [product]);

  useEffect(() => {
    if (product?.id) analyticsEvent.mutate({ action: "product.view", productId: product.id });
  }, [product?.id]);

  if (productQuery.isLoading) {
    return (
      <div className="numi-shell min-h-screen" dir={dir}>
        <div className="numi-content p-10 text-white/50">{t("loading")}</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="numi-shell min-h-screen" dir={dir}>
        <div className="numi-content p-10 text-white">
          {t("not_found")}{" "}
          <Link href="/" className="underline">
            {t("return_home")}
          </Link>
        </div>
      </div>
    );
  }

  const handlePurchase = (provider: "stripe" | "chargily" | "paypal") => {
    if (!isAuthenticated) {
      startLogin();
      return;
    }
    setPendingProvider(provider);
    createOrder.mutate({ slug: product.slug });
  };

  const hasLiveDemo = Boolean(product.demoUrl);
  const busy = createOrder.isPending || checkout.isPending;

  return (
    <div className="numi-shell min-h-screen" dir={dir}>
      <div className="numi-content">
        <SiteNav />
        <main className="mx-auto max-w-[1440px] px-5 pb-24 md:px-10">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/45 transition-colors hover:text-white"
          >
            <ArrowLeft size={14} /> {t("back")}
          </Link>

          {/* HERO BLOCK */}
          <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[#071525]/80 p-6 md:p-10 lg:p-12">
            <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#2d7ff9]/12 blur-3xl" />
            <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-[#ef8b65]/08 blur-3xl" />

            <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              {/* Gallery */}
              <div>
                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#0a1628]">
                  <img
                    src={gallery[activeImage]?.url || product.heroImage}
                    alt={gallery[activeImage]?.alt || product.name}
                    className="aspect-[16/11] w-full object-cover"
                  />
                </div>
                {gallery.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {gallery.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveImage(i)}
                        className={`h-16 w-24 shrink-0 overflow-hidden rounded-xl border transition ${
                          i === activeImage ? "border-[#3b8bff] ring-1 ring-[#3b8bff]/40" : "border-white/10 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img src={img.url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                {gallery.length <= 1 && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-white/35">
                    <ImageIcon size={14} /> {t("gallery")}
                  </div>
                )}
              </div>

              {/* Buy panel */}
              <div className="lg:sticky lg:top-28">
                <div className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[#83c2ff]">
                  <span className="h-2 w-2 rounded-full bg-[#83c2ff] shadow-[0_0_14px_#83c2ff]" />
                  {product.category}
                </div>
                <h1 className="text-balance text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
                  {product.name}
                </h1>
                <p className="mt-4 text-lg leading-7 text-white/55">{product.tagline}</p>

                <div className="mt-6 flex flex-wrap items-end gap-3">
                  <span className="font-mono text-3xl font-medium text-white">
                    {product.currency} {Number(product.price).toLocaleString("en-US")}
                  </span>
                  <span className="mb-1 text-xs text-white/40">{t("trust_payment")}</span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(product.techStack ?? []).slice(0, 6).map((stack: any) => (
                    <span
                      key={stack.id ?? stack.name}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] text-white/55"
                    >
                      {stack.name}
                    </span>
                  ))}
                </div>

                <div className="mt-8 space-y-3">
                  {!isAuthenticated ? (
                    <button type="button" onClick={() => startLogin()} className="btn-primary w-full justify-center">
                      {t("sign_in_to_buy")}
                    </button>
                  ) : !anyPayment ? (
                    <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                      Payments are <strong>NOT_CONFIGURED</strong>. Owner must set Stripe, Chargily, or PayPal environment variables before checkout can run.
                    </div>
                  ) : (
                    <>
                      {payments.stripe && (
                        <button
                          type="button"
                          onClick={() => handlePurchase("stripe")}
                          disabled={busy}
                          className="btn-primary w-full justify-center disabled:opacity-60"
                        >
                          {busy ? t("loading") : t("pay_stripe")}
                          <ArrowUpRight size={16} />
                        </button>
                      )}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {payments.paypal && (
                          <button
                            type="button"
                            onClick={() => handlePurchase("paypal")}
                            disabled={busy}
                            className="btn-ghost w-full justify-center text-sm disabled:opacity-60"
                          >
                            {t("pay_paypal")}
                          </button>
                        )}
                        {payments.chargily && (
                          <button
                            type="button"
                            onClick={() => handlePurchase("chargily")}
                            disabled={busy}
                            className="btn-ghost w-full justify-center text-sm disabled:opacity-60"
                          >
                            {t("pay_chargily")}
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {hasLiveDemo && (
                    <a
                      href={product.demoUrl ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/15"
                    >
                      {t("open_demo")} <ExternalLink size={15} />
                    </a>
                  )}
                </div>

                <div className="mt-6 space-y-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  {[
                    { icon: ShieldCheck, text: t("trust_ownership") },
                    { icon: PackageCheck, text: t("trust_source") },
                    { icon: LockKeyhole, text: t("guarantee_body") },
                  ].map((row) => (
                    <div key={row.text} className="flex items-start gap-2.5 text-xs leading-5 text-white/55">
                      <row.icon size={15} className="mt-0.5 shrink-0 text-[#83c2ff]" />
                      <span>{row.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Description + Features */}
          <section className="mt-14 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h2 className="section-label mb-4">{t("why_numi")}</h2>
              <p className="max-w-2xl text-base leading-8 text-white/60">{product.description}</p>

              {(product.features ?? []).length > 0 && (
                <div className="mt-10">
                  <h3 className="mb-5 text-xl font-semibold text-white">{t("features")}</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {product.features.map((f: any) => (
                      <div key={f.id ?? f.title} className="glass rounded-2xl p-5">
                        <div className="mb-2 flex items-center gap-2 text-[#83c2ff]">
                          <Check size={16} />
                          <span className="font-semibold text-white">{f.title}</span>
                        </div>
                        <p className="text-sm leading-6 text-white/50">{f.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-5">
              {product.included && (
                <div className="glass rounded-2xl p-5">
                  <h3 className="mb-2 text-sm font-semibold text-white">{t("included")}</h3>
                  <p className="text-sm leading-6 text-white/50">{product.included}</p>
                </div>
              )}
              {product.license && (
                <div className="glass rounded-2xl p-5">
                  <h3 className="mb-2 text-sm font-semibold text-white">{t("license")}</h3>
                  <p className="text-sm leading-6 text-white/50">{product.license}</p>
                </div>
              )}
              {product.requirements && (
                <div className="glass rounded-2xl p-5">
                  <h3 className="mb-2 text-sm font-semibold text-white">{t("requirements")}</h3>
                  <p className="text-sm leading-6 text-white/50">{product.requirements}</p>
                </div>
              )}
              {(product.techStack ?? []).length > 0 && (
                <div className="glass rounded-2xl p-5">
                  <h3 className="mb-3 text-sm font-semibold text-white">{t("tech")}</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.techStack.map((s: any) => (
                      <span key={s.id ?? s.name} className="rounded-full bg-white/[0.06] px-3 py-1 font-mono text-[11px] text-white/60">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* FAQ */}
          {faq.length > 0 && (
            <section className="mt-16">
              <div className="mb-6 flex items-center gap-2">
                <Sparkles size={18} className="text-[#f0a07a]" />
                <h2 className="text-2xl font-semibold text-white">{t("faq")}</h2>
              </div>
              <div className="space-y-3">
                {faq.map((item, i) => (
                  <div key={i} className="glass overflow-hidden rounded-2xl">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-white"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    >
                      {item.question}
                      <ArrowRight
                        size={16}
                        className={`shrink-0 text-white/40 transition-transform ${openFaq === i ? "rotate-90" : ""}`}
                      />
                    </button>
                    {openFaq === i && (
                      <div className="border-t border-white/10 px-5 pb-4 pt-2 text-sm leading-7 text-white/55">
                        {item.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Reviews */}
          {(product.reviews ?? []).length > 0 && (
            <section className="mt-16">
              <h2 className="mb-6 text-2xl font-semibold text-white">{t("reviews")}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {product.reviews.map((row: any) => (
                  <div key={row.review?.id ?? row.id} className="glass rounded-2xl p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-amber-300">{"★".repeat(row.review?.rating ?? row.rating ?? 5)}</span>
                      <span className="text-xs text-white/40">{row.user?.name ?? "Customer"}</span>
                    </div>
                    <p className="text-sm leading-6 text-white/55">{row.review?.body ?? row.body}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Bottom CTA */}
          <section className="mt-16">
            <div className="glass flex flex-col items-start justify-between gap-6 rounded-[28px] p-8 md:flex-row md:items-center md:p-10">
              <div>
                <h3 className="text-2xl font-semibold text-white">{product.name}</h3>
                <p className="mt-2 text-sm text-white/50">
                  {product.currency} {Number(product.price).toLocaleString("en-US")} · {t("trust_payment")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => (isAuthenticated ? handlePurchase("stripe") : startLogin())}
                disabled={busy}
                className="btn-primary disabled:opacity-60"
              >
                {t("buy_now")}
                <ArrowUpRight size={16} />
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
